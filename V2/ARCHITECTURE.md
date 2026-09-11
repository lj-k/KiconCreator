# KiconCreator V2 — 架构设计文档

> 版本：v0.01 | 日期：2026-09-11
> 基于 `doc/需求文档.md`

## 一、需求分析总览

### 产品定位
零安装、纯浏览器运行的图标制作工具，无需后端、无需 localStorage。Chrome / Edge 浏览器。

### 核心功能维度

| 维度 | 要点 |
|------|------|
| **内容（多行1-9行）** | 每行可选 文本 / 图片 / FontAwesome；排版：横排 / 纵排 / 环形向心（直径=画布宽度，注意与行布局 ring 区分） |
| **背景形状** | 基础（无/圆形/圆角方形）、边形（3-8，含弧度参数，弧度100%=圆）、角星（3-8，含内角参数）；方向（0=最下边水平）、填满按钮 |
| **边框与阴影** | 形状边框（向外延伸）、形状阴影；每行内容独立阴影 |
| **多色填充** | 单色 / 二色 ~ 六色；矩阵布局（层数=纵向）/ 饼图布局（多层每层独立方向）；层间比例、层内比例 |
| **边界过渡** | 边界形状（直线/sin/tan/锯齿）、过渡宽度、过渡样式（纯色/渐变/加深/变浅/透明）；tan 防除零、超 10 倍画布截断 |
| **色块独立配置** | 每色块独立切换：纯色 / 渐变（线性/径向+角度）/ 图片 |
| **每行样式** | 尺寸（大小/角度/水平垂直拉伸/偏移）、颜色（单色/渐变）、阴影；支持超出形状范围裁切 |
| **参数联动** | **两阶段状态机**：勾选任一行某参数联动标记 → 所有行该参数联动标记自动一起勾选；此时调整任一行 → 所有标记该行该参数联动的行值同步变化；取消只取消当前行 |
| **快速复制样式** | 复制字段集合 = {size, angle, scaleX, scaleY, offsetX, offsetY, clipToShape, color.*, shadow.*}，排除 text/imageId/mode；跨模式只取交集 |
| **下载** | PNG / JPG / WebP / ICO（固定 16-256 六档）/ Canvas / JSON / HTML / ZIP |
| **命名规则** | `KIcon-{尺寸}-{文本拼接}-{YYYYMMDDHHmmss}.{ext}`；代码/ico/json/html/canvas/zip 格式去{尺寸}；过滤非法字符；ZIP 内部成员复用同一函数 |
| **预览交互** | 滚轮缩放、拖动、双击复位退出缩放；模态查看器（1:1 + 自由缩放拖动 + ESC 关闭 + 辅助线跟随） |
| **撤销重做** | 全量 JSON 快照栈（最多 20 条）；Ctrl+Z/Y（输入框内交给浏览器原生）；redo 清空时 deref 所有快照图片引用 |
| **预设** | 内置常量 + 导入导出（不做版本校验、只做参数合法性校验+默认值回填+多余参数抛弃）；预设列表缩略图 ≤50px 屏幕像素，后加载不阻塞主界面 |
| **下载历史** | 每次下载自动入列，最多 20 条，右键/长按删除；仅存 imageId 引用 |
| **图片仓库** | 引用计数归零后 5s 延迟释放；undo/redo 快照、history、presets 全部计入 refCount |
| **主题** | 明亮（白底灰框浅蓝标签）/ 复古（米黄底棕框）/ 暗黑（黑底深灰框） |
| **响应式** | 默认 800×400 三栏等分；级联压缩：视口压缩→栏压缩→模块压缩→标签合并→反压→滚动 |
| **标签组自适应** | 唯一标签组（功能切换不拆分）/ 并行标签组（视口充足时自动平铺展开）；平分法拆解 |

---

## 二、技术选型

| 项 | 方案 | 理由 |
|----|------|------|
| **渲染引擎** | HTML5 Canvas 2D | 所有形状/渐变/阴影统一绘制，导出与预览一致 |
| **前端框架** | 原生 ES6+（无框架） | 单文件零依赖即可运行，保持轻量化 |
| **CSS** | Tailwind CSS 3.x 预编译双 CDN（jsDelivr + unpkg）+ 本地部署同一份 | 双 CDN 回退；**最小本地兜底**（CDN 全失效时可用） |
| **JS 加载策略** | 普通 `<script>` 标签按序加载（不走 ES modules） | **file:// 协议兼容**：ES modules 在 file:// 下因 CORS 失败，普通 script 双击 index.html 可用 |
| **图标库** | FontAwesome 6 Free + fa_map.js | 本地打包图标数据（含 unicode、aliases、category），fa6.css 103KB |
| **ZIP 打包** | JSZip（CDN） | 多尺寸打包导出 |
| **ICO 格式** | 手写 ICO 二进制（20字节头 + 目录项 + PNG 块） | 内置 16/32/48/64/128/256 六档，不受导出尺寸影响 |
| **字体加载** | Web Fonts API + 系统字体回退 | 预加载默认字体，其它按需加载；失败提示原因并回退 |
| **持久化** | 无 localStorage | 预设/历史仅会话级，图片仅内存，符合需求 |

---

## 三、V2 目录结构

```
V2/
├── index.html                  # 主入口
├── fa6.css                     # FontAwesome 6 Free CSS
├── ARCHITECTURE.md             # 本文档
├── css/
│   └── styles.css              # 自定义样式（主题变量、模块/标签层级）
└── js/
    ├── main.js                 # 入口：初始化装配、事件绑定、快捷键
    ├── schema.js               # JSON Schema + 默认值 + 参数校验范围
    ├── state.js                # 状态管理、undo/redo 栈、图片仓库引用计数
    ├── shapes.js               # 形状生成器（基础/边形/角星 → path points）
    ├── render.js               # Canvas 渲染引擎（形状→填充→内容→效果）
    ├── layouts.js              # 多行排列布局（居中、品字、四宫格、环形等）
    ├── fillers.js              # 填充生成器（矩阵/饼图布局、边界曲线）
    ├── colors.js               # 颜色工具（互补/类似/柔和/明亮、渐变）
    ├── fonts.js                # 字体加载管理 + FA 图标渲染
    ├── fa_map.js               # FontAwesome 6 图标→数据映射（含 category 字段）
    ├── ui.js                   # UI 框架：模块/标签/参数组件、主题、响应式
    ├── preview.js              # 预览模块：缩放/拖拽/模态/辅助线/安全边距
    ├── presets.js              # 内置预设常量 + 导入导出（含图片剪裁量化）
    ├── history.js              # 下载历史列表
    ├── export.js               # 多格式导出（PNG/JPG/WebP/ICO/ZIP/JSON/HTML/Canvas）
    ├── images.js               # 图片处理：上传、剪裁器、引用计数释放
    └── utils.js                # 通用工具（DOM、事件、格式化、命名、校验、防抖）
```

### 文件间依赖关系

```
main.js ─┬─ schema.js
         ├─ state.js ──┬─ schema.js
         │              └─ utils.js
         ├─ shapes.js
         ├─ render.js ──┬─ state.js
         │              ├─ shapes.js
         │              ├─ layouts.js
         │              ├─ fillers.js
         │              ├─ colors.js
         │              ├─ fonts.js
         │              └─ images.js
         ├─ layouts.js
         ├─ fillers.js
         ├─ colors.js
         ├─ fonts.js ──┬─ fa_map.js
         ├─ ui.js ──┬─ state.js
         │           ├─ schema.js
         │           ├─ fonts.js
         │           └─ utils.js
         ├─ preview.js ──┬─ state.js
         │                ├─ render.js
         │                └─ ui.js (模态)
         ├─ presets.js ──┬─ state.js
         │                ├─ images.js
         │                └─ utils.js
         ├─ history.js ──┬─ state.js
         ├─ export.js ──┬─ state.js
         │                ├─ render.js
         │                ├─ colors.js
         │                └─ utils.js
         └─ images.js ──┬─ state.js
```

---

## 四、核心模块设计

### 4.1 schema.js — 数据结构与校验

**注意**：不存在运行时的 `lineTemplate` 对象。实际每个 line 都是 `content.lines` 数组下独立完整的对象，schema.js 只提供该对象的结构定义用于初始化新行和默认值回填。同理，`fillTemplate` 只定义 fills 数组元素的结构。

**核心常量：**
- `DEFAULT_STATE`：初始状态对象
- `DEFAULT_LINE`：新行的默认参数集合（不含 id，由 state.js 分配）
- `DEFAULT_FILL`：新色块的默认参数集合
- `SCHEMA`：字段路径 → { type, min, max, step, default, validator }
- `validate(path, value)`：校验并返回合法值（超出范围截断到最近合法值）

**完整数据模型：**

```json
{
  "version": "2.02",
  "canvas": {
    "size": 256,        /* 默认 256；<0→16, >10000→8192；快速下拉+自定义 */
    "transparent": false /* 语义：白色键控透明（不是"是否填白"）；JPG 不支持透明 */
  },
  "theme": "bright",     /* bright | retro | dark */
  
  "content": {
    "lineCount": 2,
    "arrangement": "top-bottom",   /* 见 layouts.js 完整枚举 */
    "layerOrder": "9-to-1",        /* 9-to-1 = 绘制顺序 9→8→…→1，行1 最顶层 */
    "lines": [
      /* 9 个完整 line 对象（无论 lineCount 多少都常驻）
         显示由 enabled 控制；增减 lineCount 时 links 初始化：
           新增行 → 所有可联动参数的 links 全部继承 enabled=true（若全局有任何联动标记）
           减少行 → 该行参数隐藏但 links 状态保留，重新增加时恢复
      */
    ]
  },
  
  /* 每个 line 对象的完整结构（schema 模板，非运行时对象）： */
  "_lineDef": {
    "id": 1, "enabled": true, "mode": "text",  /* text | image | fa */
    
    /* —— 文本模式专用 —— */
    "text": "A", "cnFont": "Noto Sans SC", "enFont": "Arial",
    "weight": 700, "italic": false, "textLayout": "horizontal", /* 环向心 diameters=canvasSize */
    "fontSize": 80,
    
    /* —— 图片模式专用 —— */
    "imageId": null,
    "crop": {"x":0,"y":0,"w":1,"h":1},  /* 归一化 0~1 */
    "whiteToTransparent": false,  /* 每行独立开关 */
    
    /* —— FA 模式专用 —— */
    "faIcon": null,   /* fa_map.js 中的 iconName 键（如 'heart'） */
    
    /* —— 通用样式（所有模式共享） —— */
    "size": 100,          /* 1~300% */
    "angle": 0,           /* 0~360°；**旋转中心 = 本行内容/图片/图标的中心** */
    "scaleX": 100, "scaleY": 100,  /* 1~300% */
    "offsetX": 0, "offsetY": 0,    /* -100%~100% */
    "clipToShape": true,
    
    "color": {
      "mode": "solid",    /* solid | gradient */
      "color1": "#ffffff", "color2": "#000000",
      "gradientAngle": 0,
      "gradientType": "linear"  /* linear | radial */
    },
    
    "shadow": {
      "enabled": false, "color": "rgba(0,0,0,0.3)",
      "size": 20, "blur": 10, "offX": 0, "offY": 0
    },
    
    /* —— 参数联动标记（所有可联动参数都有 links 键） ——
       值=true 时表示"这行这个参数参加联动"；
       值=false 时表示"不参加"。
       注意：links 的键是相对路径（如 'size', 'color.mode', 'shadow.blur'），
       state.set() 内部根据 path 前缀自动判断。
       布尔类型也要联动。
    */
    "links": {
      "size": false, "angle": false, "scaleX": false, "scaleY": false,
      "offsetX": false, "offsetY": false, "clipToShape": false,
      "color.mode": false, "color.color1": false, "color.color2": false,
      "color.gradientAngle": false,
      "shadow.enabled": false, "shadow.color": false,
      "shadow.size": false, "shadow.blur": false,
      "shadow.offX": false, "shadow.offY": false
    }
  },
  
  "background": {
    "shape": {
      "group": "basic",   /* basic | polygon | star */
      "type": "circle",   /* none | circle | roundedSquare | 3~8 | s3~s8 */
      "size": 100,        /* 1~300%；默认值使长边=画布尺寸 */
      "stretchX": 100, "stretchY": 100, /* **形状独立拉伸（P0 新增）** */
      "direction": 0,     /* **方向=0 时最下边水平**；pie 多层方向存 layout.directions[] */
      "arc": 22,          /* 圆角方形: 0=直角, 100=圆; 边形弧度: 100=圆 */
      "innerAngle": 60    /* 角星 0~90°；=0 时形状消失（UI 红字提示） */
    },
    "fillCount": 2,       /* 1~6；fills 数组常驻 6 项，增减数量时不重置未显示项 */
    "fills": [
      /* 6 个完整 fill 对象，无论 fillCount 多少都常驻 */
    ],
    /* —— background.fill[i] 完整结构（schema 模板）： */
    "_fillDef": {
      "mode": "solid",       /* solid | gradient | image */
      "color": "#4f7a4f",
      "gradient": {
        "color1": "#4f7a4f", "color2": "#ffffff",
        "angle": 0, "type": "linear"
      },
      "image": {
        "imageId": null,
        "crop": {"x":0,"y":0,"w":1,"h":1},
        "size": 100, "offsetX": 0, "offsetY": 0
      }
    },
    /* —— 填充色块标签 UI 规格（背景参数栏 3.1）——
       每个色块对应一个标签，标签组纵向排列：
       标签标题 = 正方形（宽高相同，都 = 2×文本高度），底色为该色块 canvas 预览色
       标签左上角有"纯/渐/图"按钮（切换 mode）
       标签标题显示颜色编号（1~6）
       标签内容显示该色块对应 mode 的参数（纯色/渐变/图片）
       填充数量切换动态显示/隐藏对应标签；参数不重置
    */
    
    "layout": {
      "type": "matrix",      /* matrix | pie */
      "layers": 1,            /* 1~fillCount；matrix=纵向层数；pie=多层 */
      /* 层间比例：层数-1 个，均分按钮重置为 1/layers
         层内比例：按层分配，每块色-1 个分界线
         无法均分时分配最外层/最上层 */
      "layerRatios": [0.5],
      "ratios": [0.5, 0.5],
      "directions": [0],      /* **P0 修正：数组，长度=层数**
                                 matrix type → 整个填充旋转
                                 pie type + layers≥2 → 每层独立方向
                                 **旋转中心 = 形状中心（画布中心）** */
      "offsetX": 0, "offsetY": 0,
      "scaleX": 100, "scaleY": 100
    },
    
    /* **boundary 属于布局级别，不是每个 fill 色块独立配置（与需求 2.3 一致）** */
    "boundary": {
      "transitionWidth": 0,  /* 0=无过渡 */
      "shape": "line",       /* line | sin | tan | zigzag */
      /* —— 数学公式：y = A·f(ωx + φ) + k ——
         sin/tan 的圆点 = 形状中心；锯齿原点 = 形状中心
         tan ω=0 → 返回直线 fallback（除零保护）
         渲染超 10 倍画布截断
      */
      "params": {"A": 0.1, "ω": 1.0, "φ": 0, "k": 0},
      "zigzag": {"height": 0.05, "width": 0.1},
      "transitionStyle": "solid"  /* solid | gradient | darker | lighter | transparent */
    },
    
    "border": {
      "enabled": false, "width": 2, "color": "#000000"
      /* 边框从形状边框向外延伸 */
      /* **实现策略**：Canvas stroke 默认线宽一半内一半外。
         完全向外需要：用 Path2D.offset(border.width/2) 外扩路径 → stroke 外扩路径。
         如果 offset 在浏览器不支持，则退而用 stroke 时线宽 = 2×border.width
         + 先 fill 形状 + 再 stroke（线宽内外各半 → 视觉上向外半部分盖在形状外）。
         架构层标注为风险点，详细设计时选定策略。 */
    },
    "shadow": {
      "enabled": false, "size": 10, "blur": 10, "offX": 0, "offY": 0
    }
  },
  
  "presets_builtin": [ /* JS 常量数组，6~10 个典型预设 */ ],
  
  /* —— session 字段：结构示意 + 运行时资源，**不参与 undo/redo 快照序列化** ——
     session.images 的完整 base64 数据由 ImageRepo（独立 Map，见第六节）持有；
     state JSON 中 session.images 只保留 imageId → { name, refCount } 的轻量索引。
     快照序列化仅包含业务字段（canvas / content / background / version 等），
     不包含 session.*。**theme 属于 UI 视图状态，不进快照**（见第十五节）。 */
  "session": {
    "images": {
      "img_xxx": { "name": "photo.png" /* **轻量索引，无 base64** */ }
    },
    "presets": [ /* 仅会话级，刷新丢失 */ ],
    "history": [ /* 仅会话级，刷新丢失 */ ]
  },
  
  /* —— **不进入快照的运行时资源**（独立 Map，不在 state JSON 中）——
     - ImageRepo: 持有 imageId → { data: base64, refCount, name, disposeTimer }
     - UI 视图状态: preview.view, modal.open, tab.active 等（见 UI 状态隔离章节）
     - 这些资源的生命周期由 state.js 内部管理，不由 JSON 快照驱动
  */
}
```

**关键 schema 约束表：**

| 字段 | 类型 | 范围 | 截断规则 | 默认 |
|------|------|------|---------|------|
| `canvas.size` | int | 16~10000 | **分段**：`<0→16；>10000→8192；16~10000 clamp(值, 16, 10000)` | 256 |
| `content.lineCount` | int | 1~9 | clamp | 2 |
| `background.fillCount` | int | 1~6 | clamp | 2 |
| `background.shape.innerAngle` | int | 0~90 | clamp | 60 |
| `background.boundary.params.ω` | float | 0.01~10 | ω=0 → 返回直线 fallback | 1.0 |
| `background.boundary.params.A` | float | -0.5~0.5 | clamp | 0.1 |
| 所有 `links.*` | bool | true/false | 直接赋值 | false |

### 4.2 state.js — 状态管理 + 撤销重做 + 图片仓库

**核心接口：**

```javascript
const State = {
  init(defaultState),                     // 初始化
  get(path),                              // 支持点路径 "content.lines.0.size"
  set(path, value, { history: true }),    // 自动处理联动（标记传播 + 值同步），可选记录历史
  batchSet(changes, { history: true }),   // 批量设置（原子快照）
  toggleLink(linkPath, { propagate: true }), // **P0 新增：单独处理"勾选某参数联动"**
  clearAllLinks(bool),                    // 顶部工具栏：全部联动/全部不联动
  undo(),
  redo(),
  getLinkState(),                         // 返回 'all' | 'partial' | 'none'
  
  ImageRepo: {
    add(base64, name),                    // 返回 imageId，refCount=1
    get(imageId),
    ref(imageId),                         // refCount++（新快照入栈时调用）
    deref(imageId),                       // refCount--，归零时 5s 延迟释放
    purge(imageId)
  }
}
```

#### **可联动参数注册表（P1 补充，不限于 content.lines）**

参数联动的设计初衷是"跨行同步同参数值"。**需求 V2.02 仅针对内容参数栏各行参数**，架构不能超范围扩展（豆包评审 P0 #2：超范围设计会引入多余字段、JSON 体积膨胀、预设文件产生多余字段）。

```javascript
// —— V2 必实现：仅 content.lines.* 可联动（需求原文范围）——
const LINKABLE_LINE_PARAMS = {
  // 注：links 字段存储在行对象上（每行一份）
  'size': true, 'angle': true,
  'scaleX': true, 'scaleY': true,
  'offsetX': true, 'offsetY': true,
  'clipToShape': true,                  // 布尔类型也可联动
  'color.mode': true,                   // 枚举类型也可联动
  'color.color1': true, 'color.color2': true,
  'color.gradientAngle': true,
  'color.gradientType': true,           // 渐变模式类型也可联动（deepseek #17 补充）
  'shadow.enabled': true, 'shadow.color': true,
  'shadow.size': true, 'shadow.blur': true,
  'shadow.offX': true, 'shadow.offY': true,
  // —— 以下为内容参数，但**需求未要求联动**，暂不列入 ——
  // 'fontSize', 'weight', 'italic', 'fontFamily', 'textLayout'
  // （内容参数联动如果后续有需求再加）
}

// —— P2 后续版本扩展：背景参数联动（V2.02 不启用）——
// 需求三 2.3 有"重置"能力但未要求联动链条 UI。
// V2 不在 _fillDef / shape / layout / boundary 对象上序列化 links 字段，
// 避免预设/快照产生冗余字段。P2 启用时再给 schema 加 links。
const LINKABLE_PARAMS_P2 = {
  'background.fills.*.color',
  'background.layout.directions.*',
  'background.boundary.params.A', 'ω', 'φ', 'k',
  'background.shape.direction',
}
```

**V2 架构强约束**：
- 只有 `content.lines[i].links` 存在并参与 JSON 序列化
- `_fillDef` / `shape` / `layout` / `boundary` 对象 **没有 links 字段**
- 联动链条图标只出现在内容参数栏对应参数后面
- 顶部工具栏"全部联动/全部不联动"只作用于内容参数栏
- 核心联动逻辑（两阶段状态机）不变，作用域限定为 `content.lines.i.{paramKey}`

#### 参数联动两阶段状态机（**P0 修正**）

**核心认知修正**：参数联动不是"调整时检查其他行的标记"，而是：
1. **标记阶段**（toggleLink）：勾选行0的 `links.size = true` 时，若 `propagate=true`（默认），自动把**所有 8 行的 `links.size` 都设为 true**。此时所有行同步成为一个联动组。
2. **调整阶段**（set 值同步）：当任何一行的值被修改时，遍历所有行，把该行值同步到每个 `links.size === true` 的行。取消某行的 `links.size = false` 只让该行退出。

```javascript
// toggleLink：勾选/取消某行某参数的联动标记
// 语义：
//   isLink=true  + propagate=true（默认） → 所有 9 行该参数 links 都设为 true
//   isLink=false + propagate=任何值        → 当前行该参数 links 设为 false（单独取消）
function toggleLink(lineIdx, subPath, isLink, { propagate: true }) {
  if (isLink && propagate) {
    // 勾选传播：所有行同参数联动标记一起打开
    state.content.lines.forEach(line => {
      if (!line.links[subPath]) {
        line.links[subPath] = true;
      }
    });
  } else {
    // 取消：只取消当前行
    state.content.lines[lineIdx].links[subPath] = isLink;
  }
  pushUndo();
  emit('links:changed');
  updateLinkIcons();
}

// set 值同步阶段（与原架构相比，标记处理移到 toggleLink 中）
function set(path, value, opts = { history: true }) {
  const oldVal = get(path);
  if (oldVal === value) return;
  // 1. 修改当前行
  setDirect(path, value);
  
  if (opts.history) {
    // 2. 同步所有标记了联动的其它行
    const lineIdx = parseInt(path.split('.')[2]);
    const subPath = path.split('.').slice(3).join('.');
    state.content.lines.forEach((line, i) => {
      if (i === lineIdx) return;
      if (line.links[subPath]) {
        setDirect(`content.lines.${i}.${subPath}`, value);
      }
    });
  }
  
  // 3. 快照 + 清空 redo
  if (opts.history) {
    pushUndo();
    clearRedoWithDeref();  // **P0 新增**：清空 redo 时必须 deref redo 栈所有快照图片引用
  }
  
  emit('state:changed', path);
}

// 新增行时 links 继承：**按参数继承**，而非全部参数（deepseek 评审指出原逻辑过宽）
//   对每个可联动参数，若已有行该参数 links=true → 新行该参数 links=true
//   这样只继承已勾选的那些参数，不会让新行全部参数都联动
// **注意：content.lines 是固定 9 个元素的常驻数组，增减 lineCount = 修改对应行的 enabled 标记，
//   不 push/pop 新行对象。需求 3.3 "行数减少参数不必重置，联动状态保留"。
//   行数减少时仅 enabled=false，**不 deref 图片引用**（ImageRepo 计数不改变），
//   否则 5s 延迟释放后图片丢失（deepseek #19 + GLM5.3 M3）。**
function setLineCount(newCount) {
  for (let i = 0; i < 9; i++) {
    if (i < newCount) {
      // 启用该行：如果该行从未被初始化过（默认 enabled=false），
      // 则按 DEFAULT_LINE 初始化，同时按参数继承联动状态
      if (!state.content.lines[i].__initialized) {
        state.content.lines[i] = { ...DEFAULT_LINE, id: nextLineId++ };
        // 按参数继承：对每个可联动参数，检查已有行是否有该行 links=true
        LINKABLE_LINE_PARAMS.forEach(paramKey => {
          const anyRowHas = state.content.lines.some(l =>
            l.enabled && l.links && l.links[paramKey] === true
          );
          if (anyRowHas) {
            state.content.lines[i].links[paramKey] = true;
          }
        });
        state.content.lines[i].__initialized = true;
      }
      state.content.lines[i].enabled = true;
    } else {
      state.content.lines[i].enabled = false;
    }
  }
  pushUndo();
  emit('lines:changed');
}
```

#### 撤销重做栈设计

```
┌───────────────────────────────────────────────────────────┐
│ undoStack: [snapshot_1, snapshot_2, ... snapshot_N]        │
│   ↑ oldest                                             ↑ newest│
│                                                             │
│ redoStack: [] (被新操作清空时必须 deref redo 栈所有快照)      │
│                                                             │
│ **动态上限策略**（根据 navigator.deviceMemory 感知，需求四.2）：│
│   ≤4GB → 10 条，≤8GB → 15 条，>8GB → 20 条                │
│   FIFO 淘汰最旧快照时 deref 其 imageIds                    │
│                                                             │
│ 快照 = JSON.parse(JSON.stringify(state))                   │
│   **仅序列化业务字段**（canvas/content/background）   │
│   **不序列化 session.* 和 ImageRepo**（base64 始终在 ImageRepo）│
│   - imageId 保留字符串引用（不复制 base64）                │
│   - 快照入栈时对所有 imageIds 调用 ImageRepo.ref()          │
│                                                             │
│ clearRedoWithDeref() 新操作覆盖 redo 时：                      │
│   redoStack.forEach(snap → {                                  │
│     collectImageIds(snap).forEach(id => ImageRepo.deref(id));   │
│   });                                                         │
│   redoStack = [];                                              │
│                                                             │
│ undo() / redo()：执行栈间转移 + 同步对转移快照 ImageRepo.ref/deref │
│                                                             │
│ 入栈时机：                                                     │
│   ✅ 参数变更（滑块 mouseup / 输入框 blur）                     │
│   ✅ 预设切换                                                  │
│   ✅ 图片切换                                                  │
│   ✅ 参数联动批量变更（toggleLink + setAllLinks）               │
│   ✅ 行数切换 / 启用禁用行                                      │
│   ✅ 边框/阴影启用禁用                                          │
│                                                             │
│ 不入栈：                                                       │
│   ❌ 滑块拖动中（mousemove 实时更新，mouseup 才入栈）          │
│   ❌ 预览拖动 / 缩放                                           │
│   ❌ 下载                                                       │
│   ❌ UI 样式（主题切换、标签激活、标签组展开折叠）                │
└───────────────────────────────────────────────────────────┘
```

### 4.3 shapes.js — 形状生成器

**输入**：canvasSize, shapeConfig（group, type, size, stretchX, stretchY, direction, arc, innerAngle）
**输出**：`{ points: [[cx,cy]...], path: Path2D, boundingBox: {x,y,w,h} }`（闭合、无自交）

```javascript
const Shapes = {
  // —— 基础形状 ——
  circle(size),
  roundedSquare(size, arc),  // arc 0→直角方形, arc 22→圆角方形, arc 100→圆
  
  // —— 边形 (3~8，direction=0 最下边水平；弧度 100% 时应为圆) ——
  polygon(size, sides, direction, arc),
  
  // —— 角星 (3~8) ——
  // 双环顶点交替连接；innerAngle=60→正尖角；innerAngle=0→顶点退化到中心
  // UI 红字提示 "内角 0° 形状不可见"（由 ui.js 在 shape.innerAngle 改变时显示）
  star(size, points, innerAngle, direction),
  
  // —— 构建闭合路径（禁止交叠，天然分为内外） ——
  // **direction=0 几何基准：最下边水平**
  // 旋转方向：顺时针为正（标准数学坐标系）
  buildPath(shapeConfig, canvasSize),
  
  // —— **P0 新增：形状独立拉伸** ——
  // shape.stretchX/shape.stretchY (1~300%) 应用在 path 生成中
  applyStretch(points, stretchX, stretchY, center),
  
  // —— 尺寸归一化 + 填满按钮 ——
  normalize(points, canvasSize),     // 默认使外接矩形长边 = canvasSize
  fillCanvas(shapeConfig, canvasSize) // 使形状填满整个画布
}
```

### 4.4 layouts.js — 多行排列（**行布局 ring ≠ 环形向心文本**）

**输入**：lineCount, arrangement, canvasSize
**输出**：`[{ lineId, x, y, w, h, rotation }]`

**重要区分**：
- **行布局 ring**（在 layouts.js 中）：每行占 `360/lineCount`° 均匀分布成圆环，圆环半径 = canvasSize/4。这是把多行图标主体摆成环形。
- **环形向心文本**（在 fonts.drawText 中）：同一行内多个文字字符沿圆环向心排列，圆环直径 = canvasSize。这是单行文本内排版。

```javascript
const Layouts = {
  single(lineCount, arrangement, size),   // 上半边/下半边/左半边/右半边/居中
  pair(lineCount, arrangement, size),     // 上(左右)/下(左右)/左(上下)/右(上下)/左右分/上下分
  triple(lineCount, arrangement, size),   // 一字横/纵排/品字/倒品
  quad(lineCount, arrangement, size),     // 一字横/纵排/四宫格/纵向121/横向121
  multi(lineCount, arrangement, size),    // 5~9 行各模式
  ring(lineCount, size),                 // 行布局环形（半径 = canvasSize/4）
  grid(lineCount, rows, cols, size)      // 自动计算 rows×cols = lineCount
}
```

### 4.5 fillers.js — 多色填充分割

**矩阵布局**：矩形被十字线分割为 blocks 个单元格
**饼图布局**：圆被多层（层间分割）+ 每层的角度线分割为 blocks 个扇形

```javascript
const Fillers = {
  split(shapePath, layoutConfig) {
    // 返回 blocks: [{ fillIndex, clipPath, center, area }]
    // —— 层间比例（层数>1）：控制层间分界线位置
    //     矩阵 → 横线上下移动
    //     饼图 → 圆心辐射分界线的半径位置
    // —— 层内比例（每层色块>1）：控制层内分界线位置
    //     矩阵 → 竖线左右移动
    //     饼图 → 每层内从 0° 起的扇形分界线角度
    // —— 无法均分时分配最外层/最上层
    // —— 方向（directions[]）旋转整个填充：**旋转中心 = 形状中心（画布中心）**
    //     matrix type directions[0] → 整块填充整体旋转
    //     pie type directions[i] → 每层独立旋转
    // —— offsetX/offsetY 整体偏移填充；scaleX/scaleY 整体拉伸填充
  },
  
  // —— 边界曲线（y=f(x)，以形状中心为原点）——
  boundary(type, params, center, range) {
    // line:    y = 0（直线）
    // sin:     y = A·sin(ωx + φ) + k
    // tan:     y = A·tan(ωx + φ) + k
    //          **ω=0 → 返回直线 fallback（除零保护）**
    //          **渲染超过 10 倍画布尺寸截断**
    // zigzag:  锯齿（A=高度, ω=宽度），原点以形状中心为基准
    //          曲线用于在分割线处生成过渡带（boundary.transitionWidth > 0）
  },
  
  // —— 过渡样式（boundary.transitionStyle 控制过渡带内的颜色混合）——
  transition(style, colorA, colorB, width, position) {
    // solid → colorB
    // gradient → 从 colorA 到 colorB 的线性渐变
    // darker → colorB 按更深方向调整
    // lighter → colorB 按更浅方向调整
    // transparent → rgba(B.r, B.g, B.b, position/width)
  }
}
```

### 4.6 colors.js — 颜色工具

```javascript
const Colors = {
  hexToRgb(hex), rgbToHsl(r,g,b), hslToRgb(h,s,l),
  
  // —— **颜色方案生成（双向基准，避免做反）**——
  // 需求 3.4：内容（每行）颜色建议基准 = 背景填充色
  // 需求三 2.4：背景填充颜色建议基准 = 内容文本颜色（多行拼接取第一个）
  // 两个独立入口 + 各自触发事件
  suggestContentColors(backgroundColor, type='complementary', n=9)
    // 触发：背景色变更 → event 'colors:contentBaseChanged'
    // 返回每行独立建议；UI 显示在内容行颜色标签下方
  
  suggestFillColors(textColor, type='complementary', n=6)
    // 触发：内容文本颜色变更 → event 'colors:fillBaseChanged'
    // 返回每个色块建议；UI 显示在色块标签颜色选择器下方
  
  // type: 'complementary' | 'analogous' | 'soft' | 'bright'
  // **纯色一键填充**（需求 3.2.4 明确"一键填充仅限制纯色"）：
  //   直接设置 fills[i].mode='solid', fills[i].color=color
  //   渐变颜色建议 → 仅作为颜色选择器候选项展示，**不直接切换 mode**
  //   用户在渐变模式下点某个建议色 → 只替换 color1 或 color2（UI 弹窗让用户选）
  
  // —— 渐变生成 ——
  makeGradient(ctx, type, angle, color1, color2, size),
  darken(color, amount), lighten(color, amount)
}
```

### 4.7 render.js — Canvas 渲染引擎（**P0 修正**）

#### 关键约束（**P1 新增**）
1. **clip 必须包裹 save/restore**：Canvas 2D 的 clip 是累积状态，任何 save 之后的 clip 必须在 restore 时解除。禁止全局持久修改 `ctx.clip`。
2. **DPR 隔离**：预览 canvas 做 DPR 适配（canvas.width = size×DPR, CSS 缩放到 size）；**导出临时 canvas 强制 1:1**（width=height=state.canvas.size，不乘 DPR）。
3. **预览层与导出层严格分离**：辅助线、灰白格子背景、安全边距属于预览层，不导出。导出路径不画这些。
4. **透明色语义**：`canvas.transparent=true` + shape 非 none → 导出时跳过白色填充 + 白色键控透明；shape=none → 导出按白色（默认）或透明（勾选）背景。JPG 强制跳过透明处理并提示。
5. **tan 边界截断保护**：fillers.boundary 返回曲线后，render 在绘制过渡带时检查 y 值，超出 canvas 10 倍立即截断。

#### 渲染流水线（导出路径）

```
render(canvas, state, { mode: 'export' })
  │
  ├─ 1. canvas.width/height = state.canvas.size
  │     （**mode='export' 时强制 1:1 不受 DPR 影响**）
  │
  ├─ 2. 绘制背景 shape path
  │     ├─ 2a. shape = none 分支
  │     │     transparent=false → ctx.fillStyle='#ffffff'; fillRect
  │     │     transparent=true  → 跳过（canvas 默认透明）
  │     │     JPG 格式 → 强制不跳过 + 提示用户
  │     │
  │     ├─ 2b. shape = circle/polygon/star
  │     │     ├─ ShapePath = shapes.buildPath(shape, canvas.size)
  │     │     ├─ [可选] 形状阴影：ctx.shadow* → drawShape → 清 shadow
  │     │     ├─ ctx.save(); ctx.clip(ShapePath)     **clip 必须在 save 内**
  │     │     ├─ for each block in fillers.split():
  │     │     │     ├─ ctx.save(); ctx.clip(block);
  │     │     │     ├─ 根据 fill.mode 选 fillStyle（solid/gradient/image）
  │     │     │     ├─ fillCanvas();
  │     │     │     ├─ [boundary.transitionWidth > 0] 绘制过渡带
  │     │     │     │   （使用 fillers.boundary + fillers.transition）
  │     │     │     │   （超 10x canvas 截断保护）
  │     │     │     └─ ctx.restore();
  │     │     ├─ ctx.restore();
  │     │     └─ [可选] border: ctx.lineWidth/color → stroke(ShapePath)
  │     │
  ├─ 3. 绘制内容（按 layerOrder 排序后的 enabled lines）
  │     ├─ positions = layouts.arrange(state.content)
  │     ├─ layerOrder = '9-to-1'  → 绘制顺序 9→8→…→1（行1 最后绘制 = 最顶层）
  │     │
  │     ├─ 每行：
  │     │     ├─ ctx.save();
  │     │     ├─ [line.clipToShape=true] ctx.clip(ShapePath)
  │     │     │                             **clip 必须在 save 内**
  │     │     ├─ ctx.save();
  │     │     │     应用 transform: translate(lineCenter + offset) → rotate(angle)
  │     │     │       → scale(scaleX, scaleY)
  │     │     │     **rotate(angle) 旋转中心 = 本行内容/图片/图标的中心**（lineCenter）
  │     │     │     （**拉伸不改变渐变效果**：先画渐变再 transform）
  │     │     │     [可选] ctx.shadow*（行阴影）
  │     │     │     绘制内容：
  │     │     │       mode=text → fonts.drawText()
  │     │     │         textLayout=ring → 环形向心（直径=canvasSize，fonts.js）
  │     │     │         textLayout=vertical → 纵排（每字换行）
  │     │     │       mode=image → images.drawClipped()
  │     │     │         image.whiteToTransparent → 逐像素白色转透明
  │     │     │       mode=fa → fonts.drawFA()
  │     │     │     ctx.restore();
  │     │     ├─ ctx.restore();
  │     │     └─ 字体未加载完成时，绘制占位字符 + 触发 preview 层 "字体加载中" 提示
  │     │
  └─ 4. 恢复所有 ctx state（fillStyle, strokeStyle, shadow*, clip, transform, lineWidth）
```

### 4.8 export.js — 多格式导出

```javascript
const Export = {
  // —— 核心：从 render 拿到临时 canvas ——
  // **导出临时 canvas 强制 1:1，不做 DPR 放大**
  buildExportCanvas(state, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    // 注意：透明色处理、shape=none 分支等都在 render 内部完成
    Renderer.render(c, state, { mode: 'export' });
    return c;
  },
  
  // —— 格式导出（每个都走 buildExportCanvas）——
  toPNG(size)  → blob('image/png')
  toJPG(size)  → blob('image/jpeg', 0.92)  // 强制不透明
  toWebP(size) → blob('image/webp', 0.92)  // 不支持时隐藏按钮（能力检测）
  toICO()      → makeICO([16,32,48,64,128,256])  // **固定尺寸，不受 canvas.size 影响**
  toCanvas()   → 生成 `<canvas width=N height=N><script>DPI=1</script>` 文本
  toJSON()     → **复用 Presets.export(state)**（剪裁量化 + 图片数据一同导出）
                  需求 3.3 明确 "json 格式 = 导出预设"，故两者统一为同一函数
  // **HTML 与 presets.copyHTML() 是同一个函数**
  toHTML()     → 生成 `<link rel="icon" href=".../favicon.ico" sizes="...">
                          <link rel="apple-touch-icon" ...>` 等完整网页标签
  toZIP(opts)  → JSZip().add(members)
    // opts: { multiSize: true, withCode: true, withRawImage: true }
    // multiSize → 32/64/128/256 PNG（固定尺寸，不受 canvas.size 影响）
    // withCode  → canvas 代码 + json 预设
    // withRawImage → 所有上传的原始图片（从 ImageRepo 导出 base64）
    // **如果同时勾选 ICO 下载 → ZIP 包含 ICO + canvas + json**
    // ZIP 内部成员文件名统一走 makeName() 同一套规则
  
  // —— 命名（对外 + ZIP 内部都走这个）——
  makeName(state, ext, size) {
    const textContent = collectAllContentText(state);
    // textContent 拼接规则：
    //   text 模式 → 实际文本
    //   FA 模式 → faMap[faIcon].unicode 或 iconName（FA 代号）
    //   image 模式 → image.name（原文件名，去扩展名）
    //   多行 → 直接拼接无分隔符
    const filtered = textContent.replace(/[\/\\:*?"<>|]/g, '').slice(0, 30);
    const ts = formatTS(new Date());  // YYYYMMDDHHmmss
    const sizeStr = ['canvas','ico','json','html','zip'].includes(ext) ? '' : `${size}-`;
    return `KIcon-${sizeStr}${filtered}-${ts}.${ext}`;
  },
  
  // —— 生成 ico 二进制（同第十节）——
  makeICO(sizes) → Uint8Array
}
```

### 4.9 ui.js — 动态 UI 框架

```javascript
const UI = {
  // —— 核心构建单元 ——
  createModule({ title, content, borderColor })
    // 栏 → 模块 → 标签组 → 标签 → 参数/组件（四层组织）
  
  createTabGroup({
    parallel: false|true,     // 唯一标签组（不可平铺） vs 并行标签组（可平铺）
    tabs: [{ title, content, active }],
    tabWidthRatio: 0.16~0.25, // **单行内容标签标题宽度默认 1/6，最大 1/4**
    splitMethod: 'equal'     // **平分法拆解**：按可用空间均分标签组为多行
  })
  
  // —— 单行内容标签标题特殊组件（ui.js 的增强，不是通用控件）——
  // 标题分两个部分：
  //   [组件] "文/图/F" 小按钮（切换模式）→ 点击即切换当前行 mode
  //   [组件] 文本输入框（嵌入标题上，强制居中，超出可左右滚动）
  //   [展示] 图片模式显示文件名；FA 模式显示 iconName
  createLineTabTitle({ lineId, mode, text, faIcon, imageName })
  
  // —— **填充色块标签标题特殊组件**（背景参数栏 3.1）——
  // 标签标题 = **正方形**（宽高相同，都 = 2×文本高度）
  //   底色为该色块 canvas 预览色（纯色用 color，渐变用 canvas 画完渐变色，图片用缩略图）
  //   左上角有"纯/渐/图"三态按钮（切换 mode）
  //   标题显示颜色编号（1~6）
  // 标签内容显示该色块对应 mode 的参数：
  //   solid → 颜色选择器 + 颜色建议
  //   gradient → 渐变颜色选择 + 渐变模式 + 渐变角度
  //   image → 图片上传选择器 + 剪裁 + 大小/位置滑块
  createFillTabTitle({ fillIdx, mode, colorPreview, fillCount })
  
  // —— 参数控件 ——
  createRangeParam({
    path, min, max, step, value, unit,
    linkPath, hasLink, onToggleLink,   // **带联动链条图标**
    onReset                              // **标签下重置按钮**
  })
    // 滑块 + 输入框 二合一：
    //   拖动滑块 → 输入框实时显示
    //   输入框修改 → 滑块更新
    //   非法输入 → 输入框底色浅红闪烁 2 次 → 设置为最近合法值 → 恢复底色
  
  createColorParam({ path, value, suggestions, onSuggestionClick })
    // 颜色标签标题直接显示颜色色块
  
  createToggleParam({ path, value, onToggle, showGreenCheck })
    // 标签启用时标题显示绿色对号
  
  createLinkIcon({ path, active, onToggle })
    // 链条图标：闭合=已联动；断开=未联动
  
  // —— 主题切换 ——
  setTheme('bright' | 'retro' | 'dark')
  
  // —— 响应式（级联压缩规则）——
  // 全局视口压缩 → 栏高度压缩 → 模块高度压缩
  // → 模块内标签组可用高度减少 → 并行标签组优先平铺展开变纵向堆叠
  // → 标签组纵向空间不足 → 反压模块高度
  // → 模块高度被反压 → 反压栏高度
  // → 栏高度无空间可用 → 启用栏内纵向滚动
  // 单栏纵向视口不足 → 优先标签合并 → 再栏内滚动
  observeResponsive()
}
```

### 4.10 preview.js — 预览模块

```javascript
const Preview = {
  init({ canvas, modalCanvas, guidesEl, safeMarginEl, checkerboardEl }),
  
  // —— 预览层（非业务 state，纯 UI 视图，不进 undo、不保存、不导出）——
  view: {
    mode: 'normal',   // normal | zoomed | modal
    // 原位缩放状态
    zoomFactor: 1,    // 0.1 ~ 10.0
    offsetX: 0,       // 以预览容器中心为原点
    offsetY: 0
  },
  
  // —— 原位缩放交互状态机 ——
  //   鼠标悬浮 + 滚轮 → 进入缩放模式（mode='zoomed'）
  //   缩放模式 + 左键按下 → 拖动
  //   缩放模式 + 滚轮 → zoomFactor *= (1+step)
  //   缩放模式 + 左键双击 → 复位 zoomFactor=1, offset=0, 退出 zoomed
  //   正常模式 + 双击 → 进入 modal
  
  // —— 模态查看器 ——
  openModal(),
  closeModal(),   // ESC / 关闭按钮 / 模态内双击复位 zoom+offset
  
  // —— **放大按钮**（多栏模式专用）——
  // ui.js 把左栏 width 从 1/3 → 50vw
  expandPreview(),
  
  // —— 辅助线（叠在 canvas 上层的 div，modal 内跟随缩放移动）——
  setGuides('none' | 'cross' | 'star' | 'grid'),  // 十字/米字/均分井字
  setSafeMargin(percent=10),
  
  // —— 画布背景：灰白格子（CSS pattern div）——
  // 不导出；仅预览层显示
  showCheckerboard(bool)
}
```

### 4.11 images.js — 图片处理与剪裁

```javascript
const Images = {
  async upload(file) {
    // FileReader.readAsDataURL → 校验大小
    // >1MB → 提示"图片 >1MB 可能导致卡顿"，允许继续
    // 动图 → 取首帧（Image 加载后 canvas.drawImage 取 ImageBitmap）
    // 注册到 ImageRepo → 返回 imageId, refCount=1
    // 更换图片：旧 imageId → ImageRepo.deref()
  },
  
  openCropper(imageId, initialCrop, onConfirm) {
    // 剪裁器：缩放、拖拽、快速比例（1:1, 16:9, 3:4 等）
  },
  
  drawClipped(ctx, imageId, crop, x, y, w, h),
  
  whiteToTransparent(imageData, threshold=128),
  
  // —— **引用规则明确**（需求 2.8：更换图片解除旧引用；切换行和模式不解除引用）——
  // **GLM5.3 M2 修正：引用计数总账模型 = 当前 state 占 1 份 + 每份快照各占 1 份**
  // 任何时刻，一张图的 refCount = 1（被当前 state 引用）+ N（被 N 条历史快照引用）
  // 生命周期的正确行为链：
  //   图片上传 → refCount = 1（当前 state）
  //   pushUndo → refCount += 1（快照持有引用）
  //   undo → 把当前快照推到 redoStack，refCount += 1
  //        → 从 undoStack 取前一快照，apply 到 state（对覆盖的旧快照 deref）
  //   redo → 把当前推 undo，对 redo 弹出的 +1
  //   clearRedoWithDeref → redoStack 全部 deref
  //   FIFO 淘汰最旧 undo → deref 被淘汰快照
  //   更换图片 → deref 旧 imageId（当前 state 的那 1 份）+ ref 新 imageId
  //   切换行数（enabled=false）→ **不 deref**，state 中 imageId 保持（deepseek #19 + GLM5.3 M3）
  //   历史/预设删除 → deref 其持有引用
  //
  // ✅ 增减 ref 的场景（只有这些！）：
  //   - 行 mode=image 更换 imageId → deref 旧 id（减 1）+ ref 新 id（加 1）
  //   - 背景 fill.mode=image 更换 imageId → 同上
  //   - pushUndo → 对快照内所有 imageIds 各 +1
  //   - clearRedoWithDeref → 对 redoStack 所有快照内 imageIds 各 -1
  //   - undo/redo 栈间转移 → 转出方栈 -1 + 转入方栈 +1
  //   - FIFO 淘汰最旧 undo → 对被淘汰快照 imageIds 各 -1
  //   - history/presets 新增 → ref；删除 → deref
  // ❌ 不增减 ref 的场景：
  //   - 切换选中行（仅改 UI 选中态）
  //   - 切换 mode（text↔image↔fa）：旧 imageId 保留在 state 中，ref 不变
  //     （需求原文"切换行和模式不解除引用"）
  //   - enabled=false（行隐藏）：state 中 imageId 保持，引用不变
}
```

### 4.12 presets.js — 预设系统

```javascript
const Presets = {
  builtin: [ /* 6~10 个典型预设 */ ],
  
  // —— 导入 ——
  import(jsonText) {
    // **不做版本校验**（需求 2.1 明确）
    // JSON.parse → 遍历所有 imageId → ImageRepo.deref 旧 + ref 新
    //     （如果是数组则批量导入）
    // → 参数合法性校验：多余参数抛弃，缺失参数补 schema 默认值
    // → 返回 { success: [], warnings: [], failures: [] }
    //   （每条预设状态 + 差异参数列表；全失败则返回 { failures: [...], success: [] }）
    // 导入预设的缩略图走 render → 缩放至 ≤50px → toBlob 不阻塞主界面
    // 找不到图片时，缩略图位置渲染"图片缺失"占位（灰色方块 + 文字）
    // 主界面加载后异步渲染预设列表（Promise.all + 节流）
  },
  
  // —— 导出（**图片剪裁量化**）——
  export(state) {
    // **P0 修正：不是导出完整 base64，而是剪裁量化仅保存可见部分**
    // 遍历所有 imageId：
    //   对每个有 crop 的图片，在 ImageRepo 中取出完整数据
    //   剪裁到 crop 指定的可见区域（canvas.drawImage + toDataURL）
    //   量化（降低 quality 或色彩空间压缩）
    // 无 crop（全图可见）→ 直接取 base64
    // 组装成 JSON 字符串返回
  },
  
  // —— 保存当前为预设 ——
  saveCurrent(name) {
    // 等同于 export → push 到 state.session.presets
    // 【UI 细节】保存按钮 hover 提示文案："保存仅本次有效，刷新页面丢失"
  },
  
  // —— 复制 JSON 到剪贴板 ——
  copyJSON(state),
  
  // —— 复制 HTML link 到剪贴板 ——
  // **与 export.toHTML() 同一实现，输出完全一致**
  copyHTML(state),
  
  // —— 预设列表渲染 ——
  renderList() {
    // 每行横向排列多个 ≤50px 屏幕像素的预览缩略图
    // 仅显示预览图，不显示名称、不显示删除按钮
    // 点击缩略图即应用（通过 state 切换 → 触发 render）
    // 后加载渲染：主界面初始化完成后 setTimeout(0) 执行，不阻塞主界面
  }
}
```

### 4.13 history.js — 下载历史

```javascript
const History = {
  record(state, mode) {
    // 下载后自动入列，等同下载了一份预设
    // 缩略图：render → canvas 缩放 ≤50px → toBlob
    // data：完整 state 快照（imageId 引用，无 base64）
    // 最多 20 条 FIFO；入栈时对快照内所有 imageIds 调用 ImageRepo.ref
  },
  
  recover(id) {
    // 恢复到 state → 触发 render
  },
  
  // —— 交互：右键/长按显示删除按钮 ——
  delete(id) {
    // 从列表移除 + 对快照内所有 imageIds 调用 ImageRepo.deref
  }
}
```

### 4.14 fonts.js — 字体加载 + FA 渲染

```javascript
const Fonts = {
  listCN: [
    { name: 'Noto Sans SC',  url: '...', isWeb: true },
    { name: '思源黑体',        isWeb: false },  // 系统字体
    ...
  ],
  listEN: [
    { name: 'Arial',          isWeb: false },
    { name: 'Inter',          url: '...', isWeb: true },
    ...
  ],
  
  async load(fontName) {
    // FontFace API
    // UI 状态：加载中→预览显示"字体加载中"提示；下拉框显示"未下载"字样
    // 失败 → 回退系统字体 + 显示失败原因（网络/格式等）
  },
  
  // —— 文本绘制 ——
  drawText(ctx, text, cnFont, enFont, { textLayout, fontSize, ringDiameter }) {
    // textLayout='ring' → **环形向心**（ringDiameter=canvasSize，fonts.js 内部）
    //   每个字符 rotate(stepAngle) + translate
    //   注意：这与 layouts.js 的行布局 ring（半径=canvasSize/4）是两个不同概念
    // textLayout='vertical' → 纵排（每字换行）
    // 默认 horizontal：标准文本
  },
  
  // —— FA 图标绘制（**优先 SVG path**）——
  drawFA(ctx, faIconName, size, color) {
    // 从 fa_map.js 取 { unicode, category, pathData }
    // 方式 1（优先）：SVG path → new Path2D(pathData) → ctx.fill
    // 方式 2（fallback）：ctx.font='Font Awesome 6 Free' + fillText(unicode)
  }
}
```

### 4.15 fa_map.js — FontAwesome 6 数据（**补充 category 和 pathData**）

```javascript
const FA_MAP_ALL = {
  // iconName → { unicode, aliases: [], category: 'solid|regular|brands', pathData: 'M...Z' }
  // **P0 新增 category 字段**（支持分类树状展示）
  // **P0 新增 pathData 字段**（支持 canvas path 直接绘制，不依赖 DOM 字体）
  // 所有图标归属于 FA6 三大分类：solid / regular / brands
  'heart':  { unicode: 'f004', aliases: ['favorite','like'], category: 'solid', pathData: 'M...Z' },
  'heart-o':{ unicode: 'f08a', aliases: [], category: 'regular', pathData: 'M...Z' },
  'github': { unicode: 'f09b', aliases: [], category: 'brands',  pathData: 'M...Z' },
  ...
};

// 分类树结构（UI 渲染用）
const FA_CATEGORIES = {
  'Solid': FA_MAP_ALL.filter(k => k.category === 'solid'),
  'Regular': FA_MAP_ALL.filter(k => k.category === 'regular'),
  'Brands': FA_MAP_ALL.filter(k => k.category === 'brands')
};

window.FA_MAP = FA_MAP_ALL;
```

---

## 五、ICO 格式说明

```
ICO 二进制格式：
┌───────────────────────────────────┐
│ ICO Header (6 bytes)              │
│   reserved: 2 bytes (0)           │
│   type:     2 bytes (1 = ICO)     │
│   count:    2 bytes (6)           │
├───────────────────────────────────┤
│ Directory Entry × 6 (每项16 bytes)│
│   width:    1 byte (0=256, N=N)   │
│   height:   1 byte (0=256)        │
│   colors:   1 byte (0)            │
│   reserved: 1 byte (0)            │
│   planes:   2 bytes (1)           │
│   bpp:      2 bytes (32)          │
│   size:     4 bytes (PNG字节数)    │
│   offset:   4 bytes (从文件头起)    │
├───────────────────────────────────┤
│ PNG data × 6 (16,32,48,64,128,256)│
│   从 Canvas → toBlob('image/png') │
└───────────────────────────────────┘

注意：现代浏览器 + Windows 已原生支持 PNG-in-ICO，
      无需额外编码为 BMP/DIB。
```

---

## 六、会话图片仓库

```javascript
const ImageRepo = {
  store: new Map(),
  add(base64, name) → id,
  ref(id),      // +refCount
  deref(id),    // -refCount，归零 → 5s 延迟删除
  purge(id)     // 强制删除
  
  // —— 引用来源清单 ——
  //   content.lines[i].imageId → +1
  //   content.lines[i].image.whiteToTransparent 不产生新引用（是派生）
  //   background.fills[j].image.imageId → +1
  //   undoStack 每条快照 → 对所有 imageIds +1（入栈时 ref）
  //   redoStack 每条快照 → 对所有 imageIds +1（入栈时 ref）
  //   session.history[k].imageIds → +1
  //   session.presets[k].imageIds → +1
  //   **新操作覆盖 redo 时** → 所有 redo 快照的 imageIds 全部 deref
  //
  // —— 延迟释放 ——
  //   归零后不清立即删除，设置 5s timeout
  //   ref(id) 再次被调用时清除 timeout
  //   给可能的 undo 留出恢复窗口
}
```

---

## 七、主题系统

```css
/* CSS 变量 */
:root, [data-theme="bright"] {
  --bg-page: #f8f8fa;
  --bg-module: #ffffff;
  --border-module: #d1d5db;
  --bg-tab: #dbeafe;        /* 浅蓝 */
  --bg-tab-active: #bfdbfe;
  --border-tab: #93c5fd;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --bg-canvas: #ffffff;
  --bg-checkerboard: #e5e7eb;
  --color-green-check: #16a34a;
  --color-red-warn: #dc2626;
  --bg-tabgroup-active-tab-body: #e0f2fe; /* 激活标签与其参数区域浅蓝连体 */
}

[data-theme="retro"] { /* 米黄底 + 棕框 */ }
[data-theme="dark"]  { /* 黑底 + 深蓝灰标签 */ }
```

---

## 八、参数联动状态机（完整逻辑）

```
┌─────────────────────────────────────────────────────────────────┐
│  全局状态：                                                        │
│    getLinkState() → 'all' | 'partial' | 'none'                    │
│                                                                   │
│  三个入口：                                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 1. toggleLink(lineIdx, subPath, true)  // 勾选某行某参数联动   │ │
│  │    → propagate=true（默认）→ 所有 9 行同参数 links = true    │ │
│  │    → pushUndo()                                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 2. toggleLink(lineIdx, subPath, false) // 取消某行某参数联动   │ │
│  │    → 仅当前行该参数 links = false（单独取消）                 │ │
│  │    → pushUndo()                                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 3. setAllLinks(true/false)             // 顶部工具栏批量      │ │
│  │    → 所有行所有可联动参数 links = bool                        │ │
│  │    → pushUndo()                                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  调整值时（set 阶段）：                                            │
│    修改行 i 的值 V → 遍历所有其它行 j                            │
│    if lines[j].links[subPath] === true → 同步修改 lines[j] 值为 V│
│                                                                   │
│  新增行时（addLine）：                                             │
│    if 任意已有行有 links=true → 新行所有可联动参数 links=true     │
│                                                                   │
│  减少行时（removeLine）：                                          │
│    该行被移除，但在 state.content.lines 数组中保留对象              │
│    （enabled=false）→ links 状态保留 → 重新增加时恢复              │
│                                                                   │
│  布尔类型参数也支持联动（links.* 键覆盖所有可联动参数）              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 九、撤销重做栈设计（补充 redo 清空 deref）

```
undoStack ← [old]            ← 新操作入栈
undoStack → [old, current]
undoStack 大小超 20          ← FIFO 淘汰最旧快照
  → deref 被淘汰快照 imageIds

undo() / redo() **栈间转移不增减 ref**（只是把"持有引用"从 undoStack 转到 redoStack 或反过来）：
  undo()：
    currentSnap = JSON.parse(JSON.stringify(state))  // 当前 state 的快照 → 推入 redoStack
    undoStack.pop(previousSnap)
    redoStack.push(currentSnap)  // 从 state 转移到 redoStack，ref 不变
    // 关键：apply previousSnap 到 state 时
    //   - previousSnap 原来的 undoStack 那份引用（+1）现在变成 state 的引用（+1）—— 引用数不变
    //   - currentSnap 里有而 previousSnap 里没有的 imageIds → deref（state 不再持有它们的那 1 份）
    //     （currentSnap 已推入 redoStack，redoStack 那份引用由它自己持有）
    ImageRepo.derefOnlyIn(currentSnap, previousSnap)  // currentSnap 独有的 imageIds → -1
    state = previousSnap
    emit('state:changed')

  redo()：对称操作
    currentSnap = JSON.parse(JSON.stringify(state))
    redoStack.pop(targetSnap)
    undoStack.push(currentSnap)
    ImageRepo.derefOnlyIn(currentSnap, targetSnap)
    state = targetSnap
    emit('state:changed')

**pushUndo 入栈**：
  snap = JSON.parse(JSON.stringify(state))
  if (undoStack.length >= MAX_UNDO) {
    const oldest = undoStack.shift()
    oldest.imageIds.forEach(id => ImageRepo.deref(id))  // FIFO 淘汰
  }
  undoStack.push(snap)
  // 对 snap 内 imageIds 各 +1（快照新增持有）
  snap.imageIds.forEach(id => ImageRepo.ref(id))

**clearRedoWithDeref 清空 redo**：
  redoStack.forEach(snap => snap.imageIds.forEach(id => ImageRepo.deref(id)))
  redoStack = []
```

---

## 十、UI 四层组织（明确落位）

```
栏（左/中/右）
├── 栏标题（顶部，无框无底）
└── 模块（纵向排列）
    ├── 模块标题栏
    └── 模块内容
        ├── 标签组（唯一标签组 or 并行标签组）
        │   ├── 标签 1
        │   │   ├── 标签标题（含可选状态显示：绿色对号、颜色色块、启用状态）
        │   │   └── 标签内容
        │   ├── 标签 2
        │   │   ├── ...
        │   │   └── ...
        │   └── ...
        ├── 参数类（同一参数过多选项时分多行，类名在行前）
        ├── 参数（一行：参数名 + 控件 + 当前值 + 联动链条图标 + 重置）
        └── 组件（按钮、预览、剪裁器、放大按钮等）
```

---

## 十一、下载组合矩阵（明确化）

| 下载格式 | 尺寸 | 透明 | 多尺寸打包 | 代码打包 | 原始图片 | ICO 内置尺寸 | 备注 |
|---------|------|------|-----------|---------|---------|-------------|------|
| PNG | canvas.size | ✅ | 32/64/128/256 | - | - | - | 默认 |
| JPG | canvas.size | ❌ 强制白色 | 同左 | - | - | - | 提示不支持透明 |
| WebP | canvas.size | ✅ | 同左 | - | - | - | 能力检测不支持时隐藏 |
| ICO | **固定 16/32/48/64/128/256** | ✅（PNG-in-ICO） | - | - | - | ✅ | **不受 canvas.size 影响** |
| Canvas | canvas.size | ❌ | - | - | - | - | DPI 固定 1x |
| JSON | - | - | - | - | - | - | 完整 state 导出 |
| HTML | - | - | - | - | - | - | `<link>` 标签套组（含 ico, apple-touch-icon） |
| ZIP（勾选多尺寸） | **32/64/128/256 固定** | - | ✅ | - | - | - | 多尺寸 png |
| ZIP（勾选多尺寸+ICO） | **32/64/128/256 + 16~256** | - | ✅ | ✅ | - | ✅ | ICO + canvas + json + png |
| ZIP（全勾） | 同上 | - | ✅ | ✅ | ✅ | ✅ | 原始图片含在 zip |

**命名规则（所有格式 + ZIP 内部成员统一走 makeName()）：**
```
KIcon-{size}-{文本拼接}-{YYYYMMDDHHmmss}.{ext}
  canvas/ico/json/html/canvas/zip → 去 {size}
  text 模式 → 实际文本
  FA 模式 → iconName（FA 代号）
  image 模式 → 原文件名（去扩展名）
  多行直接拼接无分隔符
  过滤 /\:*?"<>| 非法字符
  总长度 ≤ 30 字符
```

---

## 十二、预览层与导出层差异清单

| 层级 | 预览层（preview.js） | 导出层（export → render mode='export'） |
|------|:----:|:----:|
| 灰白格子背景 | ✅ CSS pattern | ❌ 不画 |
| 辅助线（十字/米字/井字） | ✅ div 叠加层 | ❌ 不画 |
| 安全边距 | ✅ div 叠加层 | ❌ 不画 |
| 形状 clip | ✅ canvas clip | ✅ canvas clip |
| 内容/填充/阴影 | ✅ | ✅ |
| DPR 缩放 | ✅ | ❌ 强制 1x |
| 透明色处理 | - | ✅ 白色键控透明（JPG 例外） |
| 缩放/平移视图变换 | ✅（zoomFactor, offsetX/Y） | ❌ 总是 1:1 |

---

## 十三、实施阶段计划（修订版）

### 阶段一：骨架 + 基础渲染（可运行版本）
- [ ] index.html 入口 + Loading UI + Tailwind 双 CDN 回退 + JSZip + fa6.css
- [ ] schema.js（完整结构 + 参数范围 + DEFAULT_LINE + DEFAULT_FILL）
- [ ] state.js 核心（状态 + ImageRepo + undo/redo 骨架）
- [ ] shapes.js（circle / roundedSquare / polygon / star / buildPath / direction=0 基准）
- [ ] render.js 基础渲染（背景 → 单行文本；clip save/restore 强约束；mode='export' 1:1）
- [ ] ui.js（模块/标签/参数控件 + createLinkIcon + setTheme + 响应式骨架）
- [ ] fonts.js 基础（cnFont/enFont 列表 + 默认字体加载）
- [ ] preview.js 基础（canvas + 灰白格子 + zoom view）
- [ ] colors.js 基础（hex/rgb/hsl 转换 + 渐变生成）
- [ ] main.js 装配

**验收**：打开页面看到三栏布局，预览圆形图标（白"A"字 + 草绿底）；滑块实时更新；主题可切换；Ctrl+Z/Y 生效；参数联动勾选后值同步。

### 阶段二：内容扩展
- [ ] layouts.js（1~9 行所有排版模式 + ring 行布局）
- [ ] 多行内容标签组（"文/图/F" 按钮 + 文本输入框嵌入标题）
- [ ] FA 模式（fa_map.js 含 category/pathData + 分类树 + 搜索）
- [ ] 图片模式（上传 + 剪裁器 + 白色透明化）
- [ ] 每行样式标签：尺寸 / 颜色（单色+渐变）/ 阴影
- [ ] 快速复制粘贴样式（字段集合 = {size, angle, scaleX, scaleY, offsetX, offsetY, clipToShape, color.*, shadow.*}）
- [ ] 参数联动两阶段状态机完整实现
- [ ] 颜色建议（背景色变更触发 colors:changed 事件重算）

**验收**：多行切换、FA 图标选搜、图片剪裁、联动勾选传播。

### 阶段三：背景增强
- [ ] fillers.js（矩阵/饼图 + 层间/层内多滑块滑轨 + 均分按钮）
- [ ] 多色色块（1~6 独立配置：纯色/渐变/图片）
- [ ] 边界曲线（直线/sin/tan/锯齿 + tan 除零保护 + 10x 截断）
- [ ] 边框 + 形状阴影
- [ ] 形状独立拉伸、填满按钮
- [ ] 颜色建议一键填充纯色

### 阶段四：系统能力
- [ ] 撤销重做完整（全量快照 + redo 清空 deref + 淘汰最旧 deref）
- [ ] 预设系统（内置 + 导入不校验版本 + 导出剪裁量化 + 图片缺失占位 + 批量导入报告）
- [ ] 下载历史（20条 + 右键删除 + 缩略图 ≤50px 异步渲染）
- [ ] 顶部工具栏（标题 + 撤销/重做 + 联动按钮显示 all/partial/none 状态 + 主题切换）
- [ ] 字体加载状态（下拉框 "未下载" 标记 + 预览 "字体加载中" 提示 + 失败回退）
- [ ] FA 页面底部版权提示 + FA 标签内商用版权提醒

### 阶段五：下载 + 预览
- [ ] export.js 全格式（PNG/JPG/WebP/ICO/JSON/HTML/Canvas/ZIP）
- [ ] 透明色（白色键控透明 + JPG 不支持透明提示）
- [ ] 命名规则完整实现（makeName 统一入口 + ZIP 内部复用）
- [ ] 模态预览器（ESC/关闭/双击复位 + 辅助线跟随缩放平移）
- [ ] 原位缩放（滚轮进入模式 + 拖动 + 双击退出）
- [ ] 放大按钮（多栏模式左栏 → 50vw）
- [ ] 导出尺寸截断规则

### 阶段六：精细打磨
- [ ] 响应式级联压缩（三栏→两栏→单栏；标签平分法拆解；反压链路）
- [ ] 标签组自适应（唯一/并行；可用高度驱动；标签激活与参数连体浅蓝）
- [ ] 输入框与滑块二合一 + 非法输入浅红闪烁 2 次 + 最近合法值
- [ ] 环形向心文本（fonts.js drawText textLayout='ring' + ringDiameter=canvasSize）
- [ ] 动图首帧失败提示
- [ ] 性能优化（防抖重渲染、requestAnimationFrame、DPR 隔离）
- [ ] 完整验收测试

---

## 十四、需求歧义与确认

以下是需求原文中发现的歧义，已标注确认状态：

1. **填充 [参数]方向 旋转中心**（原需求三2.3 末尾写"旋转中心为内容/图片/图标的中心"）— 经确认，**旋转中心 = 形状中心（画布中心）**（需求原文为笔误，不应引用内容章节描述）。架构中 schema.layout.directions、fillers.split()、render 流水线均按形状中心处理。

2. **填充色块标签标题规格**（原需求三3.1 "宽度与高度相同为方向"）— 经确认，**填充色块标签标题为正方形**：宽高相同，都 = 2×文本高度；底色为该色块 canvas 预览色。架构 ui.js 新增 createFillTabTitle 组件。

3. **边界 params A、ω、φ、k 的合法数值范围** — 需求说"按函数安全给定范围"但未给具体数值。**架构暂定：A ∈ [-0.5, 0.5]，ω ∈ [0.01, 10]**。实现后可根据实际视觉效果调整。

4. **命名规则 FA 代号与空文本兜底** — 需求写"FA 使用 FA 代号"，架构确认 = `fa_map.js` 中的 iconName（如 'heart'），不是 unicode。**全部图片/FA、无文本场景，文件名中间片段兜底为 "icon"**。

5. **命名截断长度** — 需求只说"做总长度截断"，架构暂定 30 字符（超出截取）。

6. **HTML 下载 vs 复制 HTML** — 需求 3.3 写"点击即下载对应格式的文件"，需求 2.1 又写"复制 HTML 到剪贴板"。架构确认：**HTML 下载 = 生成 .html 文件下载**（内含 link 标签套组）；**复制 HTML = 复制 link 标签文本到剪贴板**。两者接口参数化，同一底层实现。

7. **FA 图标范围** — 需求写"FontAwesome6 全部图标"。架构确认 = **FontAwesome 6 Free**（约 2000+ 图标）。Pro 版本图标不在范围内，不支持商用版权合规的需求需后续评估。

---

## 十五、UI 视图状态 vs 业务 State 隔离

| 状态类型 | 示例 | 是否进 undo 快照 | 是否导出预设/历史 | 刷新后 |
|---------|------|:----:|:----:|:------:|
| **业务 State** | canvas.size, content.lines[].text/color/angle, background.shape, fills, layout, boundary | ✅ | ✅ | ✅（持久化） |
| **运行时资源** | ImageRepo（独立 Map）、字体加载缓存 | ❌ | ❌ | ❌（内存） |
| **UI 视图状态** | 预览 zoomFactor/offsetX/offsetY、辅助线类型、安全边距%、标签激活、剪裁器弹窗、模态开关、滚动位置、主题选择 | ❌ | ❌ | ❌（瞬时） |

**关键约束**：
- UI 视图状态 **不得写入 state JSON**，单独由各模块内存维护
- 响应式重布局（三栏→两栏→单栏）**只修改 DOM 视图，不修改 state 数据**
- 标签激活状态 **独立维护**，不因重布局丢失
- 辅助线/安全边距 **不导出**（preview 层绘制，render 导出层跳过）
- 字体加载状态 **三种**：未加载 / 加载中 / 加载失败回退 — UI 必须全部处理

---

## 十六、架构风险与防护清单

| # | 风险 | 来源 | 防护策略 |
|---|------|------|---------|
| 1 | **图片 ref/deref 不对称** | 多处增减引用（行/快照/历史/预设），任何一处漏写都会内存泄露或误释放 | ✅ 只在 6 个场景增减（见 images.js 引用规则）；详细设计阶段编写引用检查清单；实现时成对调用；单元测试覆盖 |
| 2 | **Canvas clip 累积状态残留** | Canvas 2D clip 是累积的，save 后不 restore 会永久影响后续绘制 | ✅ 架构层强制约束：所有 clip 必须包裹在 save/clip/restore 范式中；禁止全局持久 clip |
| 3 | **边界曲线数学崩溃** | 用户输入 ω=0、超范围参数，sin/tan 可产生无穷大 | ✅ 两层防护：schema 参数范围校验；render 渲染阶段二次截断兜底（ω=0 返回直线，超 10×canvas 截断） |
| 4 | **撤销快照内存压力** | 全量 JSON 快照 20 条，state 对象本身含 lines[9]/fills[6] 多层嵌套 | ✅ 动态上限：deviceMemory ≤4GB→10, ≤8GB→15, >8GB→20；**快照不序列化 base64**（只存 imageId）；base64 始终在 ImageRepo |
| 5 | **预设导出图片剪裁量化后不可还原** | 导出预设时图片被剪裁量化，导入后原始完整图片丢失 | ✅ 架构契约明确：预设 JSON 内图片数据是剪裁后片段，导入时注册进 ImageRepo；UI 在预设缩略图下可标注"图片裁剪版本" |
| 6 | **字体加载异步竞态** | 字体加载与渲染线程不同步，首次显示可能用占位字符 | ✅ 三种状态 UI：未加载/加载中/失败回退；render 遇到未就绪字体时绘制占位 + 预览层提示 |
| 7 | **响应式重布局丢失激活状态** | 三栏→两栏→单栏切换时标签组重新 DOM 渲染，原激活标签丢失 | ✅ 激活状态独立 DOM 属性维护（不属于 state）；重布局只改容器排列，不重建标签 |
| 8 | **大尺寸预览 canvas 超浏览器上限** | canvas.size=8192、DPR=2 时预览 canvas 理论上 16384² 超多数浏览器 16K 上限 | ✅ 预览 canvas = 容器显示尺寸 × DPR，与导出彻底解耦；绘制时统一 scale；仅导出 canvas 是真实 1:1 尺寸 |
| 9 | **双 CDN 全失效** | Tailwind/JSZip/字体都走 CDN，双 CDN 同时失效时整个 UI 不可用 | ✅ 最小本地兜底：预编译 Tailwind CSS 同时本地部署一份；JSZip 失败时禁用 ZIP 按钮并提示 |
| 10 | **file:// 协议 CORS** | ES modules 在 file:// 下因 CORS 加载失败 | ✅ **架构决策**：所有 JS 用普通 `<script>` 标签按序加载（不走 ES modules）；双击 index.html 核心场景可用 |

---

## 十七、快照 Schema 边界

### undo/redo 快照
- **包含**：canvas, content（含全部 9 行参数）, background（shape/fills/layout/boundary/border/shadow）, version
- **不包含**：theme（UI 视图状态）, session.*, ImageRepo（base64）, 字体缓存, UI 视图状态, 预设计数器, 下次行 id
- **体积控制**：快照 = JSON.parse(JSON.stringify(businessFields))，通常 <5KB/条

### history 快照
- 同 undo/redo 快照的业务字段集合
- 额外带：缩略图（≤50px canvas blob）, 下载 mode, 下载时间戳

### preset 快照（导出）
- **包含**：完整业务字段 + **剪裁量化后的图片 base64**（Presets.export 处理）
- JSON 体积：纯文字预设 <10KB；含图片的可能数百 KB

### 事务式预设导入
```
importPresets(jsonText):
  1. JSON.parse → 遍历所有 imageId → 对每个执行：
     a. 解析剪裁区域
     b. 从 ImageRepo 或 preset.base64 取数据
     c. 剪裁量化 → 注册到 ImageRepo → 得到新 imageId
  2. 参数合法性校验：多余参数抛弃，缺失补默认值
  3. **原子替换**：全部成功才入列，失败不破坏 state、ImageRepo、现有 presets
  4. 返回 { success[], warnings[], failures[] }
```
