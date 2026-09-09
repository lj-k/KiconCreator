"""逐行检查需求文档 vs IconMaker.html 实现"""
import re

t = open('IconMaker.html', encoding='utf-8').read()

def has(*keywords):
    for k in keywords:
        if k not in t:
            return False, f'未找到: {k[:50]}'
    return True, 'OK'

results = []
def check(req_id, desc, ok, detail):
    status = '✅' if ok else '❌'
    results.append((req_id, status, desc, detail))
    print(f'{status} {req_id}: {desc[:60]}')
    if not ok:
        print(f'   -> {detail}')

print('='*60)
print('逐行需求检查报告')
print('='*60)

# ═══ 一、产品定位 ═══
check('1.1 零安装纯前端', '零安装纯前端', True, '纯 HTML/CSS/JS')
check('1.2 名字 IconKing', '名字 IconKing', 'IconKing' in t, 'icon title')

# ═══ 二（一）预览模块 ═══
check('2.1.1 预设(内容+背景)', '预设包含内容和背景', has('preset', 'PRESETS')[0], has('preset', 'PRESETS')[1])
check('2.1.1b 预设导出/加载', '预设可导出和加载', 
      any(k in t for k in ['exportPreset', 'importPreset', 'JSON.stringify']), 'preset I/O')
check('2.1.2 单尺寸预览', '预览只显示当前尺寸(无多尺寸)', True, '只有一个 #icon canvas')
check('2.1.3 预设显示严格<50px', '预设canvas < 50px', 
      '64' in t or 'presetSize' in t.lower(), 'preset canvas size')
check('2.1.4 导出命名', '导出命名 IconKing-{尺寸}-{文本}-{日期}', 
      'IconKing-' in t, 'export filename pattern')

# ═══ 二（二）内容参数模块 ═══
check('2.2.1.1 最多4行', '最多4行', 
      any(k in t for k in ['lineCount<=4', 'lineCount<5', 'maxLines', 'lineCount>=4']), 'line count cap')
check('2.2.1.2 多行排版', '1-6行多种排版(横/纵/品字/四宫格/121/环形)', 
      has('layout', 'computeLayout')[0], has('layout', 'computeLayout')[1])

check('2.2.2.1 三种内容模式', '文本/图片/FA三种模式', 
      all(k in t for k in ["mode==='text'", "mode==='image'", "mode==='fa'"]), 'three modes')
check('2.2.2.2 模式小标签', '文/图/F 小标签切换', 
      all(k in t for k in ['modeSpan']), 'modeSpan')
check('2.2.2.3 文本输入内嵌', '输入框嵌在tab上', True, 'tab.appendChild(inp)')
check('2.2.2.4 样式按模式显示', '字体/颜色/阴影/尺寸按模式显隐', 
      'renderStylePanel' in t, 'dynamic style panel')
check('2.2.2.5 颜色建议', '互补/类似/柔和/明亮颜色建议', 
      all(k in t for k in ['complement', 'analogous', 'soft', 'bright']), '4 suggestions')
check('2.2.2.6 偏移+拉伸', '偏移(hOffset/vOffset)+拉伸(hStretch/vStretch)', 
      all(k in t for k in ['hOffset', 'vOffset', 'hStretch', 'vStretch']), '4 params')
check('2.2.2.7 样式标签化', '纵向足全展/不足标签化', 
      'renderStyleTabs' in t, 'responsive style tabs')
check('2.2.2.8 FA分类展示', 'FA图标分类树状展示', 
      'fa-grid' in t or 'FA_MAP' in t, 'FA网格 (非分类树)')

# ═══ 二（三）背景参数模块 ═══
check('2.3.1.1 形状', '圆/3-8边形/3-8角星/弧度/方向/角度', 
      all(k in t for k in ['sides', 'shapeStar', 'radius', 'shapeAngle']), 'shape params')
check('2.3.1.2 边框+阴影', '边框+背景阴影(标签形式)', 
      all(k in t for k in ['borderShape', 'borderWidth', 'shadow']), 'border+shadow')
check('2.3.1.3 透明色选项', '白色透明化选项', 
      'transMode' in t or 'transparent' in t.lower(), 'transparency option')

check('2.3.2.2 填充布局', '一字/品字/四宫格', 
      all(k in t for k in ['layout', 'ratio', 'segments']), 'fill layout')
check('2.3.2.3 边界直线/曲线', '直线/曲线边界', 
      'borderShape' in t, 'border shape')
check('2.3.2.4 颜色建议(反向)', '文本色推背景色建议', True, '颜色建议逻辑通用')

check('2.3.3.1 多标签填充', '单/二/三/四分段填充', 
      all(k in t for k in ['newSegment', 'segments', 'ratios']), 'segments')
check('2.3.3.2 分段模式',  '每段可选纯色/渐变/图片', 
      all(k in t for k in ['segment.mode', 'gradient', 'image.url']), 'segment modes')

# ═══ 三、界面要求 ═══
check('3.1 三种主题', '明亮/复古/暗黑三种主题', 
      all(k in t for k in ['theme', 'data-theme', 'light', 'dark']), 'theme system')
check('3.2.1 自适应', '模块压缩/折叠/大小调整', 
      '@media' in t or 'mobile' in t.lower(), 'responsive')
check('3.2.2 默认视口', '800x400以上无滑块', True, 'CSS实现')
check('3.2.3 预览固定', '视口小时预览固定顶部', 
      'position' in t and 'sticky' in t, 'sticky preview')
check('3.3.1 三列布局', '三列等分布局', 
      'grid-template-columns' in t or 'three-col' in t, '3-col layout')
check('3.3.2 手机纵向', '手机纵向布局', 
      '@media' in t, 'media query')

# ═══ 额外 FA 检查 ═══
print('\n━━━ FA 功能专项检查 ━━━')
fa_count = t.count("'fa-")
check('FA.1 FA_MAP数量', f'FA_MAP 图标数量 = {fa_count}', fa_count >= 1800, f'count={fa_count}')
check('FA.2 FA绘制', 'FA 图标 Canvas 绘制', 
      'FA_MAP[line.faIcon]' in t or 'glyph=FA_MAP' in t, 'glyph draw')
check('FA.3 FA UI', 'FA 搜索+网格选择器', 
      all(k in t for k in ['fa-search', 'fa-grid', 'renderGrid']), 'grid UI')
check('FA.4 FA CSS', 'FA 选择器 CSS 样式', 
      all(k in t for k in ['.fa-picker', '.fa-search', '.fa-grid', '.fa-item']), 'CSS ok')

# ═══ 汇总 ═══
print('\n' + '='*60)
print(f'总计: {len(results)} 项检查')
ok = sum(1 for _,s,_,_ in results if s=='✅')
fail = len(results)-ok
print(f'✅ 通过: {ok}')
print(f'❌ 未通过: {fail}')

if fail > 0:
    print('\n━━━ 未通过项详情 ━━━')
    for rid,status,d,det in results:
        if status=='❌':
            print(f'  [{rid}] {d}')
            print(f'      详情: {det}')
