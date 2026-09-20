/* ============================================================
   KiconCreator V2 · js/state.js
   职责：全局唯一可变状态源。
     - HistoryStack：动作历史栈（P0-3，上限 20 条，FIFO 淘汰）
     - PRESETS / downloadHistory：预设数组与下载历史（P0-4/P0-5）
     - rows：9 行内容状态（makeRow 构造，含 params/link，见 schema.js）
     - currentLayout / layerOrder：排版模式与多行排列层次（需求 1.2/1.3）
     - fillCount 等填充状态：背景渲染暂缓，仅供 UI
   版本：V0.03（V2.12：新增 layoutByCount——各"行数"下已选排版模式）
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
    this.stack = this.stack.slice(0, this.pointer + 1);
    this.stack.push(snap);
    if (this.stack.length > this.maxSize){
      this.stack.shift();
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
    this.stack = [initialSnap];
    this.pointer = 0;
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
let currentEdgeShape = '直线';    // 填充边界 UI（背景暂缓）
let fillCount = 2;
let activeFill = 0;
let fillModes = ['纯', '纯', '纯', '纯', '纯', '纯'];
let stateReady = false; // 初始渲染完成后才允许 commitHistory

/* 画布导出尺寸（与 render/exports 共享） */
let iconSize = 256;
