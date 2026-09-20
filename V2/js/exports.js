/* ============================================================
   KiconCreator V2 · js/exports.js
   职责：真实导出（P0-2 / 需求 2.3）与下载 pane。
     - exportPNG/JPG/WebP/ICO/Canvas/JSON/HTML/SVG
       （预览即导出：画布内容即导出内容，辅助线在 SVG 覆盖层不入画布）
     - buildFileName / downloadBlob：默认命名 KIcon-{尺寸}-{文本}-{时间}.扩展名
     - pushDownloadHistory：写入下载历史（含缩略图 + 全量快照，P0-5）
     - bindDownloadPaneInteractions：尺寸、透明色、格式按钮绑定
     - updateSize / updateFileName：导出尺寸联动
   版本：V0.04（V2.10：updateSize 统一同步预览/下载两处尺寸下拉；移除 sizeTag）
   注意：exportCanvas 的模板字符串中包含内联 <script>，
        必须保持 <\/script> 转义写法，否则会截断宿主页面。
   ============================================================ */

function buildFileName(ext, withSize = true){
  const now = new Date();
  const stamp = now.getFullYear().toString()
    + String(now.getMonth() + 1).padStart(2, '0')
    + String(now.getDate()).padStart(2, '0')
    + String(now.getHours()).padStart(2, '0')
    + String(now.getMinutes()).padStart(2, '0')
    + String(now.getSeconds()).padStart(2, '0');
  // 文本内容：首行内容；FA 行使用 FA代号（需求 2.35）
  const r0 = rows[0];
  const raw = r0.mode === 'fa' ? (r0.faName || 'fa-icon') : (r0.text || 'icon');
  const text = raw.replace(/[\\/:*?"<>|\s]/g, '').slice(0, 20) || 'icon';
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

/* ---------- 各格式导出 ---------- */
function exportPNG(){
  cvs.toBlob(blob => {
    if (blob) downloadBlob(blob, buildFileName('png'));
    pushDownloadHistory('png');
  }, 'image/png');
}

function exportJPG(){
  // JPG 不支持透明：先填白底
  const tmp = document.createElement('canvas');
  tmp.width = cvs.width; tmp.height = cvs.height;
  const tctx = tmp.getContext('2d');
  tctx.fillStyle = '#ffffff';
  tctx.fillRect(0, 0, tmp.width, tmp.height);
  tctx.drawImage(cvs, 0, 0);
  tmp.toBlob(blob => {
    if (blob) downloadBlob(blob, buildFileName('jpg'));
    pushDownloadHistory('jpg');
  }, 'image/jpeg', 0.92);
}

function exportWebP(){
  cvs.toBlob(blob => {
    if (blob) downloadBlob(blob, buildFileName('webp'));
    pushDownloadHistory('webp');
  }, 'image/webp', 0.92);
}

function exportCanvas(){
  const dataURL = cvs.toDataURL('image/png');
  const html = `<!DOCTYPE html>
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
  downloadBlob(new Blob([html], { type: 'text/html' }), buildFileName('html', false));
  pushDownloadHistory('canvas');
}

function exportJSON(){
  const data = JSON.stringify(snapshotState(), null, 2);
  downloadBlob(new Blob([data], { type: 'application/json' }), buildFileName('json', false));
  pushDownloadHistory('json');
}

function exportHTML(){
  const html = `<link rel="icon" type="image/png" href="favicon.png" sizes="any">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="theme-color" content="#6c8cff">
<!-- 由 KiconCreator V2.10 生成 · ${new Date().toISOString()} -->`;
  navigator.clipboard?.writeText(html)
    .then(() => toast('HTML link 标签已复制到剪贴板'))
    .catch(() => {
      downloadBlob(new Blob([html], { type: 'text/html' }), buildFileName('html', false));
    });
  pushDownloadHistory('html');
}

function exportICO(){
  // 单尺寸 ICO 的简化实现：先输出 PNG 并提示
  cvs.toBlob(blob => {
    if (blob) downloadBlob(blob, buildFileName('ico'));
    pushDownloadHistory('ico');
    toast('ICO 单尺寸已导出（多尺寸打包开发中）');
  }, 'image/png');
}

function exportSVG(){
  toast('SVG 需要单独的矢量渲染逻辑，暂不支持');
}

/* ---------- 下载历史（P0-5） ---------- */
function pushDownloadHistory(fmt){
  const now = new Date();
  const stamp = now.getFullYear().toString()
    + String(now.getMonth() + 1).padStart(2, '0')
    + String(now.getDate()).padStart(2, '0')
    + String(now.getHours()).padStart(2, '0')
    + String(now.getMinutes()).padStart(2, '0')
    + String(now.getSeconds()).padStart(2, '0');
  const thumb = document.createElement('canvas');
  thumb.width = 52; thumb.height = 52;
  const tctx = thumb.getContext('2d');
  tctx.drawImage(cvs, 0, 0, 52, 52);
  const entry = {
    name: `KIcon-256-${(rows[0].text || 'icon').slice(0, 8)}-${stamp}.${fmt}`,
    snap: snapshotState(),
    thumb: thumb.toDataURL('image/png')
  };
  downloadHistory.unshift(entry);
  if (downloadHistory.length > HISTORY_MAX) downloadHistory.length = HISTORY_MAX;
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
  /* P0-2：格式按钮 → 真实导出 */
  dl.querySelectorAll('.fmt').forEach(b => b.addEventListener('click', () => {
    const fmt = b.dataset.fmt;
    try {
      switch (fmt){
        case 'png': exportPNG(); break;
        case 'jpg': exportJPG(); break;
        case 'webp': exportWebP(); break;
        case 'ico': exportICO(); break;
        case 'canvas': exportCanvas(); break;
        case 'json': exportJSON(); break;
        case 'html': exportHTML(); break;
        case 'svg': exportSVG(); break;
      }
    } catch (err){
      console.error(err);
      toast('导出失败：' + (err.message || '未知错误'));
    }
  }));
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
  const S = iconSize;
  const pct = Math.min(50, Math.max(0, +$('#safePct').value || 10));
  const sb = $('#safeBox');
  if (sb) sb.style.inset = (S * pct / 100) + 'px';
  drawIcon();
  updateFileName();
}

function updateFileName(){
  const el = document.querySelector('#fileName');
  if (!el) return;
  el.textContent = buildFileName('png');
}
