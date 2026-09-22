/* ============================================================
   KiconCreator V2 · js/builders.js
   职责：HTML 片段构造器与颜色建议引擎。
     - paramRow：滑块参数行（opts.key → data-name 绑定行状态键）
     - selectRow / checkRow / colorRow：下拉、布尔、颜色参数行
     - getShadowEnabled：从行状态读取（tab 徽标）
     - 颜色建议（需求 3.4）：HSL 公式实时计算互补/类似/柔和/明亮
   版本：V0.05（V2.22：inlineChips 支持 opts.values —— 逐片输出 data-val 供专用绑定读取）
        V0.04（V2.22：paramRow 支持 FILL_PARAM_DEFS 默认值与 resync；新增 fillAdvicePalette 按文本颜色生成 N 色组合）
   注意：data-name/data-pkey 是联动、快照与渲染回写的唯一依据；
        BG_PARAM_DEFS 注册的全局键（shape./border./shapeShadow.）写 bgParams。
   ============================================================ */

/* ---------- 滑块参数行 ---------- */
function paramRow(name, value, min = 0, max = 100, unit = '', opts = {}){
  const step = opts.step ?? 1;
  const showChain = opts.chain === true;
  const showReset = opts.reset === true;
  const key = opts.key || name; // 未给 key 时退化为显示名（纯 UI 参数）
  // 重置按钮回到"参数注册表的默认值"；未注册的 UI-only 行回退为当前值
  const def = (typeof PARAM_DEFS !== 'undefined' && PARAM_DEFS[key]) ? PARAM_DEFS[key].def
    : ((typeof BG_PARAM_DEFS !== 'undefined' && BG_PARAM_DEFS[key]) ? BG_PARAM_DEFS[key].def
      : ((typeof FILL_PARAM_DEFS !== 'undefined' && FILL_PARAM_DEFS[key]) ? FILL_PARAM_DEFS[key].def : value));
  const cls = opts.tight ? 'param tight' : (opts.stacked ? 'param stacked' : 'param');
  // resync：值变化后需要联动重算/重渲染的模块（如 fill.layers → 校准分界线数组）
  const resync = opts.resync ? ` data-resync="${opts.resync}"` : '';
  return `<div class="${cls}" data-name="${key}" data-min="${min}" data-max="${max}" data-default="${def}"${resync}>
    <span class="pname">${name}</span>
    <div class="pctrl">
      <input type="range" min="${min}" max="${max}" value="${value}" step="${step}">
      <input class="num" value="${value}">
      ${unit ? `<span class="unit">${unit}</span>` : ''}
      ${showChain ? `<button class="chain" title="参数联动">${CHAIN_SVG}</button>` : ''}
      ${showReset ? `<button class="rst" title="重置为默认值">⟲</button>` : ''}
    </div>
  </div>`;
}

/* ---------- 下拉参数行 ---------- */
function selectRow(label, key, value, options, opts = {}){
  const showChain = opts.chain === true;
  const optsHTML = options.map(o => {
    const name = typeof o === 'string' ? o : o.name;
    return `<option${name === value ? ' selected' : ''}>${escapeHtml(name)}</option>`;
  }).join('');
  return `<div class="param tight"><span class="pname">${label}</span><div class="pctrl">
    <select class="sel" style="flex:1" data-pkey="${key}">${optsHTML}</select>
    ${showChain ? `<button class="chain" title="参数联动">${CHAIN_SVG}</button>` : ''}
  </div></div>`;
}

/* ---------- 布尔参数行 ---------- */
function checkRow(label, key, checked, opts = {}){
  const attrs = key ? ` data-pkey="${key}"${opts.rerender ? ` data-rerender="${opts.rerender}"` : ''}` : '';
  return `<label class="check-row" style="padding:0"><input type="checkbox"${attrs}${checked ? ' checked' : ''}> ${label}</label>`;
}

/* ---------- 颜色参数行（原生取色器 + HEX 输入框双向同步） ---------- */
function colorRow(label, key, value, opts = {}){
  return `<div class="param tight"><span class="pname">${label}</span><div class="pctrl">
    <input type="color" class="color-picker" data-pkey="${key}" value="${value}" title="${label}">
    <input class="mini-input" data-pkey="${key}" data-hex="1" value="${value}" style="flex:1">
    ${opts.chain ? `<button class="chain" title="参数联动">${CHAIN_SVG}</button>` : ''}
  </div></div>`;
}

/* ---------- 芯片组 ---------- */
/* opts.values：逐个芯片的取值 → 写进各自的 data-val，供专用绑定读取（如填充的布局形式）；
   缺省时只带共享的 opts.group（此时芯片仅由通用处理器切换高亮，不改状态） */
function inlineChips(name, chips, activeIdx = 0, opts = {}){
  const groupAttr = opts.group ? `data-group="${opts.group}"` : '';
  const vals = opts.values || null;
  return `<div class="param inline-chips" ${groupAttr}><span class="pname">${name}</span><div class="pctrl"><div class="chip-row">${chips.map((c, i) => `<button class="chip${i === activeIdx ? ' active' : ''}"${vals && vals[i] !== undefined ? ` data-val="${vals[i]}"` : ''}>${c}</button>`).join('')}</div></div></div>`;
}

/* ---------- 启用状态读取（tab 徽标 / MODULE_TABS） ---------- */
function getShadowEnabled(){ return !!rows[activeRow].params['shadow.enabled']; }
function getBorderEnabled(){ return !!bgParams['border.enabled']; }      // 形状边框（需求 三.1.2）
function getFShadowEnabled(){ return !!bgParams['shapeShadow.enabled']; } // 形状阴影（需求 三.1.3）

/* ============================================================
   颜色建议引擎（需求 3.4：公式实时计算）
   说明：需求为"根据背景色"计算；背景模块暂缓（默认白底），
   当前以文本当前色 color1 为基色生成调和色，函数签名保留
   base 参数，背景模块落地后直接传入背景色即可。
   ============================================================ */
function hexToHsl(hex){
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.replace('#', '').length === 6 ? hex : '#000000');
  const v = m ? m[1] : '000000';
  const r = parseInt(v.slice(0, 2), 16) / 255;
  const g = parseInt(v.slice(2, 4), 16) / 255;
  const b = parseInt(v.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min){
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}
function hslToHex(h, s, l){
  h = ((h % 360) + 360) % 360;
  s = Math.min(1, Math.max(0, s));
  l = Math.min(1, Math.max(0, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60){ r = c; g = x; } else if (h < 120){ r = x; g = c; }
  else if (h < 180){ g = c; b = x; } else if (h < 240){ g = x; b = c; }
  else if (h < 300){ r = x; b = c; } else { r = c; b = x; }
  const to = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/* 由基色生成 4 组建议，每组 2 个候选（键与渲染 UI 对应） */
function computeAdvice(baseHex){
  const { h, s, l } = hexToHsl(baseHex || '#6C8CFF');
  const wrap = (arr) => arr.map(c => hslToHex(...c));
  return {
    互补: wrap([[h + 180, s, l], [h + 172, Math.min(1, s * 1.1), Math.min(0.9, l + 0.06)]]),
    类似: wrap([[h + 30, s, l], [h - 30, s, l]]),
    柔和: wrap([[h, s * 0.45, Math.min(0.9, l + 0.15)], [h + 12, s * 0.4, Math.min(0.92, l + 0.2)]]),
    明亮: wrap([[h, Math.min(1, s * 1.25), 0.58], [h + 8, 0.95, 0.5]])
  };
}

/* 生成建议 HTML：mode 单色 → 单色板；渐变 → 渐变对（基色 → 建议色） */
function buildAdviceHTML(mode, baseHex){
  const adv = computeAdvice(baseHex);
  if (mode === '渐变'){
    return ['互补', '类似', '柔和', '明亮'].map(g => `<div class="param tight"><span class="pname">${g}色</span><div class="pctrl"><div class="suggest-row">${adv[g].map(c => `<button class="sw-pair" data-c1="${baseHex}" data-c2="${c}"><span class="sw" style="background:${baseHex}"></span><span class="sw" style="background:${c}"></span></button>`).join('')}</div></div></div>`).join('');
  }
  return ['互补', '类似', '柔和', '明亮'].map(g => `<div class="param tight"><span class="pname">${g}色</span><div class="pctrl"><div class="suggest-row">${adv[g].map(c => `<button class="sw" data-c="${c}" style="background:${c}"></button>`).join('')}</div></div></div>`).join('');
}

/* 填充色块组合建议（需求 2.4）：按文本颜色用公式算出 N 色组合。
   注意，不用静态色表——需求要求"根据文本颜色"计算，静态表与文本颜色无关。
   互补：从互补色起把色相均分一圈；类似：以文本色相为中心 ±24° 铺开；
   柔和：同互补色相但降饱和提亮度；明亮：从文本色相均分一圈并提饱和。 */
function fillAdvicePalette(group, baseHex, N){
  const n = Math.max(1, Math.min(6, Math.round(N) || 1));
  const { h, s, l } = hexToHsl(baseHex || '#6C8CFF');
  const spread = 360 / n;
  const out = [];
  for (let i = 0; i < n; i++){
    if (group === '互补') out.push(hslToHex(h + 180 + i * spread, s, l));
    else if (group === '类似') out.push(hslToHex(h + (i - (n - 1) / 2) * 24, s, l));
    else if (group === '柔和') out.push(hslToHex(h + 180 + i * spread, s * 0.45, Math.min(0.9, l + 0.15)));
    else out.push(hslToHex(h + i * spread, Math.min(1, s * 1.25), 0.58));
  }
  return out;
}

function buildEdgeParams(shape){
  if (shape === '直线') return `<div style="font-size:10.5px;color:var(--muted);padding:4px 0">直线边界无可调参数</div>`;
  if (shape === 'sin' || shape === 'tan'){
    return `<div class="param tight"><span class="pname">边界参数</span><div class="pctrl" style="gap:6px">${['A', 'ω', 'φ', 'k'].map(p => `<div style="display:flex;flex-direction:column;gap:3px;align-items:center"><span style="font-size:9.5px;color:var(--muted)">${p}</span><input class="num tiny" style="width:100%;flex:1" value="1"></div>`).join('')}</div></div>`;
  }
  if (shape === '锯齿'){
    return `<div class="param tight"><span class="pname">边界参数</span><div class="pctrl" style="gap:6px">${['A', 'ω'].map(p => `<div style="display:flex;flex-direction:column;gap:3px;align-items:center"><span style="font-size:9.5px;color:var(--muted)">${p}</span><input class="num tiny" style="width:100%;flex:1" value="1"></div>`).join('')}</div></div>`;
  }
  return '';
}
