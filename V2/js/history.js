/* ============================================================
   KiconCreator V2 · js/history.js
   职责：撤销/重做（P0-3 / 需求 四.2）与状态快照/恢复。
     - commitHistory：用户操作完成后压栈（滑块拖动中不入栈）
     - undo / redo：Ctrl+Z / Ctrl+Y；撤销后人工修改使重做失效（栈裁剪）
     - snapshotState / restoreState：全量快照（rows 深拷贝含 params/link）
   版本：V0.04（V2.10：恢复时经 updateSize 同步两处尺寸下拉，移除 sizeTag）
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
    version: '2.10',
    rowCount,
    activeRow,
    rows: rows.map(r => ({ mode: r.mode, text: r.text, faName: r.faName || null, params: { ...r.params }, link: { ...r.link } })),
    currentLayout,
    layerOrder,
    fills: fillModes.map((m, i) => ({ mode: m, color: FILL_COLORS[i]?.bg || '' })),
    fillCount,
    activeFill,
    currentEdgeShape,
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
    if (snap.rows) rows = snap.rows.map(r => ({ mode: r.mode, text: r.text, faName: r.faName || null, params: { ...r.params }, link: { ...r.link } }));
    if (snap.rowCount !== undefined) rowCount = snap.rowCount;
    if (snap.activeRow !== undefined) activeRow = Math.min(snap.activeRow, rowCount - 1);
    if (snap.currentLayout !== undefined) currentLayout = snap.currentLayout;
    if (snap.layerOrder !== undefined) layerOrder = snap.layerOrder;
    if (snap.fillCount !== undefined) fillCount = snap.fillCount;
    if (snap.activeFill !== undefined) activeFill = Math.min(snap.activeFill, fillCount - 1);
    if (snap.currentEdgeShape !== undefined) currentEdgeShape = snap.currentEdgeShape;
    if (snap.iconSize !== undefined){
      iconSize = snap.iconSize;
      const si = document.querySelector('#sizeInput');
      if (si) si.value = iconSize;
    }
    if (snap.safeMargin !== undefined){
      const sp = $('#safePct');
      if (sp) sp.value = snap.safeMargin;
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
    renderRowCount();
    renderLayoutChips();
    renderContentTabs();
    renderContentBody();
    renderFillList();
    renderFillBody2();
    rerenderModule('style');
    renderPresets();
    renderHistory();
    ensureWebFont(rows[activeRow].params);
    updateSize(); // 重绘并同步预览/下载两处尺寸下拉
    syncAllChainIcons();
    updateLinkageBtnState();
    requestAnimationFrame(refreshLayout);
  } finally {
    HistoryStack.isRestoring = false;
  }
}
