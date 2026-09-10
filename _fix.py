t = open('IconMaker.html', encoding='utf-8').read()

# 10: 修正 CSS 锚点 gap:5px → 追加 sh-tab 样式
css_anchor = ".chip-row{display:flex;flex-wrap:wrap;gap:5px}"
old_css = css_anchor
new_css = css_anchor + """
/* 形状和外框 三标签 */
.sh-tabs{display:flex;gap:2px;margin-bottom:6px;background:var(--bg-input);border-radius:6px;padding:2px;border:1px solid var(--border-strong)}
.sh-tab{flex:1;text-align:center;padding:6px 4px;border-radius:4px;cursor:pointer;font-size:11px;color:var(--text);transition:.12s;background:transparent;user-select:none}
.sh-tab.active{background:rgba(70,140,230,.25);color:var(--accent);font-weight:600}
.sh-tab.tb-on .tb-content::after{content:' ✓';color:#4CAF50;font-weight:700}
.sh-tab.tb-on.active{background:rgba(70,180,120,.18)}
.sh-pane{display:none;padding:6px 2px}
.sh-pane.active{display:block;background:rgba(70,140,230,.06);border-radius:6px;padding:8px 6px;border:1px solid rgba(70,140,230,.18)}
.btn-fill{padding:2px 8px;border-radius:4px;border:1px solid var(--border-strong);background:var(--bg-input);color:var(--accent);cursor:pointer;font-size:11px;margin-left:4px}
.btn-fill:hover{background:rgba(70,140,230,.15)}"""
assert old_css in t; t = t.replace(old_css, new_css, 1); print('CSS OK')

# 8a: 旧 bd-tab bind — 用 js 正则找
import re
m = re.search(r"document\.querySelectorAll\('\.bd-tab'\).*?bdBorder.*?bdShadow", t, re.DOTALL)
if m:
    old = m.group()
    print('found old bd-tab bind, len:', len(old))
    # 替换
    new_handler = """  // 旧 bd-tab 兼容
  document.querySelectorAll('.bd-tab').forEach(bt=>{bt.onclick=()=>{
    document.querySelectorAll('.bd-tab').forEach(x=>x.classList.remove('active'));
    bt.classList.add('active');
    const isB=bt.dataset.bd==='border';
    const elB=document.getElementById('bdBorder'),elS=document.getElementById('bdShadow');
    if(elB)elB.classList.toggle('hidden',!isB);
    if(elS)elS.classList.toggle('hidden',isB);
  };});"""
    t = t.replace(old, new_handler, 1); print('bd-tab bind OK')
else:
    print('no bd-tab bind found (already removed)')

# 阴影大小 size 被实际绘制使用 — 在 drawBg 的 shadowOffset 里加上
# 找 drawBg 中 ctx.filter 或 shadow 相关
# 让 bgShadow.size 控制阴影扩散百分比，比如 blur*size/100
# 这会影响绘制，我们给 drawBg/drawBorder 加 size 缩放
# 查 drawBorder 和 drawBg 中 shadow 应用点
idx = t.find('drawBg(c, size)')
# 从那里往后找 shadow
print('drawBg idx:', idx)
print(t[idx:idx+500])

open('IconMaker.html', 'w', encoding='utf-8').write(t)
print('saved')
