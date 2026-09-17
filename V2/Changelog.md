# KiconCreator V2 · Changelog

> **文档版本：V0.02**（对应项目代码版本 **V2.05**）
> 记录范围：`V2/` 目录的代码与文档变更。

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
