t = open('IconMaker.html', encoding='utf-8').read()

anchor = "  document.querySelectorAll('.bd-tab').forEach(bt=>{bt.onclick=()=>{"
if anchor in t:
    idx = t.find(anchor)
    # 找到 anchor 前面加上 sh-tab 绑定
    new_code = """  // 三标签切换（形状/边框/阴影）
  document.querySelectorAll('.sh-tab').forEach(tab=>{tab.onclick=()=>{
    document.querySelectorAll('.sh-tab').forEach(x=>x.classList.remove('active'));
    tab.classList.add('active');
    const which=tab.dataset.shape;
    document.getElementById('shShape').classList.toggle('active',which==='shape');
    document.getElementById('shBorder').classList.toggle('active',which==='border');
    document.getElementById('shShadow').classList.toggle('active',which==='shadow');
  };});

"""
    t = t[:idx] + new_code + t[idx:]
    open('IconMaker.html', 'w', encoding='utf-8').write(t)
    print('SH-TAB BIND ADDED OK')
else:
    print('ANCHOR NOT FOUND')

# 验证 sh-pane CSS 的 active 显示（确保默认激活）
css_sh_pane = ".sh-pane{display:none;padding:6px 2px}"
css_sh_pane_active = ".sh-pane.active{display:block;background:rgba(70,140,230,.06);border-radius:6px;padding:8px 6px;border:1px solid rgba(70,140,230,.18)}"
if css_sh_pane in t and css_sh_pane_active not in t:
    t = t.replace(css_sh_pane, css_sh_pane + "\n" + css_sh_pane_active, 1)
    open('IconMaker.html', 'w', encoding='utf-8').write(t)
    print('CSS sh-pane active ADDED OK')
else:
    print('CSS sh-pane already present or anchor missing')
