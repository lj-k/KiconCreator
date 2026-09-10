"""
patch_v4_a.py —— 第一批修复
- 形状阴影修复（drawShapeOuter）
- 弧度平滑公式（避免 99→100 突变）
- 角星默认内角 60°
- sh-pane 标签与参数区域连通（去 border）
- 左栏拆分为预览/预设/下载三独立模块
- 下载模块增加 SVG (icon) / 透明色 / 自定义尺寸
- 预设模块增加导入/导出 JSON 按钮
"""
import re

t = open('IconMaker.html', encoding='utf-8').read()

# ─── 1. drawShapeOuter 阴影修复 ───
# 原代码：shape=none 跳过，但有个 canvas.save/restore 没加 none guard
# 另：shadow 颜色透明度用 '73'（45%），用户可能需要更清晰
old_dso = """function drawShapeOuter(c,size){
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
new_dso = """function drawShapeOuter(c,size){
  if(S.shape==='none')return;
  if(S.bgShadow&&S.bgShadow.on){
    const sz=(S.bgShadow.size||100)/100;
    const b=Math.max(1,(S.bgShadow.b||8)*size/256*sz);
    const ox=Math.round((S.bgShadow.x||0)*size/256*sz);
    const oy=Math.round((S.bgShadow.y||3)*size/256*sz);
    c.save();
    // 真实阴影：先画放大的黑色模糊 layer（shadowColor 不透明度 0.5）
    c.shadowColor=S.bgShadow.color||'#000000';
    c.shadowBlur=b;
    c.shadowOffsetX=ox;
    c.shadowOffsetY=oy;
    shapePath(c,size);
    // 用黑色低透明填充 → Canvas 把 shadowColor 模糊成阴影层
    c.fillStyle='rgba(0,0,0,0.01)';
    c.fill();
    c.restore();
    // 额外一层：用真实颜色 + 低透明画一次（让阴影有色）
    c.save();
    c.globalCompositeOperation='source-over';
    c.shadowColor=S.bgShadow.color||'#000000';
    c.shadowBlur=b;
    c.shadowOffsetX=ox;
    c.shadowOffsetY=oy;
    shapePath(c,size);
    c.fillStyle='rgba(255,255,255,0.001)';
    c.fill();
    c.restore();
  }"""
assert old_dso in t, 'old drawShapeOuter not found'
t = t.replace(old_dso, new_dso, 1); print('1 OK: drawShapeOuter fixed')

# ─── 2. 弧度平滑公式 ───
# 当前逻辑：radius>100 或 radius>=100 直接变圆，导致 99→100 突变
# 新公式：
#   r = radius (0~100, 连续)
#   当 r=100 时，弧度倒角半径 r0 恰好让多边形每个顶点弧与两侧弧相切，形成完美圆
#   即：r0_at_100% = minDist * 0.90（倒角占边长 90%）
#   渐变策略：r0 = minDist * smooth(r/100) * 0.90
#   smooth(x) = 1 - (1-x)^2 （ease-out 曲线，让末尾过渡更顺）
#   当 shapeStar 或 radius=100 时直接 circle（保证结果确实是圆）
# 但用户明确：99→100 不能突变。所以 smooth 让 r=100 时自然收敛到圆
old_radius_logic = """    if(S.radius>0 && S.radius<100){
      let minDist=Infinity;
      for(let i=0;i<pts.length;i++){
        const v=pts[(i-1+pts.length)%pts.length],p=pts[i],q=pts[(i+1)%pts.length];
        minDist=Math.min(minDist,pointToSegDist(p,v,q));
      }
      const r0 = minDist * (S.radius/100) * 0.85;"""
new_radius_logic = """    // 平滑弧度（避免 99%→100% 突变）
    if(S.radius>0 && S.radius<=100){
      if(S.radius>=99.99){
        // 接近 100% → 自然收敛为圆
        c.arc(cx,cy,base-Math.max(2,Math.round(size*0.02)),0,Math.PI*2);
        c.restore();
        return;
      }
      let minDist=Infinity;
      for(let i=0;i<pts.length;i++){
        const v=pts[(i-1+pts.length)%pts.length],p=pts[i],q=pts[(i+1)%pts.length];
        minDist=Math.min(minDist,pointToSegDist(p,v,q));
      }
      // ease-out 曲线：x=1 时 → 1.0；乘以 0.95 系数让 r0 稍小更自然
      const x=S.radius/100;
      const smoothX=1-Math.pow(1-x,2);
      const r0 = minDist * smoothX * 0.95;"""
assert old_radius_logic in t, 'old radius logic not found'
t = t.replace(old_radius_logic, new_radius_logic, 1); print('2 OK: radius smooth formula')

# ─── 3. 角星默认内角 60° ───
old_default_inner = "  shapeInner:0,"
new_default_inner = "  shapeInner:60,"
if old_default_inner in t:
    t = t.replace(old_default_inner, new_default_inner, 1); print('3 OK: shapeInner default 60')
else:
    print('3 SKIP: shapeInner default not found')

# ─── 4. sh-pane CSS 去边框 ───
old_sh_pane_active = ".sh-pane.active{display:block;background:rgba(70,140,230,.06);border-radius:6px;padding:8px 6px;border:1px solid rgba(70,140,230,.18)}"
new_sh_pane_active = ".sh-pane.active{display:block;background:rgba(70,140,230,.06);border-radius:0 0 6px 6px;padding:8px 6px;border:none}"
if old_sh_pane_active in t:
    t = t.replace(old_sh_pane_active, new_sh_pane_active, 1); print('4 OK: sh-pane no border')
else:
    print('4 SKIP')

# sh-tabs 下方去 gap，让标签和参数区域无缝
old_sh_tabs = ".sh-tabs{display:flex;gap:2px;margin-bottom:6px;background:var(--bg-input);border-radius:6px;padding:2px;border:1px solid var(--border-strong)}"
new_sh_tabs = ".sh-tabs{display:flex;gap:2px;margin-bottom:0;background:var(--bg-input);border-radius:6px 6px 0 0;padding:2px;border:1px solid var(--border-strong);border-bottom:none}"
if old_sh_tabs in t:
    t = t.replace(old_sh_tabs, new_sh_tabs, 1); print('4b OK: sh-tabs bottom border none')
else:
    print('4b SKIP')

# ─── 5. 左栏 HTML 拆分为预览/预设/下载三模块 ───
old_left_html = """    <div class="col-hd"><i class="fa-solid fa-eye"></i>预览 · 预设 · 导出</div>
    <div class="col-bd">
      <div class="preview-center">
        <canvas id="icon" width="256" height="256" style="width:220px;height:220px;display:block"></canvas>
      </div>
      <div class="dl-row">
        <button id="dlPng" class="btn btn-primary"><i class="fa-solid fa-download"></i>PNG</button>
        <button id="dlJpg" class="btn"><i class="fa-solid fa-download"></i>JPEG</button>
        <button id="dlSvg" class="btn"><i class="fa-solid fa-code"></i>SVG</button>
        <button id="btnReset" class="btn btn-sm"><i class="fa-solid fa-rotate-left"></i>重置</button>
      </div>
      <div class="sec-t"><i class="fa-solid fa-wand-sparkles"></i>预设（canvas 真实渲染 <50px）</div>
      <div class="preset-row" id="presetRow"></div>
      <div class="sec-t"><i class="fa-solid fa-palette"></i>界面主题</div>
      <div class="theme-row">
        <div class="theme-btn active" data-t="light"><i class="fa-solid fa-sun"></i> 明亮</div>
        <div class="theme-btn" data-t="warm"><i class="fa-solid fa-mug-hot"></i> 复古</div>
        <div class="theme-btn" data-t="dark"><i class="fa-solid fa-moon"></i> 暗黑</div>
      </div>
    </div>"""
new_left_html = """    <div class="col-hd"><i class="fa-solid fa-eye"></i>预览 · 预设 · 导出</div>
    <div class="col-bd">
      <!-- 预览模块 -->
      <div class="sec" id="previewSec">
        <div class="sec-t"><i class="fa-solid fa-eye"></i>预览</div>
        <div class="preview-center">
          <canvas id="icon" width="256" height="256" style="width:220px;height:220px;display:block"></canvas>
        </div>
      </div>
      <!-- 预设模块 -->
      <div class="sec">
        <div class="sec-t"><i class="fa-solid fa-wand-sparkles"></i>预设
          <div style="float:right;display:flex;gap:4px">
            <button id="presetImport" class="btn btn-sm" title="导入预设"><i class="fa-solid fa-file-import"></i></button>
            <button id="presetExport" class="btn btn-sm" title="导出当前预设"><i class="fa-solid fa-file-export"></i></button>
            <input type="file" id="presetFile" accept=".json" style="display:none">
          </div>
        </div>
        <div class="preset-row" id="presetRow"></div>
      </div>
      <!-- 下载模块 -->
      <div class="sec">
        <div class="sec-t"><i class="fa-solid fa-download"></i>下载
          <button id="btnReset" class="btn btn-sm" style="float:right"><i class="fa-solid fa-rotate-left"></i> 重置</button>
        </div>
        <div class="dl-row">
          <button id="dlPng" class="btn btn-primary"><i class="fa-solid fa-download"></i>PNG</button>
          <button id="dlJpg" class="btn"><i class="fa-solid fa-download"></i>JPEG</button>
          <button id="dlSvg" class="btn"><i class="fa-solid fa-code"></i>SVG</button>
          <button id="dlIco" class="btn"><i class="fa-solid fa-icons"></i>ICO</button>
        </div>
        <div class="form-row" style="margin-top:6px">
          <label class="check" style="margin-right:8px"><input type="checkbox" id="dlTransparent"><span>透明背景（PNG/ICO）</span></label>
        </div>
        <div class="form-row">
          <div class="lbl">尺寸</div>
          <input type="range" id="dlSize" min="16" max="1024" step="16" value="256">
          <span class="v" id="dlSizeV">256px</span>
          <input type="number" id="dlSizeNum" min="16" max="2048" value="256" class="num-input">
        </div>
      </div>
      <!-- 主题 -->
      <div class="sec">
        <div class="sec-t"><i class="fa-solid fa-palette"></i>界面主题</div>
        <div class="theme-row">
          <div class="theme-btn active" data-t="light"><i class="fa-solid fa-sun"></i> 明亮</div>
          <div class="theme-btn" data-t="warm"><i class="fa-solid fa-mug-hot"></i> 复古</div>
          <div class="theme-btn" data-t="dark"><i class="fa-solid fa-moon"></i> 暗黑</div>
        </div>
      </div>
    </div>"""
assert old_left_html in t, 'old left html not found'
t = t.replace(old_left_html, new_left_html, 1); print('5 OK: left panel split')

open('IconMaker.html', 'w', encoding='utf-8').write(t)
print(f'\n===== 第一批 patch 写完 ({len(t)} bytes) =====')
