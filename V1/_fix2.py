t = open('IconMaker.html', encoding='utf-8').read()

# 1) drawShapeOuter: shape='none' 跳过 + bgShadow.size 缩放
old_draw_shape_outer = """function drawShapeOuter(c,size){
  if(S.bgShadow&&S.bgShadow.on){
    c.save();
    c.shadowColor=(S.bgShadow.color||'#000000')+'73';
    c.shadowBlur=Math.round((S.bgShadow.b||8)*size/256);
    c.shadowOffsetX=Math.round((S.bgShadow.x||0)*size/256);
    c.shadowOffsetY=Math.round((S.bgShadow.y||3)*size/256);
    shapePath(c,size);c.fillStyle='rgba(0,0,0,.01)';c.fill();
    c.restore();
  }"""
new_draw_shape_outer = """function drawShapeOuter(c,size){
  // shape=none 时不绘制任何外框
  if(S.shape==='none')return;
  if(S.bgShadow&&S.bgShadow.on){
    const sz=(S.bgShadow.size||100)/100;
    c.save();
    c.shadowColor=(S.bgShadow.color||'#000000')+'73';
    c.shadowBlur=Math.round((S.bgShadow.b||8)*size/256*sz);
    c.shadowOffsetX=Math.round((S.bgShadow.x||0)*size/256*sz);
    c.shadowOffsetY=Math.round((S.bgShadow.y||3)*size/256*sz);
    shapePath(c,size);c.fillStyle='rgba(0,0,0,.01)';c.fill();
    c.restore();
  }"""
assert old_draw_shape_outer in t; t = t.replace(old_draw_shape_outer, new_draw_shape_outer, 1); print('1 drawShapeOuter OK')

# 2) drawBg 里 shape=none 跳过
old_drawbg_clip = """function drawBg(c,size){
  c.save();
  shapePath(c,size);c.clip();"""
new_drawbg_clip = """function drawBg(c,size){
  c.save();
  if(S.shape==='none'){
    // 无形状时画整个画布
    const m=Math.max(2,Math.round(size*0.02));
    c.rect(m,m,size-m*2,size-m*2);c.clip();
  } else {
    shapePath(c,size);c.clip();
  }"""
assert old_drawbg_clip in t; t = t.replace(old_drawbg_clip, new_drawbg_clip, 1); print('2 drawBg none-clip OK')

# 3) 预设回填加 bgShS — 找现有回填的 bgShadow 相关行
old_preset_shadow_ui = """  $('bgShB').value=S.bgShadow.b;$('bgShBV').textContent=S.bgShadow.b+'px';$('bgShX').value=S.bgShadow.x;$('bgShXV').textContent=S.bgShadow.x+'px';"""
new_preset_shadow_ui = """  $('bgShS').value=S.bgShadow.size||100;$('bgShSV').textContent=(S.bgShadow.size||100)+'%';if($('bgShSNum'))$('bgShSNum').value=S.bgShadow.size||100;$('bgShB').value=S.bgShadow.b;$('bgShBV').textContent=S.bgShadow.b+'px';$('bgShX').value=S.bgShadow.x;$('bgShXV').textContent=S.bgShadow.x+'px';"""
if old_preset_shadow_ui in t: t = t.replace(old_preset_shadow_ui, new_preset_shadow_ui, 1); print('3 preset bgShS UI OK')
else: print('3 preset anchor SKIP')

# 4) 预设数据加载兼容旧 shape 值 rect/diamond/pills → rounded-rect/none
old_preset_shape = """  if(p.direction!==undefined)S.direction=p.direction;else if(p.shapeAngle!==undefined)S.direction=p.shapeAngle;"""
# 在这行前面加旧 shape 兼容迁移
old_shape_line = "  if(p.direction!==undefined)S.direction=p.direction;else if(p.shapeAngle!==undefined)S.direction=p.shapeAngle;"
new_shape_line = """  // 旧 shape 迁移
  if(p.shape==='rect')S.shape='rounded-rect';
  else if(p.shape==='diamond'||p.shape==='pills')S.shape='polygon';
  else if(p.shape&&p.shape!=='circle'&&p.shape!=='polygon'&&p.shape!=='rounded-rect'){S.shape='none';}
  if(p.shape!==undefined && ['none','circle','polygon','rounded-rect'].includes(p.shape))S.shape=p.shape;
  if(p.direction!==undefined)S.direction=p.direction;else if(p.shapeAngle!==undefined)S.direction=p.shapeAngle;"""
cnt = t.count(old_shape_line)
if cnt > 0:
    t = t.replace(old_shape_line, new_shape_line)
    print(f'4 preset shape compat OK ({cnt} occurrences)')
else:
    print('4 preset anchor SKIP')

open('IconMaker.html', 'w', encoding='utf-8').write(t)
print('saved')
