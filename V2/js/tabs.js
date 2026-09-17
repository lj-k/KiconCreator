/* ============================================================
   KiconCreator V2 · js/tabs.js
   职责：模块 tab 框架。
     - MODULE_TABS：4 个模块（preset/style/shape/fill）的 tab 定义
     - activeTabByModule：各模块当前激活 tab
     - collectTabModuleInfo：测量各 tab 自然高度（preset 模块对齐下载 tab 高度）
     - relayoutColumn / relayoutAllModules：按列高分配 tab 展开分组
     - renderTabGroupsFromGroups：渲染分组后的 tab-group 并绑定切换
     - rerenderModule：单个模块重渲染入口
   版本：V0.01
   依赖：layout.js（computeTabLayout/measureTabHeights）、
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
    { id: 'shape', label: '形状', getContent: () => shapePaneHTML() },
    { id: 'border', label: '边框', badge: '✓', enabled: () => getBorderEnabled(), getContent: () => borderPaneHTML() },
    { id: 'shadow', label: '阴影', badge: '✓', enabled: () => getFShadowEnabled(), getContent: () => fshadowPaneHTML() }
  ],
  fill: [
    { id: 'layout', label: '布局', getContent: () => fillLayoutPaneHTML() },
    { id: 'edge', label: '填充边界', getContent: () => fillEdgePaneHTML() },
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
    id: t.id, label: t.label, badge: t.badge || '',
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

function renderTabGroupsFromGroups(moduleId, container, tabs, groups){
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
  bindPaneInteractions(moduleId, container);
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
  const groups = info.groups || computeTabLayout(info.heights, 0);
  renderTabGroupsFromGroups(moduleId, container, info.tabs, groups);
  requestAnimationFrame(refreshLayout);
}
