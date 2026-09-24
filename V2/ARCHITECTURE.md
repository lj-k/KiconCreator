# KiconCreator V2 · 开发说明文档（ARCHITECTURE）

> **文档版本：V0.25**（对应项目代码版本 **V2.28**）
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
├── presets/                # 本地预设（需求 2.1 第 3 条）：启动时自动加载，**可直接手工编辑**
│   ├── README.md           # 使用说明（怎么粘贴预设、规则与注意事项）
│   └── index.js            # 预设清单：window.KICON_LOCAL_PRESETS = { files: { "<名>.json": {…导出产物…} } }
├── js/                     # 24 个模块 + data/fa-icons.js，加载顺序 = 依赖顺序（详见第 3 节）
│   ├── schema.js           # ① 参数注册表 PARAM_DEFS（键/范围/默认值）+ 背景参数表 BG_PARAM_DEFS + 字体表 + 行工厂 makeRow/makeImageState/normalizeRow
│   ├── state.js            # ② 全局唯一可变状态源（rows 含 params/link/faName/image、currentLayout/layerOrder、bgParams 形状与外框）+ HistoryStack
│   ├── utils.js            # ③ $/$$/escapeHtml/clamp/roundRect/toast/flashInvalid/CHAIN_SVG
│   ├── images.js           # ④ 会话图片仓库：注册/解码/引用计数/延迟释放/裁剪几何/白色透明/预设序列化（含编码保真）
│   ├── layout.js           # ⑤ 响应式布局引擎 + tab 动态展开算法 + refreshLayout 两级刷新
│   ├── builders.js         # ⑥ paramRow/selectRow/checkRow/colorRow 模板 + 颜色建议 HSL 公式引擎
│   ├── fa.js               # ⑦ FA6 选图面板（搜索/分类下拉/统一候选框）+ FA 字体装载（数据在 data/）
│   ├── panes.js            # ⑧ 各模块 pane 的 HTML 生成器（样式 pane 从激活行状态生成）
│   ├── tabs.js             # ⑨ 模块 tab 框架：MODULE_TABS 定义、测量、分组、渲染
│   ├── interactions.js     # ⑩ bindPaneInteractions：滑块/下拉/布尔/颜色/建议/芯片统一绑定 + Web 字体按需加载
│   ├── linkage.js          # ⑪ 逐行参数联动：applyLinkedParam/toggleRowLink/联动按钮三态
│   ├── history.js          # ⑫ commitHistory/undo/redo + 状态化 snapshotState/restoreState
│   ├── exports.js          # ⑬ PNG/JPG/WebP/ICO/Canvas/JSON/HTML/SVG 导出 + 文件名 + 下载历史
│   ├── presets.js          # ⑭ 预设增删改/导入导出（含图片数据）+ 预设/历史列表渲染 + data-act 委托
│   ├── fillLayout.js       # ⑮ 填充布局引擎（需求 三.2）：层划分/分界线数组/矩阵·饼图几何/多分界线共享滑轨
│   ├── bgshape.js          # ⑯ 形状（外框）几何引擎：采样/轮廓/边框/阴影/填满 + 调用填充引擎铺满形状
│   ├── canvas.js           # ⑰ 渲染引擎：layoutCells + drawRow（文本/FA/图片）+ drawIcon + renderSnapshotThumb
│   ├── content.js          # ⑱ 内容行渲染（行数/排版芯片/层次芯片/纵向标签/文本参数面板）
│   ├── imagePane.js        # ⑲ 图片模式面板：打开/进度条/剪裁后预览/剪裁器（缩放·比例·拖拽）
│   ├── fills.js            # ⑳ 内部填充模块（色块列表 + 纯/渐/图 面板；三模式均已实现，见 4.15）
│   ├── theme.js            # ㉑ 主题切换 + 两栏合并标签切换（顶层绑定）
│   ├── topbar.js           # ㉒ 顶栏按钮 + 复制粘贴样式 + 按标签重置 + 填充数量 + renderStyle
│   ├── preview.js          # ㉓ 预览缩放/平移/模态/辅助线/安全边距（顶层绑定）
│   └── main.js             # ㉔ init() 入口（必须最后加载）
├── ARCHITECTURE.md         # 本文档
└── Changelog.md            # 变更记录
```

## 3. 模块加载顺序与依赖（V2.09 起由引导器动态加载）

`index.html` 不再静态书写 `<link>`/`<script>` 标签，而是由页尾**引导器**（内联脚本）按 `steps` 数组顺序逐个动态加载 4 个 CSS、24 个 JS（含 data/fa-icons.js）与 1 个本地预设清单（presets/index.js），并在启动屏上实时显示进度。**顺序即依赖，steps 数组禁止调整**：

```
base/layout/components.css + fa-fonts.css
   └► schema ─► state ─► utils ─► images ─► layout ─► builders ─► fa-icons(data) ─► fa ─► panes ─► tabs ─► interactions ─► linkage
                                                                                        │
   main ◄── preview ◄── topbar ◄── theme ◄── fills ◄── imagePane ◄── content ◄── canvas ◄── bgshape ◄── fillLayout ◄── presets/exports/history
```

> **fillLayout.js 的位置（V2.22）**：排在 `presets.js` 之后、`bgshape.js` 之前。它只依赖 `schema.js`/`state.js`
> 的全局状态，且只被**运行时**调用（`bgshape.js` 的 `drawBgShape` 在绘制时调用 `paintFillPattern`），
> 因此顺序上只需保证在 `main.js` 之前完成加载即可；放在 `bgshape.js` 前一位是为了让"填充 → 形状"的
> 阅读顺序与调用链一致。

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
>
> **版本化缓存串（V2.19）**：引导器在 http(s) 下给每个资源追加 `?v=` + `APP_VER`（`APP_VER` 与顶栏 `.ver` 徽标同值）。原因是静态服务器多不发送 `Cache-Control`，浏览器会启发式缓存 JS/CSS，导致"改了代码但刷新还是旧页面"。**改版本号时必须同步改 `APP_VER`**，否则用户刷新拿到的仍是旧模块。`file://` 下不加查询串，保证双击打开仍按本地路径加载。
>
> **可选步骤（V2.20）**：steps 条目第 3 位为 `1` 表示**可选资源**——加载失败只 `console.warn` 并跳过，不触发启动失败。目前仅 `presets/index.js` 用它（用户可能清空/删除本地预设）。新增可选资源必须确认"缺失时应用仍能正常工作"。

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

**行对象结构**（`makeRow`）：`{ mode, text, faName, params: {键: 值}, link: {键: bool} }`。9 行固定存在，`rowCount` 只控制可见性 —— 隐藏行的参数与联动标记保留（需求 3.3/3.7）；`text`/`faName` 分属文本与 FA 模式，互不覆盖（需求 四.1）。

**硬规则**：DOM 参数行的 `data-name`（滑块）与 `data-pkey`（下拉/布尔/颜色）必须等于 PARAM_DEFS 的键；interactions.js 只对注册过的键写状态。新增参数四步：schema.js 注册 → panes.js/content.js 加 UI → canvas.js 渲染读取 → 快照自动覆盖（rows 深拷贝）。

### 4.0b 数据保留（需求 四.1 / L259-262，V2.12 落实）

> 原文要求：**切换模式、内容数量、填充数量不影响参数数据的保留**；能独立保留的参数尽量独立，共用的参数才一起调整。

**存储模型**：`rows` 恒为 9 条（`rowCount` 只控制可见性），每行的
`{ mode, text, faName, params{23 键}, link{23 键} }` 全部常驻内存、随快照深拷贝。

| 用例 | 机制 | 约束 |
|---|---|---|
| 例1 行数变化 | 9 条行对象不随 `rowCount` 增减；隐藏行不渲染但其 文本/参数/联动标记 原样保留 | 禁止在任何地方按 `rowCount` 截断 `rows` |
| 例2 模式切换 | **各模式的数据字段相互独立**：`text` 属文本模式、`faName` 属 FA 模式、`image.*` 属图片模式；`params` 为全模式共享（尺寸/颜色/阴影按需求 3.5 本就同批共用） | **禁止**用某模式的字段承接另一模式的内容（如 FA 选图不得写 `text`） |
| 例3 其它切换 | 填充数量：`fillModes` 6 项常驻，切换数量不重置；行数：`layoutByCount` 记忆每个行数下已选的排版模式 | 新增"随选项数量变化"的参数，都要有独立的记忆位 |

**落点清单**（改这些地方时要一并考虑保留语义）：
- `schema.js`：`normalizeRowParams / normalizeRowLink / normalizeRow` —— 快照、恢复、外部预设导入的统一入口，**只补缺失键、绝不覆盖已有值**；
- `history.js`：`snapshotState / restoreState` 必须用 `normalizeRow` 处理行数组；新增顶层状态（如 `layoutByCount`）两处同步；
- `content.js`：行数切换用 `layoutByCount[rowCount] || LAYOUTS[rowCount][0]`；模式切换按钮只改 `mode`；
- `fa.js`：选中图标只写 `faName`；`canvas.js` FA 分支 `faGlyph(r.faName)`（空时回退 `text` 兼容旧数据）；
- `topbar.js`：复制样式/按标签重置的取值范围包含 `style./color./shadow./image.`。

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

### 4.6 模块 tab 动态展开（tabs.js + layout.js，V2.11 起受"仅视口重算"约束）

- `MODULE_TABS` 定义 4 个模块（preset/style/shape/fill）各自的 tab 与 pane 生成器。
- `measureTabHeights` 离屏测量每个 tab 自然高度 → `computeTabLayout`（连续切分算法）在剩余空间内决定哪些 tab 展开为"同组平铺"、哪些折叠为标签。
- preset 模块的特殊规则：预设/历史 tab 的高度上限对齐下载 tab（`--preset-cap`）。
- `activeTabByModule` 记住每个模块当前激活的 tab，重渲染后保持（激活切换只改类名，不触发重建）。
- **两级刷新入口（硬规则）**：
  | 入口 | 行为 | 允许的调用时机 |
  |---|---|---|
  | `refreshLayout()` | 重算标签组拆分/合并 | **仅视口级**：init、resize、orientationchange、布局模式切换、字体就绪、ResizeObserver、合并标签切换、放大预览 |
  | `refreshLayoutKeepGroups()` | 不重算分组（标签保持原位），只更新顶栏高度/合并标签定位/预览高度/浮动状态 | 内容级：切换行、改参数、撤销/恢复、行数切换、填充数量切换、`rerenderModule()` |
  > 需求依据（用户明确要求）：**只有视口调整才允许拆分/合并标签组**；标签组内标签尺寸变化（如颜色 pane 单色→渐变变高）必须保持标签原位，否则标签会在组间跳位，让用户找不到。
- **结构签名跳过无谓重建**：`groupsSignature(tabs, groups)` = "分组划分 + 标签启用态"（**不含激活态**）。`renderTabGroupsFromGroups(moduleId, container, tabs, groups, forceRebuild)` 在 `!forceRebuild && container.dataset.renderSig === sig` 时**直接返回、完全不触碰 DOM**（避免无关模块闪烁；视口变化但分组没变时同样不重建）。`forceRebuild=true` 仅用于内容确实变化的 `rerenderModule()`。
- **保持标签原位**：`readCurrentGroups(container, tabs)` 从 DOM 的 `data-group` 反解当前分组为索引数组；`rerenderModule()` 优先沿用它（DOM 标签集合与预期不符时才回退 `computeTabLayout`），因此内容变化不会引起重新拆分。

### 4.7 响应式布局（layout.js + css/layout.css）

- `<html data-layout="three|two|one">` 驱动 CSS 栅格切换；阈值：>800px 或手机横屏 → three；<400px 或手机竖屏 → one；其余 → two。
- two 模式下中/右栏合并，由 `.merge-tabs` 浮动标签切换。
- `preview-float`：栏内出现滚动时预览模块固定悬浮（`position:fixed`），占位元素撑开原位置。
- `refreshLayout()` 是布局刷新的**唯一入口**：resize、主题切换、内容变化后都必须经它（或被 ResizeObserver 覆盖）。

### 4.8 导出（P0-2，exports.js）

- **预览即导出**：辅助线与安全边距由 SVG 覆盖层/`#safeBox` 承担，不画进画布，因此天然不导出（需求 2.34/1.7）。
- 透明选项 `transparentChk` 实时作用于画布背景（勾选 → 画布透明，PNG 导出透明；JPG 导出前强制铺白底）。
- `exportCanvas()` 生成的独立 HTML 内含 `<script>` 字符串，**必须保留 `<\/script>` 转义**，否则会截断宿主页面。
- 每次导出都会 `pushDownloadHistory`（含 52×52 缩略图 + 全量快照，上限 20 条）；缩略图由 `renderSnapshotThumb` 按快照数据渲染（需求 2.2）。
- 文件名 `buildFileName`：内容取**所有可见行**拼接——文本用文本、FA 用 FA 代号、图片用原图片名（去扩展名），过滤非法字符并截断（需求 2.35）；时间戳统一用 `timeStamp()`。

**JSON 出口语义（需求 2.1/2.34，V2.15 校正）**——三条出口都只产出**一条预设**，都不导出预设列表：

| 出口 | 内容 | 文件名 |
|---|---|---|
| 预设 pane → 导出 | 当前参数（`snapshotState()`）封装为 `{ type:'kicon-preset', version, name, time, snap }` | `KIcon-preset-{内容}-{时间}.json` |
| 下载 pane → JSON | 同上（需求 2.34：json = 导出预设），由 `currentStateJSONText()` 产出 | `KIcon-{内容}-{时间}.json` |
| 预设 pane → 复制 JSON | 同 `currentStateJSONText()`，写入剪贴板 | — |

**导入**：**一个 json 文件 = 一条独立预设**；`multiple` 多选即"批量导入 N 个文件 → N 条独立预设"。文件内为数组时（早期整表导出）按多条导入并在差异中说明。所有出口的图片都经 `snapForExport` 按用户选择处理（见 4.10）。

### 4.10 图片模式与会话图片仓库（需求 2.8 / 3.4 / 3.6 + 六.1，V2.13）

**核心原则：图片数据全程序只保存一份**。`rows[i].image` 只存 `{ id, name, w, h, crop{aspect,zoom,ox,oy} }`，
`mode` 无论切换到哪个模式都不清空该字段（需求 四.1 例2）。

```
文件/dataURL ──imgLoadFile/imgLoadData──► ImageRepo.map: id → { bitmap, w, h, src, refs:Set, timer, chroma }
                                                    ▲
   行参数 row:i ─┐                                  │ 引用键（refKeys: 引用键 → Set<id>）
   预设  preset:  ├──imgRetain/imgRelease───────────┘  · 无引用 → 延迟 4s 释放（再次引用即取消）
   历史  hist:    │                                    · 快照/预设对象 → 引用键存 WeakMap（不污染导出的 JSON）
   撤销  undo:   ─┘
```

| 关注点 | 位置 | 说明 |
|---|---|---|
| 入库 | `imgLoadFile` / `imgLoadData` | 进度回调、>1MB 提醒、动图取首帧（`createImageBitmap`）、失败原因可读；**两条路径统一**按 `IMG_MAX_EDGE`（1024）降采样（`imgNormalize` / 画布缩放） |
| 引用 | `imgRetain` / `imgRelease` / `imgRetainSnap` / `imgReleaseSnap` / `imgSyncRowRefs` | 变更行图片时解除旧引用（需求 2.8）；切行/切模式不解除；恢复快照后必须 `imgSyncRowRefs()` |
| 裁剪几何 | `imgCropRect(entry, crop)` | 比例（原图/1:1/4:3/16:9/3:4）→ 最大内接矩形 → zoom 缩小窗口 → ox/oy 平移（±1 贴边，自动限幅） |
| 渲染 | `canvas.js drawRowImage` | 三模式共用变换管线（大小/角度/拉伸/偏移/阴影）；`image.whiteTransparent` 开时走 `imgChroma` 色度键缓存 |
| 面板 | `imagePane.js mountImagePane` | 打开/更换、进度条、剪裁后预览、剪裁器（缩放滑块·快速比例·拖拽·滚轮·双击复位） |
| 编码 | `imgEncodeCanvas(c, quality)` | 导出共用：PNG 无损优先；PNG dataURL 超 `IMG_PNG_MAX`（256KB）退 WebP q0.95 近无损；**不用 JPEG 兜底**（无 Alpha 会压黑透明底） |
| 预设往返 | `snapForExport`（导出）/ `registerPresetImages`（导入） | 导出前若涉及**已裁切**图片，先询问"原始 / 剪裁后"（见下）；导入注册进仓库改为引用，解码失败或缺失 → 占位"图片缺失" |

**导出图片的两种模式（V2.14，需求 2.1）**——这是本模块最容易踩的坑：

| 模式 | 写入 JSON 的数据 | 剪裁参数 | 导入后 |
|---|---|---|---|
| `original`（默认） | `imgFullDataURL`：整张原图（上限 `IMG_MAX_EDGE`、无损优先编码） | **保留** | 与导出前逐字段一致 |
| `cropped` | `imgCropDataURL`：只有裁切窗口内的像素（窗口 ≤ 上限时不缩放） | **必须清零** | 只有一次裁切（清零后 = 不裁切） |

> 注意，**不可**把"剪裁后的像素"与"剪裁参数"一起导出——导入时新图已是裁切结果，再套一次参数就是二次裁切，效果必然不一致。
> 三条出口（预设导出 / 下载 JSON / 复制 JSON）都必须走 `snapForExport`，它先在深拷贝上操作，**不改动会话状态**。
> `imgIsCropped()` 用"实际裁剪窗口 vs 整图矩形"判定是否需要提示（zoom=1 且比例为原图时，平移参数不产生实际裁切，不提示）。

**往返保真的三个条件（V2.16）**——要让"剪裁 → 导出 → 导入"后画面与导出前一致，三处必须同时成立：

1. **几何**：裁剪参数（比例/zoom/ox/oy）是**等比量**，与像素分辨率无关，因此换算窗口不需要任何"分辨率补偿"；`cropped` 模式清零参数即可（V2.14 已保证）。
2. **像素**：导出编码上限（`imgCropDataURL` / `imgFullDataURL` 的 `maxEdge`）**必须与入库上限 `IMG_MAX_EDGE` 同值**。任何更小的固定上限都会把窗口降采样：例如窗口 307×307 被压到 256×256 后只剩 69.4% 的像素，导入放大到 512/1024 画布即为肉眼可见的模糊。
3. **编码**：优先无损（PNG），退化路径也必须近无损（WebP q ≥ 0.9）；有损压缩与降采样叠加会让"恢复出的画面"与"导出前的画面"出现可辨差异。

> 注意，**不要**给 `imgCropDataURL` / `imgFullDataURL` 传更小的 `maxEdge`（如 256），也**不要**在 `imgLoadData` 里跳过降采样——前者让每一轮导出都掉清晰度，后者会让外部大图以原始像素入库、再导出时被 1024 上限压缩，于是每往返一轮劣化一档。

**注意**：仓库 id 只在本次会话有效，导入外部预设时必须**先作废旧 id** 再按数据重建，否则可能命中同名的另一张图。

### 4.11 形状与外框（需求 三.1，V2.17）

**形状是"背景"本身**：形状非"无"时，`drawIcon` 先画形状（轮廓 + 边框 + 形状阴影）并**不再铺白底**——形状之外的区域保持透明，圆形/圆角/星形才不会被白底补成方块；形状为"无"时维持原逻辑（未勾选透明 → 白底，勾选 → 透明，需求 1.8）。

**参数是全局唯一的**：按钮、滑块、取色器写在 `bgParams`（`schema.js` 的 `BG_PARAM_DEFS` 注册键，前缀 `shape. / border. / shapeShadow.`），与行参数 `rows[i].params` 完全分离。`interactions.js` 的 `bindPaneInteractions` 按"键在 BG_PARAM_DEFS 里 → 写 `bgParams`，否则写行参数"分派，因此**背景参数天然没有"逐行联动"**（没有其它行可联动）。

| 关注点 | 位置 | 规则 |
|---|---|---|
| 形状种类 | `bgParams['shape.kind']` | 无 / 圆形 / 圆角方形 / 正3~8边形 / 3~8角星；三组 chip 互斥选择 |
| 尺寸 | `shapeOutline` | **外接框长边 = 尺寸% × 画布边长**（默认 100% 即长边等于画布），拉伸与方向在其后施加 |
| 方向 | 同上 | 0° = 形状最下面的边水平；正值顺时针；绕形状包围盒中心旋转 |
| 弧度 | `shapeUnitPoints` | 0~100%：原始形状与"内切圆"之间按极角线性过渡；**100% 即圆形**（圆角方形/边形/角星通用） |
| 内角（角星） | 同上 | 尖角角度；0° → 点集为空、形状消失（面板红字提示）；上限 `floor(180 − 360/n)`，到上限时内顶点落在正 n 边形边中点 → 退化为正 n 边形；越界值按上限截断 |
| 边框 | `drawBgShape` | 描边宽度 = **2×边框宽度**、随后被内部填充盖住内半 → 视觉上**只向形状外延伸**；宽度以 256 画布为基准等比缩放（`width × S / 256`），预览与各导出尺寸观感一致 |
| 形状阴影 | 同上 | 投影与边框一起投（无边框时以轮廓投）；多色分块填充不再叠加阴影，避免阴影重复加深 |
| 内部填充 | 同上 | 轮廓内铺满填充色块，全部布局见 4.13（矩阵/饼图、层数、层间层内比例、方向、偏移、拉伸） |
| 内容裁切 | `bgShapeClip`（`drawRow` 内调用） | `style.clip = false`（"显示超出形状范围的内容"取消勾选）时，行内容按形状轮廓裁切（需求 3.5） |
| 填满按钮 | `shapeFillSize` | 取**不超出画布**前提下的尺寸最大值：按 `size=100` 探测外接框后以 `min(S/宽, S/高)` 缩放（V2.23 起，此前为"撑到盖住画布"的上界，会让形状越出画布）；启用边框时再预留 2×边框宽度，使形状 + 外圈边框整体不越界 |

**默认值（V2.23 起）**：`shape.kind = 圆角方形`、`shape.round = 30`——即开箱可见形状（默认形状非"无"故不再铺白底，形状之外透明）。注意这与需求 1.1.2 的"弧度默认 0"不一致，属用户指定调整，见 Changelog V2.23。

**几何约束（需求 1.1.3）**：所有形状必须是**对中心可见的星形域**——任意方向从中心出发只与轮廓相交一次。这样轮廓天然封闭连续、边线不交叠，`shapeRadiusAt` 的极点采样与 `ctx.clip` 才可靠。新增形状种类必须保持该性质。

> 注意，采样与描边/裁切共用同一份轮廓点（`shapeOutline` 一次求值多处复用：绘制、包围盒、填满求解），因此不存在"填充区域与裁切区域不一致"的可能；改动形状几何只需改 `bgshape.js`。

### 4.12 本地预设（需求 2.1 第 3 条，V2.18 引入；V2.21 简化为单一来源）

**唯一来源：`presets/index.js`**（可直接手工编辑）。它是一个普通 JS 文件，把预设清单挂在
`window.KICON_LOCAL_PRESETS = { files: { "<条目名>": <导出预设 JSON 原文> } }` 上，由引导器以
`<script>` 加载（**http 与 file:// 都允许脚本加载**），启动后由 `loadLocalPresets()` 读取。

| 环节 | 规则 |
|---|---|
| 添加预设 | 把「导出预设」的 JSON 内容**原样**粘成 `files` 下一个条目（JSON 是 JS 对象字面量的子集，双引号/null/true/false 照原样保留）；改完刷新页面即生效，无构建步骤 |
| 条目键 | 仅用于标识与去重；预设名优先取内容里的 `name` 字段，缺省用条目键（自动去掉 `.json` 后缀） |
| 单条装载 | `makePresetFromData(item, 键名, diffs)` → 补齐缺失字段、注册内嵌图片进会话仓库、`imgRetainSnap(preset,'preset:')` |
| 触发时机 | init 末尾 **800ms** 后异步执行（排在 400ms 的欢迎 toast 之后，否则加载完成提示会被欢迎语覆盖，用户以为没加载）；加载完成后再 `renderPresets()` |
| 容错 | 单个条目不是对象 → `console.warn` 跳过，其余照常加载；**整份文件语法错 → 一条都读不到**（应用仍能启动，因该步骤是"可选步骤"），控制台诊断会提示排查语法 |
| 提示 | 有成功才 toast（`已加载 N 条本地预设（跳过 M 条）`）；无论成败都输出 `[本地预设] 来源：presets/index.js；成功 N 条，失败 M 条`；清单为空时提示"把导出预设的 json 内容粘成 files 下的条目" |
| 空态 | 预设网格为空时渲染一行提示，指向「保存为预设」与 `presets/index.js`（V2.21） |
| 内置预设 | **无**。启动时预设列表为空，内容一律来自"保存为预设"、文件导入或 `presets/index.js` |

**为什么不是"每个预设一个 json 文件"**：需求 2.1 第 3 条原文如此，但浏览器**禁止 `file://` 页面用
`fetch`/XHR 读取本地文件**，而本项目的硬要求是"双击 `index.html` 即可用"。曾经的做法是"json 目录 +
生成器生成内联副本"，但那样有"两份来源可能不同步 + 改完 json 必须重跑生成器"的负担。V2.21 按用户
决定改为**只留单一 JS 清单**：http 与 file:// 一条路径、零生成步骤，代价是放弃逐文件 json 结构、
且一处语法错会影响整份文件。

> 注意，**不要**另起一套预设构造逻辑：文件导入与本地清单必须共用 `makePresetFromData`，否则会出现
> "导入的预设登记了图片引用、本地清单加载的没登记"这类不一致（需求 六.1 要求每条预设都持引用）。

### 4.13 填充数量与布局（需求 三.2，V2.22 新增；V2.23 层内比例改为逐层独立）

**参数模型**：`fillParams`（`state.js`）——键前缀 `fill.`，与形状参数一样全局唯一，注册于 `schema.js` 的 `FILL_PARAM_DEFS`。除标量参数外还有**三组数组参数**（长度由 `syncFillArrays()` 按"色块数 / 层数 / 布局形式"校准，保留已有值、只补缺失项）：

| 键 | 含义 | 长度 |
|---|---|---|
| `fill.layerRatios` | 层间比例（%）：矩阵 = 层间横线位置；饼图 = 环半径分界 | 层数 − 1 |
| `fill.inRatios` | 层内比例（%）：**每层一组、按层顺序拼接**——矩阵 = 该层竖线位置（k−1 条）；饼图 = 该层角分界（k 条）。每层在数组中的 `offset/count` 由 `fillLayoutModel().groups` 给出 | 各层之和 |
| `fill.angles` | 方向（°）：饼图且层数 ≥ 2 → 每层一个；其余 → 1 个 | 见左 |

**层划分**（`fillLayerSizes`）：N 个色块分 L 层，取整除、余数分给最外层/最上层（需求 2.2）；层数上限 = 当前填充数量，填充数量降低时层数跟随降低（需求 2.3）。

**几何与"必定铺满"**（`paintFillPattern`）：
- 局部坐标系 = `R(−θ)·((P − C) / (sx, sy))`，在局部坐标下取**轮廓点的极值**（`fillExtentOf` 得 `hw/hh/r`）作为图案的覆盖范围；
- 矩阵布局：以 `hw/hh` 为边界画 `层数 × 每层色块数` 个矩形（相邻色块 +0.5px 消除抗锯齿细缝）；
- 饼图布局：以 `r` 为最外半径画同心环扇区（`fillRadii` 把层间比例映射为 **0…R 的半径**，与矩阵的"−half…+half 轴向位置"映射不同——这里曾写错，见下）；
- 因为覆盖范围由轮廓反算，**任意层数/比例/方向/偏移/拉伸组合下色块都必然铺满形状**（需求 2.2 末句），分界线取极值时对应层/色块面积归零（该层消失），其余部分继续铺满，不会出现空洞。

**多分界线共享滑轨**（`multiSliderHTML` / `bindMultiSliders`）：手柄数量 = 分界线数量，同一条滑轨上多手柄；拖拽按左右邻居夹取保证升序不交叉；配套参数输入框（1 位小数显示）+ 均分按钮。**层内比例每层一条滑轨**（V2.23 起）：每条滑轨带 `data-ms-offset`，只读写 `fillParams['fill.inRatios']` 中属于该层的那一段（夹取边界也限定在本段内，首尾以 0 / max 为界），因此各层互不影响；`fillLayoutModel().groups` 是"层 → 段"的唯一依据，界面标签直接写"层内比例 · 层n"。**均分公式分两类**：矩阵的层间/层内比例、以及饼图的层间比例（环半径）取"两端留边"的 `fillEqualRatios(n) = (i+1)/(n+1)×100`；饼图的层内比例（角分界线）取"首尾相接"的 `fillEqualAngles(k) = i/k×100`（首项为 0）。方向滑轨不配"均分"（角度均分无意义）。

**布局形式切换的换算式**（`convertInRatios`）：矩阵与饼图的层内比例语义不同（矩阵 = k−1 条竖线位置、各列跨满 0~100；饼图 = k 条首尾相接的角分界），因此切换布局形式时**必须换算而不是平移数组**——矩阵→饼图在前面补 0（各段跨度一一对应），饼图→矩阵去掉首条角分界、其余减去它（跨度不变，末列自动接上剩余跨度）。换算**逐层进行**（每层新旧分界线数相差 1），两式互逆，反复切换布局形式可原样来回（参数不丢，需求 2.1）。布局形式的芯片逐片带 `data-val`（`inlineChips(..., { values: [...] })`），绑定读 `dataset.val`。

**接线**：`interactions.js` 的 `writeGlobal` 按 `isFillKey/isBgKey` 分派到 `fillParams`/`bgParams`；带 `data-resync="fill"` 的参数（目前是 `fill.layers`）变化后调用 `syncFillArrays()` 并重渲染本模块；`topbar.js` 的填充数量芯片同步层数上限；快照/恢复/预设缩略图都纳入 `fill` 字段。

> 注意，饼图的"层内比例"是**首尾相接的 k 条角分界线**，均分必须用 `fillEqualAngles`（i/k×100、首项 0）；若沿用矩阵的"两端留边"公式，默认值与"均分"按钮会给出"k−1 个等宽扇区 + 1 个双倍宽扇区"，与需求 2.3"默认也是均分"相悖。同理，切换布局形式时必须走 `convertInRatios`：直接沿用旧数组会让两条分界线重合，出现"一个 0 宽扇区 + 一个双宽扇区"。
> 注意，饼图的层间比例必须是"半径分界（0…R）"，不能沿用矩阵的"轴向位置（−half…+half）"映射——曾把两者混用，导致 50% 时分界线落在 R 之外、外层整片消失（该错误已修，单测与浏览器像素实测均覆盖：六色两层饼图内环/外环各 3 色、极值下内外层分别消失）。
> 注意，`syncFillArrays` 收缩数组时**保留已有值**（需求 2.1：数量增减不重置参数），因此"六色一层 → 两层"后层内比例仍是原来的值（各层取到数组对应段），列宽并不等分；这是**设计行为**，不是渲染错误。
> 注意，层内比例自 V2.23 起**逐层独立**（每层一条滑轨、各占 `fill.inRatios` 的一段），与需求 2.3 原文"各层色块数相同时共享一组分界线"不同，属用户指定调整（见 Changelog V2.23）。由此带来两条纪律：`syncFillArrays` 对层内比例必须**按段升序**（整段排序会把不同层的值混到一起），`convertInRatios` 也必须**逐层换算**。

### 4.14 填充边界（需求 2.3 标签"填充边界"，V2.24 落地）

**参数**（`FILL_PARAM_DEFS` → `fillParams`，键前缀 `edge.`）：

| 键 | 含义 | 范围 / 默认 |
|---|---|---|
| `edge.width` | 过渡宽度（% × 画布边长）：0 = 硬边界、无过渡 | 0~100，默认 0 |
| `edge.shape` | 边界形状：直线 / sin / tan / 波浪 / 锯齿 | 默认 直线 |
| `edge.A` | A 振幅（sin/tan）/ 高度（锯齿·波浪），% × 画布边长 | 0~50，默认 10 |
| `edge.W` | ω：sin/tan 为"横跨画布的完整周期数" | 0.1~10（步进 0.1），默认 2 |
| `edge.tooth` | ω：锯齿的单齿宽度，% × 画布边长 | 1~100，默认 12 |
| `edge.wave` | ω：波浪的单半圆宽度，% × 画布边长（V2.27） | 1~100，默认 20 |
| `edge.phi` | φ 相位（°）；波浪下以 180° = 半个波长平移 | −180~180，默认 0 |
| `edge.k` | k 垂直偏移，% × 画布边长（波浪无 k） | −50~50，默认 0 |
| `edge.style` | 过渡样式：单色 / 渐变 / 加深 / 变浅 / 透明 | 默认 渐变 |

**位移函数**（`edgeOffset(t, S, cfg)`）：`t` 是边界上的位置参数，**原点在形状中心**（需求 2.3）——矩阵竖向分界取局部 y、横向分界取局部 x；饼图径向分界取半径 r、环分界取沿环的弧长。`d = A·f(2π·ω·t/S + φ) + k`（f = sin/tan）；锯齿为三角波（t=0 为齿峰、半齿为谷，因而原点落在中心）。

**波浪形状**（V2.27，需求 2.3 扩展"默认参数下是连续的半圆形组成的曲线"）：单拱宽 `W = ω%×S`、高 `A%×S`，拱形纵剖比例 `s∈[0,1] → √(4s(1−s))`（拱顶 ±A、拱脚过基线且切线竖直），**相邻半圆上下交替**；φ 以 180° = 半个波长平移（上下翻转）；只有 A/ω/φ 三个参数、**无 k**。默认 A=10%、ω=20%（=2×A）时每个拱**恰为半圆**，A≠ω/2 时为半椭圆。`edgeFramePoints` 对波浪按"完整波长（上+下两拱）数取整"铺波，保证闭合接缝无台阶。

**tan 只渲染一条边界曲线**（V2.27 起；V2.28 修"三段直线"）：tan 在每个渐近线处 `+∞ → −∞` 跳变，按 `y=Atan(ωx+φ)+k` 全周期渲染会把分界线撕成多条冲出画布的线段。因此 `edgeWave` 对 tan **只取过中心的主值分支**，幅度由最终 `clampEdge(±10×画布)` 兜底（渐近线方向的饱和段全部在画布外 10 倍处）——可见范围内整条边界都是 `y=Atan(ωx+φ)+k` 的**一条连续曲线**（中间较陡、向两端渐平并伸出形状两侧；ω 越小曲线越平缓、覆盖越宽，A/φ/k 语义不变）。V2.27 曾把自变量限幅在 ±45°（|d|≤A），可见范围出现"平线−陡坡−平线"的三段直线观感，V2.28 改为整段主值曲线。

**安全保护**（需求 2.3 的"参数范围限制 + 渲染截断"）：ω 取正的下限（不除零）；tan 自变量截在渐近线前 1e−6 rad（防 `Math.tan` 返回 Infinity），可见曲线由 ±10×画布截断兜底（见上）；最终位移一律 `clampEdge` 到 ±10×画布且永不返回 NaN；饼图**径向分界**在靠圆心的 1/4 画布内把振幅线性收敛到 0（否则 r→0 时角偏移 d/r 发散，扇区会在圆心附近互相穿越、露出未着色区域），且角偏移 `d/r` 夹取在 ±0.75π 内（V2.28：tan 的 d 可达 ±10×画布，不夹取会让射线原地缠绕多圈、扇区多边形撕碎；两条射线的偏移相同 → 永不交叉）。

**绘制**：色块改用"采样多边形"——`edgeCurveV/H/Ray/Ring` 把分界线采样成曲线，`cellPolygon`/`sectorPolygon` 拼成闭合区域（四个角取两条边界候选点的中点，使相邻色块共用同一角点 → 无缝）。**过渡带**（`paintEdgeBand`，V2.27 重写）= 把边界曲线沿**逐点法向**左右各扩 w/2 张成"带状多边形"，过渡宽度沿**所选边界形状**展开而非沿原始直线（用户要求）；样式：单色/加深/变浅 = 带状整体填充两端色的中值色及其明度加减；渐变 = 逐段用该段法向的线性渐变（每段 1px 同渐变描边盖住段间细缝）；透明 = 仍沿曲线 `destination-out` 描边擦成透明缝。法向朝向由 `axis` 统一翻到"colA 在 +n 侧"（与该接缝的位移轴同侧；闭合环逐点取"背离圆心"）。

**只作用于内部接缝**（V2.26 起，需求原话"只调节填充之间的一条直线"）：边界形状只位移**色块之间/层与层之间的分界线**——矩阵的最左/最右竖边、最上层上边、最下层下边，饼图的最外环外弧、最内环内弧（半径 0），以及单色层那条不成缝的半径，一律**保持直线/正圆**（`straightV`/`straightH`、`edgeCurveRing(..., plain)`、`edgeCurveRay(..., plain)`）。这样填充的外缘始终贴合形状轮廓；若把外缘也位移，波形向内的一侧会与轮廓之间露出未着色空隙（实测双色 + sin 时矩阵露出 13%、饼图露出 20% 的形状面积）。以双色矩阵为例，最终效果正是"以形状中心为原点、把两色之间的直线分界线当作 x 轴，在其上画一条 sin 线作为新分界线"。

**面板**（`panes.js` 的 `fillEdgeShapePaneHTML` / `fillEdgeTransitionPaneHTML`，V2.28 按需求 2.3/2.4 把"填充边界"拆成两个标签）：**「边界形状」**= 边界形状芯片（直线 / sin / tan / 波浪 / 锯齿）+ 与形状对应的参数行（直线无、sin/tan 四个、波浪三个、锯齿两个）+ **「包含形状外框」复选行（`edge.frame`，默认关闭）**；**「边界过渡」**= 过渡宽度行 + 过渡样式芯片。显示名直接是 A / ω / φ / k（需求 2.3：显示这四个边界参数，而不是让用户输入字母；波浪按需求只有 A 高度/ω 宽度/φ 偏移）。芯片逐片带 `data-val`，由 `bindFillParamChips` 绑定（形状变化会增减参数行 → 重渲染本模块）。

**是否包含形状外框**（`edge.frame`，V2.25 起，**默认关闭**）：关闭时边界形状只作用于**内部填充之间的分界线**（外框保持原样）；开启后 `shapeOutline` 末尾会调用 `edgeFramePoints(pts, S)`，把轮廓本身沿**外法向**按波形位移——于是框线（border）、内容裁切（`bgShapeClip`）、填充覆盖范围与外接框（`fillExtentOf` 的输入、`shapeFillSize` 的求解）全都随波形变化。闭合轮廓与"分界线"不同，因此该函数做了三件事：① 先按 ~2px 重采样（形状自带采样点远稀于一个波形周期）；② 周期数 / 齿数 / 波浪的完整波长数**取整**后再铺波，保证 `d(0) = d(L)`（否则轮廓起点会有一道台阶）；③ 位置参数取**沿轮廓的弧长**，原点为"轮廓上最靠近正上方（−90°）的点"（与饼图环分界同一约定）。形状为"无"或边界形状为"直线"时原样返回。

> 注意，**填充的外边界不参与位移**（V2.26）：边界形状只作用于内部接缝；外缘（最左/最右/最上/最下、最外环外弧、单色层半径）必须保持直线或正圆，否则波形与形状轮廓之间会露出未着色空隙。新增布局/新画法时，凡"贴着形状轮廓的那条边"都要走 plain/直边分支。
> 注意，采样密度按曲线跨度取 ~2px 一段（`edgeSteps(span)`，下限 24、上限 240 段；形状为"直线"时直接返回 2 段，不为直边白采样）：锯齿的折点、sin/tan 的峰谷与**波浪的拱脚**（切线竖直，折线在该点最多有 ~1px 对角线切角与描边杂色，肉眼不可见）都靠采样点之间的直线连接，间隔太稀会把峰值"削平"（实测 5px 间隔下齿谷被削掉约 8px），因此**不要**为了省算力调稀。
> 注意，过渡带必须复用色块所用的那一份采样曲线（同一个 `edgeCurveV/H/Ray/Ring` 调用），否则带与色块边界会错位；V2.27 起带按**逐点法向**左右各扩 w/2（沿所选边界形状扩展），渐变逐段锚在"段中点法向"上，故峰谷处的带色与理想中值色允许 ±几位的偏差（判据用色距而非精确相等）。
> 注意，这几行参数是全局唯一的背景类参数，因此**不提供**"逐行联动"链条（同形状与外框的参数，见 4.11；偏离说明见 Changelog V2.24）。
> 注意，`edge.frame` 开启后外框会变形，因而**外接框中心也会偏移**——内部填充的分布基准是该外接框（与 V2.22 起"填充以形状外接框为中心"的规则一致），所以开框后内部色块的分界位置会随外框一起移动，属预期行为，不是取值错乱。
> 注意，"包含形状外框"是**复选（bool）参数**：`FILL_PARAM_DEFS` 里的 `type: 'bool'` 会被 `normalizeFillParams` 按真值原样保留；若新增别的 bool 参数，别让它落进"数值分支"（那会被 min/max 夹取逻辑丢掉，见 V2.25 的修复）。

### 4.15 内部填充：色块的 纯/渐/图 背景模式（需求 三.3，V2.28）

**模型**：`fillModes[i]`（'纯'|'渐'|'图'）+ `fillColors[i]`（纯色值，各模式通用的回退色）+ `fillStyles[i] = { grad:{from,to,type,angle}, image:{id,name,w,h,crop,size,fx,fy} }`（`makeFillStyle` 懒初始化）。**每个色块独立切换模式**；`image.id` 走会话图片仓库，引用键前缀 `fill:`（`imgSyncFillRefs` 在恢复快照/换图/移除后调用），快照/撤销/预设经 `imgRefsOfSnap`（本就扫描 `snap.fills[].image.id`）自动持引用。

**渲染**：`paintFillPattern` 内部把 `fillColors+fillModes+fillStyles` 组装成每色块描述符 `{color, grad?, image?}`，`fillPaintOf(p, c, poly)` 解析为实际 paint：渐变按**色块多边形包围盒**建立（线性 0°=自下向上、渐变线长度按包围盒投影取全覆盖值；径向从中心到半对角线），图片把剪裁窗口离屏画布（`fillImageCanvasOf`，按 id+crop 缓存）做成 `createPattern('repeat')` 并 `setTransform`（size% = 覆盖包围盒基准的缩放、fx/fy% = 平移）。渐变参数为空或图片缺失**逐块回退纯色**，任何状态不露底；`fillPolygon` 的 1px 同 paint 描边继续盖抗锯齿缝。

**面板**（`fills.js` 的 `fillGradPanelHTML`/`fillImgPanelHTML` + `interactions.js` 的 `bindFillGradControls`/`bindFillImgControls`）：渐变 = 起止色（取色器+HEX+建议）+ 线性/径向芯片 + 角度滑块；图片 = 上传/更换/移除 + 剪裁后预览（拖动/滚轮/双击）+ 大小/位置滑块 + 展开式剪裁（比例芯片 + 剪裁缩放）。per-block 参数**不注册** `FILL_PARAM_DEFS`，用专用标记（`data-fg-*`/`data-fi`/`data-fb`/`data-fc`）+ `bindFillNumRow` 专用滑块行；通用滑块循环跳过 `[data-fb]`。**模式切换必须 `scheduleDrawIcon()`**（渐→纯 否则画布仍显示旧渐变）。

**快照/预设**：`snapshotState().fills[] = {mode, color, grad, image}`（image 含 id → 撤销/历史引用自动生效）；`snapForExport` 对填充图片导出**整图 dataURL + 保留剪裁参数**（渲染时才取窗口，导入不二次裁切），`registerPresetImages` 用 `imgLoadData` 重新入库回填 id；快照缩略图（`renderSnapshotThumb`）同步还原 mode/grad/image。

## 5. AI Agent 编辑指引

### 5.1 "想改 X，去哪个文件"

| 需求 | 文件 | 说明 |
|---|---|---|
| 新增/修改可渲染参数 | `js/schema.js` 注册 → `js/panes.js` 或 `js/content.js` 加 UI → `js/canvas.js` 渲染读取 | data-name/data-pkey 必须等于参数键；联动与快照自动生效 |
| 新增模式专属数据（如 FA 图标名、图片引用） | 行对象添加独立字段（`makeRow`/`makeImageState`）+ `normalizeRow` 兜底 + 对应模式渲染/UI 读写 | **禁止**借用其它模式的字段承接（需求 四.1 例2） |
| 图片模式相关（上传/裁剪/引用） | `js/images.js`（仓库与几何）+ `js/imagePane.js`（面板）+ `js/canvas.js`（`drawRowImage`） | 行内只存 `image.id`；新引用方必须 `imgRetain/imgRelease` |
| 改图片导出分辨率/编码 | `js/images.js` 的 `imgEncodeCanvas` / `IMG_MAX_EDGE` / `IMG_PNG_MAX` | 导出上限必须与入库上限同值（见 4.10"往返保真的三个条件"） |
| 形状几何/绘制（种类、采样、边框、填满） | `js/bgshape.js`（几何与绘制栈）+ `js/panes.js` 形状 pane + `js/interactions.js`（chip/填满） | 参数键必须在 `BG_PARAM_DEFS` 注册并走 `bgParams`；新形状必须是对中心可见的星形域（见 4.11）；"填满"只允许产生**不超出画布**的尺寸（`min` 比例 + 预留边框） |
| 参数滑块/数字框/蓝色进度条 | `js/interactions.js` 的通用滑块循环（`upd()`）+ `css/components.css` 的 `input[type=range]{--fill}` | 任何"改值的入口"（input/change/重置/输入框）都必须调用 `upd()`，否则数字框与蓝色条不会跟随（V2.23 修） |
| 新增背景（全局）参数 | `js/schema.js` 的 `BG_PARAM_DEFS` → `js/panes.js` 加 `paramRow({key})` → 渲染处读 `bgParams` | 快照已由 `snapshotState` 的 `bg` 字段整体覆盖；`normalizeBgParams` 负责补键 |
| 内部填充色值 | `js/state.js` 的 `fillColors`（唯一来源） | 形状内部填充、色块缩略、快照三处都从这里派生，勿再写死颜色 |
| 填充布局/铺满（数量、层数、层间层内比例、方向、偏移、拉伸） | `js/fillLayout.js` 的 `paintFillPattern` / `syncFillArrays` / `convertInRatios` / `fillLayerSizes` + `js/panes.js` 的 `fillLayoutPaneHTML` + `js/interactions.js`（`bindMultiSliders`/`bindFillLayoutChips`） | 参数必须注册在 `FILL_PARAM_DEFS` 并走 `fillParams`；三组数组参数一律经 `syncFillArrays` 校准，勿在各处手写长度；层内比例是**逐层一条滑轨**，读写必须带 `data-ms-offset`（见 4.13）；**新增"多选一"芯片若要改状态，必须在 HTML 上带逐片取值**（`inlineChips` 的 `opts.values` → `data-val`，绑定读 `dataset.val`） |
| 填充数量芯片与层数上限 | `js/topbar.js`（数量芯片）+ `js/fillLayout.js` 的 `fillLayerSizes` | 数量是可撤销状态（`fillCount`）；层数上限 = 当前数量，数量下调时 `fill.layers` 必须跟随夹取 |
| 填充边界（边界形状 sin·tan·波浪·锯齿 / A·ω·φ·k / 是否包含形状外框；过渡宽度 / 过渡样式） | `js/fillLayout.js` 的 `edgeOffset` / `edgeFramePoints` / `edgeCurveV·H·Ray·Ring` / `paintEdgeBand` + `js/panes.js` 的 `fillEdgeShapePaneHTML`·`fillEdgeTransitionPaneHTML`·`edgeShapeParamsHTML` + `js/interactions.js` 的 `bindFillParamChips` | 参数须注册在 `FILL_PARAM_DEFS`（前缀 `edge.`）；形状/样式芯片必须带 `data-val`；位移函数与采样曲线是唯一来源，不要在 painter 里另写一套（见 4.14）；V2.28 起「边界形状」「边界过渡」是两个标签 |
| 纯色模式（取色器/HEX/HSL/颜色建议） | `js/fills.js`（`fillSwatchOf`/纯色面板）+ `js/interactions.js` 的 `bindFillSolidControls` + `js/builders.js` 的 `fillAdvicePalette` | 四个入口都只写 `fillColors[i]` 再重绘，勿各自维护颜色副本 |
| 色块渐变/图片背景模式（需求 3.2.2/3.2.3） | `js/fills.js`（`fillGradPanelHTML`/`fillImgPanelHTML`/`fillStyleOf`/`makeFillImage`）+ `js/interactions.js` 的 `bindFillGradControls`/`bindFillImgControls`/`bindFillNumRow` + `js/fillLayout.js` 的 `fillPaintOf`/`fillGradPaint`/`fillImagePattern` | per-block 参数存 `fillStyles[i]`，**不注册** `FILL_PARAM_DEFS`、用 `data-fg-*`/`data-fb`/`data-fc` 专用标记；图片走会话仓库（`imgSyncFillRefs`，键前缀 `fill:`）；模式切换必须 `scheduleDrawIcon()`（见 4.15） |
| 画布边界虚线（预览 + 1:1 模态） | `css/layout.css` 的 `.canvas-edge` + `css/components.css` 的 `.modal-body canvas` | 纯 CSS 覆盖层，`pointer-events:none`；**属于界面装饰、不得进入导出**（不要在 canvas.js 里往画布上画） |
| 本地预设（`presets/index.js`，可手改） | `js/presets.js` 的 `loadLocalPresets` / `makePresetFromData` + `presets/index.js` 清单 | 条目必须走 `makePresetFromData` 并 `imgRetainSnap`；清单是**手写 JS**，改动后请确认能被解析（见 4.12） |
| 预览画布尺寸/贴合与覆盖层（辅助线、安全边距框） | `css/layout.css` 的 `.preview-stage` / `.preview-canvas-wrap` / `#iconCanvas` + `js/preview.js` 的 `applySafeMargin` | 画布显示尺寸由 CSS 决定（≠ `iconSize`），所有覆盖层尺寸必须用百分比表达 |
| 新增图片引用持有者（新列表/新缓存） | `js/images.js` 的 `imgRetainSnap/imgReleaseSnap` + 该对象的创建/销毁处 | 用稳定 uid 做引用键，勿用数组下标 |
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
7. **刷新入口不可混用**（V2.11）：内容变化只能调用 `refreshLayoutKeepGroups()`；只有视口/布局变化才可调用 `refreshLayout()`。**禁止**在内容变化路径上调用 `relayoutAllModules()` 重算分组，否则标签会在标签组之间跳位。
8. **pane 重建的副作用**：轻量刷新不再顺带重建其它模块 DOM。若某模块的 pane 内容依赖被修改的状态（如 `fill` 依赖 `fillCount`），必须在该状态的修改处**显式** `rerenderModule('模块名')`，不可依赖旧版"列全量重建"的副作用。
9. **数据保留**（V2.12，需求 四.1）：任何"切换/增减选项"的操作都不得清空参数。切换类操作只改可见性与当前选择；行数据一律常驻 `rows[9]`；跨模式字段相互独立；快照/恢复/导入必须经 `normalizeRow`（只补缺失键，不覆盖已有值）。
10. **图片只存引用**（V2.13，需求 六.1）：图片数据只允许存在于 `ImageRepo`。行、预设、下载历史、撤销快照都只存 `image.id`；**新增任何持有方都必须在创建时 `imgRetain`、销毁时 `imgRelease`**，否则图片不会被释放（泄漏）或被提前释放（渲染空白）。恢复快照后必须调用 `imgSyncRowRefs()`。导入外部预设时，仓库 id 一律先作废再按数据重建。
11. **图片面板的选择器纪律**：`imagePane.js` 生成的 DOM 不得使用 `data-name`/`data-pkey`/`.chip-row`/`[data-group]`，因为这些会被 `bindPaneInteractions` 委托（导致参数串写）；剪裁器的滑块自行绑定。
12. **图片分辨率的两个标准必须一致**（V2.16）：入库上限 `IMG_MAX_EDGE` 与导出编码上限是**同一个值**。`imgLoadData`（预设导入）与 `imgLoadFile` 都必须按它降采样；`imgCropDataURL` / `imgFullDataURL` 的 `maxEdge` 默认值必须取自该常量。禁止在调用处传入更小的上限，也禁止绕开 `imgEncodeCanvas` 自行编码（JPEG 会丢透明通道）。
13. **背景参数走全局通道**（V2.17）：`shape./border./shapeShadow.` 前缀的键必须在 `schema.js` 的 `BG_PARAM_DEFS` 注册，读写一律经 `bgParams`（**禁止**塞进 `rows[i].params`，那会让 9 行各存一份互不相干的形状）。新增背景状态必须同时扩展 `snapshotState` 的 `bg` 与 `restoreState`。形状轮廓必须保持"对中心可见的星形域"，且绘制、包围盒、填满、内容裁切共用 `shapeOutline` 同一份点集。
14. **画布显示尺寸 ≠ `iconSize`**（V2.18）：预览画布由 CSS 决定显示尺寸（预览框内最大正方形，`.preview-canvas-wrap` 的 `min(100%,100cqh)` + `aspect-ratio:1/1`），`iconSize` 只决定画布的像素分辨率与导出尺寸。因此画布之上的覆盖层（安全边距框、辅助线）**必须用百分比**表达尺寸：安全边距框只允许由 `preview.js` 的 `applySafeMargin()` 写入 `style.inset`（百分比），禁止任何模块再写 px 内缩。
15. **新增预设来源必须复用同一构造路径**（V2.18）：文件导入与 `presets/` 目录加载都走 `makePresetFromData` + `imgRetainSnap(preset,'preset:')`，不要在别处拼 `{ uid, name, snap }`（否则图片引用不会登记，撤销/预设切换会提前释放图片）。
16. **改版本号必须同步 `index.html` 的 `APP_VER`**（V2.19）：引导器用它拼 `?v=` 查询串破缓存；只改 `.ver` 徽标会导致用户刷新后仍拿到旧模块（表现为"新功能没生效"）。另外**不要在启动流程里灌入"示例预设"**——预设列表的内容只来自用户操作、文件导入与 `presets/` 目录。
17. **填充参数走全局通道**（V2.22）：`fill.` 前缀的键必须在 `schema.js` 的 `FILL_PARAM_DEFS` 注册，读写一律经 `fillParams`（**禁止**塞进 `rows[i].params` 或 `bgParams`）。三组数组参数（`fill.layerRatios`/`fill.inRatios`/`fill.angles`）的长度只能由 `syncFillArrays()` 按模型校准，且**收缩时保留已有值**（需求 2.1：数量增减不重置参数）；`fill.layers` 的输入必须夹取到 `[1, 填充数量]`，数量芯片下调时要同步夹取并 `syncFillArrays()`。切换布局形式（矩阵 ⇄ 饼图）时，`fill.inRatios` **必须**经 `convertInRatios()` 换算（两者分界线语义不同，直接沿用会产生重合分界）。
18. **填充图案必须"必定铺满"**（V2.22）：覆盖范围只能由**轮廓点在该层局部坐标系下的极值**反算（`fillExtentOf`），不允许按画布边长或形状外接框的简化估算——否则旋转/偏移/拉伸后会出现露底。另外，饼图的层间比例是**半径分界（`fillRadii`，0…R）**，矩阵的层间比例是**轴向位置（`fillBoundaries`，−half…+half）**：两者**不可互用**。饼图的层内比例是**首尾相接的角分界**，其均分/默认值必须用 `fillEqualAngles`（i/k×100），不可沿用"两端留边"的 `fillEqualRatios`（见 4.13 的注意）。
19. **界面装饰不得进入导出**（V2.22）：画布的边界虚线（`.canvas-edge`、模态的 `outline`）是纯 CSS 覆盖层，与安全边距框、辅助线同级——只用于"看见画布边界"，禁止在 `canvas.js` 里画到画布上（那会被 `exportCanvas` 一起导出）。
20. **滑块的三个显示入口必须同步**（V2.23）：`input[type=range]` 的"轨道蓝色进度"由内联变量 `--fill` 驱动，数字框显示当前值；两者都只在 `upd()` 里更新，因此**任何改值路径都必须先调 `upd()`**（拖动 input、数字框 change、重置按钮、程序化回写）。只写状态不调 `upd()` 会让用户看到"数值在变、滑块与数字框不动"。
21. **"填满"只能是画布内的最大值**（V2.23）：`shapeFillSize` 用 `min(S/宽, S/高)` 求尺寸上界（`max` 会让形状越出画布），并对结果向下取整到 0.001%；启用边框时预留 2×边框宽度。**不要**改回"撑到盖住画布"的语义。
22. **边界形状与过渡带共用同一份采样曲线**（V2.24；V2.25 增补"包含形状外框"；V2.27 增波浪/过渡带逐点法向；V2.28 tan 整段主值曲线 + 饼图径向角偏移夹取）：`edgeOffset` 负责位移、`edgeCurveV/H/Ray/Ring` 负责采样，色块边界与过渡带都必须走这两个入口；采样密度由 `edgeSteps(span)` 按跨度给出（~2px 一段），**不要**调稀（锯齿折点、波浪拱脚会被削平）。位移函数必须保持截断保护（tan 主值分支 + `clampEdge` 到 ±10×画布 + 饼图径向分界近圆心振幅收敛 + 角偏移 ±0.75π 夹取），否则会出现 NaN、露底、扇区互穿或射线缠绕。过渡带（`paintEdgeBand`）必须按**逐点法向**把带沿边界曲线左右各扩 w/2（沿所选边界形状扩展，V2.27 重写），不要回退成"固定轴渐变的粗描边"——那会把渐变锚回原始直线两侧。轮廓（`edge.frame`）另外要求：重采样到 ~2px、周期/齿数/波浪波长取整保证闭合无台阶、位置参数用沿线弧长——改这三条中的任何一条都会立刻表现为"外框起点有一道缝"或"波形被削平"。**内部接缝与填充外缘**要分清：外缘（最左/最右/最上/最下、最外环外弧、单色层半径）一律不位移，否则露空隙（见 4.14 的注意）。

### 5.3 自检清单（提交前过一遍）

- [ ] `node --check js/*.js` 全部通过
- [ ] 浏览器打开无 console 报错，三栏渲染完整
- [ ] 改过滑块后：联动、撤销（Ctrl+Z）、重做（Ctrl+Y）行为正常
- [ ] 修改过状态字段：JSON 导出（下载 pane → JSON）内容包含新字段
- [ ] 窗口缩放：three→two→one 切换、合并标签、预览浮动均正常
- [ ] **标签稳定性**：切换内容行、单色⇄渐变、启用阴影等操作后，样式/形状/填充模块的标签停留在原位，无关模块不闪烁；缩放窗口时标签组才允许重新拆分
- [ ] **数据保留**：行 2 输入文本+改参数 → 行数切到 1 → 切回 2，内容与参数原样；文本模式输入 → 切 FA 选图标 → 切回文本，文本仍在；切换填充数量/行数后各选项的既有参数不丢
- [ ] **图片模式**：上传后画布显示真实图像；白色透明开关生效；剪裁器缩放/比例/拖拽/滚轮均实时反映到画布；行数切换、模式切换后图片与裁剪参数仍在；撤销/重做可回退图片更换；下载历史/预设缩略图显示真实样式；`imgStats()` 中无被遗忘的引用
- [ ] **图片导出往返**：加载图片 → 剪裁 → 导出预设（两种模式各试一次）→ 刷新页面 → 导入，画面与导出前一致（重点验证不发生二次裁切、**清晰度不下降**）：导入后图片像素尺寸应与"整图/裁切窗口"一致（窗口 ≤ 1024 时不被缩放）；平涂图标应走 PNG 无损，照片类退 WebP 且不应出现明显块状伪影。
- [ ] **形状与外框**：选 圆形/圆角方形/正3~8边形/3~8角星 后画布立即出现对应轮廓且**形状之外透明**；默认即为**圆角方形 + 弧度 30**（打开页面就可见形状，标签标题显示"圆角方形"）；"方向 0° 时最下面的边水平"；弧度 100% 变圆形；角星内角拖到 0° 形状消失并出现红字提示、拖到上限变成正 n 边形；边框只向形状外延伸且在不同导出尺寸下粗细观感一致；形状阴影只投一次影（多色填充不加深）；点"填满"后**形状外接框始终落在画布内**（旋转 45° 的方形 → 尺寸约 70.7%；启用边框时再留出边框宽度，如 256 画布 6px 边框 → 95.3%）；取消"显示超出形状范围的内容"后行内容被轮廓裁切；切形状种类/撤销重做/应用预设后形状与参数原样恢复，形状标签标题显示当前形状名；模块头"重置"清空三个标签全部参数（形状回默认的圆角方形·弧度30）、形状标签内"重置形状参数"保留所选形状只回参数默认值。
- [ ] **滑块显示跟随**（形状与外框、填充数量与布局、样式等所有参数行）：拖动滑块时**数字框与轨道蓝色进度条实时跟随**（不是松手后才变）；数字框输入合法值后滑块位置与蓝色条同步；点重置按钮后三者同时回到默认值；同一行在三处（滑块/数字框/状态）永远一致。
- [ ] **填充数量与布局**：填充数量 1~6 与层数 1~数量 的任意组合下画布都**恰好铺满形状、无露底、无细缝**；矩阵布局的色块沿层排列（第 1 层在最上），饼图布局为同心环（第 1 层在最外）；点击「布局形式」芯片能真正切换布局（芯片高亮与滑轨标题同步更新），切换后饼图各扇区仍等分、来回切换后层内比例原样返回（矩阵→饼图→矩阵不改数值）；**层内比例每层一条滑轨**（标签"层内比例 · 层n"，饼图两层的层1 标注"最外环"），拖动某一层的手柄只改该层、另一层数值不动，点该层的"均分"也只改该层；拖拽分界线滑轨时手柄**不交叉**（被左右邻居夹取），比例拖到极值时对应层/色块面积归零、其余部分继续铺满；"均分"把分界线恢复等分（饼图整圆等分、矩阵按两端留边）；改方向和偏移后图案仍在形状内铺满；拉伸把图案连同形状一起缩放；层数/数量增减后既有比例不丢（收缩只裁掉多余项）；撤销/重做与应用预设后数量、层数、比例、方向、颜色全部还原。
- [ ] **纯色模式**：取色器、HEX 输入、HSL 三个通道、颜色建议调色板四者改同一色块时**其余入口同步**（同一来源 `fillColors`）；色块缩略图与画布颜色一致；"颜色建议"tab 的「填充」按钮把 N 色建议一次性写入当前数量的色块；多色块的纯色模式下每个色块可独立取色。
- [ ] **色块渐变/图片模式（V2.28）**：色块标签上 纯/渐/图 三按钮独立切换，切换后画布**立即重绘**；渐变 = 起止色（取色器+HEX+建议）+ 线性/径向 + 角度滑块，起止色改后画布与缩略同步；图片 = 上传/更换/移除（旧图延迟释放）、大小/X 位置/Y 位置滑块实时生效、剪裁（比例芯片/剪裁缩放/预览拖动/滚轮/双击复位）后画布与预览同步、背景被外框形状裁切；图片缺失或渐变参数为空时该色块回退纯色（不露底）；撤销/重做、应用预设（导出 JSON 里填充图片为整图 dataURL + 保留剪裁）后渐变/图片原样恢复；快照缩略图真实呈现渐变/图片色块。
- [ ] **填充边界**：过渡宽度 0 时色块之间是硬边（无过渡带）；设 8~20% 后按「过渡样式」出现过渡带（单色 = 两端色中值平涂、渐变 = 带内由前一色渐变到后一色、加深/变浅 = 明显更暗/更亮、透明 = 带内透出背景）；过渡带沿**起伏后的边界曲线**左右扩展（峰谷处带的中心仍在曲线上，不是只锚在原始直线两侧的固定条带）；边界形状 sin/tan/波浪/锯齿 让分界线起伏且**原点在形状中心**（sin 在 t=0 处不位移、锯齿的齿峰落在中心、波浪默认恰为半圆拱）；tan 是**一条连续曲线**（主值分支 + ±10×画布截断，无平线三段、无断线/穿插）；波浪只有 A/ω/φ 三行（无 k）、锯齿的 ω 是齿宽、sin/tan 的 ω 是周期数、波浪的 ω 是半圆宽度（各套参数行独立）；把 ω 拉到最小、A 与 k 拉到最大时不出现 NaN、露底或撕裂；**「边界形状」「边界过渡」是两个标签**（形状标签 = 芯片+参数+包含形状外框；过渡标签 = 过渡宽度+过渡样式）；切换边界形状时参数行随之增减（直线 0 行 / sin·tan 4 行 / 波浪 3 行 / 锯齿 2 行）且面板重新渲染；过渡带与色块边界严丝合缝（同一条曲线）；**形状内不得出现未着色空隙**（外缘不许随波形位移，填充必须一直铺到轮廓边缘）；撤销、重做、应用预设后边界参数原样恢复；**「包含形状外框」默认不勾选**（此时外框纹丝不动，只有内部色块分界随波形变化），勾选后框线/裁切/填充覆盖一起随波形变形（波浪下外框首尾接缝同样无台阶）、取消勾选后可精确恢复原外接框。
- [ ] **画布边界虚线**：预览框内画布四边可见虚线且与画布边缘对齐（窗口比例变化、缩放、安全边距框变化后仍对齐）；双击进入 1:1 模态后同样可见；**下载/导出的图片里没有这条虚线**（纯界面装饰）。
- [ ] **预览画布**：画布为**正方形**（无圆角、无投影）且在默认缩放下贴合预览框内视口（窗口宽高比变化时始终取较短边、居中）；透明区域透出棋盘格；安全边距框内缩量与画布显示尺寸同步（改画布尺寸或缩放后仍对齐）；双击进入 1:1 模态预览时画布同为方角。
- [ ] **本地预设（`presets/index.js`）**：把「导出预设」的 json 内容原样粘成 `files` 下的新条目 → **刷新页面** → 新预设出现在预设网格中、可点击应用（形状/颜色/图片随预设还原）、弹出"已加载 N 条本地预设"；控制台 `[本地预设] 来源：presets/index.js；成功 N 条，失败 M 条`；预设列表中**不出现**任何内置示例预设；**故意写坏一处语法后刷新**：应用仍能正常启动、控制台给出诊断、其余功能不受影响；双击 `index.html`（file://）打开行为与静态服务器部署一致（同一条加载路径，不依赖 fetch）。

## 6. 特别说明（当前设计约束与历史注意）

- **标签组重算的边界（V2.11 起）**：只有视口变化（resize/方向/布局模式/字体就绪/合并标签/放大预览）才重算标签组拆分与合并；内容变化一律走 `refreshLayoutKeepGroups()`，标签保持原位。注意，不要在内容变化路径调用 `relayoutAllModules()`——那会让标签在标签组之间跳位，也会因整体 `innerHTML` 重建而让无关模块闪烁。
- FA 图标字体已完全本地化（`data/fa-fonts.css`，base64 内嵌，file:// 与离线均可渲染），不依赖任何 CDN；图标**元数据**在 `data/fa-icons.js`（1895 个：码点/字族/分类/关键词）。
- 注意，head 中的 `<version>`/`<changelog>` 标签已按需求移除，且**不要再添加回去**；版本信息以顶栏 `.ver` 徽标与 `Changelog.md` 为准。
- 数据文件（data/fa-icons.js、data/fa-fonts.css）均为脚本生成物，头注释含来源与基准版本；升级 FA6 版本时一并重新生成。
- FA 搜索为子串匹配，因此会出现宽泛命中（如搜 rocket 命中 sprocket），属预期行为。
- FA 行在样式模块中的 尺寸/颜色/阴影 参数与文本行完全一致；字体域参数（font.*）属文本模式专属，FA 模式不显示且渲染时忽略；图片模式的图片参数只在图片面板出现。背景形状已落地（见 4.11），填充的**数量与布局 + 纯色模式**已落地（见 4.13，V2.22）、**填充边界**（边界形状 / 边界过渡两个标签，见 4.14，V2.24 落地、V2.28 拆分）与色块的**渐变/图片背景模式**（见 4.15，V2.28）也已落地。
- 预览模块的 画布尺寸 下拉与下载 pane 的 导出尺寸 下拉共享 `iconSize`，同步点唯一收敛在 `updateSize()`；新增尺寸入口时必须接入该函数，不要各自维护变量。
- **数据保留（V2.12 起）**：切换模式/行数/填充数量都不得丢数据。跨模式数据必须各用独立字段（`text` 文本 / `faName` FA / `image.*` 图片）；快照、恢复、外部预设导入统一经 `normalizeRow` 规范化（只补缺失键，不覆盖已有值）。
- **图片模式（V2.13 起）**：图片数据只在 `ImageRepo` 存一份，行/预设/历史/快照只存 id；引用计数不足会提前释放、漏注销会泄漏。裁剪参数（比例/缩放/偏移）属行数据，随模式切换与撤销保留。导出图片时必须先决定"整图+参数"还是"剪裁后像素+清零参数"，两者混用会造成二次裁切（V2.14）。
- **预设导出/导入语义（V2.15 起）**：导出只导出**当前参数**这一条（不是预设列表）；导入是**一个 json 文件 = 一条预设**，批量导入 = 多选文件。注意，不要写成"导出 `PRESETS` 整个数组"或"一个文件里打包多条预设"。
- **图片编码与分辨率（V2.16 起）**：图片分辨率只有 `IMG_MAX_EDGE`（1024）一个标准，入库与导出同值；导出编码走 `imgEncodeCanvas`（PNG 无损优先 → WebP q0.95 近无损，不用 JPEG）。为图片剪裁/导出往返保持一致，应保证"几何（等比量）+ 像素（上限同值）+ 编码（无损优先）"三者同时成立：几何决定裁到哪里，像素与编码决定恢复出的画面有多接近导出前。若只满足几何而把导出上限压到入库上限以下，导入后的画面会比导出前模糊——这类差异容易被误判为"裁切位置变了"。
- **形状与外框（V2.17 起）**：形状即背景——形状非"无"时不铺白底，形状之外保持透明；形状内部填充由"填充"模块决定（V2.22 起为矩阵/饼图布局的多色图案，见 4.13；V2.17 当时只有"单色整片 / 多色横向等分"，已被取代）。边框宽度语义是"以 256 画布为基准的像素"并随画布等比缩放，所以 6px 在 2048 画布上是 48px——这是**有意为之**，保证预览与各导出尺寸观感一致；若改成绝对像素，大尺寸导出时边框会细到看不见。角星内角上限取 `floor(180 − 360/n)` 而非 `180 − 180/n`：后者会让内顶点凸出到外接圆之外，轮廓不再贴合正 n 边形。
- **预览画布与视口（V2.18 起）**：画布是**正方形**（无圆角、无投影），尺寸取"预览框内可容纳的最大正方形"（`min(100%, 100cqh)` + `aspect-ratio:1/1`），因此默认缩放下它贴着预览框内视口的较短边、另一方向居中；透明处直接透出棋盘格，所见即导出（需求 1.7/1.8）。由此带来两条纪律：① 画布**显示**尺寸与 `iconSize` 无关，覆盖层尺寸一律用百分比；② 需要像素级对齐时用双击进入的 1:1 模态预览，不要试图在小预览里判断 1px 差异。
- **本地预设（V2.18 引入，V2.21 简化为单一来源）**：`presets/index.js` 是"部署期预设"的入口（需求 2.1 第 3 条），**可直接手工编辑**。条目有两种可接受的写法：① 完整「导出预设」产物（`type/name/snap`）；② 只粘 `snap` 原文（`makePresetFromData` 用 `item.snap || item` 兜底，预设名回退为条目键）。之所以不用"每个预设一个 json 文件"：浏览器禁止 `file://` 页面 fetch/XHR 读本地文件，而"双击即用"是硬要求；用 JS 清单则 http 与 file:// 共用一条路径、零生成步骤。代价：没有逐文件 json 结构，且**一处语法错会让整份清单失效**（应用仍能启动，控制台会给出诊断）。
- **刷新拿到旧模块（V2.19 起已修）**：静态服务器通常不发送 `Cache-Control`，浏览器会启发式缓存 JS/CSS——曾出现"代码已更新、普通刷新却仍旧行为"的现象（本地预设也因此看似未加载）。现由引导器统一给 http(s) 资源加 `?v=APP_VER`；若改了版本号却忘了改 `APP_VER`，故障会复现。启动预设为空是**设计**：预设列表不内置任何示例，避免出现"4 条与当前状态一模一样的占位预设"。
- **填充数量与布局 + 纯色模式（V2.22 起；V2.23 层内比例逐层独立）**：填充的几何由 `fillLayout.js` 独立承担，落点是"层"——矩阵按层横切、饼图按层套环，层间比例与层内比例都是**多手柄共享滑轨**上的分界线（层内比例自 V2.23 起每层一条滑轨）；覆盖范围由轮廓点极值反算，因此任意组合下都铺满形状（见 4.13、5.2 第 18 条）。五个容易踩的坑：① 饼图的层间比例必须映射为半径（`fillRadii`），矩阵的映射为轴向位置（`fillBoundaries`），混用会让层在某个比例后整片消失；② 饼图的层内比例是**首尾相接**的角分界，均分/默认值要用 `fillEqualAngles`（i/k×100），用矩阵的"两端留边"公式会得到"k−1 个等宽扇区 + 1 个双宽扇区"；③ 切换布局形式必须走 `convertInRatios` 逐层换算层内比例，直接沿用旧数组会得到两条重合分界（一个 0 宽扇区 + 一个双宽扇区）；④ "多选一"芯片要改状态就必须在 HTML 上带逐片取值（`inlineChips` 的 `opts.values` → `data-val`），否则点击只会高亮、状态不变；⑤ 层内比例**按段升序**（`syncFillArrays` 逐层排序），整段排序会把不同层的值混到一起。另注意，数组参数收缩时**保留已有值**是设计行为（数量增减不重置参数），所以"六色一层 → 两层"后层内比例不会自动回到均分，别把它当渲染缺陷去"修"。另注意，画布边界虚线是**界面装饰**（纯 CSS 覆盖层），与安全边距框/辅助线同类，不进导出。
- **形状默认值与"填满"、滑块的显示同步（V2.23 起）**：① 默认形状改为**圆角方形 + 弧度 30**（用户指定，偏离需求 1.1.2 的"弧度默认 0"），于是打开页面即可见形状、形状之外透明、不再铺白底，形状标签标题直接显示"圆角方形"；② "填满绘图区域"取**不超出画布**前提下的尺寸最大值（`min` 比例，启用边框时预留 2×边框宽度），因此它**可能把形状缩小**——旋转 45° 的方形会从 100% 收到 ≈70.7%、纵向拉伸 200% 会收到 50%，这是修正后的正确行为，别当成"填满反而变小"的缺陷；③ 滑块的三处显示（轨道位置、蓝色进度、数字框）只在 `upd()` 里同步，任何改值路径都必须调用它，否则会出现"数值在变、滑块与数字框不动"；④ 层内比例**逐层独立**（每层一条滑轨，按 `data-ms-offset` 只读写本层那一段），与需求 2.3 原文的"各层色块数相同时共享一组"不同，属用户指定调整。
- **填充边界（V2.24 起；V2.25 增"包含形状外框"；V2.26 收窄为只作用于内部接缝；V2.27 增波浪、tan 主值分支、过渡带逐点法向；V2.28 tan 整段主值曲线 + 拆分边界形状/边界过渡两标签）**：默认**不包含**形状外框（`edge.frame=false`）——边界形状只作用于**色块之间/层与层之间**的分界线，填充的外缘（贴轮廓的那条边）保持直线/正圆（V2.26 修正：此前外缘也被位移，导致贴边露空隙）；勾选「包含形状外框」后轮廓本身才按波形位移（`edgeFramePoints`，弧长参数化 + 重采样 + 整周期/整波长取整）。边界形状（sin/tan/波浪/锯齿）只改变分界线的位置——色块与过渡带都按同一条采样曲线绘制（见 4.14）。五条纪律：① 采样要密（~2px，`edgeSteps(span)`），否则锯齿折点与波浪拱脚会被插值削平；② tan 渲染为**过中心的主值分支整段曲线**（幅度由 ±10×画布截断兜底）——不要改回"全周期"画法（渐近线跳变会把边界撕成多段），**也不要**再加 ±45° 一类的小幅值饱和（可见范围会出现"平线−陡坡−平线"的三段直线观感，V2.28 教训）；饼图径向分界的振幅收敛与角偏移 ±0.75π 夹取必须保留，否则 NaN、露底或射线缠绕；③ 波浪按需求只有 A/ω/φ 三个参数（`edge.wave` 半圆宽度，默认 20 = 2×A 恰为半圆），**无 k**；④ 参数行随边界形状增减（直线 0 / sin·tan 4 / 波浪 3 / 锯齿 2），切换形状后要重渲染本模块；过渡宽度与过渡样式在**「边界过渡」标签**，边界形状与其参数在**「边界形状」标签**（需求 2.3/2.4 各自成标签）；⑤ 这几行是全局背景参数，故**没有**"逐行联动"链条（与形状参数一致，属需求 2.3 的已知偏离，见 Changelog V2.24）。过渡带 `paintEdgeBand` 按逐点法向沿边界曲线左右各扩 w/2（V2.27 重写，用户要求"过渡宽度应沿着边界形状左右扩展，而非原始直线"），渐变样式逐段锚在段中点法向上——不要回退成固定轴渐变的粗描边。
- 历史说明：V2.04 模块化拆分、V2.05 文本渲染与参数调节、V2.06 FA 模式、V2.07 FA 全量库与面板重构、V2.08 FA 字体本地化、V2.09 启动进度条与按序动态加载、V2.10 预览模块瘦身与尺寸双入口、V2.11 标签组稳定性修复、V2.12 数据保留、V2.13 图片模式与会话图片仓库、V2.14 图片导出二次裁切修复、V2.15 预设导出语义校正、V2.16 图片导出编码保真与入库分辨率统一、V2.17 形状与外框（形状几何引擎 + 边框 + 形状阴影 + 内容按形状裁切）、V2.18 预览画布正方形与贴合视口 + 本地预设入口 + 形状模块两级重置、V2.19 移除内置示例预设 + 引导器版本化缓存串 + 本地预设加载诊断、V2.20 可选步骤机制、V2.21 本地预设简化为单一来源 presets/index.js（可手改）+ 预设空态提示、V2.22 画布边界虚线 + 填充数量与布局（层划分/多分界线共享滑轨/矩阵·饼图/必定铺满）+ 纯色模式（取色器·HEX·HSL·颜色建议）、V2.23 滑块显示跟随修复 + "填满"改为不越界的最大尺寸 + 默认形状=圆角方形·弧度30 + 层内比例逐层独立滑轨、V2.24 填充边界（过渡带宽 + 边界形状 sin·tan·锯齿 + 边界参数 A·ω·φ·k 与安全截断 + 过渡样式 单色·渐变·加深·变浅·透明，色块改为采样多边形绘制）、V2.25 填充边界新增"包含形状外框"选项（默认关闭，开启后轮廓随波形位移；顺带修掉 bool 型 fill 参数在 normalize 时被丢弃的问题、改进可选资源的失败提示措辞）、V2.26 边界形状收窄为**只作用于内部接缝**（填充外缘保持直线/正圆，修掉"贴边露空隙"；直线形状下不再为直边白采样）、V2.27 新增**波浪**边界形状（连续半圆上下交替，默认 A=10/ω=20 恰为半圆，A/ω/φ 三参数无 k）+ tan 改为**主值分支 ±45° 饱和**（一条连续边界线）+ 过渡带重写为**逐点法向带状多边形**、V2.28 tan 改为**整段主值曲线**（修"三段直线"观感）+ 填充边界拆为**边界形状/边界过渡**两个标签 + **渐变/图片色块背景模式落地**（fillStyles 参数体系 + fillPaintOf 渐变/图案解析 + 会话图片仓库 fill: 引用 + 预设整图 dataURL 往返），各版本记录见 Changelog.md 对应条目。

## 7. 版本记录

| 文档版本 | 日期 | 说明 | 对应代码 |
|---|---|---|---|
| V0.25 | 2026-09-23 | 新增 4.15 色块渐变/图片背景模式（模型/渲染/面板/快照预设）、4.14 tan 整段主值曲线 + 拆分两标签 + 饼图角偏移夹取、5.1/5.2/5.3 增补、特别说明改写 | V2.28 |
| V0.24 | 2026-09-23 | 4.14 增补波浪形状（参数表/半圆语义/tan 主值分支/过渡带逐点法向）与拱脚注意、5.2 第 22 条 / 5.3 自检 / 特别说明改写 | V2.27 |
| V0.23 | 2026-09-22 | 4.14 增补"只作用于内部接缝"（外缘不位移）与两条注意、5.2 第 22 条 / 5.3 自检 / 特别说明改写 | V2.26 |
| V0.22 | 2026-09-22 | 4.14 增补"包含形状外框"（`edge.frame`）与三条注意、5.1/5.2/5.3 增补、特别说明改写 | V2.25 |
| V0.21 | 2026-09-22 | 新增 4.14 填充边界（参数表 / 位移函数与"原点在中心"语义 / 安全截断 / 采样多边形与过渡带 / 面板接线）、5.1/5.2/5.3 增补、特别说明改写 | V2.24 |
| V0.20 | 2026-09-22 | 4.11 更新"填满"新语义与默认形状、4.13 层内比例改为逐层独立（分段读写/按段排序/逐层换算）并补注意、5.1/5.2/5.3 增补（滑块显示同步、填满上界、逐层滑轨）、特别说明改写 | V2.23 |
| V0.19 | 2026-09-22 | 新增 4.13 填充数量与布局（参数模型/层划分/几何与必定铺满/多分界线共享滑轨与两类均分公式/布局切换换算式/接线）、第 3 节补 fillLayout.js 在加载链中的位置、5.1/5.2/5.3 增补（填充参数通道、铺满与半径映射、饼图角分界均分、布局切换换算、界面装饰不进导出）、特别说明改写 | V2.22 |
| V0.18 | 2026-09-21 | 4.12 改写为单一来源（可手改的 presets/index.js，含为何不用逐文件 json 的说明）、文件结构精简、5.1/5.3、特别说明改写 | V2.21 |
| V0.17 | 2026-09-21 | 第 3 节增"可选步骤"规则、4.12 改写为三来源对照（含生成器与 file:// 内联副本）、5.1/5.3、文件结构 +gen-index.js/index.js、特别说明改写 | V2.20 |
| V0.16 | 2026-09-21 | 第 3 节增"版本化缓存串"规则、4.12 增触发时机与诊断、5.2/5.3 增补（APP_VER 同步、刷新自检）、特别说明改写 | V2.19 |
| V0.15 | 2026-09-21 | 新增 4.12 本地预设目录（名单来源/异常处理/共用构造路径）、5.1/5.2/5.3 增补（画布显示尺寸 ≠ iconSize、预设来源统一）、文件结构 +presets/、特别说明改写 | V2.18 |
| V0.14 | 2026-09-21 | 新增 4.11 形状与外框（种类/参数/几何约束/绘制栈/裁切/填满）、5.1/5.2/5.3 增补、文件结构与加载链 +bgshape.js | V2.17 |
| V0.13 | 2026-09-21 | 4.10 新增"往返保真的三个条件"与编码行、5.1/5.2/5.3 增补（导出上限须与入库上限同值） | V2.16 |
| V0.12 | 2026-09-21 | 4.8 新增"JSON 出口语义"对照表（三条出口各产出一条预设、导入一文件一预设） | V2.15 |
| V0.11 | 2026-09-20 | 4.10 增补"导出图片的两种模式"对照表与二次裁切禁忌、5.3 增图片导出往返自检项 | V2.14 |
| V0.10 | 2026-09-20 | 文件结构/加载链更新（+images.js、+imagePane.js）、新增 4.10 图片模式与会话图片仓库、5.1/5.2/5.3 增补 | V2.13 |
| V0.09 | 2026-09-20 | 新增 4.0b 数据保留专节（三用例 + 落点清单）、5.1/5.2/5.3 增补、版本表补 V0.06/V0.07 | V2.12 |
| V0.08 | 2026-09-20 | 4.6 增补"两级刷新入口"与结构签名机制、5.2 新增两条硬约束、5.3 增自检项、特别说明改写 | V2.11 |
| V0.07 | 2026-09-17 | 模块表更新（19 文件）、特别说明改为"预览模块瘦身与尺寸双入口" | V2.10 |
| V0.06 | 2026-09-17 | 第 3 节改写为"引导器动态加载"、模块表更新（21 条目） | V2.09 |
| V0.05 | 2026-09-17 | data/ 增加 fa-fonts.css、4.5b 字体装载改写、5.2 版本号约束更新、特别说明改写 | V2.08 |
| V0.04 | 2026-09-17 | 文件结构增加 data/、4.5b 改写为全量数据集与新面板布局、特别说明改写 | V2.07 |
| V0.03 | 2026-09-17 | 新增 4.5b FA 图标模式说明、模块表/加载顺序更新至 20 文件、特别说明改写 | V2.06 |
| V0.02 | 2026-09-17 | 新增第 4 节参数体系与渲染管线、联动逐行化说明、编辑指引更新、特别说明改写 | V2.05 |
| V0.01 | 2026-09-17 | 首次创建：随 V2.04 模块化拆分一起发布 | V2.04 |
