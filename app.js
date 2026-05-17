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
                                text: 'Jelaskan isi dokumen ini dalam bahasa Indonesia yang sederhana dan mudah dipahami oleh orang awam. Gunakan bahasa sehari-hari.'
                            }
                        ]
                    }]
                })
            }
        );

        const data = await response.json();
        const hasilTeks = data.candidates[0].content.parts[0].text;
        tampilkanHasil(hasilTeks);
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