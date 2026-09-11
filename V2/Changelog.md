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
