/* ============================================================
   KiconCreator V2 · js/builders.js
   职责：HTML 片段构造器与静态建议数据。
     - paramRow / inlineChips：参数行与芯片组的统一模板
       （data-name/data-min/data-max/data-default 是联动与快照的关键属性）
     - get*Enabled：读取各"启用"复选框状态，驱动 tab 徽标
     - ADVICE_SINGLE / ADVICE_PAIR / FILL_ADVICE：颜色建议数据
     - buildAdviceHTML / buildEdgeParams：建议与边界参数片段
   版本：V0.01
   ============================================================ */

/* ---------- 通用参数行构造 ---------- */
function paramRow(name, value, min = 0, max = 100, unit = '', opts = {}){
  const step = opts.step ?? 1;
  const showChain = opts.chain === true;
  const showReset = opts.reset === true;
  const cls = opts.tight ? 'param tight' : (opts.stacked ? 'param stacked' : 'param');
  return `<div class="${cls}" data-name="${name}" data-min="${min}" data-max="${max}" data-default="${value}">
    <span class="pname">${name}</span>
    <div class="pctrl">
      <input type="range" min="${min}" max="${max}" value="${value}" step="${step}">
      <input class="num" value="${value}">
      ${unit ? `<span class="unit">${unit}</span>` : ''}
      ${showChain ? `<button class="chain" title="参数联动">${CHAIN_SVG}</button>` : ''}
      ${showReset ? `<button class="rst" title="重置为默认值">⟲</button>` : ''}
    </div>
  </div>`;
}
function inlineChips(name, chips, activeIdx = 0, opts = {}){
  const groupAttr = opts.group ? `data-group="${opts.group}"` : '';
  return `<div class="param inline-chips" ${groupAttr}><span class="pname">${name}</span><div class="pctrl"><div class="chip-row">${chips.map((c, i) => `<button class="chip${i === activeIdx ? ' active' : ''}">${c}</button>`).join('')}</div></div></div>`;
}

function getShadowEnabled(){ const el = document.querySelector('#shadowEnable'); return el ? el.checked : true; }
function getBorderEnabled(){ const el = document.querySelector('#borderEnable'); return el ? el.checked : true; }
function getFShadowEnabled(){ const el = document.querySelector('#fshadowEnable'); return el ? el.checked : false; }

/* ---------- 颜色建议 ---------- */
const ADVICE_SINGLE = [
  { name: '互补色', colors: ['#4d6ef5', '#f5a04d', '#f5d74d', '#4df5a0'] },
  { name: '类似色', colors: ['#4d6ef5', '#7c5cff', '#a04df5', '#c04de0'] },
  { name: '柔和色', colors: ['#a8b8f0', '#f0c9a8', '#f0e6a8', '#a8f0c2'] },
  { name: '明亮色', colors: ['#22d3ee', '#facc15', '#f97316', '#22c55e'] }
];
const ADVICE_PAIR = [
  { name: '互补色', colors: [['#4d6ef5', '#f5a04d'], ['#f5d74d', '#4df5a0'], ['#a04df5', '#f54d6e'], ['#22d3ee', '#4df5d7']] },
  { name: '类似色', colors: [['#4d6ef5', '#7c5cff'], ['#a04df5', '#c04de0'], ['#4da0f5', '#4df5d7'], ['#7c5cff', '#a04df5']] },
  { name: '柔和色', colors: [['#a8b8f0', '#f0c9a8'], ['#f0e6a8', '#a8f0c2'], ['#d8a8f0', '#f0a8c9'], ['#a8f0e6', '#c2f0a8']] },
  { name: '明亮色', colors: [['#22d3ee', '#facc15'], ['#f97316', '#22c55e'], ['#ec4899', '#8b5cf6'], ['#facc15', '#22d3ee']] }
];
function buildAdviceHTML(mode){
  if (mode === '单色'){
    return ADVICE_SINGLE.map(g => `<div class="param tight"><span class="pname">${g.name}</span><div class="pctrl"><div class="suggest-row">${g.colors.map(c => `<button class="sw" data-c="${c}" style="background:${c}"></button>`).join('')}</div></div></div>`).join('');
  }
  return ADVICE_PAIR.map(g => `<div class="param tight"><span class="pname">${g.name}</span><div class="pctrl"><div class="suggest-row">${g.colors.map(p => `<button class="sw-pair" data-c1="${p[0]}" data-c2="${p[1]}"><span class="sw" style="background:${p[0]}"></span><span class="sw" style="background:${p[1]}"></span></button>`).join('')}</div></div></div>`).join('');
}
const FILL_ADVICE = {
  互补: ['#4d6ef5', '#f5a04d', '#f5d74d', '#4df5a0', '#a04df5', '#f54d6e'],
  类似: ['#4d6ef5', '#7c5cff', '#a04df5', '#c04de0', '#4da0f5', '#4df5d7'],
  柔和: ['#a8b8f0', '#f0c9a8', '#f0e6a8', '#a8f0c2', '#d8a8f0', '#f0a8c9'],
  明亮: ['#22d3ee', '#facc15', '#f97316', '#22c55e', '#ec4899', '#8b5cf6']
};
function buildEdgeParams(shape){
  if (shape === '直线') return `<div style="font-size:10.5px;color:var(--muted);padding:4px 0">直线边界无可调参数</div>`;
  if (shape === 'sin' || shape === 'tan'){
    return `<div class="param tight"><span class="pname">边界参数</span><div class="pctrl" style="gap:6px">${['A', 'ω', 'φ', 'k'].map(p => `<div style="display:flex;flex-direction:column;gap:3px;align-items:center"><span style="font-size:9.5px;color:var(--muted)">${p}</span><input class="num tiny" style="width:100%;flex:1" value="1"></div>`).join('')}</div></div>`;
  }
  if (shape === '锯齿'){
    return `<div class="param tight"><span class="pname">边界参数</span><div class="pctrl" style="gap:6px">${['A', 'ω'].map(p => `<div style="display:flex;flex-direction:column;gap:3px;align-items:center"><span style="font-size:9.5px;color:var(--muted)">${p}</span><input class="num tiny" style="width:100%;flex:1" value="1"></div>`).join('')}</div></div>`;
  }
  return '';
}
