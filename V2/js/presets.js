/* ============================================================
   KiconCreator V2 · js/presets.js
   职责：预设（P0-4）与历史/预设列表渲染（P0-5）。
     - savePreset / exportPresets / importPresets / applyPreset
     - renderPresets（预设网格，右键删除）
     - renderHistory（下载历史列表，点击恢复快照）
     - 顶层注册 [data-act] 委托点击（导入/导出/保存/复制 JSON/复制 HTML）
   版本：V0.01
   依赖：state.js（PRESETS/downloadHistory）、history.js（snapshotState/restoreState）。
   ============================================================ */

/* ---------- 预设实现（P0-4） ---------- */
function savePreset(){
  const snap = snapshotState();
  const name = prompt('请输入预设名称', `预设 ${PRESETS.length + 1}`);
  if (!name) return;
  PRESETS.push({
    name,
    snap,
    time: Date.now()
  });
  renderPresets();
  toast('已保存为预设（仅本次会话有效）');
}

function exportPresets(){
  if (PRESETS.length === 0){ toast('没有可导出的预设'); return; }
  const data = JSON.stringify(PRESETS, null, 2);
  downloadBlob(new Blob([data], { type: 'application/json' }), `KIcon-presets-${Date.now()}.json`);
  toast(`已导出 ${PRESETS.length} 条预设`);
}

function importPresets(){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result);
        const list = Array.isArray(raw) ? raw : [raw];
        let okCount = 0, diffCount = 0, failCount = 0;
        const diffs = [];
        list.forEach((item, i) => {
          if (!item || typeof item !== 'object'){
            failCount++;
            return;
          }
          const baseSnap = item.snap || item;
          // 校验并补充默认值
          const defaults = snapshotState();
          const merged = { ...defaults, ...baseSnap };
          const diffKeys = Object.keys(baseSnap).filter(k => !(k in defaults));
          if (diffKeys.length > 0){
            diffCount++;
            diffs.push(`预设「${item.name || '未命名' + i}」：多余字段 ${diffKeys.join(', ')}`);
          }
          PRESETS.push({
            name: item.name || `导入预设 ${i + 1}`,
            snap: merged,
            time: Date.now()
          });
          okCount++;
        });
        renderPresets();
        let msg = `导入完成：成功 ${okCount} 条，有差异 ${diffCount} 条，失败 ${failCount} 条`;
        if (diffs.length) console.log('差异详情：', diffs);
        toast(msg);
      } catch (err) {
        toast('导入失败：文件不是合法 JSON');
      }
    };
    reader.readAsText(file);
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
    const ctx2 = c.getContext('2d');
    const g = ctx2.createLinearGradient(0, 0, 48, 48);
    g.addColorStop(0, '#6c8cff');
    g.addColorStop(1, '#9b5cff');
    ctx2.fillStyle = g;
    roundRect(ctx2, 2, 2, 44, 44, 10);
    ctx2.fill();
    const txt = (preset.snap.rows?.[0]?.text || '?').slice(0, 2);
    ctx2.fillStyle = '#fff';
    ctx2.font = '800 22px sans-serif';
    ctx2.textAlign = 'center';
    ctx2.textBaseline = 'middle';
    ctx2.fillText(txt, 24, 25);
    d.appendChild(c);
    d.addEventListener('click', () => applyPreset(i));
    d.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (confirm(`删除预设「${preset.name}」？`)){
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
    const data = JSON.stringify(snapshotState(), null, 2);
    navigator.clipboard?.writeText(data)
      .then(() => toast('预设 JSON 已复制到剪贴板'))
      .catch(() => toast('复制失败（浏览器限制）'));
  } else if (act === 'copy-html'){
    const html = `<link rel="icon" type="image/png" href="favicon.png" sizes="any">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">`;
    navigator.clipboard?.writeText(html)
      .then(() => toast('link 标签已复制'))
      .catch(() => toast('复制失败（浏览器限制）'));
  }
});
