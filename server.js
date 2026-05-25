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
Maksimal 3 poin singkat.

## 📋 Ringkasan Dokumen
Jelaskan dalam 3-5 kalimat singkat: dokumen ini apa, antara siapa, dan apa intinya.

## 📌 Poin Penting
Tuliskan 5 poin paling penting yang perlu diketahui user sebelum tanda tangan. Singkat, maksimal 1-2 kalimat per poin.

## 📖 Detail Per Bagian
Jelaskan isi dokumen per pasal/bagian dengan bahasa sehari-hari. Singkat dan padat.

---
⚠️ Dokumen ini hanya dijelaskan untuk membantu pemahaman, bukan nasihat hukum resmi.`;

    try {
        if (isDocx) {
            // Ekstrak teks dari DOCX pakai mammoth
            const { value: extractedText } = await mammoth.extractRawText({ buffer: req.file.buffer });

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

        res.json({ result: hasilTeks });

    } catch (err) {
        console.error('Proxy error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan di server.' });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);    
})