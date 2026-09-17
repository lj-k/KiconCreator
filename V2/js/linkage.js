/* ============================================================
   KiconCreator V2 · js/linkage.js
   职责：P0-1 / 需求 3.7 参数联动核心（逐行状态版）。
     - applyLinkedParam：源行写入 + 同步所有开启联动的行 → 刷新可见输入框
     - toggleRowLink：开启某行某参数联动 → 全部行同键开启；
       关闭 → 仅该行关闭（需求 3.7 举例语义）
     - syncAllChainIcons / updateLinkageBtnState：链条图标与顶栏三态
   版本：V0.02（V2.05：全局 linkFlags 改为逐行 link 标记）
   ============================================================ */

/* 参数变更入口：源行始终更新，联动行同步（含不可见行） */
function applyLinkedParam(key, value, srcRowIdx){
  rows.forEach((r, i) => {
    if (i === srcRowIdx || r.link[key]) r.params[key] = value;
  });
  syncParamInputs(key, value);
}

/* 把变更同步到当前渲染在 DOM 里的同名参数控件（跳过正在编辑的输入框） */
function syncParamInputs(key, value){
  document.querySelectorAll(`.param[data-name="${CSS.escape(key)}"]`).forEach(p => {
    const r = p.querySelector('input[type=range]');
    const n = p.querySelector('.num');
    if (r){
      r.value = value;
      const min = +r.min || 0, max = +r.max || 100;
      r.style.setProperty('--fill', (((value - min) / (max - min)) * 100).toFixed(1) + '%');
    }
    if (n && document.activeElement !== n) n.value = value;
  });
}

/* 链条切换（需求 3.7）：开 → 全部行同键开启；关 → 仅本行关闭 */
function toggleRowLink(key, rowIdx){
  if (!key || rowIdx == null || !rows[rowIdx]) return;
  const turnOn = !rows[rowIdx].link[key];
  if (turnOn) rows.forEach(r => { r.link[key] = true; });
  else rows[rowIdx].link[key] = false;
  syncAllChainIcons();
  updateLinkageBtnState();
  commitHistory();
  toast(turnOn ? `已开启「${PARAM_DEFS[key]?.label || key}」全部行联动` : `已取消本行「${PARAM_DEFS[key]?.label || key}」联动`);
}

/* 判断 DOM 参数行所属的行索引（style 模块 / 内容面板均为激活行） */
function rowOfElement(el){
  return activeRow;
}

/* 按状态同步所有可见链条图标 */
function syncAllChainIcons(){
  document.querySelectorAll('.param[data-name]').forEach(p => {
    const key = p.dataset.name;
    const chain = p.querySelector('.chain');
    if (chain && PARAM_DEFS[key]){
      chain.classList.toggle('on', !!rows[rowOfElement(p)]?.link[key]);
    }
  });
}

/* 顶栏联动按钮三态：全部 / 部分 / 无（需求 四.3） */
function linkedSlotStats(){
  let total = 0, on = 0;
  for (let i = 0; i < rowCount; i++){
    const r = rows[i];
    Object.keys(PARAM_DEFS).forEach(k => { total++; if (r.link[k]) on++; });
  }
  return { total, on };
}
function updateLinkageBtnState(){
  const { total, on } = linkedSlotStats();
  const btn = $('#linkageBtn');
  const txt = $('.lbl', btn);
  btn.classList.remove('partial', 'all', 'none');
  if (on === 0){ txt.textContent = '参数联动：无'; btn.classList.add('none'); }
  else if (on >= total){ txt.textContent = '参数联动：全部'; btn.classList.add('all'); }
  else { txt.textContent = '参数联动：部分'; btn.classList.add('partial'); }
}
