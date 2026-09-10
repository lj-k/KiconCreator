t = open('IconMaker.html', encoding='utf-8').read()

# ─── 2. 弧度平滑（真实代码版） ───
old_r = """if(S.radius>0 && S.radius<100){
      let minDist=Infinity;
      for(let i=0;i<pts.length;i++){
        const v=pts[(i-1+pts.length)%pts.length],p=pts[i],q=pts[(i+1)%pts.length];
        minDist=Math.min(minDist,pointToSegDist(p,v,q));
      }
      const r0 = minDist * (S.radius/100) * 0.95;"""
new_r = """if(S.radius>0 && S.radius<=100){
      if(S.radius>=99.99){
        c.arc(cx,cy,base-Math.max(2,Math.round(size*0.02)),0,Math.PI*2);
        c.restore();
        return;
      }
      let minDist=Infinity;
      for(let i=0;i<pts.length;i++){
        const v=pts[(i-1+pts.length)%pts.length],p=pts[i],q=pts[(i+1)%pts.length];
        minDist=Math.min(minDist,pointToSegDist(p,v,q));
      }
      const x=S.radius/100;
      const smoothX=1-Math.pow(1-x,2);
      const r0 = minDist * smoothX * 0.95;"""
assert old_r in t, 'old radius not found'
t = t.replace(old_r, new_r, 1); print('2 OK: radius smooth')

# ─── 3. 角星默认 60 ───
if 'shapeInner:0,' in t:
    t = t.replace('shapeInner:0,', 'shapeInner:60,', 1); print('3 OK: shapeInner 60')
else:
    print('3 SKIP')

# ─── 4. sh-pane CSS 去 border ───
old_active = ".sh-pane.active{display:block;background:rgba(70,140,230,.06);border-radius:6px;padding:8px 6px;border:1px solid rgba(70,140,230,.18)}"
new_active = ".sh-pane.active{display:block;background:rgba(70,140,230,.06);border-radius:0 0 6px 6px;padding:8px 6px;border:none}"
if old_active in t:
    t = t.replace(old_active, new_active, 1); print('4 OK: sh-pane no border')
else:
    print('4 SKIP')

old_tabs = ".sh-tabs{display:flex;gap:2px;margin-bottom:6px;background:var(--bg-input);border-radius:6px;padding:2px;border:1px solid var(--border-strong)}"
new_tabs = ".sh-tabs{display:flex;gap:2px;margin-bottom:0;background:var(--bg-input);border-radius:6px 6px 0 0;padding:2px;border:1px solid var(--border-strong);border-bottom:none}"
if old_tabs in t:
    t = t.replace(old_tabs, new_tabs, 1); print('4b OK: sh-tabs bottom border none')
else:
    print('4b SKIP')

# ─── 5. 左栏拆分 ───
old_left = """    <div class="col-hd"><i class="fa-solid fa-eye"></i>预览 · 预设 · 导出</div>
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
new_left = """    <div class="col-hd"><i class="fa-solid fa-eye"></i>预览 · 预设 · 导出</div>
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
assert old_left in t, 'old left html not found'
t = t.replace(old_left, new_left, 1); print('5 OK: left split')

open('IconMaker.html', 'w', encoding='utf-8').write(t)
print('v4_a2 done')
