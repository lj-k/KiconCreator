/* ============================================================
   KiconCreator V2 · js/topbar.js
   职责：顶栏与模块头按钮绑定（顶层执行，脚本加载时即注册）。
     - undo/redo 按钮、参数联动总开关（全部行 × 全部参数，需求 四.3）
     - 复制/粘贴样式（需求 2.9：仅 style./color./shadow. 参数，跨模式取交集）
     - 样式重置：按当前激活标签重置对应参数组（需求 3.3）
     - 填充数量芯片（背景暂缓，仅 UI + 触发 fill 模块重渲染）
     - renderStyle：样式/内容模块头副标题同步 + style 模块重渲染
   版本：V0.04（V2.12：复制样式/重置纳入 image. 参数）
   依赖：history.js（undo/redo/commitHistory，必须先于本文件加载）、
        linkage.js、schema.js、state.js、fills.js（运行时）。
   ============================================================ */

/* ---------- 样式模块 —— 副标题同步 + 重渲染 ---------- */
function renderStyle(){
  const r = rows[activeRow];
  const sub = $('#styleSub');
  if (sub) sub.textContent = `行 ${activeRow + 1} · ${MODE_LABEL[r.mode]} · “${rowLabel(r)}”`;
  const cn = $('#contentNote');
  if (cn) cn.textContent = `行 ${activeRow + 1} · ${MODE_LABEL[r.mode]}`;
  rerenderModule('style');
}

/* ---------- 顶栏按钮 ---------- */
$('#undoBtn').addEventListener('click', undo);
$('#redoBtn').addEventListener('click', redo);

/* 参数联动总开关：批量改写所有行所有参数的联动标记（需求 四.3） */
const lb = $('#linkageBtn');
lb.addEventListener('click', () => {
  const { on } = linkedSlotStats();
  const newVal = on === 0; // 无联动 → 全部开启；否则 → 全部关闭
  rows.forEach(r => { Object.keys(PARAM_DEFS).forEach(k => { r.link[k] = newVal; }); });
  syncAllChainIcons();
  updateLinkageBtnState();
  commitHistory();
  toast(newVal ? '已开启全部参数联动' : '已取消全部参数联动');
});

/* ---------- 快速复制/粘贴样式（需求 2.9：尺寸+颜色+阴影，不含内容参数） ---------- */
const STYLE_COPY_PREFIX = ['style.', 'color.', 'shadow.', 'image.'];
function pickStyleParams(params){
  const out = {};
  Object.keys(params).forEach(k => {
    if (STYLE_COPY_PREFIX.some(p => k.startsWith(p))) out[k] = params[k];
  });
  return out;
}
$('#copyStyleBtn').addEventListener('click', () => {
  styleClipboard = pickStyleParams(rows[activeRow].params);
  toast(`已复制第 ${activeRow + 1} 行样式`);
});
$('#pasteStyleBtn').addEventListener('click', () => {
  if (!styleClipboard){ toast('剪贴板为空，请先复制样式'); return; }
  const target = rows[activeRow].params;
  Object.keys(styleClipboard).forEach(k => { if (k in target) target[k] = styleClipboard[k]; }); // 跨模式仅应用相同参数
  renderStyle();
  drawIcon();
  commitHistory();
  toast(`已将剪贴板样式粘贴到第 ${activeRow + 1} 行`);
});

/* ---------- 样式重置：按当前激活标签重置（需求 3.3） ---------- */
$('#styleReset').addEventListener('click', () => {
  const tab = activeTabByModule.style;
  const groups = { size: STYLE_KEYS, color: COLOR_KEYS.concat(IMAGE_KEYS), shadow: SHADOW_KEYS };
  (groups[tab] || STYLE_KEYS).forEach(k => { rows[activeRow].params[k] = PARAM_DEFS[k].def; });
  renderStyle();
  drawIcon();
  commitHistory();
  toast('已重置当前行样式');
});

/* ---------- 填充数量（形状内部按数量分色块，切数量即重绘） ---------- */
$('#fillCount').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const kids = Array.from(chip.parentElement.children);
  const idx = kids.indexOf(chip);
  fillCount = idx === 0 ? 1 : idx + 1;
  if (activeFill >= fillCount) activeFill = 0;
  $$('.chip', chip.parentElement).forEach(c => c.classList.toggle('active', c === chip));
  renderFillList();
  renderFillBody2();
  // 布局/填充边界 pane 的内容随单色⇄多色切换（不能只靠列刷新，须显式重渲染该模块）
  rerenderModule('fill');
  scheduleDrawIcon();   // 形状内部色块数量随之变化
  toast(`填充数量：${fillCount === 1 ? '单色' : fillCount + '色'}`);
  commitHistory();
});
