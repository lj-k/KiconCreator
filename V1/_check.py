import re
t = open('IconMaker.html', encoding='utf-8').read()
scripts = re.findall(r'<script[^>]*>(.*?)</script>', t, re.DOTALL)
s = scripts[1]
depth = 0
i = 0
n = len(s)
first_neg = None
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
    if c == '(': depth += 1
    elif c == ')': depth -= 1
    if depth < 0 and first_neg is None:
        line = s[:i].count('\n') + 1
        col = i - s.rfind('\n', 0, i)
        print(f'FIRST NEGATIVE depth={depth} at script line {line}, col {col}')
        start = max(0, i-80); end = min(n, i+40)
        print(f'context: ...{repr(s[start:end])}')
        first_neg = (line, col, i)
    i += 1
print(f'final depth = {depth}')

# 也用同样方法查大括号平衡
depth2 = 0
i = 0
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
    if c == '{': depth2 += 1
    elif c == '}': depth2 -= 1
    i += 1
print(f'final brace depth = {depth2}')
