# KiconCreator V2 · 开发说明文档（ARCHITECTURE）

> **文档版本：V0.07**（对应项目代码版本 **V2.10**）
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
├── index.html              # 唯一入口：页面骨架 + 内联启动屏（进度条）+ 引导器（按序动态加载 css/js）
├── css/
│   ├── base.css            # 设计令牌（CSS 变量）、三套主题色板、全局 reset
│   ├── layout.css          # 顶栏、三栏栅格（three/two/one）、合并标签、模块外壳、预览骨架
│   └── components.css      # 可复用控件：按钮/tab/参数行/芯片/预设网格/vtab/填充/TOAST/模态
├── data/
│   ├── fa-icons.js         # FA6 全量免费图标数据集（本地打包，1895 个：FA_ICONS + FA_GROUPS，生成勿手改）
│   └── fa-fonts.css        # FA6 字体本地化（solid-900/brands-400 woff2 以 base64 内嵌，离线/file:// 可用，生成勿手改）
├── js/                     # 20 个模块，加载顺序 = 依赖顺序（详见第 3 节）
│   ├── schema.js           # ① 参数注册表 PARAM_DEFS（键/范围/默认值）+ 字体表 + 行工厂 makeRow
│   ├── state.js            # ② 全局唯一可变状态源（rows 含 params/link/faName、currentLayout/layerOrder）
│   ├── utils.js            # ③ $/$$/escapeHtml/roundRect/toast/flashInvalid/CHAIN_SVG
│   ├── layout.js           # ④ 响应式布局引擎 + tab 动态展开算法 + refreshLayout 统一刷新
│   ├── builders.js         # ⑤ paramRow/selectRow/checkRow/colorRow 模板 + 颜色建议 HSL 公式引擎
│   ├── fa.js               # ⑥ FA6 选图面板（搜索/分类下拉/统一候选框）+ FA 字体装载（数据在 data/）
│   ├── panes.js            # ⑦ 各模块 pane 的 HTML 生成器（样式 pane 从激活行状态生成）
│   ├── tabs.js             # ⑧ 模块 tab 框架：MODULE_TABS 定义、测量、分组、渲染
│   ├── interactions.js     # ⑨ bindPaneInteractions：滑块/下拉/布尔/颜色/建议/芯片统一绑定 + Web 字体按需加载
│   ├── linkage.js          # ⑩ 逐行参数联动：applyLinkedParam/toggleRowLink/联动按钮三态
│   ├── history.js          # ⑪ commitHistory/undo/redo + 状态化 snapshotState/restoreState
│   ├── exports.js          # ⑫ PNG/JPG/WebP/ICO/Canvas/JSON/HTML/SVG 导出 + 下载 pane 绑定
│   ├── presets.js          # ⑬ 预设增删改/导入导出 + 预设/历史列表渲染 + data-act 委托
│   ├── canvas.js           # ⑭ 渲染引擎：layoutCells 排版几何 + drawRow 文本/FA 渲染 + drawIcon
│   ├── content.js          # ⑮ 内容行渲染（行数/排版芯片/层次芯片/纵向标签/文本参数面板）
│   ├── fills.js            # ⑯ 内部填充渲染（UI，背景暂缓）
│   ├── theme.js            # ⑰ 主题切换 + 两栏合并标签切换（顶层绑定）
│   ├── topbar.js           # ⑱ 顶栏按钮 + 复制粘贴样式 + 按标签重置 + renderStyle
│   ├── preview.js          # ⑲ 预览缩放/平移/模态/辅助线/安全边距（顶层绑定）
│   └── main.js             # ⑳ init() 入口（必须最后加载）
├── ARCHITECTURE.md         # 本文档
└── Changelog.md            # 变更记录
```

## 3. 模块加载顺序与依赖（V2.09 起由引导器动态加载）

`index.html` 不再静态书写 `<link>`/`<script>` 标签，而是由页尾**引导器**（内联脚本）按 `steps` 数组顺序逐个动态加载 4 个 CSS 与 21 个 JS，并在启动屏上实时显示进度。**顺序即依赖，steps 数组禁止调整**：

```
base/layout/components.css + fa-fonts.css
   └► schema ─► state ─► utils ─► layout ─► builders ─► fa-icons(data) ─► fa ─► panes ─► tabs ─► interactions ─► linkage
                                                                                        │
   main ◄── preview ◄── topbar ◄── theme ◄── fills ◄── content ◄── canvas ◄── presets/exports/history
```

加载顺序的设计依据（为什么必须如此）：

1. **schema.js 最先、state.js 其次**：state.js 在顶层调用 schema.js 的 `makeRow()` 构造 9 行默认状态；所有模块都可能读写全局状态。
2. **fa-icons.js（data）必须先于 fa.js**：fa.js 顶层由 `FA_ICONS` 构建 `FA_INDEX`；引导器保证 data 文件在其前一位。
3. **history.js 必须先于 topbar.js**：topbar.js 在**顶层**执行 `$('#undoBtn').addEventListener('click', undo)`，`undo` 标识符在该行执行时就必须已定义。
4. **canvas.js 必须先于 preview.js**：preview.js 顶层引用 `viewerModal`/`modalBody` 等 canvas.js 中的常量。
5. **main.js 最后**：其 `init()` 由引导器在全部步骤完成后调用（V2.09 起不再自执行）。
6. 其余跨模块引用（如 tabs.js 闭包里调用 presets.js 的 `renderPresets`）均为**运行时调用**，只要求加载完成，不要求先后。

> **判断规则**：顶层立即执行的代码（绑定、DOM 查询）所引用的外部标识符，必须来自 steps 数组中**更早**的文件；仅在事件回调/闭包里引用的外部标识符，顺序无关。
>
> **新增模块**：把文件加入 steps 数组的正确位置，并同步更新 ARCHITECTURE.md 的文件结构表。

## 4. 参数体系与渲染管线（V2.05 新增）

### 4.0 参数键注册表（schema.js）

所有可渲染参数在 `PARAM_DEFS` 注册，键为 `"域.参数"` 形式（避免同名互相污染，如 `style.size` 与 `shadow.size`）：

| 域 | 键 | 范围/选项 | 默认 |
|---|---|---|---|
| style | size / angle / scaleX / scaleY | 1~300 / 0~360° / 1~300 / 1~300 | 100 / 0 / 100 / 100 |
| style | offsetX / offsetY | -100~100% | 0 |
| style | clip（bool） | — | true |
| color | mode（select） | 单色 / 渐变 | 单色 |
| color | c1 / c2（color） | #RRGGBB | #6C8CFF / #22D3EE |
| shadow | enabled（bool） | — | false |
| shadow | color / size / blur | #RRGGBB / 0~100 / 0~100 | #1D2333 / 12 / 10 |
| shadow | x / y | -100~100 | 0 / 4 |
| font | cn / en（select） | 见 FONT_*_OPTIONS | 系统默认 |
| font | weight（select） | 细300/常规400/中粗600/粗700/特粗900 | 常规 |
| font | italic（bool） | — | false |
| font | layout（select） | 横排 / 纵排 / 环形向心 | 横排 |
| font | size | 1~300% | 100 |

**行对象结构**（`makeRow`）：`{ mode, text, params: {键: 值}, link: {键: bool} }`。9 行固定存在，`rowCount` 只控制可见性 —— 隐藏行的参数与联动标记保留（需求 3.3/3.7）。

**硬规则**：DOM 参数行的 `data-name`（滑块）与 `data-pkey`（下拉/布尔/颜色）必须等于 PARAM_DEFS 的键；interactions.js 只对注册过的键写状态。新增参数四步：schema.js 注册 → panes.js/content.js 加 UI → canvas.js 渲染读取 → 快照自动覆盖（rows 深拷贝）。

### 4.1 状态与渲染（单向）

```
schema.js（参数定义）→ state.js（rows/currentLayout/layerOrder）
   │  用户操作（interactions.js 统一入口）
   ▼
row.params / currentLayout / layerOrder 更新
   ├─► canvas.js：scheduleDrawIcon()（滑块拖动 rAF 节流）或 drawIcon()
   │     drawIcon = 背景填充（白底/透明）→ layoutCells(currentLayout) → 按层次顺序 drawRow ×N
   │     drawRow = 偏移→旋转(绕内容中心)→大小/拉伸变换 → 阴影 → 单色/渐变填充 → 横排/纵排/环形向心
   ├─► tabs.js：rerenderModule('style')（pane 从状态重建，含 tab 徽标）
   └─► history.js：commitHistory()（快照；滑块拖动中不入栈 —— 需求 四.2）
```

### 4.2 撤销/快照（P0-3）

- `snapshotState()`（history.js）**从状态采集**（不读 DOM）：rows 深拷贝（含 params/link）+ rowCount/activeRow/currentLayout/layerOrder/填充状态/iconSize/辅助线/安全边距/透明选项。
- **约束**：新增顶层状态（rows 之外的）必须同时扩展 snapshotState 与 restoreState；行内新参数自动随 rows 覆盖。
- `stateReady`：init 完成首轮渲染后才置 true，防止初始渲染入栈。
- `HistoryStack.isRestoring`：恢复期间忽略 push，防止递归入栈。

### 4.3 参数联动（P0-1 / 需求 3.7，逐行版）

- 联动标记存于**每行**：`row.link[paramKey]`。
- 链条开（`toggleRowLink` ON）→ **全部行**同键开启；关 → 仅该行关闭（需求 3.7 举例语义）。
- `applyLinkedParam(key, value, srcRowIdx)`：源行始终更新 + 所有 `link[key]` 为 true 的行（含不可见行）同步 → `syncParamInputs` 刷新可见控件。
- 顶栏联动按钮：点击批量改写所有行所有参数标记；三态显示（无/部分/全部，需求 四.3）。
- 布尔参数同样支持联动（如 style.clip、shadow.enabled）。

### 4.4 排版布局与层次（需求 1.2/1.3）

- `LAYOUTS`（content.js）定义每种行数的选项标签；`layoutCells`（canvas.js）按**同名键**返回每行单元格（比例坐标）。
- `currentLayout` 在行数切换时重置为该行数第一项。
- `layerOrder`：'1to9'（行1最后绘制在最顶层，绘制序 9→1）/'9to1'。

### 4.5 颜色建议（需求 3.4）

- builders.js `computeAdvice(base)`：HSL 公式实时计算 互补(+180°)/类似(±30°)/柔和(降饱和提亮度)/明亮(提饱和)，每组 2 个候选。
- 点击 swatch 写回 `color.c1`（渐变模式为 c1→c2 渐变对）。
- **说明**：需求为"根据背景色"计算；背景模块暂缓，当前以文本当前色为基色生成调和色，函数签名已保留 base 参数，背景落地后传背景色即可。

### 4.5b FA 图标模式（需求 2.7，V2.06 引入 / V2.07 全量化）

- **数据集**（`data/fa-icons.js`，独立数据目录）：`FA_ICONS`（1895 个 FA6 免费图标：码点/字族 solid|regular|brands/搜索关键词）+ `FA_GROUPS`（两级分类树：6 大类 → 68 官方类别 + 品牌与未分类）。由官方 metadata（icons.json + categories.yml）脚本生成，**勿手工编辑条目**；更新全量数据时重新生成并保持两个常量名不变。
- **面板布局**（fa.js `mountFaPanel`，自上而下）：搜索框 → 树状分类下拉菜单（`optgroup` 大类 → 官方子类选项，"全部图标"置顶）→ 统一候选图标显示框（单一带边框网格，内部滚动）。搜索（名称/别名/关键词子串匹配）优先于分类过滤。
- **性能**：候选框只在 搜索词/分类 变化时重建；选中图标仅切换高亮类名，不整体重建（"全部图标"1895 格下点击仍流畅）。
- **渲染**（canvas.js `drawRowContent`）：FA 行按 `faName` 查 `FA_INDEX` 取字族 —— solid → `"Font Awesome 6 Free"`（900），brands → `"Font Awesome 6 Brands"`（400）；忽略斜体；尺寸/颜色/阴影/排版变换与文本模式一致（需求 3.5 对 FA 同样适用）。
- **字体装载**（V2.08 起完全本地）：FA6 字体文件（fa-solid-900 / fa-brands-400 woff2）以 base64 内嵌于 `data/fa-fonts.css`（@font-face data: URL，不受 CORS 限制，file:// 与离线均可用），index.html 直接引用；`ensureFaFonts()` 仅负责触发加载与首绘刷新，并保留失败提示兜底。**不再使用 cdnjs 等 CDN 字体**。
- **FA代号**：`faName` 进入快照/恢复（history.js）、标签标题（content.js `rowLabel`）、导出文件名（exports.js `buildFileName`，需求 2.35）。
- **版权**：面板内警示行 + 页面最底部 `.page-foot` 一行简短版权（需求 2.7）。

### 4.6 模块 tab 动态展开（tabs.js + layout.js）

- `MODULE_TABS` 定义 4 个模块（preset/style/shape/fill）各自的 tab 与 pane 生成器。
- `measureTabHeights` 离屏测量每个 tab 自然高度 → `computeTabLayout`（连续切分算法）在剩余空间内决定哪些 tab 展开为"同组平铺"、哪些折叠为标签。
- preset 模块的特殊规则：预设/历史 tab 的高度上限对齐下载 tab（`--preset-cap`）。
- `activeTabByModule` 记住每个模块当前激活的 tab，重渲染后保持。

### 4.7 响应式布局（layout.js + css/layout.css）

- `<html data-layout="three|two|one">` 驱动 CSS 栅格切换；阈值：>800px 或手机横屏 → three；<400px 或手机竖屏 → one；其余 → two。
- two 模式下中/右栏合并，由 `.merge-tabs` 浮动标签切换。
- `preview-float`：栏内出现滚动时预览模块固定悬浮（`position:fixed`），占位元素撑开原位置。
- `refreshLayout()` 是布局刷新的**唯一入口**：resize、主题切换、内容变化后都必须经它（或被 ResizeObserver 覆盖）。

### 4.8 导出（P0-2，exports.js）

- **预览即导出**：辅助线与安全边距由 SVG 覆盖层/`#safeBox` 承担，不画进画布，因此天然不导出（需求 2.34/1.7）。
- 透明选项 `transparentChk` 实时作用于画布背景（勾选 → 画布透明，PNG 导出透明；JPG 导出前强制铺白底）。
- `exportCanvas()` 生成的独立 HTML 内含 `<script>` 字符串，**必须保留 `<\/script>` 转义**，否则会截断宿主页面。
- 每次导出都会 `pushDownloadHistory`（含 52×52 缩略图 + 全量快照，上限 20 条）。

## 5. AI Agent 编辑指引

### 5.1 "想改 X，去哪个文件"

| 需求 | 文件 | 说明 |
|---|---|---|
| 新增/修改可渲染参数 | `js/schema.js` 注册 → `js/panes.js` 或 `js/content.js` 加 UI → `js/canvas.js` 渲染读取 | data-name/data-pkey 必须等于参数键；联动与快照自动生效 |
| 新增一个 pane/tab | `js/tabs.js` 的 `MODULE_TABS` + `js/panes.js` 加生成函数 | 需要建议色则同时改 `js/builders.js` |
| 新增可撤销的顶层状态 | `js/state.js` 声明 → `js/history.js` 的 snapshot/restore 各加一行 | 行内参数（rows.params）自动覆盖 |
| 改文本渲染（字体/排版/阴影/渐变） | `js/canvas.js` 的 `drawRow/drawRowContent` | 布局几何在 `layoutCells` |
| 新增排版布局选项 | `js/content.js` 的 `LAYOUTS` + `js/canvas.js` 的 `layoutCells` | 两处键名必须严格一致 |
| 加新字体 | `js/schema.js` 的 FONT_*_OPTIONS + `index.html` 的 Google Fonts link | family=null 时回退系统字体 |
| 改颜色建议公式 | `js/builders.js` 的 `computeAdvice` | |
| 改布局断点/栅格 | `js/layout.js` 的 `updateLayoutMode()` + `css/layout.css` | |
| 加新主题 | `css/base.css` 追加 `html[data-theme=…]` 变量段（theme.js 的按钮同步加） | |
| 改导出格式/文件名 | `js/exports.js` | |
| 改预设/历史行为 | `js/presets.js` | |
| 改预览缩放/模态 | `js/preview.js` | |
| 改控件外观 | `css/components.css` | 改类名须同步 panes.js/tabs.js/content.js 的模板 |

### 5.2 硬性约束（违反会破坏运行）

1. **不改 `index.html` 引导器的 steps 数组顺序**；新增 JS 文件时按第 3 节规则插入正确位置。
2. **全局作用域共享**：顶层 `const/let` 即全局词法绑定，跨文件可见；**禁止**在两个文件声明同名顶层标识符（静默覆盖或 SyntaxError）。
3. **快照完整性**：见 4.2，新增状态必须同步 snapshot/restore。
4. **`exportCanvas` 模板中的 `<\/script>` 转义不可去掉**。
5. **pane 是"结构 + 行为"分离**：panes.js 只出 HTML 字符串；行为一律在 interactions.js（或局部渲染函数）里绑定。动态重建的局部 DOM（如 `#edgeParamsWrap`、`#fillBody2`）重建后必须重新调用 `bindPaneInteractions`。
6. **版本号**：改动后同步更新 `index.html` 顶栏 `.ver` 徽标、`snapshotState().version`、`exportHTML` 注释、`init()` 欢迎语，以及 `Changelog.md`（V2.08 起 head 中已无 `<version>`/`<changelog>` 标签，勿再添加）；各模块文件头有自己的版本号递增。

### 5.3 自检清单（提交前过一遍）

- [ ] `node --check js/*.js` 全部通过
- [ ] 浏览器打开无 console 报错，三栏渲染完整
- [ ] 改过滑块后：联动、撤销（Ctrl+Z）、重做（Ctrl+Y）行为正常
- [ ] 修改过状态字段：JSON 导出（下载 pane → JSON）内容包含新字段
- [ ] 窗口缩放：three→two→one 切换、合并标签、预览浮动均正常

## 6. 特别说明（V2.08 FA 字体本地化）

- 本版本（V2.08）解决"FA 图标显示为方框"：方框＝码点在字体中找不到字形。图标**元数据**（码点/分类/关键词）在 `data/fa-icons.js`，而**字形**存于 FA6 字体文件；此前字体经 cdnjs 在线加载，网络不可达时码点无字形可用。现字体已 base64 内嵌于 `data/fa-fonts.css`，随应用本地分发，file:// 与离线均可渲染。
- 注意，head 中的 `<version>`/`<changelog>` 标签已按需求移除，且**不要再添加回去**；版本信息以顶栏 `.ver` 徽标与 `Changelog.md` 为准。
- 数据文件（data/fa-icons.js、data/fa-fonts.css）均为脚本生成物，头注释含来源与基准版本；升级 FA6 版本时一并重新生成。
- 搜索为子串匹配，因此会出现宽泛命中（如搜 rocket 命中 sprocket），属预期行为。
- FA 行在样式模块中的 尺寸/颜色/阴影 参数与文本行完全一致；字体域参数（font.*）属文本模式专属，FA 模式不显示且渲染时忽略。图片模式与背景形状/填充渲染仍暂缓。
- 历史说明：V2.04 模块化拆分、V2.05 文本渲染与参数调节、V2.06 FA 模式、V2.07 FA 全量库与面板重构，各版本记录见 Changelog.md 对应条目。

## 7. 版本记录

| 文档版本 | 日期 | 说明 | 对应代码 |
|---|---|---|---|
| V0.05 | 2026-09-17 | data/ 增加 fa-fonts.css、4.5b 字体装载改写、5.2 版本号约束更新、特别说明改写 | V2.08 |
| V0.04 | 2026-09-17 | 文件结构增加 data/、4.5b 改写为全量数据集与新面板布局、特别说明改写 | V2.07 |
| V0.03 | 2026-09-17 | 新增 4.5b FA 图标模式说明、模块表/加载顺序更新至 20 文件、特别说明改写 | V2.06 |
| V0.02 | 2026-09-17 | 新增第 4 节参数体系与渲染管线、联动逐行化说明、编辑指引更新、特别说明改写 | V2.05 |
| V0.01 | 2026-09-17 | 首次创建：随 V2.04 模块化拆分一起发布 | V2.04 |
