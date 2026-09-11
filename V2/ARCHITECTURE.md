# KiconCreator V2 — 架构设计文档

> 版本：v2.02 | 日期：2026-09-11 | 基于 `doc/需求文档.md`

---

## 一、需求分析总览

### 产品定位
零安装、纯浏览器运行的图标制作工具，无需后端、无需 localStorage。Chrome / Edge 浏览器。

### 核心功能维度

| 维度 | 要点 |
|------|------|
| **内容（多行1-9行）** | 每行可选 文本 / 图片 / FontAwesome；排版：横排 / 纵排 / 环形向心；环形直径 = 画布宽度 |
| **背景形状** | 基础（无/圆形/圆角方形）、边形（3-8）、角星（3-8，含内角参数）；方向、弧度（100%为圆）、大小填满 |
| **边框与阴影** | 形状边框（向外延伸）、形状阴影；每行内容独立阴影 |
| **多色填充** | 单色 / 二色 ~ 六色；矩阵布局（横向/纵向层数）/ 饼图布局（多层）；层间比例、层内比例、方向、偏移、拉伸 |
| **边界过渡** | 边界形状（直线/sin/tan/锯齿）、过渡宽度、过渡样式（纯色/渐变/加深/变浅/透明） |
| **色块独立配置** | 每色块独立切换：纯色 / 渐变（线性/径向+角度）/ 图片 |
| **每行样式** | 尺寸（大小/角度/水平垂直拉伸/偏移）、颜色（单色/渐变）、阴影；支持超出形状范围裁切 |
| **参数联动** | 任意行任意参数可标记联动，调整时同步影响所有标记联动的行同参数；新增行继承联动状态 |
| **快速复制样式** | 每行可复制/粘贴样式模块参数（尺寸/颜色/阴影），跨模式只应用共有参数 |
| **下载** | PNG / JPG / WebP / ICO（固定 16-256 六档）/ Canvas / JSON / HTML / ZIP（多尺寸 32/64/128/256 + 代码/JSON/原始图片） |
| **命名规则** | `KIcon-{尺寸}-{文本内容}-{YYYYMMDDHHmmss}.{ext}`；代码/ico/json/html/canvas/zip 格式去 {尺寸} |
| **预览交互** | 滚轮缩放、拖动、双击复位退出缩放；模态查看器（1:1 + 自由缩放拖动 + ESC 关闭）；辅助线（无/十字/米字/井字）+ 安全边距（默认10%） |
| **撤销重做** | 全量 JSON 快照栈（最多 20 条，动态根据设备）；Ctrl+Z/Y（输入框内交给原生）；覆盖后重做失效 |
| **预设** | 内置预设常量数组 + 导入导出（参数差异提示、图片数据处理）+ 保存为预设 + 复制 JSON + 复制 HTML link |
| **下载历史** | 每次下载自动入列，最多 20 条，右键/长按删除；会话级，刷新丢失 |
| **图片仓库** | 上传图片只存一份 base64，所有引用方存 id + 引用计数，归零后延迟释放；预设导入时自动注册图片数据 |
| **主题** | 明亮（白底灰框浅蓝标签）/ 复古（米黄底棕框）/ 暗黑（黑底深灰框） |
| **响应式** | 默认 800×400 三栏等分；变窄→中右栏合并为标签组；再窄→纵向单列（预览固定顶部）；手机横屏自动进入三栏 |
| **标签组自适应** | 唯一标签组（功能切换不拆分）/ 并行标签组（视口充足时平铺展开） |

---

## 二、技术选型

| 项 | 方案 | 理由 |
|----|------|------|
| **渲染引擎** | HTML5 Canvas 2D | 所有形状/渐变/阴影统一绘制，导出与预览一致 |
| **前端框架** | 原生 ES6+（无框架） | 单文件零依赖即可运行，保持轻量化 |
| **CSS** | Tailwind CSS 3.x 预编译双 CDN（jsDelivr + unpkg） | 双 CDN 回退避免网络不可达 |
| **图标库** | FontAwesome 6 Free | 本地打包 fa_map.js（54KB）+ fa6.css（103KB），主界面加载后异步初始化 FA 渲染 |
| **ZIP 打包** | JSZip（CDN） | 多尺寸打包导出 |
| **ICO 格式** | 手写 ICO 二进制（20字节头 + 目录项 + PNG 块） | 内置 16/32/48/64/128/256 六档，不受导出尺寸设置影响 |
| **字体加载** | Web Fonts API + 系统字体回退 | 预加载默认字体，其它按需加载；失败提示原因并回退 |
| **持久化** | 无 localStorage | 预设/历史仅会话级，图片仅内存，符合需求 |

---

## 三、V2 目录结构

```
V2/
├── index.html                  # 主入口
├── fa6.css                     # FontAwesome 6 CSS（复用 V1）
├── ARCHITECTURE.md             # 本文档
├── css/
│   └── styles.css              # 自定义样式（主题变量、模块/标签层级）
└── js/
    ├── main.js                 # 入口：初始化装配、事件绑定、快捷键
    ├── schema.js               # JSON Schema + 默认值 + 参数校验范围
    ├── state.js                # 状态管理、undo/redo 栈、图片仓库引用计数
    ├── shapes.js               # 形状生成器（基础/边形/角星 → path points）
    ├── layouts.js              # 多行排列布局（居中、品字、四宫格、环形等）
    ├── fillers.js              # 填充生成器（矩阵/饼图布局、边界曲线）
    ├── colors.js               # 颜色工具（互补/类似/柔和/明亮、渐变）
    ├── fonts.js                # 字体加载管理（Web Fonts API + 回退）
    ├── fa_map.js               # FontAwesome 6 图标→path 映射（复用 V2_被V1误导）
    ├── ui.js                   # UI 框架：模块/标签/参数组件、主题、响应式
    ├── preview.js              # 预览模块：缩放/拖拽/模态/辅助线/安全边距
    ├── presets.js              # 内置预设常量 + 导入导出（图片数据处理）
    ├── history.js              # 下载历史列表
    ├── export.js               # 多格式导出（PNG/JPG/WebP/ICO/ZIP/JSON/HTML/Canvas）
    ├── images.js               # 图片处理：上传、剪裁器、引用计数释放
    └── utils.js                # 通用工具（DOM、事件、格式化、命名、校验、防抖）
```

### 文件间依赖关系

```
main.js ─┬─ schema.js
         ├─ state.js ──┬─ schema.js (依赖默认值/范围)
         │              └─ utils.js
         ├─ shapes.js
         ├─ layouts.js
         ├─ fillers.js
         ├─ colors.js
         ├─ fonts.js ──┬─ fa_map.js
         │             └─ fa6.css (link)
         ├─ render.js ──┬─ state.js (读)
         │              ├─ shapes.js
         │              ├─ layouts.js
         │              ├─ fillers.js
         │              ├─ colors.js
         │              ├─ fonts.js
         │              └─ images.js
         ├─ ui.js ──┬─ state.js (双向绑定)
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
         │                └─ utils.js
         ├─ export.js ──┬─ state.js
         │                ├─ render.js
         │                ├─ colors.js
         │                └─ utils.js
         └─ images.js ──┬─ state.js
                         └─ utils.js
```

---

## 四、核心模块设计

### 4.1 schema.js — 数据结构与校验

定义完整的 JSON 数据模型，包含：
- `DEFAULT_STATE`：所有参数的默认值
- `SCHEMA`：字段路径 → 类型/范围/描述的映射
- `validate(path, value)`：校验并返回合法值（超出范围截断到最近合法值）
- 参数范围示例：大小 1-300%、偏移 -100%~100%、行数 1-9、角度 0-360 度

**完整数据模型结构：**

```json
{
  "version": "2.02",
  "canvas": {
    "size": 256,
    "transparent": false
  },
  "theme": "bright",
  
  "content": {
    "lineCount": 2,
    "arrangement": "top-bottom",
    "layerOrder": "9-to-1",
    "lines": [ /* 9 个 line 对象 */ ]
  },
  
  "lineTemplate": {
    "id": 1, "enabled": true, "mode": "text",
    
    // 文本模式专用
    "text": "A", "cnFont": "Noto Sans SC", "enFont": "Arial",
    "weight": 700, "italic": false, "textLayout": "horizontal",
    "fontSize": 80,
    
    // 图片模式专用
    "imageId": null, "crop": {"x":0,"y":0,"w":1,"h":1},
    "whiteToTransparent": false,
    
    // FA 模式专用
    "faIcon": null,
    
    // 通用样式（所有模式共享）
    "size": 100, "angle": 0, "scaleX": 100, "scaleY": 100,
    "offsetX": 0, "offsetY": 0, "clipToShape": true,
    
    "color": {
      "mode": "solid", "color1": "#ffffff", "color2": "#000000",
      "gradientAngle": 0, "gradientType": "linear"
    },
    
    "shadow": {
      "enabled": false, "color": "rgba(0,0,0,0.3)",
      "size": 20, "blur": 10, "offX": 0, "offY": 0
    },
    
    "links": {
      "size": false, "angle": false, "scaleX": false, "scaleY": false,
      "offsetX": false, "offsetY": false, "clipToShape": false,
      "color.mode": false, "color.color1": false, "color.color2": false,
      "color.gradientAngle": false, "shadow.enabled": false,
      "shadow.color": false, "shadow.size": false, "shadow.blur": false,
      "shadow.offX": false, "shadow.offY": false
    }
  },
  
  "background": {
    "shape": {
      "group": "basic",   // basic | polygon | star
      "type": "circle",   // none | circle | roundedSquare | 3~8 | s3~s8
      "size": 100, "direction": 0, "arc": 22, "innerAngle": 60
    },
    "fillCount": 2,
    "fills": [ /* 6 个 fill 对象 */ ],
    "layout": {
      "type": "matrix",     // matrix | pie
      "layers": 1,
      "layerRatios": [0.5],  // 层数-1 个，层间比例
      "ratios": [0.5, 0.5],  // 层内分界线，每块色-1个
      "direction": 0,       // 旋转整个填充（饼图多层时每层独立）
      "offsetX": 0, "offsetY": 0,
      "scaleX": 100, "scaleY": 100
    },
    "boundary": {
      "transitionWidth": 0,
      "shape": "line",      // line | sin | tan | zigzag
      "params": {"A":0.1, "ω":1, "φ":0, "k":0},
      "zigzag": {"height":0.05, "width":0.1},
      "transitionStyle": "solid"  // solid | gradient | darker | lighter | transparent
    },
    "border": {
      "enabled": false, "width": 2, "color": "#000000"
    },
    "shadow": {
      "enabled": false, "size": 10, "blur": 10, "offX": 0, "offY": 0
    }
  },
  
  "fillTemplate": {
    "mode": "solid",  // solid | gradient | image
    "color": "#4f7a4f",
    "gradient": {
      "color1": "#4f7a4f", "color2": "#ffffff",
      "angle": 0, "type": "linear"
    },
    "image": {
      "imageId": null, "crop": {"x":0,"y":0,"w":1,"h":1},
      "size": 100, "offsetX": 0, "offsetY": 0
    }
  },
  
  "presets_builtin": [ /* JS 常量数组 */ ],
  "session": {
    "images": {
      "img_xxx": {"data": "<base64>", "refCount": 3, "name": "photo.png"}
    },
    "presets": [],
    "history": []
  }
}
```

### 4.2 state.js — 状态管理 + 撤销重做 + 图片仓库

**核心接口：**

```javascript
const State = {
  init(defaultState),                    // 初始化
  get(path),                             // 读取（支持点路径 "content.lines.0.size"）
  set(path, value, { history: true }),   // 设置（自动处理联动、可选记录历史）
  batchSet(changes, { history: true }),  // 批量设置（原子性）
  undo(),                                // 撤销
  redo(),                                // 重做
  clearHistory(),                        // 新操作后清空 redo 栈
  snapshot(),                            // 手动快照
  
  // 图片仓库
  ImageRepo: {
    add(base64, name),                   // 返回 imageId，refCount=1
    get(imageId),                        // 返回 { data, name, refCount }
    ref(imageId),                        // refCount++
    deref(imageId),                      // refCount--，归零时延迟释放 (5s)
    purge(imageId)                       // 强制释放
  }
}
```

**联动逻辑：**
```javascript
// 当 set("content.lines.0.size", 80) 被调用时：
// 1. 先正常修改行0的 size
// 2. 检查行0.links.size === true？ 
//    是 → 遍历所有其它行，如果该行.links.size === true → 同步修改 size
// 3. 记录快照到 undo 栈（如果 history=true）
// 4. 自动清空 redo 栈
```

**快照策略：**
- 全量 JSON 深拷贝（通过 `JSON.parse(JSON.stringify(state))`）
- 图片数据：快照只存 imageId 引用，不复制 base64
- 栈大小 20 条（根据设备内存动态降低）
- FIFO 淘汰最旧的
- 快照入栈时机：参数变更（滑块拖动结束 / 输入框失焦）、预设切换、图片切换、联动批量变更
- **不入栈**：预览拖动过程中、滑块拖动中（mouseup 才入）、下载动作

### 4.3 shapes.js — 形状生成器

**输入**：canvas size, shape config（group, type, size, direction, arc, innerAngle）
**输出**：一组 polygon 顶点或 Canvas path，用于 fill / clip / stroke

```javascript
const Shapes = {
  // 基础形状
  circle(size),                          // → [[cx,cy]] + radius
  roundedSquare(size, arc),              // arc 0→直角方形，arc 100→圆
  
  // 边形 (3~8)
  polygon(size, sides, direction),       // → vertices 数组
  
  // 角星 (3~8) — 双环顶点交替连接
  star(size, points, innerAngle, direction),
  // innerAngle=60→正尖角；innerAngle=0→形状消失（此时顶点退化到中心）
  
  // 生成闭合路径的方法
  buildPath(shape, size, opts) {
    // 返回 { points: [...], path: Path2D }
  },
  
  // 尺寸归一化：使形状外接矩形 = canvas size
  normalize(points, canvasSize)
}
```

### 4.4 layouts.js — 多行排列

根据行数和排列模式，计算每行的目标位置和尺寸。

```javascript
const Layouts = {
  // 输入：lineCount, arrangement, canvasSize
  // 输出：[{ lineId, x, y, w, h, rotation }]
  
  // 1行：上半边/下半边/左半边/右半边/居中
  single(lineCount, arrangement, size),
  
  // 2行：上(左右分)/下(左右分)/左(上下分)/右(上下分)/左右分/上下分
  pair(lineCount, arrangement, size),
  
  // 3行：一字横排/纵排/品字/倒品
  triple(lineCount, arrangement, size),
  
  // 4行：一字横排/纵排/四宫格/纵向121/横向121
  quad(lineCount, arrangement, size),
  
  // 5~9行：横排/纵排/环形（均匀角度分布）/网格（2x3、3x3等）
  multi(lineCount, arrangement, size),
  
  // 环形：每行占 (360/lineCount)°，半径 = canvasSize/4，中心 = canvasCenter
  ring(lineCount, size),
  
  // 网格：自动计算 rows × cols = lineCount
  grid(lineCount, rows, cols, size)
}
```

### 4.5 fillers.js — 多色填充分割

**矩阵布局**：矩形被十字线分割为 blocks 个单元格
**饼图布局**：圆被多层 + 每层的角度线分割为 blocks 个扇形

```javascript
const Fillers = {
  // 计算填充的几何分割
  split(shapePath, layoutConfig) {
    // 返回 blocks: [{ points, clipPath, fillIndex }]
  },
  
  // 边界曲线生成
  boundary(type, params, center, range) {
    // 返回一条曲线的 y=f(x) 函数（相对形状中心坐标）
    // line: 直线
    // sin:  y = A sin(ωx + φ) + k
    // tan:  y = A tan(ωx + φ) + k  ← tan 需截断处理（超过 canvas10倍截断）
    // zigzag: 锯齿（A=高度, ω=宽度）
    // 返回的曲线用于在分割线处产生过渡带
  },
  
  // 过渡样式生成（过渡带内的颜色混合）
  transition(style, colorA, colorB, width, position) {
    // solid → colorB
    // gradient → 渐变
    // darker → colorB 加深
    // lighter → colorB 变浅
    // transparent → rgba(B.r, B.g, B.b, position/width)
  }
}
```

### 4.6 colors.js — 颜色工具

```javascript
const Colors = {
  // HEX <-> RGB <-> HSL 转换
  hexToRgb(hex),
  rgbToHsl(r, g, b),
  hslToRgb(h, s, l),
  
  // 颜色方案生成（基于主色）
  suggestions(baseColor, type) {
    // type: 'complementary' | 'analogous' | 'soft' | 'bright'
    // 返回 N 个颜色数组（N = 填充数量或文本行数）
  },
  
  // 渐变生成器
  makeGradient(ctx, type, angle, color1, color2, size) {
    // linear: ctx.createLinearGradient + rotate
    // radial: ctx.createRadialGradient(center, 0, center, radius)
  },
  
  // 加深/变浅
  darken(color, amount),
  lighten(color, amount)
}
```

### 4.7 render.js — Canvas 渲染引擎

**渲染流水线：**

```
render(canvas, state, opts)
  │
  ├─ 1. canvas.width/height = state.canvas.size（设备像素比适配）
  ├─ 2. 绘制背景形状（先设 clip path = shapePath）
  │     ├─ 2a. [可选] shape shadow: 设置 ctx.shadow* → drawShape() → 清 shadow
  │     ├─ 2b. 多色填充循环 fillers.split() → 每个 block：
  │     │     ├─ 根据 fill 配置（solid/gradient/image）设置 fillStyle
  │     │     ├─ ctx.save(); ctx.clip(blockPath); fillCanvas(); ctx.restore()
  │     │     └─ 如果有 boundary 过渡，在 block 边缘叠加过渡带
  │     ├─ 2c. [可选] border: ctx.lineWidth; ctx.stroke(shapePath)
  │     └─ 2d. 恢复默认 clip
  │
  ├─ 3. 绘制内容（按 layerOrder 排序后的 lines）
  │     ├─ 3a. layouts.arrange() → 计算每行目标位置
  │     ├─ 3b. 每行：
  │     │     ├─ [可选] 设 clip = shape（若 line.clipToShape=true）
  │     │     ├─ ctx.save(); 应用 transform(scale, rotate, translate)
  │     │     ├─ [可选] ctx.shadow* → 绘制 shadow layer
  │     │     ├─ 根据 mode 绘制：
  │     │     │     ├─ text: fonts.drawText()
  │     │     │     ├─ image: images.drawImage()
  │     │     │     └─ fa: fonts.drawFA()
  │     │     ├─ 恢复 shadow
  │     │     └─ ctx.restore()
  │     └─ 3c. 恢复默认 clip
  │
  └─ 4. [可选] 绘制辅助线、边框色背景（非导出路径）
```

**关键保护：**
- 每次 draw 前先恢复所有 canvas state（fillStyle, strokeStyle, shadow*, clip, transform）
- 所有 try-catch 防止渲染崩溃；异常时显示错误信息
- tan 边界超过 canvas 10 倍时截断
- 字体未加载完成时，文本绘制显示占位字符并在预览上提示

### 4.8 export.js — 多格式导出

```javascript
const Export = {
  // 核心：从 render 拿到临时 canvas，然后 toBlob
  buildExportCanvas(state, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    // 透明背景：跳过白色填充
    if (!state.canvas.transparent) {
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
    }
    Renderer.render(c, state);
    return c;
  },
  
  PNG(size)  → canvas.toBlob('image/png')
  JPG(size)  → canvas.toBlob('image/jpeg', 0.92)
  WebP(size) → canvas.toBlob('image/webp', 0.92)  // 不支持时隐藏按钮
  ICO()      → makeICO([16,32,48,64,128,256])  // 手写 ICO 格式，固定尺寸，不受 canvas.size 影响
  Canvas()   → 生成 <canvas width=N height=N><script>...</script> 文本
  JSON()     → JSON.stringify(state)
  HTML()     → 生成 <link> 标签（含 ico/apple-touch-icon 等）
  ZIP(opts)  → JSZip().add(多尺寸png + json + canvas + 原始图片 if opts)
  
  // 命名
  makeName(state, ext, size) {
    // KIcon-{size}-{textContent}-{YYYYMMDDHHmmss}.{ext}
    // 代码/ico/json/html/canvas/zip → 去 {size}
    // 过滤非法字符 /\\:*?"<>|，总长度截断
  }
}
```

### 4.9 ui.js — 动态 UI 框架

根据 schema 和 state 动态生成控制面板。

```javascript
const UI = {
  // 模块系统
  createModule({title, content})   // 带标题和边框的模块容器
  
  // 标签组（两种形式）
  createTabGroup({
    title, tabs, direction: 'h'|'v', 
    parallel: false|true,          // 并行标签组可平铺，唯一标签组不可
    defaultActive: 0
  })
  
  // 参数控件
  createRangeParam({path, min, max, step, value, unit, links}),
  createColorParam({path, value, onChange}),
  createSelectParam({path, options, value}),
  createToggleParam({path, value}),
  createTextParam({path, value, maxLength}),
  
  // 参数联动链接图标（链条）
  createLinkIcon({path, active, onToggle}),
  
  // 主题切换
  setTheme('bright' | 'retro' | 'dark'),
  
  // 响应式：监听 resize，调整布局
  observeResponsive()
}
```

**布局规则（来自需求文档）：**

```
栏（三栏等分）
├── 栏标题（顶部，无框无底）
└── 模块（纵向排列）
    ├── 模块标题栏
    └── 模块内容（包含标签组 / 参数 / 组件）

标签组
├── 唯一标签组：不可平铺拆分，必须保留一个激活
└── 并行标签组：视口充足时自动平铺展开

自适应：
  viewport.w ≥ 800px
  viewport.h ≥ 400px  → 三栏等分
  
  viewport.w ∈ [500, 800)
  viewport.h ≥ 400px  → 两栏：左栏(预览) | 右栏(合并中右栏为标签组)
  
  viewport.w < 500px
  或 viewport.h < 400px → 单栏纵向（预览固定顶部浮动 max-h: 33vh）
  
  标签组内自适应：
    纵向空间充足 → 标签纵向堆叠
    横向空间充足 → 标签横向并排
    都充足 → 两方向同时展开（3×3 网格等）
```

### 4.10 preview.js — 预览模块

```javascript
const Preview = {
  init(canvas, modalCanvas),
  
  // 原位缩放：滚轮 + 拖动 + 双击复位
  zoom: {
    factor: 1,      // 1 = 100% of canvas
    offsetX: 0,     // 拖动偏移（以预览容器中心为原点）
    offsetY: 0,
    max: 10, min: 0.1
  },
  
  // 模态查看器
  openModal(),      // 1:1 真实尺寸
  closeModal(),     // ESC / 关闭按钮 / 双击复位
  
  // 辅助线（叠在 canvas 上层的 div）
  setGuides('none' | 'cross' | 'star' | 'grid'),
  setSafeMargin(percent),  // 默认 10%
  
  // 画布背景：灰白格子（CSS pattern）
  // 不导出到 image（export.canvas 不画格子）
}
```

### 4.11 images.js — 图片处理与剪裁

```javascript
const Images = {
  // 上传（File → ImageRepo）
  async upload(file) {
    // 校验尺寸（>1MB 提醒）
    // 动图取首帧
    // 注册到 ImageRepo，返回 imageId
  },
  
  // 剪裁器（独立模态）
  openCropper(imageId, initialCrop, onConfirm),
  
  // 剪裁后缩放绘制
  drawClipped(ctx, imageId, crop, x, y, w, h) {
    ctx.drawImage(img, crop.x*sw, crop.y*sh, crop.w*sw, crop.h*sh, x, y, w, h);
  },
  
  // 白色透明化（图片模式每行独立开关）
  whiteToTransparent(imageData, threshold=128) {
    // 逐像素：接近白色 → alpha=0
  }
}
```

### 4.12 presets.js — 预设系统

```javascript
const Presets = {
  // 内置预设（JS 常量数组，每个包含 canvas/background/content 完整配置）
  builtin: [ /* 6~10 个典型预设 */ ],
  
  // 导入（支持批量 + 图片数据自动注册到 ImageRepo）
  import(jsonText) {
    // try JSON.parse → 校验版本 → 图片 base64 剥离注册到 ImageRepo
    // → 参数差异提示（多的参数丢弃，缺失的补默认）
    // → 返回 { success: [], warnings: [], failures: [] }
  },
  
  // 导出（图片数据 base64 化）
  export(state) {
    // 遍历所有 imageId，从 ImageRepo 取 base64 嵌入 JSON
    // 返回 JSON 字符串
  },
  
  // 保存当前为预设
  saveCurrent(name, thumbBlob) {
    // 等同于 export → 加入 state.session.presets
  },
  
  // 预设列表渲染
  renderList() {
    // 每行横向排列多个 50px 以内的预览图
    // 点击即应用
  }
}
```

### 4.13 history.js — 下载历史

```javascript
const History = {
  record(state, mode) {
    // 下载后自动记录
    // 生成缩略图（render → canvas 缩放 → toBlob）
    // state.JSON（不含图片 base64，用 id 引用）
    // 最多 20 条，FIFO
  },
  
  recover(id) {
    // 恢复对应历史快照到 state
  },
  
  delete(id) {
    // 释放图片引用
  }
}
```

### 4.14 fonts.js — 字体加载与 FA 渲染

```javascript
const Fonts = {
  // 字体列表（内置 + 按需加载的 Web Fonts）
  listCN: [
    {name: 'Noto Sans SC', url: 'https://fonts.googleapis.com/...', isWeb: true},
    {name: '思源黑体', isWeb: false},  // 系统字体回退
    ...
  ],
  listEN: [
    {name: 'Arial', isWeb: false},
    {name: 'Inter', url: '...', isWeb: true},
    ...
  ],
  
  async load(fontName) {
    // FontFace API 加载 Web 字体
    // 显示 "字体加载中" 提示
    // 失败 → 回退系统字体 + 提示原因
  },
  
  // 文本绘制（支持横排/纵排/环形向心）
  drawText(ctx, text, cnFont, enFont, options) {
    // 根据字符类型选 cn/en 字体
    // 环形：每个字符 rotate(stepAngle) + translate
    // 纵排：每字换行
  },
  
  // FA 图标绘制
  drawFA(ctx, faIcon, size, color) {
    // 方式一：font-family 'Font Awesome 6 Free' + fillText(unicode)
    // 方式二：从 fa_map.js 取 SVG path → ctx.fill(path)
    // 优先用方式二（不依赖 DOM 字体已就绪）
  }
}
```

---

## 五、渲染流水线（简图）

```
┌─────────────────────────────────────────────────────────────┐
│                      render.js                              │
│                                                             │
│  输入: canvas, state                                        │
│                                                             │
│  1. canvas.size = state.canvas.size  (DPR 适配)             │
│                                                             │
│  2. 绘制背景 shape (outermost)                              │
│     ├─ ShapePath = shapes.buildPath(shape, canvas.size)     │
│     ├─ [可选] border-shadow                                 │
│     ├─ for each filler block (fillers.split):              │
│     │     ├─ 设 fillStyle = fills[i].mode → color/grad/img │
│     │     ├─ ctx.save(); ctx.clip(block); fill(); restore()│
│     │     └─ [可选] boundary 过渡带                         │
│     └─ [可选] border stroke                                 │
│                                                             │
│  3. 绘制 内容 lines (按 layerOrder 排序)                    │
│     ├─ positions = layouts.arrange(state.content)           │
│     ├─ for each line:                                      │
│     │     ├─ [clipToShape ?] ctx.clip(ShapePath)           │
│     │     ├─ ctx.save(); 应用 transform                    │
│     │     ├─ [可选] ctx.shadow*                              │
│     │     ├─ draw: fonts/text | fonts/FA | images/img       │
│     │     └─ ctx.restore()                                  │
│                                                             │
│  4. 恢复所有 ctx state                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 六、主题系统

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
}

[data-theme="retro"] {
  --bg-page: #fdf6e3;       /* 米黄 */
  --bg-module: #fffbeb;
  --border-module: #b45309;
  --bg-tab: #fde68a;
  --bg-tab-active: #fbbf24;
  --border-tab: #d97706;
  --text-primary: #7c2d12;
  ...
}

[data-theme="dark"] {
  --bg-page: #0f172a;
  --bg-module: #1e293b;
  --border-module: #334155;
  --bg-tab: #1e3a5f;
  --bg-tab-active: #2563eb;
  --border-tab: #3b82f6;
  --text-primary: #f1f5f9;
  ...
}
```

---

## 七、参数联动核心逻辑

```javascript
// state.js 中 set() 方法实现
function set(path, value, opts = {history: true}) {
  const oldVal = get(path);
  if (oldVal === value) return;
  
  // 1. 正常修改
  const parts = path.split('.');
  // ... 深层对象赋值
  
  // 2. 处理联动（仅当 history=true 时才同步联动行）
  if (opts.history) {
    const linkPath = path;  // 'content.lines.0.size' → linkPath = 'size'
    const propName = path.split('.').pop();
    
    if (linkPath.startsWith('content.lines.')) {
      // 当前行是哪一行
      const lineIdx = parseInt(path.split('.')[2]);
      const subPath = path.split('.').slice(3).join('.');
      
      // 遍历所有其它行
      state.content.lines.forEach((line, i) => {
        if (i === lineIdx) return;
        if (line.links[subPath]) {
          // 该行标记了联动 → 同步修改
          setDirect(`content.lines.${i}.${subPath}`, value, {history: false});
        }
      });
    }
  }
  
  // 3. 记录历史
  if (opts.history) {
    pushUndo();
    redoStack = [];
  }
  
  // 4. 触发重渲染
  emit('state:changed', path);
}

// 批量启用/关闭所有联动（顶部工具栏按钮）
function setAllLinks(enabled) {
  state.content.lines.forEach(line => {
    Object.keys(line.links).forEach(key => {
      line.links[key] = enabled;
    });
  });
  pushUndo();
  render();
  updateLinkIcons();
}
```

---

## 八、撤销重做栈设计

```
┌────────────────────────────────────────────────────┐
│ undoStack: [snapshot_1, snapshot_2, ... snapshot_20] │
│   ↑ oldest                                    ↑ newest│
│                                                       │
│ redoStack: [] (被新操作清空)                           │
│                                                       │
│ 快照 = JSON.parse(JSON.stringify(state))              │
│   - content.lines[].imageId 保留字符串引用（不复制base64）│
│   - session.presets[].imageId 同理                     │
│                                                       │
│ 入栈时机:                                              │
│   ✅ 参数变更（滑块 mouseup, 输入框 blur）             │
│   ✅ 预设切换                                          │
│   ✅ 图片切换                                          │
│   ✅ 参数联动批量变更                                  │
│   ✅ 行数切换                                          │
│                                                       │
│ 不入栈:                                                │
│   ❌ 滑块拖动中（mousemove）                           │
│   ❌ 预览拖动/缩放                                     │
│   ❌ 下载                                              │
│   ❌ UI 样式（主题切换、标签激活）                      │
└────────────────────────────────────────────────────┘
```

---

## 九、会话图片仓库

```javascript
const ImageRepo = {
  store: new Map(), // imageId → { data, refCount, name, disposeTimer }
  
  add(base64, name) {
    const id = 'img_' + Math.random().toString(36).slice(2, 10);
    this.store.set(id, { data: base64, refCount: 1, name });
    return id;
  },
  
  ref(id) {
    const item = this.store.get(id);
    if (item) {
      item.refCount++;
      if (item.disposeTimer) {
        clearTimeout(item.disposeTimer);
        item.disposeTimer = null;
      }
    }
  },
  
  deref(id) {
    const item = this.store.get(id);
    if (item) {
      item.refCount--;
      if (item.refCount <= 0) {
        // 5 秒后释放（给可能的恢复操作留窗口）
        item.disposeTimer = setTimeout(() => this.store.delete(id), 5000);
      }
    }
  },
  
  // 引用来源（影响哪些地方 refCount++）：
  //   - 每行 content（mode=image） 引用自己的 imageId → +1
  //   - 每行 background.fill[i]（mode=image）→ +1
  //   - session.history[i].imageIds → +1
  //   - session.presets[i].imageIds → +1
  //   - undoStack[i] 中的 imageIds → +1
  //   - redoStack[i] 中的 imageIds → +1
}
```

---

## 十、ICO 格式说明

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

## 十一、实施阶段计划

### 阶段一：骨架 + 基础渲染（可运行版本）
- [ ] index.html 入口 + Loading UI + Tailwind 双 CDN 回退 + JSZip/FA 6 link
- [ ] schema.js（完整 JSON 结构 + 默认值 + 参数范围校验）
- [ ] state.js（状态管理基础 + 图片仓库 + undo/redo 骨架）
- [ ] shapes.js（circle / roundedSquare / polygon / star）
- [ ] render.js（基础渲染：canvas + 形状 + 单行文本）
- [ ] ui.js（模块容器 + 标签组 + Range/Color/Toggle 参数控件 + 主题）
- [ ] fonts.js（中文字体 + 英文字体列表，基础加载）
- [ ] preview.js（基础预览 canvas + 灰白格子背景）
- [ ] main.js（装配所有模块）

**验收**：打开页面看到三栏布局，预览区有默认圆形图标（白色"A"字 + 草绿底），可调整基本参数实时预览变化，可切换主题。

### 阶段二：内容扩展
- [ ] layouts.js（所有排列模式实现）
- [ ] 多行内容标签组 UI + 并行/串行自适应
- [ ] FA 图标模式（从 fa_map.js 取 path 渲染，FA6 搜索树）
- [ ] 图片模式（上传 + 剪裁 + 白色透明化）
- [ ] 每行样式标签：尺寸 / 颜色（单色+渐变）/ 阴影
- [ ] 快速复制粘贴样式
- [ ] 参数联动全量实现

**验收**：可切换多行（1-9），每行可选文本/图片/FA，支持尺寸/颜色/阴影设置，参数联动生效。

### 阶段三：背景增强
- [ ] fillers.js（矩阵/饼图布局分割）
- [ ] 多色色块（1-6色）独立配置
- [ ] 边界曲线（直线/sin/tan/锯齿 + 过渡带）
- [ ] 边框 + 形状阴影
- [ ] 层间比例 / 层内比例（多滑块共享滑轨）
- [ ] 颜色建议（互补/类似/柔和/明亮，单色一键填充）

**验收**：可切换多色填充，矩阵/饼图布局，边界曲线，边框阴影。

### 阶段四：系统能力
- [ ] 撤销重做完整实现（全量快照 + 图片引用处理）
- [ ] 预设系统（内置预设 + 导入/导出/保存 + JSON 复制 + HTML link 复制）
- [ ] 下载历史（20条，会话级，右键删除）
- [ ] 图片仓库完整引用计数
- [ ] 字体 Web Fonts API 按需加载 + 回退提示
- [ ] FA 商用版权提醒

**验收**：Ctrl+Z/Y 生效，预设可导入导出，下载历史记录。

### 阶段五：下载 + 预览
- [ ] export.js（PNG/JPG/WebP/ICO/JSON/HTML/Canvas/ZIP 全格式）
- [ ] 多尺寸 ZIP 打包（32/64/128/256 + 代码/JSON/原始图片）
- [ ] 命名规则实现
- [ ] 模态预览器（ESC/关闭/双击复位）
- [ ] 原位缩放（滚轮+拖动+双击退出）
- [ ] 辅助线（无/十字/米字/井字）+ 安全边距
- [ ] 透明色导出（JPG 不支持）

**验收**：所有下载格式可用，模态查看器正常。

### 阶段六：精细打磨
- [ ] 响应式自适应（三栏→两栏→单栏 + 手机横屏自动恢复）
- [ ] 标签组并行/串行自适应展开
- [ ] 输入框与滑块二合一（直接输入 + 校验闪烁）
- [ ] 环形向心文本
- [ ] 动图取首帧处理
- [ ] FA 6 底部版权提示
- [ ] 性能优化（防抖重渲染、DPR 适配）
- [ ] 完整测试

---

## 十二、FA 图标数据说明

从 V2_被V1误导的/js/fa_map.js 复用。该文件导出：
```javascript
const FA_MAP_ALL = {
  // iconName → { unicode, aliases: [...] }
  'heart': { unicode: 'f004', aliases: ['favorite', 'like'] },
  ...
};
window.FA_MAP = FA_MAP_ALL;
```

渲染时优先用 SVG path（从 FontAwesome 的 CSS data 属性获取 path data），或用 `ctx.font = 'Font Awesome 6 Free' + ctx.fillText(String.fromCharCode(0xf004))`。

fa6.css (103KB) 复用 V1/fa6.css。

---

## 十三、与 V1 的区别（确认不参考 V1 实现细节）

| 方面 | V1 | V2 |
|------|----|----|
| 架构 | 单文件 HTML + 大量内联 JS | 模块化 JS 文件 + 清晰依赖关系 |
| 数据模型 | 无显式 schema，参数散落在函数 | 统一 schema.js 定义，带校验范围 |
| 渲染 | 单 canvas，参数驱动 | 完整渲染流水线：形状分割 → 填充 → 内容 → 效果 |
| 状态 | 无 undo/redo | 全量 JSON 快照栈 + 联动 + 图片仓库 |
| UI | Tailwind Play CDN（阻塞 15s+） | 预编译双 CDN 回退 + Loading UI |
| 主题 | 无 | 三种（明亮/复古/暗黑） |
| 响应式 | 基础 | 完整三→两→单栏自适应 + 标签组平铺 |

