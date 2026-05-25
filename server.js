import { log } from 'console';
import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files dari folder punlic/
app.use(express.static(path.join(__dirname, 'public')));

// ===== PROXY ENDPOINT =====
app.post('api/analyze', upload.single('file'), async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if(!apiKey) {
        return res.status(500).json({ error: 'API key tidak ditemukan di server.' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'Tidak ada file yang dikirim.' });
    }

    const base64Data = req.file.buffer.toString('base64');
    const mime_type = req.file.mimetype;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contens:[{
                        parts:[
                            {
                                inline_data: {
                                    mime_type: mime_type,
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
            return res.status(502).json({ error: 'Gagal mendapat respons dari Gemini' });
        }

        const hasilTeks = data.candidates[0].contens.parts[0].text;
        res.json({ result: hasilTeks });

    } catch (err) {
        console.error('Proxy error:', err);
        res.status(500).json({ error: 'Terjadi kesalahan di server.' });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log('Server berjalan di port ${PORT}');    
})