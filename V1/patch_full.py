"""
全量一步到位 Patch v2：
  Phase 1: FA 全量图标（删小字典 + 插大字典）
  Phase 2: UI 重构 —— tab 简化 + STYLE_TABS + style panel 新分支 + 新 bind
"""
import re

t = open('IconMaker.html', encoding='utf-8').read()
bigmap = open('fa_map_out.js', encoding='utf-8').read().replace('const FA_MAP_ALL =', 'const FA_MAP =')

# ═══════════════════ PHASE 1: FA 全量图标 ═══════════════════

# 1b. 删 drawContent 里的小 FA_MAP（精确锚点：后面紧跟 glyph）
idx = t.find("const glyph=FA_MAP[line.faIcon]"); assert idx > 0
fs = t.rfind("const FA_MAP={", 0, idx); assert fs > 0
fend = t.find('};', fs) + 2
t = t[:fs] + t[fend:]
print('1b OK: small FA_MAP removed')

# 1a. 全局 FA_MAP 插 DEFAULTS 之前
anchor = "// ═══════ DEFAULTS ═══════"
idx = t.find(anchor); assert idx > 0
t = t[:idx] + bigmap + '\n\n' + t[idx:]
print('1a OK: FA_MAP inserted')

# ═══════════════════ PHASE 2a: renderLineTabs fa 分支简化展示 ═══════════════════
start_pat = "} else if(line.mode==='fa'){\n      const sel=document.createElement('select')"
start = t.find(start_pat); assert start > 0
end_pat = "    } else { // image"
end = t.find(end_pat, start); assert end > 0

new_fa_display = """    } else if(line.mode==='fa'){
      // 仅展示当前图标（选择功能移到样式面板的"图标"标签）
      const icon=line.faIcon||'fa-star';
      const box=document.createElement('div');box.style.cssText='display:flex;align-items:center;gap:4px;color:var(--text-sub)';
      box.innerHTML='<i class=\"fa-solid '+icon+'\"></i><small style=\"color:var(--text-muted);font-size:10px\">'+icon.replace('fa-','')+'</small>';
      tab.appendChild(box);
"""
t = t[:start] + new_fa_display + t[end:]
print('2a OK: fa tab simplified')

# ═══════════════════ PHASE 2b: renderLineTabs image 分支简化展示 ═══════════════════
old_img = """    } else { // image
      const lbl=document.createElement('label');lbl.className='btn btn-sm';lbl.style.padding='3px 5px';
      lbl.innerHTML=line.imgUrl?'<i class="fa-solid fa-image"></i>':'<i class="fa-solid fa-cloud-arrow-up"></i>';
      const inp=document.createElement('input');inp.type='file';inp.accept='image/png,image/svg+xml';inp.style.display='none';
      inp.addEventListener('change',e=>{if(e.target.files[0]){const r=new FileReader();r.onload=ev=>{S.lines[i].imgUrl=ev.target.result;draw();lbl.innerHTML='<i class="fa-solid fa-image"></i>';};r.readAsDataURL(e.target.files[0]);}});
      lbl.appendChild(inp);
      tab.appendChild(lbl);"""

new_img_display = """    } else { // image —— 仅展示（上传功能移到样式面板的"上传"标签）
      const hasImg=!!line.imgUrl;
      const box=document.createElement('div');box.style.cssText='display:flex;align-items:center;gap:4px;color:var(--text-sub)';
      box.innerHTML='<i class=\"fa-solid '+(hasImg?'fa-image':'fa-cloud-arrow-up')+'\"></i><small style=\"color:var(--text-muted);font-size:10px\">'+(hasImg?'已上传':'未上传')+'</small>';
      tab.appendChild(box);"""
assert old_img in t, 'old img block not found'
t = t.replace(old_img, new_img_display, 1)
print('2b OK: image tab simplified')

# ═══════════════════ PHASE 2c: STYLE_TABS 重定义 ═══════════════════
old_st = """const STYLE_TABS={
  text:[['font','字体'],['app','外观'],['fill','填充'],['shadow','阴影']],
  fa:[['app','尺寸+颜色'],['shadow','阴影']],
  image:[['app','尺寸+位置'],['shadow','阴影']]
};"""

new_st = """const STYLE_TABS={
  text:[['font','字体'],['fill','颜色'],['size','尺寸'],['shadow','阴影']],
  fa:[['faicon','图标'],['size','尺寸'],['shadow','阴影']],
  image:[['upload','上传'],['size','尺寸'],['shadow','阴影']]
};"""
assert old_st in t
t = t.replace(old_st, new_st, 1)
print('2c OK: STYLE_TABS')

# ═══════════════════ PHASE 2d: text panel —— 拆 app → fill + size ═══════════════════
old_text_app_fill = """  } else if(l.mode==='text' && _curStyleTab==='app'){
    add(`<div class="form-row"><div class="lbl">颜色</div><input type="color" id="tc" value="${l.color}"></div>`);
    addSuggestTextColor(l.color);
    add(`<div class="form-row"><div class="lbl">大小</div><input type="range" id="ts" min="15" max="120" value="${l.size}"><span class="v" id="tsV">${l.size}%</span></div>`);
    add(`<div class="form-row"><div class="lbl">水平拉伸</div><input type="range" id="hSt" min="50" max="300" value="${l.hStretch}"><span class="v" id="hStV">${l.hStretch}%</span></div>`);
    add(`<div class="form-row"><div class="lbl">垂直拉伸</div><input type="range" id="vSt" min="50" max="500" value="${l.vStretch}"><span class="v" id="vStV">${l.vStretch}%</span></div>`);
    add(`<div class="form-row"><div class="lbl">横向偏移</div><input type="range" id="hOf" min="-60" max="60" value="${l.hOffset}"><span class="v" id="hOfV">${l.hOffset}</span></div>`);
    add(`<div class="form-row"><div class="lbl">纵向偏移</div><input type="range" id="vOf" min="-60" max="60" value="${l.vOffset}"><span class="v" id="vOfV">${l.vOffset}</span></div>`);
  } else if(l.mode==='text' && _curStyleTab==='fill'){
    add(`<div class="chip-row" style="margin-bottom:4px"><div class="chip ${l.fillMode==='solid'?'active':''}" data-fm="solid">单色</div><div class="chip ${l.fillMode==='gradient'?'active':''}" data-fm="gradient">渐变</div></div>`);
    if(l.fillMode==='solid'){
      add(`<div class="form-row"><div class="lbl">颜色</div><input type="color" id="tc" value="${l.color}"></div>`);
      addSuggestTextColor(l.color);
    } else {
      add(`<div class="form-row"><div class="lbl">起始</div><input type="color" id="tc1" value="${l.fillGradS}"></div>`);
      add(`<div class="form-row"><div class="lbl">终止</div><input type="color" id="tc2" value="${l.fillGradE}"></div>`);
    }
  } else if(l.mode==='text' && _curStyleTab==='shadow'){"""

new_text_panels = """  } else if(l.mode==='text' && _curStyleTab==='fill'){
    // 颜色 tab：单色/渐变切换 + 颜色建议
    add(`<div class="chip-row" style="margin-bottom:4px"><div class="chip ${l.fillMode==='solid'?'active':''}" data-fm="solid">单色</div><div class="chip ${l.fillMode==='gradient'?'active':''}" data-fm="gradient">渐变</div></div>`);
    if(l.fillMode==='solid'){
      add(`<div class="form-row"><div class="lbl">颜色</div><input type="color" id="tc" value="${l.color}"></div>`);
      addSuggestTextColor(l.color);
    } else {
      add(`<div class="form-row"><div class="lbl">起始</div><input type="color" id="tc1" value="${l.fillGradS}"></div>`);
      add(`<div class="form-row"><div class="lbl">终止</div><input type="color" id="tc2" value="${l.fillGradE}"></div>`);
    }
  } else if(l.mode==='text' && _curStyleTab==='size'){
    // 尺寸 tab：大小 + 拉伸 + 偏移
    add(`<div class="form-row"><div class="lbl">大小</div><input type="range" id="ts" min="15" max="120" value="${l.size}"><span class="v" id="tsV">${l.size}%</span></div>`);
    add(`<div class="form-row"><div class="lbl">水平拉伸</div><input type="range" id="hSt" min="50" max="300" value="${l.hStretch}"><span class="v" id="hStV">${l.hStretch}%</span></div>`);
    add(`<div class="form-row"><div class="lbl">垂直拉伸</div><input type="range" id="vSt" min="50" max="500" value="${l.vStretch}"><span class="v" id="vStV">${l.vStretch}%</span></div>`);
    add(`<div class="form-row"><div class="lbl">横向偏移</div><input type="range" id="hOf" min="-60" max="60" value="${l.hOffset}"><span class="v" id="hOfV">${l.hOffset}</span></div>`);
    add(`<div class="form-row"><div class="lbl">纵向偏移</div><input type="range" id="vOf" min="-60" max="60" value="${l.vOffset}"><span class="v" id="vOfV">${l.vOffset}</span></div>`);
  } else if(l.mode==='text' && _curStyleTab==='shadow'){"""

assert old_text_app_fill in t
t = t.replace(old_text_app_fill, new_text_panels, 1)
print('2d OK: text panels fill+size')

# ═══════════════════ PHASE 2e: fa panel —— app → faicon + size ═══════════════════
old_fa_app = """  } else if(l.mode==='fa' && _curStyleTab==='app'){
    add(`<div class="form-row"><div class="lbl">颜色</div><input type="color" id="faC" value="${l.faColor||'#fff'}"></div>`);
    add(`<div class="form-row"><div class="lbl">大小</div><input type="range" id="faS" min="15" max="120" value="${l.faSize||65}"><span class="v" id="faSV">${l.faSize||65}%</span></div>`);"""

new_fa_panels = """  } else if(l.mode==='fa' && _curStyleTab==='faicon'){
    // 图标 tab：颜色 + FA 图标搜索网格
    add(`<div class="form-row"><div class="lbl">颜色</div><input type="color" id="faC" value="${l.faColor||'#fff'}"></div>`);
    add(`<div style="margin-top:6px">
      <input type="text" id="faSr" placeholder="🔍 搜索 FA 图标..." style="width:100%;padding:5px 8px;border-radius:6px;border:1px solid var(--border-strong);background:var(--bg-input);color:var(--text);font-size:11px;outline:none;box-sizing:border-box">
      <div id="faGr" style="max-height:180px;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(26px,1fr));gap:3px;margin-top:4px;padding:4px;background:var(--bg-rail);border-radius:6px"></div>
      <div id="faMore" style="font-size:10px;color:var(--text-muted);text-align:center;margin-top:2px"></div>
    </div>`);
  } else if(l.mode==='fa' && _curStyleTab==='size'){
    // 尺寸 tab：大小 + 偏移
    add(`<div class="form-row"><div class="lbl">大小</div><input type="range" id="faS" min="15" max="120" value="${l.faSize||65}"><span class="v" id="faSV">${l.faSize||65}%</span></div>`);
    add(`<div class="form-row"><div class="lbl">横向偏移</div><input type="range" id="hOf" min="-60" max="60" value="${l.hOffset}"><span class="v" id="hOfV">${l.hOffset}</span></div>`);
    add(`<div class="form-row"><div class="lbl">纵向偏移</div><input type="range" id="vOf" min="-60" max="60" value="${l.vOffset}"><span class="v" id="vOfV">${l.vOffset}</span></div>`);"""

assert old_fa_app in t
t = t.replace(old_fa_app, new_fa_panels, 1)
print('2e OK: fa panels faicon+size')

# ═══════════════════ PHASE 2f: image panel —— app → upload + size ═══════════════════
old_img_app = """  } else if(l.mode==='image' && _curStyleTab==='app'){
    add(`<div class="form-row"><div class="lbl">缩放</div><input type="range" id="imgSc" min="20" max="300" value="${l.imgScale||100}"><span class="v" id="imgScV">${l.imgScale||100}%</span></div>`);
    add(`<div class="form-row"><div class="lbl">位置</div><select id="imgPs"><option value="center">居中</option><option value="cover">填满</option><option value="top">顶部</option><option value="bottom">底部</option></select></div>`);"""

new_img_panels = """  } else if(l.mode==='image' && _curStyleTab==='upload'){
    // 上传 tab：预览 + 上传 + 清除
    add(`<div style="margin-bottom:6px;padding:8px;border:1px dashed var(--border);border-radius:6px;background:var(--bg-rail);display:flex;align-items:center;justify-content:center;min-height:60px">${l.imgUrl?'<img id="imgPr" src="'+l.imgUrl+'" style="max-height:60px;max-width:100%;border-radius:4px">':'<span style="color:var(--text-muted);font-size:11px">暂无图片</span>'}</div>`);
    add(`<div class="form-row"><div class="lbl"></div><div style="display:flex;gap:6px"><label class="btn btn-sm" style="padding:4px 10px"><i class="fa-solid fa-cloud-arrow-up"></i> 上传<input type="file" id="fileUp" accept="image/png,image/svg+xml,image/jpeg" style="display:none"></label>${l.imgUrl?'<button class="btn btn-sm" id="imgClr" style="padding:4px 10px"><i class="fa-solid fa-trash"></i> 清除</button>':''}</div></div>`);
  } else if(l.mode==='image' && _curStyleTab==='size'){
    // 尺寸 tab：缩放 + 位置 + 偏移
    add(`<div class="form-row"><div class="lbl">缩放</div><input type="range" id="imgSc" min="20" max="300" value="${l.imgScale||100}"><span class="v" id="imgScV">${l.imgScale||100}%</span></div>`);
    add(`<div class="form-row"><div class="lbl">位置</div><select id="imgPs"><option value="center">居中</option><option value="cover">填满</option><option value="top">顶部</option><option value="bottom">底部</option></select></div>`);
    add(`<div class="form-row"><div class="lbl">横向偏移</div><input type="range" id="hOf" min="-60" max="60" value="${l.hOffset}"><span class="v" id="hOfV">${l.hOffset}</span></div>`);
    add(`<div class="form-row"><div class="lbl">纵向偏移</div><input type="range" id="vOf" min="-60" max="60" value="${l.vOffset}"><span class="v" id="vOfV">${l.vOffset}</span></div>`);"""

assert old_img_app in t
t = t.replace(old_img_app, new_img_panels, 1)
print('2f OK: image panels upload+size')

# ═══════════════════ PHASE 2g: 追加新 bind（FA 网格 + 图片上传/清除） ═══════════════════
old_last = """  // fill mode chips
  p.querySelectorAll('[data-fm]').forEach(c=>c.onclick=()=>{l.fillMode=c.dataset.fm;renderStylePanel();draw();});
}"""

new_last = """  // fill mode chips
  p.querySelectorAll('[data-fm]').forEach(c=>c.onclick=()=>{l.fillMode=c.dataset.fm;renderStylePanel();draw();});
  // —— 新增：FA 图标网格（faicon tab）——
  const faSr=$('faSr'),faGr=$('faGr'),faMore=$('faMore');
  if(faSr&&faGr){
    const ALL_ICONS=Object.keys(FA_MAP).sort();
    let _sel=l.faIcon;
    const rGrid=(kw)=>{
      faGr.innerHTML='';
      let items=ALL_ICONS;
      if(kw){const k=kw.toLowerCase();items=items.filter(n=>n.includes(k)||n.replace('fa-','').includes(k));}
      const MAX=kw?240:120;
      items.slice(0,MAX).forEach(n=>{
        const selected=n===_sel;
        const d=document.createElement('div');
        d.style.cssText='display:flex;align-items:center;justify-content:center;height:26px;border-radius:4px;cursor:pointer;font-size:13px;transition:.1s;border:1px solid '+(selected?'var(--accent)':'transparent')+';background:'+(selected?'var(--accent-bg)':'transparent')+';color:'+(selected?'var(--accent)':'var(--text-sub)');
        d.title=n;d.innerHTML='<i class="fa-solid '+n+'"></i>';
        d.onmouseenter=()=>{if(!selected)d.style.background='var(--bg-input)';};
        d.onmouseleave=()=>{if(!selected)d.style.background='transparent';};
        d.onclick=()=>{_sel=n;l.faIcon=n;rGrid(faSr.value);draw();};
        faGr.appendChild(d);
      });
      if(faMore)faMore.textContent=items.length>MAX?'共'+items.length+'个，显示前'+MAX:'共'+items.length+'个';
    };
    faSr.addEventListener('input',e=>rGrid(e.target.value));
    rGrid('');
  }
  // —— 新增：图片上传 + 清除（upload tab）——
  const fileUp=$('fileUp');
  if(fileUp)fileUp.addEventListener('change',e=>{
    if(e.target.files[0]){
      const r=new FileReader();
      r.onload=ev=>{l.imgUrl=ev.target.result;renderStylePanel();draw();};
      r.readAsDataURL(e.target.files[0]);
    }
  });
  const imgClr=$('imgClr');
  if(imgClr)imgClr.addEventListener('click',()=>{l.imgUrl=null;renderStylePanel();draw();});
}"""

assert old_last in t
t = t.replace(old_last, new_last, 1)
print('2g OK: new binds')

# ═══════════════════ PHASE 2h: 模式切换时 _curStyleTab 适配 ═══════════════════
# 旧 renderStyleTabs 只检查是否存在于 tabs 数组——已经够了，因为 STYLE_TABS 改了

open('IconMaker.html','w',encoding='utf-8').write(t)
print(f'\\n🎉 ALL DONE! Final size: {len(t)} bytes')
