const dropZone = document.getElementById('dropZone');
const input = document.getElementById('fileInput');
const uploadPanel = document.getElementById('uploadPanel');
const previewPanel = document.getElementById('previewPanel');
const image = document.getElementById('previewImage');
const toast = document.getElementById('toast');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
const enhanceBtn = document.getElementById('enhanceBtn');
const outputNote = document.getElementById('outputNote');
const compareLine = document.getElementById('compareLine');
const menuToggle = document.getElementById('menuToggle');
const imageStage = document.getElementById('imageStage');
const enhancedPreview = document.getElementById('enhancedPreview');
const qualityRange = document.getElementById('qualityRange');
const qualityValue = document.getElementById('qualityValue');
const historyList = document.getElementById('historyList');
const inlineResult = document.getElementById('inlineResult');
const inlineResultImage = document.getElementById('inlineResultImage');
const inlineResultMeta = document.getElementById('inlineResultMeta');
const inlineDownload = document.getElementById('inlineDownload');
let selectedFile;
let selectedScale = 4;
let enhancedUrl;
let previewUrl;
let outputFormat = 'jpeg';
let outputQuality = .95;
let exportHistory = [];
const MAX_OUTPUT_SIDE = 16000;
const MAX_OUTPUT_PIXELS = 120000000;

function notify(message) {
  toast.innerHTML = `${message} <b>✓</b>`;
  toast.classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function openModal(content) {
  modalContent.innerHTML = content;
  modal.classList.add('open');
  document.querySelector('.modal-close').focus();
}

function closeModal() {
  modal.classList.remove('open');
}

function setEnhanceReady(isReady) {
  enhanceBtn.innerHTML = isReady ? '开始增强 <span>↗</span>' : '选择图片开始 <span>↗</span>';
}

function updateOutputNote(width, height) {
  if (!selectedFile || !width || !height) {
    outputNote.textContent = '先上传图片，系统会自动估算输出尺寸。';
    return;
  }
  const output = getOutputSize(width, height);
  outputNote.textContent = `预计输出 ${output.width} × ${output.height} px · 实际约 ${formatScale(output.factor)}× · ${getFormatLabel()} · ${getQualityLabel()}。`;
}

function getOutputSize(width, height) {
  const sideLimit = MAX_OUTPUT_SIDE / Math.max(width, height);
  const pixelLimit = Math.sqrt(MAX_OUTPUT_PIXELS / (width * height));
  const safeLimit = Math.max(1, Math.min(sideLimit, pixelLimit));
  const factor = Math.max(1, Math.min(selectedScale, safeLimit));
  return {
    factor,
    width: Math.round(width * factor),
    height: Math.round(height * factor),
    isLimited: factor < selectedScale
  };
}

function formatScale(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getExtension() {
  return outputFormat === 'jpeg' ? 'jpg' : outputFormat;
}

function getMimeType() {
  return `image/${outputFormat}`;
}

function getFormatLabel() {
  return outputFormat === 'jpeg' ? 'JPG' : outputFormat.toUpperCase();
}

function getQualityLabel() {
  return outputFormat === 'png' ? '无损' : `质量 ${Math.round(outputQuality * 100)}%`;
}

function getDateStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function getDownloadName(output, extension) {
  return `Clarity_${output.width}x${output.height}_${getDateStamp()}.${extension}`;
}

function getEnhanceFilter() {
  const portrait = document.getElementById('portraitOpt').checked;
  const denoise = document.getElementById('denoiseOpt').checked;
  const face = document.getElementById('faceOpt').checked;
  const contrast = 1.04 + (portrait ? .03 : 0) + (face ? .02 : 0);
  const saturation = 1.04 + (portrait ? .04 : 0);
  const brightness = 1.01 + (denoise ? .01 : 0);
  return `contrast(${contrast}) saturate(${saturation}) brightness(${brightness})`;
}

function updatePreviewEffect() {
  enhancedPreview.style.filter = getEnhanceFilter();
  updateOutputNote(image.naturalWidth, image.naturalHeight);
}

function renderHistory() {
  historyList.innerHTML = '';
  if (!exportHistory.length) {
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = '完成增强后，下载记录会显示在这里。';
    historyList.appendChild(empty);
    return;
  }
  exportHistory.forEach(item => {
    const card = document.createElement('article');
    card.className = 'history-item';
    const title = document.createElement('b');
    title.textContent = item.name;
    const meta = document.createElement('span');
    meta.textContent = `${item.size} · ${item.format}`;
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.downloadName;
    link.textContent = '下载';
    card.append(title, meta, link);
    historyList.appendChild(card);
  });
}

function addHistoryItem(item) {
  exportHistory.unshift(item);
  exportHistory = exportHistory.slice(0, 6);
  renderHistory();
}

function showFile(file) {
  if (!file || !file.type.startsWith('image/')) return notify('请选择 JPG、PNG 或 WEBP 图片');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return notify('当前仅支持 JPG、PNG 或 WEBP 图片');
  if (file.size > 20 * 1024 * 1024) return notify('图片不能超过 20 MB');

  selectedFile = file;
  enhancedUrl = null;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  image.onload = () => updatePreviewEffect();
  image.src = previewUrl;
  enhancedPreview.src = previewUrl;
  inlineResult.hidden = true;
  inlineResultImage.removeAttribute('src');
  inlineDownload.removeAttribute('href');
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileMeta').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB · 等待增强`;
  uploadPanel.style.display = 'none';
  previewPanel.classList.add('visible');
  setComparePosition(50);
  setEnhanceReady(true);
  notify('图片已载入，可以开始增强');
}

function enhanceImage() {
  if (!selectedFile) {
    input.click();
    notify('请先选择一张图片');
    return;
  }

  enhanceBtn.classList.add('processing');
  enhanceBtn.textContent = '正在增强…';
  openModal('<h3>正在增强图片</h3><p>Clarity 正在重建纹理、优化色彩并提升分辨率。</p><div class="progress"><i id="progressBar"></i></div><p id="progressText">正在分析图片…</p>');
  const bar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  setTimeout(() => { bar.style.width = '42%'; progressText.textContent = '正在增强细节…'; }, 350);
  setTimeout(() => { bar.style.width = '76%'; progressText.textContent = '正在输出高清文件…'; }, 800);
  setTimeout(() => createDownload(), 1350);
}

function createDownload() {
  const source = new Image();
  source.onload = () => {
    const output = getOutputSize(source.naturalWidth, source.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = output.width;
    canvas.height = output.height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = getEnhanceFilter();
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    enhancedUrl = canvas.toDataURL(getMimeType(), outputFormat === 'png' ? undefined : outputQuality);
    enhancedPreview.src = enhancedUrl;
    setComparePosition(70);
    const extension = getExtension();
    const downloadName = getDownloadName(output, extension);
    const formatLabel = getFormatLabel();
    document.getElementById('fileMeta').textContent = `已增强 · ${canvas.width} × ${canvas.height} px`;
    inlineResult.hidden = false;
    inlineResultImage.src = enhancedUrl;
    inlineResultMeta.textContent = `${canvas.width} × ${canvas.height} px · ${formatLabel}`;
    inlineDownload.href = enhancedUrl;
    inlineDownload.download = downloadName;
    const limitText = output.isLimited ? '已按浏览器稳定性自动调整输出上限，未缩小原图。' : '已按所选倍数完整放大。';
    modalContent.innerHTML = `<h3>增强完成</h3><p>你的图片已完成约 ${formatScale(output.factor)}× 高清放大，输出为 ${formatLabel} 格式。${limitText}</p><figure class="result-preview"><img src="${enhancedUrl}" alt="增强后的图片预览"><figcaption>${canvas.width} × ${canvas.height} px · ${formatLabel} · ${getQualityLabel()}</figcaption></figure><div class="result-download"><a class="btn btn-dark" id="downloadBtn" href="${enhancedUrl}" download="${downloadName}">下载高清图片 ↓</a><button class="btn" id="closeResult" type="button">继续编辑</button></div>`;
    document.getElementById('closeResult').onclick = closeModal;
    addHistoryItem({
      name: selectedFile.name,
      size: `${canvas.width} × ${canvas.height}`,
      format: `${formatLabel} · ${getQualityLabel()}`,
      url: enhancedUrl,
      downloadName
    });
    enhanceBtn.classList.remove('processing');
    setEnhanceReady(true);
    notify('高清图片已准备好');
  };
  source.onerror = () => {
    enhanceBtn.classList.remove('processing');
    setEnhanceReady(true);
    closeModal();
    notify('图片读取失败，请重新选择');
  };
  source.src = image.src;
}

function resetFile() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  image.src = '';
  enhancedPreview.src = '';
  inlineResult.hidden = true;
  inlineResultImage.removeAttribute('src');
  inlineDownload.removeAttribute('href');
  input.value = '';
  selectedFile = null;
  previewPanel.classList.remove('visible');
  uploadPanel.style.display = 'flex';
  setEnhanceReady(false);
  updateOutputNote();
}

function setComparePosition(value) {
  const next = Math.max(5, Math.min(95, value));
  compareLine.style.left = `${next}%`;
  imageStage.style.setProperty('--compare', `${next}%`);
  compareLine.setAttribute('aria-valuenow', Math.round(next));
}

document.getElementById('browseBtn').onclick = event => {
  event.stopPropagation();
  input.click();
};
uploadPanel.onclick = () => input.click();
uploadPanel.onkeydown = event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    input.click();
  }
};
document.getElementById('startBtn').onclick = () => document.getElementById('studio').scrollIntoView({behavior:'smooth'});
document.querySelectorAll('[data-scroll]').forEach(button => button.onclick = () => document.getElementById(button.dataset.scroll).scrollIntoView({behavior:'smooth'}));
document.querySelectorAll('#siteNav a').forEach(link => link.onclick = () => {
  document.body.classList.remove('menu-open');
  menuToggle.setAttribute('aria-expanded', 'false');
});
menuToggle.onclick = () => {
  const isOpen = document.body.classList.toggle('menu-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? '关闭导航' : '打开导航');
};
input.onchange = e => showFile(e.target.files[0]);
['dragenter','dragover'].forEach(eventName => dropZone.addEventListener(eventName, event => {
  event.preventDefault();
  uploadPanel.classList.add('drag');
}));
['dragleave','drop'].forEach(eventName => dropZone.addEventListener(eventName, event => {
  event.preventDefault();
  uploadPanel.classList.remove('drag');
}));
dropZone.addEventListener('drop', e => showFile(e.dataTransfer.files[0]));
document.addEventListener('paste', event => {
  const file = Array.from(event.clipboardData?.files || []).find(item => item.type.startsWith('image/'));
  if (!file) return;
  showFile(file);
  document.getElementById('studio').scrollIntoView({behavior:'smooth'});
});
document.getElementById('removeBtn').onclick = resetFile;
document.querySelectorAll('.scales button').forEach(btn => btn.onclick = () => {
  document.querySelector('.scales .active').classList.remove('active');
  document.querySelectorAll('.scales button').forEach(scale => scale.setAttribute('aria-pressed', 'false'));
  btn.classList.add('active');
  btn.setAttribute('aria-pressed', 'true');
  selectedScale = Number(btn.dataset.scale);
  updateOutputNote(image.naturalWidth, image.naturalHeight);
});
document.querySelectorAll('#formatGroup button').forEach(btn => btn.onclick = () => {
  document.querySelector('#formatGroup .active').classList.remove('active');
  document.querySelectorAll('#formatGroup button').forEach(format => format.setAttribute('aria-pressed', 'false'));
  btn.classList.add('active');
  btn.setAttribute('aria-pressed', 'true');
  outputFormat = btn.dataset.format;
  updateOutputNote(image.naturalWidth, image.naturalHeight);
});
qualityRange.oninput = () => {
  outputQuality = Number(qualityRange.value) / 100;
  qualityValue.textContent = `${qualityRange.value}%`;
  updateOutputNote(image.naturalWidth, image.naturalHeight);
};
document.querySelectorAll('.toggle-row input').forEach(inputEl => inputEl.onchange = updatePreviewEffect);
document.getElementById('clearHistory').onclick = () => {
  exportHistory = [];
  renderHistory();
  notify('下载记录已清空');
};
enhanceBtn.onclick = enhanceImage;
document.getElementById('hintBtn').onclick = () => openModal('<h3>放大说明</h3><p>2× 适合网页图片；4× 适合社交媒体与普通印刷；8× 适合大幅输出。系统会优先按所选倍数放大，并在超大图片上自动控制输出体积，保证不会把原图缩小。</p>');
document.getElementById('watchBtn').onclick = () => openModal('<h3>一分钟了解 Clarity</h3><p>上传图片，选择放大倍数，点击开始增强。完成后可下载浏览器本地生成的高清文件。</p><button class="btn btn-dark" id="demoToStudio" type="button">立即试试 ↗</button>');
document.querySelectorAll('.feature-link').forEach(link => link.onclick = event => {
  event.preventDefault();
  openModal(`<h3>${link.dataset.feature}</h3><p>Clarity 会在本地浏览器中处理你的图片：使用高品质重采样、色彩增强与可选的优化设置，输出可下载的高清版本。</p>`);
});
document.getElementById('showcaseBtn').onclick = () => openModal('<h3>人像修复示例</h3><p>放大后，人物的肤色、轮廓和高光层次得到更稳定的呈现。上传你的照片即可开始体验。</p><button class="btn btn-dark" id="exampleToStudio" type="button">上传我的图片 ↗</button>');
document.querySelectorAll('.plan-btn').forEach(btn => btn.onclick = () => {
  document.getElementById('studio').scrollIntoView({behavior:'smooth'});
  notify('所有功能永久免费，无需注册');
});
document.querySelectorAll('.legal-link').forEach(link => link.onclick = event => {
  event.preventDefault();
  openModal(`<h3>${link.dataset.title}</h3><p>我们仅在你的浏览器会话中处理上传的图片。除非你主动下载或分享，图片不会被上传至第三方服务。</p>`);
});
document.querySelector('.modal-close').onclick = closeModal;
modal.onclick = event => { if (event.target === modal) closeModal(); };
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeModal();
    document.body.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }
});
modalContent.addEventListener('click', event => {
  if (event.target.id === 'demoToStudio' || event.target.id === 'exampleToStudio') {
    closeModal();
    document.getElementById('studio').scrollIntoView({behavior:'smooth'});
  }
});
compareLine.addEventListener('pointerdown', event => {
  const stage = event.currentTarget.parentElement;
  const move = e => {
    const rect = stage.getBoundingClientRect();
    setComparePosition((e.clientX - rect.left) / rect.width * 100);
  };
  compareLine.setPointerCapture(event.pointerId);
  move(event);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', () => window.removeEventListener('pointermove', move), {once:true});
});
compareLine.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  const current = Number(compareLine.getAttribute('aria-valuenow')) || 50;
  setComparePosition(current + (event.key === 'ArrowRight' ? 5 : -5));
});
renderHistory();
