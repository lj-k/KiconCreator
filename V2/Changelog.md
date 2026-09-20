# KiconCreator V2 · Changelog

> **文档版本：V0.07**（对应项目代码版本 **V2.10**）
> 记录范围：`V2/` 目录的代码与文档变更。

---

## [V2.10] - 2026-09-17

### 预览模块瘦身：尺寸/安全边距移入标题栏 + 尺寸双下拉共享变量（用户需求）
- **标题栏合并**：预览模块标题栏现在依次为 标题、画布尺寸下拉、边距开关、边距百分比、辅助线下拉、放大按钮；原 `.preview-foot`（尺寸文本/安全边距/提示文字）整行移除——提示文字改为画布 stage 的悬浮 tooltip（`title`）。预览模块高度因此降低一整行。
- **尺寸双入口共享变量**（需求 1.1"预览尺寸=画布尺寸=下载设置的尺寸"）：
  - 预览模块新增 `#sizeSelect` 下拉（16~1024），与下载 pane 的 `#sizePreset` 共享 `iconSize` 变量；
  - `updateSize()`（exports.js V0.04）统一同步 `#sizeSelect`/`#sizePreset`/`#sizeInput` 后重绘；任一入口变更，另一入口同步更新；
  - 自定义尺寸（无对应选项）时下拉保持原显示，真实值以 `#sizeInput` 为准；
  - **健壮性**：`updateSize()` 在 `#sizeInput` 尚未渲染（下载 pane 未生成）时不再提前返回，改为保留当前 `iconSize` 并照常重绘——否则 `restoreState` 等调用方会漏掉画布重绘；`#sizeSelect` 变更在无 `#sizeInput` 时直接写 `iconSize` 兜底；
  - 撤销/恢复路径（history.js V0.04）恢复尺寸时同样经 `updateSize()` 同步。
- **样式**（layout.css V0.02）：预览模块头允许换行（窄视口时第二行容纳溢出控件），移除废弃的 `.preview-foot`/`.hint-text` 规则。
- **版本号同步**：`.ver` 徽标、`snapshotState().version`（'2.10'）、`exportHTML` 注释、欢迎 toast → V2.10；根导航页卡片徽标同步（根 Changelog V0.04）。

### 校验记录
- 21 个 JS 语法通过；全项目无 `sizeTag`/`preview-foot`/`hint-text` 残留引用（仅版本注释提及）。
- 浏览器验证（V2.10 实施时）：标题栏单行容纳 尺寸下拉+边距开关+百分比+辅助线+放大 全部控件并显示 512；`footGone=true`；预览下拉→512 时下载下拉与输入框同步为 512、画布宽度变为 512；下载下拉→128 时预览下拉同步为 128；撤销后 `iconSize` 与两处下拉一并回退 512（双向共享变量与撤销链路均正确）。

---

## [V2.09] - 2026-09-17

### 启动进度条 + 模块化异步加载（解决初次加载慢）
- **慢的根因**：head 中 Google Fonts `<link rel="stylesheet">` 是渲染阻塞资源——网络不可达时首绘会卡到请求超时；fa-fonts.css（368KB）/fa-icons.js（242KB）虽为本地文件，但也同步阻塞且无加载反馈。
- **index.html 重构**（引导器模式）：
  - head 仅保留内联启动屏样式（零阻塞，打开即见启动屏：logo + 进度条 + 百分比 + 当前加载模块名）；
  - 全部 4 个 CSS 与 21 个 JS 由页尾**引导器按依赖顺序逐个动态加载**（各模块单独加载，顺序不变），每完成一个更新进度；
  - `init()` 由引导器在全部模块就绪后调用（main.js V0.04 不再自执行），首帧布局完成后启动屏淡出移除；
  - **Google Fonts 改为应用就绪后异步注入**，不再阻塞首绘，离线自动回退系统字体；
  - 加载失败处理：进度条变红并提示失败的文件，建议刷新。
- **版本号同步**：`.ver` 徽标、`snapshotState().version`（'2.09'）、`exportHTML` 注释、欢迎 toast → V2.09；根导航页卡片徽标同步（根 Changelog V0.03）。

### 校验记录
- 21 个 JS 语法检查通过；浏览器验证：启动屏即时显示、进度条逐模块推进、应用正常启动、FA 面板/画布渲染/滑块交互正常。

---

## [V2.08] - 2026-09-17

### FA6 字体本地化（修复图标显示为方框）+ 移除 head 版本标签
- **问题定位**：图标"全是方框"的根因是**字形数据不在数据文件里**——`data/fa-icons.js` 只含元数据（码点/分类/关键词），字形存于 FA6 字体文件；此前字体走 cdnjs 在线加载，网络不可达（国内网络访问 cdnjs 常失败）或经 file:// 打开受限时，码点无字形可渲染，即显示为方框。
- **修复**：下载 cdnjs font-awesome 6.5.2 的 `fa-solid-900.woff2` 与 `fa-brands-400.woff2`，以 base64 内嵌生成 **`data/fa-fonts.css`**（约 358KB，@font-face data: URL）。data: URL 不受 CORS 限制，**file:// 双击打开与 http 离线均可渲染**，不再依赖任何 CDN。index.html 移除 cdnjs 引用、改引本地字体 CSS。
- **移除 `<version>` / `<changelog>`**（用户要求）：head 中不再保留版本标签；版本信息仍可见于顶栏 `.ver` 徽标，变更记录集中于本文件。
- **版本号同步**：`.ver` 徽标、`snapshotState().version`（'2.08'）、`exportHTML` 注释、欢迎 toast → V2.08；根导航页 index.html 卡片徽标同步 V2.08。

### 版本号说明
- ARCHITECTURE.md 第 5.2 节版本号约束已同步：不再包含 `<version>`/`<changelog>` 标签项。
- 根目录 Changelog.md（V0.02）记录根导航页同步变更。

### 校验记录
- data/fa-fonts.css 生成自有效 WOFF2（solid 156KB / brands 118KB，file 命令校验格式），总 358KB。
- 21 个 JS 语法检查通过；浏览器验证 FA 面板 DOM 字形与画布渲染均使用本地字体（见 V2.07 验证方法，本次复测 fonts.check 通过、canvas 有字形像素）。

---

## [V2.07] - 2026-09-17

### FA 图标库全量化 + 面板重构（用户三项要求）
- **① 全量图标库**：FA 图标数据由精选集（194 个）补全为**官方全量免费集 1895 个**（solid/regular/brands 全覆盖），关键词条合并"label + 别名 + ligatures + 官方搜索词 + 精选中文词"；数据由 Font-Awesome 6.x 官方 metadata（icons.json + categories.yml）脚本生成。
- **② 独立数据目录**：新增 `V2/data/fa-icons.js`（约 237 KB，`FA_ICONS` + `FA_GROUPS` 两个常量），index.html 在 js/fa.js 之前引入（第 6 位，脚本共 21 个）；fa.js 只保留交互逻辑（V0.02）。数据文件标注"脚本生成勿手改"。
- **③ 面板重构**（修复分类列表显示问题）：
  - 旧手风琴分类列表（▶ 符号在部分字体下渲染为方框）废弃，`.fa-tree/.fa-cat*` 样式删除（components.css V0.03）。
  - FA 标签内自上而下改为：**搜索框 → 树状分类下拉菜单 → 统一候选图标显示框**（单一带边框网格 `.fa-grid-box`，内部滚动）。
  - 下拉菜单用 `optgroup` 实现树状两级：全部图标（1895）+ 6 大类 → 68 官方类别（中文名 + 计数）+ 品牌与未分类。
  - 性能：候选框仅在 搜索词/分类 变化时重建；选中图标只切换高亮类名不重建（实测全量 1895 格下切换分类 5ms、点击 7ms）。

### 版本号同步更新
- `index.html`：`<version>`、`.ver` 徽标 → V2.07；`<changelog>` 增加 2.07 条目；脚本清单更新至 21 个。
- fa.js V0.02、components.css V0.03；ARCHITECTURE.md V0.04（文件结构增加 data/、4.5b 改写）。

### 校验记录
- 21 个 JS（含 data/fa-icons.js）全部通过 `node --check`；数据集完整性校验：1895 图标、7 大类、68 子类、全部子类图标均存在于 FA_ICONS、brands 452 个。
- 浏览器功能验证：面板渲染（1895 格 unified 框）、分类下拉切换（网络 14 个，5ms）、点击写回（bluetooth/gear，高亮唯一）、中文搜索（"微信"→weixin）、画布 FA 字形渲染（colored 5438 px）、FA 字体加载成功；console 无本页报错。

---

## [V2.06] - 2026-09-17

### FA（FontAwesome）模式落地（依据 doc/需求文档.md 2.2/2.3/2.7/3.4/3.5/2.35）
- **本地图标数据集**（新增 `js/fa.js` V0.01）：`FA_ICONS`（194 个常用图标的码点/别名·关键词/字族）+ `FA_CATEGORIES`（5 大类 15 子类两级分类树，与需求 2.7 分类一致），全部本地打包，结构与 FA6 官方 metadata 对齐、可整体替换为全量。
- **树状选图面板**（fa.js `mountFaPanel` + content.js FA 分支，V0.03）：
  - 分类树：点击分类标题折叠/展开（首类默认展开），子类标签 + 图标网格；
  - 搜索框：支持名称/别名/中文关键词，命中显示扁平结果（如搜"猫"→ cat）；
  - 选中即写回：`rows[i].text = 码点字符`、`rows[i].faName = 图标名`，同步标签标题（显示 FA代号）、样式副标题、画布，并压栈快照；当前选中图标高亮。
- **FA6 字体按需渲染**：
  - index.html 引入 cdnjs FA6 `all.min.css`；`ensureFaFonts()` 在主界面加载后异步装载（需求 2.7），面板打开时亦触发；失败 toast 提示并回退占位符；
  - canvas.js（V0.03）：FA 行按 `faName` 查字族渲染 —— solid → `"Font Awesome 6 Free"`（900）、brands → `"Font Awesome 6 Brands"`（400），忽略斜体；尺寸/颜色/阴影/排版变换与文本模式一致。
- **FA代号贯通**：`faName` 进入快照/恢复（history.js V0.03，快照版本字段 → 2.06）、内容标签标题（content.js `rowLabel`）、导出文件名（exports.js V0.03 `buildFileName`，需求 2.35"FA使用FA代号"）。
- **版权提示**（需求 2.7）：FA 面板内警示行 + 页面最底部新增 `.page-foot` 一行简短版权（Icon CC BY 4.0 / 字体 SIL OFL 1.1）；base.css V0.02 页面网格增加底部行，components.css V0.02 新增树面板/字形/页脚样式。

### 版本号同步更新
- `index.html`：`<version>`、`.ver` 徽标 → V2.06；`<changelog>` 增加 2.06 条目；新增 fa.js（第 6 位，共 20 个 JS）与 FA6 CDN link、页脚 footer。
- `js/history.js` 快照 `version` → `'2.06'`；`js/exports.js` 导出注释 → `V2.06`；`js/main.js` 欢迎 toast → `V2.06`。

### 校验记录
- 20 个 JS 全部通过 `node --check`。
- 浏览器功能验证：FA 面板渲染 194 图标/5 分类树/字形字体族正确；搜索"猫"命中 cat；点击写回（faName=cat、码点 f6be、标签标题 cat、文件名 KIcon-256-cat-*）；画布渲染 FA 字形（colored 5254 px）；撤销后回到文本模式且 faName 清空；页脚版权行显示。

---

## [V2.05] - 2026-09-17

### 文本模式渲染引擎与参数调节（依据 doc/需求文档.md；图片/FA/背景暂缓）
- **参数注册表**（新增 `js/schema.js` V0.01）：`PARAM_DEFS` 定义全部可渲染参数（键采用 `域.参数` 形式，含范围/默认值/类型），`makeRow` 行工厂，字体注册表（web 字体 + 系统回退 + 未下载标注），阴影换算公式。
- **渲染引擎**（重写 `js/canvas.js`，V0.02）：
  - `layoutCells()`：需求 1.2 全部排版模式的单元格几何（1~9 行：半边/居中/左右上下分/一字横纵排/品字倒品/四宫格/纵横121/环形/2×3/3×2/2×4/4×2/3×3 等）。
  - `drawRow()`：字体（中/英文字体栈、粗细五档、斜体、字号 1~300%）、排版（横排自适应收缩/纵排/环形向心——环心=画布中心、字形顶部指向圆心）、单色/渐变填充、阴影（颜色/大小/模糊/XY 偏移，按画布比例换算）、大小/角度（绕内容中心）/水平垂直拉伸/横向纵向偏移变换。
  - `drawIcon()`：白底或透明背景（需求 1.8）→ 按排列层次顺序（1→9 / 9→1）逐行绘制；`scheduleDrawIcon()` rAF 节流。
- **参数调节落地**（`js/panes.js`/`js/content.js`/`js/interactions.js`，V0.02）：
  - 样式 pane（尺寸/颜色/阴影）与文本内容面板全部从激活行状态生成；新增 `selectRow`/`checkRow`/`colorRow` 构造器；颜色控件为原生取色器 ⇄ HEX 输入双向同步。
  - 滑块拖动实时写状态 + 节流重绘（不入栈）；change（松开/失焦）时联动同步 + 压栈快照（需求 四.2/3.8）。
  - 颜色建议改为 HSL 公式实时计算（互补/类似/柔和/明亮，每组 2 候选），点击写回 c1/c2 并重算（`js/builders.js`，V0.02）。
  - Web 字体按需加载（Google Fonts），失败回退系统字体并 toast 提示；字体就绪后自动重绘（需求 2.6）。
- **逐行参数联动**（重写 `js/linkage.js`，V0.02）：联动标记移至每行 `row.link[paramKey]`；开链→全部行同键开启、关链→仅本行关闭（需求 3.7 举例语义）；`applyLinkedParam` 同步含不可见行；顶栏按钮三态（无/部分/全部）批量改写（需求 四.3）；布尔参数支持联动。
- **快照状态化**（重写 `js/history.js`，V0.02）：快照改为从状态采集（rows 深拷贝含 params/link、currentLayout、layerOrder 等），不再从 DOM 读取参数；新增 currentLayout/layerOrder/activeFill 等字段；恢复后全量重绘。
- **交互补全**（`js/topbar.js`/`js/content.js`，V0.02）：排版模式芯片与层次芯片点击写状态并重绘（行数切换时排版重置为第一项）；复制/粘贴样式真实生效（仅 style./color./shadow. 参数，跨模式取交集，需求 2.9）；样式重置按当前激活标签重置对应参数组（需求 3.3）。
- **导出修正**（`js/exports.js`，V0.02）：辅助线不再画入画布（由 SVG 覆盖层承担），移除导出前的辅助线切换逻辑，预览即导出（需求 1.8/2.34）；透明色选项实时作用于画布背景并绑定 commitHistory。

### 版本号同步更新
- `index.html`：`<version>`、`.ver` 徽标 → V2.05；`<changelog>` 增加 2.05 条目；新增 schema.js 引用（第 1 位，共 19 个 JS）与 Google Fonts link。
- `js/history.js`：`snapshotState().version` → `'2.05'`；`js/exports.js` 导出注释 → `KiconCreator V2.05`；`js/main.js` 欢迎 toast → `V2.05`。

### 已知限制（暂缓/偏差，均已登记于 ARCHITECTURE.md 第 6 节）
- 图片模式、FontAwesome 图标库、背景形状/填充渲染暂缓（按任务要求）；图片行画灰色占位框。
- 颜色建议暂以文本当前色为基色（需求口径为背景色；`computeAdvice(base)` 已预留入参）。
- 垂直拉伸会使文本渐变随之拉伸（完全解耦需离屏两遍渲染）。
- `style.clip` 为形状模块预留参数，形状暂缓期间以画布边界为裁切面。

### 校验记录
- 19 个 JS 文件全部通过 `node --check` 语法检查；全局无残留已废弃标识符（linkFlags/currentColorMode/renderForExport/drawGuides 仅存在于注释）。
- 浏览器功能验证（Chromium + http.server）：console 无报错；文本渲染（K/ICON 双行、大小 100%→180% 像素数 2964→5139）；联动（开链→全行同步、改值→行2 同步 120）；撤销恢复（size/text 均回退）；阴影启用→绿勾徽标+暗像素增加、关闭恢复；渐变模式→颜色 2 取色器出现且画布出现第二色；环形向心渲染（字形向心）；层次 1→9/9→1 切换；行数 2→1 时排版重置为"上半边"；JSON 导出含全量参数。

---

## [V2.04] - 2026-09-17

### 结构重构（逻辑零改动）
- 将单文件 `index.html`（2386 行）按模块拆分，便于后续 AI Agent 增量编辑：
  - CSS → `css/base.css`（设计令牌与主题）、`css/layout.css`（布局骨架）、`css/components.css`（可复用控件），共 3 个文件。
  - JS → 18 个模块文件，按依赖顺序在 `index.html` 底部引用：`state / utils / layout / builders / panes / tabs / interactions / linkage / history / exports / presets / canvas / content / fills / theme / topbar / preview / main`。
  - `index.html` 精简为纯页面骨架 + 资源引用，底部附模块序号注释。
- 运行形态保持不变：经典脚本 + 全局作用域 + 固定加载顺序（兼容 `file://` 零安装打开）。
- 新增 `ARCHITECTURE.md`（开发说明文档，V0.01）：模块职责表、加载顺序与依赖依据、数据流、AI Agent 编辑指引与自检清单。

### 版本号同步更新
- `index.html`：`<version>` 标签、顶栏 `.ver` 徽标 → V2.04；`<changelog>` 增加 2.04 条目。
- `js/history.js`：`snapshotState().version` → `'2.04'`。
- `js/exports.js`：`exportHTML` 生成注释 → `KiconCreator V2.04`。
- `js/main.js`：欢迎 toast → `欢迎使用 KiconCreator V2.04`。

### 校验记录
- 18 个 JS 文件全部通过 `node --check` 语法检查。
- 逐行比对（strip 注释后多集 diff）：CSS 207/207 行一致；HTML body 0 行差异；JS 顶层声明 304 个一一对应，无缺失、无新增（除版本号字符串与一处注释）。
- 浏览器冒烟测试（http.server + Chromium）：console 无报错；三栏布局、4 组 tab 模块、预设网格（4 个内置预设）、行数胶囊、内容纵向标签、填充色块渲染正常；主题切换/样式 tab 切换/填充数量切换交互正常。

### 新增文件清单（版本号均从 V0.01 起）
| 文件 | 说明 |
|---|---|
| css/base.css / layout.css / components.css | 样式三件套 |
| js/*.js（18 个） | 见 ARCHITECTURE.md 第 2 节 |
| ARCHITECTURE.md | 开发说明文档 V0.01 |
| Changelog.md | 本文档 V0.01 |

---

## [V2.03] - 此前（deepseek 会话）
- 基于deepseek网页对话继续开发（单文件形态，历史详见该版本 `index.html` 内嵌 changelog）。
