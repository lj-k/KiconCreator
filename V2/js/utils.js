/* ============================================================
   KiconCreator V2 · js/utils.js
   职责：通用工具 —— DOM 选择器、HTML 转义、数值限幅、圆角路径、toast、
        非法输入闪烁回退（flashInvalid）、链条图标 SVG
   版本：V0.02（V2.13：新增 clamp 数值限幅）
   ============================================================ */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* 数值限幅（图片裁剪偏移/缩放、边界参数等共用） */
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const CHAIN_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>`;

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

let toastTimer;
function toast(msg){
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1700);
}

function flashInvalid(input, min, max){
  input.classList.add('invalid');
  setTimeout(() => input.classList.remove('invalid'), 620);
  let v = parseFloat(input.value);
  if (isNaN(v)) v = min;
  if (v < min) v = min;
  if (v > max) v = max;
  setTimeout(() => { input.value = v; }, 620);
  return v;
}
