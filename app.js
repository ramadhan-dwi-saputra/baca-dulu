const fileInput = document.getElementById('file-input');
const fileNameDisplay = document.getElementById('file-name');

fileInput.addEventListener('change', function() {
    const file = fileInput.files[0];
    fileNameDisplay.textContent = 'File dipilih: ' + file.name ;
});

const analyzeBtn = document.getElementById('analyze-btn');

analyzeBtn.addEventListener('click', function() {
    const file = fileInput.files[0];

    if (!file) {
        alert('Pilih dokumen terlebih dahulu.');
        return;
    }

    if (file.size > 5 * 1024 *1024) {
        alert('Ukuran file maksimal 5MB.');
        return;
    }

    tampilkanLoading();
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Menganalisis...';
    
    const GEMINI_API_KEY = 'ISI_API_KEY';

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async function () {
        const base64Data = reader.result.split(',')[1];

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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
                    }]
                })
            }
        );

        const data = await response.json();

        if (!data.candidates) {
            tampilkanHasil('Gagal menganalisis dokumen. Coba lagi beberapa saat.');
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analisis Dokumen';
            return;
        }

        const hasilTeks = data.candidates[0].content.parts[0].text;
        tampilkanHasil(hasilTeks);
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analisis Dokumen';
    };
})

function tampilkanHasil(teks) {
  const resultArea = document.getElementById('result-area');
  resultArea.innerHTML = `
    <h2>Hasil Analisis</h2>
    <div class="result-content">
      ${marked.parse(teks)}
    </div>
  `;
}

function tampilkanLoading() {
    const resultArea = document.getElementById('result-area');
    resultArea.innerHTML = `
        <h2>Hasil Analisis</h2>
        <div class="result-content">
            <p class="loading-text">⏳ sedang menganalisis dokumen...</p>
        </div>
    `;
}