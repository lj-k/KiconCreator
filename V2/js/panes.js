/* ============================================================
   KiconCreator V2 · js/panes.js
   职责：各模块 pane 的 HTML 内容生成器。
     - 预设/历史/下载 pane（静态结构）
     - 样式 pane：尺寸/颜色/阴影 —— 全部从激活行状态生成
       （需求 3.2/3.3：参数跟随内容模块激活行，模式切换保留数据）
   - 形状模块 pane：形状种类/尺寸/拉伸/方向/弧度/内角 + 边框 + 形状阴影
       （需求 三.1，参数读写全局 bgParams；弧度与内角随形状种类动态出现）
   版本：V0.05（V2.17：形状/边框/形状阴影 pane 改为状态驱动，键为全局 shape./border./shapeShadow.）
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
    <div class="param"><span class="pname"></span><div class="pctrl"><button class="btn ghost sm" style="flex:1" id="fillShapeBtn">填满绘图区域</button></div></div>
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

/* ---------- 填充 pane（背景暂缓：保留 UI） ---------- */
function fillLayoutPaneHTML(){
  const single = fillCount === 1;
  if (single) return `<div style="font-size:10.5px;color:var(--muted);line-height:1.7;padding:2px 0">单色填充无需设置布局与边界，直接到下方「内部填充」调整颜色即可。</div>`;
  return `
    ${inlineChips('布局形式', ['矩阵布局', '饼图布局'])}
    ${paramRow('层数', 1, 1, fillCount, '')}
    ${paramRow('层间比例', 50, 0, 100, '%')}
    ${paramRow('层内比例', 50, 0, 100, '%')}
    ${paramRow('方向', 0, 0, 360, '°')}
    ${paramRow('X 偏移', 0, -100, 100, '%')}
    ${paramRow('Y 偏移', 0, -100, 100, '%')}
    ${paramRow('X 拉伸', 100, 1, 300, '%')}
    ${paramRow('Y 拉伸', 100, 1, 300, '%')}`;
}
function fillEdgePaneHTML(){
  const single = fillCount === 1;
  if (single) return `<div style="font-size:10.5px;color:var(--muted);line-height:1.7;padding:2px 0">单色填充没有内部边界，无需设置过渡与边界形状。</div>`;
  return `
    ${paramRow('过渡宽度', 0, 0, 100, '%')}
    <div class="param inline-chips" id="edgeShapeRow">
      <span class="pname">边界形状</span>
      <div class="pctrl">
        <div class="chip-row">${['直线', 'sin', 'tan', '锯齿'].map(s => `<button class="chip${s === currentEdgeShape ? ' active' : ''}" data-shape="${s}">${s}</button>`).join('')}</div>
      </div>
    </div>
    <div id="edgeParamsWrap">${buildEdgeParams(currentEdgeShape)}</div>
    ${inlineChips('过渡样式', ['单色', '渐变', '加深', '变浅', '透明'])}`;
}
function fillAdvicePaneHTML(){
  const adviceRow = (name, key) => {
    const palette = FILL_ADVICE[key].slice(0, fillCount);
    return `<div class="param tight"><span class="pname">${name}</span><div class="pctrl"><div class="suggest-row">${palette.map(c => `<button class="sw" data-c="${c}" style="background:${c}"></button>`).join('')}</div><button class="btn ghost sm" style="margin-left:auto">填充</button></div></div>`;
  };
  return `<div class="cp-label">根据文本颜色提供的填充组合建议（数量与填充数量一致）</div>${adviceRow('互补色', '互补')}${adviceRow('类似色', '类似')}${adviceRow('柔和色', '柔和')}${adviceRow('明亮色', '明亮')}`;
}
