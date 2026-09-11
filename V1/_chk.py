import re, subprocess, sys

t = open('IconMaker.html', encoding='utf-8').read()
m = re.search(r'<script[^>]*>(.*?)</script>', t, re.DOTALL)
s = m.group(1) if m else ''

# 写临时 js 文件让 node 检查
with open('_tmp_check.js', 'w', encoding='utf-8') as f:
    f.write(s)

try:
    result = subprocess.run(['node', '--check', '_tmp_check.js'],
                          capture_output=True, text=True, timeout=15)
    print('STDOUT:', result.stdout[:500])
    print('STDERR:', result.stderr[:1000])
    print('RC:', result.returncode)
except Exception as e:
    print('node 不可用:', e)

# 反引号平衡
bt = s.count('`')
print(f'反引号总数: {bt}  (应该是偶数)')
if bt % 2 != 0:
    # 找奇数位的反引号位置
    positions = [i for i,c in enumerate(s) if c=='`']
    for i,pos in enumerate(positions):
        if i % 2 != 0:
            line_num = s[:pos].count('\n') + 1
            print(f'*** 未闭合反引号 at L{line_num}: ...{s[pos-20:pos+20]}...')

# 模板字符串内的反引号也需要正确嵌套
# 快速扫：找反引号不在字符串内的可疑模式
lines = s.split('\n')
for i, line in enumerate(lines):
    # 孤立反引号
    c = line.count('`')
    if c % 2 != 0:
        print(f'行 {i+1} 反引号不平衡 ({c}): {line[:80]}')
