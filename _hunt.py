t = open('IconMaker.html', encoding='utf-8').read()
print('total:', len(t), 'bytes')

# 提取所有 col-hd / sec-t 标题行
import re
heads = list(re.finditer(r'<section class="col">|class="col-hd"|class="sec-t"', t))
for m in heads:
    line_num = t[:m.start()].count('\n') + 1
    ctx = t[m.start():m.start()+80].replace('\n',' ')
    print(f'  L{line_num}: {ctx}')
print()

# 关键 CSS 片段
for kw in ['.col-hd','.col-bd .sec','.sec-t{','.style-tabs{','.sh-tabs{']:
    idx = t.find(kw)
    if idx > 0:
        print(f'[{kw}] L{t[:idx].count(chr(10))+1}')
        
# computeLayout / drawContent / drawShapeOuter / renderLineCount / renderLayoutGroup / newLine
print()
for kw in ['function computeLayout','function drawContent','function drawShapeOuter','function renderLineCount','function renderLayoutGroup','function newLine']:
    idx = t.find(kw)
    print(f'{kw}: L{t[:idx].count(chr(10))+1}')
