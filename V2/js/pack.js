/* ============================================================
   KiconCreator V2 · js/pack.js
   职责：导出打包工具（需求 2.3，零依赖纯前端——无后端、无 CDN）。
     - crc32 / zipStoreFiles：ZIP 打包器（STORE 存储法，不压缩——
       图标本就高压缩比内容，浏览器原生无 zip 接口，避免引入第三方库）
     - dataURLBytes：dataURL → Uint8Array（原始图片打包用）
     - buildICOBlob：多尺寸 ICO 组装器（PNG-in-ICO，需求 2.3：
       内置 16/32/48/64/128/256，不受导出尺寸设置影响）
   版本：V0.01（V2.29：首次落地——支撑 多尺寸打包 / 代码打包 / 原始图片打包 / 多尺寸 ICO）
   依赖：无（纯字节操作，TextEncoder/DataView/Blob 为浏览器标准 API）。
   ============================================================ */

/* ---------- CRC32（ZIP 必需） ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++){
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(u8){
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* ---------- ZIP（STORE 法）打包器 ----------
   files: [{ name: 'a.png', data: Uint8Array }] → application/zip Blob。
   文件名按 UTF-8 编码（置 0x0800 标志位），时间取当前时刻的 DOS 时间。 */
function zipStoreFiles(files){
  const enc = new TextEncoder();
  const now = new Date();
  const dtime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
  const ddate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
  const parts = [];
  const central = [];
  let offset = 0;
  for (const f of files){
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const lh = new Uint8Array(30 + name.length);
    const v = new DataView(lh.buffer);
    v.setUint32(0, 0x04034b50, true);   // local file header signature
    v.setUint16(4, 20, true);           // version needed
    v.setUint16(6, 0x0800, true);       // flags: UTF-8 文件名
    v.setUint16(8, 0, true);            // method: STORE
    v.setUint16(10, dtime, true);
    v.setUint16(12, ddate, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, f.data.length, true); // 压缩后大小
    v.setUint32(22, f.data.length, true); // 原始大小
    v.setUint16(26, name.length, true);
    v.setUint16(28, 0, true);           // extra 长度
    lh.set(name, 30);
    parts.push(lh, f.data);
    central.push({ name, crc, size: f.data.length, offset });
    offset += lh.length + f.data.length;
  }
  const cdStart = offset;
  let cdSize = 0;
  for (const c of central){
    const ch = new Uint8Array(46 + c.name.length);
    const v = new DataView(ch.buffer);
    v.setUint32(0, 0x02014b50, true);   // central directory signature
    v.setUint16(4, 20, true);           // version made by
    v.setUint16(6, 20, true);           // version needed
    v.setUint16(8, 0x0800, true);
    v.setUint16(10, 0, true);           // method: STORE
    v.setUint16(12, dtime, true);
    v.setUint16(14, ddate, true);
    v.setUint32(16, c.crc, true);
    v.setUint32(20, c.size, true);
    v.setUint32(24, c.size, true);
    v.setUint16(28, c.name.length, true);
    v.setUint32(42, c.offset, true);    // local header 偏移
    ch.set(c.name, 46);
    parts.push(ch);
    cdSize += ch.length;
  }
  const eocd = new Uint8Array(22);
  const v = new DataView(eocd.buffer);
  v.setUint32(0, 0x06054b50, true);     // EOCD signature
  v.setUint16(8, central.length, true);
  v.setUint16(10, central.length, true);
  v.setUint32(12, cdSize, true);
  v.setUint32(16, cdStart, true);
  parts.push(eocd);
  return new Blob(parts, { type: 'application/zip' });
}

/* ---------- dataURL → 字节（原始图片打包用） ---------- */
function dataURLBytes(dataURL){
  const b64 = dataURL.slice(dataURL.indexOf(',') + 1);
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

/* ---------- 多尺寸 ICO 组装器（PNG-in-ICO） ----------
   entries: [{ size: 16..256, bytes: Uint8Array(PNG) }] → image/x-icon Blob。
   目录项宽高字节：256 写 0（ICO 规范）。 */
function buildICOBlob(entries){
  const n = entries.length;
  let off = 6 + 16 * n;
  const head = new Uint8Array(6);
  head[2] = 1;          // type: icon
  head[4] = n & 0xFF;
  head[5] = n >> 8;
  const dir = new Uint8Array(16 * n);
  const dv = new DataView(dir.buffer);
  entries.forEach((e, i) => {
    const o = i * 16;
    const b = e.size >= 256 ? 0 : e.size;
    dv.setUint8(o, b);            // width
    dv.setUint8(o + 1, b);        // height
    dv.setUint16(o + 4, 1, true); // planes
    dv.setUint16(o + 6, 32, true);// bit count
    dv.setUint32(o + 8, e.bytes.length, true);
    dv.setUint32(o + 12, off, true);
    off += e.bytes.length;
  });
  return new Blob([head, dir, ...entries.map(e => e.bytes)], { type: 'image/x-icon' });
}
