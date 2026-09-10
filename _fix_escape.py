t = open('IconMaker.html', encoding='utf-8').read()

# faGlyph 里孤立反斜杠修复
# 文件里实际内容是: if(name.startsWith('\')) return name;
# 我们要改成: if(name.startsWith('\\')) return name;
old_bad = "if(name.startsWith('\\')) return name;"  # 这是单引号 + 反斜杠 + 单引号
# 用字节级替换
idx = t.find("if(name.startsWith")
print('startsWith idx:', idx)
print('context:', repr(t[idx:idx+50]))

# 直接用字符串替换 —— 找到孤立反斜杠在单引号里的情况
import re
# 匹配 startsWith('\') 这种（单引号里只有一个反斜杠）
t2 = re.sub(r"startsWith\('\\\\'\)", "startsWith('\\\\\\\\')", t)
print(f'result diff: {len(t2)-len(t)}')

open('IconMaker.html', 'w', encoding='utf-8').write(t2)

# 验证
idx2 = t2.find('function faGlyph')
print('FIXED faGlyph:')
print(t2[idx2:idx2+200])
