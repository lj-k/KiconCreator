# KiconCreator V2 · Changelog

> **文档版本：V0.01**（对应项目代码版本 **V2.04**）
> 记录范围：`V2/` 目录的代码与文档变更。

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
