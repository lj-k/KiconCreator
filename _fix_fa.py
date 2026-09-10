import re
t = open('IconMaker.html', encoding='utf-8').read()

# 把 FA_FALLBACK 里的错误 unicode 转义修正
# patch_v4_e 里用了 '\\f005' 但 Python 把 \\f 变成了 \f（换页符）
# 正确写法应该在 JS 里是 '\uf005'
# 搜索所有形如 'XXfDDDD' 的（其中 XX 是 \ 和某个字母）

# 检查实际是什么
idx_fb = t.find('const FA_FALLBACK')
print('FA_FALLBACK 开头:', t[idx_fb:idx_fb+200])

# 方案：直接替换整个 FA_FALLBACK 块（更干净）
# 找到 FA_FALLBACK 定义的开始和结束
start = t.find('const FA_FALLBACK={')
if start < 0:
    start = t.find('const FA_FALLBACK = {')
end = t.find('};', start) + 2
print(f'FA_FALLBACK block: {start}-{end}')

correct_fallback = r'''const FA_FALLBACK={
  'fa-star':'\uf005','fa-heart':'\uf004','fa-home':'\uf015','fa-user':'\uf007',
  'fa-check':'\uf00c','fa-xmark':'\uf00d','fa-plus':'\uf067','fa-minus':'\uf068',
  'fa-cog':'\uf013','fa-gear':'\uf013','fa-pencil':'\uf040','fa-trash':'\uf2ed',
  'fa-folder':'\uf07b','fa-file':'\uf15b','fa-image':'\uf03e','fa-music':'\uf001',
  'fa-camera':'\uf030','fa-video':'\uf03d','fa-phone':'\uf095','fa-envelope':'\uf0e0',
  'fa-globe':'\uf0ac','fa-cloud':'\uf0c2','fa-bolt':'\uf0e7','fa-fire':'\uf06d',
  'fa-leaf':'\uf06c','fa-moon':'\uf186','fa-sun':'\uf185','fa-umbrella':'\uf0e9',
  'fa-car':'\uf1b9','fa-plane':'\uf072','fa-rocket':'\uf135','fa-gift':'\uf06b',
  'fa-bell':'\uf0f3','fa-calendar':'\uf133','fa-clock':'\uf017','fa-tv':'\uf26c',
  'fa-headphones':'\uf025','fa-microphone':'\uf130','fa-comment':'\uf075','fa-share':'\uf064',
  'fa-download':'\uf019','fa-upload':'\uf093','fa-link':'\uf0c1','fa-search':'\uf002',
  'fa-lock':'\uf023','fa-unlock':'\uf09c','fa-key':'\uf084','fa-wifi':'\uf1eb',
  'fa-signal':'\uf012','fa-battery-full':'\uf240','fa-bolt-lightning':'\uf0e7',
  'fa-heart-crack':'\uf7a9','fa-face-smile':'\uf118','fa-face-frown':'\uf119',
  'fa-flag':'\uf024','fa-bug':'\uf188','fa-code':'\uf121','fa-terminal':'\uf120',
  'fa-database':'\uf1c0','fa-server':'\uf233','fa-memory':'\uf538',
  'fa-robot':'\uf544','fa-shield':'\uf132','fa-circle-check':'\uf58e',
  'fa-circle-xmark':'\uf057','fa-triangle-exclamation':'\uf071'
};'''

t = t[:start] + correct_fallback + t[end:]

# 同样修复 faGlyph 里的 '\\' 判断 —— 把 startsWith('\\') 改成 startsWith('\u')
t = t.replace("if(name.startsWith('\\\\')) return name;",
              "if(name.charCodeAt(0)===0x266 || name.startsWith('\\u')) return name;",
              1)

open('IconMaker.html', 'w', encoding='utf-8').write(t)
print('FA_FALLBACK FIXED')
print('验证 startsWith:', t.find("startsWith('\\\\u')"), t.find("charCodeAt(0)===0x266"))
