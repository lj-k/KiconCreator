"""
patch_v4_b.py —— 第二批
- 主题 CSS 更新（明亮白底 + 浅彩模块 + 功能区浅蓝）
- 预览模块竖屏 sticky 固定
- 下载/预设 JS 绑定（ICO, 透明, 尺寸, 导入导出）
- 多行功能区蓝底 + max 6 行 + 排版模式扩展
"""
t = open('IconMaker.html', encoding='utf-8').read()

# ─── 1. 主题 CSS 重写 ───
old_light = """[data-theme="light"]{
  --lf-bg:#eef5ee;--lf-text:#6b8e6b;--lf-bar:#cbdccb;--lf-fg:#4f7a4f;
  --bg-page:#eef5ee;--bg-card:rgba(255,255,255,.85);--bg-card-solid:#ffffff;
  --bg-rail:#f4f9f4;--bg-input:#ffffff;--bg-hover:#e9f2e9;--bg-deep:#cbdccb;
  --border:rgba(120,140,120,.28);--border-strong:#b0c4b0;
  --accent:#4f7a4f;--accent-hover:#3d623d;
  --text:#2d472d;--text-sub:#6b8e6b;--text-muted:#99a899;--text-inv:#ffffff;
  --shadow:rgba(70,90,70,.15);
}"""
new_light = """[data-theme="light"]{
  --lf-bg:#f0f4f8;--lf-text:#5a7090;--lf-bar:#c5d4e6;--lf-fg:#3a5580;
  --bg-page:#ffffff;--bg-card:#ffffff;--bg-card-solid:#ffffff;
  --bg-rail:#f4f7fb;--bg-input:#ffffff;--bg-hover:#e8f0fa;--bg-deep:#c5d4e6;
  --bg-func:#e8f0fa;          /* 功能区浅蓝（背景参数） */
  --bg-multi:#e8f5ff;          /* 多行功能区浅蓝 */
  --bg-single:#f0f6ff;         /* 单行功能区浅蓝 */
  --border:rgba(160,175,195,.35);--border-strong:#b8c4d4;
  --accent:#3a5580;--accent-hover:#2d4570;
  --text:#1e2d40;--text-sub:#5a7090;--text-muted:#8095a8;--text-inv:#ffffff;
  --shadow:rgba(60,80,120,.12);
}"""
assert old_light in t, 'old light theme not found'
t = t.replace(old_light, new_light, 1); print('1 OK: light theme updated')

# ─── 2. col-hd + sec-t 浅蓝功能区 CSS ───
# 在主题 CSS 下方注入额外的功能区浅蓝规则
# 找 dark theme 结束位置注入
dark_end = "[data-theme=\"dark\"]"
idx_dark = t.find(dark_end)
# 找 dark 的结束（下一个 [data-theme 或 .sec-t 之前）
idx_after_dark = t.find('}', idx_dark) + 1
# 找下一个空行或换行
idx_after_theme_block = t.find('\n', idx_after_dark) + 1
extra_css = """
/* ── 功能区额外浅蓝规则 ── */
[data-theme="light"] .col-hd{background:#e8f0fa;border-bottom:1px solid #c5d4e6}
[data-theme="light"] .col-bd .sec{background:#fafbfd;border:1px solid #e4e8ef;border-radius:8px;padding:6px 8px;margin-bottom:8px}
[data-theme="light"] .col-bd .sec-t{background:#e8f0fa;color:#2d4570;border-bottom:1px solid #d8e1ee;font-weight:600}
[data-theme="light"] .col-bd #outerSec{background:transparent;border:none;padding:0;margin-bottom:8px}
[data-theme="light"] .col-bd #outerSec > .sec-t{background:#dce8f8;border:1px solid #c5d4e6;border-bottom:none;border-radius:8px 8px 0 0;color:#2d4570}
[data-theme="light"] .sh-tabs{background:#f0f6ff;border-color:#c5d4e6}
[data-theme="light"] .sh-tab.active{background:#b8d4f0;color:#1a3a60}
[data-theme="light"] .sh-pane.active{background:#e8f0fa;border-color:#c5d4e6}
[data-theme="light"] .col-bd .sec .multi-line-wrap,.data-theme="light" .col-bd .sec .multi-wrap{background:#dce8f8;border:1px solid #c5d4e6;border-radius:6px;padding:6px}
[data-theme="light"] .col-bd .sec .line-tabs{background:#f0f6ff;border:1px solid #d8e1ee;border-radius:6px;padding:3px}
[data-theme="light"] .col-bd .sec #stylePanel{background:#f0f6ff;border:1px solid #d8e1ee;border-radius:0 0 6px 6px}
[data-theme="light"] .style-tabs{background:#e4ecf8;border:1px solid #c5d4e6;border-bottom:none;border-radius:6px 6px 0 0}
[data-theme="light"] .style-tab.active{background:#b8d4f0;color:#1a3a60}
[data-theme="light"] .preview-center{background:#f0f4f8;border:1px solid #d8e1ee;border-radius:8px}
[data-theme="light"] .form-row input[type="range"]::-webkit-slider-thumb{background:#3a5580}
[data-theme="light"] .chip{background:#ffffff;border:1px solid #d8e1ee;color:#3a5580}
[data-theme="light"] .chip.active{background:#3a5580;color:#fff;border-color:#3a5580}
[data-theme="light"] .btn{background:#f0f6ff;border:1px solid #c5d4e6;color:#2d4570}
[data-theme="light"] .btn:hover{background:#dce8f8}
[data-theme="light"] .btn-primary{background:#3a5580;color:#fff;border-color:#3a5580}
[data-theme="light"] .num-input{background:#ffffff;border-color:#d8e1ee;color:#1e2d40}

/* 多行功能区强制浅蓝色 */
.multi-wrap,.multi-line-wrap{background:var(--bg-multi,rgba(200,225,255,.4))!important;border:1px solid var(--border-strong,#b8c4d4)!important;border-radius:8px!important;padding:8px!important}

/* 单行样式面板浅蓝色 + 标签连参数区域无分割 */
.style-tabs{display:flex;gap:1px;margin-bottom:0;border-radius:6px 6px 0 0;background:var(--bg-rail,#eef);padding:2px;border:1px solid var(--border-strong,#b8c4d4);border-bottom:none}
.style-tab{flex:1;text-align:center;padding:6px 4px;font-size:11px;cursor:pointer;border-radius:4px;border:none;background:transparent;color:var(--text);transition:.12s}
.style-tab.active{background:rgba(70,140,230,.25);color:var(--accent);font-weight:600}
#stylePanel{background:rgba(70,140,230,.06);border:1px solid var(--border-strong,#b8c4d4);border-radius:0 0 6px 6px;padding:8px}

/* 预览模块 sticky 固定（竖屏优先） */
@media (max-width: 1200px){
  #previewSec{position:sticky;top:8px;z-index:20}
}
@media (orientation: portrait){
  #previewSec{position:sticky;top:8px;z-index:20}
}
"""
t = t[:idx_after_theme_block] + extra_css + t[idx_after_theme_block:]
print('2 OK: extra light theme CSS')

open('IconMaker.html', 'w', encoding='utf-8').write(t)
print('v4_b step1-2 done')
