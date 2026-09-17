/* ============================================================
   KiconCreator V2 · js/canvas.js
   职责：画布渲染。
     - cvs/ctx/viewerCanvas 等画布与模态 DOM 引用
     - drawGuides：十字/米字/井字辅助线 + 安全边距虚线框
     - drawIcon：当前占位渲染（渐变圆角方块 + 首行文字），
       并同步 1:1 模态预览画布
   版本：V0.01
   依赖：state.js（iconSize/rows）、utils.js（roundRect）。
   ============================================================ */
const cvs = $('#iconCanvas');
const ctx = cvs.getContext('2d');
const viewerModal = $('#viewerModal');
const modalBody = $('#modalBody');
const viewerCanvas = $('#viewerCanvas');

function drawGuides(S){
  const mode = $('#guideSelect').value;
  const safe = $('#safeChk').checked;
  if (mode !== 'none'){
    ctx.save();
    ctx.strokeStyle = 'rgba(110,122,150,.55)';
    ctx.lineWidth = 1;
    const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    if (mode === 'cross'){ line(S/2, 0, S/2, S); line(0, S/2, S, S/2); }
    else if (mode === 'star'){ line(S/2, 0, S/2, S); line(0, S/2, S, S/2); line(0, 0, S, S); line(S, 0, 0, S); }
    else if (mode === 'thirds'){ for (let i = 1; i <= 2; i++){ line(S*i/3, 0, S*i/3, S); line(0, S*i/3, S, S*i/3); } }
    ctx.restore();
  }
  if (safe){
    const pct = Math.min(50, Math.max(0, +$('#safePct').value || 10));
    const m = S * pct / 100;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(110,122,150,.7)';
    ctx.strokeRect(m, m, S - m*2, S - m*2);
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function drawIcon(){
  const S = iconSize;
  if (cvs.width !== S){ cvs.width = S; cvs.height = S; }
  ctx.clearRect(0, 0, S, S);
  const r = S * 0.22;
  roundRect(ctx, S*0.03, S*0.03, S*0.94, S*0.94, r);
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, '#6c8cff');
  g.addColorStop(1, '#9b5cff');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  ctx.beginPath();
  ctx.arc(S*0.74, S*0.31, S*0.23, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
  const text = (rows[0] && rows[0].text) ? rows[0].text : 'K';
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.round(S*0.52)}px -apple-system, "Segoe UI", "PingFang SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.slice(0, 3), S/2, S/2 + S*0.02);
  drawGuides(S);
  if (viewerCanvas){
    viewerCanvas.width = S; viewerCanvas.height = S;
    viewerCanvas.getContext('2d').drawImage(cvs, 0, 0);
  }
}
