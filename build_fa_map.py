import re, urllib.request
urllib.request.urlretrieve('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css','fa6.css')
t=open('fa6.css',encoding='utf-8').read()
icons=re.findall(r'\.fa-([a-z0-9-]+):before\{content:"\\([0-9a-f]{3,5})"\}',t)
print('total:',len(icons))
# 去重，取 Free 版本 (code 长度 4)
dic={}
for n,c in icons:
    if len(c) in (4,5) and n not in dic:
        dic[n] = c
print('unique:',len(dic))
# 写 JS map
lines=[]
for n,c in sorted(dic.items()):
    lines.append("  'fa-"+n+"':'\\u"+c.zfill(4)+"'")
js = 'const FA_MAP_ALL = {\n' + ',\n'.join(lines) + '\n};'
open('fa_map_out.js','w',encoding='utf-8').write(js)
print('written fa_map_out.js')
