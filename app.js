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

    console.log('Siap dianalisis:', file.name);
})