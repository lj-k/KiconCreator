t = open('IconMaker.html', encoding='utf-8').read()

# 找 renderLineTabs 里的 FA UI 块（以 select 开头，区分 drawContent 里的 FA_MAP）
start_pattern = "} else if(line.mode==='fa'){\n      const sel=document.createElement('select')"
start = t.find(start_pattern)
print('1) FA UI block start:', start)
if start < 0:
    print('NOT FOUND - check pattern')
else:
    # 往后找 "    } else { // image"
    end_pattern = "    } else { // image"
    end = t.find(end_pattern, start)
    print('   FA UI block end (before image branch):', end)
    block = t[start:end]
    print('   Block length:', len(block))
    print('   Block head:', repr(block[:80]))
    print('   Block tail:', repr(block[-80:]))

# 找 drawContent 里的小 FA_MAP
import re
m = re.search(r"const FA_MAP=\{[^}]*fa-chess-king'[^}]*\};", t)
print('\n2) Small FA_MAP found:', m is not None)
if m:
    print('   Content:', repr(m.group()[:100]))

# 找 DEFAULTS 注释
anchor = "// ═══════ DEFAULTS ═══════"
idx = t.find(anchor)
print(f'\n3) DEFAULTS anchor line: {t[:idx].count(chr(10))+1}')
