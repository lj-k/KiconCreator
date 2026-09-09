import re
t = open('IconMaker.html',encoding='utf-8').read()
idx1 = t.find('const FA_MAP = {')
idx2 = t.find('};', idx1)
chunk = t[idx1:idx2+2]

print('chunk length:', len(chunk))
print('open {:', chunk.count('{'))
print('close }:', chunk.count('}'))
print('total fa entries:', chunk.count("'fa-"))

# 查有没有未转义的单引号在 value 里 (value 都是 \uXXXX 应该没事)
# 查非法 Unicode 转义
bad = re.findall(r"\\u[0-9a-fA-F]{0,3}([0-9a-fA-F])?", chunk)
print('unicode-escape fragments:', len(bad))

# 查前3个和后3个 entry 的正确性
entries = re.findall(r"'(fa-[^']+)':\s*'([^']+)'", chunk)
print('regex-matched entries:', len(entries))
if entries:
    print('first:', entries[0])
    print('last:', entries[-1])

# 有没有空 key
empty_keys = [e for e in entries if not e[0]]
print('empty keys:', empty_keys[:3])

# 有没有 key 不含 fa-
bad_keys = [e for e in entries if not e[0].startswith('fa-')]
print('non-fa keys:', bad_keys[:3])
