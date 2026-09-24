/* ============================================================
   KiconCreator V2 · js/tabs.js
   职责：模块 tab 框架。
     - MODULE_TABS：4 个模块（preset/style/shape/fill）的 tab 定义
     - activeTabByModule：各模块当前激活 tab
     - collectTabModuleInfo：测量各 tab 自然高度（preset 模块对齐下载 tab 高度）
     - relayoutColumn / relayoutAllModules：按列高分配 tab 展开分组
     - renderTabGroupsFromGroups：渲染分组后的 tab-group 并绑定切换
     - rerenderModule：单个模块重渲染入口
   版本：V0.05（V2.28：填充模块标签拆分——边界形状 + 边界过渡两个标签（需求 2.3/2.4））
        V0.04（V2.17：标签标题支持函数（形状标签直接显示当前形状名））
   依赖：layout.js（computeTabLayout/measureTabHeights/refreshLayoutKeepGroups）、
        interactions.js（bindPaneInteractions）、presets.js（renderPresets/renderHistory）、
        exports.js（bindDownloadPaneInteractions）—— 均为运行时调用，加载顺序见 index.html。
   ============================================================ */
const MODULE_TABS = {
  preset: [
    { id: 'preset', label: '预设', getContent: () => getPresetPaneHTML() },
    { id: 'history', label: '历史', getContent: () => getHistoryPaneHTML() },
    { id: 'download', label: '下载', getContent: () => getDownloadPaneHTML() }
  ],
  style: [
    { id: 'size', label: '尺寸', getContent: () => paneSize() },
    { id: 'color', label: '颜色', getContent: () => paneColor(rows[activeRow]) },
    { id: 'shadow', label: '阴影', badge: '✓', enabled: () => getShadowEnabled(), getContent: () => paneShadow() }
  ],
  shape: [
    // 形状标签标题直接显示当前形状（需求 五：形状非"无"时在标签上显示形状）
    { id: 'shape', label: () => shapeTabLabel(), getContent: () => shapePaneHTML() },
    { id: 'border', label: '边框', badge: '✓', enabled: () => getBorderEnabled(), getContent: () => borderPaneHTML() },
    { id: 'shadow', label: '阴影', badge: '✓', enabled: () => getFShadowEnabled(), getContent: () => fshadowPaneHTML() }
  ],
  fill: [
    { id: 'layout', label: '布局', getContent: () => fillLayoutPaneHTML() },
    // V2.28：原「填充边界」拆为两个标签（需求 2.3/2.4 本就各自成标签）——
    // 边界形状（形状芯片 + A·ω·φ·k 参数 + 包含形状外框）、边界过渡（过渡宽度 + 过渡样式）
    { id: 'edgeShape', label: '边界形状', getContent: () => fillEdgeShapePaneHTML() },
    { id: 'edgeTransition', label: '边界过渡', getContent: () => fillEdgeTransitionPaneHTML() },
    { id: 'advice', label: '颜色建议', getContent: () => fillAdvicePaneHTML() }
  ]
};

const activeTabByModule = { preset: 'preset', style: 'size', shape: 'shape', fill: 'layout' };

function collectTabModuleInfo(moduleId){
  const container = document.querySelector(`.tab-groups[data-module="${moduleId}"]`);
  if (!container) return null;
  const tabDefs = MODULE_TABS[moduleId];
  if (!tabDefs) return null;
  const tabs = tabDefs.map(t => ({
    id: t.id,
    label: typeof t.label === 'function' ? t.label() : t.label,  // 动态标题（如形状标签显示当前形状）
    badge: t.badge || '',
    enabled: t.enabled ? t.enabled() : false,
    contentHTML: t.getContent()
  }));
  const width = container.getBoundingClientRect().width || 280;
  const naturalHeights = measureTabHeights(tabs, width);
  let heights = naturalHeights;
  if (moduleId === 'preset'){
    const di = tabs.findIndex(t => t.id === 'download');
    if (di >= 0){
      const capH = naturalHeights[di];
      document.documentElement.style.setProperty('--preset-cap', capH + 'px');
      heights = naturalHeights.map((h, i) => (tabs[i].id === 'preset' || tabs[i].id === 'history') ? Math.min(h, capH) : h);
    }
  }
  const maxH = Math.max(...heights);
  const moduleEl = container.closest('.module');
  const savedHeight = container.style.height;
  const savedMinH = container.style.minHeight;
  container.style.height = maxH + 'px';
  container.style.minHeight = maxH + 'px';
  void container.offsetHeight;
  const moduleH = moduleEl ? moduleEl.getBoundingClientRect().height : 0;
  const nonTabH = Math.max(0, moduleH - maxH);
  container.style.height = savedHeight;
  container.style.minHeight = savedMinH;
  void container.offsetHeight;
  return { moduleId, container, moduleEl, tabs, heights, maxH, nonTabH };
}

function relayoutColumn(col){
  if (!col) return;
  const mode = document.documentElement.dataset.layout;
  const topbarH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 54;
  let colH;
  if (mode === 'one') colH = Math.max(col.clientHeight, window.innerHeight - topbarH - 20);
  else colH = col.clientHeight;
  if (colH <= 0) return;
  const cs = getComputedStyle(col);
  const gap = parseFloat(cs.rowGap) || parseFloat(cs.gap) || 14;
  const infos = [];
  col.querySelectorAll('.module').forEach(m => {
    const tg = m.querySelector('.tab-groups');
    if (tg && MODULE_TABS[tg.dataset.module]){
      const info = collectTabModuleInfo(tg.dataset.module);
      if (info) infos.push(info);
    }
  });
  if (infos.length === 0) return;
  const tabModuleEls = infos.map(i => i.moduleEl);
  let otherH = 0, otherCount = 0;
  Array.from(col.children).forEach(child => {
    if (child.classList && child.classList.contains('module') && !tabModuleEls.includes(child)){
      otherH += child.getBoundingClientRect().height;
      otherCount++;
    }
  });
  let baseH = 0;
  infos.forEach(i => { baseH += i.nonTabH + i.maxH; });
  const totalGaps = Math.max(0, infos.length + otherCount - 1) * gap;
  let remain = Math.max(0, colH - otherH - baseH - totalGaps);
  infos.forEach(info => {
    const groups = computeTabLayout(info.heights, remain);
    info.groups = groups;
    let usedTabH = 0;
    groups.forEach(g => {
      if (g.length === 1) usedTabH += info.heights[g[0]];
      else usedTabH += Math.max(...g.map(i => info.heights[i]));
    });
    if (groups.length > 1) usedTabH += (groups.length - 1) * 8;
    const actualExtra = Math.max(0, usedTabH - info.maxH);
    remain = Math.max(0, remain - actualExtra);
  });
  infos.forEach(info => renderTabGroupsFromGroups(info.moduleId, info.container, info.tabs, info.groups));
}

function relayoutAllModules(){
  const mode = document.documentElement.dataset.layout;
  const cols = [];
  if (mode === 'one'){
    const layout = $('.layout');
    if (layout) cols.push(layout);
  } else if (mode === 'two'){
    cols.push(document.querySelector('.col-left'));
    const active = document.querySelector('.col-mid.active') || document.querySelector('.col-right.active');
    if (active) cols.push(active);
  } else {
    ['col-left', 'col-mid', 'col-right'].forEach(cls => {
      const c = document.querySelector('.' + cls);
      if (c) cols.push(c);
    });
  }
  cols.forEach(col => { if (col) relayoutColumn(col); });
}

/* ---------- 分组读取与结构签名（V2.11） ----------
   目的：内容变化时保持标签原位、不重建无关模块 DOM（消除闪烁）。
   分组只在视口变化时由 computeTabLayout 重算，其余情况沿用当前 DOM 划分。 */

/* 读取容器当前已渲染的分组（data-group → 索引数组）。
   tab 集合与预期不一致（如新增/删除标签）时返回 null，交由重算处理 */
function readCurrentGroups(container, tabs){
  const groupEls = Array.from(container.querySelectorAll('.tab-group'));
  if (!groupEls.length) return null;
  const idxOf = {};
  tabs.forEach((t, i) => { idxOf[t.id] = i; });
  const groups = [];
  for (let k = 0; k < groupEls.length; k++){
    const ids = (groupEls[k].dataset.group || '').split(',').filter(Boolean);
    const g = [];
    for (let j = 0; j < ids.length; j++){
      if (idxOf[ids[j]] === undefined) return null; // 标签集合已变化
      g.push(idxOf[ids[j]]);
    }
    if (!g.length) return null;
    groups.push(g);
  }
  const flat = groups.reduce((a, g) => a.concat(g), []);
  if (flat.length !== tabs.length || new Set(flat).size !== tabs.length) return null;
  return groups;
}

/* 结构签名：仅含分组划分与标签启用态。故意不含激活态——
   激活由点击直接切换类名，不构成"结构变化"，不应触发重建 */
function groupsSignature(tabs, groups){
  return groups.map(g => g.map(i => tabs[i].id + (tabs[i].enabled ? '*' : '')).join('+')).join('|');
}

function renderTabGroupsFromGroups(moduleId, container, tabs, groups, forceRebuild){
  const sig = groupsSignature(tabs, groups);
  // 结构未变且非强制重建 → 直接返回，不触碰 DOM（避免无关模块闪烁、标签跑位）
  if (!forceRebuild && container.dataset.renderSig === sig) return;
  container.dataset.renderSig = sig;
  const activeId = activeTabByModule[moduleId] || tabs[0].id;
  container.innerHTML = groups.map(group => {
    const groupTabIds = group.map(i => tabs[i].id);
    const hasActive = groupTabIds.includes(activeId);
    const groupActiveId = hasActive ? activeId : groupTabIds[0];
    const tabsHTML = group.map(i => {
      const t = tabs[i];
      const isActive = t.id === groupActiveId;
      return `<button class="tab ${isActive ? 'active' : ''} ${t.enabled ? 'enabled' : ''}" data-tab="${t.id}">${escapeHtml(t.label)} ${t.badge ? `<span class="badge-ok">${t.badge}</span>` : ''}</button>`;
    }).join('');
    const panesHTML = group.map(i => {
      const t = tabs[i];
      const isActive = t.id === groupActiveId;
      return `<div class="pane ${isActive ? 'active' : ''}" data-pane="${t.id}">${t.contentHTML}</div>`;
    }).join('');
    return `<div class="tab-group" data-group="${groupTabIds.join(',')}"><div class="tabs">${tabsHTML}</div><div class="tab-body">${panesHTML}</div></div>`;
  }).join('');
  container.querySelectorAll('.tab-group').forEach(groupEl => {
    groupEl.querySelectorAll('.tab').forEach(tabEl => {
      tabEl.addEventListener('click', () => {
        const tabId = tabEl.dataset.tab;
        activeTabByModule[moduleId] = tabId;
        groupEl.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tabEl));
        groupEl.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tabId));
      });
    });
  });
  bindPaneInteractions(moduleId, container, moduleId === 'style' ? activeRow : null);
  if (moduleId === 'preset'){
    renderPresets();
    renderHistory();
    bindDownloadPaneInteractions();
  }
}

function rerenderModule(moduleId){
  const container = document.querySelector(`.tab-groups[data-module="${moduleId}"]`);
  if (!container) return;
  const info = collectTabModuleInfo(moduleId);
  if (!info) return;
  // 保持既有分组：标签尺寸变化（如单色→渐变）不得触发重新拆分，
  // 否则标签会在标签组之间跳位，用户找不到原标签（仅视口变化才重算，见 refreshLayout）
  const groups = readCurrentGroups(container, info.tabs) || info.groups || computeTabLayout(info.heights, 0);
  renderTabGroupsFromGroups(moduleId, container, info.tabs, groups, true);
  // 内容级刷新：不重算分组、不重建其它模块，仅更新预览高度与浮动状态
  requestAnimationFrame(refreshLayoutKeepGroups);
}
