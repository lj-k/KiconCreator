/* ============================================================
   KiconCreator V2 · js/history.js
   职责：撤销/重做（P0-3 / 需求 四.2）与状态快照/恢复。
     - commitHistory：用户操作完成后压栈（滑块拖动中不入栈）
     - undo / redo：Ctrl+Z / Ctrl+Y；撤销后人工修改使重做失效（栈裁剪）
     - snapshotState / restoreState：全量快照（rows 深拷贝含 params/link）
   版本：V0.13（V2.29：快照 version 字段随项目版本升至 2.29；打包导出产生的下载历史与普通下载一致）
        V0.12（V2.28：fills 快照含每色块渐变/图片参数；恢复后 imgSyncFillRefs 对齐图片引用）
        V0.11（V2.24：快照移除 UI-only 的 currentEdgeShape；fill 字段现在含填充边界参数）
        V0.10（V2.22：快照/恢复纳入 fillParams 并在恢复后校准分界线数组）
   约束：新增状态字段时必须同时扩展 snapshotState 与 restoreState。
   ============================================================ */

/* ---------- 撤销 / 重做 ---------- */
function commitHistory(){
  if (!stateReady) return;
  HistoryStack.push(snapshotState());
}

function undo(){
  const snap = HistoryStack.undo();
  if (!snap){ toast('没有可撤销的操作'); return; }
  restoreState(snap);
  toast('已撤销');
}
function redo(){
  const snap = HistoryStack.redo();
  if (!snap){ toast('没有可重做的操作'); return; }
  restoreState(snap);
  toast('已重做');
}

/* ---------- 状态快照 ---------- */
function snapshotState(){
  return {
    version: '2.29',
    rowCount,
    activeRow,
    rows: rows.map(normalizeRow),
    currentLayout,
    layoutByCount: { ...layoutByCount },
    layerOrder,
    /* 色块背景（需求 3.2）：模式 + 纯色值 + 渐变/图片扩展参数（V2.28）。
       image.id 属本会话仓库：快照/撤销栈经 imgRefsOfSnap → imgRetainSnap 自动持引用 */
    fills: fillModes.map((m, i) => {
      const st = fillStyles[i] || makeFillStyle();
      return {
        mode: m,
        color: fillColors[i] || '',
        grad: { from: st.grad.from, to: st.grad.to, type: st.grad.type, angle: st.grad.angle },
        image: st.image ? { id: st.image.id, name: st.image.name, w: st.image.w, h: st.image.h,
                            crop: st.image.crop ? { ...st.image.crop } : null,
                            size: st.image.size, fx: st.image.fx, fy: st.image.fy } : null
      };
    }),
    fillCount,
    activeFill,
    fill: normalizeFillParams(fillParams),  // 填充数量与布局 + 填充边界（需求 三.2）：含三组多分界线数组
    bg: normalizeBgParams(bgParams),   // 形状与外框（需求 三.1）：全局唯一，整体入快照
    iconSize,
    safeMargin: +$('#safePct').value || 10,
    safeChk: $('#safeChk').checked,
    guides: $('#guideSelect').value,
    transparent: $('#transparentChk')?.checked || false
  };
}

function restoreState(snap){
  if (!snap) return;
  HistoryStack.isRestoring = true;
  try {
    if (snap.rows) rows = snap.rows.map(normalizeRow); // 规范化：补齐缺失键，不丢任何已存数据
    if (snap.rowCount !== undefined) rowCount = snap.rowCount;
    if (snap.activeRow !== undefined) activeRow = Math.min(snap.activeRow, rowCount - 1);
    if (snap.currentLayout !== undefined) currentLayout = snap.currentLayout;
    layoutByCount = snap.layoutByCount ? { ...snap.layoutByCount } : {};
    layoutByCount[rowCount] = currentLayout; // 排版记忆与当前选择保持一致（需求 四.1 例3）
    if (snap.layerOrder !== undefined) layerOrder = snap.layerOrder;
    if (snap.fillCount !== undefined) fillCount = snap.fillCount;
    if (snap.activeFill !== undefined) activeFill = Math.min(snap.activeFill, fillCount - 1);
    if (snap.fills){ // 色块模式与色值（旧快照的 color 为 CSS 渐变串，非 #RRGGBB 时忽略）
      snap.fills.forEach((f, i) => {
        if (!f || i > 5) return;
        if (f.mode) fillModes[i] = f.mode;
        if (/^#[0-9a-fA-F]{6}$/.test(f.color || '')) fillColors[i] = f.color.toUpperCase();
        /* 渐变/图片扩展参数（V2.28）：逐字段校验后恢复；image.id 由 imgSyncFillRefs 重新持引用 */
        const st = makeFillStyle();
        if (f.grad && typeof f.grad === 'object'){
          st.grad = {
            from: /^#[0-9a-fA-F]{6}$/.test(f.grad.from || '') ? f.grad.from.toUpperCase() : '',
            to: /^#[0-9a-fA-F]{6}$/.test(f.grad.to || '') ? f.grad.to.toUpperCase() : '',
            type: f.grad.type === '径向' ? '径向' : '线性',
            angle: Math.max(0, Math.min(360, +f.grad.angle || 0))
          };
        }
        if (f.image && typeof f.image === 'object' && f.image.id){
          st.image = {
            id: f.image.id, name: f.image.name || '图片', w: +f.image.w || 0, h: +f.image.h || 0,
            crop: (f.image.crop && typeof f.image.crop === 'object')
              ? { aspect: f.image.crop.aspect || '原图', zoom: Math.max(1, Math.min(8, +f.image.crop.zoom || 1)),
                  ox: Math.max(-1, Math.min(1, +f.image.crop.ox || 0)), oy: Math.max(-1, Math.min(1, +f.image.crop.oy || 0)) }
              : null,
            size: Math.max(10, Math.min(400, +f.image.size || 100)),
            fx: Math.max(-100, Math.min(100, +f.image.fx || 0)),
            fy: Math.max(-100, Math.min(100, +f.image.fy || 0))
          };
        }
        fillStyles[i] = st;
      });
    }
    if (snap.bg) bgParams = normalizeBgParams(snap.bg);   // 形状与外框（需求 三.1）
    if (snap.fill) fillParams = normalizeFillParams(snap.fill); // 填充数量与布局 + 填充边界（需求 三.2）
    syncFillArrays();   // 分界线数组长度按恢复后的 色块数/层数 校准（fillLayout.js）
    if (snap.iconSize !== undefined){
      iconSize = snap.iconSize;
      const si = document.querySelector('#sizeInput');
      if (si) si.value = iconSize;
    }
    if (snap.safeMargin !== undefined){
      const sp = $('#safePct');
      if (sp) sp.value = snap.safeMargin;
      applySafeMargin();   // 边距框内缩量（百分比）随恢复同步（preview.js 提供）
    }
    if (snap.safeChk !== undefined){
      const sc = $('#safeChk');
      if (sc) sc.checked = snap.safeChk;
      $('#safeBox').classList.toggle('show', snap.safeChk);
    }
    if (snap.guides !== undefined){
      const gs = $('#guideSelect');
      if (gs) gs.value = snap.guides;
      const layer = $('#guidesLayer');
      layer.dataset.mode = snap.guides;
      layer.classList.toggle('show', snap.guides !== 'none');
    }
    if (snap.transparent !== undefined){
      const tc = $('#transparentChk');
      if (tc) tc.checked = snap.transparent;
    }
    // 全量重绘
    imgSyncRowRefs(); // 行引用与恢复后的 rows 对齐（快照只是引用，不解除引用）
    imgSyncFillRefs(); // 填充色块图片引用与恢复后的 fillStyles 对齐（V2.28）
    renderRowCount();
    renderLayoutChips();
    renderContentTabs();
    renderContentBody();
    renderFillList();
    renderFillBody2();
    rerenderModule('style');
    rerenderModule('fill'); // 布局/边界 pane 随 fillCount 快照恢复
    rerenderModule('shape'); // 形状/边框/阴影 pane 与标签标题随形状快照恢复
    renderPresets();
    renderHistory();
    ensureWebFont(rows[activeRow].params);
    updateSize(); // 重绘并同步预览/下载两处尺寸下拉
    syncAllChainIcons();
    updateLinkageBtnState();
    requestAnimationFrame(refreshLayoutKeepGroups); // 内容级刷新：标签组结构不变
  } finally {
    HistoryStack.isRestoring = false;
  }
}
