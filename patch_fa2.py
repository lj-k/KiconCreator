import re
t = open('IconMaker.html', encoding='utf-8').read()

old_start = "    } else if(line.mode==='fa'){\n"
# 找到它
idx = t.find(old_start)
print('start idx:', idx)

# 结束在 "    } else { // image"
end_marker = "    } else { // image"
end_idx = t.find(end_marker, idx)
print('end idx:', end_idx)

# 新代码块
new_block = '''    } else if(line.mode==='fa'){
      // 搜索框 + 图标网格（全 FA Free 图标内置 ~1800 个）
      const wrap=document.createElement('div');wrap.className='fa-picker';
      const search=document.createElement('input');search.type='text';search.placeholder='🔍 搜索图标 (star/car/heart...)';search.className='fa-search';
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
          d.title=n;d.innerHTML='<i class="fa-solid '+n+'"></i>';
          d.onclick=()=>{_curSel=n;S.lines[i].faIcon=n;renderGrid(search.value);draw();};
          grid.appendChild(d);
        });
        more.textContent=items.length>MAX?'共'+items.length+'个，显示前'+MAX:'共'+items.length+'个';
      };
      search.addEventListener('input',e=>renderGrid(e.target.value));
      renderGrid('');
'''

t = t[:idx] + new_block + t[end_idx:]
open('IconMaker.html','w',encoding='utf-8').write(t)
print('done')
