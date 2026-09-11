t = open('IconMaker.html', encoding='utf-8').read()

# 1. 修复: .data-theme="light" → [data-theme="light"]
t = t.replace('.data-theme="light"', '[data-theme="light"]')
print('1 fixed .data-theme="light"')

# 2. 检查所有 [data-theme 选择器是否正确闭合
import re
for m in re.finditer(r'\[data-theme[^\]]*\]', t):
    print('  OK:', m.group())

# 3. 再扫反引号平衡
scripts = re.findall(r'<script[^>]*>(.*?)</script>', t, re.DOTALL)
print(f'\nScript blocks: {len(scripts)}')
for i,s in enumerate(scripts):
    bt = s.count('`')
    sq = s.count("'")
    dq = s.count('"')
    print(f'  script{i}: backtick={bt}, single={sq}, double={dq}')

open('IconMaker.html', 'w', encoding='utf-8').write(t)
print('\nFIXED')
