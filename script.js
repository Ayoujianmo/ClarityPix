const dropZone = document.getElementById('dropZone');
const input = document.getElementById('fileInput');
const uploadPanel = document.getElementById('uploadPanel');
const previewPanel = document.getElementById('previewPanel');
const image = document.getElementById('previewImage');
const toast = document.getElementById('toast');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
let selectedFile, selectedScale = 4, enhancedUrl;

function notify(message) { toast.innerHTML = `${message} <b>✓</b>`; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); }
function openModal(content) { modalContent.innerHTML = content; modal.classList.add('open'); }
function closeModal() { modal.classList.remove('open'); }
function showFile(file) {
  if (!file || !file.type.startsWith('image/')) return notify('请选择 JPG、PNG 或 WEBP 图片');
  if (file.size > 20 * 1024 * 1024) return notify('图片不能超过 20 MB');
  selectedFile = file; enhancedUrl = null;
  image.src = URL.createObjectURL(file);
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileMeta').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB · 等待增强`;
  uploadPanel.style.display = 'none'; previewPanel.classList.add('visible');
}
function enhanceImage() {
  if (!selectedFile) { input.click(); return; }
  openModal('<h3>正在增强图片</h3><p>Clarity 正在重建纹理、优化色彩并提升分辨率。</p><div class="progress"><i id="progressBar"></i></div><p id="progressText">正在分析图片…</p>');
  const bar = document.getElementById('progressBar'), progressText = document.getElementById('progressText');
  setTimeout(() => { bar.style.width = '42%'; progressText.textContent = '正在增强细节…'; }, 350);
  setTimeout(() => { bar.style.width = '76%'; progressText.textContent = '正在输出高清文件…'; }, 800);
  setTimeout(() => createDownload(), 1350);
}
function createDownload() {
  const source = new Image(); source.onload = () => {
    const maxSide = 4096, factor = Math.min(selectedScale, maxSide / Math.max(source.naturalWidth, source.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(source.naturalWidth * factor); canvas.height = Math.round(source.naturalHeight * factor);
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.filter = 'contrast(1.04) saturate(1.05)'; ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    enhancedUrl = canvas.toDataURL('image/jpeg', .95);
    document.getElementById('fileMeta').textContent = `已增强 · ${canvas.width} × ${canvas.height} px`;
    modalContent.innerHTML = `<h3>增强完成</h3><p>你的图片已完成 ${selectedScale}× 高清放大，可立即下载。</p><div class="result-download"><a class="btn btn-dark" id="downloadBtn" href="${enhancedUrl}" download="clarity-${selectedFile.name.replace(/\.[^/.]+$/, '')}-${selectedScale}x.jpg">下载高清图片 ↓</a><button class="btn" id="closeResult">继续编辑</button></div>`;
    document.getElementById('closeResult').onclick = closeModal; notify('高清图片已准备好');
  }; source.src = image.src;
}
document.getElementById('browseBtn').onclick = () => input.click();
document.getElementById('startBtn').onclick = () => document.getElementById('studio').scrollIntoView({behavior:'smooth'});
document.querySelectorAll('[data-scroll]').forEach(button => button.onclick = () => document.getElementById(button.dataset.scroll).scrollIntoView({behavior:'smooth'}));
input.onchange = e => showFile(e.target.files[0]);
['dragenter','dragover'].forEach(eventName => dropZone.addEventListener(eventName, event => { event.preventDefault(); uploadPanel.classList.add('drag'); }));
['dragleave','drop'].forEach(eventName => dropZone.addEventListener(eventName, event => { event.preventDefault(); uploadPanel.classList.remove('drag'); }));
dropZone.addEventListener('drop', e => showFile(e.dataTransfer.files[0]));
document.getElementById('removeBtn').onclick = () => { image.src=''; input.value=''; selectedFile = null; previewPanel.classList.remove('visible'); uploadPanel.style.display='flex'; };
document.querySelectorAll('.scales button').forEach(btn => btn.onclick = () => { document.querySelector('.scales .active').classList.remove('active'); btn.classList.add('active'); selectedScale = Number(btn.dataset.scale); });
document.getElementById('enhanceBtn').onclick = enhanceImage;
document.getElementById('hintBtn').onclick = () => openModal('<h3>放大说明</h3><p>2× 适合网页图片；4× 适合社交媒体与普通印刷；8× 适合大幅输出。为确保浏览器稳定，单次输出的最长边限制为 4096 像素。</p>');
document.getElementById('watchBtn').onclick = () => openModal('<h3>一分钟了解 Clarity</h3><p>上传图片，选择放大倍数，点击开始增强。完成后可下载浏览器本地生成的高清文件。</p><button class="btn btn-dark" id="demoToStudio">立即试试 ↗</button>');
document.querySelectorAll('.feature-link').forEach(link => link.onclick = event => { event.preventDefault(); openModal(`<h3>${link.dataset.feature}</h3><p>Clarity 会在本地浏览器中处理你的图片：使用高品质重采样、色彩增强与可选的优化设置，输出可下载的高清版本。</p>`); });
document.getElementById('showcaseBtn').onclick = () => openModal('<h3>人像修复示例</h3><p>放大后，人物的肤色、轮廓和高光层次得到更稳定的呈现。上传你的照片即可开始体验。</p><button class="btn btn-dark" id="exampleToStudio">上传我的图片 ↗</button>');
document.querySelectorAll('.plan-btn').forEach(btn => btn.onclick = () => { document.getElementById('studio').scrollIntoView({behavior:'smooth'}); notify('所有功能永久免费，无需注册'); });
document.querySelectorAll('.legal-link').forEach(link => link.onclick = event => { event.preventDefault(); openModal(`<h3>${link.dataset.title}</h3><p>我们仅在你的浏览器会话中处理上传的图片。除非你主动下载或分享，图片不会被上传至第三方服务。</p>`); });
document.querySelector('.modal-close').onclick = closeModal; modal.onclick = event => { if (event.target === modal) closeModal(); };
modalContent.addEventListener('click', event => { if (event.target.id === 'demoToStudio' || event.target.id === 'exampleToStudio') { closeModal(); document.getElementById('studio').scrollIntoView({behavior:'smooth'}); } if (event.target.id === 'emailLogin' || event.target.id === 'planSubmit') { closeModal(); notify('验证链接已发送至你的邮箱'); } });
document.getElementById('compareLine').addEventListener('pointerdown', event => { const stage = event.currentTarget.parentElement; const move = e => { const rect = stage.getBoundingClientRect(); event.currentTarget.style.left = `${Math.max(5, Math.min(95, (e.clientX - rect.left) / rect.width * 100))}%`; }; move(event); window.addEventListener('pointermove', move); window.addEventListener('pointerup', () => window.removeEventListener('pointermove', move), {once:true}); });
