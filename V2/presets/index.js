/* ============================================================
   KiconCreator V2 · presets/index.js
   —— 本地预设清单（启动时自动加载；**本文件可直接手工编辑**）——

   ▍怎么添加预设
     把「导出预设」得到的 json 内容**原样**粘贴成一个条目（JSON 是 JS 对象字面量的子集，
     双引号、null、true/false 都照原样保留，无需改写）：

       window.KICON_LOCAL_PRESETS = {
         files: {
           "我的预设.json": { "type": "kicon-preset", "version": "2.22", "name": "我的预设",
                             "time": 0, "snap": { …导出文件里的 snap 原文… } },
           "第二个预设.json": { … },
         }
       };

   ▍规则
     - 键（引号里的那个名字）只用于标识与去重：预设名优先取内容里的 name 字段，没有 name 才用键名。
     - 每个条目必须是**单个对象字面量**；条目之间用逗号分隔；**最后一条后面不要留逗号**。
     - 整份文件必须能被浏览器正常解析：一处语法错 → 一条预设都加载不出来
       （应用本身仍会正常启动，控制台会给出 [本地预设] 提示）。
     - 含图片的预设（snap.rows[].image.data 是 dataURL）会非常长，粘贴时不要截断。
     - 保存后刷新页面即可看到，无需任何构建/生成步骤；http 与 file:// 双击打开行为一致。

   ▍格式参考
     下面这条示例即为「导出预设」的完整产物，可直接复制改造。
   ============================================================ */
window.KICON_LOCAL_PRESETS = {
  files: {

    "福":      {
        "version": "2.22",
        "rowCount": 1,
        "activeRow": 0,
        "rows": [
          {
            "mode": "text",
            "text": "福",
            "faName": null,
            "image": {
              "name": "",
              "w": 0,
              "h": 0,
              "crop": {
                "aspect": "原图",
                "zoom": 1,
                "ox": 0,
                "oy": 0
              }
            },
            "params": {
              "style.size": 49,
              "style.angle": 0,
              "style.scaleX": 100,
              "style.scaleY": 100,
              "style.offsetX": 0,
              "style.offsetY": 0,
              "style.clip": true,
              "color.mode": "单色",
              "color.c1": "#ffc800",
              "color.c2": "#22D3EE",
              "image.whiteTransparent": false,
              "shadow.enabled": false,
              "shadow.color": "#1D2333",
              "shadow.size": 12,
              "shadow.blur": 10,
              "shadow.x": 0,
              "shadow.y": 4,
              "font.cn": "思源黑体",
              "font.en": "系统默认",
              "font.weight": "常规",
              "font.italic": false,
              "font.layout": "横排",
              "font.size": 100
            },
            "link": {
              "style.size": false,
              "style.angle": false,
              "style.scaleX": false,
              "style.scaleY": false,
              "style.offsetX": false,
              "style.offsetY": false,
              "style.clip": false,
              "color.mode": false,
              "color.c1": false,
              "color.c2": false,
              "image.whiteTransparent": false,
              "shadow.enabled": false,
              "shadow.color": false,
              "shadow.size": false,
              "shadow.blur": false,
              "shadow.x": false,
              "shadow.y": false,
              "font.cn": false,
              "font.en": false,
              "font.weight": false,
              "font.italic": false,
              "font.layout": false,
              "font.size": false
            }
          },
          {
            "mode": "text",
            "text": "ICON",
            "faName": null,
            "image": {
              "name": "",
              "w": 0,
              "h": 0,
              "crop": {
                "aspect": "原图",
                "zoom": 1,
                "ox": 0,
                "oy": 0
              }
            },
            "params": {
              "style.size": 100,
              "style.angle": 0,
              "style.scaleX": 100,
              "style.scaleY": 100,
              "style.offsetX": 0,
              "style.offsetY": 0,
              "style.clip": true,
              "color.mode": "单色",
              "color.c1": "#6C8CFF",
              "color.c2": "#22D3EE",
              "image.whiteTransparent": false,
              "shadow.enabled": false,
              "shadow.color": "#1D2333",
              "shadow.size": 12,
              "shadow.blur": 10,
              "shadow.x": 0,
              "shadow.y": 4,
              "font.cn": "系统默认（黑体）",
              "font.en": "系统默认",
              "font.weight": "常规",
              "font.italic": false,
              "font.layout": "横排",
              "font.size": 100
            },
            "link": {
              "style.size": false,
              "style.angle": false,
              "style.scaleX": false,
              "style.scaleY": false,
              "style.offsetX": false,
              "style.offsetY": false,
              "style.clip": false,
              "color.mode": false,
              "color.c1": false,
              "color.c2": false,
              "image.whiteTransparent": false,
              "shadow.enabled": false,
              "shadow.color": false,
              "shadow.size": false,
              "shadow.blur": false,
              "shadow.x": false,
              "shadow.y": false,
              "font.cn": false,
              "font.en": false,
              "font.weight": false,
              "font.italic": false,
              "font.layout": false,
              "font.size": false
            }
          },
          {
            "mode": "text",
            "text": "A",
            "faName": null,
            "image": {
              "name": "",
              "w": 0,
              "h": 0,
              "crop": {
                "aspect": "原图",
                "zoom": 1,
                "ox": 0,
                "oy": 0
              }
            },
            "params": {
              "style.size": 100,
              "style.angle": 0,
              "style.scaleX": 100,
              "style.scaleY": 100,
              "style.offsetX": 0,
              "style.offsetY": 0,
              "style.clip": true,
              "color.mode": "单色",
              "color.c1": "#6C8CFF",
              "color.c2": "#22D3EE",
              "image.whiteTransparent": false,
              "shadow.enabled": false,
              "shadow.color": "#1D2333",
              "shadow.size": 12,
              "shadow.blur": 10,
              "shadow.x": 0,
              "shadow.y": 4,
              "font.cn": "系统默认（黑体）",
              "font.en": "系统默认",
              "font.weight": "常规",
              "font.italic": false,
              "font.layout": "横排",
              "font.size": 100
            },
            "link": {
              "style.size": false,
              "style.angle": false,
              "style.scaleX": false,
              "style.scaleY": false,
              "style.offsetX": false,
              "style.offsetY": false,
              "style.clip": false,
              "color.mode": false,
              "color.c1": false,
              "color.c2": false,
              "image.whiteTransparent": false,
              "shadow.enabled": false,
              "shadow.color": false,
              "shadow.size": false,
              "shadow.blur": false,
              "shadow.x": false,
              "shadow.y": false,
              "font.cn": false,
              "font.en": false,
              "font.weight": false,
              "font.italic": false,
              "font.layout": false,
              "font.size": false
            }
          },
          {
            "mode": "text",
            "text": "B",
            "faName": null,
            "image": {
              "name": "",
              "w": 0,
              "h": 0,
              "crop": {
                "aspect": "原图",
                "zoom": 1,
                "ox": 0,
                "oy": 0
              }
            },
            "params": {
              "style.size": 100,
              "style.angle": 0,
              "style.scaleX": 100,
              "style.scaleY": 100,
              "style.offsetX": 0,
              "style.offsetY": 0,
              "style.clip": true,
              "color.mode": "单色",
              "color.c1": "#6C8CFF",
              "color.c2": "#22D3EE",
              "image.whiteTransparent": false,
              "shadow.enabled": false,
              "shadow.color": "#1D2333",
              "shadow.size": 12,
              "shadow.blur": 10,
              "shadow.x": 0,
              "shadow.y": 4,
              "font.cn": "系统默认（黑体）",
              "font.en": "系统默认",
              "font.weight": "常规",
              "font.italic": false,
              "font.layout": "横排",
              "font.size": 100
            },
            "link": {
              "style.size": false,
              "style.angle": false,
              "style.scaleX": false,
              "style.scaleY": false,
              "style.offsetX": false,
              "style.offsetY": false,
              "style.clip": false,
              "color.mode": false,
              "color.c1": false,
              "color.c2": false,
              "image.whiteTransparent": false,
              "shadow.enabled": false,
              "shadow.color": false,
              "shadow.size": false,
              "shadow.blur": false,
              "shadow.x": false,
              "shadow.y": false,
              "font.cn": false,
              "font.en": false,
              "font.weight": false,
              "font.italic": false,
              "font.layout": false,
              "font.size": false
            }
          },
          {
            "mode": "text",
            "text": "C",
            "faName": null,
            "image": {
              "name": "",
              "w": 0,
              "h": 0,
              "crop": {
                "aspect": "原图",
                "zoom": 1,
                "ox": 0,
                "oy": 0
              }
            },
            "params": {
              "style.size": 100,
              "style.angle": 0,
              "style.scaleX": 100,
              "style.scaleY": 100,
              "style.offsetX": 0,
              "style.offsetY": 0,
              "style.clip": true,
              "color.mode": "单色",
              "color.c1": "#6C8CFF",
              "color.c2": "#22D3EE",
              "image.whiteTransparent": false,
              "shadow.enabled": false,
              "shadow.color": "#1D2333",
              "shadow.size": 12,
              "shadow.blur": 10,
              "shadow.x": 0,
              "shadow.y": 4,
              "font.cn": "系统默认（黑体）",
              "font.en": "系统默认",
              "font.weight": "常规",
              "font.italic": false,
              "font.layout": "横排",
              "font.size": 100
            },
            "link": {
              "style.size": false,
              "style.angle": false,
              "style.scaleX": false,
              "style.scaleY": false,
              "style.offsetX": false,
              "style.offsetY": false,
              "style.clip": false,
              "color.mode": false,
              "color.c1": false,
              "color.c2": false,
              "image.whiteTransparent": false,
              "shadow.enabled": false,
              "shadow.color": false,
              "shadow.size": false,
              "shadow.blur": false,
              "shadow.x": false,
              "shadow.y": false,
              "font.cn": false,
              "font.en": false,
              "font.weight": false,
              "font.italic": false,
              "font.layout": false,
              "font.size": false
            }
          },
          {
            "mode": "text",
            "text": "D",
            "faName": null,
            "image": {
              "name": "",
              "w": 0,
              "h": 0,
              "crop": {
                "aspect": "原图",
                "zoom": 1,
                "ox": 0,
                "oy": 0
              }
            },
            "params": {
              "style.size": 100,
              "style.angle": 0,
              "style.scaleX": 100,
              "style.scaleY": 100,
              "style.offsetX": 0,
              "style.offsetY": 0,
              "style.clip": true,
              "color.mode": "单色",
              "color.c1": "#6C8CFF",
              "color.c2": "#22D3EE",
              "image.whiteTransparent": false,
              "shadow.enabled": false,
              "shadow.color": "#1D2333",
              "shadow.size": 12,
              "shadow.blur": 10,
              "shadow.x": 0,
              "shadow.y": 4,
              "font.cn": "系统默认（黑体）",
              "font.en": "系统默认",
              "font.weight": "常规",
              "font.italic": false,
              "font.layout": "横排",
              "font.size": 100
            },
            "link": {
              "style.size": false,
              "style.angle": false,
              "style.scaleX": false,
              "style.scaleY": false,
              "style.offsetX": false,
              "style.offsetY": false,
              "style.clip": false,
              "color.mode": false,
              "color.c1": false,
              "color.c2": false,
              "image.whiteTransparent": false,
              "shadow.enabled": false,
              "shadow.color": false,
              "shadow.size": false,
              "shadow.blur": false,
              "shadow.x": false,
              "shadow.y": false,
              "font.cn": false,
              "font.en": false,
              "font.weight": false,
              "font.italic": false,
              "font.layout": false,
              "font.size": false
            }
          },
          {
            "mode": "text",
            "text": "E",
            "faName": null,
            "image": {
              "name": "",
              "w": 0,
              "h": 0,
              "crop": {
                "aspect": "原图",
                "zoom": 1,
                "ox": 0,
                "oy": 0
              }
            },
            "params": {
              "style.size": 100,
              "style.angle": 0,
              "style.scaleX": 100,
              "style.scaleY": 100,
              "style.offsetX": 0,
              "style.offsetY": 0,
              "style.clip": true,
              "color.mode": "单色",
              "color.c1": "#6C8CFF",
              "color.c2": "#22D3EE",
              "image.whiteTransparent": false,
              "shadow.enabled": false,
              "shadow.color": "#1D2333",
              "shadow.size": 12,
              "shadow.blur": 10,
              "shadow.x": 0,
              "shadow.y": 4,
              "font.cn": "系统默认（黑体）",
              "font.en": "系统默认",
              "font.weight": "常规",
              "font.italic": false,
              "font.layout": "横排",
              "font.size": 100
            },
            "link": {
              "style.size": false,
              "style.angle": false,
              "style.scaleX": false,
              "style.scaleY": false,
              "style.offsetX": false,
              "style.offsetY": false,
              "style.clip": false,
              "color.mode": false,
              "color.c1": false,
              "color.c2": false,
              "image.whiteTransparent": false,
              "shadow.enabled": false,
              "shadow.color": false,
              "shadow.size": false,
              "shadow.blur": false,
              "shadow.x": false,
              "shadow.y": false,
              "font.cn": false,
              "font.en": false,
              "font.weight": false,
              "font.italic": false,
              "font.layout": false,
              "font.size": false
            }
          },
          {
            "mode": "text",
            "text": "F",
            "faName": null,
            "image": {
              "name": "",
              "w": 0,
              "h": 0,
              "crop": {
                "aspect": "原图",
                "zoom": 1,
                "ox": 0,
                "oy": 0
              }
            },
            "params": {
              "style.size": 100,
              "style.angle": 0,
              "style.scaleX": 100,
              "style.scaleY": 100,
              "style.offsetX": 0,
              "style.offsetY": 0,
              "style.clip": true,
              "color.mode": "单色",
              "color.c1": "#6C8CFF",
              "color.c2": "#22D3EE",
              "image.whiteTransparent": false,
              "shadow.enabled": false,
              "shadow.color": "#1D2333",
              "shadow.size": 12,
              "shadow.blur": 10,
              "shadow.x": 0,
              "shadow.y": 4,
              "font.cn": "系统默认（黑体）",
              "font.en": "系统默认",
              "font.weight": "常规",
              "font.italic": false,
              "font.layout": "横排",
              "font.size": 100
            },
            "link": {
              "style.size": false,
              "style.angle": false,
              "style.scaleX": false,
              "style.scaleY": false,
              "style.offsetX": false,
              "style.offsetY": false,
              "style.clip": false,
              "color.mode": false,
              "color.c1": false,
              "color.c2": false,
              "image.whiteTransparent": false,
              "shadow.enabled": false,
              "shadow.color": false,
              "shadow.size": false,
              "shadow.blur": false,
              "shadow.x": false,
              "shadow.y": false,
              "font.cn": false,
              "font.en": false,
              "font.weight": false,
              "font.italic": false,
              "font.layout": false,
              "font.size": false
            }
          },
          {
            "mode": "text",
            "text": "G",
            "faName": null,
            "image": {
              "name": "",
              "w": 0,
              "h": 0,
              "crop": {
                "aspect": "原图",
                "zoom": 1,
                "ox": 0,
                "oy": 0
              }
            },
            "params": {
              "style.size": 100,
              "style.angle": 0,
              "style.scaleX": 100,
              "style.scaleY": 100,
              "style.offsetX": 0,
              "style.offsetY": 0,
              "style.clip": true,
              "color.mode": "单色",
              "color.c1": "#6C8CFF",
              "color.c2": "#22D3EE",
              "image.whiteTransparent": false,
              "shadow.enabled": false,
              "shadow.color": "#1D2333",
              "shadow.size": 12,
              "shadow.blur": 10,
              "shadow.x": 0,
              "shadow.y": 4,
              "font.cn": "系统默认（黑体）",
              "font.en": "系统默认",
              "font.weight": "常规",
              "font.italic": false,
              "font.layout": "横排",
              "font.size": 100
            },
            "link": {
              "style.size": false,
              "style.angle": false,
              "style.scaleX": false,
              "style.scaleY": false,
              "style.offsetX": false,
              "style.offsetY": false,
              "style.clip": false,
              "color.mode": false,
              "color.c1": false,
              "color.c2": false,
              "image.whiteTransparent": false,
              "shadow.enabled": false,
              "shadow.color": false,
              "shadow.size": false,
              "shadow.blur": false,
              "shadow.x": false,
              "shadow.y": false,
              "font.cn": false,
              "font.en": false,
              "font.weight": false,
              "font.italic": false,
              "font.layout": false,
              "font.size": false
            }
          }
        ],
        "currentLayout": "居中",
        "layoutByCount": {
          "1": "居中"
        },
        "layerOrder": "1to9",
        "fills": [
          {
            "mode": "纯",
            "color": "#D41111"
          },
          {
            "mode": "纯",
            "color": "#6C8CFF"
          },
          {
            "mode": "纯",
            "color": "#F97316"
          },
          {
            "mode": "纯",
            "color": "#0EA5E9"
          },
          {
            "mode": "纯",
            "color": "#FACC15"
          },
          {
            "mode": "纯",
            "color": "#EC4899"
          }
        ],
        "fillCount": 1,
        "activeFill": 0,
        "fill": {
          "fill.layout": "饼图布局",
          "fill.layers": 1,
          "fill.offsetX": -9,
          "fill.offsetY": -3,
          "fill.stretchX": 141,
          "fill.stretchY": 110,
          "fill.layerRatios": [],
          "fill.inRatios": [],
          "fill.angles": [
            135.4
          ]
        },
        "currentEdgeShape": "直线",
        "bg": {
          "shape.kind": "正4边形",
          "shape.size": 66,
          "shape.stretchX": 100,
          "shape.stretchY": 100,
          "shape.angle": 45,
          "shape.round": 0,
          "shape.inner": 60,
          "border.enabled": false,
          "border.width": 6,
          "border.color": "#FFFFFF",
          "shapeShadow.enabled": true,
          "shapeShadow.color": "#1D2333",
          "shapeShadow.size": 0,
          "shapeShadow.blur": 17,
          "shapeShadow.x": -10,
          "shapeShadow.y": 2
        },
        "iconSize": 256,
        "safeMargin": 10,
        "safeChk": true,
        "guides": "none",
        "transparent": false
      }
  }
};