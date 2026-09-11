"""
patch_shape_v2.py —— 外框形状功能区 7 点升级（一键完成）

前置：IconMaker.html 需先经过 patch_clean.py
  git checkout -- IconMaker.html
  python patch_clean.py
  python patch_shape_v2.py
"""

t = open('IconMaker.html', encoding='utf-8').read()

# ── 1. DEFAULTS ──
old = "  size:256,shape:'polygon',shapeSides:4,shapeStar:false,radius:0,shapeAngle:0,"
new = "  size:256,shape:'polygon',shapeSides:4,shapeStar:false,radius:0,direction:0,shapeSize:100,shapeHStretch:100,shapeVStretch:100,shapeInner:0,"
assert old in t; t = t.replace(old, new, 1); print('1 OK: DEFAULTS')

# ── 2. shapePath V2 ──
old_sp = t[t.find('// ═══════ SHAPE PATH'):t.find('// ═══════ FILL SEGMENT')]
new_sp = """// ═══════ SHAPE PATH V2 — 尺寸/拉伸/内角/方向/弧度修复 ═══════
function shapePath(c,size){
  c.beginPath();
  const sz=(S.shapeSize||100)/100, hs=(S.shapeHStretch||100)/100, vs=(S.shapeVStretch||100)/100;
  const base=size*0.5*sz, cx=size/2, cy=size/2;
  c.save();c.translate(cx,cy);c.scale(hs,vs);c.translate(-cx,-cy);
  if(S.shape==='circle'){ c.arc(cx,cy,base-Math.max(2,Math.round(size*0.02)),0,Math.PI*2); }
  else if(S.shape==='polygon'){
    const n=S.shapeSides||4;
    let rOut=base, rIn=rOut;
    const rot=(S.direction||0)*Math.PI/180 - Math.PI/2;
    const pts=[];
    if(S.shapeStar){
      const ang=Math.max(0,Math.min(180,S.shapeInner||0));
      rIn = rOut * (0.05 + ang/180*0.90);
      for(let i=0;i<n*2;i++){const a=rot+i*Math.PI/n;pts.push([cx+Math.cos(a)*(i%2===0?rOut:rIn),cy+Math.sin(a)*(i%2===0?rOut:rIn)]);}
    } else {
      for(let i=0;i<n;i++){const a=rot+i*Math.PI*2/n;pts.push([cx+Math.cos(a)*rOut,cy+Math.sin(a)*rOut]);}
    }
    if(S.radius>0 && S.radius<100){
      let minDist=Infinity;
      for(let i=0;i<pts.length;i++){
        const v=pts[(i-1+pts.length)%pts.length],p=pts[i],q=pts[(i+1)%pts.length];
        minDist=Math.min(minDist,pointToSegDist(p,v,q));
      }
      const r0 = minDist * (S.radius/100) * 0.85;
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
function pointToSegDist(p,v,q){
  const dx=q[0]-v[0],dy=q[1]-v[1];
  const len2=dx*dx+dy*dy;
  if(len2<1e-9)return Math.hypot(p[0]-v[0],p[1]-v[1]);
  let t=((p[0]-v[0])*dx+(p[1]-v[1])*dy)/len2; t=Math.max(0,Math.min(1,t));
  return Math.hypot(p[0]-v[0]-t*dx,p[1]-v[1]-t*dy);
}

"""
t = t.replace(old_sp, new_sp)
print('2 OK: shapePath v2')

# ── 3. 形状 chip 简化 ──
t = t.replace("    {label:'基础',items:[['circle','圆'],['rect','直角方'],['diamond','菱形'],['pills','胶囊']]},",
              "    {label:'基础',items:[['circle','圆']]},")
print('3 OK: shape chips')

# ── 4. matchShape + setShape + updateShapeToggles ──
old_mst = """function matchShape(v){
  if(v==='circle')return S.shape==='circle';
  if(v==='rect')return S.shape==='rect';
  if(v==='diamond')return S.shape==='diamond';
  if(v==='pills')return S.shape==='pills';
  if(v.startsWith('p'))return S.shape==='polygon'&&!S.shapeStar&&S.shapeSides===+v.slice(1);
  if(v.startsWith('s'))return S.shape==='polygon'&&S.shapeStar&&S.shapeSides===+v.slice(1);
  return false;
}
function setShape(v){
  if(v==='circle')S.shape='circle';
  else if(v==='rect')S.shape='rect';
  else if(v==='diamond')S.shape='diamond';
  else if(v==='pills')S.shape='pills';
  else{S.shape='polygon';S.shapeStar=v.startsWith('s');S.shapeSides=+v.slice(1);}
  updateShapeToggles();
}
function updateShapeToggles(){
  const needRad=S.shape==='polygon'||S.shape==='rect'||S.shape==='diamond'||S.shape==='pills';
  const needAng=S.shape==='polygon';
  $('radiusWrap').style.display=needRad?'':'none';
  $('angleWrap').style.display=needAng?'':'none';"""

new_mst = """function matchShape(v){
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
  $('innerWrap').style.display=(S.shape==='polygon'&&S.shapeStar)?'':'none';"""
assert old_mst in t; t = t.replace(old_mst, new_mst, 1); print('4 OK: match/set/toggles')

# ── 5. 外框 HTML 全量替换 ──
old_sec = """      <!-- ① 外框功能区 -->
      <div class="sec">
        <div class="sec-t"><i class="fa-solid fa-ruler-combined"></i>尺寸</div>
        <div class="chip-row" id="sizeChips"></div>
        <div class="sec-t"><i class="fa-solid fa-shapes"></i>形状</div>
        <div class="chip-row" id="shapeChips"></div>
        <div class="form-row" id="radiusWrap" style="margin-top:6px">
          <div class="lbl">弧度</div>
          <input type="range" id="radius" min="0" max="100" value="0">
          <span class="v" id="radiusV">0%</span>
        </div>
        <div class="form-row" id="angleWrap">
          <div class="lbl">角度</div>
          <input type="range" id="shapeAngle" min="0" max="360" value="0">
          <span class="v" id="shapeAngleV">0°</span>
        </div>
      </div>"""

new_sec = """      <!-- ① 外框功能区 → 形状参数 + 边框 + 背景阴影 -->
      <div class="sec">
        <div class="sec-t"><i class="fa-solid fa-shapes"></i>形状</div>
        <div class="chip-row" id="shapeChips"></div>
        <div class="form-row" style="margin-top:6px">
          <div class="lbl">尺寸</div>
          <input type="range" id="shapeSize" min="30" max="120" value="100">
          <span class="v" id="shapeSizeV">100%</span>
          <input type="number" id="shapeSizeNum" min="30" max="120" value="100" class="num-input">
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
        <div class="bd-tabs" style="margin-top:8px">
          <div class="bd-tab active" data-bd="border">边框</div>
          <div class="bd-tab" data-bd="bgshadow">背景阴影</div>
        </div>
        <div id="bdBorder">
          <div class="form-row"><div class="lbl">启用</div><label class="check"><input type="checkbox" id="borderOn"><span>开启边框</span></label></div>
          <div id="borderBox" class="hidden">
            <div class="form-row"><div class="lbl">宽度</div><input type="range" id="borderW" min="1" max="20" value="3"><span class="v" id="borderWV">3px</span><input type="number" id="borderWNum" min="1" max="20" value="3" class="num-input"></div>
            <div class="form-row"><div class="lbl">颜色</div><input type="color" id="borderC" value="#ffffff"></div>
          </div>
        </div>
        <div id="bdShadow" class="hidden">
          <div class="form-row"><div class="lbl">启用</div><label class="check"><input type="checkbox" id="bgShadowOn"><span>开启背景阴影</span></label></div>
          <div id="bgShadowBox" class="hidden">
            <div class="form-row"><div class="lbl">模糊</div><input type="range" id="bgShB" min="0" max="30" value="8"><span class="v" id="bgShBV">8px</span><input type="number" id="bgShBNum" min="0" max="30" value="8" class="num-input"></div>
            <div class="form-row"><div class="lbl">X</div><input type="range" id="bgShX" min="-30" max="30" value="0"><span class="v" id="bgShXV">0px</span><input type="number" id="bgShXNum" min="-30" max="30" value="0" class="num-input"></div>
            <div class="form-row"><div class="lbl">Y</div><input type="range" id="bgShY" min="-30" max="30" value="3"><span class="v" id="bgShYV">3px</span><input type="number" id="bgShYNum" min="-30" max="30" value="3" class="num-input"></div>
            <div class="form-row"><div class="lbl">颜色</div><input type="color" id="bgShC" value="#000000"></div>
          </div>
        </div>
      </div>"""
assert old_sec in t; t = t.replace(old_sec, new_sec, 1); print('5 OK: outer HTML')

# 删除独立边框功能区
old_bd = """      <!-- 边框 & 背景阴影 -->
      <div class="sec">
        <div class="sec-t"><i class="fa-solid fa-square"></i>边框参数 · 背景阴影</div>
        <div class="bd-tabs">
          <div class="bd-tab active" data-bd="border">边框</div>
          <div class="bd-tab" data-bd="bgshadow">背景阴影</div>
        </div>
        <div id="bdBorder">
          <div class="form-row"><div class="lbl">启用</div><label class="check"><input type="checkbox" id="borderOn"><span>开启边框</span></label></div>
          <div id="borderBox" class="hidden">
            <div class="form-row"><div class="lbl">宽度</div><input type="range" id="borderW" min="1" max="10" value="3"><span class="v" id="borderWV">3px</span></div>
            <div class="form-row"><div class="lbl">颜色</div><input type="color" id="borderC" value="#ffffff"></div>
          </div>
        </div>
        <div id="bdShadow" class="hidden">
          <div class="form-row"><div class="lbl">启用</div><label class="check"><input type="checkbox" id="bgShadowOn"><span>开启背景阴影</span></label></div>
          <div id="bgShadowBox" class="hidden">
            <div class="form-row"><div class="lbl">模糊</div><input type="range" id="bgShB" min="0" max="30" value="8"><span class="v" id="bgShBV">8px</span></div>
            <div class="form-row"><div class="lbl">X</div><input type="range" id="bgShX" min="-20" max="20" value="0"><span class="v" id="bgShXV">0px</span></div>
            <div class="form-row"><div class="lbl">Y</div><input type="range" id="bgShY" min="-20" max="20" value="3"><span class="v" id="bgShYV">3px</span></div>
            <div class="form-row"><div class="lbl">颜色</div><input type="color" id="bgShC" value="#000000"></div>
          </div>
        </div>
      </div>"""
t = t.replace(old_bd, '', 1); print('5b OK: old bd removed')

# ── 6. 事件绑定 ──
old_bind = """// shape controls
$('radius').addEventListener('input',e=>{const v=+e.target.value;S.radius=v;$('radiusV').textContent=v+'%';draw();});
$('shapeAngle').addEventListener('input',e=>{const v=+e.target.value;S.shapeAngle=v;$('shapeAngleV').textContent=v+'°';draw();});"""
new_bind = """// shape controls — range+number 双向绑定
function bindRN(rid,nid,setter,clamp){
  const r=$(rid), n=$(nid);
  r.addEventListener('input',e=>{let v=clamp(+e.target.value);setter(v);if(n)n.value=v;draw();});
  if(n)n.addEventListener('change',e=>{let v=clamp(+e.target.value);setter(v);r.value=v;draw();});
}
const c100=v=>Math.max(0,Math.min(100,Math.round(v)));
const c360=v=>Math.max(0,Math.min(360,Math.round(v)));
const c180=v=>Math.max(0,Math.min(180,Math.round(v)));
const c120=v=>Math.max(30,Math.min(120,Math.round(v)));
const c200=v=>Math.max(30,Math.min(200,Math.round(v)));
const c20=v=>Math.max(1,Math.min(20,Math.round(v)));
const c30=v=>Math.max(0,Math.min(30,Math.round(v)));
const cn30=v=>Math.max(-30,Math.min(30,Math.round(v)));
bindRN('shapeSize','shapeSizeNum',v=>{S.shapeSize=v;$('shapeSizeV').textContent=v+'%';},c120);
bindRN('shapeHS','shapeHSNum',v=>{S.shapeHStretch=v;$('shapeHSV').textContent=v+'%';},c200);
bindRN('shapeVS','shapeVSNum',v=>{S.shapeVStretch=v;$('shapeVSV').textContent=v+'%';},c200);
bindRN('radius','radiusNum',v=>{S.radius=v;$('radiusV').textContent=v+'%';},c100);
bindRN('direction','directionNum',v=>{S.direction=v;$('directionV').textContent=v+'°';},c360);
bindRN('shapeInner','shapeInnerNum',v=>{S.shapeInner=v;$('shapeInnerV').textContent=v+'°';},c180);
bindRN('borderW','borderWNum',v=>{S.border.w=v;$('borderWV').textContent=v+'px';},c20);
bindRN('bgShB','bgShBNum',v=>{S.bgShadow.b=v;$('bgShBV').textContent=v+'px';},c30);
bindRN('bgShX','bgShXNum',v=>{S.bgShadow.x=v;$('bgShXV').textContent=v+'px';},cn30);
bindRN('bgShY','bgShYNum',v=>{S.bgShadow.y=v;$('bgShYV').textContent=v+'px';},cn30);
$('borderC').addEventListener('input',e=>{S.border.color=e.target.value;draw();});
$('bgShC').addEventListener('input',e=>{S.bgShadow.color=e.target.value;draw();});"""
assert old_bind in t; t = t.replace(old_bind, new_bind, 1); print('6 OK: binds')

# ── 7. 预设适配 ──
t = t.replace("  if(p.shapeAngle!==undefined)S.shapeAngle=p.shapeAngle;",
              """  if(p.direction!==undefined)S.direction=p.direction;else if(p.shapeAngle!==undefined)S.direction=p.shapeAngle;
  if(p.shapeSize!==undefined)S.shapeSize=p.shapeSize;
  if(p.shapeHStretch!==undefined)S.shapeHStretch=p.shapeHStretch;
  if(p.shapeVStretch!==undefined)S.shapeVStretch=p.shapeVStretch;
  if(p.shapeInner!==undefined)S.shapeInner=p.shapeInner;""")
t = t.replace("$('shapeAngle').value=S.shapeAngle||0;$('shapeAngleV').textContent=(S.shapeAngle||0)+'°';",
              "$('shapeSize').value=S.shapeSize;$('shapeSizeV').textContent=S.shapeSize+'%';$('shapeSizeNum').value=S.shapeSize;$('shapeHS').value=S.shapeHStretch;$('shapeHSV').textContent=S.shapeHStretch+'%';$('shapeHSNum').value=S.shapeHStretch;$('shapeVS').value=S.shapeVStretch;$('shapeVSV').textContent=S.shapeVStretch+'%';$('shapeVSNum').value=S.shapeVStretch;$('radius').value=S.radius;$('radiusV').textContent=S.radius+'%';$('radiusNum').value=S.radius;$('direction').value=S.direction||0;$('directionV').textContent=(S.direction||0)+'°';$('directionNum').value=S.direction||0;$('shapeInner').value=S.shapeInner||0;$('shapeInnerV').textContent=(S.shapeInner||0)+'°';$('shapeInnerNum').value=S.shapeInner||0;")
print('7 OK: preset')

# ── 8. CSS ──
css = ".form-row input[type=\"color\"]{width:32px;height:26px;padding:0;border-radius:5px;border:1px solid var(--border-strong);background:var(--bg-input);cursor:pointer}"
t = t.replace(css, css + """
.form-row .num-input{width:46px;padding:2px 4px;border-radius:4px;border:1px solid var(--border-strong);background:var(--bg-input);color:var(--text);font-size:11px;text-align:center;outline:none;margin-left:4px}
.form-row .num-input:focus{border-color:var(--accent)}""", 1)
print('8 OK: CSS')

# ── 9. 清 sizeChips ──
t = t.replace("buildChips('sizeChips',[[16,'16'],[24,'24'],[32,'32'],[48,'48'],[64,'64'],[96,'96'],[128,'128'],[192,'192'],[256,'256'],[512,'512'],[1024,'1024']],'size');",
              "  // size chips removed — now shapeSize slider")
print('9 OK: sizeChips')

# ── 10. loader guard ──
t = t.replace("f=o.querySelector('.f');document.body.classList.add('lf-lock');",
              "f=o.querySelector('.f');if(!f){fin();return}document.body.classList.add('lf-lock');")
print('10 OK: loader guard')

open('IconMaker.html', 'w', encoding='utf-8').write(t)
print(f'\n🎉 ALL DONE! {len(t)} bytes')
