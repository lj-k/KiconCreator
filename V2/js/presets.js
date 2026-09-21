/* ============================================================
   KiconCreator V2 · js/presets.js
   职责：预设（P0-4）与历史/预设列表渲染（P0-5）。
     - savePreset / exportPresets / importPresets / applyPreset
     - renderPresets（预设网格，右键删除）
     - renderHistory（下载历史列表，点击恢复快照）
     - 顶层注册 [data-act] 委托点击（导入/导出/保存/复制 JSON/复制 HTML）
   版本：V0.03（V2.14：导出/下载/复制 JSON 统一走 snapForExport——
        已剪裁图片先提示"原始/剪裁后"，选剪裁后即清零剪裁参数避免二次裁切）
   依赖：state.js（PRESETS/downloadHistory）、history.js（snapshotState/restoreState）、
        images.js（ImageRepo/imgIsCropped/imgCropDataURL/imgFullDataURL）、
        imagePane.js（askImageExportMode）、canvas.js（renderSnapshotThumb）。
   ============================================================ */

/* ---------- 预设实现（P0-4） ---------- */
let presetSeq = 0; // 预设稳定标识（图片引用键用，避免数组下标漂移）

function savePreset(){
  const snap = snapshotState();
  const name = prompt('请输入预设名称', `预设 ${PRESETS.length + 1}`);
  if (!name) return;
  const preset = { uid: 'p' + (++presetSeq), name, snap, time: Date.now() };
  PRESETS.push(preset);
  imgRetainSnap(preset, 'preset:'); // 预设持图片引用（需求 六.1）
  renderPresets();
  toast('已保存为预设（仅本次会话有效）');
}

/* 导出用结构：图片数据随 JSON 导出，仓库 id 属于本会话不导出（需求 2.1）。
   mode = 'original'：导出整张原图，**保留剪裁参数**（导入后效果与当前一致）
   mode = 'cropped' ：只导出剪裁后的画面，**清零剪裁参数**——
     否则导入后会拿同一组参数对已剪裁的图再裁一次，出现二次裁切、效果不一致。
   纯函数：全部改动都落在深拷贝上，绝不动会话状态。 */
function snapForExport(snap, mode){
  const src = snap === undefined ? snapshotState() : snap;
  const out = JSON.parse(JSON.stringify(src));
  (out.rows || []).forEach(r => {
    const im = r.image;
    if (!im) return;
    const entry = im.id ? imgGet(im.id) : null;
    if (entry){
      if (mode === 'cropped'){
        im.data = imgCropDataURL(entry, im.crop);
        im.crop = makeImageState().crop; // 清零剪裁参数（比例/缩放/偏移全部复位）
      } else {
        im.data = imgFullDataURL(entry);
      }
    }
    delete im.id;
  });
  return out;
}

/* 统计若干快照中"已剪裁"的图片，用于导出前提示（需求 2.1） */
function croppedImagesOf(snaps){
  const hits = [];
  (snaps || []).forEach(s => {
    (s && s.rows ? s.rows : []).forEach((r, i) => {
      const im = r && r.image;
      if (!im || !im.id) return;
      const entry = imgGet(im.id);
      if (entry && imgIsCropped(entry, im.crop)) hits.push(`第${i + 1}行 ${entry.name}`);
    });
  });
  return hits;
}

/* 涉及已剪裁图片时先让用户选择保存方式；返回 null 表示取消 */
async function pickImageExportMode(snaps){
  const hits = croppedImagesOf(snaps);
  if (!hits.length) return 'original';
  return await askImageExportMode(hits);
}

/* 当前状态的导出 JSON 文本（下载 JSON / 复制 JSON 共用，需求 2.34: json = 导出预设） */
async function currentStateJSONText(){
  const mode = await pickImageExportMode([snapshotState()]);
  if (!mode) return null;
  return JSON.stringify(snapForExport(undefined, mode), null, 2);
}

async function exportPresets(){
  if (PRESETS.length === 0){ toast('没有可导出的预设'); return; }
  const mode = await pickImageExportMode(PRESETS.map(p => p.snap));
  if (!mode){ toast('已取消导出'); return; }
  const data = JSON.stringify(PRESETS.map(p => ({ name: p.name, time: p.time, snap: snapForExport(p.snap, mode) })), null, 2);
  downloadBlob(new Blob([data], { type: 'application/json' }), `KIcon-presets-${Date.now()}.json`);
  toast(`已导出 ${PRESETS.length} 条预设（图片：${mode === 'cropped' ? '剪裁后' : '原始'}）`);
}

/* 导入：把预设内的图片数据注册进会话仓库并改为引用；
   找不到图或解码失败 → 占位"图片缺失"（需求 2.1 / 六.1） */
async function registerPresetImages(snap, presetName, diffs){
  let loaded = 0, missing = 0;
  const list = snap.rows || [];
  for (let i = 0; i < list.length; i++){
    const r = list[i];
    if (!r || !r.image) continue;
    const data = r.image.data;
    const name = r.image.name || '';
    r.image = makeImageState(r.image); // 规范化；丢弃 data 字段
    r.image.id = null;                 // 旧 id 属其它会话，一律作废
    if (data){
      try {
        const entry = await imgLoadData(data, name || '导入图片');
        r.image.id = entry.id;
        r.image.w = entry.w;
        r.image.h = entry.h;
        loaded++;
        continue;
      } catch (e){
        /* 解码失败 → 占位 */
      }
    }
    if (r.mode === 'image' && (data || name || r.image.name)){
      r.image.name = '图片缺失';
      missing++;
    }
  }
  if (missing) diffs.push(`预设「${presetName}」：${missing} 行图片缺失（已用占位）`);
  return loaded;
}

function importPresets(){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.multiple = true; // 需求 2.1：可批量导入多个 json 文件
  input.onchange = async e => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    let okCount = 0, diffCount = 0, failCount = 0;
    const diffs = [];
    const okNames = [];
    for (const file of files){
      let raw;
      try {
        raw = JSON.parse(await file.text());
      } catch (err){
        failCount++; diffs.push(`${file.name}：不是合法 JSON`);
        continue;
      }
      const list = Array.isArray(raw) ? raw : [raw];
      for (let i = 0; i < list.length; i++){
        const item = list[i];
        if (!item || typeof item !== 'object'){ failCount++; continue; }
        const baseSnap = item.snap || item;
        const defaults = snapshotState();
        const merged = { ...defaults, ...baseSnap };
        const diffKeys = Object.keys(baseSnap).filter(k => !(k in defaults));
        const name = item.name || `${file.name} #${i + 1}`;
        await registerPresetImages(merged, name, diffs);
        if (diffKeys.length > 0){
          diffCount++;
          diffs.push(`预设「${name}」：多余字段 ${diffKeys.join(', ')}`);
        }
        const preset = { uid: 'p' + (++presetSeq), name, snap: merged, time: Date.now() };
        PRESETS.push(preset);
        imgRetainSnap(preset, 'preset:');
        okNames.push(name);
        okCount++;
      }
    }
    renderPresets();
    const show = okNames.slice(0, 5).join('、') + (okNames.length > 5 ? ` 等 ${okNames.length} 条` : '');
    toast(`导入完成：成功 ${okCount} 条（${show || '无'}），有差异 ${diffCount} 条，失败 ${failCount} 条`);
    if (diffs.length) console.log('预设导入差异：', diffs);
  };
  input.click();
}

function applyPreset(index){
  const preset = PRESETS[index];
  if (!preset) return;
  restoreState(preset.snap);
  toast(`已应用预设：${preset.name}`);
  commitHistory();
}

function renderPresetsInternal(){
  const grid = $('#presetGrid');
  if (!grid) return;
  grid.innerHTML = '';
  PRESETS.forEach((preset, i) => {
    const d = document.createElement('div');
    d.className = 'preset-item';
    d.title = preset.name;
    const c = document.createElement('canvas');
    c.width = 48; c.height = 48;
    renderSnapshotThumb(preset.snap, c, 48); // 按预设真实样式渲染（需求 2.1，<50px）
    d.appendChild(c);
    d.addEventListener('click', () => applyPreset(i));
    d.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (confirm(`删除预设「${preset.name}」？`)){
        imgReleaseSnap(preset); // 注销该预设持有的图片引用（需求 六.1）
        PRESETS.splice(i, 1);
        renderPresetsInternal();
        toast('已删除预设');
      }
    });
    grid.appendChild(d);
  });
}

/* 对外暴露的 renderPresets */
function renderPresets(){ renderPresetsInternal(); }

/* ---------- 下载历史列表渲染（P0-5） ---------- */
function renderHistoryInternal(){
  const list = $('#historyList');
  if (!list) return;
  list.innerHTML = '';
  if (downloadHistory.length === 0){
    list.innerHTML = '<div style="font-size:11px;color:var(--muted);padding:8px 0">暂无下载历史</div>';
    return;
  }
  downloadHistory.forEach((entry, i) => {
    const d = document.createElement('div');
    d.className = 'history-item';
    const c = document.createElement('canvas');
    c.width = 26; c.height = 26;
    const ctx2 = c.getContext('2d');
    if (entry.thumb){
      const img = new Image();
      img.onload = () => ctx2.drawImage(img, 0, 0, 26, 26);
      img.src = entry.thumb;
    }
    d.appendChild(c);
    const s = document.createElement('div');
    s.className = 'hname';
    s.textContent = entry.name;
    d.appendChild(s);
    const del = document.createElement('button');
    del.className = 'hdel';
    del.textContent = '✕';
    del.title = '删除';
    del.addEventListener('click', e => {
      e.stopPropagation();
      imgReleaseSnap(entry); // 注销该历史快照持有的图片引用（需求 六.1）
      downloadHistory.splice(i, 1);
      renderHistoryInternal();
      toast('已删除历史快照');
    });
    d.appendChild(del);
    d.addEventListener('click', () => {
      restoreState(entry.snap);
      toast('已恢复历史快照：' + entry.name);
    });
    list.appendChild(d);
  });
}
function renderHistory(){ renderHistoryInternal(); }

/* ---------- 预设按钮行为（事件委托） ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'import') importPresets();
  else if (act === 'export') exportPresets();
  else if (act === 'save') savePreset();
  else if (act === 'copy-json'){
    currentStateJSONText().then(text => {
      if (!text){ toast('已取消'); return; }
      navigator.clipboard?.writeText(text)
        .then(() => toast('预设 JSON 已复制到剪贴板'))
        .catch(() => toast('复制失败（浏览器限制）'));
    });
  } else if (act === 'copy-html'){
    const html = `<link rel="icon" type="image/png" href="favicon.png" sizes="any">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">`;
    navigator.clipboard?.writeText(html)
      .then(() => toast('link 标签已复制'))
      .catch(() => toast('复制失败（浏览器限制）'));
  }
});
