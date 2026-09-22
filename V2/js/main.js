/* ============================================================
   KiconCreator V2 · js/main.js
   职责：应用入口 —— init() 与全局监听注册。
     - 首轮渲染全部模块
     - 初始布局刷新后开启 stateReady（此后操作才进入撤销栈）
     - 内置示例预设
     - resize/orientationchange/字体就绪/ResizeObserver/滚动联动
     - Ctrl+Z / Ctrl+Y 全局快捷键
   版本：V0.08（V2.20：本地预设新增内联副本来源后的版本同步）
   约束：本文件必须最后加载（引导器 steps 数组末位）。
   ============================================================ */
function init(){
  // 启动无内置预设：列表内容一律来自用户"保存为预设"、文件导入或 presets/ 本地预设目录
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

  // 安全边距框：显示状态取自勾选框，内缩量用百分比（preview.js 的 applySafeMargin）
  $('#safeBox').classList.toggle('show', $('#safeChk').checked);
  applySafeMargin();

  requestAnimationFrame(() => {
    refreshLayout();
    // 完成初始渲染后开始记录历史
    stateReady = true;
    HistoryStack.reset(snapshotState());
    renderPresets(); // 首帧先渲染空列表（本地预设加载完成后会再次渲染）
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

  setTimeout(() => toast('欢迎使用 KiconCreator V2.21'), 400);
  // FA6 字体与图标库在主界面加载后异步装载（需求 2.7）
  setTimeout(ensureFaFonts, 0);
  // 本地预设目录：启动后异步扫描并加载（需求 2.1 第 3 条；file:// 打开时自动跳过）。
  // 延后到欢迎 toast 之后，避免加载完成提示被 400ms 的欢迎语覆盖，用户看不到反馈
  setTimeout(() => { loadLocalPresets().catch(e => console.warn('[本地预设] 加载中止：', e && e.message)); }, 800);
}
/* V2.09：init 不再自执行——由 index.html 的引导器在全部模块加载完成后调用 */
