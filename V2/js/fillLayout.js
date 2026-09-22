/* ============================================================
   KiconCreator V2 · js/fillLayout.js
   职责：填充数量与布局引擎（需求 三.2）——把 N 个色块铺满外框形状。
     - fillLayerSizes：把 N 个色块分到 L 层（无法均分时余数分给最外层/最上层，需求 2.2）
     - fillLayoutModel：层/分组/分界线数量/方向数量的统一模型（UI 与渲染共用同一份推算）
     - syncFillArrays：按模型校准三组数组参数（层间比例/层内比例/每层方向）
     - convertInRatios：布局形式切换时按"各段跨度"换算层内比例（矩阵 ⇄ 饼图语义不同）
     - fillExtentOf / paintFillPattern：矩阵布局（纵向 L 层 × 横向若干列）与
       饼图布局（L 个同心环 × 每环若干扇区）的几何与绘制
     - multiSliderHTML / bindMultiSliders：多分界线共享滑轨组件（+ 参数输入框 + 均分）
   版本：V0.04（V2.23：层内比例**逐层独立**——每层一条滑轨（offset 读写本层那一段），
        syncFillArrays 逐层升序、convertInRatios 逐层换算）
        V0.03（V2.22：新增 convertInRatios——布局形式切换时换算层内比例，避免出现
        重复分界（0 宽扇区 + 双宽扇区））
        V0.02（V2.22：饼图"层内比例"改用 i/k 等分（fillEqualAngles）——分界线首尾相接，
        两端留边公式会给出"k−1 个等宽扇区 + 1 个双倍宽扇区"；布局形式 chip 读取 data-val）
        V0.01（V2.22：随"填充数量和布局"功能新建）
   依赖：schema.js（FILL_PARAM_DEFS/makeFillParams/normalizeFillParams）、state.js（fillParams/fillCount/fillColors）、
        builders.js（paramRow/inlineChips/hexToHsl/hslToHex）、utils.js（$）、
        canvas.js（scheduleDrawIcon）、history.js（commitHistory）—— 运行时调用。
   约束：1) 所有布局都必须"铺满整个形状"——局部坐标系的覆盖范围由轮廓点反算，
          任何层数/比例/方向/偏移/拉伸组合下都不出现未着色的空隙（需求 2.2）。
        2) 分界线一律升序且不得交叉（拖拽时按左右邻居夹取），保证色块面积非负；
           允许取到 0/100，此时对应层或色块消失（需求 2.3：层间比例最小→内层消失）。
   ============================================================ */

/* ---------- 层划分（需求 2.2） ---------- */
/* N 个色块分到 L 层：每层 N/L 向下取整，余数分给最外层/最上层（层 1 = 矩阵最上层 / 饼图最外层） */
function fillLayerSizes(N, L){
  const n = Math.max(1, Math.min(6, Math.round(N) || 1));
  const l = Math.max(1, Math.min(n, Math.round(L) || 1));
  const base = Math.floor(n / l), rem = n % l;
  const out = [];
  for (let i = 0; i < l; i++) out.push(base + (i < rem ? 1 : 0));
  return out;
}

/* 均分默认值：count 条分界线在 0~100 上等距（1 条 → 50；2 条 → 33.333/66.667；3 条 → 25/50/75）。
   保留 3 位小数：只保留 1 位会让默认分界差出零点几像素（6 条时 43.3 vs 43.0），
   3 位在该精度下足够等分；UI 输入框仍按 1 位显示（拖动/显示用 1 位，内部值保持精确）
   适用：矩阵布局的层间/层内比例（分界线两端有固定边界，故"两端留边"） */
function fillEqualRatios(count){
  const out = [];
  for (let i = 0; i < count; i++) out.push(Math.round((i + 1) / (count + 1) * 100000) / 1000);
  return out;
}

/* 饼图"层内比例"的均分默认值：k 条角分界线把整圆等分为 k 个扇区 → i/k×100（i = 0…k−1，首项为 0）。
   注意，饼图的角分界线首尾相接（整环无固定起始边，k 条半径定义 k 个扇区），因此**不能**沿用
   fillEqualRatios 的"两端留边"公式：后者会给出"k−1 个等宽扇区 + 1 个双倍宽扇区"，
   默认与"均分"按钮就都不再是均分（需求 2.3 要求默认即均分）。 */
function fillEqualAngles(count){
  const out = [];
  for (let i = 0; i < count; i++) out.push(Math.round(i / count * 100000) / 1000);
  return out;
}

/* 层内比例的均分默认值（逐层生成后按层顺序拼接）：
   矩阵 = 该层 k−1 条竖线的"两端留边"值；饼图 = 该层 k 条角分界的"首尾相接"值 */
function fillEqualInRatios(model){
  const out = [];
  (model.groups || []).forEach(g => {
    const eq = model.pie ? fillEqualAngles(g.count) : fillEqualRatios(g.count);
    for (let i = 0; i < g.count; i++) out.push(eq[i] !== undefined ? eq[i] : 0);
  });
  return out;
}

/* ---------- 布局模型（UI 与渲染共用） ---------- */
/* 关键规则（需求 2.3）：
   - 每层分界线数：矩阵布局 = 该层色块数−1（行有固定左右边）；
                   饼图布局 = 该层色块数（整环无固定起始边，k 条半径定义 k 个扇区）
   - 层内比例**逐层独立**（用户要求，V2.23）：每层一组值、各占数组一段（offset/count），
     界面上每层一条滑轨——各层的分界线互不影响（需求 2.3 原文为"各层色块数相同时共享
     一组分界线"，用户改为逐层独立，故不再共享）
   - 饼图单层单色（整圆）时没有"扇区分界"可言，层内比例数量为 0（不给无意义的滑块）
   - 方向数量：饼图且层数≥2 → 每层一个；其余（矩阵 / 饼图单层）→ 1 个 */
function fillLayoutModel(){
  const N = Math.max(1, Math.min(6, fillCount || 1));
  const pie = (fillParams['fill.layout'] || '矩阵布局') === '饼图布局';
  const L = Math.max(1, Math.min(N, Math.round(fillParams['fill.layers']) || 1));
  const sizes = fillLayerSizes(N, L);
  const perLayer = sizes.map(k => Math.max(0, pie ? (k > 1 ? k : 0) : k - 1));
  const groups = [];
  let off = 0;
  perLayer.forEach(c => { groups.push({ count: c, offset: off }); off += c; });
  const inCount = off;
  const layerFirst = [];
  let acc = 0;
  sizes.forEach(k => { layerFirst.push(acc); acc += k; });
  return {
    N, L, pie, sizes, groups, inCount, layerFirst,
    layerCount: Math.max(0, L - 1),
    angleCount: (pie && L >= 2) ? L : 1
  };
}

/* 取某层自己的层内比例分界线（逐层独立：按该层在数组中的 offset/count 切片） */
function fillInValues(model, li){
  const g = model.groups[li];
  if (!g) return [];
  const arr = fillParams['fill.inRatios'] || [];
  const out = [];
  for (let j = 0; j < g.count; j++) out.push(arr[g.offset + j]);
  return out;
}

/* 布局形式切换时换算"层内比例"（需求 2.3）：两种布局的分界线语义不同——
   矩阵 = 色块数−1 条竖线位置（各列跨满 0~100），饼图 = 色块数条角分界（首尾相接）。
   若直接沿用旧数组，切换后会得到重复分界：出现一个 0 宽扇区 + 一个双宽扇区。
   因此按"各段跨度"换算：矩阵→饼图在前面补 0（首条角分界落在基准角，各段跨度一一对应）；
   饼图→矩阵去掉首条角分界、其余减去它（跨度不变，末列自动接上剩余跨度）。两式互逆，
   反复切换布局形式可原样来回——即参数不丢（需求 2.1），且不会产生退化色块。
   换算**逐层进行**（层内比例逐层独立，V2.23）：各层新旧分界线数相差 1（矩阵 k−1 / 饼图 k），
   层号与每层色块数在两种布局下不变，因此按层取旧切片、换算后按层顺序拼回。 */
function convertInRatios(toPie){
  const arr = Array.isArray(fillParams['fill.inRatios']) ? fillParams['fill.inRatios'] : [];
  if (!arr.length) return;
  const m = fillLayoutModel();                       // fill.layout 已在调用前更新为新布局
  const out = [];
  let oldOff = 0;
  m.sizes.forEach(c => {
    const oldCount = Math.max(0, toPie ? c - 1 : c); // 旧布局该层的分界线数
    const newCount = Math.max(0, toPie ? c : c - 1); // 新布局该层的分界线数
    const slice = [];
    for (let j = 0; j < oldCount; j++){
      const v = +arr[oldOff + j];
      slice.push(Math.max(0, Math.min(100, isFinite(v) ? v : 0)));
    }
    const conv = toPie
      ? [0].concat(slice)
      : slice.slice(1).map(x => Math.round((x - slice[0]) * 1000) / 1000);
    for (let j = 0; j < newCount; j++) out.push(conv[j] !== undefined ? conv[j] : 0);
    oldOff += oldCount;
  });
  fillParams['fill.inRatios'] = out;
}

/* 按模型校准数组长度：保留已有值、新项取均分值。
   升序规则：层间比例整段升序；层内比例**逐层各自升序**（整段排序会把各层的值混到一起）；
   方向不排序（每层独立，0~360） */
function syncFillArrays(){
  const m = fillLayoutModel();
  const resize = (key, count, def, sort) => {
    const cur = Array.isArray(fillParams[key]) ? fillParams[key].slice(0, count) : [];
    while (cur.length < count) cur.push(def[cur.length] !== undefined ? def[cur.length] : 0);
    for (let i = 0; i < cur.length; i++){
      let v = +cur[i];
      if (!isFinite(v)) v = 0;
      cur[i] = Math.max(0, Math.min(100, v));
    }
    if (sort) cur.sort((a, b) => a - b);
    fillParams[key] = cur;
  };
  resize('fill.layerRatios', m.layerCount, fillEqualRatios(m.layerCount), true);
  resize('fill.inRatios', m.inCount, fillEqualInRatios(m), false);
  const inArr = fillParams['fill.inRatios'];
  m.groups.forEach(g => {
    const slice = inArr.slice(g.offset, g.offset + g.count).sort((a, b) => a - b);
    for (let i = 0; i < g.count; i++) inArr[g.offset + i] = slice[i] !== undefined ? slice[i] : 0;
  });
  // 方向：0~360，每层独立，不排序
  const angles = Array.isArray(fillParams['fill.angles']) ? fillParams['fill.angles'].slice(0, m.angleCount) : [];
  while (angles.length < m.angleCount) angles.push(0);
  for (let i = 0; i < angles.length; i++){
    let v = +angles[i];
    if (!isFinite(v)) v = 0;
    angles[i] = Math.max(0, Math.min(360, v));
  }
  fillParams['fill.angles'] = angles;
  return m;
}

/* ---------- 几何 ---------- */
/* 填充图案的局部坐标系：局部坐标 = R(−θ)·((P − C) / (sx, sy))
   —— 在局部坐标下取轮廓点的极值，即得"必定覆盖整个形状"的包围盒与半径。
   这样无论层数/比例/方向/偏移/拉伸如何组合，色块都能铺满形状（需求 2.2 末句）。 */
function fillExtentOf(pts, cx, cy, angleDeg, sx, sy){
  const a = -angleDeg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  let hw = 1e-6, hh = 1e-6, r = 1e-6;
  for (let i = 0; i < pts.length; i++){
    const dx = (pts[i].x - cx) / sx, dy = (pts[i].y - cy) / sy;
    const x = dx * ca - dy * sa, y = dx * sa + dy * ca;
    hw = Math.max(hw, Math.abs(x));
    hh = Math.max(hh, Math.abs(y));
    r = Math.max(r, Math.hypot(x, y));
  }
  return { hw, hh, r };
}

/* 分界线百分比 → k+1 个位置（−half … +half）；缺项按均分兜底。
   用于矩阵布局：分界线是"沿轴的直线位置"，从 −half 到 +half */
function fillBoundaries(values, k, half){
  const out = [-half];
  for (let j = 1; j < k; j++){
    const v = (values && values[j - 1] !== undefined) ? values[j - 1] : (j / k * 100);
    out.push(-half + Math.max(0, Math.min(100, v)) / 100 * 2 * half);
  }
  out.push(half);
  return out;
}

/* 分界线百分比 → k+1 个半径（0 … R）；缺项按均分兜底。
   用于饼图布局：层间比例是"环半径分界"，从圆心 0 向外到 R
   （0% → 内层消失，100% → 外层消失，需求 2.3） */
function fillRadii(values, k, R){
  const out = [0];
  for (let j = 1; j < k; j++){
    const v = (values && values[j - 1] !== undefined) ? values[j - 1] : (j / k * 100);
    out.push(Math.max(0, Math.min(100, v)) / 100 * R);
  }
  out.push(R);
  return out;
}

/* 饼图扇区角度（弧度，升序 0~2π）：k 条分界线定义 k 个扇区 */
function fillAngles(values, k){
  const out = [];
  for (let j = 0; j < k; j++){
    const v = (values && values[j] !== undefined) ? values[j] : (j / k * 100);
    out.push(Math.max(0, Math.min(100, v)) / 100 * 2 * Math.PI);
  }
  return out;
}

/* ---------- 绘制 ---------- */
/* 矩阵布局：纵向 L 层（层1 在最上），每层横向均分该层色块数；
   层间比例 = 层分界线的纵向位置，层内比例 = 该层竖线位置（需求 2.3） */
function paintFillMatrix(c, model, ext, colors){
  const ys = fillBoundaries(fillParams['fill.layerRatios'], model.L, ext.hh);
  let ci = 0;
  for (let li = 0; li < model.L; li++){
    const k = model.sizes[li];
    const y0 = ys[li], y1 = ys[li + 1];
    const h = y1 - y0;
    const xs = fillBoundaries(fillInValues(model, li), k, ext.hw);
    for (let j = 0; j < k; j++){
      const w = xs[j + 1] - xs[j];
      const col = colors[ci % colors.length];
      ci++;
      if (w <= 0.25 || h <= 0.25) continue;   // 分界线重合 → 该色块消失（需求 2.3：比例取极值）
      c.fillStyle = col;
      c.fillRect(xs[j], y0, w + 0.5, h + 0.5); // +0.5：消除相邻色块间的抗锯齿细缝
    }
  }
}

/* 饼图布局：L 个同心环（层1 在最外），每环按角度分扇区；
   层间比例 = 环半径分界（0 → 内层消失，100 → 外层消失，需求 2.3），
   层内比例 = 该环各扇区起始角，方向 = 该层整体旋转（需求 2.3） */
function paintFillPie(c, model, R, colors){
  const rs = fillRadii(fillParams['fill.layerRatios'], model.L, R); // [0 … R] 由内到外
  for (let li = 0; li < model.L; li++){
    const k = model.sizes[li];
    const r0 = rs[model.L - 1 - li], r1 = rs[model.L - li];  // 层1 → 最外环
    const base = model.layerFirst[li];
    const rot = (fillParams['fill.angles'][li] || 0) * Math.PI / 180;
    const ths = fillAngles(fillInValues(model, li), k);
    if (r1 - r0 <= 0.25) continue;                            // 该环消失
    for (let j = 0; j < k; j++){
      const a0 = -Math.PI / 2 + rot + ths[j];
      const a1 = -Math.PI / 2 + rot + (j + 1 < k ? ths[j + 1] : ths[0] + 2 * Math.PI);
      c.fillStyle = colors[(base + j) % colors.length];
      c.beginPath();
      c.arc(0, 0, r1, a0, a1);
      c.arc(0, 0, Math.max(0, r0), a1, a0, true);
      c.closePath();
      c.fill();
    }
  }
}

/* 入口：在已建立"形状裁切"的画布上铺满填充色块（由 bgshape.js 的 drawBgShape 调用）。
   S = 画布边长；pts = 形状轮廓点（画布坐标）；colors = 色块色值（fillColors） */
function paintFillPattern(c, S, pts, colors){
  if (!pts || pts.length < 3) return;
  const m = syncFillArrays();               // 每次绘制前校准数组（色块数/层数可能刚变化）
  const box = shapeBoundsOfPoints(pts);
  const sx = Math.max(0.01, (+fillParams['fill.stretchX'] || 100) / 100);
  const sy = Math.max(0.01, (+fillParams['fill.stretchY'] || 100) / 100);
  const cx = (box.minX + box.maxX) / 2 + (+fillParams['fill.offsetX'] || 0) / 100 * S;
  const cy = (box.minY + box.maxY) / 2 + (+fillParams['fill.offsetY'] || 0) / 100 * S;
  // 矩阵布局：整体方向；饼图布局：方向在每层内部生效，故此处不加旋转
  const angle = m.pie ? 0 : (+fillParams['fill.angles'][0] || 0);
  const ext = fillExtentOf(pts, cx, cy, angle, sx, sy);

  c.save();
  c.translate(cx, cy);
  if (angle) c.rotate(angle * Math.PI / 180);
  c.scale(sx, sy);
  if (m.pie) paintFillPie(c, m, ext.r, colors);
  else paintFillMatrix(c, m, ext, colors);
  c.restore();
}

/* ---------- 多分界线共享滑轨组件（需求 2.3） ---------- */
/* opts: { key, label, values, max, unit, equal, offset, hint }
   - 滑块数量 = values.length；有 equal 时显示"均分"按钮
   - offset：本滑轨对应数组 fillParams[key] 的起始下标（层内比例逐层独立 → 每层一条滑轨，
     各自读写自己那一段；缺省 0 = 整段）
   - 手柄位置 = 值 / max；拖拽按左右邻居夹取，禁止交叉（保持升序） */
function multiSliderHTML(opts){
  const key = opts.key, values = opts.values || [], max = opts.max || 100, unit = opts.unit || '%';
  const offset = Math.max(0, opts.offset || 0);
  if (!values.length) return `<div class="mslider-empty">${opts.hint || '当前无需设置'}</div>`;
  const handles = values.map((v, i) => `<button class="mslider-h" data-ms-i="${i}" style="left:${(v / max * 100).toFixed(3)}%" title="第 ${i + 1} 条分界线"></button>`).join('');
  const nums = values.map((v, i) => `<input class="num tiny" data-ms-i="${i}" value="${v}">`).join(`<span class="unit">${unit}</span>`) + (values.length ? `<span class="unit">${unit}</span>` : '');
  return `<div class="param stacked" data-ms="${key}" data-ms-max="${max}" data-ms-offset="${offset}">
    <span class="pname">${opts.label}</span>
    <div class="mslider" data-ms-track><div class="mslider-rail"></div>${handles}</div>
    <div class="mslider-nums">${nums}${opts.equal ? `<button class="btn ghost sm" data-ms-equal="1">均分</button>` : ''}</div>
  </div>`;
}

/* 绑定多分界线滑轨（拖拽 / 输入框 / 均分）。container 为 pane 根节点 */
function bindMultiSliders(container){
  container.querySelectorAll('[data-ms]').forEach(box => {
    if (box.dataset.bound) return;
    box.dataset.bound = '1';
    const key = box.dataset.ms;
    const max = +box.dataset.msMax || 100;
    const off = Math.max(0, +box.dataset.msOffset || 0);   // 本滑轨在数组中的起始下标（逐层独立）
    const track = box.querySelector('[data-ms-track]');
    const handles = Array.from(box.querySelectorAll('.mslider-h'));
    const nums = Array.from(box.querySelectorAll('input.num'));
    const n = handles.length;
    const arr = () => (Array.isArray(fillParams[key]) ? fillParams[key] : (fillParams[key] = []));
    const at = i => +arr()[off + i] || 0;
    const paint = () => {
      handles.forEach((h, i) => { h.style.left = (at(i) / max * 100).toFixed(3) + '%'; });
      nums.forEach((x, i) => { if (document.activeElement !== x) x.value = Math.round(at(i) * 10) / 10; });
    };
    /* 写值：在本段内按左右邻居夹取，保证升序不交叉（首尾以 0 / max 为界）；
       commit=true 时入撤销栈 */
    const write = (i, v, commit) => {
      const a = arr();
      const prev = i > 0 ? (+a[off + i - 1] || 0) : 0;
      const next = i < n - 1 ? (+a[off + i + 1] || 0) : max;
      a[off + i] = Math.max(prev, Math.min(next, v));
      paint();
      scheduleDrawIcon();
      if (commit) commitHistory();
    };
    handles.forEach((h, i) => h.addEventListener('pointerdown', e => {
      e.preventDefault();
      h.classList.add('dragging');
      const rect = track.getBoundingClientRect();
      const move = ev => write(i, Math.round((ev.clientX - rect.left) / Math.max(1, rect.width) * max * 10) / 10, false);
      const up = () => {
        h.classList.remove('dragging');
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        commitHistory();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      move(e);
    }));
    nums.forEach((n, i) => n.addEventListener('change', () => {
      const v = parseFloat(n.value);
      if (isNaN(v) || v < 0 || v > max){
        flashInvalid(n, 0, max);
        setTimeout(paint, 620);
        return;
      }
      write(i, v, true);
    }));
    const eq = box.querySelector('[data-ms-equal]');
    if (eq) eq.addEventListener('click', () => {
      const a = arr();
      /* 饼图的层内比例 = 角分界线（首尾相接），均分取 i/k；其余（矩阵比例 / 饼图环半径）取"两端留边" */
      const base = (key === 'fill.inRatios' && fillLayoutModel().pie) ? fillEqualAngles(n) : fillEqualRatios(n);
      for (let i = 0; i < n; i++) a[off + i] = Math.round(base[i] / 100 * max * 10) / 10;
      paint();
      scheduleDrawIcon();
      commitHistory();
    });
  });
}

/* ---------- 布局 pane 交互（布局形式 chip / 层数 resync 提示） ---------- */
/* 形状为"无"时填充不显示（形状即背景，需求 1.8）：给出可操作提示，避免用户以为功能失效 */
function fillShapeHintHTML(){
  if (shapeKindInfo(bgParams['shape.kind']).type !== 'none') return '';
  return `<div class="mslider-empty" style="color:#e5484d">当前形状为「无」，填充不显示；请先在「形状与外框」中选择形状。</div>`;
}

/* 布局形式切换（矩阵 / 饼图）：写入状态 → 校准数组 → 重渲染本模块
   取值来自芯片的 data-val（panes.js 的 inlineChips 逐片写入），旧模板缺该属性时退回芯片文字 */
function bindFillLayoutChips(container){
  container.querySelectorAll('[data-group="fillLayout"] .chip').forEach(chip => {
    if (chip.dataset.bound) return;
    chip.dataset.bound = '1';
    chip.addEventListener('click', () => {
      const v = chip.dataset.val || chip.textContent.trim();
      if (!v || v === fillParams['fill.layout']) return;
      const wasPie = fillParams['fill.layout'] === '饼图布局';
      fillParams['fill.layout'] = v;
      if (wasPie !== (v === '饼图布局')) convertInRatios(v === '饼图布局');   // 层内比例跨布局换算
      syncFillArrays();
      rerenderModule('fill');
      scheduleDrawIcon();
      commitHistory();
      toast('布局形式：' + v);
    });
  });
}
