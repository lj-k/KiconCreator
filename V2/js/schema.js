/* ============================================================
   KiconCreator V2 · js/schema.js
   职责：参数注册表（JSON Schema 的 JS 形态）与行状态工厂。
     - PARAM_DEFS：所有可渲染参数的 键/显示名/范围/默认值/单位
       （键使用 "域.参数" 形式，避免同名参数互相污染，
        如 style.size 与 shadow.size）
     - 字体注册表 FONT_DEFS：web 字体优先、系统字体回退，
       web:false 或 unavailable 的字体在下拉框标注（未下载）
     - makeRow(text)：构造带完整参数与联动标记的行对象
   版本：V0.09（V2.25：FILL_PARAM_DEFS 新增 edge.frame——边界形状是否包含形状外框，默认 false）
        V0.08（V2.24：FILL_PARAM_DEFS 新增填充边界参数 edge.width/shape/A/W/phi/k/tooth/style）
        V0.07（V2.23：默认形状改为"圆角方形 + 弧度 30"（用户指定））
        V0.06（V2.22：新增填充布局参数表 FILL_PARAM_DEFS 与 makeFillParams/normalizeFillParams；
        背景参数（BG_PARAM_DEFS，V2.17 起）与填充布局参数同为"全局唯一"，键前缀分别
        shape./border./shapeShadow. 与 fill.，与行参数键互不冲突）
   约束：本文件必须先于 state.js 加载（state.js 在顶层调用 makeRow）。
        新增可渲染参数：在 PARAM_DEFS 注册 → panes.js 加 UI →
        canvas.js 渲染读取 → history.js 快照自动覆盖（rows 深拷贝）。
   ============================================================ */

/* ---------- 样式·尺寸参数（需求 3.5） ---------- */
const STYLE_KEYS = [
  'style.size',      // 大小 1~300%
  'style.angle',     // 角度 0~360°，绕内容中心旋转
  'style.scaleX',    // 水平拉伸 1~300%
  'style.scaleY',    // 垂直拉伸 1~300%
  'style.offsetX',   // 横向偏移 -100~100%（+100 = 右边超出左画布）
  'style.offsetY',   // 纵向偏移 -100~100%
  'style.clip'       // 显示超出形状范围的内容（形状暂缓，当前仅存储）
];

/* ---------- 颜色参数（需求 3.4） ---------- */
const COLOR_KEYS = [
  'color.mode',      // 单色 | 渐变
  'color.c1',        // 颜色 1（单色即文本色）
  'color.c2'         // 颜色 2（渐变止色）
];

/* ---------- 阴影参数（需求 3.6） ---------- */
const SHADOW_KEYS = [
  'shadow.enabled',  // 启用（布尔联动支持）
  'shadow.color',    // 颜色
  'shadow.size',     // 大小 0~100（扩散感）
  'shadow.blur',     // 模糊 0~100
  'shadow.x',        // X 偏移 -100~100
  'shadow.y'         // Y 偏移 -100~100
];

/* ---------- 图片模式参数（需求 3.4：每个图片模式的行独立开关） ---------- */
const IMAGE_KEYS = [
  'image.whiteTransparent' // 设置图片中的白色为透明
];

/* ---------- 文本字体参数（需求 2.6） ---------- */
const FONT_KEYS = [
  'font.cn',         // 中文字体
  'font.en',         // 英文字体
  'font.weight',     // 粗细
  'font.italic',     // 斜体
  'font.layout',     // 排版：横排 | 纵排 | 环形向心
  'font.size'        // 字号 1~300%
];

/* ---------- 参数定义表 ----------
   min/max 同时用于滑块与输入框校验（flashInvalid 回退最近合法值） */
const PARAM_DEFS = {
  'style.size':     { label: '大小',     min: 1,    max: 300,  def: 100,   unit: '%' },
  'style.angle':    { label: '角度',     min: 0,    max: 360,  def: 0,     unit: '°' },
  'style.scaleX':   { label: '水平拉伸', min: 1,    max: 300,  def: 100,   unit: '%' },
  'style.scaleY':   { label: '垂直拉伸', min: 1,    max: 300,  def: 100,   unit: '%' },
  'style.offsetX':  { label: '横向偏移', min: -100, max: 100,  def: 0,     unit: '%' },
  'style.offsetY':  { label: '纵向偏移', min: -100, max: 100,  def: 0,     unit: '%' },
  'style.clip':     { label: '显示超出形状范围的内容', type: 'bool', def: true },

  'color.mode':     { label: '颜色模式', type: 'select', options: ['单色', '渐变'], def: '单色' },
  'color.c1':       { label: '颜色 1',   type: 'color',  def: '#6C8CFF' },
  'color.c2':       { label: '颜色 2',   type: 'color',  def: '#22D3EE' },

  'image.whiteTransparent': { label: '白色作为透明色', type: 'bool', def: false },

  'shadow.enabled': { label: '启用阴影', type: 'bool', def: false },
  'shadow.color':   { label: '颜色',     type: 'color', def: '#1D2333' },
  'shadow.size':    { label: '大小',     min: 0,   max: 100, def: 12, unit: '' },
  'shadow.blur':    { label: '模糊',     min: 0,   max: 100, def: 10, unit: '' },
  'shadow.x':       { label: 'X 偏移',   min: -100, max: 100, def: 0, unit: '' },
  'shadow.y':       { label: 'Y 偏移',   min: -100, max: 100, def: 4, unit: '' },

  'font.cn':        { label: '中文字体', type: 'select', def: '系统默认（黑体）' },
  'font.en':        { label: '英文字体', type: 'select', def: '系统默认' },
  'font.weight':    { label: '粗细',     type: 'select', options: ['细', '常规', '中粗', '粗', '特粗'], def: '常规' },
  'font.italic':    { label: '斜体',     type: 'bool', def: false },
  'font.layout':    { label: '排版',     type: 'select', options: ['横排', '纵排', '环形向心'], def: '横排' },
  'font.size':      { label: '字号',     min: 1, max: 300, def: 100, unit: '%' }
};

/* ---------- 字体注册表 ----------
   family: canvas font-family 片段；web: 需在线加载（index.html 已引 Google Fonts）；
   未接入 webfont 的字体 family=null（回退系统字体），UI 标注（未下载） */
const FONT_CN_OPTIONS = [
  { name: '系统默认（黑体）', family: null },
  { name: '思源黑体', family: '"Noto Sans SC"', web: true },
  { name: '思源宋体', family: '"Noto Serif SC"', web: true },
  { name: '站酷高端黑', family: '"ZCOOL QingKe HuangYou"', web: true },
  { name: '阿里巴巴普惠体（未下载）', family: null }
];
const FONT_EN_OPTIONS = [
  { name: '系统默认', family: null },
  { name: 'Inter', family: '"Inter"', web: true },
  { name: 'Roboto', family: '"Roboto"', web: true },
  { name: 'Montserrat', family: '"Montserrat"', web: true },
  { name: 'Poppins（未下载）', family: null }
];
const WEIGHT_MAP = { '细': 300, '常规': 400, '中粗': 600, '粗': 700, '特粗': 900 };

/* 按字体名查 family（未注册 → null，回退系统字体） */
function fontFamilyOf(name){
  const hit = FONT_CN_OPTIONS.concat(FONT_EN_OPTIONS).find(f => f.name === name);
  return hit ? hit.family : null;
}

/* ---------- 行工厂 ----------
   所有参数（不分模式）都写入行对象，保证 3.3
   "切换模式保留数据、行增减不必重置"。link 为逐行联动标记（3.7）
   faName：FA 模式选中的图标名（与文本模式的 text 相互独立，切换模式互不覆盖）
   数据保留（需求 四.1）：每行的 文本 / FA图标 / 各模式参数 / 联动标记 全部
   常驻行对象；行数变化只影响可见行数量，不触碰任何行数据。 */
function makeRow(text, mode = 'text'){
  const params = {};
  Object.keys(PARAM_DEFS).forEach(k => { params[k] = PARAM_DEFS[k].def; });
  const link = {};
  Object.keys(PARAM_DEFS).forEach(k => { link[k] = false; });
  return { mode, text: text || '', faName: null, image: makeImageState(), params, link };
}

/* 图片模式的行数据（需求 2.8/3.6）：只存图片仓库 id 与裁剪参数，
   不存图片数据本身（满足需求 六.1"只保存一份资源、各处只引用"）。
   切换行/模式不解除引用、裁剪参数随行保留（需求 四.1） */
function makeImageState(o){
  o = o || {};
  const c = o.crop || {};
  return {
    id: o.id || null,
    name: o.name || '',
    w: o.w || 0,
    h: o.h || 0,
    crop: {
      /* 默认"原图"=不裁切。注意不要默认成 1:1——那会让非方形图在
         未做任何剪裁操作时被静默裁成方形（外部预设缺 crop 字段时尤其明显） */
      aspect: c.aspect || '原图',  // 原图 / 1:1 / 4:3 / 16:9 / 3:4
      zoom: +c.zoom || 1,          // 1~8
      ox: +c.ox || 0,              // -1~1 水平拖动
      oy: +c.oy || 0               // -1~1 垂直拖动
    }
  };
}

/* 补齐缺失参数键（旧版本快照 / 外部导入的预设）：
   只补默认值，绝不覆盖已有值——保证"保留优先"（需求 四.1） */
function normalizeRowParams(params){
  const out = (params && typeof params === 'object') ? params : {};
  Object.keys(PARAM_DEFS).forEach(k => { if (out[k] === undefined) out[k] = PARAM_DEFS[k].def; });
  return out;
}

/* 补齐缺失的联动标记键（缺键按"未联动"处理） */
function normalizeRowLink(link){
  const out = (link && typeof link === 'object') ? link : {};
  Object.keys(PARAM_DEFS).forEach(k => { if (out[k] === undefined) out[k] = false; });
  return out;
}

/* 行对象规范化：深拷贝 + 补齐键。快照、恢复、预设导入共用同一入口，
   保证任何来源的行数据都不缺键，也不丢失任何已存数据（需求 四.1） */
function normalizeRow(r){
  r = r || {};
  return {
    mode: r.mode || 'text',
    text: r.text || '',
    faName: r.faName || null,
    image: makeImageState(r.image),
    params: normalizeRowParams(r.params),
    link: normalizeRowLink(r.link)
  };
}

/* 阴影换算公式（schema 统一定义，渲染与文档共用）：
   blurPx = (blur + size×0.6) / 100 × S × 0.25
   offsetPx = val / 100 × S × 0.2 */
function shadowBlurPx(p, S){ return (p['shadow.blur'] + p['shadow.size'] * 0.6) / 100 * S * 0.25; }
function shadowOffsetPx(v, S){ return v / 100 * S * 0.2; }

/* ---------- 形状与外框参数（背景栏，需求 三.1） ----------
   背景参数是"全局唯一"的（不按行、不按模式），因此单独成表：
   键前缀 shape./border./shapeShadow. 与行参数键互不冲突；
   统一由 state.js 的 bgParams（扁平对象）持有，随快照整体保存。
   shape.kind 取值：无 | 圆形 | 圆角方形 | 正3边形…正8边形 | 3角星…8角星 */
const BG_PARAM_DEFS = {
  'shape.kind':     { label: '形状',     type: 'select', def: '圆角方形' },   // V2.23：默认即为圆角方形（用户指定）
  'shape.size':     { label: '尺寸',     min: 1,   max: 300, def: 100, unit: '%' },
  'shape.stretchX': { label: '水平拉伸', min: 1,   max: 300, def: 100, unit: '%' },
  'shape.stretchY': { label: '垂直拉伸', min: 1,   max: 300, def: 100, unit: '%' },
  'shape.angle':    { label: '方向',     min: 0,   max: 360, def: 0,   unit: '°' },
  'shape.round':    { label: '弧度',     min: 0,   max: 100, def: 30,  unit: '%' }, // V2.23：默认 30（用户指定）
  'shape.inner':    { label: '内角',     min: 0,   max: 135, def: 60,  unit: '°' }, // 上限按角星数动态：180 − 360/n

  'border.enabled': { label: '启用边框', type: 'bool',  def: true },
  'border.width':   { label: '边框宽度', min: 0,   max: 100, def: 6,     unit: 'px' },
  'border.color':   { label: '颜色',     type: 'color', def: '#FFFFFF' },

  'shapeShadow.enabled': { label: '启用形状阴影', type: 'bool',  def: false },
  'shapeShadow.color':   { label: '颜色',       type: 'color', def: '#1D2333' },
  'shapeShadow.size':    { label: '大小',       min: 0,   max: 100, def: 16, unit: '' },
  'shapeShadow.blur':    { label: '模糊',       min: 0,   max: 100, def: 14, unit: '' },
  'shapeShadow.x':       { label: 'X 偏移',     min: -100, max: 100, def: 0,  unit: '' },
  'shapeShadow.y':       { label: 'Y 偏移',     min: -100, max: 100, def: 8,  unit: '' }
};

/* ---------- 填充数量与布局参数（背景栏 需求 三.2） ----------
   与形状参数同样"全局唯一"：键前缀 fill.，统一由 state.js 的 fillParams 持有。
   除下表的标量参数外，还有三组"多分界线"数组参数（长度随层数/色块数变化，
   由 fillLayout.js 的 syncFillArrays 维护、multiSlider 组件读写）：
     fill.layerRatios  层间比例（%）：长度 = 层数−1，升序
     fill.inRatios     层内比例（%）：矩阵=每层色块数−1；饼图=每层色块数（升序）
     fill.angles       每层方向（°）：饼图且层数≥2 时长度=层数，否则 1 */
const FILL_PARAM_DEFS = {
  'fill.layout':   { label: '布局形式', type: 'select', def: '矩阵布局' },
  'fill.layers':   { label: '层数',     min: 1,   max: 6,   def: 1 },
  'fill.offsetX':  { label: 'X 偏移',   min: -100, max: 100, def: 0,   unit: '%' },
  'fill.offsetY':  { label: 'Y 偏移',   min: -100, max: 100, def: 0,   unit: '%' },
  'fill.stretchX': { label: 'X 拉伸',   min: 1,   max: 300, def: 100, unit: '%' },
  'fill.stretchY': { label: 'Y 拉伸',   min: 1,   max: 300, def: 100, unit: '%' },

  /* 填充边界（需求 2.3 标签"填充边界"）：过渡带宽 + 边界形状 + 形状函数的四个边界参数
     范围为"函数安全范围"（需求 2.3：防止除零/无穷大，渲染再做 10× 画布截断）：
       A 振幅/高度 0~50%（画布边长的百分比）
       ω sin/tan = 横跨画布的完整周期数（0.1~10，步进 0.1）；锯齿 = 齿宽（1~100%）
       φ 相位 −180~180°；k 垂直偏移 −50~50% */
  'edge.width':    { label: '过渡宽度', min: 0,   max: 100, def: 0,    unit: '%' },
  'edge.shape':    { label: '边界形状', type: 'select', def: '直线' },
  'edge.A':        { label: 'A',        min: 0,   max: 50,  def: 10,   unit: '%' },
  'edge.W':        { label: 'ω',        min: 0.1, max: 10,  def: 2,    unit: '', step: 0.1 },
  'edge.phi':      { label: 'φ',        min: -180, max: 180, def: 0,   unit: '°' },
  'edge.k':        { label: 'k',        min: -50, max: 50,  def: 0,    unit: '%' },
  'edge.tooth':    { label: 'ω',        min: 1,   max: 100, def: 12,   unit: '%' },  // 锯齿专用：齿宽
  'edge.frame':    { label: '包含形状外框', type: 'bool', def: false },   // V2.25：默认只调节内部填充之间的边界
  'edge.style':    { label: '过渡样式', type: 'select', def: '渐变' }
};

/* 填充参数默认值工厂 / 规范化（只补缺失键，绝不覆盖已有值——需求 四.1；
   数组参数的长度由 fillLayout.js 的 syncFillArrays 按当前色块数/层数校准） */
function makeFillParams(){
  const o = {};
  Object.keys(FILL_PARAM_DEFS).forEach(k => { o[k] = FILL_PARAM_DEFS[k].def; });
  o['fill.layerRatios'] = [];
  o['fill.inRatios'] = [];
  o['fill.angles'] = [];
  return o;
}
function normalizeFillParams(src){
  const out = makeFillParams();
  if (src && typeof src === 'object'){
    Object.keys(FILL_PARAM_DEFS).forEach(k => {
      const v = src[k];
      if (v === undefined || v === null) return;
      const d = FILL_PARAM_DEFS[k];
      if (d.type === 'bool'){ out[k] = !!v; return; }      // V2.25：布尔参数（edge.frame）原样取真值
      if (d.type === 'select'){ out[k] = v; return; }
      const n = +v;
      if (isFinite(n) && isFinite(d.min) && isFinite(d.max)) out[k] = Math.max(d.min, Math.min(d.max, n));
      else if (isFinite(n)) out[k] = n;
    });
    ['fill.layerRatios', 'fill.inRatios', 'fill.angles'].forEach(k => {
      if (Array.isArray(src[k])) out[k] = src[k].map(v => { const n = +v; return isFinite(n) ? n : 0; });
    });
  }
  return out;
}

/* 背景参数默认值工厂 / 规范化（只补缺失键，绝不覆盖已有值——需求 四.1） */
function makeBgParams(){
  const o = {};
  Object.keys(BG_PARAM_DEFS).forEach(k => { o[k] = BG_PARAM_DEFS[k].def; });
  return o;
}
function normalizeBgParams(src){
  const out = makeBgParams();
  if (src && typeof src === 'object'){
    Object.keys(src).forEach(k => { if (src[k] !== undefined && src[k] !== null) out[k] = src[k]; });
  }
  return out;
}
