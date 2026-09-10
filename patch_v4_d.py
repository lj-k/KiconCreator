"""
patch_v4_d.py —— 多行 6 行 + LAYOUTS 扩展 + computeLayout 扩展
"""
t = open('IconMaker.html', encoding='utf-8').read()

# ─── 1. renderLineCount: 1..6 ───
old_rlc = """function renderLineCount(){
  const b=$('lineCountChips');b.innerHTML='';
  for(let i=1;i<=4;i++){
    const el=document.createElement('div');
    el.className='chip'+(S.lineCount===i?' active':'');
    el.textContent=i+' 行';
    el.onclick=()=>{
      S.lineCount=i;while(S.lines.length<i)S.lines.push(newLine());while(S.lines.length>i)S.lines.pop();
      S.currentLine=Math.min(S.currentLine,i-1);renderAll();draw();
    };
    b.appendChild(el);
  }
}"""
new_rlc = """function renderLineCount(){
  const b=$('lineCountChips');b.innerHTML='';
  const max=6;
  for(let i=1;i<=max;i++){
    const el=document.createElement('div');
    el.className='chip'+(S.lineCount===i?' active':'');
    el.textContent=i+' 行';
    el.onclick=()=>{
      S.lineCount=i;while(S.lines.length<i)S.lines.push(newLine());while(S.lines.length>i)S.lines.pop();
      S.currentLine=Math.min(S.currentLine,i-1);renderAll();draw();
    };
    b.appendChild(el);
  }
}"""
assert old_rlc in t, 'old rlc not found'
t = t.replace(old_rlc, new_rlc, 1); print('1 OK: lineCount 1-6')

# ─── 2. LAYOUTS 扩展 ───
old_layouts = """const LAYOUTS=[,[['h-center','居中'],['h-top','上半边'],['h-bottom','下半边'],['v-left','左半边'],['v-right','右半边']],[['v-top-bot','上下'],['h-left-right','左右']],[['t-default','品字'],['t-inverted','倒品']],[['grid','四宫格'],['l-121','1-2-1']]];"""
new_layouts = """const LAYOUTS=[
  null,
  // 1 行：上/下/左/右/居中
  [['h-center','居中'],['h-top','上半边'],['h-bottom','下半边'],['v-left','左半边'],['v-right','右半边']],
  // 2 行：全上/全下/全左/全右/左右分/上下分
  [['h-left-right','左右分'],['v-top-bot','上下分'],['all-top','全在上'],['all-bottom','全在下'],['all-left','全在左'],['all-right','全在右']],
  // 3 行：一字横/一字纵/品字/倒品
  [['row-h','一字横排'],['row-v','一字纵排'],['t-default','品字'],['t-inverted','倒品']],
  // 4 行：一字横/一字纵/四宫格/1-2-1 纵/1-2-1 横
  [['row-h','一字横排'],['row-v','一字纵排'],['grid','四宫格'],['l-121-v','纵121'],['l-121-h','横121']],
  // 5 行：一字横/一字纵/环形
  [['row-h','一字横排'],['row-v','一字纵排'],['ring','环形']],
  // 6 行：一字横/一字纵/环形
  [['row-h','一字横排'],['row-v','一字纵排'],['ring','环形']]
];"""
assert old_layouts in t, 'old layouts not found'
t = t.replace(old_layouts, new_layouts, 1); print('2 OK: layouts expanded')

# ─── 3. computeLayout 扩展 ───
old_cl_tail = """  } else if(lc===4){
    if(layout==='l-"""
# 找完整 computeLayout 直到 } 函数结束
idx_cl = t.find('function computeLayout')
# 找到函数结束：从 idx_cl 开始，平衡花括号
brace=0;end=idx_cl
for i in range(idx_cl, len(t)):
    if t[i]=='{': brace+=1
    elif t[i]=='}':
        brace-=1
        if brace==0:
            end=i+1;break
old_cl = t[idx_cl:end]
print('computeLayout length:', len(old_cl))
# 替换成新扩展版
new_cl = """function computeLayout(lc,layout,size){
  const cx=size/2,cy=size/2,m=size*0.14,W=size-m*2,H=size-m*2,pos=[];
  // 公共：环形辅助
  const ringPts=(n,r)=>{const arr=[];for(let i=0;i<n;i++){const a=-Math.PI/2+i*Math.PI*2/n;arr.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}return arr;};
  
  if(lc===1){
    if(layout==='h-top')pos.push([cx,m+H*0.18]);
    else if(layout==='h-bottom')pos.push([cx,m+H*0.82]);
    else if(layout==='v-left')pos.push([m+W*0.18,cy]);
    else if(layout==='v-right')pos.push([m+W*0.82,cy]);
    else pos.push([cx,cy]);
  } else if(lc===2){
    if(layout==='all-top'){pos.push([cx,cy-H*0.3]);pos.push([cx,cy-H*0.3]);}
    else if(layout==='all-bottom'){pos.push([cx,cy+H*0.3]);pos.push([cx,cy+H*0.3]);}
    else if(layout==='all-left'){pos.push([cx-W*0.3,cy]);pos.push([cx-W*0.3,cy]);}
    else if(layout==='all-right'){pos.push([cx+W*0.3,cy]);pos.push([cx+W*0.3,cy]);}
    else if(layout==='h-left-right'){pos.push([cx-W*0.25,cy]);pos.push([cx+W*0.25,cy]);}
    else{pos.push([cx,cy-H*0.25]);pos.push([cx,cy+H*0.25]);}
  } else if(lc===3){
    if(layout==='row-h'){for(let i=0;i<3;i++)pos.push([cx-W*0.3+i*W*0.3,cy]);}
    else if(layout==='row-v'){for(let i=0;i<3;i++)pos.push([cx,cy-H*0.3+i*H*0.3]);}
    else if(layout==='t-inverted'){pos.push([cx,cy+H*0.28]);pos.push([cx-W*0.25,cy-H*0.12]);pos.push([cx+W*0.25,cy-H*0.12]);}
    else{pos.push([cx,cy-H*0.28]);pos.push([cx-W*0.25,cy+H*0.12]);pos.push([cx+W*0.25,cy+H*0.12]);}
  } else if(lc===4){
    if(layout==='row-h'){for(let i=0;i<4;i++)pos.push([cx-W*0.35+i*W*0.233,cy]);}
    else if(layout==='row-v'){for(let i=0;i<4;i++)pos.push([cx,cy-H*0.35+i*H*0.233]);}
    else if(layout==='grid'){pos.push([cx-W*0.25,cy-H*0.25]);pos.push([cx+W*0.25,cy-H*0.25]);pos.push([cx-W*0.25,cy+H*0.25]);pos.push([cx+W*0.25,cy+H*0.25]);}
    else if(layout==='l-121-v'){pos.push([cx,cy-H*0.25]);pos.push([cx-W*0.28,cy]);pos.push([cx+W*0.28,cy]);pos.push([cx,cy+H*0.25]);}
    else{/* l-121-h 默认 */pos.push([cx-W*0.28,cy-H*0.15]);pos.push([cx-W*0.28,cy+H*0.15]);pos.push([cx,cy]);pos.push([cx+W*0.28,cy-H*0.15]);pos.push([cx+W*0.28,cy+H*0.15]);pos.length=4;}
  } else if(lc===5){
    if(layout==='row-h'){for(let i=0;i<5;i++)pos.push([cx-W*0.4+i*W*0.2,cy]);}
    else if(layout==='row-v'){for(let i=0;i<5;i++)pos.push([cx,cy-H*0.4+i*H*0.2]);}
    else{pos.push([cx,cy]);pos.push(...ringPts(4,Math.min(W,H)*0.32));}
  } else if(lc===6){
    if(layout==='row-h'){for(let i=0;i<6;i++)pos.push([cx-W*0.45+i*W*0.18,cy]);}
    else if(layout==='row-v'){for(let i=0;i<6;i++)pos.push([cx,cy-H*0.45+i*H*0.18]);}
    else{pos.push(...ringPts(6,Math.min(W,H)*0.32));}
  }
  return pos;
}"""
assert old_cl in t, 'old computeLayout not found'
t = t.replace(old_cl, new_cl, 1); print('3 OK: computeLayout expanded')

open('IconMaker.html', 'w', encoding='utf-8').write(t)
print('v4_d done')
