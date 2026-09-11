# Changelog

> 版本：v0.01 | 日期：2026-09-11

---

## v0.01（2026-09-11）

架构设计文档首次正式发布。经三轮 AI 评审（deepseek / GLM5.3 / 豆包）修订后定稿，吸收评审共识完成 P0 修正 8 项、P1 补充 11 项、P2 文档自洽 3 项。

### 新增内容
- 完整 JSON Schema 数据模型（canvas / content.lines / background.shape / fills / layout / boundary 全字段定义）
- 14 个模块接口设计（schema / state / shapes / render / layouts / fillers / colors / fonts / fa_map / ui / preview / presets / history / export / images / utils）
- 渲染流水线（形状 → 填充 → 内容 → 效果）与 clip save/restore 强约束
- 参数联动两阶段状态机（标记传播 + 值同步 + 新增行继承 + 单独取消）
- 会话图片仓库引用计数与 5s 延迟释放机制
- 撤销重做栈（20 条 FIFO、redo 清空强制 deref、快照 imageId 引用而非 base64）
- ICO 手写二进制格式说明
- 下载组合矩阵（PNG/JPG/WebP/ICO/Canvas/JSON/HTML/ZIP 全格式 × 多尺寸打包 × 代码打包 × 原始图片）
- DPR 导出隔离设计（预览做 DPR 适配，导出强制 1:1）
- 六阶段实施计划（骨架 → 内容扩展 → 背景增强 → 系统能力 → 下载预览 → 精细打磨）

### P0 修正（评审共识，必须实现）
1. 参数联动重构为两阶段状态机（新增 toggleLink 处理勾选传播；set 只负责值同步）
2. 预设导入不做版本校验（需求 2.1 明确只做参数合法性校验 + 默认值回填 + 多余参数抛弃）
3. 饼图多层方向改为数组 `directions[]`（原单值字段装不下每层独立方向）
4. 背景形状新增 `stretchX / stretchY` 独立拉伸参数
5. redo 栈清空时强制 deref redo 所有快照的图片引用（clearRedoWithDeref）
6. render.js 补回目录树
7. fa_map.js 补充 category 和 pathData 字段（支持 FA 分类树 + canvas path 直接绘制）
8. 透明色语义修正为白色键控透明（shape=none 分支按 white→transparent 处理，非跳过白色填充）

### P1 补充
- clip 必须包裹 save/restore 强约束
- 预设导出图片剪裁量化（仅保存可见部分，不是完整原始 base64）
- 形状 direction=0 几何基准：最下边水平
- 形状填满按钮（fillCanvas）
- 环形行布局（layouts.js 半径=canvasSize/4）与环形向心文本（fonts.js 直径=canvasSize）显式区分
- 导出尺寸截断规则（<0→16, >10000→8192）
- ZIP 内部成员文件名统一复用 makeName()
- export.toHTML() 与 presets.copyHTML() 同一实现函数
- 新增行 links 初始化：全局有任何联动标记 → 新行全部可联动参数 links=true
- tan 边界 ω=0 除零保护返回直线 fallback
- tan 边界超 10 倍画布尺寸截断

### P2 文档自洽
- fa_map.js 来源注释清理
- lineTemplate 不再作为运行时对象存在
- background.boundary 明确为布局级别，非每个 fill 色块独立配置

### 需求歧义状态（经产品方确认）
1. 填充 [参数]方向 旋转中心 **已确认为形状中心（画布中心）**（需求原文为笔误）
2. 填充色块标签标题规格 **已确认为正方形**：宽高 = 2×文本高度，底色为该色块 canvas 预览色
3. 边界 params A/ω/φ/k 合法数值范围架构暂定：A∈[-0.5,0.5]，ω∈[0.01,10]

---

## v0.01 内容增强（2026-09-11）

经产品方确认两条需求歧义后，架构文档补齐以下明确描述：

### 旋转中心双轨明确化
- content.lines[i].angle **旋转中心 = 本行内容/图片/图标的中心**
- background.layout.directions[]（填充旋转）**旋转中心 = 形状中心（画布中心）**
- 涉及修改：schema angle 字段注释、schema layout.directions 注释、fillers.split() 说明、render 流水线 transform 说明

### 填充色块标签 UI 规格明确化
- 新增 ui.createFillTabTitle 组件定义
- 标签标题为正方形（宽高 = 2×文本高度）
- 标签底色为该色块 canvas 预览色
- 标签左上角有"纯/渐/图"三态模式切换按钮
- 涉及修改：schema fillDef 后新增 UI 规格注释块、ui.js 新增 createFillTabTitle 接口
