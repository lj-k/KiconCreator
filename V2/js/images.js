/* ============================================================
   KiconCreator V2 · js/images.js
   职责：会话图片仓库（需求 六.1）与图片模式的几何/像素处理。
     - 注册与解码：本地文件 / data URL（预设导入）→ 可绘制位图
       （动图取首帧、超长边自动降采样、失败原因可读）
     - 引用计数：行参数、预设、下载历史、撤销栈各自持引用；
       无引用时延迟释放（需求 六.1）
     - 裁剪几何：比例 + 缩放 + 拖动偏移 → 源矩形 imgCropRect()
     - 白色透明：色度键结果按图片缓存（需求 3.4）
     - 预设序列化：只导出可见裁切部分并量化（需求 2.1）
   版本：V0.03（V2.16：导出编码改为"无损优先"——PNG 无损、超体量退 WebP 近无损，
        编码上限由 256 提至 IMG_MAX_EDGE（不再额外降采样）；dataURL 入库与文件入库
        共用同一 IMG_MAX_EDGE 降采样标准，避免多轮往返分辨率逐次劣化）
   约束：图片数据全项目只在本仓库保存一份；行/预设/历史/快照只存 id。
        新增引用方必须按"引用键"登记（imgRetain/imgRelease），
        并在对象销毁时注销，否则图片不会被释放或会被提前释放。
   ============================================================ */

const IMG_RELEASE_DELAY = 4000;          // 无引用后延迟释放（ms）
const IMG_MAX_EDGE = 1024;               // 入库最长边上限（内存保护）；导出编码上限同值
const IMG_PNG_MAX = 256 * 1024;          // 导出编码：PNG dataURL 体量上限（超出退 WebP 近无损）
const IMG_WARN_SIZE = 1 * 1024 * 1024;   // 大于 1MB 提醒可能卡顿（需求 2.8）

/* 快速比例（需求 3.6：缩放、拖拽、快速比例） */
const CROP_RATIOS = { '原图': 0, '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9, '3:4': 3 / 4 };
const CROP_ASPECTS = Object.keys(CROP_RATIOS);

const ImageRepo = {
  map: new Map(),        // id → entry
  seq: 0,
  refKeys: new Map(),    // 引用键 → Set<id>（支持按前缀批量注销）
  objKeys: new WeakMap(),// 快照/预设对象 → 引用键（不污染导出的 JSON）
  _k: 0
};

function imgId(){ return 'img' + (++ImageRepo.seq); }
function imgGet(id){ return id ? (ImageRepo.map.get(id) || null) : null; }

/* ---------- 引用计数（需求 六.1） ---------- */
function imgTrack(refKey, id){
  let s = ImageRepo.refKeys.get(refKey);
  if (!s){ s = new Set(); ImageRepo.refKeys.set(refKey, s); }
  s.add(id);
}
function imgUntrack(refKey, id){
  const s = ImageRepo.refKeys.get(refKey);
  if (s) s.delete(id);
}
function imgRetain(id, refKey){
  const e = imgGet(id);
  if (!e) return null;
  if (e.timer){ clearTimeout(e.timer); e.timer = null; } // 延迟释放期内再次引用 → 撤销释放
  e.refs.add(refKey);
  imgTrack(refKey, id);
  return e;
}
function imgRelease(id, refKey){
  const e = imgGet(id);
  if (!e) return;
  e.refs.delete(refKey);
  imgUntrack(refKey, id);
  if (e.refs.size === 0){
    e.timer = setTimeout(() => {
      const cur = imgGet(id);
      if (cur && cur.refs.size === 0) ImageRepo.map.delete(id);
    }, IMG_RELEASE_DELAY);
  }
}
function imgRetainRefs(refKey, ids){
  (ids || []).forEach(id => imgRetain(id, refKey));
}
function imgReleaseRefs(refKey){
  const ids = ImageRepo.refKeys.get(refKey);
  if (!ids) return;
  Array.from(ids).forEach(id => imgRelease(id, refKey));
  ImageRepo.refKeys.delete(refKey);
}
function imgReleasePrefix(prefix){
  Array.from(ImageRepo.refKeys.keys()).forEach(k => { if (k.startsWith(prefix)) imgReleaseRefs(k); });
}

/* 收集快照/预设对象引用的图片 id（行内容 + 背景填充，需求 六.1） */
function imgRefsOfSnap(snap){
  const out = [];
  ((snap && snap.rows) || []).forEach(r => { if (r && r.image && r.image.id) out.push(r.image.id); });
  ((snap && snap.fills) || []).forEach(f => { if (f && f.image && f.image.id) out.push(f.image.id); });
  return out;
}
/* 快照/预设对象持引用：引用键存 WeakMap，不写入对象本身（JSON 导出保持干净） */
function imgRetainSnap(obj, prefix){
  if (!obj) return '';
  const key = prefix + (++ImageRepo._k);
  ImageRepo.objKeys.set(obj, key);
  imgRetainRefs(key, imgRefsOfSnap(obj));
  return key;
}
function imgReleaseSnap(obj){
  if (!obj) return;
  const key = ImageRepo.objKeys.get(obj);
  if (!key) return;
  imgReleaseRefs(key);
  ImageRepo.objKeys.delete(obj);
}
/* 行引用同步：恢复快照 / 行图片变更后调用（切换行与模式不解除引用） */
function imgSyncRowRefs(){
  imgReleasePrefix('row:');
  rows.forEach((r, i) => { const id = r && r.image && r.image.id; if (id) imgRetain(id, 'row:' + i); });
}

/* ---------- 注册与解码 ---------- */
function imgRegister(o){
  const id = imgId();
  const e = {
    id,
    name: o.name || '图片',
    type: o.type || '',
    size: o.size || 0,
    bitmap: o.bitmap,
    w: o.w,
    h: o.h,
    src: o.src || '',       // 原始 dataURL（仅本地文件有，预设导入不保留）
    refs: new Set(),
    timer: null,
    chroma: null            // 白色透明处理结果缓存
  };
  ImageRepo.map.set(id, e);
  return e;
}

/* 超长边降采样（内存保护；不影响图标导出质量） */
async function imgNormalize(bitmap){
  const maxEdge = Math.max(bitmap.width, bitmap.height);
  if (maxEdge <= IMG_MAX_EDGE) return { bitmap, w: bitmap.width, h: bitmap.height };
  const k = IMG_MAX_EDGE / maxEdge;
  const w = Math.max(1, Math.round(bitmap.width * k));
  const h = Math.max(1, Math.round(bitmap.height * k));
  try {
    const bmp = await createImageBitmap(bitmap, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
    return { bitmap: bmp, w: bmp.width, h: bmp.height };
  } catch (e){
    return { bitmap, w: bitmap.width, h: bitmap.height };
  }
}

/* 本地文件入库（需求 2.8）：进度回调 + 动图取首帧 + 失败原因 */
function imgLoadFile(file, onProgress){
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('未选择文件'));
    if (!/^image\//.test(file.type || '')) return reject(new Error('不是图片文件（' + (file.type || '未知类型') + '）'));
    if (file.size > IMG_WARN_SIZE) toast(`图片较大（${(file.size / 1048576).toFixed(1)} MB），可能造成卡顿`);
    const reader = new FileReader();
    reader.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.onload = async () => {
      const dataURL = reader.result;
      try {
        // createImageBitmap 对 GIF/动图取首帧（需求 2.8）
        const raw = await createImageBitmap(file);
        const n = await imgNormalize(raw);
        if (onProgress) onProgress(1);
        resolve(imgRegister({ bitmap: n.bitmap, w: n.w, h: n.h, name: file.name, type: file.type, size: file.size, src: dataURL }));
      } catch (err){
        // 回退：部分格式 createImageBitmap 不支持，改用 Image 解码
        try {
          const e2 = await imgLoadData(dataURL, file.name, file.type, file.size);
          if (onProgress) onProgress(1);
          resolve(e2);
        } catch (err2){
          reject(new Error((err2 && err2.message) || '图片无法解码（格式不支持或文件损坏）'));
        }
      }
    };
    reader.readAsDataURL(file);
  });
}

/* data URL 入库（预设导入 / 解码回退）：
   与 imgLoadFile 共用同一分辨率标准（最长边 IMG_MAX_EDGE 降采样）。
   两条入库路径标准不一时，外部大图会以原始像素入库，之后任何一次导出都被
   编码上限降到 1024，于是每往返一轮分辨率就掉一档——必须在此就地统一。 */
function imgLoadData(dataURL, name, type, size){
  return new Promise((resolve, reject) => {
    if (!dataURL || !/^data:image\//.test(dataURL)) return reject(new Error('图片数据缺失或格式不正确'));
    const im = new Image();
    im.onload = () => {
      try {
        const iw = im.naturalWidth, ih = im.naturalHeight;
        const maxEdge = Math.max(iw, ih);
        if (maxEdge <= IMG_MAX_EDGE){
          resolve(imgRegister({ bitmap: im, w: iw, h: ih, name: name || '导入图片', type: type || '', size: size || 0 }));
          return;
        }
        const k = IMG_MAX_EDGE / maxEdge;
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(iw * k));
        c.height = Math.max(1, Math.round(ih * k));
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(im, 0, 0, c.width, c.height);
        resolve(imgRegister({ bitmap: c, w: c.width, h: c.height, name: name || '导入图片', type: type || '', size: size || 0 }));
      } catch (e){
        reject(new Error('图片登记失败'));
      }
    };
    im.onerror = () => reject(new Error('图片数据无法解码'));
    im.src = dataURL;
  });
}

/* ---------- 裁剪几何（需求 3.6 / 3.5） ---------- */
function imgAspectOf(crop, w, h){
  const key = (crop && crop.aspect) || '1:1';
  if (key === '原图') return w / h;
  return CROP_RATIOS[key] || 1;
}
function imgCropRect(entry, crop){
  if (!entry) return { sx: 0, sy: 0, sw: 1, sh: 1 };
  const iw = entry.w, ih = entry.h;
  const a = imgAspectOf(crop, iw, ih);
  // 基准窗口：按目标比例在图中取最大内接矩形
  let bw = iw, bh = iw / a;
  if (bh > ih){ bh = ih; bw = ih * a; }
  // 缩放：zoom ≥ 1，窗口等比缩小
  const z = Math.max(1, Math.min(8, +(crop && crop.zoom) || 1));
  const sw = bw / z, sh = bh / z;
  // 拖动偏移：ox/oy ∈ [-1,1]（±1 时窗口贴边）
  const mx = (iw - sw) / 2, my = (ih - sh) / 2;
  const ox = Math.max(-1, Math.min(1, +(crop && crop.ox) || 0));
  const oy = Math.max(-1, Math.min(1, +(crop && crop.oy) || 0));
  return { sx: iw / 2 + ox * mx - sw / 2, sy: ih / 2 + oy * my - sh / 2, sw, sh };
}

/* ---------- 白色透明（需求 3.4：图片模式的颜色项） ---------- */
function imgChroma(entry){
  if (!entry) return null;
  if (entry.chroma) return entry.chroma;
  const c = document.createElement('canvas');
  c.width = entry.w; c.height = entry.h;
  const g = c.getContext('2d');
  g.drawImage(entry.bitmap, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height);
  const px = d.data;
  for (let i = 0; i < px.length; i += 4){
    const m = Math.min(px[i], px[i + 1], px[i + 2]); // 越接近白越透明，保留过渡避免锯齿
    if (m > 200){
      const t = Math.min(1, (m - 200) / 55);
      px[i + 3] = Math.round(px[i + 3] * (1 - t));
    }
  }
  g.putImageData(d, 0, 0);
  entry.chroma = c;
  return c;
}

/* 判断图片是否被裁切（导出前据此提示，需求 2.1）：
   用实际裁剪窗口与整图矩形比对，避免仅凭 aspect 字面判断 */
function imgIsCropped(entry, crop){
  if (!entry) return false;
  const r = imgCropRect(entry, crop);
  const eps = 0.5;
  return Math.abs(r.sx) > eps || Math.abs(r.sy) > eps
      || Math.abs(r.sw - entry.w) > eps || Math.abs(r.sh - entry.h) > eps;
}

/* ---------- 预设序列化：按当前裁切窗口/整图编码（需求 2.1） ---------- */

/* 画布编码（导出共用）：图标类图像多为平涂色块 + 透明通道，PNG 无损且体积可控，
   故优先 PNG；仅当 PNG dataURL 超过 IMG_PNG_MAX（照片类，1024 边长可达 MB 级）
   才退 WebP 近无损。注意不用 JPEG 兜底：JPEG 无 Alpha 通道，会把透明背景压成黑底。 */
function imgEncodeCanvas(c, quality){
  const png = c.toDataURL('image/png');
  if (png.length <= IMG_PNG_MAX) return png;
  try {
    return c.toDataURL('image/webp', quality || 0.95);
  } catch (e){
    return png; // 浏览器不支持 WebP 时保留无损 PNG（宁大不失真）
  }
}

/* 裁切窗口编码（导出选"剪裁后"时用）：默认按 IMG_MAX_EDGE 上限输出，
   即"窗口 ≤ 上限就不缩放"——窗口本身就是分辨率，不再二次降采样。 */
function imgCropDataURL(entry, crop, maxEdge, quality){
  if (!entry) return '';
  maxEdge = maxEdge || IMG_MAX_EDGE;
  const { sx, sy, sw, sh } = imgCropRect(entry, crop);
  const k = Math.min(1, maxEdge / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw * k));
  c.height = Math.max(1, Math.round(sh * k));
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(entry.bitmap, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return imgEncodeCanvas(c, quality);
}

/* 整图编码（导出选"保留原始图片"时用）：不裁切，按入库分辨率编码。
   注意：与 imgCropDataURL 输出的坐标空间一致（都用 entry 位图尺寸），
   而裁剪参数本身是等比量（zoom 倍率、ox/oy 归一化），因此与分辨率无关。 */
function imgFullDataURL(entry, maxEdge, quality){
  if (!entry) return '';
  maxEdge = maxEdge || IMG_MAX_EDGE;
  const k = Math.min(1, maxEdge / Math.max(entry.w, entry.h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(entry.w * k));
  c.height = Math.max(1, Math.round(entry.h * k));
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(entry.bitmap, 0, 0, c.width, c.height);
  return imgEncodeCanvas(c, quality);
}

/* 仓库摘要（自检/调试：查看每张图的引用持有者） */
function imgStats(){
  return {
    count: ImageRepo.map.size,
    entries: Array.from(ImageRepo.map.values()).map(e => ({
      id: e.id, name: e.name, w: e.w, h: e.h, refs: Array.from(e.refs)
    }))
  };
}