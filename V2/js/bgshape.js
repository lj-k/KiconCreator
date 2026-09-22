/* ============================================================
   KiconCreator V2 · js/bgshape.js
   职责：背景形状（外框）几何引擎与绘制（需求 三.1 形状和外框）。
     - shapeKindInfo：形状种类解析（无 / 圆形 / 圆角方形 / 正n边形 / n角星）
     - shapeUnitPoints：单位形状采样点——含"弧度"向圆形的过渡、
       角星"内角"换算（内角 0° → 无点集，形状消失）
     - shapeOutline：尺寸 / 拉伸 / 方向 变换到画布坐标
       （尺寸按"外接框长边 = 尺寸% × 画布边长"，默认 100% 即长边等于画布）
     - bgShapePath / shapeBounds：轮廓路径与包围盒（内容裁切、内部填充共用）
     - drawBgShape：绘制栈 = 形状阴影 → 边框（只向形状外延伸）→ 内部填充
     - shapeFillSize："填满绘图区域"求解（含拉伸与方向）
   版本：V0.02（V2.18：新增 resetBgParams 供模块/标签页重置按钮共用）
   依赖：schema.js（BG_PARAM_DEFS/normalizeBgParams）、state.js（bgParams/fillColors/fillCount）、
        canvas.js（ctx/iconSize——运行时读取）。
   约束：所有形状都必须是"对中心可见的星形域"（任意方向从中心出发只与轮廓相交一次），
        这样轮廓天然封闭连续、边线不交叠（需求 1.1.3），极点采样与 clip 裁切才可靠。
        新增形状种类必须保持该性质。
   ============================================================ */

/* ---------- 形状种类（与 panes.js 的 chip 取值严格一致） ---------- */
const SHAPE_NONE = '无';
const SHAPE_BASE_KINDS = ['无', '圆形', '圆角方形'];
const SHAPE_POLY_N = [3, 4, 5, 6, 7, 8];
const SHAPE_POLY_KINDS = SHAPE_POLY_N.map(n => `正${n}边形`);
const SHAPE_STAR_KINDS = SHAPE_POLY_N.map(n => `${n}角星`);

function shapeKindInfo(kind){
  const k = kind || SHAPE_NONE;
  if (k === '无') return { type: 'none', n: 0 };
  if (k === '圆形') return { type: 'circle', n: 0 };
  if (k === '圆角方形') return { type: 'roundRect', n: 4 };
  let m = /^正(\d)边形$/.exec(k);
  if (m) return { type: 'poly', n: +m[1] };
  m = /^(\d)角星$/.exec(k);
  if (m) return { type: 'star', n: +m[1] };
  return { type: 'none', n: 0 };
}

/* 形状标签标题：形状非"无"时显示形状名（需求 五） */
function shapeTabLabel(){
  const k = bgParams['shape.kind'] || SHAPE_NONE;
  return k === SHAPE_NONE ? '形状' : k;
}

/* 背景参数重置（需求 五：模块及各标签的重置按钮共用）：
   prefix 省略 = 重置模块下三个标签的全部参数；传 'shape.' = 只重置形状标签页的参数。
   只动注册表里登记过的键，默认值一律取自 BG_PARAM_DEFS（避免各处硬编码默认值）。 */
function resetBgParams(prefix){
  Object.keys(BG_PARAM_DEFS).forEach(k => {
    if (!prefix || k.indexOf(prefix) === 0) bgParams[k] = BG_PARAM_DEFS[k].def;
  });
}

/* 角星内角上限：180° − 360°/n。
   该值时内顶点恰好落在正 n 边形的边中点上 → 角星退化为正 n 边形，形状仍闭合且不自交；
   再放大内角会让内顶点凸出到外接圆之外（轮廓不再贴合边形），因此以此为上界。
   n=3 → 60°（与默认值相同，即 3 角星的内角上限即"变回三角形"）… n=8 → 135° */
function shapeInnerMax(n){ return n > 2 ? Math.floor(180 - 360 / n) : 60; }

/* ---------- 单位形状采样 ---------- */
/* 射线（极角 th）与多边形边的交点半径；不在任何边上 → null */
function shapeRadiusAt(verts, th){
  const dx = Math.cos(th), dy = Math.sin(th);
  for (let i = 0; i < verts.length; i++){
    const A = verts[i], B = verts[(i + 1) % verts.length];
    const Ex = B.x - A.x, Ey = B.y - A.y;
    const den = dx * Ey - dy * Ex;
    if (Math.abs(den) < 1e-9) continue;
    const r = (A.x * Ey - A.y * Ex) / den;
    const t = (A.x * dy - A.y * dx) / den;
    if (r > 0 && t >= -1e-6 && t <= 1 + 1e-6) return r;
  }
  return null;
}
function shapeSampleByAngle(verts, count, circleR, roundT){
  const pts = [];
  for (let i = 0; i < count; i++){
    const th = i * 2 * Math.PI / count;
    const rb = shapeRadiusAt(verts, th);
    if (!rb) continue;
    // 弧度：原始形状（0%）与圆（100%）之间按极角线性过渡
    const r = rb * (1 - roundT) + (circleR || rb) * roundT;
    pts.push({ x: r * Math.cos(th), y: r * Math.sin(th) });
  }
  return pts;
}
/* 圆角方形：半边长 1，圆角半径 = 弧度% × 半边长（100% 即圆形） */
function shapeRoundRectPoints(roundT){
  const r = Math.max(0, Math.min(1, roundT));
  if (r <= 0) return [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }];
  const seg = Math.max(4, Math.round(20 * r));  // 每角采样段数
  const pts = [];
  const corners = [
    { cx: 1 - r, cy: -1 + r, a0: -Math.PI / 2 },  // 右上
    { cx: 1 - r, cy: 1 - r,  a0: 0 },             // 右下
    { cx: -1 + r, cy: 1 - r, a0: Math.PI / 2 },   // 左下
    { cx: -1 + r, cy: -1 + r, a0: Math.PI }       // 左上
  ];
  corners.forEach(c => {
    for (let i = 0; i <= seg; i++){
      const a = c.a0 + (Math.PI / 2) * (i / seg);
      pts.push({ x: c.cx + r * Math.cos(a), y: c.cy + r * Math.sin(a) });
    }
  });
  return pts;
}
/* 单位形状点集（外接半径 1 / 半边长 1），对中心可见的星形域 */
function shapeUnitPoints(cfg){
  const info = shapeKindInfo(cfg['shape.kind']);
  const roundT = Math.max(0, Math.min(1, (+cfg['shape.round'] || 0) / 100));
  if (info.type === 'none') return [];
  if (info.type === 'circle'){
    const pts = [];
    for (let i = 0; i < 96; i++){
      const a = i * 2 * Math.PI / 96;
      pts.push({ x: Math.cos(a), y: Math.sin(a) });
    }
    return pts;
  }
  if (info.type === 'roundRect') return shapeRoundRectPoints(roundT);

  const n = info.n;
  const base = Math.PI / 2 + Math.PI / n;  // 方向 0° 时最下面的边水平（需求 1.1.2）
  let verts = [], circleR = 1;
  if (info.type === 'poly'){
    for (let k = 0; k < n; k++){
      const a = base + k * 2 * Math.PI / n;
      verts.push({ x: Math.cos(a), y: Math.sin(a) });
    }
    circleR = Math.cos(Math.PI / n);       // 内切圆半径：弧度 100% 时退化为圆形（需求 1.1.1）
  } else {
    const A = (+cfg['shape.inner'] || 0) * Math.PI / 180;
    if (A <= 1e-4) return [];              // 内角 0° → 形状不可见（需求 1.1.1）
    const Aa = Math.min(A, shapeInnerMax(n) * Math.PI / 180);
    const t = Math.tan(Aa / 2);
    // 尖角半角 = 内角/2 时，内顶点半径 r = tan(A/2) / (sin(π/n) + tan(A/2)·cos(π/n))
    const rIn = t / (Math.sin(Math.PI / n) + t * Math.cos(Math.PI / n));
    for (let k = 0; k < n; k++){
      const a1 = base + k * 2 * Math.PI / n;
      const a2 = a1 + Math.PI / n;
      verts.push({ x: Math.cos(a1), y: Math.sin(a1) });
      verts.push({ x: rIn * Math.cos(a2), y: rIn * Math.sin(a2) });
    }
    circleR = (1 + rIn) / 2;
  }
  return shapeSampleByAngle(verts, Math.max(144, n * 32), circleR, roundT);
}

/* ---------- 轮廓变换（尺寸 / 拉伸 / 方向 → 画布坐标） ---------- */
function shapeBoundsOfPoints(pts){
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  pts.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });
  return { minX, maxX, minY, maxY };
}
function shapeOutline(cfg, S){
  const pts = shapeUnitPoints(cfg);
  if (pts.length < 3) return null;         // 形状为无 / 内角 0° → 无轮廓
  const b = shapeBoundsOfPoints(pts);
  const bw = Math.max(1e-6, b.maxX - b.minX), bh = Math.max(1e-6, b.maxY - b.minY);
  const size = Math.max(1, +cfg['shape.size'] || 100);
  const k = (size / 100) * S / Math.max(bw, bh);   // 长边 = 尺寸% × 画布边长
  const sx = k * (Math.max(1, +cfg['shape.stretchX'] || 100) / 100);
  const sy = k * (Math.max(1, +cfg['shape.stretchY'] || 100) / 100);
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;  // 以包围盒中心对齐画布中心
  const a = (+cfg['shape.angle'] || 0) * Math.PI / 180;
  const ca = Math.cos(a), sa = Math.sin(a), c = S / 2;
  const out = new Array(pts.length);
  for (let i = 0; i < pts.length; i++){
    const x = (pts[i].x - cx) * sx, y = (pts[i].y - cy) * sy;
    out[i] = { x: c + x * ca - y * sa, y: c + x * sa + y * ca };
  }
  return out;
}
function shapeBounds(cfg, S){
  const pts = shapeOutline(cfg, S);
  return pts ? shapeBoundsOfPoints(pts) : null;
}
/* 轮廓路径：返回 true 表示路径已就绪（可 stroke/fill/clip） */
function bgShapePath(c, S, cfg){
  const pts = shapeOutline(cfg || bgParams, S);
  if (!pts) return false;
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();
  return true;
}
/* 内容按形状裁切（需求 3.5：关闭"显示超出形状范围的内容"时调用） */
function bgShapeClip(S){
  if (!bgShapePath(ctx, S, bgParams)) return false;
  ctx.clip();
  return true;
}

/* ---------- 绘制（画布坐标；由 canvas.js 的 drawIcon 调用） ---------- */
/* 边框宽度以 256 画布为基准等比缩放，保证预览与各导出尺寸观感一致 */
function bgBorderPx(cfg, S){ return Math.max(0, +cfg['border.width'] || 0) * S / 256; }
function bgShadowStyle(cfg, S){
  return {
    color: cfg['shapeShadow.color'],
    blur: ((+cfg['shapeShadow.blur'] || 0) + (+cfg['shapeShadow.size'] || 0) * 0.6) / 100 * S * 0.25,
    x: (+cfg['shapeShadow.x'] || 0) / 100 * S * 0.2,
    y: (+cfg['shapeShadow.y'] || 0) / 100 * S * 0.2
  };
}
function bgFillColorAt(i){
  return fillColors[i] || fillColors[0];
}
function drawBgShape(S){
  const cfg = (typeof bgParams !== 'undefined' && bgParams) ? bgParams : null;
  if (!cfg) return false;
  const pts = shapeOutline(cfg, S);
  if (!pts) return false;                   // 形状为无 / 内角 0° → 交给白底或透明背景（需求 1.8）
  const borderOn = !!cfg['border.enabled'] && (+cfg['border.width'] || 0) > 0;
  const shadowOn = !!cfg['shapeShadow.enabled'];
  const sh = shadowOn ? bgShadowStyle(cfg, S) : null;
  const putShadow = () => {
    if (!sh) return;
    ctx.shadowColor = sh.color;
    ctx.shadowBlur = sh.blur;
    ctx.shadowOffsetX = sh.x;
    ctx.shadowOffsetY = sh.y;
  };

  /* 1) 阴影投影：与边框一起投影轮廓；无边框时以轮廓本身投影
        （先投影、后填充，避免"多色分块填充 + 裁切"重复叠加阴影） */
  ctx.save();
  if (borderOn){
    putShadow();
    bgShapePath(ctx, S, cfg);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, 2 * bgBorderPx(cfg, S)); // 2×宽度：内半被随后的填充盖住 → 只向外延伸（需求 1.2）
    ctx.strokeStyle = cfg['border.color'];
    ctx.stroke();
  } else if (shadowOn){
    putShadow();
    bgShapePath(ctx, S, cfg);
    ctx.fillStyle = bgFillColorAt(0);
    ctx.fill();
  }
  ctx.restore();

  /* 2) 内部填充：整个形状铺满填充色块；单色 = 色块1，多色 = 横向等分
        （层数 = 1 的矩阵布局默认形态；完整布局/边界/过渡见"填充"模块） */
  ctx.save();
  bgShapePath(ctx, S, cfg);
  ctx.clip();
  const box = shapeBoundsOfPoints(pts);
  const n = Math.max(1, Math.min(6, fillCount || 1));
  const cw = (box.maxX - box.minX) / n;
  for (let i = 0; i < n; i++){
    ctx.fillStyle = bgFillColorAt(i);
    ctx.fillRect(box.minX + i * cw - 0.5, box.minY - 0.5, cw + 1, (box.maxY - box.minY) + 1);
  }
  ctx.restore();
  return true;
}

/* ---------- "填满绘图区域"（需求 1.1.2） ----------
   判据：把形状外接框撑到绘图区域（长边对齐画布），拉伸与方向按当前值参与计算；
   只放大不缩小（k ≥ 1），因此不会出现"点了填满反而变小"。
   例：圆形/正边形 100% 即长边等于画布；旋转 45° 的方形维持 100%；
   正3边形需放大到约 116%，让外接框恰好盖住画布。
   注意：不采用"必须盖住画布四角"的判据——尖角星形与三角形要盖满四角需远超滑块上限
   （正3边形约 315%），既不可达也不符合"尺寸默认使长边等于画布"的既定语义。 */
function shapeFillSize(cfg, S){
  const probe = Object.assign({}, cfg, { 'shape.size': 100 });
  const pts = shapeOutline(probe, S);
  if (!pts) return 100;
  const b = shapeBoundsOfPoints(pts);
  const k = Math.max(1, S / Math.max(1e-6, b.maxX - b.minX), S / Math.max(1e-6, b.maxY - b.minY));
  return Math.max(1, Math.min(300, Math.ceil(100 * k - 1e-6)));  // 向上取整并留浮点余量，确保不差一个像素
}