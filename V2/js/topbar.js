/* ============================================================
   KiconCreator V2 · js/topbar.js
   职责：顶栏与模块头按钮绑定（顶层执行，脚本加载时即注册）。
     - undo/redo 按钮、参数联动总开关（linkageBtn）
     - 复制/粘贴样式、样式重置
     - 填充数量芯片（fillCount）→ 重渲染填充列表与面板
     - renderStyle：样式/内容模块头副标题同步 + style 模块重渲染
   版本：V0.01
   依赖：history.js（undo/redo/commitHistory，必须先于本文件加载）、
        linkage.js、state.js、fills.js（运行时）。
   ============================================================ */

/* ---------- 样式模块 —— 触发重渲染 ---------- */
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

const lb = $('#linkageBtn');
lb.addEventListener('click', () => {
  const names = Object.keys(linkFlags);
  const anyOn = names.some(k => linkFlags[k]);
  const newVal = !anyOn;
  names.forEach(k => { linkFlags[k] = newVal; });
  if (names.length === 0){
    // 初始化常见参数
    ['大小', '角度', '水平拉伸', '垂直拉伸', '横向偏移', '纵向偏移', '字号', '色相', '饱和度', '明度'].forEach(k => { linkFlags[k] = newVal; });
  }
  syncAllChainIcons();
  updateLinkageBtnState();
  commitHistory();
  toast(newVal ? '已开启全部参数联动' : '已取消全部参数联动');
});

$('#copyStyleBtn').addEventListener('click', () => {
  styleClipboard = { row: activeRow, mode: rows[activeRow].mode };
  toast(`已复制第 ${activeRow + 1} 行样式`);
});
$('#pasteStyleBtn').addEventListener('click', () => {
  if (!styleClipboard){ toast('剪贴板为空，请先复制样式'); return; }
  toast(`已将第 ${styleClipboard.row + 1} 行样式粘贴到第 ${activeRow + 1} 行`);
  commitHistory();
});
$('#styleReset').addEventListener('click', () => {
  renderStyle();
  toast('已重置当前行样式');
  commitHistory();
});

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
  requestAnimationFrame(refreshLayout);
  toast(`填充数量：${fillCount === 1 ? '单色' : fillCount + '色'}`);
  commitHistory();
});
