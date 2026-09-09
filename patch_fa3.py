import sys
bigmap = open('fa_map_out.js',encoding='utf-8').read()
# 把 FA_MAP_ALL 改名 FA_MAP（全局）
bigmap = bigmap.replace('const FA_MAP_ALL =', 'const FA_MAP =')

t = open('IconMaker.html',encoding='utf-8').read()

# 1) 把 FA_MAP 大字典放到 IIFE 顶层 DEFAULTS 之前
def_idx = t.find('const DEFAULTS')
print('1) DEFAULTS at:', def_idx)
if def_idx > 0:
    t = t[:def_idx] + bigmap + '\n' + t[def_idx:]
    print('   FA_MAP inserted before DEFAULTS')

# 2) 找 drawContent 里 text 分支结尾，插入 FA 绘制代码
# 模式: "c.restore();\n      }\n    } else if(line.mode==='fa'){\n      // 搜索框"
needle = "c.restore();\n      }\n    } else if(line.mode==='fa'){\n      // 搜索框"
idx = t.find(needle)
print('2) text branch end at:', idx)

insert_fa = '''    } else if(line.mode==='fa'){
      const glyph=FA_MAP[line.faIcon]||'';
      if(!glyph)return;
      let fs=size*(line.faSize||65)/100;
      c.save();c.translate(cx,cy);
      c.globalAlpha=1;c.globalCompositeOperation='source-over';
      c.font=`${fs}px "Font Awesome 6 Free","FontAwesome","Inter",sans-serif`;
      c.textAlign='center';c.textBaseline='middle';
      c.fillStyle=line.faColor||'#fff';
      c.fillText(glyph,0,0);
      c.restore();
    } else if(line.mode==='image'&&line.imgUrl){
      const img=line._img||(line._img=new Image());
      if(img.src!==line.imgUrl){img.onload=()=>{line._needsRedraw=true;};img.src=line.imgUrl;}
      if(img.complete&&img.naturalWidth>0){
        const s=(line.imgScale||100)/100,r=Math.min(size*0.7/img.width,size*0.4/img.height),dw=img.width*r*s,dh=img.height*r*s;
        c.drawImage(img,cx-dw/2,cy-dh/2,dw,dh);
      }
    }
    if(hasShadow){c.restore();}
  });
}

'''
if idx > 0:
    marker = "c.restore();\n      }\n"
    t = t[:idx + len(marker)] + insert_fa + t[idx + len(marker):]
    print('   FA draw code inserted')

open('IconMaker.html','w',encoding='utf-8').write(t)
print('saved. new size:', len(t))
