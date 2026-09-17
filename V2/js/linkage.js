/* ============================================================
   KiconCreator V2 · js/linkage.js
   职责：P0-1 参数联动核心。
     - propagateLink：把同名参数（data-name）同步到全文档其它模块
     - syncAllChainIcons：按 linkFlags 同步所有链条图标
     - updateLinkageBtnState：顶栏联动按钮的三态（无/部分/全部）
   版本：V0.01
   ============================================================ */

/* 把同栏内所有模块中同名参数同步（排除源行） */
function propagateLink(paramName, value, srcModuleId, srcRow){
  // 找到所有 .param[data-name=paramName] 的滑块，排除源滑块
  document.querySelectorAll(`.param[data-name="${paramName}"]`).forEach(p => {
    if (p === srcRow) return;
    const r = p.querySelector('input[type=range]');
    const n = p.querySelector('.num');
    if (r && n && document.activeElement !== n){
      r.value = value;
      n.value = value;
      const min = +r.min || 0, max = +r.max || 100;
      r.style.setProperty('--fill', (((value - min) / (max - min)) * 100).toFixed(1) + '%');
    }
  });
}

/* 同步所有链条图标状态 */
function syncAllChainIcons(){
  document.querySelectorAll('.param[data-name]').forEach(p => {
    const name = p.dataset.name;
    const chain = p.querySelector('.chain');
    if (chain && name){
      chain.classList.toggle('on', !!linkFlags[name]);
    }
  });
}

function updateLinkageBtnState(){
  const names = Object.keys(linkFlags).filter(k => linkFlags[k]);
  const btn = $('#linkageBtn');
  const txt = $('.lbl', btn);
  btn.classList.remove('partial', 'all', 'none');
  if (names.length === 0){ txt.textContent = '参数联动：无'; btn.classList.add('none'); }
  else if (names.length <= 3){ txt.textContent = '参数联动：部分'; btn.classList.add('partial'); }
  else { txt.textContent = '参数联动：全部'; btn.classList.add('all'); }
}
