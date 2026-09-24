/* ============================================================
   KiconCreator V2 · js/panes.js
   职责：各模块 pane 的 HTML 内容生成器。
     - 预设/历史/下载 pane（静态结构）
     - 样式 pane：尺寸/颜色/阴影 —— 全部从激活行状态生成
       （需求 3.2/3.3：参数跟随内容模块激活行，模式切换保留数据）
   - 形状模块 pane：形状种类/尺寸/拉伸/方向/弧度/内角 + 边框 + 形状阴影
       （需求 三.1，参数读写全局 bgParams；弧度与内角随形状种类动态出现）
   版本：V0.13（V2.28：填充边界拆为 fillEdgeShapePaneHTML/fillEdgeTransitionPaneHTML 两个标签（需求 2.3/2.4）；tan 提示语更新）
        V0.12（V2.27：边界形状芯片新增「波浪」；波浪参数行 A 高度/ω 宽度/φ 偏移（无 k））
        V0.11（V2.25：填充边界 pane 新增"包含形状外框"复选行（默认关闭））
        V0.10（V2.24：填充边界 pane 落地——过渡宽度/边界形状/A·ω·φ·k（锯齿为 A·ω）/过渡样式）
        V0.09（V2.23：层内比例改为每层一条滑轨（读 fillLayoutModel().groups 的 offset））
        V0.08（V2.22：布局形式的芯片逐片带 data-val——此前芯片无取值属性，点击不切换布局）
        V0.07（V2.22：布局 pane 改为状态驱动，接 fillLayout.js 的共享滑轨与颜色建议）
   约束：pane 的交互行为统一由 js/interactions.js 绑定，本文件只产出结构。
   ============================================================ */

/* ---------- 预设 / 历史 / 下载 pane ---------- */
function getPresetPaneHTML(){
  return `
    <div class="preset-tools">
      <button class="btn ghost sm" data-act="import" title="一个 json 文件 = 一条预设，可一次选多个文件批量导入">导入</button>
      <button class="btn ghost sm" data-act="export" title="把当前参数导出为一条预设（.json），不导出预设列表">导出</button>
      <button class="btn sm" data-act="save" title="保存仅本次有效，刷新后消失">保存</button>
      <button class="btn ghost sm" data-act="copy-json">复制 JSON</button>
      <button class="btn ghost sm" data-act="copy-html">复制 HTML</button>
    </div>
    <div class="preset-grid" id="presetGrid"></div>`;
}
function getHistoryPaneHTML(){ return `<div class="history-list" id="historyList"></div>`; }
function getDownloadPaneHTML(){
  return `
    <label class="check-row"><input type="checkbox" id="transparentChk">白色作为透明色导出<span class="hint">JPG 不支持透明</span></label>
    <div class="param">
      <span class="pname">导出尺寸</span>
      <div class="pctrl">
        <select class="sel" id="sizePreset">
          <option value="16">16 × 16</option><option value="32">32 × 32</option><option value="64">64 × 64</option>
          <option value="128">128 × 128</option><option value="256" selected>256 × 256</option>
          <option value="512">512 × 512</option><option value="1024">1024 × 1024</option>
        </select>
        <input class="num wide" id="sizeInput" value="256">
        <span class="unit">px</span>
      </div>
    </div>
    <label class="check-row"><input type="checkbox" id="multiSizeChk">多尺寸打包<span class="hint">32 / 64 / 128 / 256</span></label>
    <label class="check-row"><input type="checkbox" id="codeChk">代码打包<span class="hint">canvas + json</span></label>
    <label class="check-row"><input type="checkbox" id="rawChk">原始图片打包</label>
    <div class="divider"></div>
    <div class="format-grid">
      <button class="fmt" data-fmt="png">PNG</button><button class="fmt" data-fmt="jpg">JPG</button>
      <button class="fmt" data-fmt="webp">WEBP</button><button class="fmt" data-fmt="ico">ICO</button>
      <button class="fmt" data-fmt="canvas">CANVAS</button><button class="fmt" data-fmt="json">JSON</button>
      <button class="fmt" data-fmt="html">HTML</button><button class="fmt" data-fmt="svg">SVG</button>
    </div>
    <div class="filename" id="fileName">KIcon-256-K-20260914153000.png</div>`;
}

/* ---------- 样式 pane：尺寸（需求 3.5，值来自激活行状态） ---------- */
function paneSize(){
  const p = rows[activeRow].params;
  return `
    ${paramRow('大小', p['style.size'], 1, 300, '%', { key: 'style.size', chain: true })}
    ${paramRow('角度', p['style.angle'], 0, 360, '°', { key: 'style.angle', chain: true })}
    ${paramRow('水平拉伸', p['style.scaleX'], 1, 300, '%', { key: 'style.scaleX', chain: true })}
    ${paramRow('垂直拉伸', p['style.scaleY'], 1, 300, '%', { key: 'style.scaleY', chain: true })}
    ${paramRow('横向偏移', p['style.offsetX'], -100, 100, '%', { key: 'style.offsetX', chain: true })}
    ${paramRow('纵向偏移', p['style.offsetY'], -100, 100, '%', { key: 'style.offsetY', chain: true })}
    <div class="param" style="padding-top:8px">${checkRow('显示超出形状范围的内容', 'style.clip', p['style.clip'])}</div>`;
}

/* ---------- 样式 pane：颜色（需求 3.4） ---------- */
function paneColor(r){
  const p = r.params;
  if (r.mode === 'image'){
    // 图片模式的颜色项为该行独立开关（需求 3.4 / 四.1：与文本、FA 模式参数相互独立）
    return `<div class="param tight"><span class="pname">颜色</span><div class="pctrl">${checkRow('设置图片中的白色为透明', 'image.whiteTransparent', p['image.whiteTransparent'])}</div></div>`;
  }
  const grad = p['color.mode'] === '渐变';
  return `
    <div class="param tight">
      <span class="pname">颜色模式</span>
      <div class="pctrl">
        <div class="segmented" id="colorModeSeg" style="flex:0 0 auto">
          <button data-cmode="单色" class="${grad ? '' : 'active'}">单色</button>
          <button data-cmode="渐变" class="${grad ? 'active' : ''}">渐变</button>
        </div>
        <span style="flex:1"></span>
      </div>
    </div>
    ${colorRow('颜色 1', 'color.c1', p['color.c1'])}
    ${grad ? colorRow('颜色 2', 'color.c2', p['color.c2']) : ''}
    <div class="param stacked" style="margin-top:6px"><span class="pname">颜色建议（随颜色实时计算）</span><div id="colorAdviceWrap">${buildAdviceHTML(p['color.mode'], p['color.c1'])}</div></div>`;
}

/* ---------- 样式 pane：阴影（需求 3.6，启用时标签绿勾由 enabled 驱动） ---------- */
function paneShadow(){
  const p = rows[activeRow].params;
  return `
    <div style="padding-top:2px">${checkRow('启用阴影', 'shadow.enabled', p['shadow.enabled'], { rerender: 'style' })}</div>
    ${colorRow('颜色', 'shadow.color', p['shadow.color'])}
    ${paramRow('大小', p['shadow.size'], 0, 100, '', { key: 'shadow.size', chain: true })}
    ${paramRow('模糊', p['shadow.blur'], 0, 100, '', { key: 'shadow.blur', chain: true })}
    ${paramRow('X 偏移', p['shadow.x'], -100, 100, '', { key: 'shadow.x', chain: true })}
    ${paramRow('Y 偏移', p['shadow.y'], -100, 100, '', { key: 'shadow.y', chain: true })}`;
}

/* ---------- 形状 pane（需求 三.1.1：形状种类 + 形状参数） ----------
   形状参数全局唯一（bgParams），键写作 shape.*；
   参数行随形状种类动态显示：弧度用于 圆角方形/边形/角星，内角仅角星 */
function shapeChipRow(name, labels, values){
  const cur = bgParams['shape.kind'];
  return `<div class="param inline-chips" data-group="shape"><span class="pname">${name}</span><div class="pctrl"><div class="chip-row">${labels.map((c, i) => `<button class="chip${values[i] === cur ? ' active' : ''}" data-kind="${values[i]}">${c}</button>`).join('')}</div></div></div>`;
}
function shapePaneHTML(){
  const info = shapeKindInfo(bgParams['shape.kind']);
  const hasRound = info.type === 'roundRect' || info.type === 'poly' || info.type === 'star';
  const hasInner = info.type === 'star';
  const innerMax = shapeInnerMax(info.n || 3);
  const innerZero = hasInner && (+bgParams['shape.inner'] || 0) <= 0;
  return `
    ${shapeChipRow('基础', ['无', '圆形', '圆角方形'], ['无', '圆形', '圆角方形'])}
    ${shapeChipRow('边形', ['3', '4', '5', '6', '7', '8'], SHAPE_POLY_KINDS)}
    ${shapeChipRow('角星', ['3', '4', '5', '6', '7', '8'], SHAPE_STAR_KINDS)}
    <div class="divider"></div>
    ${paramRow('尺寸', bgParams['shape.size'], 1, 300, '%', { key: 'shape.size', reset: true })}
    ${paramRow('水平拉伸', bgParams['shape.stretchX'], 1, 300, '%', { key: 'shape.stretchX', reset: true })}
    ${paramRow('垂直拉伸', bgParams['shape.stretchY'], 1, 300, '%', { key: 'shape.stretchY', reset: true })}
    ${paramRow('方向', bgParams['shape.angle'], 0, 360, '°', { key: 'shape.angle', reset: true })}
    ${hasRound ? paramRow('弧度', bgParams['shape.round'], 0, 100, '%', { key: 'shape.round', reset: true }) : ''}
    ${hasInner ? paramRow('内角', bgParams['shape.inner'], 0, innerMax, '°', { key: 'shape.inner', reset: true }) : ''}
    <div class="param"><span class="pname"></span><div class="pctrl">
      <button class="btn ghost sm" style="flex:1" id="fillShapeBtn">填满绘图区域</button>
      <button class="btn ghost sm" style="flex:1" id="shapeTabReset" title="把形状的 尺寸/拉伸/方向/弧度/内角 恢复默认值（保留当前所选形状）">重置形状参数</button>
    </div></div>
    <div id="innerZeroWarn" style="font-size:10.5px;color:#e5484d;padding-top:6px${innerZero ? '' : ';display:none'}">内角 0° 形状不可见</div>`;
}
function borderPaneHTML(){
  return `
    ${checkRow('启用边框', 'border.enabled', bgParams['border.enabled'], { rerender: 'shape' })}
    ${paramRow('边框宽度', bgParams['border.width'], 0, 100, 'px', { key: 'border.width', reset: true })}
    ${colorRow('颜色', 'border.color', bgParams['border.color'])}
    <div style="font-size:10px;color:var(--muted);padding-top:6px">边框从形状边界向外延伸</div>`;
}
function fshadowPaneHTML(){
  return `
    ${checkRow('启用形状阴影', 'shapeShadow.enabled', bgParams['shapeShadow.enabled'], { rerender: 'shape' })}
    ${colorRow('颜色', 'shapeShadow.color', bgParams['shapeShadow.color'])}
    ${paramRow('大小', bgParams['shapeShadow.size'], 0, 100, '', { key: 'shapeShadow.size', reset: true })}
    ${paramRow('模糊', bgParams['shapeShadow.blur'], 0, 100, '', { key: 'shapeShadow.blur', reset: true })}
    ${paramRow('X 偏移', bgParams['shapeShadow.x'], -100, 100, '', { key: 'shapeShadow.x', reset: true })}
    ${paramRow('Y 偏移', bgParams['shapeShadow.y'], -100, 100, '', { key: 'shapeShadow.y', reset: true })}`;
}

/* ---------- 填充 pane：布局（需求 2.2/2.3） ----------
   单色不出现布局与边界（需求 2.2）；多色下布局形式/层数/层间比例/层内比例/方向/偏移/拉伸
   全部读写全局 fillParams（键前缀 fill.），三组"多分界线"用共享滑轨组件（fillLayout.js）。
   层数上限 = 当前填充数量，填充数量降低时层数跟随降低（需求 2.3）。 */
function fillLayoutPaneHTML(){
  const single = fillCount === 1;
  if (single) return `<div style="font-size:10.5px;color:var(--muted);line-height:1.7;padding:2px 0">单色填充无需设置布局与边界，直接到下方「内部填充」调整颜色即可。</div>`;
  const m = fillLayoutModel();
  const pie = m.pie;
  /* 层内比例：**每层一条滑轨**（用户要求，V2.23）——各层读写 fillParams['fill.inRatios']
     中属于自己那一段（offset/count），互不影响；单层时不写"层n" */
  const inRows = m.groups.map((g, li) => g.count > 0 ? multiSliderHTML({
    key: 'fill.inRatios',
    offset: g.offset,
    label: (m.L > 1 ? `层内比例 · 层${li + 1}` : '层内比例')
      + (pie ? (m.L > 1 && li === 0 ? '（最外环扇区分界角）' : '（扇区分界角）') : '（竖线位置）'),
    values: (fillParams['fill.inRatios'] || []).slice(g.offset, g.offset + g.count),
    max: 100, unit: '%', equal: true
  }) : '').join('');
  return `
    ${fillShapeHintHTML()}
    ${inlineChips('布局形式', ['矩阵布局', '饼图布局'], pie ? 1 : 0, { group: 'fillLayout', values: ['矩阵布局', '饼图布局'] })}
    ${paramRow('层数', m.L, 1, fillCount, '', { key: 'fill.layers', reset: true, resync: 'fill' })}
    ${m.layerCount > 0 ? multiSliderHTML({
      key: 'fill.layerRatios',
      label: pie ? '层间比例（各环半径分界）' : '层间比例（层间横线位置）',
      values: fillParams['fill.layerRatios'], max: 100, unit: '%', equal: true
    }) : ''}
    ${inRows}
    ${multiSliderHTML({
      key: 'fill.angles',
      label: m.angleCount > 1 ? '方向（每层独立）' : '方向（整体旋转）',
      values: fillParams['fill.angles'], max: 360, unit: '°'
    })}
    ${paramRow('X 偏移', fillParams['fill.offsetX'], -100, 100, '%', { key: 'fill.offsetX', reset: true })}
    ${paramRow('Y 偏移', fillParams['fill.offsetY'], -100, 100, '%', { key: 'fill.offsetY', reset: true })}
    ${paramRow('X 拉伸', fillParams['fill.stretchX'], 1, 300, '%', { key: 'fill.stretchX', reset: true })}
    ${paramRow('Y 拉伸', fillParams['fill.stretchY'], 1, 300, '%', { key: 'fill.stretchY', reset: true })}`;
}
/* 填充边界（需求 2.3）：过渡宽度 + 边界形状 + 形状函数参数 + 过渡样式。
   参数显示名用 A / ω / φ / k（锯齿为 A / ω，波浪为 A / ω / φ），键注册在 FILL_PARAM_DEFS 并走 fillParams；
   形状与样式用逐片带 data-val 的芯片（fillLayout.js 的 bindFillParamChips 绑定）。
   注意：背景类参数是全局唯一的，因此这几行不提供"逐行联动"链条（同形状参数，见 4.11）。 */
function edgeShapeParamsHTML(shape){
  if (shape === 'sin' || shape === 'tan'){
    return `
      ${paramRow('A 振幅', fillParams['edge.A'], 0, 50, '%', { key: 'edge.A', reset: true })}
      ${paramRow('ω 频率', fillParams['edge.W'], 0.1, 10, '', { key: 'edge.W', reset: true, step: 0.1 })}
      ${paramRow('φ 相位', fillParams['edge.phi'], -180, 180, '°', { key: 'edge.phi', reset: true })}
      ${paramRow('k 偏移', fillParams['edge.k'], -50, 50, '%', { key: 'edge.k', reset: true })}
      <div style="font-size:10px;color:var(--muted);padding-top:2px">y = A·${shape}(2π·ω·x/S + φ) + k，原点（x=0）在形状中心点；ω = 横跨画布的周期数${shape === 'tan' ? '；tan 取过中心的主值分支，渐近线由 ±10×画布截断兜底（可见范围内为一条连续曲线），ω 越小曲线越平缓、覆盖越宽' : ''}</div>`;
  }
  if (shape === '波浪'){
    return `
      ${paramRow('A 高度', fillParams['edge.A'], 0, 50, '%', { key: 'edge.A', reset: true })}
      ${paramRow('ω 宽度', fillParams['edge.wave'], 1, 100, '%', { key: 'edge.wave', reset: true })}
      ${paramRow('φ 偏移', fillParams['edge.phi'], -180, 180, '°', { key: 'edge.phi', reset: true })}
      <div style="font-size:10px;color:var(--muted);padding-top:2px">连续半圆上下交替组成的波浪；ω 为单个半圆的宽度（画布边长百分比），默认 A=10%、ω=20% 时恰为半圆；φ=180° 上下翻转</div>`;
  }
  if (shape === '锯齿'){
    return `
      ${paramRow('A 高度', fillParams['edge.A'], 0, 50, '%', { key: 'edge.A', reset: true })}
      ${paramRow('ω 齿宽', fillParams['edge.tooth'], 1, 100, '%', { key: 'edge.tooth', reset: true })}
      <div style="font-size:10px;color:var(--muted);padding-top:2px">三角锯齿波，齿峰落在形状中心点；ω 为单齿宽度（画布边长百分比）</div>`;
  }
  return `<div class="mslider-empty">直线边界没有边界参数（可在上方选择 sin / tan / 波浪 / 锯齿）</div>`;
}
/* 填充边界 → 两个标签（V2.28 按需求 2.3/2.4 拆分）：
   「边界形状」= 边界形状芯片 + 形状函数参数 + 包含形状外框；
   「边界过渡」= 过渡宽度 + 过渡样式。单色填充两个标签都只给提示。 */
function fillEdgeSingleHint(){
  const single = fillCount === 1;
  return single ? `<div style="font-size:10.5px;color:var(--muted);line-height:1.7;padding:2px 0">单色填充没有内部边界，无需设置过渡与边界形状。</div>` : '';
}
function fillEdgeShapePaneHTML(){
  const single = fillEdgeSingleHint();
  if (single) return single;
  const shape = fillParams['edge.shape'] || '直线';
  return `
    ${inlineChips('边界形状', ['直线', 'sin', 'tan', '波浪', '锯齿'], Math.max(0, ['直线', 'sin', 'tan', '波浪', '锯齿'].indexOf(shape)), { group: 'edgeShape', values: ['直线', 'sin', 'tan', '波浪', '锯齿'] })}
    ${edgeShapeParamsHTML(shape)}
    <div style="padding-top:2px">${checkRow('包含形状外框（默认只调节内部填充之间的边界）', 'edge.frame', !!fillParams['edge.frame'], { rerender: 'fill' })}</div>`;
}
function fillEdgeTransitionPaneHTML(){
  const single = fillEdgeSingleHint();
  if (single) return single;
  const style = fillParams['edge.style'] || '渐变';
  const width = +fillParams['edge.width'] || 0;
  return `
    ${paramRow('过渡宽度', width, 0, 100, '%', { key: 'edge.width', reset: true })}
    <div class="mslider-empty">过渡宽度为 0 时无过渡（色块之间为硬边界）；调大后按下方「过渡样式」沿边界曲线绘制过渡带。</div>
    ${inlineChips('过渡样式', ['单色', '渐变', '加深', '变浅', '透明'], Math.max(0, ['单色', '渐变', '加深', '变浅', '透明'].indexOf(style)), { group: 'edgeStyle', values: ['单色', '渐变', '加深', '变浅', '透明'] })}
    <div style="font-size:10px;color:var(--muted);padding-top:2px">单色 = 两端色的中值平涂；渐变 = 两端色之间渐变；加深/变浅 = 中值色明度加减；透明 = 过渡带擦成透明缝</div>`;
}
/* 颜色建议（需求 2.4）：按文本颜色算出 N 色组合（互补/类似/柔和/明亮），
   「填充」把该组颜色依次写入各色块（一键填充仅限纯色模式色块） */
function fillAdvicePaneHTML(){
  const base = (rows[activeRow] && rows[activeRow].params['color.c1']) || '#6C8CFF';
  const row = g => {
    const palette = fillAdvicePalette(g, base, fillCount);
    return `<div class="param tight"><span class="pname">${g}色</span><div class="pctrl">
      <div class="suggest-row">${palette.map(c => `<span class="sw" style="background:${c}" title="${c}"></span>`).join('')}</div>
      <button class="btn ghost sm" data-fill-palette="${g}" style="margin-left:auto" title="把这组颜色依次应用到各色块（仅纯色模式）">填充</button>
    </div></div>`;
  };
  return `<div class="cp-label">按文本颜色 ${base} 计算 ${fillCount} 色组合建议（需求 2.4）</div>${row('互补')}${row('类似')}${row('柔和')}${row('明亮')}`;
}
