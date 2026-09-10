t = open('IconMaker.html', encoding='utf-8').read()

# 文件里实际是: ' 反斜杠 '
# Python repr 显示: "if(name.startsWith('\\')) return name;"
# 也就是字符串里有三个字符: ' \ '
# 我要改成四个字符: ' \\ '  (JS 里的 '\\')

idx = t.find("if(name.startsWith(")
print('context bytes:', [hex(ord(c)) for c in t[idx:idx+30]])

# 直接替换文件中 反斜杠+单引号 后面又接单引号 的情况
# 或更简单：直接替换 startsWith 这一行
old_line = "  if(name.startsWith('\\')) return name;"
new_line = "  if(name.charCodeAt(0)===0x266) return name;"
# 0x266 = 0xA6 = ¦ 不对。JS 里判断第一个字符如果是 unicode 转义序列开头（\u）太复杂
# 简单方案：删除这行（FA_MAP 已经覆盖所有图标了，FA_FALLBACK 不需要单独处理 unicode）
# 改成: 直接返回 '?' 或 FA_MAP 没找到就用 FA_FALLBACK 没找到就 '?'

# 替换整个 faGlyph 函数
old_func_start = t.find('function faGlyph(name){')
old_func_end = t.find('\n// ═══════ DEFAULTS', old_func_start)

new_faGlyph = """function faGlyph(name){
  if(!name) return '★';
  const key = name.startsWith('fa-') ? name : 'fa-'+name;
  if(FA_MAP && FA_MAP[key]) return FA_MAP[key];
  if(FA_FALLBACK && FA_FALLBACK[key]) return FA_FALLBACK[key];
  return '?';
}"""

t = t[:old_func_start] + new_faGlyph + t[old_func_end:]
open('IconMaker.html', 'w', encoding='utf-8').write(t)
print('faGlyph completely rewritten')

# 验证
print(t[t.find('function faGlyph'):t.find('function faGlyph')+250])
