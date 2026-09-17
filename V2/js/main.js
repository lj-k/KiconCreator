/* ============================================================
   KiconCreator V2 · js/main.js
   职责：应用入口 —— init() 与全局监听注册，加载完成后立即执行。
     - 首轮渲染全部模块
     - 初始布局刷新后开启 stateReady（此后操作才进入撤销栈）
     - 内置示例预设
     - resize/orientationchange/字体就绪/ResizeObserver/滚动联动
     - Ctrl+Z / Ctrl+Y 全局快捷键
   版本：V0.03（V2.06：FA 字体异步装载）
   约束：本文件必须最后加载。
   ============================================================ */
function init(){
  // 装载内置示例预设
  const demoPresets = [
    { name: 'KIcon 经典', rows: [{ mode: 'text', text: 'K' }, { mode: 'text', text: 'ICON' }], color1: '#6c8cff', color2: '#9b5cff' },
    { name: '暖阳', rows: [{ mode: 'text', text: 'A' }], color1: '#f97316', color2: '#ef4444' },
    { name: '森林', rows: [{ mode: 'text', text: '★' }], color1: '#22c55e', color2: '#14b8a6' },
    { name: '莓果', rows: [{ mode: 'text', text: 'B' }], color1: '#ec4899', color2: '#8b5cf6' }
  ];
  // 简单装入：以当前 snapshot 作为模板
  renderRowCount();
  renderLayoutChips();
  renderLayerChips();
  renderContentTabs();
  renderContentBody();
  renderFillList();
  renderFillBody2();

  drawIcon();
  updateSize();
  updateTopbarHeight();

  $('#safeBox').classList.add('show');
  $('#safeBox').style.inset = (iconSize * 0.1) + 'px';

  requestAnimationFrame(() => {
    refreshLayout();
    // 完成初始渲染后开始记录历史
    stateReady = true;
    HistoryStack.reset(snapshotState());
    // 内置示例预设
    demoPresets.forEach(d => {
      PRESETS.push({ name: d.name, snap: snapshotState(), time: Date.now() });
    });
    renderPresets();
  });

  let resizeRAF = null;
  window.addEventListener('resize', () => {
    if (resizeRAF) cancelAnimationFrame(resizeRAF);
    resizeRAF = requestAnimationFrame(refreshLayout);
  });
  window.addEventListener('orientationchange', () => setTimeout(refreshLayout, 150));
  if (document.fonts && document.fonts.ready){
    document.fonts.ready.then(() => { drawIcon(); refreshLayout(); }); // 字体加载完成后再渲染（需求 2.6）
  }
  if (window.ResizeObserver){
    let roRAF = null;
    const ro = new ResizeObserver(() => {
      if (roRAF) cancelAnimationFrame(roRAF);
      roRAF = requestAnimationFrame(() => {
        updateTopbarHeight();
        syncMergeTabs();
        relayoutAllModules();
        updatePreviewHeight();
        checkPreviewFloat();
      });
    });
    ['col-left', 'col-mid', 'col-right', 'layout'].forEach(cls => {
      const el = document.querySelector('.' + cls);
      if (el) ro.observe(el);
    });
  }
  document.querySelectorAll('.col, .layout').forEach(el => {
    el.addEventListener('scroll', () => {
      if (document.body.classList.contains('preview-float')){
        syncPreviewLayout();
      }
    }, { passive: true });
  });

  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z'){ e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y'){ e.preventDefault(); redo(); }
  });

  setTimeout(() => toast('欢迎使用 KiconCreator V2.06'), 400);
  // FA6 字体与图标库在主界面加载后异步装载（需求 2.7）
  setTimeout(ensureFaFonts, 0);
}

init();
