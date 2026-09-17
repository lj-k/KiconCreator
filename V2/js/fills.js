/* ============================================================
   KiconCreator V2 · js/fills.js
   职责：内部填充模块渲染。
     - FILL_COLORS：6 个色块的占位渐变色
     - renderFillList：色块列表（激活态 + "共 N 个色块"副标题）
     - renderFillBody2：当前色块的 纯/渐/图 三种模式面板，
       切换模式时整块重建并重新绑定
   版本：V0.01
   依赖：state.js（fillCount/activeFill/fillModes）、builders.js（paramRow）、
        interactions.js（bindPaneInteractions）、history.js（commitHistory）。
   ============================================================ */
const FILL_COLORS = [
  { bg: 'linear-gradient(135deg,#6c8cff,#9b5cff)' },
  { bg: 'linear-gradient(135deg,#22c55e,#14b8a6)' },
  { bg: 'linear-gradient(135deg,#f97316,#ef4444)' },
  { bg: 'linear-gradient(135deg,#0ea5e9,#6366f1)' },
  { bg: 'linear-gradient(135deg,#facc15,#f97316)' },
  { bg: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }
];

function renderFillList(){
  const list = $('#fillList');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < fillCount; i++){
    const b = document.createElement('button');
    b.className = 'fill-swatch' + (i === activeFill ? ' active' : '');
    b.style.background = FILL_COLORS[i].bg;
    b.textContent = i + 1;
    b.onclick = () => { activeFill = i; renderFillList(); renderFillBody2(); };
    list.appendChild(b);
  }
  const sub = $('#fillSub');
  if (sub) sub.textContent = `共 ${fillCount} 个色块`;
}

function renderFillBody2(){
  const body = $('#fillBody2');
  if (!body) return;
  const c = FILL_COLORS[activeFill];
  const mode = fillModes[activeFill] || '纯';
  let content = `<div class="cp-label">色块 ${activeFill + 1} · 独立设置</div>
    <div class="segmented" id="fillModeSeg" style="margin-bottom:9px">
      <button data-fm="纯" class="${mode === '纯' ? 'active' : ''}">纯</button>
      <button data-fm="渐" class="${mode === '渐' ? 'active' : ''}">渐</button>
      <button data-fm="图" class="${mode === '图' ? 'active' : ''}">图</button>
    </div>`;
  if (mode === '纯'){
    content += `
      <div class="param tight"><span class="pname">颜色</span><div class="pctrl"><button class="fill-swatch" style="background:${c.bg};width:24px;height:24px;border-radius:7px"></button><input class="mini-input" value="#6C8CFF" style="flex:1"></div></div>
      ${paramRow('色相', 220, 0, 360, '°', { chain: true })}
      ${paramRow('饱和度', 90, 0, 100, '%', { chain: true })}
      ${paramRow('明度', 70, 0, 100, '%', { chain: true })}
      <div class="param stacked"><span class="pname">颜色建议</span><div class="suggest-row">${['#4d6ef5', '#7c5cff', '#22c55e', '#f59e0b', '#ef4444', '#0ea5e9'].map(x => `<button class="sw" data-c="${x}" style="background:${x}"></button>`).join('')}</div></div>`;
  } else if (mode === '渐'){
    content += `
      <div class="param tight"><span class="pname">起色</span><div class="pctrl"><button class="fill-swatch" style="background:${c.bg};width:24px;height:24px;border-radius:7px"></button><input class="mini-input" value="#6C8CFF" style="flex:1"></div></div>
      <div class="param tight"><span class="pname">止色</span><div class="pctrl"><button class="fill-swatch" style="background:linear-gradient(135deg,#22d3ee,#a78bfa);width:24px;height:24px;border-radius:7px"></button><input class="mini-input" value="#22D3EE" style="flex:1"></div></div>
      <div class="param tight"><span class="pname">渐变类型</span><div class="pctrl"><select class="sel" style="flex:1"><option>线性渐变</option><option>径向渐变</option></select><button class="chain">${CHAIN_SVG}</button></div></div>
      ${paramRow('渐变角度', 90, 0, 360, '°', { chain: true })}`;
  } else {
    content += `
      <label style="display:block;text-align:center;padding:14px;border:1.5px dashed var(--border);border-radius:10px;color:var(--muted);font-size:12px;cursor:pointer;margin:6px 0">📁 上传背景图片</label>
      ${paramRow('大小', 100, 10, 300, '%', { chain: true })}
      ${paramRow('位置 X', 0, -100, 100, '%', { chain: true })}
      ${paramRow('位置 Y', 0, -100, 100, '%', { chain: true })}
      <div style="font-size:10px;color:var(--muted);margin-top:6px">背景填充全部被外框形状裁切</div>`;
  }
  body.innerHTML = content;
  bindPaneInteractions('fill', body);
  const seg = body.querySelector('#fillModeSeg');
  if (seg){
    seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      fillModes[activeFill] = b.dataset.fm;
      renderFillBody2();
      commitHistory();
    });
  }
}
