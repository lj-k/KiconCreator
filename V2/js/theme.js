/* ============================================================
   KiconCreator V2 · js/theme.js
   职责：全局外观与布局切换绑定（顶层执行，脚本加载时即注册）。
     - 主题切换（light/retro/dark，写 <html data-theme>）
     - 两栏合并标签（merge-tabs）切换
   版本：V0.01
   ============================================================ */

/* ---------- 主题切换 ---------- */
$$('#themeSwitch button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.documentElement.dataset.theme = btn.dataset.theme;
    $$('#themeSwitch button').forEach(b => b.classList.toggle('active', b === btn));
    drawIcon();
    updateTopbarHeight();
    toast('已切换至「' + btn.textContent + '」主题');
  });
});

/* ---------- 两栏合并标签切换 ---------- */
$$('.merge-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    $$('.merge-tab').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelector('.col-mid')?.classList.toggle('active', tab === 'mid');
    document.querySelector('.col-right')?.classList.toggle('active', tab === 'right');
    requestAnimationFrame(() => { syncMergeTabs(); refreshLayout(); });
  });
});
