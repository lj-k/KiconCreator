/* ============================================================
   KiconCreator V2 · js/imagePane.js
   职责：图片模式面板（需求 2.8 / 3.4 / 3.6）。
     - 打开图片：文件选择 → 进度条 → 入库并写回行引用（更换时解除旧引用）
     - 剪裁后预览：始终显示当前裁切结果
     - 剪裁器：缩放滑块、快速比例、预览内拖拽移动、滚轮缩放、复位
   版本：V0.02（V2.14：新增导出前"原始/剪裁后"图片保存方式提示 askImageExportMode）
   依赖：images.js（ImageRepo / imgLoadFile / imgCropRect）、schema.js（makeImageState）。
   约束：面板随行/模式切换重建，由 content.js 的 renderContentBody 调用 mountImagePane；
        本文件只改 rows[i].image 与引用登记，重绘统一走 drawIcon/commitHistory；
        面板内禁止使用 .chip-row 容器与 [data-group] 属性，避免与样式/填充 pane 的
        bindPaneInteractions 委托冲突。
   ============================================================ */

const CROP_BOX_W = 300;   // 剪裁器逻辑画布宽
const CROP_BOX_H = 210;   // 剪裁器逻辑画布高

/* ---------- 面板装配 ---------- */
function mountImagePane(body, rowIdx){
  const r = rows[rowIdx];
  const entry = imgGet(r.image && r.image.id);
  const idx = rowIdx + 1;

  body.innerHTML = `
    <div class="cp-label">第 ${idx} 行 · 图片模式</div>
    <div class="img-row">
      <div class="img-thumb" id="imgThumb" title="${entry ? '点击更换图片' : '点击打开图片'}">
        <canvas id="imgPrev" width="128" height="128"></canvas>
      </div>
      <div class="img-meta">
        <div class="img-name" title="${entry ? escapeHtml(entry.name) : ''}">${entry ? escapeHtml(entry.name) : '未选择图片'}</div>
        <div class="img-dim">${entry ? `${entry.w}×${entry.h}${entry.size ? ' · ' + fmtFileSize(entry.size) : ''}` : 'PNG / JPG / GIF（取首帧）/ WebP'}</div>
        <div class="cp-actions">
          <button class="btn sm" id="imgOpen">${entry ? '更换图片' : '打开图片'}</button>
          <button class="btn ghost sm" id="imgCropBtn"${entry ? '' : ' disabled'}>剪裁</button>
          ${entry ? '<button class="btn ghost sm" id="imgClear">移除</button>' : ''}
        </div>
      </div>
    </div>
    <div class="img-prog" id="imgProg" hidden><i></i></div>
    <div id="cropMount"></div>
    <div class="cp-note">动图仅取首帧；大于 1MB 的图片可能造成卡顿。剪裁只影响本行，图片数据全程序只保存一份。</div>`;

  paintImagePreview(body, rowIdx);

  $('#imgOpen', body).addEventListener('click', () => pickImageFile(rowIdx, body));
  $('#imgThumb', body).addEventListener('click', () => pickImageFile(rowIdx, body));
  $('#imgCropBtn', body).addEventListener('click', () => toggleCropEditor(body, rowIdx));
  const clr = $('#imgClear', body);
  if (clr) clr.addEventListener('click', () => clearRowImage(rowIdx, body));
}

/* ---------- 剪裁后预览（需求 2.8） ---------- */
function paintImagePreview(scope, rowIdx){
  const c = $('#imgPrev', scope);
  if (!c) return;
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(120,130,150,.10)';
  g.fillRect(0, 0, W, H);
  const r = rows[rowIdx];
  const entry = imgGet(r.image && r.image.id);
  if (!entry){
    g.fillStyle = 'rgba(120,130,150,.75)';
    g.font = '12px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('无图片', W / 2, H / 2);
    return;
  }
  const { sx, sy, sw, sh } = imgCropRect(entry, r.image.crop);
  const k = Math.min(W / sw, H / sh);
  const dw = sw * k, dh = sh * k;
  g.imageSmoothingQuality = 'high';
  g.drawImage(entry.bitmap, sx, sy, sw, sh, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

function fmtFileSize(n){
  if (!n) return '';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

/* ---------- 打开图片（需求 2.8：进度条 / 大图提醒 / 失败原因 / 引用切换） ---------- */
function pickImageFile(rowIdx, scope){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const prog = $('#imgProg', scope);
    const bar = prog ? $('i', prog) : null;
    if (prog){ prog.hidden = false; prog.classList.remove('err'); }
    if (bar) bar.style.width = '4%';
    try {
      const entry = await imgLoadFile(file, k => { if (bar) bar.style.width = Math.round(4 + k * 94) + '%'; });
      // 更换图片：解除本行对旧图片的引用（需求 2.8）；行与模式切换不解除引用
      const oldId = rows[rowIdx].image && rows[rowIdx].image.id;
      if (oldId) imgRelease(oldId, 'row:' + rowIdx);
      rows[rowIdx].image = makeImageState({
        id: entry.id,
        name: entry.name,
        w: entry.w,
        h: entry.h,
        crop: { aspect: '原图', zoom: 1, ox: 0, oy: 0 } // 新图默认不裁切、全图可见
      });
      imgRetain(entry.id, 'row:' + rowIdx);
      if (bar) bar.style.width = '100%';
      renderContentTabs();  // 标签标题/文件名改用原图片名（需求 2.35）
      renderContentBody();  // 重建面板：新预览、剪裁器回到收起态
      drawIcon();
      updateFileName();
      commitHistory();
      toast(`已载入图片：${entry.name}`);
    } catch (err){
      if (prog){ prog.classList.add('err'); }
      toast('图片加载失败：' + ((err && err.message) || '未知原因'));
      setTimeout(() => { if (prog) prog.hidden = true; }, 1600);
    }
  };
  input.click();
}

/* ---------- 移除本行图片 ---------- */
function clearRowImage(rowIdx, scope){
  const oldId = rows[rowIdx].image && rows[rowIdx].image.id;
  if (oldId) imgRelease(oldId, 'row:' + rowIdx);
  rows[rowIdx].image = makeImageState();
  renderContentTabs();
  renderContentBody();
  drawIcon();
  updateFileName();
  commitHistory();
  toast('已移除本行图片（其它行/预设/历史仍引用时图片不会释放）');
}

/* ---------- 剪裁器（需求 3.6：缩放、拖拽、快速比例） ---------- */
function toggleCropEditor(scope, rowIdx){
  const host = $('#cropMount', scope);
  const btn = $('#imgCropBtn', scope);
  if (!host) return;
  if (host.dataset.on === '1'){
    host.dataset.on = '0';
    host.innerHTML = '';
    if (btn) btn.classList.remove('on');
    return;
  }
  const r = rows[rowIdx];
  if (!imgGet(r.image && r.image.id)) return;
  host.dataset.on = '1';
  if (btn) btn.classList.add('on');
  host.innerHTML = `
    <div class="crop-box"><canvas id="cropCanvas" width="${CROP_BOX_W}" height="${CROP_BOX_H}"></canvas></div>
    <div class="param tight">
      <span class="pname">缩放</span>
      <div class="pctrl">
        <input type="range" id="cropZoom" min="1" max="5" step="0.01" value="${r.image.crop.zoom}">
        <span class="val" id="cropZoomVal">${Math.round(r.image.crop.zoom * 100)}%</span>
      </div>
    </div>
    <div class="param tight">
      <span class="pname">比例</span>
      <div class="pctrl crop-ratios">
        ${CROP_ASPECTS.map(a => `<button class="chip${a === r.image.crop.aspect ? ' active' : ''}" data-asp="${a}">${a}</button>`).join('')}
      </div>
    </div>
    <div class="crop-hint">在预览内拖拽移动 · 滚轮缩放 · 双击复位</div>`;
  bindCropEditor(host, rowIdx, scope);
  paintCropEditor(host, rowIdx);
}

function bindCropEditor(host, rowIdx, scope){
  const r = rows[rowIdx];
  const entry = imgGet(r.image && r.image.id);
  if (!entry) return;
  const c = $('#cropCanvas', host);

  /* 缩放滑块：拖动实时重绘不入栈，松开补一次历史（需求 四.2） */
  const zoom = $('#cropZoom', host);
  const zoomVal = $('#cropZoomVal', host);
  const setZoom = z => {
    r.image.crop.zoom = +Math.max(1, Math.min(5, z)).toFixed(3);
    if (zoom) zoom.value = r.image.crop.zoom;
    if (zoomVal) zoomVal.textContent = Math.round(r.image.crop.zoom * 100) + '%';
    paintCropEditor(host, rowIdx);
    paintImagePreview(scope, rowIdx);
    drawIcon();
  };
  zoom.addEventListener('input', () => setZoom(+zoom.value));
  zoom.addEventListener('change', () => commitHistory());

  /* 快速比例 */
  $$('.crop-ratios .chip', host).forEach(chip => {
    chip.addEventListener('click', () => {
      r.image.crop.aspect = chip.dataset.asp;
      r.image.crop.zoom = 1;
      r.image.crop.ox = 0;
      r.image.crop.oy = 0;
      $$('.crop-ratios .chip', host).forEach(x => x.classList.toggle('active', x === chip));
      setZoom(1);
      commitHistory();
    });
  });

  /* 拖拽移动 */
  let drag = null;
  c.addEventListener('pointerdown', e => {
    const box = c.getBoundingClientRect();
    drag = { px: e.clientX - box.left, py: e.clientY - box.top, ox: r.image.crop.ox, oy: r.image.crop.oy };
    c.setPointerCapture(e.pointerId);
  });
  c.addEventListener('pointermove', e => {
    if (!drag) return;
    const box = c.getBoundingClientRect();
    const view = host._view || { k: 1, dx: 0, dy: 0 };
    const { sx, sy, sw, sh } = imgCropRect(entry, r.image.crop);
    const mx = (entry.w - sw) / 2, my = (entry.h - sh) / 2;
    const dx = (e.clientX - box.left - drag.px) / view.k;
    const dy = (e.clientY - box.top - drag.py) / view.k;
    r.image.crop.ox = mx > 0.5 ? clamp(drag.ox + dx / mx, -1, 1) : 0;
    r.image.crop.oy = my > 0.5 ? clamp(drag.oy + dy / my, -1, 1) : 0;
    paintCropEditor(host, rowIdx);
    paintImagePreview(scope, rowIdx);
    drawIcon();
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    commitHistory(); // 拖动结束才入栈（需求 四.2）
  };
  c.addEventListener('pointerup', endDrag);
  c.addEventListener('pointercancel', endDrag);

  /* 滚轮缩放 + 双击复位 */
  c.addEventListener('wheel', e => {
    e.preventDefault();
    setZoom(r.image.crop.zoom * Math.exp(-e.deltaY * 0.0016));
    clearTimeout(host._wt);
    host._wt = setTimeout(() => commitHistory(), 320);
  }, { passive: false });
  c.addEventListener('dblclick', () => {
    r.image.crop.ox = 0;
    r.image.crop.oy = 0;
    setZoom(1);
    commitHistory();
  });
}

/* ---------- 导出前的图片保存方式提示（需求 2.1） ----------
   背景：若把"剪裁后的像素"与"剪裁参数"同时导出，导入后会拿同一组参数
   对已剪裁的图再裁一次（二次裁切，效果不一致）。因此涉及已剪裁图片的
   导出/下载/复制，先让用户选：保留原始图片（连带剪裁参数）还是保存剪裁后
   图片（并清零剪裁参数）。
   返回：Promise<'original' | 'cropped' | null>（null = 用户取消） */
function askImageExportMode(names){
  return new Promise(resolve => {
    const list = names.slice(0, 6).map(n => escapeHtml(n)).join('、') + (names.length > 6 ? ` 等 ${names.length} 处` : '');
    const mask = document.createElement('div');
    mask.className = 'ask-mask';
    mask.innerHTML = `
      <div class="ask-box" role="dialog" aria-modal="true">
        <div class="ask-title">图片保存方式</div>
        <div class="ask-text">检测到 <b>${names.length}</b> 处已剪裁的图片：<span class="ask-list">${list}</span></div>
        <div class="ask-opt">
          <div><b>保留原始图片</b>：导出整张原图并保留剪裁参数，导入后与当前效果完全一致（体积较大）</div>
          <div><b>保存剪裁后图片</b>：只保存剪裁后的画面并清零剪裁参数，体积更小（导入后无法再调整裁切范围）</div>
        </div>
        <div class="ask-actions">
          <button class="btn sm" data-r="original">保留原始图片</button>
          <button class="btn ghost sm" data-r="cropped">保存剪裁后图片</button>
          <button class="btn ghost sm" data-r="cancel">取消</button>
        </div>
      </div>`;
    const onKey = e => { if (e.key === 'Escape') done(null); };
    const done = v => {
      mask.remove();
      document.removeEventListener('keydown', onKey);
      resolve(v);
    };
    mask.addEventListener('click', e => {
      if (e.target === mask) return done(null);
      const b = e.target.closest('[data-r]');
      if (!b) return;
      done(b.dataset.r === 'cancel' ? null : b.dataset.r);
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(mask);
  });
}
/* 剪裁器绘制：图片 contain 铺满 → 裁切窗口外遮罩 + 三分线 */
function paintCropEditor(host, rowIdx){
  const c = $('#cropCanvas', host);
  if (!c) return;
  const r = rows[rowIdx];
  const entry = imgGet(r.image && r.image.id);
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  if (!entry) return;
  const k = Math.min(W / entry.w, H / entry.h);
  const dw = entry.w * k, dh = entry.h * k;
  const dx = (W - dw) / 2, dy = (H - dh) / 2;
  g.fillStyle = 'rgba(120,130,150,.08)';
  g.fillRect(0, 0, W, H);
  g.drawImage(entry.bitmap, dx, dy, dw, dh);
  host._view = { k, dx, dy };

  const { sx, sy, sw, sh } = imgCropRect(entry, r.image.crop);
  const rx = dx + sx * k, ry = dy + sy * k, rw = sw * k, rh = sh * k;
  // 窗口外遮罩
  g.fillStyle = 'rgba(12,16,28,.5)';
  g.fillRect(0, 0, W, ry);
  g.fillRect(0, ry + rh, W, H - (ry + rh));
  g.fillRect(0, ry, rx, rh);
  g.fillRect(rx + rw, ry, W - (rx + rw), rh);
  // 窗口边框 + 三分线
  g.strokeStyle = 'rgba(255,255,255,.95)';
  g.lineWidth = 1.5;
  g.strokeRect(rx + 0.75, ry + 0.75, Math.max(0, rw - 1.5), Math.max(0, rh - 1.5));
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 1;
  for (let i = 1; i <= 2; i++){
    const gx = rx + rw * i / 3, gy = ry + rh * i / 3;
    g.beginPath(); g.moveTo(gx, ry); g.lineTo(gx, ry + rh); g.stroke();
    g.beginPath(); g.moveTo(rx, gy); g.lineTo(rx + rw, gy); g.stroke();
  }
}