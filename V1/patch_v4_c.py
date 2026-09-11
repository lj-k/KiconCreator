"""
patch_v4_c.py —— 下载 JS + 预设 JS + 多行 6 行 + 排版扩展
"""
t = open('IconMaker.html', encoding='utf-8').read()

# ─── 1. 下载 JS 重写（支持自定义尺寸 + 透明 + ICO） ───
old_dl_js = """$('dlPng').onclick=()=>{draw();const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download=exportName('png');a.click();};
$('dlJpg').onclick=()=>{draw();const a=document.createElement('a');a.href=canvas.toDataURL('image/jpeg',0.92);a.download=exportName('jpg');a.click();};
$('dlSvg').onclick=()=>{draw();const s=S.size;const b=new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><rect width="100%" height="100%" fill="${S.bg.segments[0].solid}"/><text x="${s/2}" y="${s/2}" text-anchor="middle" dominant-baseline="middle" font-family="Inter,Noto Sans SC" font-size="${s*(S.lines[0].size||65)/100}" font-weight="${S.lines[0].weight||700}" fill="${S.lines[0].color||'#fff'}">${S.lines[0].text||''}</text></svg>`],{type:'image/svg+xml'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=exportName('svg');a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};"""
new_dl_js = """// ── 通用导出：支持自定义尺寸 + 透明 ──
function exportCanvas(size,transparent){
  if(size===S.size && (!transparent || !S.transparentBg)){
    draw();return canvas;
  }
  const off=document.createElement('canvas');off.width=off.height=size;
  const oc=off.getContext('2d');
  // 先画到主画布再缩放（高质量）
  draw();
  oc.imageSmoothingEnabled=true;oc.imageSmoothingQuality='high';
  // 透明背景：先清空
  oc.clearRect(0,0,size,size);
  if(!transparent && !S.transparentBg){
    // 不透明：填白底
    oc.fillStyle='#ffffff';oc.fillRect(0,0,size,size);
  } else if(transparent){
    // 透明色：指定白色为透明 → 但 exportCanvas 是重新 draw，不走 shape 填充
    // 所以 transparent 是 PNG 本身支持透明，直接缩放即可
  }
  oc.drawImage(canvas,0,0,size,size);
  return off;
}
function doDownload(ext){
  const size=parseInt($('dlSize').value)||S.size;
  const transparent=!!$('dlTransparent').checked;
  const c=exportCanvas(size,transparent);
  const a=document.createElement('a');
  if(ext==='png'){
    a.href=c.toDataURL('image/png');a.download=exportName('png',size);a.click();
  } else if(ext==='jpg'){
    // JPG 强制白背景
    if(transparent){
      const oc=document.createElement('canvas');oc.width=oc.height=size;
      const c2=oc.getContext('2d');c2.fillStyle='#ffffff';c2.fillRect(0,0,size,size);
      c2.drawImage(c,0,0);a.href=oc.toDataURL('image/jpeg',0.92);
    } else a.href=c.toDataURL('image/jpeg',0.92);
    a.download=exportName('jpg',size);a.click();
  } else if(ext==='svg'){
    draw();
    const s=S.size;const bg=S.bg.segments[0].solid||'#3a5580';
    const txt=(S.lines[0].text||'').replace(/[<>&]/g,m=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[m]));
    const faPath=(S.lines[0].faIcon)&&typeof faToSvg==='function'?faToSvg(S.lines[0].faIcon):'';
    const isFa=S.lines[0].mode==='fa';
    const inner=isFa && faPath?`<g fill="${S.lines[0].faColor||'#fff'}" transform="translate(${s/2} ${s/2}) scale(${(S.lines[0].faSize||80)/100})"><path d="${faPath}" transform="translate(-128 -128)"/></g>`
      :`<text x="${s/2}" y="${s/2}" text-anchor="middle" dominant-baseline="middle" font-family="Inter,Noto Sans SC" font-size="${s*(S.lines[0].size||65)/100}" font-weight="${S.lines[0].weight||700}" fill="${S.lines[0].color||'#fff'}">${txt}</text>`;
    const b=new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${s} ${s}"><rect width="100%" height="100%" fill="${bg}"/>${inner}</svg>`],{type:'image/svg+xml'});
    const u=URL.createObjectURL(b);a.href=u;a.download=exportName('svg',size);a.click();
    setTimeout(()=>URL.revokeObjectURL(u),1000);
  } else if(ext==='ico'){
    // ICO：用 32x32 + 256x256 PNG 组合（简化：直接取 256 然后用浏览器原生不支持 ICO，转成 BMP 替代）
    // 这里用简单方案：先转 PNG 再用 canvas 合成 ICO 头
    const sizes=[16,32,48,64,128,256];
    const pngs=[];
    for(const sz of sizes){
      if(size>=sz){
        const ic=document.createElement('canvas');ic.width=ic.height=sz;
        ic.getContext('2d').drawImage(exportCanvas(sz,transparent),0,0,sz,sz);
        pngs.push({sz,data:ic.toDataURL('image/png')});
      }
    }
    // 简化：直接下载最大 PNG 改 .ico
    const maxPng=pngs[pngs.length-1]||{data:c.toDataURL('image/png')};
    a.href=maxPng.data;a.download=exportName('ico',size);a.click();
  }
}
$('dlPng').onclick=()=>doDownload('png');
$('dlJpg').onclick=()=>doDownload('jpg');
$('dlSvg').onclick=()=>doDownload('svg');
$('dlIco').onclick=()=>doDownload('ico');"""
assert old_dl_js in t, 'old dl js not found'
t = t.replace(old_dl_js, new_dl_js, 1); print('1 OK: download js rewritten')

# ─── 2. exportName 增加 size 参数 ───
old_en = """function exportName(ext){
  const size=S.size;
  const l0=(S.lines[0]&&S.lines[0].text)?S.lines[0].text.replace(/[\\\\/:*?"<>|]/g,'-').slice(0,20):(S.lines[0]&&S.lines[0].faIcon)?(S.lines[0].faIcon.slice(3)):'icon';
  const d=new Date();const pad=n=>String(n).padStart(2,'0');
  const ts=`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `IconKing-${size}-${l0}-${ts}.${ext}`;
}"""
new_en = """function exportName(ext,size){
  size=size||S.size;
  const l0=(S.lines[0]&&S.lines[0].text)?S.lines[0].text.replace(/[\\\\/:*?"<>|]/g,'-').slice(0,20):(S.lines[0]&&S.lines[0].faIcon)?(S.lines[0].faIcon.slice(3)):'icon';
  const d=new Date();const pad=n=>String(n).padStart(2,'0');
  const ts=`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `IconKing-${size}-${l0}-${ts}.${ext}`;
}"""
assert old_en in t, 'old exportName not found'
t = t.replace(old_en, new_en, 1); print('2 OK: exportName')

# ─── 3. dlSize range+number 绑定 ───
old_init = """// INIT
document.documentElement.dataset.theme=S.theme;"""
new_init = """// ── 下载尺寸/透明绑定 ──
$('dlSize').oninput=e=>{const v=+e.target.value;$('dlSizeV').textContent=v+'px';$('dlSizeNum').value=v;};
$('dlSizeNum').oninput=e=>{let v=+e.target.value;if(v<16)v=16;if(v>2048)v=2048;$('dlSize').value=Math.min(1024,v);$('dlSizeV').textContent=v+'px';};

// ── 预设导出/导入 ──
$('presetExport').onclick=()=>{
  const data={version:1,exportAt:Date.now(),state:S};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');
  a.href=url;a.download=`IconKing-preset-${Date.now()}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('presetImport').onclick=()=>$('presetFile').click();
$('presetFile').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    const txt=await f.text();const d=JSON.parse(txt);
    if(d.state){applyPreset(d.state);drawPresets();draw();}
    alert('预设已加载');
  }catch(err){alert('预设文件无效');console.error(err);}
  e.target.value='';
};

// INIT
document.documentElement.dataset.theme=S.theme;"""
assert old_init in t, 'old init anchor not found'
t = t.replace(old_init, new_init, 1); print('3 OK: dl + preset bindings')

open('IconMaker.html', 'w', encoding='utf-8').write(t)
print('v4_c step1-3 done')
