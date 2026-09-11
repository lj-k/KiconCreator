t = open('IconMaker.html', encoding='utf-8').read()

# 1) 左栏完整
s = t.find('class="col"')
e = t.find('class="col"', s+1)
print('=== 左栏 HTML ===')
print(t[s:e][:4000])

# 2) 主题 CSS（亮色定义）
print('\n=== 亮色主题 CSS ===')
idx = t.find('明亮')
if idx > 0:
    print(t[idx-300:idx+3000])
else:
    # 搜索 theme-light 或 [data-theme]
    import re
    for m in re.finditer(r'\[data-theme.*?\{.*?\}', t, re.DOTALL):
        print(m.group()[:500])
    # 搜索主题切换
    for m in re.finditer(r'theme.*\{.*?\}', t, re.DOTALL):
        g = m.group()
        if '--' in g: print(g[:500])
