/* ============================================================
   KiconCreator V2 · js/canvas.js
   职责：画布渲染引擎（需求 1.1/1.8 + 2.6 + 3.4/3.5/3.6）。
     - 布局几何 layoutCells()：1.2 全部排版模式的单元格切分
     - drawRow()：单行渲染 —— 文本/FA 字形、图片（裁剪窗口 + 白色透明）、
       单色/渐变填充、阴影、大小/角度/拉伸/偏移变换（三模式共用同一变换管线）
     - drawIcon()：背景（形状轮廓或白底/透明，需求 1.8/三.1）→ 按层次顺序逐行绘制
       （行内容可选按形状轮廓裁切，需求 3.5 style.clip）
     - scheduleDrawIcon()：滑块拖动时的 rAF 节流重绘
   版本：V0.06（V2.17：接入背景形状——形状轮廓 + 边框 + 形状阴影，内容按形状裁切）
   暂缓（按任务要求）：填充数量和布局（矩阵/饼图、层数、边界过渡）与内部填充的
        完整参数体系；当前形状内部按"填充色块横向等分"铺色（见 bgshape.js）。
   说明：辅助线/安全边距由 index.html 的 SVG 覆盖层与 #safeBox 承担，
        不画进画布，因此天然不导出（需求 2.34/1.7）。
   ============================================================ */
/* 渲染目标：常规指向主画布；renderSnapshotThumb 会临时切换后恢复 */
let cvs = $('#iconCanvas');
let ctx = cvs.getContext('2d');
const viewerModal = $('#viewerModal');
const modalBody = $('#modalBody');
const viewerCanvas = $('#viewerCanvas');

/* ============================================================
   布局几何：排版模式 → 每行单元格（比例坐标，x/y/w/h ∈ 0~1）
   键名与 content.js 的 LAYOUTS 标签严格一致。
   ============================================================ */
function gridCells(n, cols, rows){
  // cols 列 × rows 行，按行序填充
  const cells = [];
  const cw = 1 / cols, ch = 1 / rows;
  for (let i = 0; i < n; i++){
    const r = Math.floor(i / cols), c = i % cols;
    cells.push({ x: c * cw, y: r * ch, w: cw, h: ch });
  }
  return cells;
}
function ringCells(k, cs){
  // k 个点均布圆环（圆心=画布中心），起点顶部，顺时针
  const cells = [];
  for (let i = 0; i < k; i++){
    const a = (-90 + i * 360 / k) * Math.PI / 180;
    cells.push({ x: 0.5 + 0.27 * Math.cos(a) - cs / 2, y: 0.5 + 0.27 * Math.sin(a) - cs / 2, w: cs, h: cs });
  }
  return cells;
}
function layoutCells(name, n){
  const S = [{ x: 0, y: 0, w: 1, h: 1 }];
  const half = { x: 0, y: 0, w: 0.5, h: 0.5 };
  const cs = 0.3; // 环形/中央单元格边长
  const L = {
    // 1 行
    '上半边':   [{ x: 0, y: 0, w: 1, h: 0.5 }],
    '下半边':   [{ x: 0, y: 0.5, w: 1, h: 0.5 }],
    '左半边':   [{ x: 0, y: 0, w: 0.5, h: 1 }],
    '右半边':   [{ x: 0.5, y: 0, w: 0.5, h: 1 }],
    '居中':     S,
    // 2 行
    '全在上（左右分）': [{ ...half, x: 0, y: 0 }, { ...half, x: 0.5, y: 0 }],
    '全在下（左右分）': [{ ...half, x: 0, y: 0.5 }, { ...half, x: 0.5, y: 0.5 }],
    '全在左（上下分）': [{ ...half, x: 0, y: 0 }, { ...half, x: 0, y: 0.5 }],
    '全在右（上下分）': [{ ...half, x: 0.5, y: 0 }, { ...half, x: 0.5, y: 0.5 }],
    '左右分':   [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }],
    '上下分':   [{ x: 0, y: 0, w: 1, h: 0.5 }, { x: 0, y: 0.5, w: 1, h: 0.5 }],
    // 3 行
    '品字（上1下2）': [{ x: 0.25, y: 0, w: 0.5, h: 0.5 }, { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }],
    '倒品（上2下1）': [{ x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }, { x: 0.25, y: 0.5, w: 0.5, h: 0.5 }],
    // 4 行
    '四宫格':   gridCells(4, 2, 2),
    '纵向121':  [{ x: 0, y: 0, w: 1, h: 1/3 }, { x: 0, y: 1/3, w: 0.5, h: 1/3 }, { x: 0.5, y: 1/3, w: 0.5, h: 1/3 }, { x: 0, y: 2/3, w: 1, h: 1/3 }],
    '横向121':  [{ x: 0, y: 0, w: 1/3, h: 1 }, { x: 1/3, y: 0, w: 1/3, h: 0.5 }, { x: 1/3, y: 0.5, w: 1/3, h: 0.5 }, { x: 2/3, y: 0, w: 1/3, h: 1 }],
    // 5+ 行
    '四宫格+中央': [...gridCells(4, 2, 2), { x: 0.5 - cs / 2, y: 0.5 - cs / 2, w: cs, h: cs }],
    '2×3':      gridCells(6, 3, 2), // 2 行 3 列
    '3×2':      gridCells(6, 2, 3), // 3 行 2 列
    '2×4':      gridCells(8, 4, 2), // 2 行 4 列
    '4×2':      gridCells(8, 2, 4), // 4 行 2 列
    '3×3':      gridCells(9, 3, 3)
  };
  if (L[name]) return L[name];
  if (name === '一字横排') return gridCells(n, n, 1);
  if (name === '一字纵排') return gridCells(n, 1, n);
  if (name === '环形'){ // n-1 个环绕 + 1 个居中
    const cells = ringCells(n - 1, cs);
    cells.push({ x: 0.5 - cs / 2, y: 0.5 - cs / 2, w: cs, h: cs });
    return cells;
  }
  return gridCells(n, 1, n); // 兜底：一字纵排
}

/* ============================================================
   文本绘制
   ============================================================ */
function rowFontFamily(p){
  const en = fontFamilyOf(p['font.en']);
  const cn = fontFamilyOf(p['font.cn']);
  return `${en ? en + ',' : ''}${cn ? cn + ',' : ''}"PingFang SC","Microsoft YaHei","Hiragino Sans GB",sans-serif`;
}

function rowFontPx(text, layout, cell, p, S){
  const ratio = p['font.size'] / 100;
  if (layout === '环形向心'){
    // 圆环直径≈画布宽，字号按环周长与字符数自适应
    const ringR = S * 0.36;
    return Math.min(S * 0.13 * ratio, (2 * Math.PI * ringR / Math.max(text.length, 1)) * 0.82);
  }
  const base = Math.min(cell.w * S, cell.h * S) * 0.62 * ratio;
  if (layout === '纵排'){
    const byHeight = cell.h * S * 0.92 / (Math.max(text.length, 1) * 1.12);
    return Math.min(base, byHeight);
  }
  // 横排：按文本宽度收缩适配（在 drawRowContent 中测量后收缩）
  return base;
}

/* 图片模式（需求 2.8 / 3.4 / 3.6）：按裁剪窗口把图片画进内容盒。
   白色透明开启时改用色度键结果；大小/拉伸/角度/偏移由外层变换统一处理 */
function drawRowImage(r, p, cell, S){
  const entry = imgGet(r.image && r.image.id);
  const w = cell.w * S, h = cell.h * S;
  if (!entry){
    // 未选择图片：虚线占位（编辑期提示用，非最终图形）
    ctx.save();
    ctx.strokeStyle = 'rgba(120,130,150,.45)';
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(120,130,150,.6)';
    ctx.font = `500 ${Math.max(8, Math.round(S * 0.05))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('未选择图片', 0, 0);
    ctx.restore();
    return;
  }
  const src = p['image.whiteTransparent'] ? imgChroma(entry) : entry.bitmap;
  const { sx, sy, sw, sh } = imgCropRect(entry, r.image.crop);
  // 目标盒：按裁切比例在单元格内等比适配（大小% 由外层 scale 承担）
  const aspect = sw / sh;
  let dw = w, dh = w / aspect;
  if (dh > h){ dh = h; dw = h * aspect; }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
}

/* 计算一行内容的绘制指令（在已变换的局部坐标系中，原点=内容中心） */
function drawRowContent(r, p, layout, cell, S){
  if (r.mode === 'image'){ drawRowImage(r, p, cell, S); return; }
  /* 取字形：FA 模式优先用 faName（与文本模式 text 相互独立，切换模式互不覆盖，需求 四.1 例2）；
     faName 为空时回退 text（兼容早期版本把字形写入 text 的数据） */
  const text = r.mode === 'fa'
    ? (r.faName ? faGlyph(r.faName) : (r.text || '★'))
    : (r.text || '');
  if (!text) return;
  /* FA 模式：按图标字族取字体（solid=900 / brands=400），忽略斜体（需求 2.7） */
  const faDef = r.mode === 'fa' && r.faName ? FA_INDEX[r.faName] : null;
  const weight = faDef
    ? (faDef.f === 'brands' ? 400 : 900)
    : (WEIGHT_MAP[p['font.weight']] || 400);
  const italic = faDef ? '' : (p['font.italic'] ? 'italic ' : '');
  const family = faDef
    ? (faDef.f === 'brands' ? '"Font Awesome 6 Brands"' : '"Font Awesome 6 Free"')
    : rowFontFamily(p);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (layout === '环形向心'){
    // 字符沿圆环向心排列（字符顶部朝向圆心），环径≈画布宽
    const ringR = S * 0.36;
    const px = rowFontPx(text, layout, null, p, S);
    ctx.font = `${italic}${weight} ${px}px ${family}`;
    const chars = Array.from(text);
    chars.forEach((ch, i) => {
      const deg = -90 + i * 360 / chars.length;
      const a = deg * Math.PI / 180;
      const x = ringR * Math.cos(a);
      const y = ringR * Math.sin(a);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((deg - 90) * Math.PI / 180); // 向心：字形顶部指向圆心
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
    return;
  }

  const px = rowFontPx(text, layout, cell, p, S);
  ctx.font = `${italic}${weight} ${px}px ${family}`;
  // 横排：文本超宽时按比例收缩字号适配单元格
  if (layout !== '纵排'){
    const w = ctx.measureText(text).width;
    const maxW = cell.w * S * 0.98;
    if (w > maxW && w > 0){
      ctx.font = `${italic}${weight} ${px * maxW / w}px ${family}`;
    }
  }

  if (layout === '纵排'){
    const chars = Array.from(text);
    const lh = px * 1.12;
    const total = chars.length * lh;
    chars.forEach((ch, i) => ctx.fillText(ch, 0, -total / 2 + lh * (i + 0.5)));
  } else {
    ctx.fillText(text, 0, 0);
  }
}

/* 单行渲染：单元格 → 偏移 → 旋转 → 拉伸/大小 → 颜色/阴影 → 内容
   三种内容模式共用同一条变换管线（需求 3.5：尺寸类参数各模式同一批） */
function drawRow(r, cell, S){
  const p = r.params;
  const layout = p['font.layout'];

  // 环形向心：以画布中心为环心（需求 2.6），忽略单元格位置
  const isRing = layout === '环形向心';
  const cx = (isRing ? 0.5 : cell.x + cell.w / 2) * S;
  const cy = (isRing ? 0.5 : cell.y + cell.h / 2) * S;

  ctx.save();
  /* 显示超出形状范围的内容（需求 3.5）：关闭时先按形状轮廓裁切，
     再进入内容变换 —— 裁切路径在画布坐标系建立，随后的 translate/rotate/scale
     不会影响已建立的裁切区域 */
  if (!p['style.clip']) bgShapeClip(S);
  // 偏移（画布坐标系，先于旋转 —— 3.5 偏移为画布方向）
  ctx.translate(cx + p['style.offsetX'] / 100 * S, cy + p['style.offsetY'] / 100 * S);
  // 角度：绕内容中心旋转（3.5）
  ctx.rotate(p['style.angle'] * Math.PI / 180);
  // 大小 + 拉伸（拉伸作用于内容坐标系）
  ctx.scale(p['style.scaleX'] / 100 * p['style.size'] / 100, p['style.scaleY'] / 100 * p['style.size'] / 100);

  // 阴影（3.6，公式见 schema.js）
  if (p['shadow.enabled']){
    ctx.shadowColor = p['shadow.color'];
    ctx.shadowBlur = shadowBlurPx(p, S);
    ctx.shadowOffsetX = shadowOffsetPx(p['shadow.x'], S);
    ctx.shadowOffsetY = shadowOffsetPx(p['shadow.y'], S);
  }

  // 颜色（3.4）：单色 / 渐变（内容局部坐标，自上而下 c1→c2）
  if (p['color.mode'] === '渐变'){
    const half = Math.max(cell.h * S, S * 0.2) / 2;
    const g = ctx.createLinearGradient(0, -half, 0, half);
    g.addColorStop(0, p['color.c1']);
    g.addColorStop(1, p['color.c2']);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = p['color.c1'];
  }

  drawRowContent(r, p, layout, cell, S);
  ctx.restore();
}

/* ============================================================
   缩略图渲染：用任意快照在任意画布上画真实样式
   （需求 2.1 "预设应按真实样式显示" / 2.2 "根据数据 json 绘制预览图"）
   做法：临时切换渲染目标与业务状态 → 复用 drawIcon → 恢复。
   全部同步执行，无异步穿插，因此不会污染主画布与当前状态。
   ============================================================ */
function renderSnapshotThumb(snap, canvas, size){
  if (!snap || !canvas) return;
  const S = Math.max(16, Math.min(64, size || 48));
  const bak = { cvs, ctx, iconSize, rows, rowCount, activeRow, currentLayout, layerOrder, bgParams, fillCount, fillColors };
  const tc = $('#transparentChk');
  const bakTc = tc ? tc.checked : false;
  try {
    cvs = canvas;
    ctx = canvas.getContext('2d');
    canvas.width = S;
    canvas.height = S;
    iconSize = S;
    rows = (snap.rows || []).map(normalizeRow);
    rowCount = Math.max(1, Math.min(9, snap.rowCount || 1));
    activeRow = 0;
    currentLayout = snap.currentLayout || '全在上（左右分）';
    layerOrder = snap.layerOrder || '1to9';
    bgParams = normalizeBgParams(snap.bg);              // 形状与外框随预设真实呈现（需求 2.1）
    fillCount = Math.max(1, Math.min(6, snap.fillCount || fillCount));
    fillColors = (snap.fills || []).map(f => f && f.color).filter(Boolean).concat(fillColors).slice(0, 6);
    if (tc) tc.checked = !!snap.transparent;
    drawIcon();
  } catch (e){
    // 快照异常时留空即可，不影响主界面
  } finally {
    if (tc) tc.checked = bakTc;
    cvs = bak.cvs;
    ctx = bak.ctx;
    iconSize = bak.iconSize;
    rows = bak.rows;
    rowCount = bak.rowCount;
    activeRow = bak.activeRow;
    currentLayout = bak.currentLayout;
    layerOrder = bak.layerOrder;
    bgParams = bak.bgParams;
    fillCount = bak.fillCount;
    fillColors = bak.fillColors;
  }
}

/* ============================================================
   顶层绘制：背景（1.8 白底/透明）→ 层次顺序逐行绘制
   ============================================================ */
let drawRAF = null;
function scheduleDrawIcon(){
  if (drawRAF) return;
  drawRAF = requestAnimationFrame(() => { drawRAF = null; drawIcon(); });
}

function drawIcon(){
  const S = iconSize;
  if (cvs.width !== S){ cvs.width = S; cvs.height = S; }
  ctx.clearRect(0, 0, S, S);
  /* 背景（需求 1.8 / 三.1）：形状非无 → 形状轮廓（含边框与形状阴影），
     形状之外的区域透明（形状本身即背景，圆角/圆形才不会被白底补成方块）；
     形状为无 → 勾选透明则透明，否则白底 */
  if (!drawBgShape(S)){
    const transparent = $('#transparentChk')?.checked || false;
    if (!transparent){
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, S, S);
    }
  }
  // 布局单元格 + 层次顺序（1.3）
  const cells = layoutCells(currentLayout, rowCount);
  const n = Math.min(rowCount, cells.length);
  const order = [];
  if (layerOrder === '1to9'){ for (let i = n - 1; i >= 0; i--) order.push(i); }
  else { for (let i = 0; i < n; i++) order.push(i); }
  order.forEach(i => {
    if (rows[i]) drawRow(rows[i], cells[i], S);
  });
  // 同步 1:1 模态预览画布
  if (viewerCanvas){
    viewerCanvas.width = S; viewerCanvas.height = S;
    viewerCanvas.getContext('2d').drawImage(cvs, 0, 0);
  }
}
