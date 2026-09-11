t = open('IconMaker.html', encoding='utf-8').read()
lines = t.split('\n')

# 逐行扫描可疑字符：孤立反斜杠、非法 unicode、空字节、非 UTF-8 字符
issues = []
for i, line in enumerate(lines):
    # 孤立反斜杠检测：反斜杠后面不是合法转义字符
    j = 0
    while j < len(line):
        if line[j] == '\\':
            if j+1 < len(line):
                nxt = line[j+1]
                if nxt not in ['n','t','r','\\',"'",'"','0','b','f','v','x','u','$','\n']:
                    issues.append(f'L{i+1}: 可疑反斜杠 \\{nxt!r} at pos {j} -> {line[max(0,j-10):j+20]}')
            else:
                issues.append(f'L{i+1}: 行尾孤立反斜杠 at pos {j}')
        j += 1
    # 非打印字符检测
    for k, ch in enumerate(line):
        if ord(ch) < 32 and ch not in '\r\n\t':
            issues.append(f'L{i+1}: 控制字符 0x{ord(ch):02x} at pos {k}')

print(f'发现 {len(issues)} 个问题:')
for s in issues[:30]:
    print(' ', s)
