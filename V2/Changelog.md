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

---

## v0.01 豆包第五轮评审修订（2026-09-14）

### 本轮修订清单（6 处）

| # | 优先级 | 问题 | 修订 |
|---|--------|------|------|
| 1 | P0 | saveCurrent 会话预设不该剪裁量化（会导致 refCount 暴涨） | 改为直接 ref 现有 imageId，不生成新剪裁副本；只有 export() 导出 JSON 才剪裁量化 |
| 2 | P0 | clearAllLinks 接口注释太简容易误导为遍历整个 state | 明确仅遍历 content.lines[*].links，绝对不触碰 background 任何对象 |
| 3 | P0 | faIcon 过度简化为"iconName 或 unicode 二选一" | 强约束：必须存储 iconName（'heart'/'star'），禁止 unicode（'f004'）。文件名拼接取 iconName |
| 4 | P0 | Path2D.offset 回退方案（stroke 2×width）有缺陷：向内一半覆盖形状内部填充 | 补正确回退：构造形状放大版副本 Path2D（外法线偏移 width/2） |
| 5 | P0 | state.set() `path.split('.')[2]` 对 background.fills.0.color 误解析 lineIdx=0 触发内容行联动分支 | 加 `if (path.startsWith('content.lines.'))` 守卫 |
| 6 | P1 | history.record() 注释没提禁止调 pushUndo | 加强约束：record() 只写下载历史，绝对不能调用 pushUndo。需求四明确"下载不产生撤销栈" |

---

## v0.01 deepseek + GLM5.3 共识 P0 修订（2026-09-14）

### 两家共识 P0（2 项，直接导致架构与需求冲突）

| # | 优先级 | 问题 | 来源 | 修订 |
|---|--------|------|------|------|
| 7 | **P0** | **透明色白色键控：架构自相矛盾！** L145-146 写"不依赖此开关，shape 非 none 时导出层始终做白色键控"——完全错误。需求 L29 明确"勾选后默认白色为透明色导出"——**勾选才做**！架构还在 L684 写了相反的正确版本，两处互斥。 | deepseek #1 + GLM5.3 P0-2 | 统一为：canvas.transparent=true → 做白色键控；canvas.transparent=false → 不做。L144-151 schema 注释重写，L687-692 渲染约束同步更新 |
| 8 | **P0** | **边界参数联动被错误降级到 P2**：架构 L401-404 写"需求未要求联动链条 UI"，把 boundary.params.A/ω/φ/k 从 LINKABLE_PARAMS_P2 砍了后放进 P2。但需求 L106 白纸黑字写边界参数有"滑块、输入框、**联动**、重置按钮"！ | deepseek #2 + GLM5.3 P0-1 | 恢复到 V2：新增 LINKABLE_BOUNDARY_PARAMS（A/ω/φ/k），schema boundary.params 加 links 字段，clearAllLinks 纳入 boundary.params，V2 强约束全面更新。歧义清单保留：boundary 是单副本对象，"跨行同步"语义待产品确认 |

---

## v0.01 自我勘误全量扫描（2026-09-14）

**扫描范围**：需求文档 242 行全量 × 架构文档内部一致性 × 三家评审条目复核

### 本轮修订（1 个新 P0）

| # | 优先级 | 问题 | 发现方式 | 修订 |
|---|--------|------|---------|------|
| 9 | **P0** | **state.set() 伪代码漏掉 boundary.params 联动分支**！刚把 boundary.params 加进 V2（schema 加了 links 字段、LINKABLE_BOUNDARY_PARAMS 注册表、clearAllLinks 纳入），但 set() 伪代码只有 `if (path.startsWith('content.lines.'))` 一个分支——boundary.params 的路径完全被跳过。如果用户 toggleLink('background.boundary.params.A') 再 set()，联动永远不触发 | 读 set() 伪代码 vs 刚加的 boundary.params.links 字段 | L481-491 加 else if 分支：`path.startsWith('background.boundary.params.')` → 检查 links 字段。boundary 是单副本对象（无跨行语义），分支内实际无操作（同步目标就是自己），但保证路径不被误处理 |

### 全量扫描确认一致的点（不需修订）

| 维度 | 扫描结果 | 结论 |
|------|---------|------|
| `_lineDef.links` vs `LINKABLE_LINE_PARAMS` 键集合 | 各 18 键完全对齐 | ✅ 一致 |
| 透明色白色键控语义 | schema L144-151 + render L687-692 统一为 `canvas.transparent=true` 才做键控 | ✅ 一致（之前架构内部两处互斥已修）|
| `layerRatios` vs `ratios`（层间/层内比例）| schema L271/L275 两个独立字段，需求 L98-99 明确对应 | ✅ 一致 |
| ImageRepo 字段定义 | L336 + L1196-1200 统一为 `{ data, refCount, name, disposeTimer }` | ✅ 一致 |
| undo/redo ref 记账 | L1303 ref +1 + L1307 derefOnlyIn -1，净变化 0 | ✅ 一致 |
| clearRedoWithDeref | L485 + L1329-1330 多处覆盖 | ✅ 一致 |
| direction 旋转中心 | schema L279 + fillers L634 统一为形状几何中心 | ✅ 一致 |
| `saveCurrent` vs `export` 剪裁量化职责 | 会话内 ref 现有 imageId；只有 export() 才剪裁 | ✅ 一致 |
| `faIcon` 存储约束 | schema L186 强约束 iconName 禁止 unicode | ✅ 一致 |
| Path2D.offset 回退 | schema L298-306 补了旧方案缺陷 + 正确回退（外法线偏移副本 Path2D）| ✅ 一致 |
| set() path 前缀守卫 | L471 content.lines. + L485 boundary.params. 两个分支 | ✅ 一致（之前漏了 boundary 分支已修）|
| history.record() 禁止 pushUndo | L1071-1072 显式强约束 | ✅ 一致 |
| clearAllLinks 作用域 | L362 纳入 content.lines + boundary.params，不碰 _fillDef/shape/layout | ✅ 一致（之前写"绝对不碰 background"已修正）|

### 批判性拒绝纳入 V2 的 P2 级 UI 遗漏（详细设计层处理）

| 需求 | 内容 | 拒绝理由 |
|------|------|---------|
| L132 | 顶部工具栏显示"作者 Kong" | ui.js 模块接口已有 createHeaderToolBar，详细设计时补 author 字段 |
| L32-33 | 下载栏三个勾选框（多尺寸/代码/原始）| export.js ZIP 选项参数已预留，UI 层补复选框组件 |
| L62 | FA 标签内商用版权提醒 + 页面底部版权 | ui.js FA 选择器组件详细设计时补 |
| L106 边界联动语义 | boundary 单副本"联动"到底是什么 | 歧义清单保留，产品确认后再定 set() 分支内是否加实际逻辑 |

---

## v0.01 三家 AI 第二轮评审修正（2026-09-14，deepseek 深度思考 + GLM5.3 极致 + 豆包快速）

**评审文档**：架构文档AI评审.md v2（600 行，较上轮 289 行翻倍）

### 本轮 P0 修订（7 个，编号 #10~#16）

| # | 优先级 | 问题 | 来源 | 修订 |
|---|--------|------|------|------|
| 10 | **P0** | **state.set() 缺源行门控！** 需求示例"取消勾选行1的大小联动→调整行1大小→其它行不变化"——set() 只检查"目标行是否勾选"，从不检查"当前源行自己是否勾选"。源行取消联动后仍会向外传播，与需求完全相反 | GLM5.3 独抓 | 加源行门控：`if (!state.content.lines[lineIdx].links[subPath]) return;` |
| 11 | **P0** | **undo/redo 入栈时序完全反了！** 三个入口（set/toggleLink/setLineCount）全部 pushUndo 在变更**之后**——栈顶 = 变更后状态，但 undo() 语义是 pop(previousSnap) → state=previousSnap → Ctrl+Z 永远 no-op | GLM5.3 独抓 | 三处全部前置入栈：pushUndo() 移到 setDirect/links修改/enabled修改 **之前** |
| 12 | **P0** | **boundary.params.links 半实现**：架构既在 schema 加了 links 字段、在 set() 写了 no-op 分支，又不渲染链条图标。clearAllLinks 错误地包含 boundary.params。三家 AI 共识必须二选一 | deepseek + GLM5.3 + 豆包 共识 | 采纳方案 A：**彻底删除** boundary.params.links 字段 + LINKABLE_BOUNDARY_PARAMS 常量 + set() 中 boundary 分支。clearAllLinks 注释改为"只遍历 content.lines[*].links，绝对不碰 boundary" |
| 13 | **P0** | **derefOnlyIn 函数只引用不定义**！undo()/redo() 伪代码三处调用 derefOnlyIn(listA, listB)，但全文从未定义其行为。开发可能实现错误导致图片重复 deref → 内存提前释放 | 豆包 | 第九节伪代码补函数定义：`setB = new Set(listB); for id in listA if !setB.has(id) ImageRepo.deref(id)` |
| 14 | **P0** | **deletePreset 无 deref 伪代码**！saveCurrent 时 ref+1（预设持有引用），但删除会话预设时没有任何 deref 操作 → 图片永远不会触发 5s 延迟释放 → 内存泄漏 | 豆包 | presets.js 模块补 deletePreset() 伪代码：先 collectImageIds → 每个 deref → splice 删除 |
| 15 | **P0** | **makeName 三个致命缺陷**：① image 模式没显式写去扩展名（stripExt）；② 没过滤 disabled 行（默认文本 "A" 污染文件名）；③ 过度论断"不可能出现空"→ 没兜底 | 豆包 + GLM5.3 共识 | 重写 makeName 为完整伪代码：① `stripExt(name)` 显式去扩展名；② `enabled=true` 才拼接；③ 空文本行跳过；④ 全空用 "KIcon" 兜底 |
| 16 | **P0** | **边界参数 φ/k 合法范围缺失**！只有 A 和 ω 有暂定范围，φ 和 k 无任何约束 → 用户可输入任意值导致渲染崩溃 | deepseek + GLM5.3 共识 | 歧义#3 补全：φ ∈ [-6.28, 6.28]（-2π~2π），k ∈ [-1, 1]；标注渲染层防御性编程即便 schema 校验 |

### 本轮 P1 修订（3 个，编号 #17~#19）

| # | 优先级 | 问题 | 来源 | 修订 |
|---|--------|------|------|------|
| 17 | **P1** | **白色键控只在导出层**（架构差异表写 `- \| ✅`），违反需求 1.8"预览效果即导出效果（除画布背景不导出）"——唯一豁免是画布背景 | GLM5.3 + deepseek | 差异表改为 `✅ \| ✅` 两层同步执行；补充阈值定义 `whiteThreshold=240`（与行级 threshold=128 独立）；补 getImageData→alpha置0→putImageData 伪代码 |
| 18 | **P1** | **快照序列化口径不一致**：九节 undo/redo/pushUndo 全部用 `JSON.parse(JSON.stringify(state))`，但十五/十七节隔离表明确"不序列化 session.* 和 UI 视图状态"。照抄九节会把激活标签、滚动位置等带入 undo 快照 | GLM5.3 独抓 | 九节 4 处全部改为 `JSON.parse(JSON.stringify(state.businessFields))`（canvas/content/background），与十五/十七节约定对齐 |
| 19 | **P1** | **clearAllLinks 作用域错误**：之前注释写"遍历 content.lines + boundary.params"，需求和豆包都指出顶部工具栏"全部联动"按钮只作用于内容参数 | 豆包 P0-2 | clearAllLinks 注释改为"只遍历 content.lines[*].links；绝对不触碰 boundary.params"；顶部工具栏强约束同步更新 |

### 架构前后两轮评审对同一问题的态度变化

| 问题 | 前一轮（自我勘误 #9） | 本轮（三家共识 #12）| 结论 |
|------|----------------------|-------------------|------|
| boundary.params.links | 半实现：保留 links 字段 + set() 写 no-op 分支 | 彻底删除：方案 A（删除字段 + 常量 + set() 分支） | 本轮更激进，正确。半实现是最危险的状态——导出预设 JSON 会带无用字段，用户看到链条图标点击没反应（P0 级 bug）|

### 批判性拒绝纳入本轮的项（需产品确认或属 UI 详细设计层）

| 需求 | 内容 | 拒绝理由 |
|------|------|---------|
| 响应式具体行为 | 竖屏浮动固定顶部/最大高度≤视口1/3、手机横排三栏、默认视口800×400 | ui.js 详细设计时补，架构已有 observeResponsive 骨架 |
| 快捷键焦点判断 | 输入框获得焦点时禁用工程撤销（交由浏览器原生）| main.js 详细设计层实现 |
| FA 商用版权提示 UI | 标签内提醒 + 页面底部版权 | fa_map.js / ui.js 详细设计时补 |
| 上传进度条 | Images.upload 显示 FileReader 进度 | images.js 详细设计时补 |
| 复制样式按钮位置 | 内容标签内容顶部两个按钮 | ui.js createTabContent 详细设计时补 |
| 样式模块标题动态信息 | 当前激活第几行/模式/内容 | ui.js createModuleTitle 详细设计时补 |
| shape 非无时标签显示形状预览 | 标签标题显示形状缩略图 | ui.js createFillTabTitle 详细设计时补 |
| 设备内存 fallback | deviceMemory API 不可用时的默认值 15 | state.js 常量定义时补 |
| 渲染时图片缺失降级 | ImageRepo 图片被 purge 后渲染占位 | render.js 防御性编程时补 |
| rotate center 正式确认记录 | 三家 AI 都要求"形状几何中心"有正式产品确认 | 需求文档待产品走确认流程，架构语义正确 |