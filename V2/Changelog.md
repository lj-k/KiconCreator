# Changelog

> 版本：v0.01 | 日期：2026-09-11

---

## v0.01（2026-09-11）

架构设计文档首次正式发布。经三轮 AI 评审（deepseek / GLM5.3 / 豆包）修订后定稿。

---

## v0.01 第三轮 AI 评审修订（2026-09-11）

基于三份独立评审（deepseek 20 条 P0 + 9 条内部矛盾 + 11 条风险 / GLM5.3 M1~M8 + F1~F8 / 豆包 7 条 P0 + 7 条 P1 + 6 条 P2），选择性采纳 P0 6 项。

### 三家共识 P0 架构自相矛盾修正

1. **theme 从撤销/重做快照中移除**（GLM5.3 M1 + deepseek #2 + 豆包）
   - schema L142 theme 标注为 UI 视图状态（业务 state 中保留值但不进快照序列化）
   - L297 / L483 / L1378 三处快照包含字段中移除 theme
   - 十五节 UI 状态隔离表与十七节快照边界现已完全一致
   - 需求四.2 "不产生动作历史：界面样式" → theme 属于 UI 样式，不应进快照

2. **引用计数总账模型重写**（GLM5.3 M2 + deepseek #19 + 豆包）
   - 总账 = 当前 state 占 1 份 + 每份快照各占 1 份
   - 栈间转移不增减 ref（只从 undoStack 挪到 redoStack，总引用数不变）
   - pushUndo → 新快照 +1
   - FIFO 淘汰 / clearRedoWithDeref → 对应 -1
   - 更换图片 → deref 旧的那 1 份 state 引用 + ref 新的
   - 消除双重计数 bug 和"当前 state 那一份引用从未建模"的遗漏
   - images.js 引用规则重写 + 撤销栈伪代码重写

3. **行隐藏 enabled=false 不 deref 图片**（GLM5.3 M3 + deepseek #19）
   - 原 images.js 写"行删除（lineCount 减少，enabled=false）→ deref 该行 imageIds"
   - 与需求三.3 "行被减去增加后其参数和模式不必重置"冲突 + 5s 延迟释放 → 图片丢失
   - 修正：enabled=false 仅改 UI 显示，**不 deref**；state 中 imageId 保持引用

4. **新增行联动继承改为按参数而非全部参数**（deepseek #18）
   - 原 `anyLinked → 所有可联动参数 links=true` 导致新行全部参数联动
   - 修正：对每个可联动参数，若已有行该参数 links=true → 新行该参数 links=true
   - 新增 `LINKABLE_LINE_PARAMS` 对象（按参数 key 索引）

5. **背景联动超范围设计回退为 P2 扩展**（豆包 P0 #2）
   - 原 LINKABLE_PARAMS 扩展到 background.fills.*.color / boundary.params.Aωφk / shape.direction
   - 需求 V2.02 仅针对内容参数栏各行参数联动
   - 超范围设计导致：多余字段进入 JSON schema、预设导入导出冗余字段、快照体积膨胀
   - 修正：拆为 LINKABLE_LINE_PARAMS（V2 必实现）+ LINKABLE_PARAMS_P2（后续版本）
   - V2 架构强约束：只有 content.lines[i].links 存在，_fillDef/shape/layout/boundary 无 links

6. **颜色一键填充仅纯色**（deepseek #3）
   - 原 colors.js 写"渐变填充：设置 fills[i].mode='gradient'"
   - 需求三.2.4 明确"一键填充仅限制纯色"
   - 修正：渐变颜色建议只作为颜色选择器候选项展示，不直接切换 mode

---

## v0.01 第二轮 AI 评审修订（2026-09-11）

基于三份独立评审（deepseek P0 8条 + GLM5.3 P0 4条架构自相矛盾 + 豆包需求遗漏与风险点），选择性采纳 P0 6 项 + P1 7 项。

### P0 架构自相矛盾修正
1. **JSON 导出与预设导出统一** — Export.toJSON() 复用 Presets.export()（剪裁量化 + 图片数据一同导出）
2. **ImageRepo 独立 Map vs schema session.images 解耦** — session.images 仅 imageId 轻量索引；base64 始终在 ImageRepo
3. **lines 常驻 9 个 + enabled vs push 新行** — 替换为 setLineCount(newCount)
4. **canvas.size 分段函数** — <0→16, >10000→8192, 16~10000 clamp
5. **图片引用规则修正** — 仅 6 种场景增减 ref
6. **撤销栈动态上限** — deviceMemory 感知

### P1 重要补充
7. 可联动参数注册表 LINKABLE_PARAMS
8. colors.suggestions 拆双向基准
9. file:// 加载策略 + 本地兜底
10. 边框外延实现策略标注风险点
11. 预设导入事务模式
12. 新增 4 条需求歧义
13. FA 图标范围确认

### 新增三个架构层章节
- **十五、UI 视图状态 vs 业务 State 隔离**
- **十六、架构风险与防护清单**
- **十七、快照 Schema 边界**

---

## v0.01 内容增强（2026-09-11）

经产品方确认两条需求歧义后补齐：
- 旋转中心双轨明确化（content = 本行内容中心；background = 形状中心）
- 填充色块标签 UI 规格明确化（正方形 2×文本高度 + canvas 预览底色 + "纯/渐/图"三态按钮）

---

## v0.01 第四轮遗漏修复（2026-09-11）

系统回溯三份评审所有条目，发现 5 个真遗漏（前三轮修订中漏掉的）。

### deepseek 内部矛盾
11. **closeModal 注释混入"模态内双击"**（deepseek 内部矛盾 #5）：closeModal() 仅处理 ESC/关闭按钮退出；模态内双击 = 新增 resetZoomOffset()（只复位 zoom+offset 不关闭）。需求 1.4 明确区分

### GLM5.3 P1：文档内部不一致
12. **依赖图缺 3 条边**（GLM5.3 P1-7）：
    - presets.js → render.js：renderList 缩略图
    - history.js → render.js：record/restore 缩略图
    - export.js → presets.js：export 复用 Presets.toJSON
13. **layerOrder 枚举方向无映射**（GLM5.3 P1-8）：枚举描述绘制方向（先→后），UI 描述"顶层/底层"概念，方向相反。加显式映射表
14. **whiteToTransparent 路径写错 image 子对象**（GLM5.3 P1-11）：schema L183 确认是行级顶层字段；render.js L727 和 images.js L1168 错写为 line.image.whiteToTransparent → 修正为 line.whiteToTransparent
15. **FA makeName 写 unicode 或 iconName**（GLM5.3 M9）：L764 makeName 注释与十四节歧义确认矛盾 → 统一为 iconName（不是 unicode）

### 一致性校验
- whiteToTransparent 全文档 5 处：schema L147/L183、render L727、images 模块 L914、引用清单 L1168 → 全部 line.whiteToTransparent ✅
- closeModal / resetZoomOffset 分离：L879-880 ✅
- FA iconName 统一：schema L184、makeName L774、歧义清单 L1439 → 全部 iconName ✅
- 依赖图 3 条补边：L109/L112/L115 ✅
- layerOrder 映射表：L155-161 ✅
---

## v0.01 自我评审勘误（2026-09-11）

8 维度系统扫：schema 字段 / 伪代码自洽 / 引用记账配平 / 渲染路径 / 模块边界 / 歧义清单覆盖 / typo。

### P0：undo/redo 引用记账自相矛盾（最严重，会导致 redo 丢图）

4.11 L922 白名单已写"undo/redo 入栈 ref +1"，但 L939-942 又写"栈间转移不增减 ref"，第九节伪代码只做了 derefOnlyIn 漏了 ref +1。三处互斥。

用总账模型配平（refCount = state 1 份 + 每份快照 1 份）：
- undo() 拍 currentSnap 入 redoStack → **必须 ref +1**（redoStack 新增持有）
- state 从 C 变 B → 对原 state 独有图片 deref -1
- 净变化 = 0

如果只做 deref -1 不做 ref +1，currentSnap 独有的图片会归 0 引用进入 5s 延迟释放，redo 回来丢图。

修正：
- 4.11 "不增减 ref" 注释改为"净变化为 0，但两步都要做"
- 第九节 undo() 伪代码补 currentSnap.imageIds.forEach(id => ImageRepo.ref(id))
- redo() 对称补

### P1：toCanvas 描述太简（GLM5.3 P0-4 遗留）

原 L755 只写 <canvas width=N><script>DPI=1</script> 一行。需求是完整自包含 HTML 页面，需：
- 自包含 state 序列化（base64 图片内嵌）
- 简化版绘制逻辑（从 render.js 裁剪可序列化子集）

已补完整说明。

### P1：命名规则 typo

L1342 重复 canvas（canvas/ico/json/html/canvas/zip）→ 去重为 canvas/ico/json/html/zip。

### 8 维度扫结论

| 维度 | 扫的点 | 结果 |
|------|--------|------|
| schema 字段一致性 | line vs fill 的 imageId 路径 | ✅ line 顶层 imageId / fill.image.imageId |
| LINKABLE_LINE_PARAMS vs _lineDef.links | 键集合 | ✅ 各 18 个完全对齐 |
| undo/redo 引用记账 | 总账配平 | ✅ 已修净变化为 0 |
| 渲染图片路径 | line/fill 图片绘制 | ✅ 路径正确 |
| 模块依赖图 | 14 模块 3 条补边 | ✅ presets→render / history→render / export→presets |
| 歧义清单 7 条 | 经确认的正文覆盖 | ✅ 全部覆盖 |
| typo | 重复 canvas | ✅ 去重 |
| 默认值一致性 | direction=0 / arc=0 | ✅ 两处 schema 统一 |