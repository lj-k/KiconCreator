"""对 4 项可疑未通过项做精查"""
t = open('IconMaker.html', encoding='utf-8').read()

print('━━━ 1) 最多4行 ━━━')
# 搜所有 lineCount 相关
import re
for m in re.finditer(r'.{0,30}lineCount.{0,30}', t):
    print(' ', repr(m.group()))

print('\n━━━ 2) 形状参数 ━━━')
for kw in ['sides', 'polygon', 'star', 'shape', 'radius', 'angle']:
    c = t.count(kw)
    print(f'  {kw}: {c} 次')

print('\n━━━ 3) 边框 ━━━')
for kw in ['border', 'stroke', 'outline']:
    c = t.count(kw)
    print(f'  {kw}: {c} 次')

print('\n━━━ 4) 分段模式 ━━━')
for kw in ['segment.mode', 'newSegment', 'mode:solid', 'mode:gradient', 'mode:image', 'segments']:
    c = t.count(kw)
    print(f'  {kw}: {c} 次')

print('\n━━━ 随机抽样确认 ━━━')
# 搜 lineCount 附近上下文
idx = t.find('lineCount')
if idx > 0:
    print('lineCount context:', repr(t[idx-80:idx+120]))

idx2 = t.find('newSegment')
if idx2 > 0:
    print('newSegment context:', repr(t[idx2-30:idx2+100]))
