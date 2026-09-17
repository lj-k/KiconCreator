/* ============================================================
   KiconCreator V2 · js/content.js
   职责：内容行（多行设置 + 内容模块）渲染。
     - MODE_LABEL / rowLabel：模式标签与行摘要
     - renderRowCount：行数胶囊 1~9
     - LAYOUTS / renderLayoutChips：按行数生成的排版芯片
     - renderContentTabs / updateActiveTab：内容纵向标签（行切换 + 模式微切换）
     - renderContentBody：当前行的文本/图片/FA 三种模式面板
   版本：V0.01
   依赖：state.js（rows/rowCount/activeRow）、history.js（commitHistory）、
        canvas.js（drawIcon）、interactions.js（bindPaneInteractions）。
   ============================================================ */

function rowLabel(r){
  if (r.mode === 'text') return r.text || '空';
  if (r.mode === 'image') return '图片.png';
  return 'fa-star';
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
      renderRowCount();
      renderLayoutChips();
      renderContentTabs();
      renderContentBody();
      renderStyle();
      $('#layerParam').style.display = rowCount > 1 ? '' : 'none';
      drawIcon();
      requestAnimationFrame(refreshLayout);
      commitHistory();
    };
    box.appendChild(b);
  }
}

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
    b.className = 'chip' + (i === 0 ? ' active' : '');
    b.textContent = name;
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
      if (i === 0) drawIcon();
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

function renderContentBody(){
  const r = rows[activeRow];
  const idx = activeRow + 1;
  const body = $('#contentBody');
  if (r.mode === 'text'){
    body.innerHTML = `
      <div class="cp-label">第 ${idx} 行 · 文本模式</div>
      <div class="param tight"><span class="pname">中文字体</span><div class="pctrl"><select class="sel" style="flex:1"><option>系统默认（黑体）</option><option>思源黑体</option><option>思源宋体</option><option>站酷高端黑</option><option>阿里巴巴普惠体（未下载）</option></select><button class="chain" title="参数联动">${CHAIN_SVG}</button></div></div>
      <div class="param tight"><span class="pname">英文字体</span><div class="pctrl"><select class="sel" style="flex:1"><option>系统默认</option><option>Inter</option><option>Roboto</option><option>Montserrat</option><option>未下载 · Poppins</option></select><button class="chain" title="参数联动">${CHAIN_SVG}</button></div></div>
      <div class="param tight"><span class="pname">粗细</span><div class="pctrl"><select class="sel" style="flex:1"><option>细</option><option selected>常规</option><option>中粗</option><option>粗</option><option>特粗</option></select><button class="chain" title="参数联动">${CHAIN_SVG}</button></div></div>
      <div class="param tight"><span class="pname">斜体</span><div class="pctrl"><label class="mini-check"><input type="checkbox"> 倾斜显示</label><span style="flex:1"></span><button class="chain" title="参数联动">${CHAIN_SVG}</button></div></div>
      <div class="param tight"><span class="pname">排版</span><div class="pctrl"><select class="sel" style="flex:1"><option>横排</option><option>纵排</option><option>环形向心</option></select><button class="chain" title="参数联动">${CHAIN_SVG}</button></div></div>
      <div class="param tight" title="字体优先加载 Web 字体，加载失败自动回退系统字体"><span class="pname">字号</span><div class="pctrl"><input type="range" min="1" max="300" value="100"><input class="num" value="100"><span class="unit">%</span><button class="chain" title="参数联动">${CHAIN_SVG}</button></div></div>`;
  } else if (r.mode === 'image'){
    body.innerHTML = `<div class="cp-label">第 ${idx} 行 · 图片模式</div><div class="cp-actions"><button class="btn sm">打开图片</button><button class="btn ghost sm">剪裁</button></div><div class="cp-thumb">图片预览<br>（剪裁后）</div><div style="margin-top:8px;font-size:10px;color:var(--muted);line-height:1.6">动图仅取首帧；大于 1MB 的图片可能造成卡顿。</div>`;
  } else {
    const icons = ['★', '♥', '⚡', '☀', '☁', '✦', '✿', '◆', '▲', '●', '☂', '♫', '✔', '✈', '☕', '♠', '♦', '♣', '⚙', '✎', '⌘', '☘', '☯', '⚑'];
    body.innerHTML = `
      <div class="cp-label">第 ${idx} 行 · FontAwesome 6</div>
      <div class="param tight"><span class="pname">分类</span><div class="pctrl"><select class="sel" style="flex:1"><option value="all">全部图标</option><optgroup label="表情与人物"><option>笑脸</option><option>手势</option><option>人物</option></optgroup><optgroup label="动物与自然"><option>动物</option><option>植物</option><option>天气</option></optgroup><optgroup label="科技与通讯"><option>设备</option><option>网络</option><option>通信</option></optgroup><optgroup label="符号与图形"><option>箭头</option><option>符号</option><option>图形</option></optgroup><optgroup label="其他"><option>品牌</option><option>文件</option><option>音乐</option></optgroup></select></div></div>
      <input class="fa-search" placeholder="搜索图标 / 别名 / 关键词…">
      <div class="fa-grid">${icons.map(i => `<div class="fa-cell">${i}</div>`).join('')}</div>
      <div style="margin-top:8px;font-size:10px;color:var(--warn);line-height:1.5">FA6 免费版仅部分图标可用于商用。</div>`;
    const search = body.querySelector('.fa-search');
    const grid = body.querySelector('.fa-grid');
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      Array.from(grid.children).forEach(c => { c.style.display = !q || c.textContent.toLowerCase().includes(q) ? '' : 'none'; });
    });
    grid.addEventListener('click', e => {
      const cell = e.target.closest('.fa-cell');
      if (!cell) return;
      rows[activeRow].text = cell.textContent;
      renderContentTabs();
      drawIcon();
      toast('已选中图标：' + cell.textContent);
      commitHistory();
    });
  }
  bindPaneInteractions('content', body);
}
