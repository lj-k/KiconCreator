/* ============================================================
   KiconCreator V2 · js/fills.js
   职责：内部填充模块（需求 三.3）。
     - 色块列表（色块数量 = 激活的填充数量，标签底色为真实色值预览）
     - 当前色块的 纯/渐/图 背景模式面板
     - 纯色模式（需求 3.2.1）：取色器 + HEX 输入 + HSL 滑块 + 颜色建议
   版本：V0.03（V2.22：纯色模式落地——色值实时写回 fillColors 并重绘；
        色块缩略改为按当前色值实时派生（原来在加载时算一次，改色后不更新））
   依赖：state.js（fillCount/activeFill/fillModes/fillColors）、builders.js（paramRow/hexToHsl/hslToHex/
        computeAdvice）、interactions.js（bindPaneInteractions 负责绑定）、history.js（commitHistory）。
   说明：渐变 / 图片两种背景模式（需求 3.2.2 / 3.2.3）尚未实现，面板中只给出说明，
        色块按纯色色值参与渲染——不做"看起来能调、实际不生效"的假控件。
   ============================================================ */

/* 色块缩略：以真实色值起，向"同色系更亮"过渡（仅用于标签预览，不参与渲染取色）。
   注意，必须按当前色值实时计算——色值可被取色器/HSL/颜色建议随时改写 */
function fillSwatchBg(hex){
  const { h, s, l } = hexToHsl(hex);
  const c2 = hslToHex(h + 16, Math.min(1, s * 0.92), Math.min(0.86, l + 0.16));
  return `linear-gradient(135deg,${hex},${c2})`;
}
function fillColorOf(i){ return fillColors[i] || fillColors[0] || '#6C8CFF'; }
function fillSwatchOf(i){ return fillSwatchBg(fillColorOf(i)); }

function renderFillList(){
  const list = $('#fillList');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < fillCount; i++){
    const b = document.createElement('button');
    b.className = 'fill-swatch' + (i === activeFill ? ' active' : '');
    b.style.background = fillSwatchOf(i);
    b.textContent = i + 1;
    b.title = `色块 ${i + 1} · ${fillModes[i] || '纯'} · ${fillColorOf(i)}`;
    b.onclick = () => { activeFill = i; renderFillList(); renderFillBody2(); };
    list.appendChild(b);
  }
  const sub = $('#fillSub');
  if (sub) sub.textContent = `共 ${fillCount} 个色块`;
}

/* HSL 参数行：用 data-hsl 标记，由 interactions.js 的 bindFillSolidControls 专用绑定
   （HSL 不是注册参数键，不能走通用参数绑定，否则改了不生效） */
function fillHslRow(label, ch, value, max, unit){
  return `<div class="param tight" data-hsl="${ch}"><span class="pname">${label}</span><div class="pctrl">
    <input type="range" min="0" max="${max}" value="${value}">
    <input class="num" value="${value}">${unit ? `<span class="unit">${unit}</span>` : ''}
  </div></div>`;
}

/* 纯色模式的颜色建议（需求 3.2.1）：以当前文本颜色为基色实时计算四组调和色 */
function fillSolidAdviceHTML(baseHex){
  const adv = computeAdvice(baseHex);
  return ['互补', '类似', '柔和', '明亮'].map(g => `<div class="param tight"><span class="pname">${g}色</span><div class="pctrl">
    <div class="suggest-row">${adv[g].map(c => `<button class="sw" data-fill-adv="${c}" style="background:${c}" title="${c}"></button>`).join('')}</div>
  </div></div>`).join('');
}

function renderFillBody2(){
  const body = $('#fillBody2');
  if (!body) return;
  const hex = fillColorOf(activeFill);
  const mode = fillModes[activeFill] || '纯';
  const { h, s, l } = hexToHsl(hex);
  let content = `<div class="cp-label">色块 ${activeFill + 1} · 独立设置</div>
    <div class="segmented" id="fillModeSeg" style="margin-bottom:9px">
      <button data-fm="纯" class="${mode === '纯' ? 'active' : ''}">纯</button>
      <button data-fm="渐" class="${mode === '渐' ? 'active' : ''}">渐</button>
      <button data-fm="图" class="${mode === '图' ? 'active' : ''}">图</button>
    </div>`;
  if (mode === '纯'){
    const base = (rows[activeRow] && rows[activeRow].params['color.c1']) || '#6C8CFF';
    content += `
      <div class="param tight"><span class="pname">颜色</span><div class="pctrl">
        <input type="color" class="color-picker" data-fill-color="1" value="${hex}" title="色块 ${activeFill + 1} 颜色">
        <input class="mini-input" data-fill-hex="1" value="${hex}" style="flex:1">
      </div></div>
      ${fillHslRow('色相', 'h', Math.round(h), 360, '°')}
      ${fillHslRow('饱和度', 's', Math.round(s * 100), 100, '%')}
      ${fillHslRow('明度', 'l', Math.round(l * 100), 100, '%')}
      <div class="param stacked" style="margin-top:6px"><span class="pname">颜色建议（随文本颜色 ${base} 实时计算）</span>
        <div id="fillAdviceWrap">${fillSolidAdviceHTML(base)}</div></div>`;
  } else if (mode === '渐'){
    content += `<div class="mslider-empty">渐变背景模式（需求 3.2.2：起止色、线性/径向、角度）尚未实现，本色块当前按纯色 ${hex} 参与渲染。</div>`;
  } else {
    content += `<div class="mslider-empty">图片背景模式（需求 3.2.3：上传、大小位置、剪裁）尚未实现，本色块当前按纯色 ${hex} 参与渲染。</div>`;
  }
  body.innerHTML = content;
  bindPaneInteractions('fill', body);
  const seg = body.querySelector('#fillModeSeg');
  if (seg){
    seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      fillModes[activeFill] = b.dataset.fm;
      renderFillBody2();
      renderFillList();   // 标签标题（模式提示）同步
      commitHistory();
    });
  }
}
