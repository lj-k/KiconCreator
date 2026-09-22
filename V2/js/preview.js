/* ============================================================
   KiconCreator V2 · js/preview.js
   职责：预览交互（顶层执行，脚本加载时即注册）。
     - 画布缩放（滚轮）与平移（拖拽），transform 应用到 #canvasWrap
     - 双击画布：复位 + 打开 1:1 模态预览（ESC/点击遮罩/按钮关闭）
     - 放大预览按钮（左栏加宽）
     - 辅助线选择、安全边距开关与百分比输入
   版本：V0.03（V2.18：安全边距框内缩量改为百分比并初始化（applySafeMargin）；
        画布随预览框等比显示后，像素内缩会错位）
   依赖：canvas.js（cvs/viewerModal 等 DOM 引用与 drawIcon，必须先加载）、
        history.js（commitHistory）、utils.js（flashInvalid）、layout.js（refreshLayout）。
   ============================================================ */
let zoom = 1;
let panX = 0, panY = 0;
let dragging = false;
let dragStartX = 0, dragStartY = 0;
let startPanX = 0, startPanY = 0;
const wrap = $('#canvasWrap');
const stage = $('#stage');

function applyTransform(){ wrap.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`; }
stage.addEventListener('wheel', e => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.08 : 0.08;
  zoom = Math.min(3, Math.max(0.5, zoom + delta));
  applyTransform();
}, { passive: false });
stage.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  dragging = true;
  dragStartX = e.clientX; dragStartY = e.clientY;
  startPanX = panX; startPanY = panY;
  stage.style.cursor = 'grabbing';
});
window.addEventListener('mousemove', e => {
  if (!dragging) return;
  panX = startPanX + (e.clientX - dragStartX);
  panY = startPanY + (e.clientY - dragStartY);
  applyTransform();
});
window.addEventListener('mouseup', () => {
  if (dragging){ dragging = false; stage.style.cursor = ''; }
});
stage.addEventListener('dblclick', e => {
  zoom = 1; panX = 0; panY = 0;
  applyTransform();
  stage.style.cursor = '';
  if (e.target.closest('.safe-box')) return;
  openViewer();
});

/* ---------- 1:1 模态预览 ---------- */
function openViewer(){
  $('#modalInfo').textContent = `${iconSize} × ${iconSize}`;
  viewerModal.classList.add('open');
}
function closeViewer(){ viewerModal.classList.remove('open'); }
modalBody.addEventListener('dblclick', () => { modalBody.scrollTop = 0; modalBody.scrollLeft = 0; });
$('#viewerClose').addEventListener('click', closeViewer);
viewerModal.addEventListener('click', e => { if (e.target === viewerModal) closeViewer(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeViewer(); });

/* ---------- 放大预览 ---------- */
$('#enlargeBtn').addEventListener('click', () => {
  const layout = $('.layout');
  const enlarged = layout.classList.toggle('enlarged');
  const mode = document.documentElement.dataset.layout;
  if (enlarged && mode !== 'one'){
    layout.style.gridTemplateColumns = '1.6fr 1fr 1fr';
    toast('已放大预览（左栏加宽）');
  } else {
    layout.style.gridTemplateColumns = '';
    toast('已恢复默认栏宽');
  }
  requestAnimationFrame(refreshLayout);
});

/* ---------- 辅助线 / 安全边距 ---------- */
/* 安全边距框：内缩量用百分比表达（= 画布尺寸的百分比），与画布的显示缩放无关；
   画布可能被预览框等比放大/缩小，用像素写死会导致边距框与画布错位 */
function applySafeMargin(){
  const v = +$('#safePct').value || 0;
  $('#safeBox').style.inset = v + '%';
}
applySafeMargin();
$('#guideSelect').addEventListener('change', () => {
  const mode = $('#guideSelect').value;
  const layer = $('#guidesLayer');
  layer.dataset.mode = mode;
  layer.classList.toggle('show', mode !== 'none');
  drawIcon();
  commitHistory();
});
$('#safeChk').addEventListener('change', () => {
  $('#safeBox').classList.toggle('show', $('#safeChk').checked);
  drawIcon();
  commitHistory();
});
$('#safePct').addEventListener('change', () => {
  let v = +$('#safePct').value;
  if (isNaN(v) || v < 0 || v > 50){
    v = flashInvalid($('#safePct'), 0, 50);
    setTimeout(() => { $('#safePct').value = v; applySafeMargin(); }, 620);
    return;
  }
  applySafeMargin();
  drawIcon();
  commitHistory();
});

/* ---------- 画布尺寸下拉（V2.10） ----------
   与「下载」pane 的 #sizePreset 共享 iconSize 变量：
   任一入口变更 → 写回 #sizeInput（唯一数据源）→ updateSize() 统一同步并重绘；
   下载 pane 尚未渲染时无 #sizeInput，直接写 iconSize 兜底 */
$('#sizeSelect').addEventListener('change', () => {
  const v = parseInt($('#sizeSelect').value, 10) || 256;
  const si = document.querySelector('#sizeInput');
  if (si) si.value = v; else iconSize = v;
  updateSize();
  commitHistory();
});
