/* ============================================================
   KiconCreator V2 · js/layout.js
   职责：响应式布局引擎。
     - 顶栏高度测量（--topbar-h）
     - 视口宽度 → 布局模式（three/two/one）
     - 两栏合并标签定位、预览浮动（preview-float）定位与高度
     - 标签组动态展开算法（computeTabLayout 连续切分 + measureTabHeights 测量）
     - refreshLayout（视口级：重算标签组）/ refreshLayoutKeepGroups（内容级：保持标签原位）
   版本：V0.03（V2.11：拆分两级刷新入口，标签组拆分合并仅由视口变化触发）
   ============================================================ */

/* ---------- 顶栏高度测量 ---------- */
function updateTopbarHeight(){
  const tb = $('.topbar');
  if (!tb) return;
  document.documentElement.style.setProperty('--topbar-h', Math.round(tb.getBoundingClientRect().height) + 'px');
}

/* ---------- 视口宽度 → 布局模式 ---------- */
function updateLayoutMode(){
  const w = window.innerWidth, h = window.innerHeight;
  const isPhoneLandscape = w > h && h <= 500;
  const isPhonePortrait = h > w && w < 500;
  let mode;
  if (w > 800 || isPhoneLandscape) mode = 'three';
  else if (w < 400 || isPhonePortrait) mode = 'one';
  else mode = 'two';
  document.documentElement.dataset.layout = mode;
  const layoutEl = $('.layout');
  if (layoutEl) layoutEl.dataset.mode = mode;
  if (mode === 'two'){
    const tab = $('.merge-tab.active')?.dataset.tab || 'mid';
    document.querySelector('.col-mid')?.classList.toggle('active', tab === 'mid');
    document.querySelector('.col-right')?.classList.toggle('active', tab === 'right');
  } else {
    document.querySelector('.col-mid')?.classList.remove('active');
    document.querySelector('.col-right')?.classList.remove('active');
  }
}

function syncMergeTabs(){
  const mt = $('#mergeTabs');
  if (!mt) return;
  if (document.documentElement.dataset.layout !== 'two'){
    mt.style.removeProperty('left'); mt.style.removeProperty('top'); mt.style.removeProperty('width');
    return;
  }
  const col = document.querySelector('.col-mid.active') || document.querySelector('.col-right.active') || document.querySelector('.col-mid');
  if (!col) return;
  const r = col.getBoundingClientRect();
  const topbarH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 54;
  mt.style.left = Math.round(r.left) + 'px';
  mt.style.top = Math.round(topbarH + 8) + 'px';
  mt.style.width = Math.round(r.width) + 'px';
}

function isScrollable(el){ return el && el.scrollHeight > el.clientHeight + 2; }

function checkPreviewFloat(){
  const mode = document.documentElement.dataset.layout;
  const scrollEl = mode === 'one' ? $('.layout') : $('.col-left');
  if (!scrollEl) return;
  const hasScroll = isScrollable(scrollEl);
  const was = document.body.classList.contains('preview-float');
  document.body.classList.toggle('preview-float', hasScroll);
  if (hasScroll) requestAnimationFrame(syncPreviewLayout);
  else if (was){
    const p = $('.module-preview');
    if (p){ p.style.removeProperty('left'); p.style.removeProperty('width'); }
  }
}

function syncPreviewLayout(){
  const preview = $('.module-preview');
  if (!preview) return;
  const mode = document.documentElement.dataset.layout;
  if (mode === 'one'){
    const layout = $('.layout');
    const cs = getComputedStyle(layout);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    preview.style.left = padL + 'px';
    preview.style.width = Math.max(0, window.innerWidth - padL - padR) + 'px';
  } else {
    const colLeft = $('.col-left');
    const r = colLeft.getBoundingClientRect();
    preview.style.left = Math.round(r.left) + 'px';
    preview.style.width = Math.round(r.width) + 'px';
  }
  document.documentElement.style.setProperty('--preview-placeholder-h', Math.round(preview.getBoundingClientRect().height) + 'px');
}

function updatePreviewHeight(){
  const preview = $('.module-preview');
  if (!preview) return;
  const mode = document.documentElement.dataset.layout;
  if (mode === 'one'){
    const col = $('.layout');
    if (!col) return;
    const topbarH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 54;
    const colH = Math.max(col.clientHeight, window.innerHeight - topbarH - 20);
    const siblings = Array.from(col.children).filter(el => el.classList.contains('module') && !el.classList.contains('module-preview'));
    const cs = getComputedStyle(col);
    const gap = parseFloat(cs.rowGap) || parseFloat(cs.gap) || 12;
    let otherH = 0;
    siblings.forEach(m => { otherH += m.getBoundingClientRect().height; });
    if (siblings.length > 0) otherH += (siblings.length - 1) * gap;
    const available = colH - otherH - 20;
    let maxH;
    if (available >= 320) maxH = Math.min(available, colH * 0.55);
    else maxH = colH / 3;
    maxH = Math.max(150, Math.min(maxH, colH * 0.7));
    preview.style.height = Math.round(maxH) + 'px';
  } else {
    const w = preview.getBoundingClientRect().width;
    if (w <= 0) return;
    let targetH = w;
    const col = preview.parentElement;
    const colH = col ? col.clientHeight : window.innerHeight;
    targetH = Math.min(targetH, Math.max(180, colH * 0.9));
    targetH = Math.max(targetH, 180);
    preview.style.height = Math.round(targetH) + 'px';
  }
  if (document.body.classList.contains('preview-float')){
    document.documentElement.style.setProperty('--preview-placeholder-h', Math.round(preview.getBoundingClientRect().height) + 'px');
  }
}

/* ---------- 标签组动态展开算法（连续切分） ---------- */
function computeTabLayout(heights, extraSpace, groupGap = 8){
  const n = heights.length;
  if (n <= 1) return [Array.from({length: n}, (_, i) => i)];
  const maxH = Math.max(...heights);
  const totalAvail = maxH + Math.max(0, extraSpace);
  const totalMasks = 1 << (n - 1);
  let best = null;
  for (let mask = 0; mask < totalMasks; mask++){
    const groups = [];
    let cur = [0];
    for (let i = 0; i < n - 1; i++){
      if (mask & (1 << i)){ groups.push(cur); cur = [i + 1]; }
      else cur.push(i + 1);
    }
    groups.push(cur);
    let total = 0;
    groups.forEach(g => { total += Math.max(...g.map(i => heights[i])); });
    total += (groups.length - 1) * groupGap;
    if (total > totalAvail) continue;
    const candidate = { segCount: groups.length, total, mask, groups };
    if (!best || candidate.segCount > best.segCount
      || (candidate.segCount === best.segCount && candidate.total > best.total)
      || (candidate.segCount === best.segCount && candidate.total === best.total && candidate.mask > best.mask)){
      best = candidate;
    }
  }
  if (!best) return [Array.from({length: n}, (_, i) => i)];
  return best.groups;
}

function measureTabHeights(tabs, width){
  const w = Math.max(160, Math.round(width) || 280);
  const probe = document.createElement('div');
  probe.style.cssText = `position:absolute;left:-9999px;top:0;width:${w}px;visibility:hidden;pointer-events:none`;
  probe.style.setProperty('--preset-cap', '99999px');
  document.body.appendChild(probe);
  const heights = tabs.map(t => {
    probe.innerHTML = `<div class="tab-group"><div class="tabs"><button class="tab active">${escapeHtml(t.label)}</button></div><div class="tab-body"><div class="pane active">${t.contentHTML}</div></div></div>`;
    return probe.firstElementChild.offsetHeight;
  });
  document.body.removeChild(probe);
  return heights;
}

/* ---------- 刷新入口（V2.11：按触发源分为两级） ----------
   refreshLayout            视口级：重算标签组拆分/合并（resize、方向切换、
                            布局模式切换、字体就绪、合并标签切换、放大预览、初始化）
   refreshLayoutKeepGroups  内容级：不改动标签组结构（标签保持原位），仅更新
                            顶栏高度、合并标签定位、预览高度与浮动状态
                           （切换行、改参数、撤销、行数/填充数量变化） */
function refreshLayout(){
  updateTopbarHeight();
  updateLayoutMode();
  syncMergeTabs();
  relayoutAllModules();
  updatePreviewHeight();
  checkPreviewFloat();
}

function refreshLayoutKeepGroups(){
  updateTopbarHeight();
  syncMergeTabs();
  updatePreviewHeight();
  checkPreviewFloat();
}
