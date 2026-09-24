/* ============================================================
   KiconCreator V2 · js/exports.js
   职责：真实导出（P0-2 / 需求 2.3）与下载 pane。
     - PNG/JPG/WebP：任意尺寸渲染（renderIconCanvasAt 复用快照管线）
     - ICO：真实多尺寸 ICO（16/32/48/64/128/256，PNG-in-ICO，pack.js 组装），
       不受导出尺寸设置影响（需求 2.3）
     - 打包勾选项（需求 2.3，V2.29 落地）：
         multiSizeChk 多尺寸打包 → 非矢量图输出 zip（32/64/128/256 各一份）
         codeChk     代码打包   → zip 内附带 canvas 代码 + json 预设
         rawChk      原始图片打包 → zip 内附带上传的原始图片（未剪裁）
       任一勾选 → 下载为 zip；zip 内文件沿用命名规则，zip 本身取消{尺寸}
     - buildFileName / downloadBlob：命名 KIcon-{尺寸}-{文本}-{时间}.扩展名
       （代码、ico、json、html、canvas、zip 取消{尺寸}，需求 2.35）
     - pushDownloadHistory：写入下载历史（含缩略图 + 全量快照，P0-5）
     - bindDownloadPaneInteractions：尺寸、透明色、格式按钮绑定
     - updateSize / updateFileName：导出尺寸联动
   版本：V0.09（V2.29：落地 多尺寸打包/代码打包/原始图片打包 三勾选项与真实多尺寸
        ICO（此前 ICO 仅输出单尺寸 PNG 冒名）；ico 文件名取消{尺寸}；下载历史名与
        实际文件一致；抽离 canvasHTMLString/renderIconCanvasAt 复用）
        V0.08（V2.18：updateSize 内安全边距框改调 applySafeMargin——画布等比显示后 px 内缩会错位）
   注意：canvasHTMLString 的模板字符串中包含内联 <script>，
        必须保持 <\/script> 转义写法，否则会截断宿主页面。
   ============================================================ */

/* 文件名内容：所有行拼接——文本用文本、FA 用 FA 代号、图片用原图片名（需求 2.35） */
function fileNameContent(){
  const raw = rows.slice(0, rowCount).map(r => {
    if (r.mode === 'fa') return r.faName || 'fa-icon';
    if (r.mode === 'image') return (r.image && r.image.name) ? r.image.name.replace(/\.[^.]+$/, '') : 'image';
    return r.text || '';
  }).join('');
  return raw.replace(/[\\/:*?"<>|\s]/g, '').slice(0, 20) || 'icon';
}

/* 时间戳 YYYYMMDDHHmmss（需求 2.35 命名规则，文件名多处共用） */
function timeStamp(d){
  const now = d || new Date();
  return now.getFullYear().toString()
    + String(now.getMonth() + 1).padStart(2, '0')
    + String(now.getDate()).padStart(2, '0')
    + String(now.getHours()).padStart(2, '0')
    + String(now.getMinutes()).padStart(2, '0')
    + String(now.getSeconds()).padStart(2, '0');
}

function buildFileName(ext, withSize = true){
  const text = fileNameContent();
  const stamp = timeStamp();
  return withSize ? `KIcon-${iconSize}-${text}-${stamp}.${ext}` : `KIcon-${text}-${stamp}.${ext}`;
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = filename;
  a.href = url;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- 任意尺寸渲染（多尺寸打包 / 多尺寸 ICO 共用，V2.29） ----------
   用当前状态快照在离屏 canvas 上按 size 重画一份（renderSnapshotThumb
   临时切换渲染目标后恢复，不污染主画布与业务状态）。 */
function renderIconCanvasAt(size){
  const c = document.createElement('canvas');
  renderSnapshotThumb(snapshotState(), c, size);
  return c;
}

function canvasToBlob(c, type, q){
  return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error(type + ' 编码失败')), type, q));
}

/* 单个光栅格式 blob（png/jpg/webp）。JPG 无透明：先垫白底（需求 2.3） */
async function blobForFormat(fmt, size){
  const c = renderIconCanvasAt(size);
  if (fmt === 'jpg'){
    const t = document.createElement('canvas');
    t.width = c.width; t.height = c.height;
    const g = t.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, t.width, t.height);
    g.drawImage(c, 0, 0);
    return await canvasToBlob(t, 'image/jpeg', 0.92);
  }
  return await canvasToBlob(c, fmt === 'webp' ? 'image/webp' : 'image/png', 0.92);
}

/* canvas 代码（导出 canvas 格式 / 代码打包共用） */
function canvasHTMLString(){
  const dataURL = cvs.toDataURL('image/png');
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${escapeHtml(rows[0].text || 'icon')}</title></head>
<body style="margin:0;background:#f0f2f7;display:grid;place-items:center;min-height:100vh">
<canvas id="c" width="${iconSize}" height="${iconSize}"></canvas>
<script>
const img = new Image();
img.onload = () => {
  const ctx = document.getElementById('c').getContext('2d');
  ctx.drawImage(img, 0, 0);
};
img.src = "${dataURL}";
<\/script>
</body></html>`;
}

/* ---------- 打包（需求 2.3，V2.29） ---------- */
const MULTI_SIZE_SET = [32, 64, 128, 256];       // 多尺寸打包的常见尺寸
const ICO_SIZES = [16, 32, 48, 64, 128, 256];    // 多尺寸 ICO 内置尺寸（需求 2.3）
const TE = new TextEncoder();

/* 真实多尺寸 ICO：逐尺寸渲染 PNG 后由 pack.js 组装（16/32/48/64/128/256） */
async function buildMultiSizeICO(){
  const entries = [];
  for (const s of ICO_SIZES){
    const c = renderIconCanvasAt(s);
    const blob = await canvasToBlob(c, 'image/png');
    entries.push({ size: s, bytes: new Uint8Array(await blob.arrayBuffer()) });
  }
  return buildICOBlob(entries);
}

/* zip 内的 json 预设条目（= 导出预设；涉及已剪裁图片先询问保存方式），
   返回 null 表示用户取消 */
async function presetJSONZipEntry(){
  const snap = snapshotState();
  const mode = await pickImageExportMode([snap]);
  if (!mode) return null;
  return {
    name: buildFileName('json', false),
    data: TE.encode(JSON.stringify(snapForExport(snap, mode), null, 2))
  };
}

/* 上传的原始图片（需求 2.3）：全部内容行 + 填充色块引用的仓库条目（去重）。
   优先用入库时的原始 dataURL（entry.src），预设导入的图回退重编码整图（未剪裁） */
function collectRawImageEntries(){
  const seen = new Set();
  const list = [];
  const add = id => {
    if (!id || seen.has(id)) return;
    const e = imgGet(id);
    if (e){ seen.add(id); list.push(e); }
  };
  rows.forEach(r => { if (r && r.image && r.image.id) add(r.image.id); });
  fillStyles.forEach(st => { if (st && st.image && st.image.id) add(st.image.id); });
  return list;
}

async function rawImageZipEntries(){
  const used = new Set();
  const out = [];
  for (const e of collectRawImageEntries()){
    const url = e.src || imgFullDataURL(e);
    const m = /^data:image\/(\w+)/.exec(url || '');
    let ext = m ? (m[1] === 'jpeg' ? 'jpg' : m[1]) : 'png';
    const base = (e.name || 'image').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|\s]/g, '') || 'image';
    let name = `${base}.${ext}`;
    let k = 2;
    while (used.has(name.toLowerCase())) name = `${base}(${k++}).${ext}`;
    used.add(name.toLowerCase());
    out.push({ name, data: dataURLBytes(url) });
  }
  return out;
}

/* 任一打包勾选 → 该次下载输出 zip */
function anyPackChecked(){
  return ['multiSizeChk', 'codeChk', 'rawChk'].some(id => $('#' + id)?.checked);
}

/* 打包 zip 内容组装（fmt = 主格式）：
   - 光栅主格式：multiSizeChk → 32/64/128/256 各一份，否则当前尺寸一份
   - ico 主格式：单个多尺寸 ico（勾选打包时它作为文件进入 zip）
   - canvas 主格式：canvas 代码
   - codeChk：附带 canvas 代码（主格式非 canvas 时）+ json 预设
   - rawChk：附带原始图片
   返回 null 表示用户取消（json 导出方式询问被取消） */
async function buildPackZip(fmt){
  const files = [];
  const multi = $('#multiSizeChk')?.checked;
  const codeChk = $('#codeChk')?.checked;
  const rawChk = $('#rawChk')?.checked;
  if (fmt === 'png' || fmt === 'jpg' || fmt === 'webp'){
    const sizes = multi ? MULTI_SIZE_SET : [iconSize];
    for (const s of sizes){
      const blob = await blobForFormat(fmt, s);
      files.push({ name: `KIcon-${s}-${fileNameContent()}-${timeStamp()}.${fmt}`,
                   data: new Uint8Array(await blob.arrayBuffer()) });
    }
  } else if (fmt === 'ico'){
    const blob = await buildMultiSizeICO();
    files.push({ name: buildFileName('ico', false), data: new Uint8Array(await blob.arrayBuffer()) });
  } else if (fmt === 'canvas'){
    files.push({ name: buildFileName('html', false), data: TE.encode(canvasHTMLString()) });
  }
  if (codeChk){
    if (fmt !== 'canvas') files.push({ name: buildFileName('html', false), data: TE.encode(canvasHTMLString()) });
    const j = await presetJSONZipEntry();
    if (!j) return null;
    files.push(j);
  }
  if (rawChk) files.push(...await rawImageZipEntries());
  return zipStoreFiles(files);
}

/* ---------- 各格式导出 ---------- */
async function exportFormat(fmt){
  try {
    if (anyPackChecked()){
      const blob = await buildPackZip(fmt);
      if (!blob){ toast('已取消导出'); return; }
      const zipName = `KIcon-${fileNameContent()}-${timeStamp()}.zip`; // zip 取消{尺寸}（需求 2.35）
      downloadBlob(blob, zipName);
      pushDownloadHistory(fmt, zipName);
      return;
    }
    switch (fmt){
      case 'png':
      case 'jpg':
      case 'webp': {
        const blob = await blobForFormat(fmt, iconSize);
        if (blob) downloadBlob(blob, buildFileName(fmt));
        pushDownloadHistory(fmt);
        break;
      }
      case 'ico': {
        // 始终输出单个多尺寸 ico（内置 16/32/48/64/128/256，需求 2.3）
        const blob = await buildMultiSizeICO();
        const name = buildFileName('ico', false);
        downloadBlob(blob, name);
        pushDownloadHistory('ico', name);
        break;
      }
      case 'canvas': {
        const blob = new Blob([canvasHTMLString()], { type: 'text/html' });
        const name = buildFileName('html', false);
        downloadBlob(blob, name);
        pushDownloadHistory('canvas', name);
        break;
      }
      case 'json': await exportJSON(); break;
      case 'html': exportHTML(); break;
      case 'svg': exportSVG(); break;
    }
  } catch (err){
    console.error(err);
    toast('导出失败：' + (err.message || '未知错误'));
  }
}

/* JSON 导出 = 导出预设（需求 2.34）；涉及已剪裁图片时先提示保存方式（需求 2.1） */
async function exportJSON(){
  const text = await currentStateJSONText();
  if (!text){ toast('已取消导出'); return; }
  downloadBlob(new Blob([text], { type: 'application/json' }), buildFileName('json', false));
  pushDownloadHistory('json', buildFileName('json', false));
}

function exportHTML(){
  const html = `<link rel="icon" type="image/png" href="favicon.png" sizes="any">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="theme-color" content="#6c8cff">
<!-- 由 KiconCreator V2.29 生成 · ${new Date().toISOString()} -->`;
  navigator.clipboard?.writeText(html)
    .then(() => toast('HTML link 标签已复制到剪贴板'))
    .catch(() => {
      downloadBlob(new Blob([html], { type: 'text/html' }), buildFileName('html', false));
    });
  pushDownloadHistory('html', buildFileName('html', false));
}

function exportSVG(){
  toast('SVG 需要单独的矢量渲染逻辑，暂不支持');
}

/* ---------- 下载历史（P0-5） ----------
   name：实际下载文件名（zip 打包时为 zip 名），缺省按格式命名 */
function pushDownloadHistory(fmt, name){
  const snap = snapshotState();
  const thumb = document.createElement('canvas');
  thumb.width = 52; thumb.height = 52;
  renderSnapshotThumb(snap, thumb, 52); // 由数据 json 绘制预览图（需求 2.2）
  const entry = {
    name: name || buildFileName(fmt),
    snap,
    thumb: thumb.toDataURL('image/png')
  };
  downloadHistory.unshift(entry);
  imgRetainSnap(entry, 'hist:');   // 下载历史持引用（需求 六.1）
  while (downloadHistory.length > HISTORY_MAX){
    imgReleaseSnap(downloadHistory.pop()); // 超出上限淘汰 → 注销图片引用
  }
  renderHistory();
}

/* ---------- 下载 pane 绑定 ---------- */
function bindDownloadPaneInteractions(){
  const dl = document.querySelector('[data-pane="download"]');
  if (!dl) return;
  const sp = dl.querySelector('#sizePreset');
  const si = dl.querySelector('#sizeInput');
  if (sp) sp.addEventListener('change', e => {
    if (si) si.value = e.target.value;
    updateSize();
    commitHistory();
  });
  if (si){
    si.addEventListener('change', () => {
      let v = parseInt(si.value, 10);
      if (isNaN(v) || v < 16 || v > 8192){
        const fixed = flashInvalid(si, 16, 8192);
        setTimeout(() => { si.value = fixed; updateSize(); }, 620);
        return;
      }
      updateSize();
      commitHistory();
    });
  }
  /* 透明色选项：实时作用于画布背景（需求 1.8） */
  const tc = dl.querySelector('#transparentChk');
  if (tc && !tc.dataset.bound){
    tc.dataset.bound = '1';
    tc.addEventListener('change', () => { drawIcon(); commitHistory(); });
  }
  /* P0-2：格式按钮 → 真实导出（V2.29 起支持打包勾选项） */
  dl.querySelectorAll('.fmt').forEach(b => b.addEventListener('click', () => exportFormat(b.dataset.fmt)));
}

/* ---------- 导出尺寸 ----------
   iconSize 是共享变量：预览模块的 #sizeSelect 与下载 pane 的
   #sizePreset 是同一参数的两个下拉入口（需求 1.1），updateSize
   统一同步两处下拉与 #sizeInput 后重绘。
   注意：#sizeInput 由下载 pane 动态生成，尚未渲染时保留当前 iconSize
   并照常重绘（不可提前 return，否则 restoreState 等调用方会漏掉重绘） */
function updateSize(){
  const si = document.querySelector('#sizeInput');
  if (si) iconSize = parseInt(si.value, 10) || 256;
  ['#sizeSelect', '#sizePreset'].forEach(selId => {
    const sel = document.querySelector(selId);
    // 自定义尺寸无对应选项时保持原显示（真实值以 #sizeInput 为准）
    if (sel && sel.querySelector('option[value="' + iconSize + '"]')) sel.value = String(iconSize);
  });
  // 安全边距框内缩量交给 preview.js 统一按百分比设置（画布显示尺寸 ≠ 逻辑尺寸，不能用 px 写死）
  applySafeMargin();
  drawIcon();
  updateFileName();
}

function updateFileName(){
  const el = document.querySelector('#fileName');
  if (!el) return;
  el.textContent = buildFileName('png');
}
