/* ============================================================
   KiconCreator V2 · js/interactions.js
   职责：pane 内交互的统一绑定入口 bindPaneInteractions(moduleId, container, rowIdx)。
     - 滑块/数字输入：拖动实时写行状态并节流重绘（不入栈）；
       change 时联动同步 + commitHistory（需求 四.2：未释放不入历史）
     - 重置按钮（回默认值）、链条按钮（toggleRowLink）
     - checkbox/select[data-pkey]：布尔与选项参数（斜体、排版、裁切…）
     - 颜色控件：取色器与 HEX 输入双向同步
     - 颜色建议 swatch：点击写回 color.c1/c2（需求 3.4）
     - chip 单选组、边界形状切换、形状种类与"填满"按钮（需求 三.1）
   版本：V0.03（V2.17：支持全局背景参数键（BG_PARAM_DEFS → bgParams）——滑块/数字框/重置/
       布尔/取色器/HEX 输入统一按"行参数 or 全局参数"分派；形状种类 chip 与"填满"落地）
   注意：动态重建的局部 DOM（如 edgeParamsWrap）需重新绑定，
        所以内部存在 bindPaneInteractions 的递归调用。
   ============================================================ */
function bindPaneInteractions(moduleId, container, rowIdx){
  const row = rowIdx != null ? rows[rowIdx] : null;
  /* 背景（形状与外框）参数是全局唯一的：键在 BG_PARAM_DEFS 注册，
     写入 bgParams 而非行参数；联动/重置对全局键不适用（无"其它行"可联动） */
  const isGlobalKey = k => !!(k && typeof BG_PARAM_DEFS !== 'undefined' && BG_PARAM_DEFS[k]);

  /* ---------- 滑块 + 数字输入 ---------- */
  container.querySelectorAll('input[type=range]').forEach(r => {
    const rowEl = r.closest('.param');
    const min = +r.min || 0, max = +r.max || 100;
    const key = rowEl?.dataset.name;
    const gkey = isGlobalKey(key) ? key : null;
    const rowKey = (!gkey && row && key && PARAM_DEFS[key]) ? key : null;
    const writable = !!gkey || !!rowKey;
    const write = v => {
      if (gkey) bgParams[gkey] = v;
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
      upd();
      if (writable){ write(+r.value); scheduleDrawIcon(); } // 拖动实时重绘，不入栈
    });
    r.addEventListener('change', () => {
      if (writable){
        if (gkey) write(+r.value);
        else applyLinkedParam(rowKey, +r.value, rowIdx);
        scheduleDrawIcon();
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
          scheduleDrawIcon();
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
          scheduleDrawIcon();
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
      if (isGlobalKey(k)) bgParams[k] = cb.checked;
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
      const def = (isGlobalKey(k) ? BG_PARAM_DEFS[k] : PARAM_DEFS[k]);
      if (isGlobalKey(k)) bgParams[k] = sel.value;
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
    if (isGlobalKey(key)) bgParams[key] = val;
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
      const cur = isGlobalKey(k) ? bgParams[k] : (row?.params[k] || '#000000');
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
}

/* 角星内角 0° → 形状不可见（需求 1.1.1）：红字提示随拖动实时显隐 */
function syncInnerZeroWarn(container){
  const w = container.querySelector('#innerZeroWarn');
  if (!w) return;
  w.style.display = (+bgParams['shape.inner'] || 0) <= 0 ? '' : 'none';
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
