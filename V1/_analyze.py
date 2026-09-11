import re
t = open('IconMaker.html', encoding='utf-8').read()
# DEFAULTS
m = re.search(r"  size:256.*?shapeInner:0,", t)
print('DEFAULTS:', m.group() if m else 'NOT FOUND')
# buildShapeChips
idx = t.find('function buildShapeChips')
print('\n===== buildShapeChips =====')
print(t[idx:idx+800])
# updateShapeToggles
idx2 = t.find('function updateShapeToggles')
print('\n===== updateShapeToggles =====')
print(t[idx2:idx2+400])
# HTML 外框 sec
idx3 = t.find('shapeChips')
sec_start = t.rfind('<div class="sec">', 0, idx3)
sec_end = t.find('<div class="sec">', sec_start+1)
print('\n===== OUTER SEC HTML =====')
print(t[sec_start:sec_end])
# bd-tabs 相关
idx4 = t.find('class="bd-tab')
print('\n===== bd-tabs area =====')
print(t[idx4-50:idx4+500])
# bd tab toggle bind
idx5 = t.find("bd-tab")
# find bind
idx6 = t.find("data-bd")
print('\n===== bd tab bind area =====')
print(t[idx6-200:idx6+300])
