"""
需求 1 + 2 补丁：
- renderLineTabs: fa/image tab 简化为只展示信息
- STYLE_TABS 按新定义改
- renderStylePanel: 新增图标/上传/尺寸 独立标签内容
"""
import re

t = open('IconMaker.html', encoding='utf-8').read()

# ════ PATCH 1: renderLineTabs 的 fa 分支 —— 简化为只展示 ════
# 找到 "    } else if(line.mode==='fa'){" 后跟 fa-picker 的那个块
old_fa_tab = """        } else if(line.mode==='fa'){
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
      renderGrid('');"""

new_fa_tab = """        } else if(line.mode==='fa'){
      // 仅展示当前图标（选择功能移到样式面板的"图标"标签）
      const preview=document.createElement('span');preview.className='fa-icn-only';
      preview.innerHTML='<i class=\"fa-solid '+(line.faIcon||'fa-star')+'\"></i> <small>'+(line.faIcon||'fa-star').replace('fa-','')+'</small>';
      tab.appendChild(preview);"""

assert old_fa_tab in t, 'old_fa_tab not found!'
t = t.replace(old_fa_tab, new_fa_tab, 1)
print('✅ Patch 1: fa tab simplified')

# ════ PATCH 2: renderLineTabs 的 image 分支 —— 简化为只展示 ════
old_img_tab = """    } else { // image
      const lbl=document.createElement('label');lbl.className='btn btn-sm';lbl.style.padding='3px 5px';
      lbl.innerHTML=line.imgUrl?'<i class="fa-solid fa-image"></i>':'<i class="fa-solid fa-cloud-arrow-up"></i>';
      const inp=document.createElement('input');inp.type='file';inp.accept='image/png,image/svg+xml';inp.style.display='none';
      inp.addEventListener('change',e=>{if(e.target.files[0]){const r=new FileReader();r.onload=ev=>{S.lines[i].imgUrl=ev.target.result;draw();lbl.innerHTML='<i class="fa-solid fa-image"></i>';};r.readAsDataURL(e.target.files[0]);}});
      lbl.appendChild(inp);
      tab.appendChild(lbl);"""

new_img_tab = """    } else { // image — 仅展示（上传功能移到样式面板的"上传"标签）
      const s=document.createElement('span');s.className='img-status';
      if(line.imgUrl){s.innerHTML='<i class=\"fa-solid fa-image\"></i> <small>已上传</small>';}
      else{s.innerHTML='<i class=\"fa-solid fa-cloud-arrow-up\"></i> <small>未上传</small>';}
      tab.appendChild(s);"""

assert old_img_tab in t, 'old_img_tab not found!'
t = t.replace(old_img_tab, new_img_tab, 1)
print('✅ Patch 2: image tab simplified')

# ════ PATCH 3: STYLE_TABS 重定义 ════
old_STYLE_TABS = """const STYLE_TABS={
  text:[['font','字体'],['app','外观'],['fill','填充'],['shadow','阴影']],
  fa:[['app','尺寸+颜色'],['shadow','阴影']],
  image:[['app','尺寸+位置'],['shadow','阴影']]
};"""

new_STYLE_TABS = """const STYLE_TABS={
  text:[['font','字体'],['size','尺寸'],['fill','填充'],['shadow','阴影']],
  fa:[['faicon','图标'],['shadow','阴影'],['size','尺寸']],
  image:[['upload','上传'],['shadow','阴影'],['size','尺寸']]
};"""

assert old_STYLE_TABS in t, 'old STYLE_TABS not found!'
t = t.replace(old_STYLE_TABS, new_STYLE_TABS, 1)
print('✅ Patch 3: STYLE_TABS redefined')

# ════ PATCH 4: renderStylePanel —— 替换 fa 和 image 分支内容 ════
# 先替换 fa 的 app 分支（尺寸+颜色）→ 拆成 faicon 和 size
old_fa_app = """  } else if(l.mode==='fa' && _curStyleTab==='app'){
    add(`<div class="form-row"><div class="lbl">颜色</div><input type="color" id="faC" value="${l.faColor||'#fff'}"></div>`);
    add(`<div class="form-row"><div class="lbl">大小</div><input type="range" id="faS" min="15" max="120" value="${l.faSize||65}"><span class="v" id="faSV">${l.faSize||65}%</span></div>`);"""

# 替换 image 的 app 分支（尺寸+位置）→ 拆成 upload 和 size
old_img_app = """  } else if(l.mode==='image' && _curStyleTab==='app'){
    add(`<div class="form-row"><div class="lbl">缩放</div><input type="range" id="imgSc" min="20" max="300" value="${l.imgScale||100}"><span class="v" id="imgScV">${l.imgScale||100}%</span></div>`);
    add(`<div class="form-row"><div class="lbl">位置</div><select id="imgPs"><option value="center">居中</option><option value="cover">填满</option><option value="top">顶部</option><option value="bottom">底部</option></select></div>`);"""

# 改成：text app 留颜色、fa 新增 faicon 和 size、image 新增 upload 和 size
new_fa_and_img_panels = """  } else if(l.mode==='fa' && _curStyleTab==='faicon'){
    // 图标选择：搜索 + 网格 + 当前颜色
    add(`<div class="form-row"><div class="lbl">颜色</div><input type="color" id="faC" value="${l.faColor||'#fff'}"></div>`);
    add(`<div class=\"form-row\" style=\"flex-direction:column;gap:4px\"><div class=\"lbl\" style=\"margin-bottom:2px\">选择图标</div><input type=\"text\" id=\"faSr\" placeholder=\"🔍 搜索 FA 图标...\" style=\"padding:5px 8px;border-radius:6px;border:1px solid var(--border-strong);background:var(--bg-input);color:var(--text);font-size:12px;outline:none\"><div id=\"faGr\" style=\"max-height:180px;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(26px,1fr));gap:3px;padding:4px;background:var(--bg-rail);border-radius:6px\"></div><div id=\"faMore\" style=\"font-size:10px;color:var(--text-muted);text-align:center\"></div></div>`);
  } else if(l.mode==='fa' && _curStyleTab==='size'){
    add(`<div class="form-row"><div class="lbl">大小</div><input type="range" id="faS" min="15" max="120" value="${l.faSize||65}"><span class="v" id="faSV">${l.faSize||65}%</span></div>`);
    add(`<div class="form-row"><div class="lbl">横向偏移</div><input type="range" id="faHOf" min="-60" max="60" value="${l.hOffset}"><span class="v">${l.hOffset}</span></div>`);
    add(`<div class="form-row"><div class="lbl">纵向偏移</div><input type="range" id="faVOf" min="-60" max="60" value="${l.vOffset}"><span class="v">${l.vOffset}</span></div>`);
  } else if(l.mode==='image' && _curStyleTab==='upload'){
    // 上传 + 预览 + 清除
    add(`<div class=\"form-row\" style=\"flex-direction:column;align-items:flex-start;gap:6px\"><div id=\"imgPr\" style=\"width:100%;max-height:100px;border:1px dashed var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;background:var(--bg-rail);overflow:hidden\">${l.imgUrl?'<img src=\"'+l.imgUrl+'\" style=\"max-height:100px;max-width:100%\">':'<span style=\"color:var(--text-muted);font-size:11px\">暂无图片</span>'}</div><div style=\"display:flex;gap:6px\"><label class=\"btn btn-sm\" style=\"padding:4px 10px\"><i class=\"fa-solid fa-cloud-arrow-up\"></i> 上传<input type=\"file\" id=\"fileUp\" accept=\"image/png,image/svg+xml,image/jpeg\" style=\"display:none\"></label>${l.imgUrl?'<button class=\"btn btn-sm\" id=\"imgClr\" style=\"padding:4px 10px\"><i class=\"fa-solid fa-trash\"></i> 清除</button>':''}</div></div>`);
  } else if(l.mode==='image' && _curStyleTab==='size'){
    add(`<div class="form-row"><div class="lbl">缩放</div><input type="range" id="imgSc" min="20" max="300" value="${l.imgScale||100}"><span class="v" id="imgScV">${l.imgScale||100}%</span></div>`);
    add(`<div class="form-row"><div class="lbl">位置</div><select id="imgPs"><option value="center">居中</option><option value="cover">填满</option><option value="top">顶部</option><option value="bottom">底部</option></select></div>`);
    add(`<div class="form-row"><div class="lbl">横向偏移</div><input type="range" id="imgHOf" min="-60" max="60" value="${l.hOffset}"><span class="v">${l.hOffset}</span></div>`);
    add(`<div class="form-row"><div class="lbl">纵向偏移</div><input type="range" id="imgVOf" min="-60" max="60" value="${l.vOffset}"><span class="v">${l.vOffset}</span></div>`);"""

# 先替换 fa app
assert old_fa_app in t, 'old fa_app not found!'
t = t.replace(old_fa_app, new_fa_and_img_panels.split('  } else if(l.mode===\'fa\' && _curStyleTab===\'faicon\'){')[1].split('  } else if(l.mode===\'fa\' && _curStyleTab==='shadow')')[0] + '  } else if(l.mode===\'fa\' && _curStyleTab===\'shadow\')' + t[t.find('  } else if(l.mode===\'fa\' && _curStyleTab===\'shadow\')'):], 1)

print('⚠️ Patch 4 需要手动精细处理')

# 直接保存中间结果调试
open('IconMaker.html','w',encoding='utf-8').write(t)
print('interim saved')
