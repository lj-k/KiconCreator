/* ============================================================
   KiconCreator V2 · js/fa.js
   职责：FontAwesome 6 图标库交互（需求 2.7）。
     - 数据集（FA_ICONS / FA_GROUPS）在 ../data/fa-icons.js，本文件只做交互
     - ensureFaFonts()：FA6 webfont 按需加载（失败提示并回退占位符）
     - mountFaPanel(body, rowIdx)：FA 标签内从上到下依次为
       搜索框 → 树状分类下拉菜单（optgroup 两级）→ 统一候选图标显示框；
       搜索优先于分类过滤；选中图标仅写回 faName（不触碰文本模式的 text）
   版本：V0.04（V2.12：选中图标只写 faName，不再覆盖文本模式的 text）
   ============================================================ */

/* name → 定义（含搜索用倒排索引） */
const FA_INDEX = (() => {
  const m = {};
  const src = typeof FA_ICONS !== 'undefined' ? FA_ICONS : {};
  Object.keys(src).forEach(name => { m[name] = src[name]; });
  return m;
})();

/* 图标码点 → 字符（'f118' / '24' 均可） */
function faGlyph(name){
  const d = FA_INDEX[name];
  return d ? String.fromCodePoint(parseInt(d.u, 16)) : '';
}

/* FA6 字体装载（V2.08 起字体 base64 内嵌于 data/fa-fonts.css，本地即时可用；
   此调用仅触发加载与首绘刷新，并保留失败提示作为兜底） */
const faFontTried = new Set();
function ensureFaFonts(){
  if (!document.fonts) return;
  ['900 32px "Font Awesome 6 Free"', '400 32px "Font Awesome 6 Brands"'].forEach(spec => {
    if (faFontTried.has(spec)) return;
    faFontTried.add(spec);
    document.fonts.load(spec)
      .then(() => { if (!document.fonts.check(spec)) toast('FA6 字体加载失败，已回退占位符'); })
      .catch(() => toast('FA6 字体加载失败（网络不可用）'))
      .finally(() => scheduleDrawIcon());
  });
}

/* 图标候选单元格 */
function faCellHTML(name, activeName){
  const d = FA_INDEX[name];
  const brands = d.f === 'brands' ? ' brands' : '';
  return `<button class="fa-cell${name === activeName ? ' on' : ''}" data-fa="${name}" title="${name}（${d.k}）"><span class="fa-glyph${brands}">&#x${d.u};</span></button>`;
}

/* 分类下拉菜单：全部图标 + optgroup 大类 → 子类选项（树状两级） */
function faCatSelectHTML(state){
  const total = Object.keys(FA_INDEX).length;
  const opts = [`<option value="all">全部图标（${total}）</option>`];
  FA_GROUPS.forEach((g, gi) => {
    const n = g.subs.reduce((acc, s) => acc + s.icons.length, 0);
    opts.push(`<optgroup label="${g.name}（${n}）">${g.subs.map((s, si) =>
      `<option value="${gi}:${si}"${state.cat === gi + ':' + si ? ' selected' : ''}>${s.cn}（${s.icons.length}）</option>`).join('')}</optgroup>`);
  });
  return `<select class="sel fa-cat-select" title="图标分类">${opts.join('')}</select>`;
}

/* 计算当前候选列表：搜索优先，其次分类 */
function faCurrentList(query, cat){
  const q = (query || '').trim().toLowerCase();
  if (q){
    return Object.keys(FA_INDEX).filter(name => {
      const d = FA_INDEX[name];
      return name.toLowerCase().includes(q) || d.k.includes(q);
    });
  }
  if (cat === 'all') return Object.keys(FA_INDEX);
  const [gi, si] = cat.split(':').map(Number);
  const g = FA_GROUPS[gi];
  if (!g) return Object.keys(FA_INDEX);
  const s = g.subs[si];
  return s ? s.icons.filter(n => FA_INDEX[n]) : [];
}

/* 挂载 FA 面板：搜索框 → 分类下拉 → 统一候选图标框（需求 2.7 / 用户布局要求） */
function mountFaPanel(body, rowIdx){
  const state = { query: '', cat: 'all' };
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="cp-label">第 ${rowIdx + 1} 行 · FontAwesome 6（本地图标库 · ${Object.keys(FA_INDEX).length} 个）</div>
    <input class="fa-search" placeholder="搜索图标 / 别名 / 关键词…">
    ${faCatSelectHTML(state)}
    <div class="fa-grid-box"><div class="fa-grid"></div></div>
    <div class="fa-copyright">FA6 免费版仅部分图标可用于商用（图标 CC BY 4.0 · 字体 SIL OFL 1.1）。</div>`;
  body.appendChild(wrap);

  const gridBox = wrap.querySelector('.fa-grid-box');
  const grid = wrap.querySelector('.fa-grid');
  const search = wrap.querySelector('.fa-search');
  const catSel = wrap.querySelector('.fa-cat-select');

  /* 渲染候选框（只在 搜索词/分类 变化时重建） */
  const renderGrid = () => {
    const list = faCurrentList(state.query, state.cat);
    gridBox.dataset.count = list.length;
    if (list.length === 0){
      grid.innerHTML = `<div style="grid-column:1/-1;font-size:11px;color:var(--muted);padding:10px 2px">未找到匹配「${escapeHtml(state.query)}」的图标</div>`;
      return;
    }
    grid.innerHTML = list.map(n => faCellHTML(n, rows[rowIdx].faName)).join('');
  };
  renderGrid();

  search.addEventListener('input', () => { state.query = search.value; renderGrid(); });
  catSel.addEventListener('change', () => { state.cat = catSel.value; renderGrid(); });

  /* 选中写回：只切换高亮，不整体重建（全量列表下保持流畅） */
  grid.addEventListener('click', e => {
    const cell = e.target.closest('.fa-cell');
    if (!cell) return;
    const name = cell.dataset.fa;
    // 只写 faName，不触碰 text —— 文本模式的文本必须原样保留（需求 四.1 例2）
    rows[rowIdx].faName = name;
    grid.querySelectorAll('.fa-cell.on').forEach(c => c.classList.remove('on'));
    cell.classList.add('on');
    renderContentTabs();
    renderStyle();
    drawIcon();
    toast('已选中图标：' + name);
    commitHistory();
  });
  ensureFaFonts();
}
