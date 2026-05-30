import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import mammoth from 'mammoth';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const upload = multer({ limits: { fileSize: 20 * 1024 * 1024 } });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files dari folder public/
app.use(express.static(path.join(__dirname, 'public')));

// ===== PROXY ENDPOINT =====
app.post('/api/analyze', upload.single('file'), async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if(!apiKey) {
        return res.status(500).json({ error: 'API key tidak ditemukan di server.' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'Tidak ada file yang dikirim.' });
    }

    const mime_type = req.file.mimetype;
    const isDocx = mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || req.file.originalname?.toLowerCase().endsWith('.docx'); 

    // Build parts array untuk Gemini - berbeda antara DOCX vs PDF/image
    let parts;

    const PROMPT_TEXT = `Kamu adalah asisten yang membantu orang Indonesia memahami dokumen legal dan administratif.

Sebelum menganalisis, tentukan dulu apakah dokumen ini termasuk dokumen resmi, legal, atau administratif (contoh: kontrak, surat resmi, tagihan, polis asuransi, akta, slip gaji, dokumen pemerintah, dll).

Jika BUKAN dokumen resmi/legal/administratif (contoh: tugas kuliah, materi pelajaran, artikel, cerita, resep, kode program, dll), balas HANYA dengan kata ini tanpa tambahan apapun:
BUKAN_DOKUMEN_LEGAL

Jika YA, lanjutkan analisis dokumen ini dan berikan output dalam format berikut (gunakan format ini persis):

## 🔴 Perlu Diperhatikan
Tuliskan HANYA jika ada klausa yang tidak umum, berpotensi merugikan, atau perlu didiskusikan sebelum tanda tangan. Jika tidak ada, tulis "Tidak ditemukan klausa yang perlu diwaspadai."
Maksimal 5 poin singkat. Awali setiap poin dengan tag tingkat risiko: [TINGGI] untuk klausa berbahaya/merugikan signifikan, [SEDANG] untuk klausa yang perlu diperhatikan, [INFO] untuk informasi penting namun tidak berbahaya. Tag ini WAJIB ada di setiap poin tanpa pengecualian. Jangan pernah menghilangkan tag ini.
Format setiap poin: - [TINGGI] Penjelasan klausa...

## 📋 Ringkasan Dokumen
Jelaskan dalam 3-5 kalimat singkat: dokumen ini apa, antara siapa, dan apa intinya.

## 📌 Poin Penting
Tuliskan 7 poin paling penting yang perlu diketahui user sebelum tanda tangan. Singkat, maksimal 1-2 kalimat per poin.

## 📊 Informasi Kilat
OPSIONAL — Sertakan section ini HANYA jika dokumen mengandung data terstruktur yang relevan (contoh: kontrak dengan nilai, perjanjian antar pihak, slip gaji, tagihan, asuransi). Jika tidak ada data yang cocok, SKIP section ini sepenuhnya (jangan tulis heading-nya).
Jika disertakan, tulis data sebagai pasangan KEY: VALUE, satu per baris. Gunakan key dari daftar berikut yang relevan saja:
JENIS: (jenis dokumen, contoh: Kontrak Kerja, Polis Asuransi)
PIHAK_1: (nama pihak pertama)
PIHAK_2: (nama pihak kedua)
NILAI: (nilai uang/nominal, contoh: Rp 50.000.000)
DURASI: (masa berlaku, contoh: 12 bulan, 1 tahun)
POSISI: (jabatan/posisi jika ada)
TANGGAL: (tanggal efektif atau penandatanganan)
LOKASI: (tempat/kota jika ada)
Hanya tulis key yang benar-benar ada nilainya dalam dokumen. Jangan mengarang nilai.

## 📖 Detail Per Bagian
Jelaskan isi dokumen per pasal/bagian dengan bahasa sehari-hari. Singkat dan padat.

---
⚠️ Dokumen ini hanya dijelaskan untuk membantu pemahaman, bukan nasihat hukum resmi.`;

    try {
        let extractedText = null;
        if (isDocx) {
            // Ekstrak teks dari DOCX pakai mammoth
            const { value: docxRaw } = await mammoth.extractRawText({ buffer: req.file.buffer });
            extractedText = docxRaw;

            if (!extractedText || extractedText.trim().length === 0) {
                return res.status(422).json({ error: 'Dokumen DOCX tidak bisa dibaca. Pastikan file tidak kosong atau terproteksi.' });
            }

            // Kirim sebagai teks biasa ke Gemini (tidak perlu inline_data)
            parts = [
                { text: `Berikut isi dokumen DOCX yang perlu dianalisis:\n\n${extractedText}` },
                { text: PROMPT_TEXT }
            ];
        } else {
            // PDF / image -> kirim sebagai inline_data seperti semula
            const base64Data = req.file.buffer.toString('base64');
            parts = [
                { inline_data: { mime_type, data: base64Data } },
                { text: PROMPT_TEXT}
            ];
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents:[{ parts }],
                    generationConfig: { temperature: 0 }
                })
            }
        );

        const data = await response.json();

        if (!data.candidates) {
            return res.status(502).json({ error: 'Gagal mendapat respons dari Gemini' });
        }

        const hasilTeks = data.candidates[0].content.parts[0].text;

        if (hasilTeks.trim().startsWith('BUKAN_DOKUMEN_LEGAL')) {
            return res.status(422).json({ 
                error: 'Dokumen tidak dikenali sebagai dokumen legal atau resmi. Pastikan file yang diupload adalah dokumen formal seperti kontrak, surat resmi, atau tagihan.' 
            });
        }

        const responsePayload = { result: hasilTeks };
        if (isDocx && extractedText) {
            responsePayload.docxText = extractedText;
        }
        res.json(responsePayload);

    } catch (err) {
        console.error('Proxy error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan di server.' });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);    
})