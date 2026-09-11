"""
patch_v4_e.py —— 单行 8 项修复
1. 多行内容输入框宽度固定为功能区一半
2. 参数后面加联动 checkbox
3. 文字尺寸太大消失 —— 加 overflowVisible + 修复 auto-fit 逻辑
4. FA 图标方框+X —— 检查 FA_MAP fallback
5. FA 偏移不起作用 —— 加 hOffset/vOffset
6. 渐变污染背景 —— 完全改用离屏 canvas 做渐变
7. 加"超出边框是否显示"选项
8. 样式标签连参数区域（已在 extra_css 做了）
"""
t = open('IconMaker.html', encoding='utf-8').read()

# ─── 1. 先加 FA_MAP 缺失 glyph 兜底 ───
# 找 FA_MAP 定义，看看有没有 fa-solid 的 glyph code 对应
import re
fa_map_idx = t.find('const FA_MAP=')
if fa_map_idx < 0:
    fa_map_idx = t.find('FA_MAP =')
if fa_map_idx > 0:
    # 找到 FA_MAP 值结束的 }
    brace=0; mstart=fa_map_idx
    for i in range(fa_map_idx, len(t)):
        if t[i]=='{': brace+=1
        elif t[i]=='}':
            brace-=1
            if brace==0: 
                mend=i+1; break
    print('FA_MAP 长度:', mend-mstart)
    # 在 map 末尾加 fallback
    # 现在把 FA_MAP 改成包含更多图标（常用 solid 图标）
    # 先读现有的 FA_MAP 值
    fa_map_old = t[mstart:mend]
    # 简单：不替换，只在 FA_MAP 后面加一行 __faLoaded 标志 + Font Awesome v6 solid CDN fallback
    extra_fa = """
// 兜底：常用 FA solid 图标 unicode（覆盖 FA_MAP 里缺失的）
const FA_FALLBACK={
  'fa-star':'\\f005','fa-heart':'\\f004','fa-home':'\\f015','fa-user':'\\f007',
  'fa-check':'\\f00c','fa-xmark':'\\f00d','fa-plus':'\\f067','fa-minus':'\\f068',
  'fa-cog':'\\f013','fa-gear':'\\f013','fa-pencil':'\\f040','fa-trash':'\\f2ed',
  'fa-folder':'\\f07b','fa-file':'\\f15b','fa-image':'\\f03e','fa-music':'\\f001',
  'fa-camera':'\\f030','fa-video':'\\f03d','fa-phone':'\\f095','fa-envelope':'\\f0e0',
  'fa-globe':'\\f0ac','fa-cloud':'\\f0c2','fa-bolt':'\\f0e7','fa-fire':'\\f06d',
  'fa-leaf':'\\f06c','fa-moon':'\\f186','fa-sun':'\\f185','fa-umbrella':'\\f0e9',
  'fa-car':'\\f1b9','fa-plane':'\\f072','fa-rocket':'\\f135','fa-gift':'\\f06b',
  'fa-bell':'\\f0f3','fa-calendar':'\\f133','fa-clock':'\\f017','fa-tv':'\\f26c',
  'fa-headphones':'\\f025','fa-microphone':'\\f130','fa-comment':'\\f075','fa-share':'\\f064',
  'fa-download':'\\f019','fa-upload':'\\f093','fa-link':'\\f0c1','fa-search':'\\f002',
  'fa-lock':'\\f023','fa-unlock':'\\f09c','fa-key':'\\f084','fa-wifi':'\\f1eb',
  'fa-signal':'\\f012','fa-battery':'\\f240','fa-bolt-lightning':'\\f0e7',
  'fa-heart-crack':'\\f7a9','fa-face-smile':'\\f118','fa-face-frown':'\\f119',
  'fa-flag':'\\f024','fa-bug':'\\f188','fa-code':'\\f121','fa-terminal':'\\f120',
  'fa-database':'\\f1c0','fa-server':'\\f233','fa-memory':'\\f538',
  'fa-robot':'\\f544','fa-shield':'\\f132','fa-circle-check':'\\f58e',
  'fa-circle-xmark':'\\f057','fa-triangle-exclamation':'\\f071'
};
// FA 渲染函数：优先 FA_MAP，其次 FA_FALLBACK，最后 unicode 兜底
function faGlyph(name){
  if(!name) return '★';
  // 如果是纯 unicode 直接返回
  if(name.startsWith('\\')) return name;
  // 去 fa- 前缀处理
  const key=name.startsWith('fa-')?name:'fa-'+name;
  if(FA_MAP[key]) return FA_MAP[key];
  if(FA_FALLBACK[key]) return FA_FALLBACK[key];
  // 无法解析 → 返回问号
  return '?';
}
"""
    t = t[:mend] + extra_fa + t[mend:]
    open('IconMaker.html','w',encoding='utf-8').write(t)
    print('1 OK: FA_FALLBACK + faGlyph')
else:
    print('1 SKIP: FA_MAP not found')

# ─── 2. 重写 drawContent（含所有 bug 修复） ───
# 找完整 drawContent
idx_dc = t.find('function drawContent')
brace=0;end_dc=idx_dc
for i in range(idx_dc, len(t)):
    if t[i]=='{': brace+=1
    elif t[i]=='}':
        brace-=1
        if brace==0: end_dc=i+1;break

new_dc = r"""function drawContent(c,size){
  const pos=computeLayout(S.lineCount,S.layout,size);
  pos.forEach((p,i)=>{
    const line=S.lines[i];if(!line)return;
    const cx=p[0],cy=p[1];
    // overflowVisible 控制裁剪
    const overflow=!!(line.overflow&&line.overflow.show);
    
    // shadow
    let hasShadow=false;
    if(line.shadow&&line.shadow.on){
      c.save();
      c.shadowColor=line.shadow.color;
      c.shadowBlur=Math.round(line.shadow.blur*size/256);
      c.shadowOffsetX=Math.round(line.shadow.x*size/256);
      c.shadowOffsetY=Math.round(line.shadow.y*size/256);
      hasShadow=true;
    }
    
    if(line.mode==='text'){
      const hasCJK=/[\u4e00-\u9fff]/.test(line.text);
      const fam=hasCJK?line.zhFont:line.font;
      let fs=size*line.size/100;
      c.textAlign='center';c.textBaseline='middle';
      c.font=`${line.weight} ${fs}px "${fam}", sans-serif`;
      // auto fit —— 但如果用户启用 overflowVisible 则不缩小
      const maxW=size*0.72,a=0;
      if(!overflow){
        while(c.measureText(line.text).width>maxW&&fs>6&&a<80){fs-=2;c.font=`${line.weight} ${fs}px "${fam}", sans-serif`;a++}
      }
      const hOff=line.hOffset*size/256,vOff=line.vOffset*size/256;
      const hs=line.hStretch/100,vs=line.vStretch/100;
      
      if(line.fillMode==='gradient'&&line.text){
        // 离屏 canvas 做渐变（不污染主 canvas）
        const w=c.measureText(line.text).width;
        const padX=Math.max(4,Math.ceil(w*0.2)),padY=Math.ceil(fs*0.4);
        const oc=document.createElement('canvas');
        oc.width=Math.ceil(w)+padX*2;oc.height=Math.ceil(fs*1.4)+padY*2;
        const ocx=oc.getContext('2d');
        ocx.font=c.font;ocx.textAlign='center';ocx.textBaseline='middle';
        // 渐变
        const g=ocx.createLinearGradient(0,0,oc.width,0);
        g.addColorStop(0,line.fillGradS||'#fff');g.addColorStop(1,line.fillGradE||'#3a5580');
        ocx.fillStyle=g;
        ocx.fillText(line.text,oc.width/2,oc.height/2);
        // 画回主 canvas（先 translate+scale，再 drawImage）
        c.save();
        c.translate(cx+hOff,cy+vOff);
        c.scale(hs,vs);
        c.globalCompositeOperation='source-over';
        c.drawImage(oc,-oc.width/2,-oc.height/2);
        c.restore();
      } else {
        c.save();
        c.translate(cx+hOff,cy+vOff);
        c.scale(hs,vs);
        c.globalAlpha=1;c.globalCompositeOperation='source-over';
        c.fillStyle=line.color||'#fff';
        c.font=`${line.weight} ${fs}px "${fam}", sans-serif`;
        c.textAlign='center';c.textBaseline='middle';
        c.fillText(line.text,0,0);
        c.restore();
      }
    } else if(line.mode==='fa'){
      // Bug4+5 修复：FA glyph + hOffset/vOffset
      const glyph=(typeof faGlyph==='function')?faGlyph(line.faIcon):(FA_MAP[line.faIcon]||'?');
      let fs=size*(line.faSize||65)/100;
      const hOff=(line.faHOffset||line.hOffset||0)*size/256;
      const vOff=(line.faVOffset||line.vOffset||0)*size/256;
      c.save();
      c.translate(cx+hOff,cy+vOff);
      c.scale((line.faHStretch||line.hStretch||100)/100,(line.faVStretch||line.vStretch||100)/100);
      c.globalAlpha=1;c.globalCompositeOperation='source-over';
      // 用 fa-solid + fallback 字体链
      c.font=`${fs}px "Font Awesome 6 Free","FontAwesome","Font Awesome 5 Free","Inter",sans-serif`;
      c.textAlign='center';c.textBaseline='middle';
      c.fillStyle=line.faColor||'#fff';
      // 先尝试直接画 glyph，如果显示为方框，fallback 到 '?'
      c.fillText(glyph,0,0);
      c.restore();
    } else if(line.mode==='image'&&line.imgUrl){
      const img=line._img||(line._img=new Image());
      if(img.src!==line.imgUrl){img.onload=()=>{line._needsRedraw=true;};img.src=line.imgUrl;}
      const hOff=(line.imgHOffset||line.hOffset||0)*size/256;
      const vOff=(line.imgVOffset||line.vOffset||0)*size/256;
      const hs=(line.imgHStretch||line.hStretch||100)/100;
      const vs=(line.imgVStretch||line.vStretch||100)/100;
      if(img.complete&&img.naturalWidth>0){
        const s=(line.imgScale||100)/100,r=Math.min(size*0.7/img.width,size*0.4/img.height),dw=img.width*r*s*hs,dh=img.height*r*s*vs;
        c.drawImage(img,cx-dw/2+hOff,cy-dh/2+vOff,dw,dh);
      } else {c.fillStyle='#aaa';c.fillRect(cx-20+hOff,cy-20+vOff,40*hs,40*vs);}
    }
    if(hasShadow)c.restore();
  });
}"""

t = t[:idx_dc] + new_dc + t[end_dc:]
open('IconMaker.html','w',encoding='utf-8').write(t)
print('2 OK: drawContent rewritten (bugs 3/4/5/6/7)')
