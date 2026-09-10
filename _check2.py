import re
t = open('IconMaker.html', encoding='utf-8').read()
scripts = re.findall(r'<script[^>]*>(.*?)</script>', t, re.DOTALL)
s = scripts[1]

# 括号定位
depth = 0
i = 0
n = len(s)
steps = []
while i < n:
    c = s[i]
    if c == '/' and i+1 < n and s[i+1] == '/':
        j = s.find('\n', i)
        if j < 0: break
        i = j + 1; continue
    if c == '/' and i+1 < n and s[i+1] == '*':
        j = s.find('*/', i+2)
        if j < 0: break
        i = j + 2; continue
    if c in ('"', "'", '`'):
        quote = c
        i += 1
        while i < n and s[i] != quote:
            if s[i] == '\\': i += 2; continue
            i += 1
        i += 1; continue
    old_d = depth
    if c == '(': depth += 1
    elif c == ')': depth -= 1
    if depth != old_d:
        line = s[:i].count('\n') + 1
        steps.append((line, old_d, depth, c, s[max(0,i-30):i+30].replace('\n',' ')))
    i += 1

print('=== Paren transitions ===')
for step in steps[-20:]:
    print(f'L{step[0]}: {step[1]}->{step[2]} [{step[3]}] ...{step[4]}')
print(f'\nfinal depth = {depth}')

# 找 depth 超过 1 的位置（非正常的）
print('\n=== First time depth reaches 2 ===')
for step in steps:
    if step[2] >= 2 and step[3] == '(':
        print(f'At line {step[0]}: depth -> {step[2]} ...{step[4]}')
        break
