/* ============================================================
   KiconCreator V2 · js/fills.js
   职责：内部填充模块（需求 三.3）。
     - 色块列表（色块数量 = 激活的填充数量，标签底色为真实背景预览）
     - 当前色块的 纯/渐/图 背景模式面板（每个色块独立切换，需求 3.2）
     - 纯色模式（需求 3.2.1）：取色器 + HEX 输入 + HSL 滑块 + 颜色建议
     - 渐变模式（需求 3.2.2，V2.28）：起止色（取色器/HEX/建议）+ 线性/径向 + 角度滑块
     - 图片模式（需求 3.2.3，V2.28）：上传/更换/移除 + 剪裁（比例/缩放/拖动/滚轮）
       + 大小与位置滑块 + 剪裁后预览；背景填充由外框形状裁切（bgshape 的 clip）
   版本：V0.04（V2.28：渐变/图片模式落地——参数存 fillStyles[i].grad/image；
        图片走会话图片仓库（imgSyncFillRefs，键前缀 fill:，更换自动减引用延迟释放）；
        渲染由 fillLayout.js 的 fillPaintOf 解析为渐变/图案，图片缺失或参数为空回退纯色）
        V0.03（V2.22：纯色模式落地——色值实时写回 fillColors 并重绘；
        色块缩略改为按当前色值实时派生（原来在加载时算一次，改色后不更新））
   依赖：state.js（fillCount/activeFill/fillModes/fillColors/fillStyles）、builders.js（paramRow/hexToHsl/hslToHex/
        computeAdvice）、images.js（imgGet/imgLoadFile/imgSyncFillRefs/imgCropRect）、
        interactions.js（bindPaneInteractions 负责绑定）、history.js（commitHistory）。
   ============================================================ */

/* 色块缩略：按背景模式实时派生（纯色 = 同色系渐变预览；渐变 = 真实起止色；
   图片 = 原图 dataURL（预设导入的图片无 src 时回退色值）） */
function fillSwatchBg(hex){
  const { h, s, l } = hexToHsl(hex);
  const c2 = hslToHex(h + 16, Math.min(1, s * 0.92), Math.min(0.86, l + 0.16));
  return `linear-gradient(135deg,${hex},${c2})`;
}
function fillColorOf(i){ return fillColors[i] || fillColors[0] || '#6C8CFF'; }
/* 懒初始化：任何读写路径拿到的一定是完整参数对象 */
function fillStyleOf(i){
  if (!fillStyles[i]) fillStyles[i] = makeFillStyle();
  return fillStyles[i];
}
/* 填充图片参数规范化：剪裁窗口语义与行图片一致（imgCropRect 消费），
   另带填充专用的大小 size% 与位置 fx/fy%（需求 3.2.3 的大小和位置调整滑块） */
function makeFillImage(image){
  return {
    id: image.id || null,
    name: image.name || '图片',
    w: +image.w || 0,
    h: +image.h || 0,
    crop: image.crop
      ? { aspect: image.crop.aspect || '原图', zoom: Math.max(1, Math.min(8, +image.crop.zoom || 1)),
          ox: Math.max(-1, Math.min(1, +image.crop.ox || 0)), oy: Math.max(-1, Math.min(1, +image.crop.oy || 0)) }
      : { aspect: '原图', zoom: 1, ox: 0, oy: 0 },
    size: Math.max(10, Math.min(400, +image.size || 100)),
    fx: Math.max(-100, Math.min(100, +image.fx || 0)),
    fy: Math.max(-100, Math.min(100, +image.fy || 0))
  };
}
/* 渐变起止色的生效值：from/to 为空时回退当前色值 / 其同色系亮色 */
function fillGradOf(i){
  const g = fillStyleOf(i).grad;
  const from = g.from || fillColorOf(i);
  let to = g.to;
  if (!to){
    const { h, s, l } = hexToHsl(fillColorOf(i));
    to = hslToHex(h + 16, Math.min(1, s * 0.92), Math.min(0.86, l + 0.16));
  }
  return { from, to, type: g.type || '线性', angle: Math.max(0, Math.min(360, +g.angle || 0)) };
}
function fillSwatchOf(i){
  const mode = fillModes[i] || '纯';
  if (mode === '渐'){
    const g = fillGradOf(i);
    return `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`;   // 0° 自下向上，与渲染一致
  }
  if (mode === '图'){
    const st = fillStyleOf(i);
    const entry = st.image && st.image.id ? imgGet(st.image.id) : null;
    if (entry && entry.src) return `center/cover no-repeat url("${entry.src}")`;
    return fillColorOf(i);
  }
  return fillSwatchBg(fillColorOf(i));
}

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

/* ---------- 渐变模式面板（需求 3.2.2，V2.28） ----------
   起止色各带 颜色选择器 / HEX 输入 / 颜色建议；渐变模式 线性/径向；线性附角度滑块。
   控件用 data-fg-* 标记，由 interactions.js 的 bindFillGradControls 绑定
   （per-block 参数不注册进 FILL_PARAM_DEFS，不走通用绑定） */
function fillGradPanelHTML(){
  const g = fillGradOf(activeFill);
  const base = (rows[activeRow] && rows[activeRow].params['color.c1']) || '#6C8CFF';
  const adv = computeAdvice(base);
  const suggRow = side => `<div class="param tight"><span class="pname">${side === 'from' ? '起色建议' : '止色建议'}</span><div class="pctrl">
    <div class="suggest-row">${['互补', '类似', '柔和', '明亮'].map(gr => adv[gr].map(c => `<button class="sw" data-fg-adv="${side}:${c}" style="background:${c}" title="${gr} ${c}"></button>`).join('')).join('')}</div>
  </div></div>`;
  return `
    <div class="param tight"><span class="pname">起色</span><div class="pctrl">
      <input type="color" class="color-picker" data-fg-color="from" value="${g.from}" title="渐变起色">
      <input class="mini-input" data-fg-hex="from" value="${g.from}" style="flex:1">
    </div></div>
    <div class="param tight"><span class="pname">止色</span><div class="pctrl">
      <input type="color" class="color-picker" data-fg-color="to" value="${g.to}" title="渐变止色">
      <input class="mini-input" data-fg-hex="to" value="${g.to}" style="flex:1">
    </div></div>
    <div class="param tight"><span class="pname">渐变模式</span><div class="pctrl">
      <div class="segmented" id="fillGradType" style="width:100%">
        <button data-gt="线性" class="${g.type === '线性' ? 'active' : ''}">线性渐变</button>
        <button data-gt="径向" class="${g.type === '径向' ? 'active' : ''}">径向渐变</button>
      </div>
    </div></div>
    ${g.type === '线性' ? `<div class="param tight" data-fb="angle"><span class="pname">角度</span><div class="pctrl">
      <input type="range" min="0" max="360" value="${g.angle}">
      <input class="num" value="${g.angle}"><span class="unit">°</span>
    </div></div>` : ''}
    ${suggRow('from')}
    ${suggRow('to')}
    <div style="font-size:10px;color:var(--muted);padding-top:2px">线性：按角度从起色过渡到止色（0° 自下向上）；径向：自色块中心向外过渡。渐变铺满该色块区域，随布局的方向/拉伸一起变换</div>`;
}

/* ---------- 图片模式面板（需求 3.2.3，V2.28） ----------
   上传/更换/移除 + 剪裁后预览（拖动/滚轮/双击）+ 大小与位置滑块 + 展开式剪裁（比例/缩放）。
   控件用 data-fill-img-* / data-fb / data-fc 标记，由 bindFillImgControls 绑定 */
function fillImgPanelHTML(){
  const st = fillStyleOf(activeFill);
  const im = st.image;
  const entry = im && im.id ? imgGet(im.id) : null;
  if (!im || !entry){
    return `
      <div class="param tight"><span class="pname">图片</span><div class="pctrl">
        <button class="btn ghost sm" data-fill-img-pick="1">上传图片</button>
        <span id="fillImgProg" style="font-size:10px;color:var(--muted);margin-left:6px"></span>
      </div></div>
      <div class="mslider-empty">尚未上传图片：本色块当前按纯色 ${fillColorOf(activeFill)} 参与渲染。</div>
      <div style="font-size:10px;color:var(--muted);padding-top:2px">背景填充全部被外框形状裁切；更换图片时旧图自动减少引用、按会话图片仓库规则延迟释放</div>`;
  }
  const crop = im.crop || { aspect: '原图', zoom: 1, ox: 0, oy: 0 };
  return `
    <div class="param tight"><span class="pname">图片</span><div class="pctrl">
      <button class="btn ghost sm" data-fill-img-pick="1">更换</button>
      <button class="btn ghost sm" data-fill-img-clear="1">移除</button>
      <span id="fillImgProg" style="font-size:10px;color:var(--muted);margin-left:6px"></span>
    </div></div>
    <div style="text-align:center;padding:2px 0">
      <canvas id="fillImgPrev" title="拖动调整剪裁位置，滚轮缩放，双击复位"></canvas>
    </div>
    <div class="param tight" data-fb="size"><span class="pname">大小</span><div class="pctrl">
      <input type="range" min="50" max="300" value="${im.size}">
      <input class="num" value="${im.size}"><span class="unit">%</span>
    </div></div>
    <div class="param tight" data-fb="fx"><span class="pname">X 位置</span><div class="pctrl">
      <input type="range" min="-100" max="100" value="${im.fx}">
      <input class="num" value="${im.fx}"><span class="unit">%</span>
    </div></div>
    <div class="param tight" data-fb="fy"><span class="pname">Y 位置</span><div class="pctrl">
      <input type="range" min="-100" max="100" value="${im.fy}">
      <input class="num" value="${im.fy}"><span class="unit">%</span>
    </div></div>
    <div class="param tight"><span class="pname">剪裁</span><div class="pctrl">
      <button class="btn ghost sm" data-fill-img-crop="1">展开剪裁</button>
      <span style="font-size:10px;color:var(--muted);margin-left:6px" title="${entry.name}">${(entry.name || '').slice(0, 14)}</span>
    </div></div>
    <div id="fillCropMount" hidden style="padding:2px 0 4px">
      <div class="param tight"><span class="pname">比例</span><div class="pctrl">
        <div class="segmented" id="fillCropRatios" style="width:100%">
          ${['原图', '1:1', '4:3', '16:9', '3:4'].map(r => `<button data-fc="${r}" class="${crop.aspect === r ? 'active' : ''}">${r}</button>`).join('')}
        </div>
      </div></div>
      <div class="param tight" data-fb="czoom"><span class="pname">剪裁缩放</span><div class="pctrl">
        <input type="range" min="1" max="8" step="0.1" value="${crop.zoom}">
        <input class="num" value="${crop.zoom}"><span class="unit">×</span>
      </div></div>
      <div style="font-size:10px;color:var(--muted)">在预览图上拖动移动剪裁窗口、滚轮缩放、双击复位</div>
    </div>
    <div style="font-size:10px;color:var(--muted);padding-top:2px">背景填充全部被外框形状裁切；更换图片时旧图自动减少引用、按会话图片仓库规则延迟释放</div>`;
}

/* 剪裁后预览：预览画布按剪裁窗口比例自适应（宽 ≤224、高 ≤140） */
function paintFillImgPrev(){
  const cv = $('#fillImgPrev');
  if (!cv) return;
  const st = fillStyleOf(activeFill);
  const entry = st.image && st.image.id ? imgGet(st.image.id) : null;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  if (!entry || !st.image) return;
  const { sx, sy, sw, sh } = imgCropRect(entry, st.image.crop);
  const k = Math.min(224 / sw, 140 / sh);
  cv.width = Math.max(40, Math.round(sw * k));
  cv.height = Math.max(40, Math.round(sh * k));
  g.drawImage(entry.bitmap, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
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
    content += fillGradPanelHTML();
  } else {
    content += fillImgPanelHTML();
  }
  body.innerHTML = content;
  bindPaneInteractions('fill', body);
  paintFillImgPrev();   // 图片模式的剪裁后预览（无预览元素时跳过）
  const seg = body.querySelector('#fillModeSeg');
  if (seg){
    seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      fillModes[activeFill] = b.dataset.fm;
      renderFillBody2();
      renderFillList();   // 标签标题（模式提示）同步
      scheduleDrawIcon(); // 模式切换立即重绘（V2.28：渐→纯 否则画布仍显示旧渐变/图片）
      commitHistory();
    });
  }
}
