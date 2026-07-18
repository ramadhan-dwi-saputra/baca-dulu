// ===== ELEMEN REFERENCES =====
const fileInput = document.getElementById('file-input');
const uploadArea = document.getElementById('upload-area');
const fileInfo = document.getElementById('file-info');
const fileNameDisplay = document.getElementById('file-name-display');
const clearFileBtn = document.getElementById('clear-file');
const errorMessage = document.getElementById('error-message');
const analyzeBtn = document.getElementById('analyze-btn');
const uploadState = document.getElementById('upload-state');
const resultState = document.getElementById('result-state');

// ===== STATE =====
let currentFile = null;

// ===== UPLOAD AREA CLICK =====
uploadArea.addEventListener('click', function () {
  fileInput.click();
});

// ===== FILE INPUT CHANGE ======
const ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
];

fileInput.addEventListener('change', function () {
    const file = fileInput.files[0];
    if (!file) return;

    // Cek tipe file - fallback ke ekstensi kalau browser tidak detect MIME dengan benar
    const isDocx = file.name.toLowerCase().endsWith('.docx');
    const isAllowed = ALLOWED_TYPES.includes(file.type) || isDocx;

    if (!isAllowed) {
        showError('Format tidak didukung. Gunakan PDF, DOCX, atau foto (JPG, PNG, WebP).');
        fileInput.value = '';
        return;
    }

    if (file.size > 20 * 1024 * 1024) {
        showError('Ukuran file maksimal 20MB.');
        fileInput.value = '';
        return;
    }
    
    showFile(file.name);
    currentFile = file;
})

// ===== CLEAR FILE =====
clearFileBtn.addEventListener('click', function (e) {
  e.stopPropagation();
  resetUpload();
});

// ===== ANALYZE BUTTON =====
analyzeBtn.addEventListener('click', async function () {
    const file = fileInput.files[0];
    if (!file) return;

    // Baca PDF sebagai base64 via FileReader SEBELUM fetch
    // file.arrayBuffer() tidak reliable di Chrome Android — file jadi 0 bytes
    let pdfBase64 = null;
    if (file.type === 'application/pdf') {
        pdfBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => reject(new Error('FileReader error'));
            reader.readAsDataURL(file);
        });
    }

    showLoading();

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();

        if (!response.ok) {
            showError(data.error || 'Gagal menganalisis dokumen. Coba lagi.');
            resetAnalyzebtn();
            return;
        }
            
        tampilkanHasil(data.result, file, data.docxText || null, pdfBase64);

    } catch (err) {
        showError('Terjadi kesalahan koneksi. Periksa internet dan coba lagi.');
        resetAnalyzebtn();
    }
});

// ===== HELPER FUNCTION =====
function showFile(name) {
    uploadArea.classList.add('has-file');
    fileInfo.classList.remove('hidden');
    fileNameDisplay.textContent = '📄' + name;
    analyzeBtn.disabled = false;
    hideError();
}

function resetUpload() {
    fileInput.value = '';
    currentFile = null;
    uploadArea.classList.remove('has-file');
    fileInfo.classList.add('hidden');
    fileNameDisplay.textContent = '';
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analisis Dokumen'
    hideError();
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove('hidden');
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analisis Dokumen';
}

function hideError() {
    errorMessage.classList.add('hidden');
    errorMessage.textContent = '';
}

function showLoading() {
    uploadState.classList.add('hidden');
    resultState.classList.remove('hidden');
    resultState.innerHTML = `
        <div id="result-content">
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p class="loading-text">Sedang menganalisis dokumen...</p>
            </div>
        </div>
    `;
}

function resetAnalyzebtn() {
    uploadState.classList.remove('hidden');
    resultState.classList.add('hidden');
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Analisis Dokumen';
}

function tampilkanHasil(teks, file, docxText, pdfBase64 = null) {
    uploadState.classList.add('hidden');
    resultState.classList.remove('hidden');

    const sections = parseHasil(teks);
    const isDesktop = window.innerWidth >= 1024;
    const isPdf = file && file.type === 'application/pdf';
    const isImage = file && file.type.startsWith('image/');
    const isDocx = file && (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx'))

    // Desktop PDF pakai blob URL (iframe), mobile pakai PDF.js canvas
    let blobUrl = null;
    if (isImage && file) {
        blobUrl = URL.createObjectURL(file);
    } else if (isPdf && file && isDesktop) {
        blobUrl = URL.createObjectURL(file);
    }

    const analysisHTML = `
        ${sections.riskFlag.length > 0 ? `
        <div class="result-card card-risk-flag">
            <div class="card-header">
                <span class="card-icon">🔴</span>
                <h3>Perlu Diperhatikan</h3>
            </div>
            <ul class="risk-flag-list">
                ${sections.riskFlag.map((item, i) => `
                    <li>
                        <div class="risk-flag-top">
                            <span class="risk-flag-number">${i + 1}</span>
                            ${item.severity ? `<span class="risk-flag-badge ${item.severity}">${item.severity === 'tinggi' ? 'Tinggi' : item.severity === 'sedang' ? 'Sedang' : 'Info'}</span>` : ''}
                        </div>
                        <div class="risk-flag-body">${item.teks}</div>
                    </li>
                `).join('')}
            </ul>
        </div>` : ''}

        ${sections.infoKilat.length > 0 ? `
        <div class="info-kilat-grid">
            ${sections.infoKilat.map(item => `
                <div class="info-kilat-card">
                    <span class="info-kilat-label">${item.label}</span>
                    <span class="info-kilat-value">${item.value}</span>
                </div>
            `).join('')}
        </div>` : ''}

        <div class="result-grid">
          <div class="left-column">
            <div class="result-card">
              <div class="card-header">
                <span class="card-icon">📋</span>
                <h3>Ringkasan Dokumen</h3>
              </div>
              <p class="summary-text">${sections.ringkasan}</p>
            </div>

            <div class="result-card">
              <div class="card-header">
                <span class="card-icon">📌</span>
                <h3>Poin Penting</h3>
              </div>
              <ul class="keypoints-list">
                ${sections.poinPenting.map((item, i) => `
                  <li>
                    <span class="keypoint-number">${i + 1}</span>
                    ${item}
                  </li>
                `).join('')}
              </ul>
            </div>
          </div>

          <div class="right-column">
            ${sections.detail.length > 0 ? `
            <div class="result-card detail-card">
              <div class="card-header">
                <span class="card-icon">📖</span>
                <h3>Detail Per Bagian</h3>
              </div>
              <div class="accordion-list">
                ${sections.detail.map((item, i) => `
                  <div class="accordion-item">
                    <div class="accordion-summary" data-index="${i}">
                      <span>${item.judul}</span>
                      <span class="accordion-toggle">+</span>
                    </div>
                    <div class="accordion-body">${item.isi}</div>
                  </div>
                `).join('')}
              </div>
            </div>` : ''}
          </div>
        </div>
    `;

    // Build viewer HTML
    let viewerHTML = '';
    if (isPdf && file && isDesktop) {
        // Desktop: blob URL di iframe aman
        viewerHTML = `<iframe src="${blobUrl}" class="doc-viewer-iframe" title="Dokumen Asli"></iframe>`;
    } else if (isPdf && file && !isDesktop) {
        // Mobile: placeholder, diisi PDF.js canvas secara async
        viewerHTML = `<div id="pdf-viewer-placeholder" class="doc-viewer-iframe" style="display:flex;align-items:center;justify-content:center;background:#f5f5f5;color:#888;font-size:14px;">Memuat dokumen...</div>`;
    } else if (isImage && blobUrl) {
        viewerHTML = `<div class="doc-viewer-image-wrap"><img src="${blobUrl}" class="doc-viewer-image" alt="Dokumen Asli" /></div>`;
    } else if (isDocx && docxText) {
        viewerHTML = `<div class="doc-viewer-text"><pre>${docxText.replace(/</g,'&lt;').replace(/>/g, '&gt;')}</pre></div>`;
    }

    if (isDesktop && viewerHTML) {
        // Side-by-side layout
        resultState.innerHTML = `
            <button id="reset-btn">← Analisis Dokumen Lain</button>
            <div class="split-layout">
                <div class="split-analysis">
                    <div id="result-content">${analysisHTML}</div>
                </div>
                <div class="split-viewer">
                    <div>
                        <span class="viewer-title">📄 Dokumen Asli</span>
                    </div>
                    <div class="viewer-body">
                        ${viewerHTML}
                    </div>
                </div>
            </div>
        `;
    } else if (!isDesktop && viewerHTML) {
        // Tab layout mobile
        resultState.innerHTML = `
            <button id="reset-btn">← Analisis Dokumen Lain</button>
            <div class="tab-bar">
                <button class="tab-btn active" data-tab="analisis">📋 Analisis</button>
                <button class="tab-btn" data-tab="dokumen">📄 Dokumen Asli</button>
            </div>
            <div class="tab-panel" id="tab-analisis">
                <div id="result-content">${analysisHTML}</div>
            </div>
            <div class="tab-panel hidden" id="tab-dokumen">
                <div class="viewer-body viewer-body-mobile">
                    ${viewerHTML}
                </div>
            </div>
        `;
        // Tab Switching
        resultState.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                resultState.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const target = this.dataset.tab;
                resultState.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
                document.getElementById('tab-' + target).classList.remove('hidden');
            });
        });
    } else {
        // No viewer (DOCX tanpa text fallback, atau format lain)
        resultState.innerHTML = `
            <button id="reset-btn">← Analisis Dokumen Lain</button>
            <div id="result-content">${analysisHTML}</div>
        `;
    }

    // Inject PDF viewer via PDF.js canvas — hanya mobile, pakai pdfArrayBuffer yang dibaca sebelum fetch
    if (isPdf && !isDesktop && pdfBase64) {
        const placeholder = document.getElementById('pdf-viewer-placeholder');
        if (placeholder) {
            placeholder.innerHTML = '<div id="pdf-canvas-container" style="overflow-y:auto;height:auto;min-height:70vh;padding:8px;box-sizing:border-box;background:#525659;"></div>';
            const container = document.getElementById('pdf-canvas-container');
            // Konversi base64 data URL ke Uint8Array untuk PDF.js
            const base64 = pdfBase64.split(',')[1];
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            pdfjsLib.getDocument({ data: bytes }).promise.then(function(pdf) {
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    pdf.getPage(pageNum).then(function(page) {
                        const viewport = page.getViewport({ scale: 1.2 });
                        const canvas = document.createElement('canvas');
                        canvas.style.display = 'block';
                        canvas.style.margin = '0 auto 8px auto';
                        canvas.style.maxWidth = '100%';
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        container.appendChild(canvas);
                        page.render({ canvasContext: canvas.getContext('2d'), viewport });
                    });
                }
            }).catch(function(err) {
                console.error('PDF.js error:', err);
                const c = document.getElementById('pdf-canvas-container');
                if (c) c.textContent = 'Gagal memuat pratinjau dokumen.';
            });
        }
    }

    // Re-bind reset btn karena innerHTML diganti
    document.getElementById('reset-btn').addEventListener('click', function () {
        if (blobUrl) URL.revokeObjectURL(blobUrl); // hanya image yang punya blobUrl
        resetUpload();
        resultState.innerHTML = '';
        resultState.classList.add('hidden');
        uploadState.classList.remove('hidden');
    });
    
    initAccordion();
}

function initAccordion() {
    const container = document.getElementById('result-content');
    if (!container) return;

    const summaries = container.querySelectorAll('.accordion-summary');
    summaries.forEach(function(summary) {
        summary.addEventListener('click', function() {
            const body = this.nextElementSibling;
            const toggle = this.querySelector('.accordion-toggle');
            const isOpen = body.classList.contains('open');

            if (isOpen) {
                body.classList.remove('open');
                toggle.textContent = '+';
                this.classList.remove('open');
            } else {
                body.classList.add('open');
                toggle.textContent = '-';
                this.classList.add('open');
            }
        });
    });
}

function parseHasil(teks) {
    const result = {
        riskFlag: [],
        ringkasan: '',
        poinPenting: [],
        infoKilat: [],
        detail: []
    };

    // Pisahkan teks jadi sections berdasarkan heading ##
    const sectionRegex = /##[^#][^\n]*/g;
    const sectionHeaders = [...teks.matchAll(sectionRegex)].map(m => ({
        title: m[0],
        index: m.index
    }));

    function getSectionText(keyword) {
        const header = sectionHeaders.find(h => h.title.includes(keyword));
        if (!header) return '';
        const start = header.index + header.title.length;
        const nextHeader = sectionHeaders.find(h => h.index > header.index);
        const end = nextHeader ? nextHeader.index : teks.length;
        return teks.slice(start, end).trim();
    }

    // ===== RISK FLAG =====
    const riskFlagText = getSectionText('Perlu Diperhatikan');
    riskFlagText.split('\n').forEach(line => {
        line = line.trim();
        if (line.match(/^[-*]\s+/) || line.match(/^\d+\.\s+/)) {
            const raw = line.replace(/^[-*\d.]+\s*/, '').trim();
            // Ekstrak severity tag [TINGGI] / [SEDANG] / [INFO]
            const severityMatch = raw.match(/^\[?(TINGGI|SEDANG|INFO)\]?\s*/i);
            const severity = severityMatch ? severityMatch[1].toLowerCase() : null;
            const teks = stripMarkdown(severityMatch ? raw.slice(severityMatch[0].length) : raw);
            if (teks) result.riskFlag.push({ severity, teks });
        }
    });

    // Sort: TINGGI → SEDANG → INFO
    const SEVERITY_ORDER = { tinggi: 0, sedang: 1, info: 2 };
    result.riskFlag.sort((a, b) =>
        (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)
    );

    // ===== RINGKASAN =====
    const ringkasanText = getSectionText('Ringkasan Dokumen');
    result.ringkasan = stripMarkdown(ringkasanText.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
        .join(' '));

    // ===== POIN PENTING =====
    const poinText = getSectionText('Poin Penting');
    poinText.split('\n').forEach(line => {
        line = line.trim();
        if (line.match(/^[-*]\s+/) || line.match(/^\d+\.\s+/)) {
            const clean = stripMarkdown(line.replace(/^[-*\d.]+\s*/, ''));
            if (clean) result.poinPenting.push(clean);
        }
    });

    // ===== DETAIL PER BAGIAN =====
    const detailText = getSectionText('Detail Per Bagian');
    
    // Gemini format: "**Judul:** isi" atau "**Judul**\nisi" atau "* **Judul:** isi"
    // Split berdasarkan pola **...** yang muncul di awal baris (judul baru)
    const detailLines = detailText.split('\n');
    
    detailLines.forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('---') || line.startsWith('⚠️')) return;

        // Deteksi apakah baris ini adalah judul baru
        // Pattern: **Teks:** atau **Teks** di awal baris (dengan/tanpa bullet * atau nomor)
        const judulMatch = line.match(/^(?:[*-]\s*)?\*\*(.+?)\*\*[:\s]*(.*)/);
        const pasalMatch = line.match(/^(?:[*-]\s*)?((?:Pasal|Bagian|ANTARA|MENIMBANG|Pendahuluan|Penutup)\s*\d*[:\s]*.{0,60})/i);

        if (judulMatch) {
            const judul = judulMatch[1].replace(/:/g, '').trim();
            const isiInline = judulMatch[2].trim();
            result.detail.push({ judul, isi: stripMarkdown(isiInline) });
        } else if (pasalMatch && result.detail.length === 0) {
            // Fallback untuk format tanpa **bold**
            const judul = pasalMatch[1].trim();
            result.detail.push({ judul, isi: '' });
        } else if (result.detail.length > 0) {
            // Isi dari baris lanjutan
            const last = result.detail[result.detail.length - 1];
            const clean = stripMarkdown(line.replace(/^[-*]\s*/, ''));
            if (clean) last.isi += (last.isi ? ' ' : '') + clean;
        }
    });

    // ===== INFORMASI KILAT =====
    const infoKilatText = getSectionText('Informasi Kilat');
    if (infoKilatText) {
        const VALID_KEYS = ['JENIS','PIHAK_1','PIHAK_2','NILAI','DURASI','POSISI','TANGGAL','LOKASI'];
        const KEY_LABELS = {
            JENIS: 'Jenis', PIHAK_1: 'Pihak 1', PIHAK_2: 'Pihak 2',
            NILAI: 'Nilai', DURASI: 'Durasi', POSISI: 'Posisi',
            TANGGAL: 'Tanggal', LOKASI: 'Lokasi'
        };
        const KEY_EMOJIS = {
            JENIS: '📄', PIHAK_1: '🏢', PIHAK_2: '👤',
            NILAI: '💰', DURASI: '📅', POSISI: '💼',
            TANGGAL: '🗓️', LOKASI: '📍'
        }
        infoKilatText.split('\n').forEach(line => {
            line = line.trim();
            const match = line.match(/^([A-Z_1-9]+):\s*(.+)/);
            if (match && VALID_KEYS.includes(match[1])) {
                const key = match[1];
                const emoji = KEY_EMOJIS[key] || '';
                result.infoKilat.push({
                    key,
                    label: (emoji ? emoji + ' ' : '') + (KEY_LABELS[key] || key),
                    value: stripMarkdown(match[2].trim())
                });
            }
        });
    }

    return result;
}

function stripMarkdown(teks) {
  return teks
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#+\s*/gm, '');
}