/* ============================================================
   KiconCreator V2 · js/schema.js
   职责：参数注册表（JSON Schema 的 JS 形态）与行状态工厂。
     - PARAM_DEFS：所有可渲染参数的 键/显示名/范围/默认值/单位
       （键使用 "域.参数" 形式，避免同名参数互相污染，
        如 style.size 与 shadow.size）
     - 字体注册表 FONT_DEFS：web 字体优先、系统字体回退，
       web:false 或 unavailable 的字体在下拉框标注（未下载）
     - makeRow(text)：构造带完整参数与联动标记的行对象
   版本：V0.01（需求文档 · 四/技术开发流程：JSON schema 定义、参数校验范围）
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
   "切换模式保留数据、行增减不必重置"。link 为逐行联动标记（3.7） */
function makeRow(text, mode = 'text'){
  const params = {};
  Object.keys(PARAM_DEFS).forEach(k => { params[k] = PARAM_DEFS[k].def; });
  const link = {};
  Object.keys(PARAM_DEFS).forEach(k => { link[k] = false; });
  return { mode, text: text || '', params, link };
}

/* 阴影换算公式（schema 统一定义，渲染与文档共用）：
   blurPx = (blur + size×0.6) / 100 × S × 0.25
   offsetPx = val / 100 × S × 0.2 */
function shadowBlurPx(p, S){ return (p['shadow.blur'] + p['shadow.size'] * 0.6) / 100 * S * 0.25; }
function shadowOffsetPx(v, S){ return v / 100 * S * 0.2; }
