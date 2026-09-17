/* ============================================================
   KiconCreator V2 · js/state.js
   职责：全局唯一可变状态源。
     - HistoryStack：动作历史栈（P0-3，上限 20 条，FIFO 淘汰）
     - linkFlags  ：参数联动标记（P0-1，key 为 data-name，如"大小"）
     - PRESETS / downloadHistory：预设数组与下载历史（P0-4/P0-5）
     - rows 等业务状态：内容行、填充、颜色模式、画布尺寸
   版本：V0.01
   约束：本文件必须最先加载；任何模块读写状态请引用这里的变量，
        不要在其它模块新建平行状态，避免快照/撤销遗漏字段。
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

/* P0-1：参数联动标记（按参数 key 全局共享）
   —— key 使用 data-name 值（"大小"、"角度"、"水平拉伸"…） */
const linkFlags = {}; // { '大小': true, '角度': false, ... }

/* P0-4：预设数组 */
const PRESETS = []; // 动态维护，内置几个示例在 init 时装入

/* P0-5：下载历史 */
const downloadHistory = [];
const HISTORY_MAX = 20;

/* ---------- 内容行 / 填充 / 全局业务状态 ---------- */
const MODE_LABEL = { text: '文本', image: '图片', fa: 'FontAwesome' };
let rows = [
  { mode: 'text', text: 'K' },{ mode: 'text', text: 'ICON' },{ mode: 'text', text: 'A' },
  { mode: 'text', text: 'B' },{ mode: 'text', text: 'C' },{ mode: 'text', text: 'D' },
  { mode: 'text', text: 'E' },{ mode: 'text', text: 'F' },{ mode: 'text', text: 'G' }
];
let rowCount = 2;
let activeRow = 0;
let styleClipboard = null;
let currentColorMode = '单色';
let currentEdgeShape = '直线';
let fillCount = 2;
let activeFill = 0;
let fillModes = ['纯', '纯', '纯', '纯', '纯', '纯'];
let stateReady = false; // 初始渲染完成后才允许 commitHistory

/* 画布导出尺寸（与 canvas.js / exports.js 共享） */
let iconSize = 256;
