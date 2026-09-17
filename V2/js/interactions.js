/* ============================================================
   KiconCreator V2 · js/interactions.js
   职责：pane 内交互的统一绑定入口 bindPaneInteractions(moduleId, container)。
     - 滑块/数字输入：--fill 填充、联动（change）、commitHistory
     - 重置按钮、链条按钮（linkFlags 切换）
     - chip 单选组（排除 shape 组与边界形状行）
     - 颜色建议 swatch、阴影/边框启用复选框 → tab 徽标
     - 颜色模式切换、边界形状切换（局部重建 #edgeParamsWrap）
     - 形状 chip 互斥、填满绘图区域按钮
   版本：V0.01
   注意：动态重建的局部 DOM（如 edgeParamsWrap）需重新绑定，
        所以内部有 bindPaneInteractions 的递归调用。
   ============================================================ */
function bindPaneInteractions(moduleId, container){
  /* 滑块 */
  container.querySelectorAll('input[type=range]').forEach(r => {
    const row = r.closest('.param');
    const min = +r.min || 0, max = +r.max || 100;
    const name = row?.dataset.name;
    const upd = () => {
      const v = +r.value;
      r.style.setProperty('--fill', (((v - min) / (max - min)) * 100).toFixed(1) + '%');
      const num = row?.querySelector('.num');
      if (num && document.activeElement !== num) num.value = v;
    };
    upd();
    r.addEventListener('input', upd);
    /* P0-1：滑块拖动结束时（change 事件），联动 + commit */
    r.addEventListener('change', () => {
      if (name && linkFlags[name]) propagateLink(name, +r.value, moduleId, row);
      commitHistory();
    });
    /* P0-1：输入框 also 在失焦时联动+commit */
    const num = row?.querySelector('.num');
    if (num){
      num.addEventListener('change', () => {
        const v = parseFloat(num.value);
        if (isNaN(v) || v < min || v > max){
          flashInvalid(num, min, max);
          setTimeout(() => { r.value = num.value; upd(); }, 620);
          return;
        }
        r.value = v; upd();
        if (name && linkFlags[name]) propagateLink(name, v, moduleId, row);
        commitHistory();
      });
    }
    /* 重置按钮 */
    const rst = row?.querySelector('.rst');
    if (rst) rst.addEventListener('click', () => {
      const def = row.dataset.default;
      if (def !== undefined){
        r.value = def;
        const n = row.querySelector('.num');
        if (n) n.value = def;
        upd();
        if (name && linkFlags[name]) propagateLink(name, +def, moduleId, row);
        commitHistory();
      }
    });
    /* 链条切换 */
    const chain = row?.querySelector('.chain');
    if (chain && name){
      chain.classList.toggle('on', !!linkFlags[name]);
      chain.addEventListener('click', e => {
        e.stopPropagation();
        linkFlags[name] = !linkFlags[name];
        syncAllChainIcons();
        updateLinkageBtnState();
        commitHistory();
        toast(linkFlags[name] ? `已开启「${name}」全部行联动` : `已取消「${name}」联动`);
      });
    }
  });

  /* chip 单选组 */
  container.querySelectorAll('.chip-row').forEach(row => {
    if (row.closest('[data-group="shape"]')) return;
    if (row.closest('#edgeShapeRow')) return;
    row.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      $$('.chip', row).forEach(c => c.classList.toggle('active', c === chip));
      commitHistory();
    });
  });

  /* 颜色建议 & 色块对 */
  container.querySelectorAll('.sw[data-c]').forEach(sw => {
    sw.addEventListener('click', () => { toast('已应用建议颜色 ' + sw.dataset.c); commitHistory(); });
  });
  container.querySelectorAll('.sw-pair').forEach(pair => {
    pair.addEventListener('click', () => { toast(`已应用渐变：${pair.dataset.c1} → ${pair.dataset.c2}`); commitHistory(); });
  });

  /* 阴影启用 → 标签绿勾 */
  const sh = container.querySelector('#shadowEnable');
  if (sh) sh.addEventListener('change', () => { renderStyle(); commitHistory(); });
  const be = container.querySelector('#borderEnable');
  if (be) be.addEventListener('change', () => { rerenderModule('shape'); commitHistory(); });
  const fs = container.querySelector('#fshadowEnable');
  if (fs) fs.addEventListener('change', () => { rerenderModule('shape'); commitHistory(); });

  /* 颜色模式切换 */
  const seg = container.querySelector('#colorModeSeg');
  if (seg){
    seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const newMode = b.dataset.cmode;
      if (newMode === currentColorMode) return;
      currentColorMode = newMode;
      renderStyle();
      commitHistory();
    });
  }

  /* 边界形状切换 */
  const edgeRow = container.querySelector('#edgeShapeRow');
  if (edgeRow){
    edgeRow.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        currentEdgeShape = chip.dataset.shape;
        edgeRow.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
        const wrap = container.querySelector('#edgeParamsWrap');
        if (wrap){ wrap.innerHTML = buildEdgeParams(currentEdgeShape); bindPaneInteractions(moduleId, wrap); }
        commitHistory();
      });
    });
  }

  /* 形状 chip 互斥 */
  container.querySelectorAll('[data-group="shape"] .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('[data-group="shape"] .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      toast('形状：' + chip.textContent);
      commitHistory();
    });
  });

  /* 填满按钮 */
  const fb = container.querySelector('#fillShapeBtn');
  if (fb) fb.addEventListener('click', () => {
    const sizeRow = container.querySelector('[data-name="尺寸"]');
    if (sizeRow){
      const r = sizeRow.querySelector('input[type=range]');
      const n = sizeRow.querySelector('.num');
      if (r && n){ r.value = 200; n.value = 200; r.style.setProperty('--fill', '100%'); }
    }
    toast('形状已填满绘图区域');
    commitHistory();
  });
}
