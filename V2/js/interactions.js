/* ============================================================
   KiconCreator V2 · js/interactions.js
   职责：pane 内交互的统一绑定入口 bindPaneInteractions(moduleId, container, rowIdx)。
     - 滑块/数字输入：拖动实时写行状态并节流重绘（不入栈）；
       change 时联动同步 + commitHistory（需求 四.2：未释放不入历史）
     - 重置按钮（回默认值）、链条按钮（toggleRowLink）
     - checkbox/select[data-pkey]：布尔与选项参数（斜体、排版、裁切…）
     - 颜色控件：取色器与 HEX 输入双向同步
     - 颜色建议 swatch：点击写回 color.c1/c2（需求 3.4）
     - chip 单选组、边界形状切换、形状种类与"填满 / 重置形状参数"按钮（需求 三.1）
   版本：V0.05（V2.22：新增 fill 参数通道、多分界线滑轨绑定、纯色模式控件与一键填充）
   说明：背景（形状与外框）参数是全局唯一的（BG_PARAM_DEFS → bgParams），
        滑块/数字框/重置/布尔/取色器/HEX 输入统一按"行参数 or 全局参数"分派。
   注意：动态重建的局部 DOM（如 edgeParamsWrap）需重新绑定，
        所以内部存在 bindPaneInteractions 的递归调用。
   ============================================================ */
function bindPaneInteractions(moduleId, container, rowIdx){
  const row = rowIdx != null ? rows[rowIdx] : null;
  /* 全局参数（背景栏）统一通道：形状与外框键 → bgParams，填充布局键 → fillParams。
     这些键不按行存储，也没有"其它行可联动"，因此不提供联动与逐行写入 */
  const isBgKey = k => !!(k && typeof BG_PARAM_DEFS !== 'undefined' && BG_PARAM_DEFS[k]);
  const isFillKey = k => !!(k && typeof FILL_PARAM_DEFS !== 'undefined' && FILL_PARAM_DEFS[k]);
  const isGlobalKey = k => isBgKey(k) || isFillKey(k);
  const writeGlobal = (k, v) => { if (isFillKey(k)) fillParams[k] = v; else bgParams[k] = v; };
  const readGlobal = k => (isFillKey(k) ? fillParams[k] : bgParams[k]);
  /* 值变化后需要联动重算的模块（如 fill.layers 变化 → 分界线数组长度随之变化） */
  const resyncAfterWrite = rowEl => {
    if (!rowEl || rowEl.dataset.resync !== 'fill') return;
    syncFillArrays();
  };

  /* ---------- 滑块 + 数字输入 ---------- */
  container.querySelectorAll('input[type=range]').forEach(r => {
    // HSL（data-hsl）与多分界线滑轨（data-ms）有专用绑定，跳过通用逻辑
    if (r.closest('[data-hsl]') || r.closest('[data-ms]')) return;
    const rowEl = r.closest('.param');
    const min = +r.min || 0, max = +r.max || 100;
    const key = rowEl?.dataset.name;
    const gkey = isGlobalKey(key) ? key : null;
    const rowKey = (!gkey && row && key && PARAM_DEFS[key]) ? key : null;
    const writable = !!gkey || !!rowKey;
    const write = v => {
      if (gkey) writeGlobal(gkey, v);
      else row.params[rowKey] = v;
      if (gkey === 'shape.inner') syncInnerZeroWarn(container);
    };
    const upd = () => {
      const v = +r.value;
      r.style.setProperty('--fill', (((v - min) / (max - min)) * 100).toFixed(1) + '%');
      const num = rowEl?.querySelector('.num');
      if (num && document.activeElement !== num) num.value = v;
    };
    upd();
    r.addEventListener('input', () => {
      if (writable){ write(+r.value); resyncAfterWrite(rowEl); scheduleDrawIcon(); } // 拖动实时重绘，不入栈
    });
    r.addEventListener('change', () => {
      if (writable){
        if (gkey) write(+r.value);
        else applyLinkedParam(rowKey, +r.value, rowIdx);
        resyncAfterWrite(rowEl);
        scheduleDrawIcon();
        // 分界线数组长度/分组随层数变化 → 重建本模块 pane（手柄数量、标签文案都要更新）
        if (rowEl?.dataset.resync === 'fill') rerenderModule('fill');
      }
      commitHistory();
    });
    const num = rowEl?.querySelector('.num');
    if (num){
      num.addEventListener('change', () => {
        const v = parseFloat(num.value);
        if (isNaN(v) || v < min || v > max){
          flashInvalid(num, min, max);
          setTimeout(() => { r.value = num.value; upd(); }, 620);
          return;
        }
        r.value = v; upd();
        if (writable){
          if (gkey) write(v);
          else applyLinkedParam(rowKey, v, rowIdx);
          resyncAfterWrite(rowEl);
          scheduleDrawIcon();
          if (rowEl?.dataset.resync === 'fill') rerenderModule('fill');
        }
        commitHistory();
      });
    }
    /* 重置为默认值 */
    const rst = rowEl?.querySelector('.rst');
    if (rst) rst.addEventListener('click', () => {
      const def = rowEl.dataset.default;
      if (def !== undefined){
        r.value = def;
        const n = rowEl.querySelector('.num');
        if (n) n.value = def;
        upd();
        if (writable){
          if (gkey) write(+def);
          else applyLinkedParam(rowKey, +def, rowIdx);
          resyncAfterWrite(rowEl);
          scheduleDrawIcon();
          if (rowEl?.dataset.resync === 'fill') rerenderModule('fill');
        }
        commitHistory();
      }
    });
    /* 链条切换（逐行联动；全局背景参数不提供联动） */
    const chain = rowEl?.querySelector('.chain');
    if (chain && rowKey){
      chain.classList.toggle('on', !!rows[rowIdx].link[rowKey]);
      chain.addEventListener('click', e => {
        e.stopPropagation();
        toggleRowLink(rowKey, rowIdx);
      });
    }
  });

  /* ---------- 布尔参数（斜体/启用阴影/启用边框/启用形状阴影…） ---------- */
  container.querySelectorAll('input[type=checkbox][data-pkey]').forEach(cb => {
    if (cb.dataset.bound) return;
    cb.dataset.bound = '1';
    cb.addEventListener('change', () => {
      const k = cb.dataset.pkey;
      if (isGlobalKey(k)) writeGlobal(k, cb.checked);
      else if (row) row.params[k] = cb.checked;
      else return;
      if (cb.dataset.rerender) rerenderModule(cb.dataset.rerender);
      scheduleDrawIcon();
      commitHistory();
    });
  });

  /* ---------- 下拉参数（字体/粗细/排版…） ---------- */
  container.querySelectorAll('select[data-pkey]').forEach(sel => {
    if (sel.dataset.bound) return;
    sel.dataset.bound = '1';
    sel.addEventListener('change', () => {
      const k = sel.dataset.pkey;
      const def = (isFillKey(k) ? FILL_PARAM_DEFS[k] : (isBgKey(k) ? BG_PARAM_DEFS[k] : PARAM_DEFS[k]));
      if (isGlobalKey(k)) writeGlobal(k, sel.value);
      else if (row) row.params[k] = sel.value;
      else return;
      if (def?.options && !def.options.includes(sel.value)) sel.value = def.options[0];
      if (row) ensureWebFont(row.params); // 字体加载完成后再渲染（需求 2.6）
      scheduleDrawIcon();
      commitHistory();
    });
  });

  /* ---------- 颜色控件（取色器 ⇄ HEX 输入） ---------- */
  const setColorValue = (key, val, srcEl) => {
    if (isGlobalKey(key)) writeGlobal(key, val);
    else if (row) row.params[key] = val;
    else return;
    container.querySelectorAll(`[data-pkey="${key}"]`).forEach(el => {
      if (el !== srcEl) el.value = val;
    });
    scheduleDrawIcon();
  };
  container.querySelectorAll('input[type=color][data-pkey]').forEach(cp => {
    if (cp.dataset.bound) return;
    cp.dataset.bound = '1';
    cp.addEventListener('input', () => setColorValue(cp.dataset.pkey, cp.value, cp));
    cp.addEventListener('change', () => {
      commitHistory();
      if (!isGlobalKey(cp.dataset.pkey)) rerenderModule('style');
    });
  });
  container.querySelectorAll('input.mini-input[data-hex]').forEach(hex => {
    if (hex.dataset.bound) return;
    hex.dataset.bound = '1';
    hex.addEventListener('change', () => {
      const k = hex.dataset.pkey;
      const cur = isGlobalKey(k) ? readGlobal(k) : (row?.params[k] || '#000000');
      const v = /^#[0-9a-fA-F]{6}$/.test(hex.value.trim()) ? hex.value.trim().toUpperCase() : null;
      if (!v){ flashInvalid(hex, 0, 100); hex.value = cur; return; }
      hex.value = v;
      setColorValue(k, v, hex);
      commitHistory();
      if (!isGlobalKey(k)) rerenderModule('style');
    });
  });

  /* ---------- 颜色建议 swatch（需求 3.4：点击写回） ---------- */
  container.querySelectorAll('.sw[data-c]').forEach(sw => {
    if (sw.dataset.bound) return;
    sw.dataset.bound = '1';
    sw.addEventListener('click', () => {
      const wrap = sw.closest('#colorAdviceWrap');
      if (wrap && row){
        applyLinkedParam('color.c1', sw.dataset.c, rowIdx);
        scheduleDrawIcon();
        commitHistory();
        rerenderModule('style');
        toast('已应用建议颜色 ' + sw.dataset.c);
      } else {
        toast('已应用建议颜色 ' + sw.dataset.c);
        commitHistory();
      }
    });
  });
  container.querySelectorAll('.sw-pair').forEach(pair => {
    if (pair.dataset.bound) return;
    pair.dataset.bound = '1';
    pair.addEventListener('click', () => {
      const wrap = pair.closest('#colorAdviceWrap');
      if (wrap && row){
        applyLinkedParam('color.c1', pair.dataset.c1, rowIdx);
        applyLinkedParam('color.c2', pair.dataset.c2, rowIdx);
        scheduleDrawIcon();
        commitHistory();
        rerenderModule('style');
      }
      toast(`已应用渐变：${pair.dataset.c1} → ${pair.dataset.c2}`);
      commitHistory();
    });
  });

  /* ---------- chip 单选组 ---------- */
  container.querySelectorAll('.chip-row').forEach(crow => {
    if (crow.closest('[data-group="shape"]')) return;
    if (crow.closest('[data-group="fillLayout"]')) return;
    if (crow.closest('#edgeShapeRow')) return;
    if (crow.dataset.bound) return;
    crow.dataset.bound = '1';
    crow.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      $$('.chip', crow).forEach(c => c.classList.toggle('active', c === chip));
      commitHistory();
    });
  });

  /* ---------- 颜色模式切换（单色 ⇄ 渐变） ---------- */
  const seg = container.querySelector('#colorModeSeg');
  if (seg && !seg.dataset.bound){
    seg.dataset.bound = '1';
    seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || !row) return;
      const newMode = b.dataset.cmode;
      if (newMode === row.params['color.mode']) return;
      row.params['color.mode'] = newMode;
      renderStyle();
      scheduleDrawIcon();
      commitHistory();
    });
  }

  /* ---------- 边界形状切换（背景暂缓） ---------- */
  const edgeRow = container.querySelector('#edgeShapeRow');
  if (edgeRow && !edgeRow.dataset.bound){
    edgeRow.dataset.bound = '1';
    edgeRow.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        currentEdgeShape = chip.dataset.shape;
        edgeRow.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
        const wrap = container.querySelector('#edgeParamsWrap');
        if (wrap){ wrap.innerHTML = buildEdgeParams(currentEdgeShape); bindPaneInteractions(moduleId, wrap, rowIdx); }
        commitHistory();
      });
    });
  }

  /* ---------- 形状种类选择（需求 三.1.1：基础/边形/角星三组互斥） ---------- */
  container.querySelectorAll('[data-group="shape"] .chip').forEach(chip => {
    if (chip.dataset.bound) return;
    chip.dataset.bound = '1';
    chip.addEventListener('click', () => {
      const kind = chip.dataset.kind;
      if (!kind || kind === bgParams['shape.kind']) return;
      bgParams['shape.kind'] = kind;
      // 形状参数随种类增减（弧度/内角），需重渲染本模块 pane
      rerenderModule('shape');
      scheduleDrawIcon();
      commitHistory();
      toast(kind === '无' ? '形状：无（背景按白底/透明）' : '形状：' + kind);
    });
  });

  /* ---------- 填满绘图区域（需求 1.1.2） ---------- */
  const fb = container.querySelector('#fillShapeBtn');
  if (fb && !fb.dataset.bound){
    fb.dataset.bound = '1';
    fb.addEventListener('click', () => {
      if (shapeKindInfo(bgParams['shape.kind']).type === 'none'){
        toast('请先选择形状');
        return;
      }
      bgParams['shape.size'] = shapeFillSize(bgParams, iconSize);
      rerenderModule('shape');
      scheduleDrawIcon();
      commitHistory();
      toast('形状已填满绘图区域（尺寸 ' + bgParams['shape.size'] + '%）');
    });
  }

  /* ---------- 重置形状参数（形状标签页内，需求 五） ---------- */
  const sr = container.querySelector('#shapeTabReset');
  if (sr && !sr.dataset.bound){
    sr.dataset.bound = '1';
    sr.addEventListener('click', () => resetShapeTabParams(container));
  }

  /* ---------- 填充布局：布局形式 chip / 多分界线滑轨（需求 2.3） ---------- */
  if (container.querySelector('[data-group="fillLayout"]')) bindFillLayoutChips(container);
  if (container.querySelector('[data-ms]')) bindMultiSliders(container);

  /* ---------- 内部填充：纯色模式控件与颜色建议（需求 3.2.1） ---------- */
  bindFillSolidControls(container);

  /* ---------- 颜色建议 tab：一键填充各色块（需求 2.4，仅纯色模式色块） ---------- */
  container.querySelectorAll('[data-fill-palette]').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const base = (rows[activeRow] && rows[activeRow].params['color.c1']) || '#6C8CFF';
      const palette = fillAdvicePalette(btn.dataset.fillPalette, base, fillCount);
      let n = 0;
      for (let i = 0; i < fillCount; i++){
        if ((fillModes[i] || '纯') !== '纯') continue;   // 一键填充仅限纯色（需求 2.4）
        fillColors[i] = palette[i % palette.length];
        n++;
      }
      renderFillList();
      renderFillBody2();
      scheduleDrawIcon();
      commitHistory();
      toast(n ? `已用「${btn.dataset.fillPalette}色」填充 ${n} 个纯色色块` : '没有纯色模式的色块可填充');
    });
  });
}

/* ---------- 内部填充：纯色模式控件（需求 3.2.1） ----------
   色值唯一来源是 fillColors[activeFill]：取色器 / HEX / HSL 三个入口都写它，
   再同步其它入口与色块缩略。HSL 用 data-hsl 标记，不走通用参数绑定（它不是注册参数键）。 */
function bindFillSolidControls(container){
  const cp = container.querySelector('[data-fill-color]');
  const hexIn = container.querySelector('[data-fill-hex]');
  const hslRanges = Array.from(container.querySelectorAll('[data-hsl] input[type=range]'));
  if (!cp && !hexIn && !hslRanges.length) return;
  const idx = activeFill;
  const paint = (fromHsl) => {
    const hex = fillColorOf(idx);
    if (cp && cp.value !== hex) cp.value = hex;
    if (hexIn && document.activeElement !== hexIn) hexIn.value = hex;
    if (!fromHsl && hslRanges.length === 3){
      const { h, s, l } = hexToHsl(hex);
      const vals = [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
      hslRanges.forEach((r, i) => {
        if (document.activeElement === r) return;
        r.value = vals[i];
        const n = r.closest('[data-hsl]').querySelector('.num');
        if (n) n.value = vals[i];
        r.style.setProperty('--fill', (vals[i] / (+r.max || 100) * 100).toFixed(1) + '%');
      });
    }
  };
  const commit = (hex) => {
    fillColors[idx] = hex;
    paint(false);
    renderFillList();       // 标签底色实时跟随
    scheduleDrawIcon();
  };
  if (cp && !cp.dataset.bound){
    cp.dataset.bound = '1';
    cp.addEventListener('input', () => commit(cp.value.toUpperCase()));
    cp.addEventListener('change', () => commitHistory());
  }
  if (hexIn && !hexIn.dataset.bound){
    hexIn.dataset.bound = '1';
    hexIn.addEventListener('change', () => {
      const v = /^#[0-9a-fA-F]{6}$/.test(hexIn.value.trim()) ? hexIn.value.trim().toUpperCase() : null;
      if (!v){ flashInvalid(hexIn, 0, 100); hexIn.value = fillColorOf(idx); return; }
      commit(v);
      commitHistory();
    });
  }
  hslRanges.forEach(r => {
    if (r.dataset.bound) return;
    r.dataset.bound = '1';
    const rowEl = r.closest('[data-hsl]');
    const num = rowEl.querySelector('.num');
    const max = +r.max || 100;
    const fromSliders = () => {
      const h = +hslRanges[0].value, s = +hslRanges[1].value, l = +hslRanges[2].value;
      return hslToHex(h, s / 100, l / 100);
    };
    const upd = () => {
      r.style.setProperty('--fill', (+r.value / max * 100).toFixed(1) + '%');
      if (num && document.activeElement !== num) num.value = r.value;
    };
    upd();
    r.addEventListener('input', () => { upd(); commit(fromSliders()); });
    r.addEventListener('change', () => commitHistory());
    if (num) num.addEventListener('change', () => {
      const v = parseFloat(num.value);
      if (isNaN(v) || v < 0 || v > max){
        flashInvalid(num, 0, max);
        setTimeout(() => { num.value = r.value; upd(); }, 620);
        return;
      }
      r.value = v; upd();
      commit(fromSliders());
      commitHistory();
    });
  });
  /* 颜色建议 swatch（需求 3.2.1）：点击即把建议色设为当前色块颜色 */
  container.querySelectorAll('[data-fill-adv]').forEach(sw => {
    if (sw.dataset.bound) return;
    sw.dataset.bound = '1';
    sw.addEventListener('click', () => {
      commit(sw.dataset.fillAdv);
      commitHistory();
      toast('已应用建议颜色 ' + sw.dataset.fillAdv);
    });
  });
  paint(false);
}

/* 角星内角 0° → 形状不可见（需求 1.1.1）：红字提示随拖动实时显隐 */
function syncInnerZeroWarn(container){
  const w = container.querySelector('#innerZeroWarn');
  if (!w) return;
  w.style.display = (+bgParams['shape.inner'] || 0) <= 0 ? '' : 'none';
}

/* 形状标签页重置（需求 五）：只把形状参数恢复默认值，保留当前所选形状种类，
   这样用户调乱尺寸/方向/弧度后能一键回到"干净的同一种形状" */
function resetShapeTabParams(container){
  const keepKind = bgParams['shape.kind'];
  resetBgParams('shape.');
  bgParams['shape.kind'] = keepKind;
  rerenderModule('shape');
  scheduleDrawIcon();
  commitHistory();
  toast('已重置形状参数' + (keepKind === SHAPE_NONE ? '' : '（保留「' + keepKind + '」）'));
}

/* ---------- Web 字体按需加载（需求 2.6） ----------
   选中/恢复到含 web 字体的状态时触发；加载完成或失败后重绘并提示 */
const fontLoadTried = new Set();
function ensureWebFont(p){
  ['font.cn', 'font.en'].forEach(k => {
    const opt = FONT_CN_OPTIONS.concat(FONT_EN_OPTIONS).find(f => f.name === p[k]);
    if (!opt?.web || fontLoadTried.has(opt.name)) return;
    fontLoadTried.add(opt.name);
    const weight = WEIGHT_MAP[p['font.weight']] || 400;
    document.fonts.load(`${weight} 32px ${opt.family}`)
      .then(() => {
        if (!document.fonts.check(`${weight} 32px ${opt.family}`)){
          toast(`「${opt.name}」加载失败，已回退系统字体`);
        }
      })
      .catch(() => toast(`「${opt.name}」加载失败（网络不可用），已回退系统字体`))
      .finally(() => scheduleDrawIcon());
  });
}
