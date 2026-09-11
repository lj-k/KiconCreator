# Changelog

> 版本：v0.01 | 日期：2026-09-11

---

## v0.01（2026-09-11）

架构设计文档首次正式发布。经三轮 AI 评审（deepseek / GLM5.3 / 豆包）修订后定稿。

### 新增内容
- 完整 JSON Schema 数据模型（canvas / content.lines / background.shape / fills / layout / boundary 全字段定义）
- 14 个模块接口设计
- 渲染流水线（形状 → 填充 → 内容 → 效果）与 clip save/restore 强约束
- 参数联动两阶段状态机（标记传播 + 值同步 + 新增行继承 + 单独取消）
- 会话图片仓库引用计数与 5s 延迟释放机制
- 撤销重做栈（动态上限 + redo 清空强制 deref + 快照仅序列化业务字段）
- ICO 手写二进制格式说明
- 下载组合矩阵（全格式 × 多尺寸 × 代码 × 原始图片）
- DPR 导出隔离
- 六阶段实施计划

---

## v0.01 内容增强（2026-09-11）

经产品方确认两条需求歧义后补齐：

### 旋转中心双轨明确化
- content.lines[i].angle = 本行内容/图片/图标的中心
- background.layout.directions[] = 形状中心（画布中心）

### 填充色块标签 UI 规格明确化
- 新增 ui.createFillTabTitle 组件
- 标签标题为正方形（宽高 = 2×文本高度）+ canvas 预览底色 + "纯/渐/图"三态模式按钮

---

## v0.01 第二轮 AI 评审修订（2026-09-11）

基于三份独立评审（deepseek P0 8条 + GLM5.3 P0 4条架构自相矛盾 + 豆包需求遗漏与风险点），选择性采纳 P0 6 项 + P1 7 项。

### 三份评审的独立 P0 贡献对照

| 修订 | deepseek P0 | GLM5.3 P0 | 豆包 2.1/2.2 |
|------|-------------|-----------|-------------|
| 1 JSON ↔ 预设导出统一 | ✅（第5条 HTML 下载语义关联） | ✅ **2.1（直接指出架构自相矛盾）** | — |
| 2 ImageRepo vs schema session.images 解耦 | — | ✅ **2.2（内存设计缺陷，base64 放进 state → 内存灾难）** | ✅（2.3 快照边界未定义） |
| 3 lines 常驻 9 个 + enabled vs push | — | ✅ **2.3（与 schema 注释冲突）** | — |
| 4 canvas.size 分段函数 | ✅（第4条尺寸校验不一致） | ✅ **2.4（8192~10000 区间冲突）** | — |
| 5 图片引用规则（切换 mode 不解除） | ✅ **第1条（需求 2.8 原文明确切换不解除）** | — | ✅（2.1 引用规则来源场景不明） |
| 6 撤销栈动态上限 | ✅（P1 第3条 根据设备动态降低上限） | — | ✅（2.4 快照体积风险） |

### P0 已采纳（6 条）

1. **JSON 导出与预设导出统一** — Export.toJSON() 复用 Presets.export()（剪裁量化 + 图片数据一同导出）。需求 3.3 明确 "json = 导出预设"，原架构自相矛盾（deepseek #5 + GLM5.3 2.1）
2. **ImageRepo 独立 Map vs schema session.images 解耦** — schema session.images 仅 imageId 轻量索引；完整 base64 始终在 ImageRepo 独立 Map；快照不序列化 session.*。原架构 base64 既在 state 又说不复制 — 内存灾难（GLM5.3 2.2）
3. **lines 常驻 9 个 + enabled vs push 新行** — 删除 addLine/push 示例，替换为 setLineCount(newCount)：修改 enabled 标记 + 首次启用时初始化默认值。原 push 与 schema 注释 "常驻 9 个，减行再增行保留参数" 自相矛盾（GLM5.3 2.3）
4. **canvas.size 分段函数** — 改为分段：<0→16, >10000→8192, 16~10000 clamp。原范围表 16~8192 与截断规则 >10000→8192 在 8192~10000 区间冲突（deepseek #4 + GLM5.3 2.4）
5. **图片引用规则修正** — 仅 6 种场景增减 ref；**切换 mode / 选中行不解除引用**（需求 2.8 原文明确）。原 images.js 写"切换 mode 解除旧 mode 引用"与需求矛盾（deepseek #1）
6. **撤销栈动态上限** — deviceMemory 感知：≤4GB→10, ≤8GB→15, >8GB→20；base64 不在快照中控制总体内存（deepseek P1 + 豆包 2.4）

### P1 重要补充（7 条，三份交叉共识）

7. **可联动参数注册表 LINKABLE_PARAMS** — 不仅限于 content.lines，扩展到 background.fills.*.color、layout.directions.*、boundary.params.A/ω/φ/k、shape.direction（deepseek #2 指出范围不足）
8. **colors.suggestions 拆双向基准** — suggestContentColors(backgroundColor) / suggestFillColors(textColor)，各自触发事件避免做反。需求 3.4 vs 三 2.4 基准不同（deepseek #3 + GLM5.3 P1 #8 + 豆包）
9. **file:// 加载策略 + 本地兜底** — 普通 script 按序加载不走 ES modules（GLM5.3 P1 #1 地基问题）；Tailwind CDN + 本地部署同一份（deepseek P1 + 豆包风险 #9）
10. **边框外延实现策略标注风险点** — Canvas stroke 默认内外各半，标注 Path2D.offset / 双线 stroke 两种策略（deepseek #7）
11. **预设导入事务模式** — 先解析校验注册图片、全部成功才入列、失败不破坏现有状态（deepseek #8 迁移不完整 + 豆包 2.1 差异报告契约）
12. **新增 4 条需求歧义** — FA iconName 语义（非 unicode）、空文本文件名兜底 "icon"、HTML 下载 vs 复制区分（deepseek #5）、FA Free 范围确认（deepseek #6）
13. **FA 图标范围确认** — FontAwesome 6 Free（约 2000+ 图标），Pro 不在范围内（deepseek #6）

### 新增三个架构层章节（115 行）

- **十五、UI 视图状态 vs 业务 State 隔离** — 三类状态矩阵（业务/运行时资源/UI 瞬时）+ 5 条关键约束（豆包 2.1 辅助线/安全边距归属未明）
- **十六、架构风险与防护清单** — 10 条风险（图片 ref/deref 不对称、clip 累积、数学崩溃、快照内存、字体竞态、CDN 失效、响应式激活态丢失、大尺寸 canvas、file:// CORS、预设剪裁不可还原）及防护策略（豆包 2.4 架构层面风险点）
- **十七、快照 Schema 边界** — undo/redo/history/preset 四类快照包含/不包含字段清单 + 事务式预设导入流程（deepseek #6 + GLM5.3 P2 + 豆包）
