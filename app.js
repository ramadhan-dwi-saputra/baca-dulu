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
const resultContent = document.getElementById('result-content');
const resetBtn = document.getElementById('reset-btn');

const GEMINI_API_KEY = 'ISI_API_KEY';

// ===== UPLOAD AREA CLICK =====
uploadArea.addEventListener('click', function () {
  fileInput.click();
});

// ===== FILE INPUT CHANGE ======
fileInput.addEventListener('change', function () {
    const file = fileInput.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showError('Ukuran file maksimal 5MB.');
        return;
    }
    
    showFile(file.name);
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

    showLoading();

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async function () {
        const base64Data = reader.result.split(',')[1];

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                {
                                    inline_data: {
                                        mime_type: file.type,
                                        data: base64Data
                                    }
                                },
                                {
                                    text: `Kamu adalah asisten yang membantu orang Indonesia memahami dokumen legal dan administratif.

Analisis dokumen ini dan berikan output dalam format berikut (gunakan format ini persis):

## 🔴 Perlu Diperhatikan
Tuliskan HANYA jika ada klausa yang tidak umum, berpotensi merugikan, atau perlu didiskusikan sebelum tanda tangan. Jika tidak ada, tulis "Tidak ditemukan klausa yang perlu diwaspadai."
Maksimal 3 poin singkat.

## 📋 Ringkasan Dokumen
Jelaskan dalam 3-5 kalimat singkat: dokumen ini apa, antara siapa, dan apa intinya.

## 📌 Poin Penting
Tuliskan 5 poin paling penting yang perlu diketahui user sebelum tanda tangan. Singkat, maksimal 1-2 kalimat per poin.

## 📖 Detail Per Bagian
Jelaskan isi dokumen per pasal/bagian dengan bahasa sehari-hari. Singkat dan padat.

---
⚠️ Dokumen ini hanya dijelaskan untuk membantu pemahaman, bukan nasihat hukum resmi.`
                                }
                            ]
                        }],
                        generationConfig: {
                            temperature: 0
                        }
                    })
                }
            );

            const data = await response.json();

            if (!data.candidates) {
                showError('Gagal menganalisis dokumen. Coba lagi beberapa saat.');
                resetAnalyzebtn();
                return;
            }

            const hasilTeks = data.candidates[0].content.parts[0].text;
            tampilkanHasil(hasilTeks);

        }   catch (err) {
            showError('Terjadi kesalahan koneksi. Periksa internet dan coba lagi.');
        } 
    };
});

// ====== RESET BUTTON =====
resetBtn.addEventListener('click', function () {
    resetUpload();
    uploadState.classList.remove('hidden');
    resultState.classList.add('hidden');
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
    resultContent.innerHTML = `
        <div class="loading-container">
                <p class="loading-text">Sedang menganalisis dokumen...</p>
        </div>
        `;
}

function resetAnalyzebtn() {
    uploadState.classList.remove('hidden');
    resultState.classList.add('hidden');
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Analisis Dokumen';
}

function tampilkanHasil(teks) {
    uploadState.classList.add('hidden');
    resultState.classList.remove('hidden');

    const sections = parseHasil(teks);

    resultContent.innerHTML = `
        ${sections.redflag ? `
        <div class="result-card card-redflag">
            <div class="card-header">
                <span class="card-icon">🔴</span>
                <h3>Perlu Diperhatkan</h3>
            </div>
            <ul class="redflag-list">
                ${sections.redflag.map((item, i) => `
                    <li>
                        <span class="redflag-number">${i + 1}</span>
                        ${item}
                    </li>
                `).join('')}
            </ul>
        </div>` : ''}

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

        ${sections.detail.length > 0 ? `
        <div class="accordion-title">
            <span>📖</span> Detail Per Bagian
        </div>
        ${sections.detail.map(item => `
            <details class="accordion-item">
                <summary>${item.judul}</summary>
                <div class="accordion-body">${item.isi}</div>
            </details>
        `).join('')}` : ''}
    `;
}

function parseHasil(teks) {
    const result = {
        redflag: [],
        ringkasan: '',
        poinPenting: [],
        detail: []
    };

    const lines = teks.split('\n');
    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.includes('Perlu Diperhatikan')) {
            currentSection = 'redflag';
        } else if (line.includes('Ringkasan Dokumen')) {
            currentSection = 'ringkasan';
        } else if (line.includes('Poin Penting')) {
            currentSection = 'poinpenting';
        } else if (line.includes('Detail Per Bagian')) {
            currentSection = 'detail';
        } else if (line === '' || line.startsWith('---') || line.startsWith('⚠️')) {
            continue;
        } else if (currentSection === 'redflag' && (line.startsWith('-') || line.startsWith('*') || line.match(/^\d+\./))) {
            result.redflag.push(stripMarkdown(line.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '')));
        } else if (currentSection === 'ringkasan' && line != '') {
            result.ringkasan += (result.ringkasan ? '' : '') + line;
        } else if (currentSection === 'poinpenting' && (line.startsWith('-') || line.startsWith('*') || line.match(/^\d+\./))) {
            result.poinPenting.push(stripMarkdown(line.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '')));
        } else if (currentSection === 'detail' && line != '') {
            if (line.startsWith('**') || line.startsWith('###') || line.startsWith('##') || line.startsWith('Pasal') || line.startsWith('Bagian')) {
                const judul = line.replace(/\*\*/g, '').replace(/^#+\s*/, '');
                result.detail.push({ judul, isi: '' });
            } else if (result.detail.length > 0) {
                const last = result.detail[result.detail.length - 1];
                last.isi += (last.isi ? ' ': '') + stripMarkdown(line.replace(/^[-*]\s*/, ''));
            }
        }
    }

    return result; 
}

function stripMarkdown(teks) {
  return teks
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1');
}