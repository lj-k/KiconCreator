# KiconCreator V2 · 开发说明文档（ARCHITECTURE）

> **文档版本：V0.13**（对应项目代码版本 **V2.16**）
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
├── js/                     # 22 个模块 + data/fa-icons.js，加载顺序 = 依赖顺序（详见第 3 节）
│   ├── schema.js           # ① 参数注册表 PARAM_DEFS（键/范围/默认值）+ 字体表 + 行工厂 makeRow/makeImageState/normalizeRow
│   ├── state.js            # ② 全局唯一可变状态源（rows 含 params/link/faName/image、currentLayout/layerOrder）+ HistoryStack
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
│   ├── canvas.js           # ⑮ 渲染引擎：layoutCells + drawRow（文本/FA/图片）+ drawIcon + renderSnapshotThumb
│   ├── content.js          # ⑯ 内容行渲染（行数/排版芯片/层次芯片/纵向标签/文本参数面板）
│   ├── imagePane.js        # ⑰ 图片模式面板：打开/进度条/剪裁后预览/剪裁器（缩放·比例·拖拽）
│   ├── fills.js            # ⑱ 内部填充渲染（UI，背景暂缓）
│   ├── theme.js            # ⑲ 主题切换 + 两栏合并标签切换（顶层绑定）
│   ├── topbar.js           # ⑳ 顶栏按钮 + 复制粘贴样式 + 按标签重置 + renderStyle
│   ├── preview.js          # ㉑ 预览缩放/平移/模态/辅助线/安全边距（顶层绑定）
│   └── main.js             # ㉒ init() 入口（必须最后加载）
├── ARCHITECTURE.md         # 本文档
└── Changelog.md            # 变更记录
```

## 3. 模块加载顺序与依赖（V2.09 起由引导器动态加载）

`index.html` 不再静态书写 `<link>`/`<script>` 标签，而是由页尾**引导器**（内联脚本）按 `steps` 数组顺序逐个动态加载 4 个 CSS 与 23 个 JS（含 data/fa-icons.js），并在启动屏上实时显示进度。**顺序即依赖，steps 数组禁止调整**：

```
base/layout/components.css + fa-fonts.css
   └► schema ─► state ─► utils ─► images ─► layout ─► builders ─► fa-icons(data) ─► fa ─► panes ─► tabs ─► interactions ─► linkage
                                                                                        │
   main ◄── preview ◄── topbar ◄── theme ◄── fills ◄── imagePane ◄── content ◄── canvas ◄── presets/exports/history
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

## 5. AI Agent 编辑指引

### 5.1 "想改 X，去哪个文件"

| 需求 | 文件 | 说明 |
|---|---|---|
| 新增/修改可渲染参数 | `js/schema.js` 注册 → `js/panes.js` 或 `js/content.js` 加 UI → `js/canvas.js` 渲染读取 | data-name/data-pkey 必须等于参数键；联动与快照自动生效 |
| 新增模式专属数据（如 FA 图标名、图片引用） | 行对象添加独立字段（`makeRow`/`makeImageState`）+ `normalizeRow` 兜底 + 对应模式渲染/UI 读写 | **禁止**借用其它模式的字段承接（需求 四.1 例2） |
| 图片模式相关（上传/裁剪/引用） | `js/images.js`（仓库与几何）+ `js/imagePane.js`（面板）+ `js/canvas.js`（`drawRowImage`） | 行内只存 `image.id`；新引用方必须 `imgRetain/imgRelease` |
| 改图片导出分辨率/编码 | `js/images.js` 的 `imgEncodeCanvas` / `IMG_MAX_EDGE` / `IMG_PNG_MAX` | 导出上限必须与入库上限同值（见 4.10"往返保真的三个条件"） |
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

## 6. 特别说明（当前设计约束与历史注意）

- **标签组重算的边界（V2.11 起）**：只有视口变化（resize/方向/布局模式/字体就绪/合并标签/放大预览）才重算标签组拆分与合并；内容变化一律走 `refreshLayoutKeepGroups()`，标签保持原位。注意，不要在内容变化路径调用 `relayoutAllModules()`——那会让标签在标签组之间跳位，也会因整体 `innerHTML` 重建而让无关模块闪烁。
- FA 图标字体已完全本地化（`data/fa-fonts.css`，base64 内嵌，file:// 与离线均可渲染），不依赖任何 CDN；图标**元数据**在 `data/fa-icons.js`（1895 个：码点/字族/分类/关键词）。
- 注意，head 中的 `<version>`/`<changelog>` 标签已按需求移除，且**不要再添加回去**；版本信息以顶栏 `.ver` 徽标与 `Changelog.md` 为准。
- 数据文件（data/fa-icons.js、data/fa-fonts.css）均为脚本生成物，头注释含来源与基准版本；升级 FA6 版本时一并重新生成。
- FA 搜索为子串匹配，因此会出现宽泛命中（如搜 rocket 命中 sprocket），属预期行为。
- FA 行在样式模块中的 尺寸/颜色/阴影 参数与文本行完全一致；字体域参数（font.*）属文本模式专属，FA 模式不显示且渲染时忽略；图片模式的图片参数只在图片面板出现，背景形状/填充渲染仍暂缓。
- 预览模块的 画布尺寸 下拉与下载 pane 的 导出尺寸 下拉共享 `iconSize`，同步点唯一收敛在 `updateSize()`；新增尺寸入口时必须接入该函数，不要各自维护变量。
- **数据保留（V2.12 起）**：切换模式/行数/填充数量都不得丢数据。跨模式数据必须各用独立字段（`text` 文本 / `faName` FA / `image.*` 图片）；快照、恢复、外部预设导入统一经 `normalizeRow` 规范化（只补缺失键，不覆盖已有值）。
- **图片模式（V2.13 起）**：图片数据只在 `ImageRepo` 存一份，行/预设/历史/快照只存 id；引用计数不足会提前释放、漏注销会泄漏。裁剪参数（比例/缩放/偏移）属行数据，随模式切换与撤销保留。导出图片时必须先决定"整图+参数"还是"剪裁后像素+清零参数"，两者混用会造成二次裁切（V2.14）。
- **预设导出/导入语义（V2.15 起）**：导出只导出**当前参数**这一条（不是预设列表）；导入是**一个 json 文件 = 一条预设**，批量导入 = 多选文件。注意，不要写成"导出 `PRESETS` 整个数组"或"一个文件里打包多条预设"。
- **图片编码与分辨率（V2.16 起）**：图片分辨率只有 `IMG_MAX_EDGE`（1024）一个标准，入库与导出同值；导出编码走 `imgEncodeCanvas`（PNG 无损优先 → WebP q0.95 近无损，不用 JPEG）。为图片剪裁/导出往返保持一致，应保证"几何（等比量）+ 像素（上限同值）+ 编码（无损优先）"三者同时成立：几何决定裁到哪里，像素与编码决定恢复出的画面有多接近导出前。若只满足几何而把导出上限压到入库上限以下，导入后的画面会比导出前模糊——这类差异容易被误判为"裁切位置变了"。
- 历史说明：V2.04 模块化拆分、V2.05 文本渲染与参数调节、V2.06 FA 模式、V2.07 FA 全量库与面板重构、V2.08 FA 字体本地化、V2.09 启动进度条与按序动态加载、V2.10 预览模块瘦身与尺寸双入口、V2.11 标签组稳定性修复、V2.12 数据保留、V2.13 图片模式与会话图片仓库、V2.14 图片导出二次裁切修复、V2.15 预设导出语义校正、V2.16 图片导出编码保真与入库分辨率统一，各版本记录见 Changelog.md 对应条目。

## 7. 版本记录

| 文档版本 | 日期 | 说明 | 对应代码 |
|---|---|---|---|
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
