/* ============================================================
   KiconCreator V2 · js/fillLayout.js
   职责：填充数量与布局引擎（需求 三.2）——把 N 个色块铺满外框形状。
     - fillLayerSizes：把 N 个色块分到 L 层（无法均分时余数分给最外层/最上层，需求 2.2）
     - fillLayoutModel：层/分组/分界线数量/方向数量的统一模型（UI 与渲染共用同一份推算）
     - syncFillArrays：按模型校准三组数组参数（层间比例/层内比例/每层方向）
     - convertInRatios：布局形式切换时按"各段跨度"换算层内比例（矩阵 ⇄ 饼图语义不同）
     - 填充边界（需求 2.3）：edgeOffset（边界形状 sin/tan/波浪/锯齿 的位移 + 10× 画布截断）、
       edgeCurveV/H/Ray/Ring（把分界线采样成曲线）、paintEdgeBand（五种过渡样式的过渡带）
     - fillExtentOf / paintFillPattern：矩阵布局（纵向 L 层 × 横向若干列）与
       饼图布局（L 个同心环 × 每环若干扇区）的几何与绘制
     - multiSliderHTML / bindMultiSliders：多分界线共享滑轨组件（+ 参数输入框 + 均分）
   版本：V0.09（V2.28：tan 改为整段主值曲线（±10×画布截断兜底，修"三段直线"观感）；paintFillPattern 组装每色块 paint 描述符，fillPaintOf 解析渐变/图片（需求 3.2.2/3.2.3）；饼图径向分界角偏移夹取 ±0.75π）
        V0.08（V2.27：① 新增"波浪"边界形状——连续半圆（默认参数）上下交替组成的曲线，参数 A 高度/ω 半圆宽度/φ 偏移，无 k；
        ② tan 改为**主值分支 + ±45° 饱和**（|tan|≤1 → 位移 ≤ ±A），分界线是**一条连续曲线**——此前 tan 全周期渲染在渐近线处把边界撕成多条冲出画布的线段；
        ③ paintEdgeBand 重写为"逐点法向带状多边形"——过渡宽度沿**所选边界形状**左右各扩 w/2、渐变按逐点法向展开，不再锚在原始直线两侧）
        V0.07（V2.26：边界形状只作用于**内部接缝**——填充外边界（最左/最右竖边、最上层上边、最下层下边、
        最外环外弧、单色层的半径）不再参与位移，修掉"贴边露空隙"；直线形状下采样降到 2 段）
        V0.06（V2.25：新增 edgeFramePoints——"包含形状外框"开启时轮廓随边界形状起伏
        （弧长参数化 + 重采样 + 整周期取整保证闭合无台阶）；波形取值抽为 edgeWave）
        V0.05（V2.24：填充边界落地——edgeOffset（sin/tan/锯齿 + 安全截断）、过渡带五种样式、
        色块改用采样多边形（边界形状可位移）、边界形状/过渡样式芯片绑定）
        V0.04（V2.23：层内比例**逐层独立**——每层一条滑轨（offset 读写本层那一段），
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

/* ---------- 填充边界（需求 2.3 标签"填充边界"） ---------- */
/* 边界位移量（沿"垂直于边界"的方向，正值偏向 +x/+y）：
     t = 边界上的位置参数，**原点在形状中心点**（需求 2.3：sin/tan 的圆点在中心、
         锯齿原点以中心为基准；波浪同理以中心为相位基准）
         · 矩阵竖向分界 → 局部 y      · 矩阵横向分界 → 局部 x
         · 饼图径向分界 → 半径 r      · 饼图环分界   → 沿环的弧长（环的原点角从中心辐射）
     S = 画布边长（A 振幅、k 偏移都按画布边长的百分比换算）
   形状：直线 → 0；sin/tan → A·f(2π·ω·t/S + φ) + k；锯齿 → 三角波（齿宽 ω%×S，t=0 处为齿峰）；
         波浪 → 连续半圆上下交替（V2.27：半圆宽 ω%×S、高 A%×S，默认 A=10/ω=20 恰为半圆，
         A≠ω/2 时为半椭圆；只有 A/ω/φ 三个参数，无 k）
   安全保护（需求 2.3"参数范围限制 + 渲染截断"）：ω 取下限避免除零、tan 饱和限幅（见 edgeWave）、
   最终位移一律截断到 ±10×画布，且绝不返回 NaN/Infinity。 */
function clampEdge(x, lim){
  if (!isFinite(x)) return 0;
  return Math.max(-lim, Math.min(lim, x));
}
/* 波形取值（V2.28：tan 取**主值分支整段曲线**）：arg 为函数自变量。
   tan(arg) 在渐近线处发散且逐周期跳变（+∞ → −∞）——按 y=Atan(ωx+φ)+k 全周期渲染时，
   每个渐近线都会把分界线撕成一条冲出画布的线段，整条边界断成多段、互相穿插
   （用户要求 V2.27：tan 形状下应只有一条线作为边界）。因此只取**过中心的主值分支**。
   幅度兜底 = 最终 clampEdge(±10×画布)（需求 2.3 的渲染截断保护）：渐近线方向的饱和段
   全部落在画布外 10 倍处，可见范围内整条边界都是 y=Atan(ωx+φ)+k 的**曲线**
   （V2.27 曾把自变量限幅在 ±45°，|d|≤A，结果可见范围出现"平线−陡坡−平线"的
   三段直线观感——用户指出应为曲线，V2.28 改为整段主值曲线；
   自变量仍截在渐近线前 1e−6 rad，防止 Math.tan 返回 Infinity）。 */
const TAN_ARG_MAX = Math.PI / 2 - 1e-6;
function edgeWave(shape, arg){
  if (shape === 'tan') return Math.tan(Math.max(-TAN_ARG_MAX, Math.min(TAN_ARG_MAX, arg)));
  return Math.sin(arg);
}
function edgeOffset(t, S, cfg){
  const shape = (cfg && cfg['edge.shape']) || '直线';
  if (shape === '直线') return 0;
  const lim = 10 * S;
  const A = Math.max(0, +cfg['edge.A'] || 0) / 100 * S;
  if (shape === '锯齿'){
    const tooth = Math.max(1, +cfg['edge.tooth'] || 12) / 100 * S;
    const u = ((t % tooth) + tooth) % tooth;                          // 0…tooth；t=0 处为齿峰
    const tri = (u < tooth / 2) ? (u / (tooth / 2)) : (2 - u / (tooth / 2));
    return clampEdge(A * (1 - tri * 2), lim);                        // +A … −A（t=0 为峰、半齿为谷）
  }
  if (shape === '波浪'){
    /* 连续半圆组成的波浪（V2.27）：单拱宽 W = ω%×S、高 A%×S，相邻拱上下交替；
       φ 以 180° = 半个波长平移（上下翻转）。半圆纵剖比例 s∈[0,1] → √(4s(1−s))
       （拱顶 ±A、拱脚过基线且切线竖直）；A ≠ ω/2 时为半椭圆，默认恰为半圆。 */
    const W = Math.max(1, +cfg['edge.wave'] || 20) / 100 * S;
    const te = t + ((+cfg['edge.phi'] || 0) / 180) * W;
    const n = Math.floor(te / W);
    const s = te / W - n;
    const half = Math.sqrt(Math.max(0, 4 * s * (1 - s)));             // 0…1，s=0.5 处取 1
    return clampEdge(A * half * ((((n % 2) + 2) % 2) ? -1 : 1), lim);
  }
  const w = Math.max(0.05, +cfg['edge.W'] || 2);                      // ω 下限：避免除零/零频
  const phi = (+cfg['edge.phi'] || 0) * Math.PI / 180;
  const k = (+cfg['edge.k'] || 0) / 100 * S;
  const arg = 2 * Math.PI * w * (t / S) + phi;
  return clampEdge(A * edgeWave(shape, arg) + k, lim);
}

/* 形状外框参与边界形状（`edge.frame`，需求 2.3 扩展；**默认关闭** → 只调节内部填充之间的边界）。
   轮廓是闭合曲线，与"分界线"不同，因此这里：
     · 位置参数 t = 沿轮廓的弧长，原点取"轮廓上最靠近基准方向（正上方，即 −90°）的点"——与饼图环分界同一约定
     · 先把轮廓按 ~2px 重采样（形状自带的采样点远稀于一个波形周期，直接用会锯齿化）
     · 周期数 / 齿数**取整**后再铺波：闭合轮廓必须让 d(0) = d(L)，否则起点处会出现一道台阶
     · 位移沿该点的**外法向**（背离形状中心）
   关闭该选项、形状为"无"或边界形状为"直线"时原样返回（零开销、零视觉变化）。 */
function edgeFramePoints(pts, S){
  if (!pts || pts.length < 3) return pts;
  if (typeof fillParams === 'undefined' || !fillParams || !fillParams['edge.frame']) return pts;
  const shape = fillParams['edge.shape'] || '直线';
  if (shape === '直线') return pts;
  const cfg = fillParams;
  const n0 = pts.length;
  const seg = [];
  let L = 0;
  for (let i = 0; i < n0; i++){
    const a = pts[i], b = pts[(i + 1) % n0];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    seg.push({ a, b, len });
    L += len;
  }
  if (!(L > 0)) return pts;
  const step = Math.max(0.5, Math.min(4, L / 1200));
  const res = [];
  seg.forEach(sg => {
    const n = Math.max(1, Math.round(sg.len / step));
    for (let j = 0; j < n; j++){
      const u = j / n;
      res.push({ x: sg.a.x + (sg.b.x - sg.a.x) * u, y: sg.a.y + (sg.b.y - sg.a.y) * u });
    }
  });
  const c = { x: S / 2, y: S / 2 };
  /* 弧长原点：轮廓上最靠近正上方（−90°）的点 */
  let start = 0, best = Infinity;
  res.forEach((p, i) => {
    const ang = Math.atan2(p.y - c.y, p.x - c.x);
    const d = Math.abs(((ang + Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (d < best){ best = d; start = i; }
  });
  /* 整周期（闭合接缝无台阶）：ω = 每倍画布边长的周期数 → 轮廓上的总周期取整；
     锯齿同理由齿数取整；波浪由"完整波长（上+下两个半圆）"数取整（V2.27） */
  const A = Math.max(0, +cfg['edge.A'] || 0) / 100 * S;
  const kOff = (+cfg['edge.k'] || 0) / 100 * S;
  const lim = 10 * S;
  const waveW = Math.max(1, (+cfg['edge.wave'] || 20) / 100 * S);
  const cycles = shape === '锯齿'
    ? Math.max(1, Math.round(L / Math.max(1, (+cfg['edge.tooth'] || 12) / 100 * S)))
    : shape === '波浪'
      ? Math.max(1, Math.round(L / (2 * waveW)))
      : Math.max(1, Math.round(Math.max(1, +cfg['edge.W'] || 2) * (L / S)));
  const phi = (+cfg['edge.phi'] || 0) * Math.PI / 180;
  /* 按遍历顺序的弧长表（n=0 → 0，n 递增到接近 L） */
  const order = [], arcs = [];
  for (let n = 0; n < res.length; n++) order.push((start + n) % res.length);
  let acc = 0;
  for (let n = 0; n < order.length; n++){
    if (n > 0){
      const a = res[order[n - 1]], b = res[order[n]];
      acc += Math.hypot(b.x - a.x, b.y - a.y);
    }
    arcs.push(acc);
  }
  const out = new Array(res.length);
  for (let n = 0; n < order.length; n++){
    const i = order[n];
    const p = res[i], prev = res[(i - 1 + res.length) % res.length], next = res[(i + 1) % res.length];
    let tx = next.x - prev.x, ty = next.y - prev.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    let nx = ty, ny = -tx;                                  // 轮廓法向
    if ((p.x - c.x) * nx + (p.y - c.y) * ny < 0){ nx = -nx; ny = -ny; }   // 取"朝外"的一侧
    const arc = arcs[n];
    let d;
    if (shape === '锯齿'){
      const tooth = L / cycles;
      const u = ((arc % tooth) + tooth) % tooth;
      const tri = (u < tooth / 2) ? (u / (tooth / 2)) : (2 - u / (tooth / 2));
      d = clampEdge(A * (1 - tri * 2), lim);
    } else if (shape === '波浪'){
      /* 波浪：整周期化后的波长 = L/cycles（上+下两个半圆），半圆宽 = 波长/2；
         弧长平移 cycles·波长 后回到同一相位 → 起点接缝无台阶；φ 以 180° = 半个波长平移 */
      const period = L / cycles, W = period / 2;
      const ae = arc + ((+cfg['edge.phi'] || 0) / 180) * W;
      const u = ((ae % period) + period) % period;
      const q = Math.floor(u / W), s = u / W - q;
      d = clampEdge(A * Math.sqrt(Math.max(0, 4 * s * (1 - s))) * (q ? -1 : 1), lim);
    } else {
      d = clampEdge(A * edgeWave(shape, 2 * Math.PI * cycles * (arc / L) + phi) + kOff, lim);
    }
    out[i] = { x: p.x + nx * d, y: p.y + ny * d };
  }
  return out;
}

/* 过渡带取色：两端色的混合 / 加深 / 变浅（RGB 线性运算，不引入第二套颜色体系） */
function edgeRgb(hex){
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const v = m ? m[1] : '000000';
  return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16));
}
function edgeHexOf(rgb){
  return '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function edgeMix(a, b, t){
  const A = edgeRgb(a), B = edgeRgb(b);
  return edgeHexOf(A.map((v, i) => v + (B[i] - v) * t));
}
function edgeShade(hex, d){ return edgeHexOf(edgeRgb(hex).map(v => v + d * 255)); }

/* 采样密度：按曲线跨度取 ~2px 一段（下限 24 段、上限 240 段）。
   锯齿的折点、sin/tan 的峰谷都在采样点之间被线性插值"削平"，因此必须比"够看"更密：
   2px 间隔下折点处的振幅误差约为 A×2/(齿宽/2)，肉眼不可见。
   形状为"直线"时没有任何位移 → 只给 2 段（3 个点），别为直边白采样上百个点。 */
function edgeSteps(span){
  if ((fillParams['edge.shape'] || '直线') === '直线') return 2;
  const s = Math.abs(span) || 0;
  return Math.max(24, Math.min(240, Math.round(s / 2)));
}

/* 矩阵竖向分界曲线：x = b + edgeOffset(y)，y ∈ [yA, yB] */
function edgeCurveV(b, yA, yB, S){
  const n = edgeSteps(yB - yA), out = [];
  for (let i = 0; i <= n; i++){
    const y = yA + (yB - yA) * i / n;
    out.push({ x: b + edgeOffset(y, S, fillParams), y });
  }
  return out;
}
/* 矩阵横向分界曲线：y = b + edgeOffset(x)，x ∈ [xA, xB] */
function edgeCurveH(b, xA, xB, S){
  const n = edgeSteps(xB - xA), out = [];
  for (let i = 0; i <= n; i++){
    const x = xA + (xB - xA) * i / n;
    out.push({ x, y: b + edgeOffset(x, S, fillParams) });
  }
  return out;
}
/* 饼图径向分界曲线：θ(r) = b + d_eff(r)/r。
   d_eff 在靠圆心的 1/4 画布内线性收敛到 0（振幅爬升）——需求 2.3 的截断保护：
   否则 r→0 时 d/r 发散，扇区会在圆心附近互相穿越、露出未着色区域。
   波形的相位原点仍在中心（arg = 2π·ω·r/S + φ），只是振幅从中心向外爬升。 */
function edgeCurveRay(b, rA, rB, S, plain){
  const n = edgeSteps(rB - rA), out = [];
  const ramp = S * 0.25;
  /* 角偏移夹取（V2.28）：tan 的 d 可达 ±10×画布，d/r 会让射线在原地缠绕多圈、扇区多边形撕碎；
     夹在 ±0.75π 内（sin 的正常偏移 ≤ ~1 rad 不受影响），两条射线的偏移相同 → 永不交叉 */
  const TH_MAX = Math.PI * 0.75;
  for (let i = 0; i <= n; i++){
    const r = rA + (rB - rA) * i / n;
    const d = plain ? 0 : edgeOffset(Math.max(1e-3, r), S, fillParams) * Math.min(1, r / ramp);
    const th = b + Math.max(-TH_MAX, Math.min(TH_MAX, d / Math.max(1e-3, r)));
    out.push({ x: Math.cos(th) * r, y: Math.sin(th) * r });
  }
  return out;
}
/* 饼图环分界曲线：r = b + edgeOffset(弧长)，弧长以该环的起始角 aOrigin 为原点（原点在中心）。
   plain=true 时不做位移（用于"填充的最外/最内边界"——它们必须贴合形状，见 paintFillPie） */
function edgeCurveRing(b, aA, aB, S, aOrigin, plain){
  const n = Math.max(24, Math.min(240, Math.round(Math.abs(aB - aA) * Math.max(1, b) / 2) + 1));
  const out = [];
  for (let i = 0; i <= n; i++){
    const a = aA + (aB - aA) * i / n;
    const r = plain ? b : Math.max(0, b + edgeOffset(Math.max(0, b) * (a - aOrigin), S, fillParams));
    out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return out;
}

/* 折线描边 / 多边形填充（色块边界曲线一律走这里，保证共用同一份采样点） */
function strokePolyline(c, pts){
  c.beginPath();
  pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
  c.stroke();
}
/* 多边形填充：paint 可为 hex 字符串 / CanvasGradient / CanvasPattern（V2.28 需求 3.2.2/3.2.3）。
   同一 paint 同时赋给 fillStyle 与 strokeStyle：渐变/图案的坐标在绘制时的用户空间解释，
   与 fill 同变换，1px 描边仍能与色块本体同色，盖住相邻色块之间的抗锯齿细缝 */
function fillPolygon(c, pts, paint){
  c.beginPath();
  pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
  c.closePath();
  c.fillStyle = paint;
  c.fill();
  c.lineWidth = 1;                 // 同 paint 描边：盖住相邻色块之间的抗锯齿细缝
  c.strokeStyle = paint;
  c.stroke();
}

/* ---------- 色块背景 paint（V2.28，需求 3.2.2 渐变 / 3.2.3 图片） ---------- */
/* 多边形包围盒（局部坐标）：渐变几何与图片覆盖都以它为基准 */
function polyBBox(pts){
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  (pts || []).forEach(p => {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  });
  return { x: minX, y: minY, w: Math.max(1e-3, maxX - minX), h: Math.max(1e-3, maxY - minY) };
}
/* 渐变起止色解析：from/to 为空时回退当前色值 / 其同色系亮色（与色块缩略同规则） */
function fillGradColors(p){
  const from = (p.grad && p.grad.from) || p.color;
  let to = (p.grad && p.grad.to) || '';
  if (!to){
    const { h, s, l } = hexToHsl(p.color);
    to = hslToHex(h + 16, Math.min(1, s * 0.92), Math.min(0.86, l + 0.16));
  }
  return { from, to };
}
/* 线性/径向渐变（渐变坐标建立在色块多边形包围盒上，随布局变换一起缩放旋转） */
function fillGradPaint(p, c, poly){
  const { from, to } = fillGradColors(p);
  const b = polyBBox(poly);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  if (p.grad && p.grad.type === '径向'){
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(b.w, b.h) / 2);
    g.addColorStop(0, from);
    g.addColorStop(1, to);
    return g;
  }
  /* 线性：角度 0° = 自下向上（CSS 惯例），渐变线长度按包围盒投影取"完全覆盖"值 */
  const a = (((p.grad && p.grad.angle) || 0)) * Math.PI / 180;
  const dx = Math.sin(a), dy = -Math.cos(a);
  const L = Math.abs(b.w * dx) + Math.abs(b.h * dy);
  const g = c.createLinearGradient(cx - dx * L / 2, cy - dy * L / 2, cx + dx * L / 2, cy + dy * L / 2);
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  return g;
}
/* 色块图片的离屏画布（按剪裁窗口取像素，带缓存；key = id + 剪裁参数） */
const fillImgCache = new Map();
/* 清空剪裁画布缓存：改剪裁/换图/移除后由 interactions.js 的绑定调用 */
function fillImgCacheClear(){ fillImgCache.clear(); }
function fillImageCanvasOf(image, entry){
  const key = image.id + '|' + JSON.stringify(image.crop || null);
  let cv = fillImgCache.get(key);
  if (cv) return cv;
  if (fillImgCache.size > 12) fillImgCache.clear();   // 简单上限：换图/改剪裁后旧画布不再保留
  const { sx, sy, sw, sh } = imgCropRect(entry, image.crop);
  const k = Math.min(1, IMG_MAX_EDGE / Math.max(sw, sh));
  cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(sw * k));
  cv.height = Math.max(1, Math.round(sh * k));
  cv.getContext('2d').drawImage(entry.bitmap, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
  fillImgCache.set(key, cv);
  return cv;
}
/* 图片色块 → CanvasPattern：裁剪后的画面按"覆盖色块包围盒"为基准缩放（size%）并平移（fx/fy%），
   repeat 平铺（放大后拖动不会露底）。图片缺失/未上传 → null（回退纯色） */
function fillImagePattern(p, c, poly){
  const image = p.image;
  const entry = image && image.id ? imgGet(image.id) : null;
  if (!entry || !entry.bitmap) return null;
  const src = fillImageCanvasOf(image, entry);
  const b = polyBBox(poly);
  const cover = Math.max(b.w / src.width, b.h / src.height);
  const k = cover * Math.max(0.05, Math.min(4, (+image.size || 100) / 100));
  const pat = c.createPattern(src, 'repeat');
  if (pat && pat.setTransform){
    const tx = b.x + b.w / 2 - src.width * k / 2 + (+image.fx || 0) / 100 * b.w;
    const ty = b.y + b.h / 2 - src.height * k / 2 + (+image.fy || 0) / 100 * b.h;
    try { pat.setTransform(new DOMMatrix([k, 0, 0, k, tx, ty])); } catch (e){ /* 老浏览器忽略变换 */ }
  }
  return pat;
}
/* 色块 paint 解析：hex 描述符 → 实际绘制对象。渐变/图片失效时回退纯色，
   保证任何状态下色块都有确定颜色（不会出现漏底） */
function fillPaintOf(p, c, poly){
  if (!p) return '#000000';
  if (p.image){
    const pat = fillImagePattern(p, c, poly);
    if (pat) return pat;
    return p.color;
  }
  if (p.grad) return fillGradPaint(p, c, poly);
  return p.color;
}

/* 过渡带（需求 2.3；V2.27 重写）：把边界曲线沿**逐点法向**左右各扩 w/2 张成"带状多边形"，
   颜色过渡也按逐点法向展开——此前渐变是"过曲线中点、沿固定轴"的线性/径向渐变，
   波形振幅大时过渡色仍锚在**原始直线**两侧，峰谷处的左右范围与过渡带错位
   （用户要求：过渡宽度应沿所选边界形状左右扩展，而非原始直线）。
   样式：单色 = 两端色的中值平涂；渐变 = 每小段用该段法向的线性渐变；
        加深/变浅 = 中值色的明度加减；透明 = 沿曲线描边 destination-out
        （描边宽度本就跨在曲线两侧法向上，无需重写）。
   axis 只用于统一法向朝向（保证 +n 侧 = colA，与位移轴同侧）：
     { linear:{nx,ny} } 开放边界给固定参考方向（即该接缝的位移轴）；
     { radial:{r} } 闭合环逐点取"背离圆心"（饼图局部坐标系以圆心为原点） */
function paintEdgeBand(c, pts, S, colA, colB, axis){
  const w = Math.max(0, (+fillParams['edge.width'] || 0) / 100 * S);
  if (w <= 0.05 || !pts || pts.length < 2) return;
  const style = fillParams['edge.style'] || '渐变';
  if (style === '透明'){
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.strokeStyle = '#000';
    c.lineWidth = w;
    c.lineJoin = 'round';
    strokePolyline(c, pts);
    c.restore();
    return;
  }
  const n = pts.length, half = w / 2;
  /* 逐点法向：切线 = 前后邻点连线（开曲线端点用单侧），法向取 (−ty, tx)，
     再按参考方向把整条曲线的法向统一翻到"colA 在 +n 一侧" */
  const nrm = new Array(n);
  for (let i = 0; i < n; i++){
    const a = pts[i > 0 ? i - 1 : 0], b = pts[i < n - 1 ? i + 1 : n - 1];
    let tx = b.x - a.x, ty = b.y - a.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    let nx = -ty, ny = tx;
    const rx = (axis && axis.radial) ? pts[i].x : (axis ? axis.linear.nx : 1);
    const ry = (axis && axis.radial) ? pts[i].y : (axis ? axis.linear.ny : 0);
    if (nx * rx + ny * ry < 0){ nx = -nx; ny = -ny; }
    nrm[i] = { x: nx, y: ny };
  }
  const side = (i, s) => ({ x: pts[i].x + nrm[i].x * s, y: pts[i].y + nrm[i].y * s });
  c.save();
  c.lineJoin = 'round';
  if (style === '渐变'){
    /* 逐段四边形 + 该段法向的线性渐变（stop 0 = +n 侧 = colA）；
       每段 1px 同渐变描边盖住段与段之间的抗锯齿细缝 */
    for (let i = 0; i < n - 1; i++){
      const p0 = side(i, half), p1 = side(i + 1, half), p2 = side(i + 1, -half), p3 = side(i, -half);
      let gx = nrm[i].x + nrm[i + 1].x, gy = nrm[i].y + nrm[i + 1].y;
      const gl = Math.hypot(gx, gy) || 1;
      gx /= gl; gy /= gl;
      const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      const g = c.createLinearGradient(mx + gx * half, my + gy * half, mx - gx * half, my - gy * half);
      g.addColorStop(0, colA);
      g.addColorStop(1, colB);
      c.fillStyle = g;
      c.strokeStyle = g;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.lineTo(p3.x, p3.y);
      c.closePath();
      c.fill();
      c.stroke();
    }
  } else {
    const m = edgeMix(colA, colB, 0.5);
    const col = style === '加深' ? edgeShade(m, -0.22) : (style === '变浅' ? edgeShade(m, 0.32) : m);
    c.beginPath();
    for (let i = 0; i < n; i++){ const p = side(i, half); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }
    for (let i = n - 1; i >= 0; i--){ const p = side(i, -half); c.lineTo(p.x, p.y); }
    c.closePath();
    c.fillStyle = col;
    c.fill();
    c.lineWidth = 1;                 // 同色描边：盖住带边缘的抗锯齿细缝
    c.strokeStyle = col;
    c.stroke();
  }
  c.restore();
}

/* ---------- 绘制 ---------- */
/* 矩阵布局：纵向 L 层（层1 在最上），每层横向均分该层色块数；
   层间比例 = 层分界线的纵向位置，层内比例 = 该层竖线位置（需求 2.3）。
   边界形状（需求 2.3）把**内部接缝**（色块之间/层与层之间的分界线）按 edgeOffset 位移成曲线，
   色块因此改用"采样多边形"绘制：相邻色块共用同一条采样曲线、角点取两端候选点的中点，拼接处无缝。
   **填充的外边界（最左/最右竖边、最上层上边、最下层下边）不参与位移**——它们必须始终贴合形状轮廓，
   否则波形向内的一侧会与轮廓之间露出空隙（实测双色+sin 会露出 13% 面积），见 4.14 的注意。
   过渡带延后到色块全部铺完再画（避免被后画的色块盖住），且只画在内部接缝上。 */
function paintFillMatrix(c, model, ext, paints, S){
  const ys = fillBoundaries(fillParams['fill.layerRatios'], model.L, ext.hh);
  const straightV = (b, yA, yB) => [{ x: b, y: yA }, { x: b, y: yB }];
  const straightH = (b, xA, xB) => [{ x: xA, y: b }, { x: xB, y: b }];
  /* 色块描述符（{color, grad?, image?}）：过渡带取 .color（hex），色块本体走 fillPaintOf（V2.28） */
  const ciOf = (li, j) => paints[(model.layerFirst[li] + j) % paints.length];
  let ci = 0;
  for (let li = 0; li < model.L; li++){
    const k = model.sizes[li];
    const yT = ys[li], yB = ys[li + 1];
    const xs = fillBoundaries(fillInValues(model, li), k, ext.hw);
    /* 竖边：最左/最右是填充外边界（直），其余为内部接缝（按波形位移） */
    const vCurves = xs.map((b, j) => (j === 0 || j === k) ? straightV(b, yT, yB) : edgeCurveV(b, yT, yB, S));
    for (let j = 0; j < k; j++){
      const p = paints[ci % paints.length];
      ci++;
      if (xs[j + 1] - xs[j] <= 0.25 || yB - yT <= 0.25) continue;   // 分界线重合 → 该色块消失
      /* 横边：最上层上边 / 最下层下边是填充外边界（直），其余（层间接缝）按波形位移 */
      const top = (li === 0) ? straightH(yT, xs[j], xs[j + 1]) : edgeCurveH(yT, xs[j], xs[j + 1], S);
      const bot = (li === model.L - 1) ? straightH(yB, xs[j], xs[j + 1]) : edgeCurveH(yB, xs[j], xs[j + 1], S);
      const poly = cellPolygon(vCurves[j], vCurves[j + 1], top, bot);
      fillPolygon(c, poly, fillPaintOf(p, c, poly));
    }
  }
  /* 过渡带：层内竖向分界（同层相邻两色之间） */
  for (let li = 0; li < model.L; li++){
    const k = model.sizes[li];
    const yT = ys[li], yB = ys[li + 1];
    if (k < 2 || yB - yT <= 0.25) continue;
    const xs = fillBoundaries(fillInValues(model, li), k, ext.hw);
    for (let j = 1; j < k; j++){
      /* 竖向分界：colA（左）在 −x 侧 → 法向取 (−1, 0) */
      paintEdgeBand(c, edgeCurveV(xs[j], yT, yB, S), S, ciOf(li, j - 1).color, ciOf(li, j).color, { linear: { nx: -1, ny: 0 } });
    }
  }
  /* 过渡带：层间横向分界（上/下两层在中心 x 处的两色之间） */
  for (let li = 1; li < model.L; li++){
    const y = ys[li];
    const pick = (ly) => {
      const k = model.sizes[ly];
      const xs = fillBoundaries(fillInValues(model, ly), k, ext.hw);
      let j = 0;
      while (j < k - 1 && 0 > xs[j + 1]) j++;
      return ciOf(ly, j);
    };
    /* 横向分界：colA（上层）在 −y 侧 → 法向取 (0, −1) */
    paintEdgeBand(c, edgeCurveH(y, -ext.hw, ext.hw, S), S, pick(li - 1).color, pick(li).color, { linear: { nx: 0, ny: -1 } });
  }
}

/* 色块多边形：左边界（上→下）＋下边界（左→右）＋右边界（下→上）＋上边界（右→左）；
   四个角取"两条边界候选点"的中点，保证相邻色块共用同一角点（无缝拼接） */
function cellPolygon(left, right, top, bot){
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const pts = [mid(left[0], top[0])];
  for (let i = 1; i < left.length - 1; i++) pts.push(left[i]);
  pts.push(mid(left[left.length - 1], bot[0]));
  for (let i = 1; i < bot.length - 1; i++) pts.push(bot[i]);
  pts.push(mid(right[right.length - 1], bot[bot.length - 1]));
  for (let i = right.length - 2; i > 0; i--) pts.push(right[i]);
  pts.push(mid(right[0], top[top.length - 1]));
  for (let i = top.length - 2; i > 0; i--) pts.push(top[i]);
  return pts;
}

/* 饼图扇区多边形：径向 A（内→外）＋外环（A→B）＋径向 B（外→内）＋内环（B→A）。
   outerPlain / innerPlain：该环是否"填充外边界"（最外环的外弧、最内环的内弧）——
   它们必须贴合形状，不做波形位移（否则会在轮廓内侧露出空隙）。 */
function sectorPolygon(rayA, rayB, r0, r1, a0, a1, S, aBase, outerPlain, innerPlain){
  const ang = p => Math.atan2(p.y, p.x);
  const unwrap = (a, ref) => {
    let x = a;
    while (x - ref > Math.PI) x -= 2 * Math.PI;
    while (ref - x > Math.PI) x += 2 * Math.PI;
    return x;
  };
  const outerA = unwrap(ang(rayA[rayA.length - 1]), a0);
  const outerB = unwrap(ang(rayB[rayB.length - 1]), a1);
  const innerA = unwrap(ang(rayA[0]), a0);
  const innerB = unwrap(ang(rayB[0]), a1);
  const pts = [];
  rayA.forEach(p => pts.push(p));
  edgeCurveRing(r1, outerA, outerB, S, aBase, outerPlain).forEach(p => pts.push(p));
  for (let i = rayB.length - 1; i >= 0; i--) pts.push(rayB[i]);
  edgeCurveRing(r0, innerB, innerA, S, aBase, innerPlain).forEach(p => pts.push(p));
  return pts;
}

/* 饼图布局：L 个同心环（层1 在最外），每环按角度分扇区；
   层间比例 = 环半径分界（0 → 内层消失，100 → 外层消失，需求 2.3），
   层内比例 = 该环各扇区分界角，方向 = 该层整体旋转（需求 2.3）；
   环分界与径向分界同样按 edgeOffset 位移（需求 2.3 的边界形状对两种布局都生效）。 */
function paintFillPie(c, model, R, paints, S){
  const rs = fillRadii(fillParams['fill.layerRatios'], model.L, R); // [0 … R] 由内到外
  for (let li = 0; li < model.L; li++){
    const k = model.sizes[li];
    const r0 = rs[model.L - 1 - li], r1 = rs[model.L - li];  // 层1 → 最外环
    const base = model.layerFirst[li];
    const rot = (fillParams['fill.angles'][li] || 0) * Math.PI / 180;
    const ths = fillAngles(fillInValues(model, li), k);
    if (r1 - r0 <= 0.25) continue;                            // 该环消失
    const aBase = -Math.PI / 2 + rot;
    /* 径向分界曲线：该层只有 1 个色块时那条半径不是"内部接缝"（整环无分界）→ 走 plain 直边 */
    const rays = ths.map(t => edgeCurveRay(aBase + t, r0, r1, S, k < 2));
    for (let j = 0; j < k; j++){
      const a0 = aBase + ths[j];
      const a1 = aBase + (j + 1 < k ? ths[j + 1] : ths[0] + 2 * Math.PI);
      /* 最外环的外弧 = 填充外边界（不做位移）；最内环的内弧（r0=0，中心的点）同理 */
      const outerPlain = (li === 0), innerPlain = (li === model.L - 1);
      const poly = sectorPolygon(rays[j], rays[(j + 1) % k], r0, r1, a0, a1, S, aBase, outerPlain, innerPlain);
      fillPolygon(c, poly, fillPaintOf(paints[(base + j) % paints.length], c, poly));
    }
    /* 过渡带：环内相邻扇区之间的径向分界（含整环首尾相接的那条）；单色层无内部接缝 → 跳过 */
    for (let j = 0; k >= 2 && j < k; j++){
      const a = aBase + ths[j];
      paintEdgeBand(c, edgeCurveRay(a, r0, r1, S), S,
        paints[(base + (j - 1 + k) % k) % paints.length].color, paints[(base + j) % paints.length].color,
        { linear: { nx: Math.sin(a), ny: -Math.cos(a) } });
    }
  }
  /* 过渡带：层间环分界（相邻两环在基准角处的两色之间）；闭合环 → 径向渐变 */
  for (let li = 1; li < model.L; li++){
    const r = rs[model.L - li];
    if (r <= 0.25) continue;
    const pick = (ly) => {
      const k = model.sizes[ly];
      const ths = fillAngles(fillInValues(model, ly), k);
      let j = 0;
      while (j < k - 1 && 0 > ths[j + 1]) j++;
      const base = model.layerFirst[ly];
      return paints[(base + j) % paints.length].color;
    };
    paintEdgeBand(c, edgeCurveRing(r, -Math.PI / 2, Math.PI * 1.5, S, -Math.PI / 2), S, pick(li - 1), pick(li), { radial: { r } });
  }
}

/* 入口：在已建立"形状裁切"的画布上铺满填充色块（由 bgshape.js 的 drawBgShape 调用）。
   S = 画布边长；pts = 形状轮廓点（画布坐标）；colors = 色块色值（fillColors）。
   V2.28：内部按 fillModes/fillStyles 组装"色块描述符"（纯色 / 渐变 / 图片，需求 3.2），
   图片缺失或渐变参数为空时逐块回退纯色——任何状态下都不会露底 */
function paintFillPattern(c, S, pts, colors){
  if (!pts || pts.length < 3) return;
  const m = syncFillArrays();               // 每次绘制前校准数组（色块数/层数可能刚变化）
  const paints = colors.map((hex, i) => {
    const st = (typeof fillStyles !== 'undefined' && fillStyles[i]) || null;
    const mode = (typeof fillModes !== 'undefined' && fillModes[i]) || '纯';
    return {
      color: hex,
      grad: (mode === '渐' && st && st.grad) ? st.grad : null,
      image: (mode === '图' && st && st.image) ? st.image : null
    };
  });
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
  if (m.pie) paintFillPie(c, m, ext.r, paints, S);
  else paintFillMatrix(c, m, ext, paints, S);
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

/* 填充边界：边界形状 / 过渡样式 芯片（需求 2.3）
   与"布局形式"同样逐片带取值（data-val）；边界形状变化会增减边界参数行 → 重渲染本模块 */
function bindFillParamChips(container){
  [['edgeShape', 'edge.shape'], ['edgeStyle', 'edge.style']].forEach(pair => {
    const box = container.querySelector(`[data-group="${pair[0]}"]`);
    if (!box || box.dataset.bound) return;
    box.dataset.bound = '1';
    box.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const key = pair[1];
      const v = chip.dataset.val || chip.textContent.trim();
      if (!v || v === fillParams[key]) return;
      fillParams[key] = v;
      if (key === 'edge.shape') rerenderModule('fill');     // 参数行随形状增减
      else box.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
      scheduleDrawIcon();
      commitHistory();
      toast((key === 'edge.shape' ? '边界形状：' : '过渡样式：') + v);
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
