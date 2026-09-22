/* ============================================================
   KiconCreator V2 · presets/index.js
   —— 本地预设清单（启动时自动加载；**本文件可直接手工编辑**）——

   ▍怎么添加预设
     把「导出预设」得到的 json 内容**原样**粘贴成一个条目（JSON 是 JS 对象字面量的子集，
     双引号、null、true/false 都照原样保留，无需改写）：

       window.KICON_LOCAL_PRESETS = {
         files: {
           "我的预设.json": { "type": "kicon-preset", "version": "2.21", "name": "我的预设",
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
    "KIcon-preset-demo-circle.json": {
      "type": "kicon-preset",
      "version": "2.21",
      "name": "示例 · 圆形渐变 K",
      "time": 1789950000000,
      "snap": {
        "version": "2.21",
        "rowCount": 1,
        "activeRow": 0,
        "rows": [
          {
            "mode": "text",
            "text": "K",
            "params": {
              "font.weight": "特粗",
              "color.mode": "渐变",
              "color.c1": "#6C8CFF",
              "color.c2": "#22D3EE",
              "style.size": 120
            }
          }
        ],
        "currentLayout": "居中",
        "layerOrder": "1to9",
        "fills": [{ "mode": "纯", "color": "#1D2333" }],
        "fillCount": 1,
        "activeFill": 0,
        "currentEdgeShape": "直线",
        "bg": {
          "shape.kind": "圆形",
          "shape.size": 100,
          "shape.stretchX": 100,
          "shape.stretchY": 100,
          "shape.angle": 0,
          "shape.round": 0,
          "shape.inner": 60,
          "border.enabled": false,
          "border.width": 6,
          "border.color": "#FFFFFF",
          "shapeShadow.enabled": false
        },
        "iconSize": 256,
        "safeMargin": 10,
        "safeChk": true,
        "guides": "none",
        "transparent": true
      }
    }
  }
};