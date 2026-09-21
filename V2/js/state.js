/* ============================================================
   KiconCreator V2 · js/state.js
   职责：全局唯一可变状态源。
     - HistoryStack：动作历史栈（P0-3，上限 20 条，FIFO 淘汰）
     - PRESETS / downloadHistory：预设数组与下载历史（P0-4/P0-5）
     - rows：9 行内容状态（makeRow 构造，含 params/link，见 schema.js）
     - currentLayout / layerOrder：排版模式与多行排列层次（需求 1.2/1.3）
     - bgParams / fillColors / fillCount：背景形状与外框参数、填充色块色值（需求 三.1）
   版本：V0.05（V2.17：新增 bgParams（形状与外框，全局唯一）与 fillColors（填充色值唯一来源））
   约束：本文件必须最先加载（schema.js 之后）；任何模块读写状态请引用
        这里的变量，不要新建平行状态，避免快照/撤销遗漏字段。
   ============================================================ */

/* P0-3：动作历史（撤销栈） */
const HistoryStack = {
  stack: [],
  pointer: -1,
  maxSize: 20,
  isRestoring: false,
  push(snap){
    if (this.isRestoring) return;
    // 被覆盖的重做链快照 → 注销其图片引用（需求 四.2）
    this.stack.slice(this.pointer + 1).forEach(s => imgReleaseSnap(s));
    this.stack = this.stack.slice(0, this.pointer + 1);
    this.stack.push(snap);
    imgRetainSnap(snap, 'undo:');      // 撤销栈持引用（需求 六.1）
    if (this.stack.length > this.maxSize){
      imgReleaseSnap(this.stack.shift()); // FIFO 淘汰 → 注销图片引用
    } else {
      this.pointer++;
    }
  },
  undo(){
    if (this.pointer > 0){
      this.pointer--;
      return this.stack[this.pointer];
    }
    return null;
  },
  redo(){
    if (this.pointer < this.stack.length - 1){
      this.pointer++;
      return this.stack[this.pointer];
    }
    return null;
  },
  reset(initialSnap){
    this.stack.forEach(s => imgReleaseSnap(s));
    this.stack = [initialSnap];
    this.pointer = 0;
    imgRetainSnap(initialSnap, 'undo:');
  }
};

/* P0-4：预设数组 */
const PRESETS = []; // 动态维护，内置几个示例在 init 时装入

/* P0-5：下载历史 */
const downloadHistory = [];
const HISTORY_MAX = 20;

/* ---------- 内容行 / 全局业务状态 ----------
   rows 固定 9 条（含隐藏行），rowCount 控制可见数，
   隐藏行参数与联动保留（需求 3.3/3.7） */
const MODE_LABEL = { text: '文本', image: '图片', fa: 'FontAwesome' };
let rows = [
  makeRow('K'), makeRow('ICON'), makeRow('A'),
  makeRow('B'), makeRow('C'), makeRow('D'),
  makeRow('E'), makeRow('F'), makeRow('G')
];
let rowCount = 2;
let activeRow = 0;
let styleClipboard = null;       // 复制样式（仅 style./color./shadow. 参数）
let currentLayout = '全在上（左右分）'; // 当前生效的排版模式
let layoutByCount = {};          // 各"行数"下用户已选的排版模式（需求 四.1 例3：切回原行数时恢复选择）
let layerOrder = '1to9';         // '1to9'：行1 最后绘制在最顶层；'9to1'：行9 顶层
let currentEdgeShape = '直线';    // 填充边界 UI（背景布局模块暂缓）
let fillCount = 2;
let activeFill = 0;
let fillModes = ['纯', '纯', '纯', '纯', '纯', '纯'];
/* 填充色块的真实色值（唯一来源）：形状内部填充按它取色，
   色块列表的缩略渐变与快照也由它派生，避免出现第二套颜色 */
let fillColors = ['#6C8CFF', '#22C55E', '#F97316', '#0EA5E9', '#FACC15', '#EC4899'];
/* 形状与外框参数（背景栏，需求 三.1）：全局唯一，扁平存键（schema.js 定义键与默认值） */
let bgParams = makeBgParams();
let stateReady = false; // 初始渲染完成后才允许 commitHistory

/* 画布导出尺寸（与 render/exports 共享） */
let iconSize = 256;
