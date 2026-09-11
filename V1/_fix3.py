t = open('IconMaker.html', encoding='utf-8').read()
lines = t.split('\n')

# 错误 2：3085-3087 的垃圾残留
# 先确认范围
print('=== 目标区域 ===')
for i in range(3075, 3095):
    print(f'{i}: {lines[i-1]}')

# 修 2: 把 3078-3087 这整段替换成正确的 sh-tab 绑定
# 3077: '// 三标签切换' 开始
# 找 '// 三标签切换' 后面直到 "borderOn 事件绑定" 前
start = t.find('// 三标签切换')
if start > 0:
    # 找到 start 后的第一个 'borderOn' 或 bgShadowOn addEventListener
    end1 = t.find("$('borderOn').addEventListener", start)
    if end1 < 0: end1 = t.find("$('bgShadowOn').addEventListener", start)
    if end1 < 0: end1 = start + 500
    print(f'\n替换范围: {start} ~ {end1}')
    old = t[start:end1]
    new = """// 三标签切换
  document.querySelectorAll('.sh-tab').forEach(tab=>{tab.onclick=()=>{
    document.querySelectorAll('.sh-tab').forEach(x=>x.classList.remove('active'));
    tab.classList.add('active');
    const which=tab.dataset.shape;
    document.getElementById('shShape').classList.toggle('active',which==='shape');
    document.getElementById('shBorder').classList.toggle('active',which==='border');
    document.getElementById('shShadow').classList.toggle('active',which==='shadow');
  };});
"""
    t = t.replace(old, new, 1)
    print('错误 2 修复 OK')

# 错误 1：Assignment to constant variable — 查所有 bd = 
import re
for m in re.finditer(r'\bbd\b\s*=', t):
    pos = m.start()
    line_num = t[:pos].count('\n') + 1
    line_content = t[pos:pos+60].replace('\n',' ')
    print(f'bd assign line {line_num}: {line_content}')

open('IconMaker.html', 'w', encoding='utf-8').write(t)
print('saved')
