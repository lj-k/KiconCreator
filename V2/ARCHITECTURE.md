# KiconCreator V2 · 开发说明文档（ARCHITECTURE）

> **文档版本：V0.01**（对应项目代码版本 **V2.04**）
> 适用范围：`V2/` 目录。V1 与 V2_seedcode 不在本文件范围内。
> 本文档面向后续参与开发的 AI Agent 与人类开发者，目标是"打开任意一个文件，30 秒内知道它负责什么、能改什么、不能动什么"。

---

## 1. 项目概述

KiconCreator 是一个**零安装、纯浏览器运行**的图标制作器。单入口 `index.html`，无构建、无依赖、无框架。

- **运行方式**：浏览器直接打开 `index.html`（`file://` 亦可），或任意静态服务器。
- **技术形态**：原生 HTML/CSS/JS。JS 采用**经典脚本（非 ES Module）+ 全局作用域 + 严格加载顺序**的组合。选择原因：ES Module 在 `file://` 下会被 CORS 拦截，与"零安装"冲突。
- **核心特性**：参数联动（P0-1）、真实导出（P0-2）、撤销/重做（P0-3）、预设（P0-4）、下载历史（P0-5）、响应式三栏/两栏/单栏布局、模块 tab 动态展开。

## 2. 文件结构总览

```
V2/
├── index.html              # 唯一入口：页面骨架 + 按依赖顺序引用 3 个 CSS 与 18 个 JS
├── css/
│   ├── base.css            # 设计令牌（CSS 变量）、三套主题色板、全局 reset
│   ├── layout.css          # 顶栏、三栏栅格（three/two/one）、合并标签、模块外壳、预览骨架
│   └── components.css      # 可复用控件：按钮/tab/参数行/芯片/预设网格/vtab/填充/TOAST/模态
├── js/                     # 18 个模块，加载顺序 = 依赖顺序（详见第 3 节）
│   ├── state.js            # ① 全局唯一可变状态源（含 HistoryStack/linkFlags/PRESETS）
│   ├── utils.js            # ② $/$$/escapeHtml/roundRect/toast/flashInvalid/CHAIN_SVG
│   ├── layout.js           # ③ 响应式布局引擎 + tab 动态展开算法 + refreshLayout 统一刷新
│   ├── builders.js         # ④ paramRow/inlineChips 模板 + 颜色建议数据（ADVICE_*/FILL_ADVICE）
│   ├── panes.js            # ⑤ 各模块 pane 的 HTML 生成器（纯模板，无副作用）
│   ├── tabs.js             # ⑥ 模块 tab 框架：MODULE_TABS 定义、测量、分组、渲染
│   ├── interactions.js     # ⑦ bindPaneInteractions：pane 内交互统一绑定入口
│   ├── linkage.js          # ⑧ 参数联动核心（propagateLink/链条图标/联动按钮三态）
│   ├── history.js          # ⑨ commitHistory/undo/redo + snapshotState/restoreState
│   ├── exports.js          # ⑩ PNG/JPG/WebP/ICO/Canvas/JSON/HTML/SVG 导出 + 下载 pane 绑定
│   ├── presets.js          # ⑪ 预设增删改/导入导出 + 预设/历史列表渲染 + data-act 委托
│   ├── canvas.js           # ⑫ 画布 DOM 引用 + drawGuides/drawIcon 占位渲染
│   ├── content.js          # ⑬ 内容行渲染（行数胶囊/排版芯片/纵向标签/三模式面板）
│   ├── fills.js            # ⑭ 内部填充渲染（色块列表 + 纯/渐/图三模式面板）
│   ├── theme.js            # ⑮ 主题切换 + 两栏合并标签切换（顶层绑定）
│   ├── topbar.js           # ⑯ 顶栏按钮绑定 + renderStyle
│   ├── preview.js          # ⑰ 预览缩放/平移/模态/辅助线/安全边距（顶层绑定）
│   └── main.js             # ⑱ init() 入口（必须最后加载）
├── ARCHITECTURE.md         # 本文档
└── Changelog.md            # 变更记录
```

## 3. 模块加载顺序与依赖

`index.html` 底部按固定顺序引用全部 JS。**顺序即依赖，禁止调整**：

```
state ──► utils ──► layout ──► builders ──► panes ──► tabs ──► interactions ──► linkage
                                                                              │
   main ◄── preview ◄── topbar ◄── theme ◄── fills ◄── content ◄── canvas ◄──┘
                                          （presets/exports/history 位于 history↔canvas 之间，
                                            完整顺序以 index.html 底部注释 1~18 为准）
```

加载顺序的设计依据（为什么必须如此）：

1. **state.js 最先**：所有模块都可能读写全局状态；放在最前可避免 TDZ（暂时性死区）问题。
2. **history.js 必须先于 topbar.js**：topbar.js 在**顶层**执行 `$('#undoBtn').addEventListener('click', undo)`，`undo` 标识符在该行执行时就必须已定义。
3. **canvas.js 必须先于 preview.js**：preview.js 顶层引用 `viewerModal`/`modalBody` 等 canvas.js 中的常量。
4. **main.js 最后**：`init()` 调用几乎所有模块的渲染函数。
5. 其余跨模块引用（如 tabs.js 闭包里调用 presets.js 的 `renderPresets`）均为**运行时调用**，只要求加载完成，不要求先后。

> **判断规则**：顶层立即执行的代码（绑定、DOM 查询、`init()`）所引用的外部标识符，必须来自**更早加载**的文件；仅在事件回调/闭包里引用的外部标识符，顺序无关。

## 4. 核心数据流与关键机制

### 4.1 状态与渲染（单向）

```
state.js（唯一状态）
   │  用户操作
   ▼
interactions / topbar / content / fills / preview（修改状态）
   │
   ├─► content.js / fills.js：局部重渲染（renderContentTabs、renderFillBody2 …）
   ├─► tabs.js：rerenderModule(moduleId)（style/shape/fill/preset 模块重渲染）
   ├─► canvas.js：drawIcon()（画布重绘）
   └─► history.js：commitHistory()（压栈快照，供撤销）
```

### 4.2 撤销/快照（P0-3）

- `snapshotState()`（history.js）采集：全部 `.param[data-name]` 滑块值 + rows/fillCount/颜色模式/边界形状/iconSize/辅助线/安全边距/linkFlags。
- **约束**：新增任何"需要被撤销"的状态时，必须**同时**扩展 `snapshotState` 与 `restoreState`，并在 state.js 中声明该状态，禁止散落在其它模块。
- `stateReady`（state.js）：init 完成首轮渲染后才置 true；此前 `commitHistory()` 直接返回，防止把初始渲染记录为操作。
- `HistoryStack.isRestoring`：恢复期间忽略 push，防止递归入栈。

### 4.3 参数联动（P0-1）

- 联动的 key 是参数行的 `data-name` 属性（由 builders.js 的 `paramRow` 生成，如 `"大小"`、`"角度"`）。
- `linkFlags`（state.js）记录每个 key 的联动开关；链条按钮（`.chain`）切换它。
- `propagateLink`（linkage.js）把变更值同步到文档中**所有同名参数行**（排除源行）。
- 顶栏"参数联动"按钮是总开关，三态展示：无 / 部分（≤3 个 key）/ 全部（>3 个 key）。

### 4.4 模块 tab 动态展开（tabs.js + layout.js）

- `MODULE_TABS` 定义 4 个模块（preset/style/shape/fill）各自的 tab 与 pane 生成器。
- `measureTabHeights` 离屏测量每个 tab 自然高度 → `computeTabLayout`（连续切分算法）在剩余空间内决定哪些 tab 展开为"同组平铺"、哪些折叠为标签。
- preset 模块的特殊规则：预设/历史 tab 的高度上限对齐下载 tab（`--preset-cap`）。
- `activeTabByModule` 记住每个模块当前激活的 tab，重渲染后保持。

### 4.5 响应式布局（layout.js + css/layout.css）

- `<html data-layout="three|two|one">` 驱动 CSS 栅格切换；阈值：>800px 或手机横屏 → three；<400px 或手机竖屏 → one；其余 → two。
- two 模式下中/右栏合并，由 `.merge-tabs` 浮动标签切换。
- `preview-float`：栏内出现滚动时预览模块固定悬浮（`position:fixed`），占位元素撑开原位置。
- `refreshLayout()` 是布局刷新的**唯一入口**：resize、主题切换、内容变化后都必须经它（或被 ResizeObserver 覆盖）。

### 4.6 导出（P0-2，exports.js）

- `renderForExport()` 导出前临时关闭辅助线/安全边距并重绘，导出后恢复。
- `exportCanvas()` 生成的独立 HTML 内含 `<script>` 字符串，**必须保留 `<\/script>` 转义**，否则会截断宿主页面。
- 每次导出都会 `pushDownloadHistory`（含 52×52 缩略图 + 快照，上限 20 条）。

## 5. AI Agent 编辑指引

### 5.1 "想改 X，去哪个文件"

| 需求 | 文件 | 说明 |
|---|---|---|
| 新增/修改某个参数行（滑块） | `js/panes.js`（模板）+ 必要时 `js/interactions.js`（特殊交互） | 联动与撤销自动生效（基于 data-name） |
| 新增一个 pane/tab | `js/tabs.js` 的 `MODULE_TABS` + `js/panes.js` 加生成函数 | 需要建议色则同时改 `js/builders.js` |
| 新增可撤销状态字段 | `js/state.js` 声明 → `js/history.js` 的 snapshot/restore 各加一行 | 三处缺一不可 |
| 改画布内容绘制 | `js/canvas.js` 的 `drawIcon()` | 辅助线在 `drawGuides()` |
| 改布局断点/栅格 | `js/layout.js` 的 `updateLayoutMode()` + `css/layout.css` | |
| 加新主题 | `css/base.css` 追加 `html[data-theme=…]` 变量段（theme.js 的按钮同步加） | |
| 改导出格式/文件名 | `js/exports.js` | |
| 改预设/历史行为 | `js/presets.js` | |
| 改预览缩放/模态 | `js/preview.js` | |
| 改控件外观 | `css/components.css` | 改类名须同步 panes.js/tabs.js 的模板 |

### 5.2 硬性约束（违反会破坏运行）

1. **不改 `index.html` 底部脚本顺序**；新增 JS 文件时按第 3 节规则插入正确位置并更新注释序号。
2. **全局作用域共享**：顶层 `const/let` 即全局词法绑定，跨文件可见；**禁止**在两个文件声明同名顶层标识符（静默覆盖或 SyntaxError）。
3. **快照完整性**：见 4.2，新增状态必须同步 snapshot/restore。
4. **`exportCanvas` 模板中的 `<\/script>` 转义不可去掉**。
5. **pane 是"结构 + 行为"分离**：panes.js 只出 HTML 字符串；行为一律在 interactions.js（或局部渲染函数）里绑定。动态重建的局部 DOM（如 `#edgeParamsWrap`、`#fillBody2`）重建后必须重新调用 `bindPaneInteractions`。
6. **版本号**：改动后同步更新 `index.html` 中 `<version>`、`.ver` 徽标、`snapshotState().version`、`exportHTML` 注释、`init()` 欢迎语，以及 `Changelog.md`；各模块文件头有自己的 V0.01 递增版本。

### 5.3 自检清单（提交前过一遍）

- [ ] `node --check js/*.js` 全部通过
- [ ] 浏览器打开无 console 报错，三栏渲染完整
- [ ] 改过滑块后：联动、撤销（Ctrl+Z）、重做（Ctrl+Y）行为正常
- [ ] 修改过状态字段：JSON 导出（下载 pane → JSON）内容包含新字段
- [ ] 窗口缩放：three→two→one 切换、合并标签、预览浮动均正常

## 6. 特别说明

- 本版本（V2.04）仅做**结构拆分重构**：原单文件 `index.html`（2386 行）中的内联 CSS/JS 按原有代码顺序、原封不动地迁移到 `css/`（3 个文件）与 `js/`（18 个文件），未修改任何运行逻辑。经逐行比对校验：CSS 207 行完全一致；JS 顶层声明 304 个一一对应；浏览器冒烟测试（渲染 + 主题/tab/填充数交互 + 撤销链路）通过。
- 注意，与旧版单文件相比唯一的代码级差异是版本号字符串 `2.03 → 2.04`（快照 version 字段、导出注释、欢迎 toast 三处）以及 `stateReady` 声明行追加了一行注释。
- 拆分前 `V2/index.html` 中存在的历史段落注释（如"工具函数""画布渲染"）已转化为各模块文件头的"职责"说明；若发现某文件头描述与代码行为不符，以代码为准，并请同步修正文档。

## 7. 版本记录

| 文档版本 | 日期 | 说明 | 对应代码 |
|---|---|---|---|
| V0.01 | 2026-09-17 | 首次创建：随 V2.04 模块化拆分一起发布 | V2.04 |
