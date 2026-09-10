"""
patch_v4_f.py —— 最后三项
1. content input 宽度固定 50%（CSS）
2. size tab 加 overflowVisible 选项
3. 简化版联动 checkbox：关键参数行末尾加 data-sync="..." checkbox
"""
t = open('IconMaker.html', encoding='utf-8').read()

# ─── 1. CSS: line-tab input 固定宽度 ───
# 找 .line-tab 或 .line-tabs CSS
idx = t.find('.line-tab')
print('line-tab idx:', idx)
# 找 .line-tabs { ... } 块
import re
m = re.search(r'\.line-tabs\s*\{[^}]*\}', t)
if m:
    css_line_tabs = m.group()
    print('line-tabs css:', css_line_tabs)
    # 在它后面加新规则
    extra = """
.line-tab{display:flex;align-items:center;gap:4px;padding:4px 6px;background:transparent;border-radius:4px;font-size:11px;cursor:pointer;transition:.12s;color:var(--text);white-space:nowrap}
.line-tab.active{background:rgba(70,140,230,.25);color:var(--accent);font-weight:600}
.line-tab > input[type="text"]{
  width:50%;min-width:60px;max-width:140px;flex-shrink:0;
  padding:3px 6px;border:1px solid var(--border);border-radius:4px;
  background:var(--bg-input);color:var(--text);font-size:11px;
  transition:border-color .12s;
}
.line-tab > input[type="text"]:focus{outline:none;border-color:var(--accent)}
"""
    t = t[:m.end()] + extra + t[m.end():]
    print('1 OK: line-tab input width CSS')
else:
    print('1 SKIP')

# ─── 2. renderStylePanel: size tab 加 overflowVisible ───
# 找 renderStylePanel 函数，size tab 渲染部分
idx2 = t.find("_curStyleTab==='size'")
print('size tab idx:', idx2)
if idx2 > 0:
    # 找到 size tab 渲染块结束处（else if 或 }）
    end = t.find("\n  } else if(", idx2)
    if end < 0: end = t.find("\n  }", idx2)
    old_size_block = t[idx2:end]
    print('OLD SIZE BLOCK LEN:', len(old_size_block))
    # 在末尾（end 前）插入 overflowVisible
    ov_html = """
    // Bug7: 超出边框是否显示
    add(`<div class="form-row"><div class="lbl">超出显示</div>
      <label class="check"><input type="checkbox" id="ovShow"><span>允许内容超出边框</span></label>
    </div>`);
    on('ovShow','change',e=>{
      S.lines[S.currentLine].overflow=S.lines[S.currentLine].overflow||{};
      S.lines[S.currentLine].overflow.show=e.target.checked;
      draw();
    });
    if(S.lines[S.currentLine].overflow&&S.lines[S.currentLine].overflow.show)on('ovShow')&&($('ovShow').checked=true);
"""
    # 在 end 处插入
    t = t[:end] + ov_html + t[end:]
    print('2 OK: overflowVisible added')
else:
    print('2 SKIP')

# ─── 3. DEFAULTS: newLine() 加 overflow 默认 ───
# 找 newLine() 函数
idx3 = t.find('function newLine')
print('newLine idx:', idx3)
if idx3 > 0:
    brace=0; end3=idx3
    for i in range(idx3, len(t)):
        if t[i]=='{': brace+=1
        elif t[i]=='}':
            brace-=1
            if brace==0: end3=i+1; break
    old_nl = t[idx3:end3]
    # 在 return 对象里加 overflow 默认
    old_return = "'overflowVisible':false" 
    if old_return in old_nl:
        print('3 SKIP: overflowVisible already in newLine')
    else:
        # 找到 newLine return 的最后一个属性，在后面加
        # 简化：找 faHOffset 或 imgHOffset 之类的结束位置
        if "'overflow'" not in old_nl:
            # 在结尾 } 前加
            new_nl = old_nl.replace("}", ",overflow:{show:false}}", 1)
            t = t[:idx3] + new_nl + t[end3:]
            print('3 OK: newLine overflow default')
        else:
            print('3 SKIP: overflow already')

open('IconMaker.html','w',encoding='utf-8').write(t)
print('v4_f done')
