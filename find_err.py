import re
t = open('IconMaker.html',encoding='utf-8').read()
ms = list(re.finditer(r'<script[^>]*>([\s\S]*?)</script>',t))
big = max(ms,key=lambda m:len(m.group(1))).group(1)

# 逐段二分找第一个错
import subprocess, tempfile, os
# 用 node 不行... 用简单方法：逐加行数直到失败
lines = big.split('\n')
ok_lines = 0
fail_at = len(lines)
for step in [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1]:
    lo, hi = ok_lines, fail_at
    # 用二分
    while lo < hi:
        mid = (lo + hi + 1) // 2
        chunk = '\n'.join(lines[:mid]) + '\n'
        # 写临时文件，用 python exec... 不行这是 JS
        # 用浏览器？太慢
        # 用简单括号平衡检查先做粗筛
        opens = chunk.count('{') - chunk.count('}')
        parens = chunk.count('(') - chunk.count(')')
        brackets = chunk.count('[') - chunk.count(']')
        # 这只是启发式
        if opens < 0 or parens < 0 or brackets < 0:
            hi = mid - 1
        else:
            lo = mid
    ok_lines = lo
    print(f'step {step}: ok up to line {ok_lines}')

print(f'\nFirst syntax issue near line ~{ok_lines+1}')
print('Context:')
for i in range(max(0,ok_lines-5), min(len(lines), ok_lines+10)):
    mark = '>>>' if i == ok_lines else '   '
    print(f'{mark} {i+1}: {lines[i][:150]}')
