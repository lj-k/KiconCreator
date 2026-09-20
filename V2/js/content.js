/* ============================================================
   KiconCreator V2 · js/content.js
   职责：内容行（多行设置 + 内容模块）渲染与绑定。
     - MODE_LABEL / rowLabel：模式标签与行摘要（FA 显示 FA代号）
     - renderRowCount：行数胶囊（行数切换重置排版模式并重绘）
     - LAYOUTS / renderLayoutChips：排版模式芯片（需求 1.2），点击写状态重绘
     - renderLayerChips：多行排列层次（需求 1.3）
     - renderContentTabs / updateActiveTab：内容纵向标签
     - renderContentBody：文本模式面板（字体/粗细/斜体/排版/字号，
       全部 data-pkey 绑定行状态）；FA 面板由 js/fa.js 挂载；图片占位
   版本：V0.04（V2.11：行数切换改用内容级刷新，标签组结构不变）
   ============================================================ */

function rowLabel(r){
  if (r.mode === 'text') return r.text || '空';
  if (r.mode === 'image') return '图片.png';
  return r.faName || ('fa-' + (r.text ? r.text.codePointAt(0).toString(16) : 'icon'));
}

function renderRowCount(){
  const box = $('#rowCount');
  box.innerHTML = '';
  for (let i = 1; i <= 9; i++){
    const b = document.createElement('button');
    b.className = 'pill' + (i === rowCount ? ' active' : '');
    b.textContent = i;
    b.onclick = () => {
      rowCount = i;
      if (activeRow >= rowCount) activeRow = rowCount - 1;
      currentLayout = LAYOUTS[rowCount][0]; // 行数切换后排版模式重置（需求 1.2）
      renderRowCount();
      renderLayoutChips();
      renderContentTabs();
      renderContentBody();
      renderStyle();
      $('#layerParam').style.display = rowCount > 1 ? '' : 'none';
      drawIcon();
      requestAnimationFrame(refreshLayoutKeepGroups); // 内容级刷新：标签组结构不变
      commitHistory();
    };
    box.appendChild(b);
  }
}

/* ---------- 排版模式（需求 1.2：与 canvas.js layoutCells 键名一致） ---------- */
const LAYOUTS = {
  1: ['上半边', '下半边', '左半边', '右半边', '居中'],
  2: ['全在上（左右分）', '全在下（左右分）', '全在左（上下分）', '全在右（上下分）', '左右分', '上下分'],
  3: ['一字横排', '一字纵排', '品字（上1下2）', '倒品（上2下1）'],
  4: ['一字横排', '一字纵排', '四宫格', '纵向121', '横向121'],
  5: ['一字横排', '一字纵排', '环形', '四宫格+中央'],
  6: ['一字横排', '一字纵排', '环形', '2×3', '3×2'],
  7: ['一字横排', '一字纵排', '环形'],
  8: ['一字横排', '一字纵排', '环形', '2×4', '4×2'],
  9: ['一字横排', '一字纵排', '环形', '3×3']
};
function renderLayoutChips(){
  const box = $('#layoutChips');
  box.innerHTML = '';
  LAYOUTS[rowCount].forEach((name, i) => {
    const b = document.createElement('button');
    b.className = 'chip' + (name === currentLayout ? ' active' : '');
    b.textContent = name;
    b.onclick = () => {
      currentLayout = name;
      $$('.chip', box).forEach(c => c.classList.toggle('active', c === b));
      drawIcon();
      commitHistory();
    };
    box.appendChild(b);
  });
}

/* ---------- 多行排列层次（需求 1.3） ---------- */
function renderLayerChips(){
  const box = $('#layerParam .chip-row');
  if (!box) return;
  box.innerHTML = '';
  [['1 行 → 9 行', '1to9'], ['9 行 → 1 行', '9to1']].forEach(([label, val]) => {
    const b = document.createElement('button');
    b.className = 'chip' + (layerOrder === val ? ' active' : '');
    b.textContent = label;
    b.onclick = () => {
      layerOrder = val;
      $$('.chip', box).forEach(c => c.classList.toggle('active', c === b));
      drawIcon();
      commitHistory();
    };
    box.appendChild(b);
  });
}

function updateActiveTab(){
  $$('#contentTabs .vtab').forEach((el, i) => el.classList.toggle('active', i === activeRow));
}

function renderContentTabs(){
  const list = $('#contentTabs');
  list.innerHTML = '';
  for (let i = 0; i < rowCount; i++){
    const r = rows[i];
    const el = document.createElement('div');
    el.className = 'vtab' + (i === activeRow ? ' active' : '');
    el.innerHTML = `
      <span class="rownum">${i + 1}</span>
      <div class="mode-mini">
        <button data-mode="text" class="${r.mode === 'text' ? 'on' : ''}" title="文本">文</button>
        <button data-mode="image" class="${r.mode === 'image' ? 'on' : ''}" title="图片">图</button>
        <button data-mode="fa" class="${r.mode === 'fa' ? 'on' : ''}" title="FontAwesome">F</button>
      </div>
      <input class="vtab-input" value="${escapeHtml(r.mode === 'text' ? (r.text || '') : rowLabel(r))}" ${r.mode !== 'text' ? 'readonly' : ''}>`;
    el.addEventListener('click', e => {
      const mb = e.target.closest('.mode-mini button');
      if (mb){
        e.stopPropagation();
        rows[i].mode = mb.dataset.mode;
        activeRow = i;
        renderContentTabs(); renderContentBody(); renderStyle(); drawIcon();
        commitHistory();
        return;
      }
      if (activeRow !== i){
        activeRow = i;
        updateActiveTab();
        renderContentBody();
        renderStyle();
      }
    });
    const input = $('.vtab-input', el);
    input.addEventListener('input', () => {
      rows[i].text = input.value;
      drawIcon(); // 任意行文本变化都影响画布
      if (i === activeRow){
        const ss = $('#styleSub');
        if (ss) ss.textContent = `行 ${i + 1} · 文本 · “${input.value || '空'}”`;
        const cn = $('#contentNote');
        if (cn) cn.textContent = `行 ${i + 1} · 文本`;
      }
      updateFileName();
    });
    input.addEventListener('blur', () => commitHistory());
    input.addEventListener('focus', () => {
      if (activeRow !== i){
        activeRow = i;
        updateActiveTab();
        renderContentBody();
        renderStyle();
      }
    });
    list.appendChild(el);
  }
}

/* ---------- 单行内容面板 ---------- */
function renderContentBody(){
  const r = rows[activeRow];
  const idx = activeRow + 1;
  const body = $('#contentBody');
  if (r.mode === 'text'){
    const p = r.params;
    body.innerHTML = `
      <div class="cp-label">第 ${idx} 行 · 文本模式</div>
      ${selectRow('中文字体', 'font.cn', p['font.cn'], FONT_CN_OPTIONS)}
      ${selectRow('英文字体', 'font.en', p['font.en'], FONT_EN_OPTIONS)}
      ${selectRow('粗细', 'font.weight', p['font.weight'], PARAM_DEFS['font.weight'].options)}
      <div class="param tight"><span class="pname">斜体</span><div class="pctrl">${checkRow('倾斜显示', 'font.italic', p['font.italic'])}</div></div>
      ${selectRow('排版', 'font.layout', p['font.layout'], PARAM_DEFS['font.layout'].options)}
      ${paramRow('字号', p['font.size'], 1, 300, '%', { key: 'font.size', chain: true })}`;
  } else if (r.mode === 'image'){
    body.innerHTML = `<div class="cp-label">第 ${idx} 行 · 图片模式（暂缓）</div><div class="cp-actions"><button class="btn sm">打开图片</button><button class="btn ghost sm">剪裁</button></div><div class="cp-thumb">图片预览<br>（剪裁后）</div><div style="margin-top:8px;font-size:10px;color:var(--muted);line-height:1.6">动图仅取首帧；大于 1MB 的图片可能造成卡顿。</div>`;
  } else {
    // FA 模式：树状分类面板（数据/绑定在 js/fa.js，需求 2.7）
    body.innerHTML = '';
    mountFaPanel(body, activeRow);
  }
  bindPaneInteractions('content', body, activeRow);
}
