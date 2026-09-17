/* ============================================================
   KiconCreator V2 · js/history.js
   职责：撤销/重做（P0-3）与状态快照/恢复（P0-4/P0-5 基础）。
     - commitHistory：任何用户操作完成后调用，压栈当前快照
     - undo / redo：弹出快照并 restoreState
     - snapshotState：采集 DOM 参数 + 业务状态 → 可序列化对象
       （新增可撤销参数时，必须同时扩展 snapshotState 与 restoreState）
     - restoreState：应用快照并触发全量重绘
   版本：V0.01
   约束：HistoryStack.isRestoring 为 true 期间 push 被忽略，防止递归入栈。
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

/* ---------- 状态快照 / 恢复 ---------- */
function snapshotState(){
  // 收集所有滑块值
  const params = {};
  document.querySelectorAll('.param[data-name]').forEach(p => {
    const n = p.querySelector('.num');
    if (n) params[p.dataset.name] = +n.value;
  });
  return {
    version: '2.04',
    rowCount,
    activeRow,
    rows: rows.map(r => ({ ...r })),
    fills: fillModes.map((m, i) => ({ mode: m, color: FILL_COLORS[i]?.bg || '' })),
    fillCount,
    currentColorMode,
    currentEdgeShape,
    iconSize,
    safeMargin: +$('#safePct').value || 10,
    safeChk: $('#safeChk').checked,
    guides: $('#guideSelect').value,
    transparent: $('#transparentChk')?.checked || false,
    params,
    linkFlags: { ...linkFlags }
  };
}

function restoreState(snap){
  if (!snap) return;
  HistoryStack.isRestoring = true;
  try {
    if (snap.rows) rows = snap.rows.map(r => ({ ...r }));
    if (snap.rowCount !== undefined) rowCount = snap.rowCount;
    if (snap.activeRow !== undefined) activeRow = Math.min(snap.activeRow, rowCount - 1);
    if (snap.fillCount !== undefined) fillCount = snap.fillCount;
    if (snap.currentColorMode !== undefined) currentColorMode = snap.currentColorMode;
    if (snap.currentEdgeShape !== undefined) currentEdgeShape = snap.currentEdgeShape;
    if (snap.iconSize !== undefined){
      iconSize = snap.iconSize;
      const si = document.querySelector('#sizeInput');
      if (si) si.value = iconSize;
      const tag = $('#sizeTag');
      if (tag) tag.textContent = `${iconSize} × ${iconSize}`;
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
    if (snap.linkFlags){
      Object.keys(linkFlags).forEach(k => delete linkFlags[k]);
      Object.assign(linkFlags, snap.linkFlags);
    }
    if (snap.params){
      document.querySelectorAll('.param[data-name]').forEach(p => {
        const name = p.dataset.name;
        if (snap.params[name] !== undefined){
          const r = p.querySelector('input[type=range]');
          const n = p.querySelector('.num');
          if (r && n){
            r.value = snap.params[name];
            n.value = snap.params[name];
            const min = +r.min || 0, max = +r.max || 100;
            r.style.setProperty('--fill', (((snap.params[name] - min) / (max - min)) * 100).toFixed(1) + '%');
          }
        }
      });
    }
    // 重绘
    renderRowCount();
    renderLayoutChips();
    renderContentTabs();
    renderContentBody();
    renderFillList();
    renderFillBody2();
    renderPresets();
    renderHistory();
    drawIcon();
    updateFileName();
    syncAllChainIcons();
    updateLinkageBtnState();
    requestAnimationFrame(refreshLayout);
  } finally {
    HistoryStack.isRestoring = false;
  }
}
