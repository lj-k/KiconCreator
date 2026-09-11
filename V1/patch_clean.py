"""Clean patch v2 - uses index-based slicing for safety"""
import re

t = open('IconMaker.html', encoding='utf-8').read()
bigmap = open('fa_map_out.js', encoding='utf-8').read()
bigmap = bigmap.replace('const FA_MAP_ALL =', 'const FA_MAP =')

# ═══ Step 1: 插 FA_MAP 到 DEFAULTS 之前 ═══
anchor = "// ═══════ DEFAULTS ═══════"
idx = t.find(anchor)
assert idx > 0
t = t[:idx] + bigmap + '\n\n' + t[idx:]
print('Step 1 OK, FA_MAP inserted')

# ═══ Step 2: 删 drawContent 里的小 FA_MAP (整行) ═══
# 先找它：正则从 "const FA_MAP={" 到本行结束
m = re.search(r"const FA_MAP=\{[^}]*fa-chess-king'[^}]*\};", t)
assert m, 'small FA_MAP not found'
t = t[:m.start()] + t[m.end()+1:]  # +1 跳过换行
print('Step 2 OK, small FA_MAP removed')

# ═══ Step 3: 替换 renderLineTabs 里的 FA UI ═══
start_pat = "} else if(line.mode==='fa'){\n      const sel=document.createElement('select')"
start = t.find(start_pat)
assert start > 0, 'FA UI start not found'
# 找对应的 "    } else { // image"
end_pat = "    } else { // image"
end = t.find(end_pat, start)
assert end > 0, 'image branch not found after FA UI'
print(f'Step 3: replacing chars [{start}:{end}]')

new_fa_ui = """    } else if(line.mode==='fa'){
      // 全 FA Free 图标内置 ~1834 个：搜索框 + 网格选择器
      const wrap=document.createElement('div');wrap.className='fa-picker';
      const search=document.createElement('input');search.type='text';search.placeholder='\\ud83d\\udd0d 搜索图标 (star/car/heart...)';search.className='fa-search';
      const grid=document.createElement('div');grid.className='fa-grid';
      const more=document.createElement('div');more.className='fa-more';
      wrap.appendChild(search);wrap.appendChild(grid);wrap.appendChild(more);
      tab.appendChild(wrap);
      const ALL_ICONS=Object.keys(FA_MAP).sort();
      let _curSel=line.faIcon;
      const renderGrid=(kw)=>{
        grid.innerHTML='';
        let items=ALL_ICONS;
        if(kw){const k=kw.toLowerCase();items=items.filter(n=>n.includes(k)||n.replace('fa-','').includes(k));}
        const MAX=kw?240:120;
        items.slice(0,MAX).forEach(n=>{
          const d=document.createElement('div');d.className='fa-item'+(n===_curSel?' sel':'');
          d.title=n;d.innerHTML='<i class=\"fa-solid '+n+'\"></i>';
          d.onclick=()=>{_curSel=n;S.lines[i].faIcon=n;renderGrid(search.value);draw();};
          grid.appendChild(d);
        });
        more.textContent=items.length>MAX?'共'+items.length+'个，显示前'+MAX:'共'+items.length+'个';
      };
      search.addEventListener('input',e=>renderGrid(e.target.value));
      renderGrid('');
"""

t = t[:start] + new_fa_ui + t[end:]
print('Step 3 OK, FA UI replaced')

# ═══ Step 4: 加 CSS 样式 ═══
css_anchor = ".line-tab input::placeholder{color:var(--text-muted)}"
css_idx = t.find(css_anchor)
assert css_idx > 0, 'css anchor not found'
css_insert = css_anchor + """
/* FA 图标选择器 */
.fa-picker{display:flex;flex-direction:column;gap:4px}
.fa-search{width:100%;padding:5px 8px;border-radius:6px;border:1px solid var(--border-strong);background:var(--bg-input);color:var(--text);font-size:11px;outline:none;box-sizing:border-box}
.fa-search:focus{border-color:var(--accent)}
.fa-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(26px,1fr));gap:3px;max-height:180px;overflow-y:auto;padding:4px;background:var(--bg-rail);border-radius:6px}
.fa-item{display:flex;align-items:center;justify-content:center;height:26px;border-radius:4px;cursor:pointer;color:var(--text-sub);font-size:13px;transition:.1s;border:1px solid transparent}
.fa-item:hover{background:var(--bg-input);color:var(--accent)}
.fa-item.sel{background:var(--accent-bg);color:var(--accent);border-color:var(--accent)}
.fa-more{font-size:10px;color:var(--text-muted);text-align:center;padding:2px}"""
t = t[:css_idx] + css_insert + t[css_idx+len(css_anchor):]
print('Step 4 OK, CSS added')

open('IconMaker.html','w',encoding='utf-8').write(t)
print(f'\nDONE. Final size: {len(t)} bytes')
