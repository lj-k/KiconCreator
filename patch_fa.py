import re
t = open('IconMaker.html', encoding='utf-8').read()

# 1) 替换 drawContent 内的 FA_MAP
old_map_m = re.search(r"const FA_MAP=\{.*?\};", t, re.DOTALL)
print('FA_MAP found:', bool(old_map_m))
print('FA_MAP len:', len(old_map_m.group()) if old_map_m else 0)

# 读新的大 FA_MAP
new_map = open('fa_map_out.js', encoding='utf-8').read()  # const FA_MAP_ALL = {...}
# 把常量名改成 FA_MAP
new_map = new_map.replace('const FA_MAP_ALL =', 'const FA_MAP')
print('new FA_MAP len:', len(new_map))

if old_map_m:
    t = t[:old_map_m.start()] + new_map + t[old_map_m.end():]
    print('replaced FA_MAP in drawContent')

# 2) 替换 FA_LIST 分类 —— 用所有图标 + 搜索框 + 滚动列表
old_list_m = re.search(r"const FA_LIST=\[.*?\];", t, re.DOTALL)
print('FA_LIST found:', bool(old_list_m))
if old_list_m:
    print('FA_LIST snippet:', old_list_m.group()[:150])

open('IconMaker.html','w',encoding='utf-8').write(t)
print('saved intermediate')
