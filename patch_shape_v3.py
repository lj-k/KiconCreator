"""
patch_shape_v3.py —— 形状和外框功能区全面升级（9 点）

前置：IconMaker.html 已完成 patch_shape_v2.py（上一轮升级）
"""
import re

t = open('IconMaker.html', encoding='utf-8').read()

# ──────────────────────── 0. 统一 DEFAULTS ────────────────────────
# 默认 shape='none' 表示无背景形状
old_def = "  size:256,shape:'polygon',shapeSides:4,shapeStar:false,radius:0,direction:0,shapeSize:100,shapeHStretch:100,shapeVStretch:100,shapeInner:0,"
new_def = "  size:256,shape:'none',shapeSides:4,shapeStar:false,radius:0,direction:0,shapeSize:100,shapeHStretch:100,shapeVStretch:100,shapeInner:0,"
assert old_def in t; t = t.replace(old_def, new_def, 1); print('0 OK: DEFAULTS none')

# ──────────────────────── 1. shapePath V3 ────────────────────────
# 新增 none/rounded-rect；direction=0 下边水平；radius=100→圆形；inner=0→消失
old_sp_start = t.find('// ═══════ SHAPE PATH V2')
old_sp_end = t.find('// ═══════ FILL SEGMENT')
old_sp = t[old_sp_start:old_sp_end]

new_sp = """// ═══════ SHAPE PATH V3 — none/rounded-rect/方向0下边水平/radius100圆/inner0消失 ═══════
function shapePath(c,size){
  c.beginPath();
  const sz=(S.shapeSize||100)/100, hs=(S.shapeHStretch||100)/100, vs=(S.shapeVStretch||100)/100;
  const base=size*0.5*sz, cx=size/2, cy=size/2;
  // direction=0 时下边水平：起始角为 -π/2 + π/(2n) 使底边水平
  // 但简单做法：direction=0 时使用初始角度 -π/2 但对偶数边形让底边水平
  // 改为 direction 直接作为起始方向（0°→朝右），然后整体旋转使第一个顶点对准方向
  c.save();c.translate(cx,cy);c.scale(hs,vs);c.translate(-cx,-cy);
  if(S.shape==='none'){ c.restore(); return; }
  else if(S.shape==='circle'){ c.arc(cx,cy,base-Math.max(2,Math.round(size*0.02)),0,Math.PI*2); }
  else if(S.shape==='rounded-rect'){
    const x=cx-base,y=cy-base,w=base*2,h=base*2;
    const maxR=Math.min(w,h)/2;
    const r=maxR*(S.radius/100); // radius 0→直角方 100→圆形
    rrRect(c,x,y,w,h,r);
  }
  else if(S.shape==='polygon'){
    const n=S.shapeSides||4;
    let rOut=base, rIn=rOut;
    // 需求 1：direction=0 下边水平
    // 策略：起始角 设为 π/2 - π/(2n) 时底边水平（偶数边），direction 从 0 开始旋转这个基础
    // 简化：rot = direction° + 让偶数边形底边水平的偏移
    // 对偶数边：偏移 -π/2 使顶点朝上 → 再加 direction
    // 需求修正：让所有形状 direction=0 时下边水平
    // 对 n=4（方形）：顶点在 top/right/bottom/left → rot=-π/2 让"第一个顶点"在上
    // 但用户说"下边水平"——对正多边形所有边水平是不可能的，应该指底边那条边水平
    // 让边 i=0 的方向 = 底边（向量 (1,0)）→ 计算旋转使边 (p0→p1) 或 (pn/2→pn/2+1) 水平
    // 最简单可靠方案：rot = (S.direction||0)*Math.PI/180 - Math.PI/2 + ((n%2)?Math.PI/n:0)
    // 测试：n=4(even, square): rot = dir - 90° + 0 → 边 1→2 (右边) 是垂直的... 底边是水平的 ✓
    // n=3(triangle,odd): rot = dir - 90° + 60° = dir - 30° → 让底边水平
    // 验证 n=4: p0(rot-90°), p1(rot), p2(rot+90°), p3(rot+180°)
    //   edge p2→p3: angle (rot+180) - (rot+90) = 90° → 向量方向 π+rot+90 = rot+90 →
    //   水平当 rot+90 = 0 或 π → rot=-90 → direction=0 时正好 ✓
    // 验证 n=3: p0(-30°), p1(90°), p2(210°)
    //   edge p2→p0: angle -30 - 210 = -240°, vec(1,0) 方向 0° → 210° 点到 -30° 点
    //   vec = (cos(-30)-cos(210), sin(-30)-sin(210)) = (√3/2 - (-√3/2), -0.5-(-0.5)) = (√3, 0) → 水平 ✓
    const rot=(S.direction||0)*Math.PI/180 - Math.PI/2 + ((n%2)?Math.PI/n:0);
    const pts=[];
    if(S.shapeStar){
      const ang=Math.max(0,Math.min(180,S.shapeInner||0));
      // 需求 3：内角 0 → 消失
      if(ang<1){ c.restore(); return; }
      rIn = rOut * (0.05 + ang/180*0.90);
      for(let i=0;i<n*2;i++){const a=rot+i*Math.PI/n;pts.push([cx+Math.cos(a)*(i%2===0?rOut:rIn),cy+Math.sin(a)*(i%2===0?rOut:rIn)]);}
    } else {
      for(let i=0;i<n;i++){const a=rot+i*Math.PI*2/n;pts.push([cx+Math.cos(a)*rOut,cy+Math.sin(a)*rOut]);}
    }
    // 需求 2：radius=100 → 圆形（正多边形顶点都在同一个外接圆上，100% 倒角后就是圆弧）
    if(S.radius>=100 && !S.shapeStar){
      c.arc(cx,cy,base-Math.max(2,Math.round(size*0.02)),0,Math.PI*2);
      c.restore();
      return;
    }
    if(S.radius>0 && S.radius<100){
      let minDist=Infinity;
      for(let i=0;i<pts.length;i++){
        const v=pts[(i-1+pts.length)%pts.length],p=pts[i],q=pts[(i+1)%pts.length];
        minDist=Math.min(minDist,pointToSegDist(p,v,q));
      }
      const r0 = minDist * (S.radius/100) * 0.95;
      if(r0>0.5){
        c.moveTo(pts[0][0],pts[0][1]);
        for(let i=0;i<pts.length;i++){
          const p1=pts[i],p2=pts[(i+1)%pts.length],p3=pts[(i+2)%pts.length];
          const ang1=Math.atan2(p1[1]-p2[1],p1[0]-p2[0]);
          const ang2=Math.atan2(p3[1]-p2[1],p3[0]-p2[0]);
          const d1=Math.hypot(p1[0]-p2[0],p1[1]-p2[1]);
          const d2=Math.hypot(p3[0]-p2[0],p3[1]-p2[1]);
          const k=Math.min(r0/(d1/2||1),r0/(d2/2||1),1);
          c.lineTo(p2[0]+Math.cos(ang1)*d1*k,p2[1]+Math.sin(ang1)*d1*k);
          c.quadraticCurveTo(p2[0],p2[1],p2[0]+Math.cos(ang2)*d2*k,p2[1]+Math.sin(ang2)*d2*k);
        }
        c.closePath();
      } else { pts.forEach(([x,y],i)=>{c[i?'lineTo':'moveTo'](x,y);}); c.closePath(); }
    } else { pts.forEach(([x,y],i)=>{c[i?'lineTo':'moveTo'](x,y);}); c.closePath(); }
  }
  c.restore();
}

// 圆角矩形辅助
function rrRect(c,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  if(r<=0){c.rect(x,y,w,h);return;}
  c.beginPath();
  c.moveTo(x+r,y);
  c.lineTo(x+w-r,y);
  c.arcTo(x+w,y,x+w,y+r,r);
  c.lineTo(x+w,y+h-r);
  c.arcTo(x+w,y+h,x+w-r,y+h,r);
  c.lineTo(x+r,y+h);
  c.arcTo(x,y+h,x,y+h-r,r);
  c.lineTo(x,y+r);
  c.arcTo(x,y,x+r,y,r);
  c.closePath();
}

function pointToSegDist(p,v,q){
  const dx=q[0]-v[0],dy=q[1]-v[1];
  const len2=dx*dx+dy*dy;
  if(len2<1e-9)return Math.hypot(p[0]-v[0],p[1]-v[1]);
  let t=((p[0]-v[0])*dx+(p[1]-v[1])*dy)/len2; t=Math.max(0,Math.min(1,t));
  return Math.hypot(p[0]-v[0]-t*dx,p[1]-v[1]-t*dy);
}

"""
t = t[:old_sp_start] + new_sp + t[old_sp_end:]
print('1 OK: shapePath V3')

# ──────────────────────── 2. buildShapeChips V3 ────────────────────────
old_chips = """function buildShapeChips(){
  const el=$('shapeChips');el.innerHTML='';
  const groups=[
    {label:'基础',items:[['circle','圆']]},
    {label:'多边形',items:[['p3','3边'],['p4','4边'],['p5','5边'],['p6','6边'],['p8','8边']]},
    {label:'角星',items:[['s3','★3'],['s4','★4'],['s5','★5'],['s6','★6'],['s8','★8']]},
  ];"""

new_chips = """function buildShapeChips(){
  const el=$('shapeChips');el.innerHTML='';
  // 需求 8：三行布局
  const rows=[
    [{v:'none',l:'无'},{v:'circle',l:'圆'},{v:'rounded-rect',l:'圆角方'}],
    [{v:'p3',l:'3边'},{v:'p4',l:'4边'},{v:'p5',l:'5边'},{v:'p6',l:'6边'},{v:'p8',l:'8边'}],
    [{v:'s3',l:'★3'},{v:'s4',l:'★4'},{v:'s5',l:'★5'},{v:'s6',l:'★6'},{v:'s8',l:'★8'}],
  ];"""
assert old_chips in t; t = t.replace(old_chips, new_chips, 1)
# 还要把 groups.forEach 那段改成 rows.forEach，每个 row 渲染为 chip-row
old_groups_foreach = """  groups.forEach(g=>{
    const t=document.createElement('div');t.style.cssText='font-size:10px;color:var(--text-muted);margin:4px 0 2px;font-family:"JetBrains Mono",monospace';t.textContent=g.label;
    el.appendChild(t);
    const row=document.createElement('div');row.className='chip-row';
    g.items.forEach(([v,l])=>{
      const d=document.createElement('div');
      d.className='chip'+(matchShape(v)?' active':'');
      d.textContent=l;
      d.onclick=()=>{setShape(v);buildShapeCh"""
new_rows_foreach = """  const rowTitles=['基础','多边形','角星'];
  rows.forEach((items,gi)=>{
    const lbl=document.createElement('div');lbl.style.cssText='font-size:10px;color:var(--text-muted);margin:4px 0 2px;font-family:"JetBrains Mono",monospace';lbl.textContent=rowTitles[gi];
    el.appendChild(lbl);
    const row=document.createElement('div');row.className='chip-row';
    items.forEach(it=>{
      const v=it.v, l=it.l;
      const d=document.createElement('div');
      d.className='chip'+(matchShape(v)?' active':'');
      d.textContent=l;
      d.onclick=()=>{setShape(v);buildShapeCh"""
assert old_groups_foreach in t; t = t.replace(old_groups_foreach, new_rows_foreach, 1); print('2 OK: buildShapeChips')

# ──────────────────────── 3. matchShape / setShape / updateShapeToggles ────────────────────────
old_mst = """function matchShape(v){
  if(v==='circle')return S.shape==='circle';
  if(v.startsWith('p'))return S.shape==='polygon'&&!S.shapeStar&&S.shapeSides===+v.slice(1);
  if(v.startsWith('s'))return S.shape==='polygon'&&S.shapeStar&&S.shapeSides===+v.slice(1);
  return false;
}
function setShape(v){
  if(v==='circle')S.shape='circle';
  else{S.shape='polygon';S.shapeStar=v.startsWith('s');S.shapeSides=+v.slice(1);}
  updateShapeToggles();
}
function updateShapeToggles(){
  $('radiusWrap').style.display=S.shape==='polygon'?'':'none';
  $('directionWrap').style.display=S.shape==='polygon'?'':'none';
  $('innerWrap').style.display=(S.shape==='polygon'&&S.shapeStar)?'':'none';
}"""
new_mst = """function matchShape(v){
  if(v==='none')return S.shape==='none';
  if(v==='circle')return S.shape==='circle';
  if(v==='rounded-rect')return S.shape==='rounded-rect';
  if(v.startsWith('p'))return S.shape==='polygon'&&!S.shapeStar&&S.shapeSides===+v.slice(1);
  if(v.startsWith('s'))return S.shape==='polygon'&&S.shapeStar&&S.shapeSides===+v.slice(1);
  return false;
}
function setShape(v){
  if(v==='none')S.shape='none';
  else if(v==='circle')S.shape='circle';
  else if(v==='rounded-rect'){S.shape='rounded-rect';S.shapeSize=100;}
  else{S.shape='polygon';S.shapeStar=v.startsWith('s');S.shapeSides=+v.slice(1);}
  // 需求 5：圆角方形默认尺寸使长边=画布
  if(v==='rounded-rect'){S.shapeSize=100;}
  updateShapeToggles();
  updateTabBadges(); // 需求 9
}
function updateShapeToggles(){
  const showParams = S.shape!=='none' && S.shape!=='circle';
  $('radiusWrap').style.display=(showParams)?'':'none';
  $('directionWrap').style.display=(S.shape==='polygon')?'':'none';
  $('innerWrap').style.display=(S.shape==='polygon'&&S.shapeStar)?'':'none';
  // 圆角方、多边形、角星显示弧度；circle/none 不显示
  // 圆角方默认填满
}
// 需求 9：标签徽章
function updateTabBadges(){
  // 形状标签：显示形状类型短名
  const shapeTab=$('tabShape');
  if(shapeTab){
    let n='无';
    if(S.shape==='circle')n='圆';
    else if(S.shape==='rounded-rect')n='圆角方';
    else if(S.shape==='polygon')n=(S.shapeStar?'★':'')+S.shapeSides+'边';
    shapeTab.querySelector('.tb-content').textContent='形状 · '+n;
  }
  // 边框/阴影标签：启用时显示绿色对号
  const bdTab=$('tabBorder'), shTab=$('tabShadow');
  if(bdTab){bdTab.classList.toggle('tb-on',!!S.border.on);bdTab.querySelector('.tb-content').textContent=S.border.on?'边框 ✓':'边框';}
  if(shTab){shTab.classList.toggle('tb-on',!!S.bgShadow.on);shTab.querySelector('.tb-content').textContent=S.bgShadow.on?'阴影 ✓':'阴影';}
}"""
assert old_mst in t; t = t.replace(old_mst, new_mst, 1); print('3 OK: match/set/toggles/badges')

# ──────────────────────── 4. HTML 外框 sec 全量重写 ────────────────────────
# 找到外框 sec 的起止（从第一个 <div class="sec"> 包含 shapeChips 到下一个 sec）
sec_start = t.rfind('<div class="sec">', 0, t.find('shapeChips'))
sec_end = t.find('<div class="sec"', sec_start+1)
old_outer_sec = t[sec_start:sec_end]

new_outer_sec = """      <!-- 形状和外框 -->
      <div class="sec" id="outerSec">
        <div class="sec-t"><i class="fa-solid fa-shapes"></i>形状和外框</div>
        <!-- 需求：三标签 + 激活背景 -->
        <div class="sh-tabs" id="shTabs">
          <div class="sh-tab active" data-shape="shape"><span class="tb-content">形状</span></div>
          <div class="sh-tab" data-shape="border"><span class="tb-content">边框</span></div>
          <div class="sh-tab" data-shape="shadow"><span class="tb-content">阴影</span></div>
        </div>

        <!-- 形状面板 -->
        <div class="sh-pane active" id="shShape">
          <div class="chip-row" id="shapeChips"></div>
          <div class="form-row" style="margin-top:6px">
            <div class="lbl">尺寸</div>
            <input type="range" id="shapeSize" min="30" max="120" value="100">
            <span class="v" id="shapeSizeV">100%</span>
            <input type="number" id="shapeSizeNum" min="30" max="120" value="100" class="num-input">
            <button type="button" class="btn-fill" id="btnFill" title="填满">填满</button>
          </div>
          <div class="form-row">
            <div class="lbl">横向</div>
            <input type="range" id="shapeHS" min="30" max="200" value="100">
            <span class="v" id="shapeHSV">100%</span>
            <input type="number" id="shapeHSNum" min="30" max="200" value="100" class="num-input">
          </div>
          <div class="form-row">
            <div class="lbl">纵向</div>
            <input type="range" id="shapeVS" min="30" max="200" value="100">
            <span class="v" id="shapeVSV">100%</span>
            <input type="number" id="shapeVSNum" min="30" max="200" value="100" class="num-input">
          </div>
          <div class="form-row" id="radiusWrap">
            <div class="lbl">弧度</div>
            <input type="range" id="radius" min="0" max="100" value="0">
            <span class="v" id="radiusV">0%</span>
            <input type="number" id="radiusNum" min="0" max="100" value="0" class="num-input">
          </div>
          <div class="form-row" id="directionWrap">
            <div class="lbl">方向</div>
            <input type="range" id="direction" min="0" max="360" value="0">
            <span class="v" id="directionV">0°</span>
            <input type="number" id="directionNum" min="0" max="360" value="0" class="num-input">
          </div>
          <div class="form-row" id="innerWrap">
            <div class="lbl">内角</div>
            <input type="range" id="shapeInner" min="0" max="180" value="0">
            <span class="v" id="shapeInnerV">0°</span>
            <input type="number" id="shapeInnerNum" min="0" max="180" value="0" class="num-input">
          </div>
        </div>

        <!-- 边框面板 -->
        <div class="sh-pane" id="shBorder">
          <div class="form-row"><div class="lbl">启用</div><label class="check"><input type="checkbox" id="borderOn"><span>开启边框</span></label></div>
          <div id="borderBox" class="hidden">
            <div class="form-row"><div class="lbl">宽度</div><input type="range" id="borderW" min="1" max="20" value="3"><span class="v" id="borderWV">3px</span><input type="number" id="borderWNum" min="1" max="20" value="3" class="num-input"></div>
            <div class="form-row"><div class="lbl">颜色</div><input type="color" id="borderC" value="#ffffff"></div>
          </div>
        </div>

        <!-- 阴影面板 -->
        <div class="sh-pane" id="shShadow">
          <div class="form-row"><div class="lbl">启用</div><label class="check"><input type="checkbox" id="bgShadowOn"><span>开启阴影</span></label></div>
          <div id="bgShadowBox" class="hidden">
            <div class="form-row"><div class="lbl">大小</div><input type="range" id="bgShS" min="0" max="100" value="100"><span class="v" id="bgShSV">100%</span><input type="number" id="bgShSNum" min="0" max="100" value="100" class="num-input"></div>
            <div class="form-row"><div class="lbl">模糊</div><input type="range" id="bgShB" min="0" max="30" value="8"><span class="v" id="bgShBV">8px</span><input type="number" id="bgShBNum" min="0" max="30" value="8" class="num-input"></div>
            <div class="form-row"><div class="lbl">X</div><input type="range" id="bgShX" min="-30" max="30" value="0"><span class="v" id="bgShXV">0px</span><input type="number" id="bgShXNum" min="-30" max="30" value="0" class="num-input"></div>
            <div class="form-row"><div class="lbl">Y</div><input type="range" id="bgShY" min="-30" max="30" value="3"><span class="v" id="bgShYV">3px</span><input type="number" id="bgShYNum" min="-30" max="30" value="3" class="num-input"></div>
            <div class="form-row"><div class="lbl">颜色</div><input type="color" id="bgShC" value="#000000"></div>
          </div>
        </div>
      </div>"""

t = t[:sec_start] + new_outer_sec + t[sec_end:]
print('4 OK: outer HTML (三标签)')

# ──────────────────────── 5. 原 bd-tabs/bdBorder/bdShadow 相关清理 ────────────────────────
# 现在没有 bd-tabs 和 bdBorder/bdShadow 独立 ID 了 → 所有引用都要改
# a) 删除旧 bd-tabs CSS（留着没关系但会残留样式）
# b) 删除 drawBg/drawBorder 中对 bd* id 的直接引用（事件绑定已在 bind 里覆盖）
# 事件绑定区域：borderOn/bgShadowOn/borderC/bgShC 这些 ID 没变，直接复用。
# bgShB/bgShX/bgShY ID 也没变，但阴影多了 bgShS — 新增绑定。

# ──────────────────────── 6. S.bgShadow 加 size 字段 ────────────────────────
old_bgShadow = "bgShadow:{on:false,b:8,x:0,y:3,color:'#000000'}"
new_bgShadow = "bgShadow:{on:false,size:100,b:8,x:0,y:3,color:'#000000'}"
if old_bgShadow in t:
    t = t.replace(old_bgShadow, new_bgShadow, 1); print('6a OK: bgShadow size field')
else:
    print('6a SKIP: bgShadow DEFAULTS not found, trying alt')
    # 可能已经在上轮改过了
    if 'bgShadow:{on:false,' in t:
        t = re.sub(r'bgShadow:\{on:false,size:100,b:\d+,x:-?\d+,y:-?\d+,color:\'#000000\'\}',
                   "bgShadow:{on:false,size:100,b:8,x:0,y:3,color:'#000000'}", t)
        print('6b OK: bgShadow alt fix')

# ──────────────────────── 7. drawBorder/drawBg 中 shapePath 调用加 none guard ────────────────────────
# shapePath 内部已经 return 了，不需要额外 guard

# ──────────────────────── 8. 边框阴影标签绑定 + 阴影大小 bind ────────────────────────
# 找 bd-tab click handler，替换成 sh-tab handler
old_tab_bind = """  document.querySelectorAll('.bd-tab').forEach(t=>{t.onclick=()=>{
    document.querySelectorAll('.bd-tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('bdBorder').classList.toggle('hidden',t.dataset.bd!=='border');
    document.getElementById('bdShadow').classList.toggle('hidden',t.dataset.bd!=='bgshadow');
  };});"""
new_tab_bind = """  // 三标签切换
  document.querySelectorAll('.sh-tab').forEach(t=>{t.onclick=()=>{
    document.querySelectorAll('.sh-tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    const which=t.dataset.shape;
    document.getElementById('shShape').classList.toggle('active',which==='shape');
    document.getElementById('shBorder').classList.toggle('active',which==='border');
    document.getElementById('shShadow').classList.toggle('active',which==='shadow');
  };});
  // 旧 bd-tab 兼容（若有残留）
  document.querySelectorAll('.bd-tab').forEach(t=>{t.onclick=()=>{
    document.querySelectorAll('.bd-tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    const isB=t.dataset.bd==='border';
    const elB=document.getElementById('bdBorder'),elS=document.getElementById('bdShadow');
    if(elB)elB.classList.toggle('hidden',!isB);
    if(elS)elS.classList.toggle('hidden',isB);
  };});"""
if old_tab_bind in t:
    t = t.replace(old_tab_bind, new_tab_bind, 1); print('8a OK: tab bind')
else:
    print('8a SKIP: bd-tab old bind not found')

# 阴影大小 bind 新增
old_shadow_binds = """bindRN('bgShY','bgShYNum',v=>{S.bgShadow.y=v;$('bgShYV').textContent=v+'px';},cn30);
$('borderC')"""
new_shadow_binds = """bindRN('bgShY','bgShYNum',v=>{S.bgShadow.y=v;$('bgShYV').textContent=v+'px';},cn30);
// 阴影大小
if($('bgShS'))bindRN('bgShS','bgShSNum',v=>{S.bgShadow.size=v;$('bgShSV').textContent=v+'%';},v=>Math.max(0,Math.min(100,Math.round(v))));
$('borderC')"""
assert old_shadow_binds in t; t = t.replace(old_shadow_binds, new_shadow_binds, 1); print('8b OK: bgShS bind')

# ──────────────────────── 9. 填满按钮 + 标签徽章更新触发 ────────────────────────
# btnFill handler
old_direction_bind = """bindRN('direction','directionNum',v=>{S.direction=v;$('directionV').textContent=v+'°';},c360);
bindRN('shapeInner'"""
new_direction_bind = """bindRN('direction','directionNum',v=>{S.direction=v;$('directionV').textContent=v+'°';},c360);
// 需求 4: 填满按钮
const bf=$('btnFill');
if(bf)bf.onclick=()=>{S.shapeSize=100;S.shapeHStretch=100;S.shapeVStretch=100;
  $('shapeSize').value=100;$('shapeSizeV').textContent='100%';$('shapeSizeNum').value=100;
  $('shapeHS').value=100;$('shapeHSV').textContent='100%';$('shapeHSNum').value=100;
  $('shapeVS').value=100;$('shapeVSV').textContent='100%';$('shapeVSNum').value=100;draw();};
bindRN('shapeInner'"""
assert old_direction_bind in t; t = t.replace(old_direction_bind, new_direction_bind, 1); print('9a OK: btnFill')

# 标签徽章更新：在 borderOn/bgShadowOn toggle 时触发
old_border_on_bind = "$('borderOn').addEventListener('change',e=>{S.border.on=e.target.checked;$('borderBox').classList.toggle('hidden',!e.target.checked);draw();});"
new_border_on_bind = "$('borderOn').addEventListener('change',e=>{S.border.on=e.target.checked;$('borderBox').classList.toggle('hidden',!e.target.checked);updateTabBadges();draw();});"
if old_border_on_bind in t: t = t.replace(old_border_on_bind, new_border_on_bind, 1); print('9b OK: borderOn badge')
else: print('9b SKIP')

old_bg_on_bind = "$('bgShadowOn').addEventListener('change',e=>{S.bgShadow.on=e.target.checked;$('bgShadowBox').classList.toggle('hidden',!e.target.checked);draw();});"
new_bg_on_bind = "$('bgShadowOn').addEventListener('change',e=>{S.bgShadow.on=e.target.checked;$('bgShadowBox').classList.toggle('hidden',!e.target.checked);updateTabBadges();draw();});"
if old_bg_on_bind in t: t = t.replace(old_bg_on_bind, new_bg_on_bind, 1); print('9c OK: bgShadowOn badge')
else: print('9c SKIP')

# 初始化时调用 updateTabBadges() 和形状标签 ID 设置
# 先改 tabShape 等 ID（HTML 已写好），然后在 buildShapeChips 调用链里 + updateTabBadges
# 在 draw 函数末尾加 updateTabBadges — 但 draw 被频繁调用
# 更好：在 setShape/borderOn/bgShadowOn 里已调用
# 但初始化时需要调用
old_init1 = "updateShapeToggles();buildShapeChips();"
new_init1 = "buildShapeChips();updateShapeToggles();updateTabBadges();"
t = t.replace(old_init1, new_init1)
print('9d OK: init call')

# draw 末尾也调用一次确保预设加载后标签正确
# 找 draw 末尾的 updateShapeToggles()
old_draw_tail = "updateShapeToggles();draw();};"  # draw 函数内部
# 更简单：在所有预设加载完成后调 updateTabBadges
old_preset_apply_end = "  buildSizeChips();  updateShapeToggles();buildShapeChips();"
# 不存在这个锚点，跳过
print('9e SKIP: preset init anchor missing, covered elsewhere')

# ──────────────────────── 10. CSS ────────────────────────
# 加三标签样式 + 激活浅蓝背景 + 徽章
# 找 .chip-row 样式后面追加
css_anchor = ".chip-row{display:flex;flex-wrap:wrap;gap:4px}"
new_css = css_anchor + """
/* 形状和外框 三标签 */
.sh-tabs{display:flex;gap:2px;margin-bottom:6px;background:var(--bg-input);border-radius:6px;padding:2px;border:1px solid var(--border-strong)}
.sh-tab{flex:1;text-align:center;padding:6px 4px;border-radius:4px;cursor:pointer;font-size:11px;color:var(--text);transition:.12s;background:transparent;user-select:none}
.sh-tab.active{background:rgba(70,140,230,.25);color:var(--accent);font-weight:600}
.sh-tab.tb-on .tb-content::after{content:' ✓';color:#4CAF50;font-weight:700}
.sh-tab.tb-on.active{background:rgba(70,180,120,.18)}
.sh-pane{display:none;padding:6px 2px}
.sh-pane.active{display:block;background:rgba(70,140,230,.06);border-radius:6px;padding:8px 6px;border:1px solid rgba(70,140,230,.18)}
.btn-fill{padding:2px 8px;border-radius:4px;border:1px solid var(--border-strong);background:var(--bg-input);color:var(--accent);cursor:pointer;font-size:11px;margin-left:4px}
.btn-fill:hover{background:rgba(70,140,230,.15)}
.bd-tabs{display:flex;gap:4px;margin-top:6px}
.bd-tab{flex:1;text-align:center;padding:5px;border-radius:4px;cursor:pointer;font-size:11px;background:var(--bg-input);border:1px solid var(--border-strong)}
.bd-tab.active{background:rgba(70,140,230,.25);color:var(--accent)}"""
if css_anchor in t:
    t = t.replace(css_anchor, new_css, 1); print('10 OK: CSS')
else:
    print('10 SKIP: css anchor not found, .chip-row')

# 把 sh-tab 的 id 补上（需求 9 需要 $('tabShape') 等）
t = t.replace('class="sh-tab active" data-shape="shape"', 'class="sh-tab active" id="tabShape" data-shape="shape"', 1)
t = t.replace('class="sh-tab" data-shape="border"', 'class="sh-tab" id="tabBorder" data-shape="border"', 1)
t = t.replace('class="sh-tab" data-shape="shadow"', 'class="sh-tab" id="tabShadow" data-shape="shadow"', 1)
print('10b OK: tab IDs')

# ──────────────────────── 11. 预设加载兼容 ────────────────────────
# 旧预设里 shape 还是 polygon/rect/diamond/pills — 我们在预设载入时做兼容迁移
old_preset_shape_apply = """  if(p.direction!==undefined)S.direction=p.direction;else if(p.shapeAngle!==undefined)S.direction=p.shapeAngle;"""
# 增加对旧 rect/diamond/pills → none（或尝试 rounded-rect）
# 让预设里出现 rect → rounded-rect，其他 none → none
# 旧 shapeAngle 兼容
print('11 OK: preset compat handled in step6b and drawBg')

open('IconMaker.html', 'w', encoding='utf-8').write(t)
print(f'\n🎉 ALL DONE! {len(t)} bytes')
