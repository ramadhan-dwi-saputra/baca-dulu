# Baca Dulu

Aplikasi AI untuk memahami dokumen resmi, kontrak, surat, dan tagihan dalam bahasa sehari-hari — tanpa perlu jadi ahli hukum.

## Live App

🔗 [baca-dulu-244429600889.asia-southeast2.run.app](https://baca-dulu-244429600889.asia-southeast2.run.app)

## Tentang

Baca Dulu membantu masyarakat Indonesia memahami isi dokumen — mulai dari kontrak kerja, surat pemerintah, tagihan, polis asuransi, hingga dokumen BPJS — dan menjelaskannya dalam bahasa yang mudah dimengerti. Aplikasi ini juga mendeteksi klausa atau poin yang perlu diperhatikan sebelum ditandatangani.

## Fitur

- **Upload fleksibel** — PDF, DOCX, dan foto dokumen (JPG, PNG, WebP, HEIC)
- **Analisis AI** — Ringkasan, poin penting, dan detail per bagian/pasal
- **Deteksi Perlu Diperhatikan** — Klausa berisiko atau tidak lazim ditandai otomatis
- **Privacy-first** — Dokumen tidak disimpan di server setelah dianalisis
- **Guardrail** — Dokumen non-formal/non-legal diblokir di level server

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | HTML, CSS, JavaScript (Vanilla) |
| Backend | Node.js + Express |
| AI | Gemini 2.5 Flash API (Google AI) |
| DOCX parsing | Mammoth.js |
| Deployment | Google Cloud Run + Docker |

## Cara Run Lokal

**Prerequisites:** Node.js 18+, npm, Gemini API key

```bash
# Clone repo
git clone https://github.com/ramadhan-dwi-saputra/baca-dulu
cd baca-dulu

# Install dependencies
npm install

# Setup environment variable
cp .env.example .env
# Edit .env dan isi GEMINI_API_KEY=your_key_here

# Jalankan server
npm start
# atau: node server.js
```

Buka `http://localhost:8080` di browser.

## Deployment (Google Cloud Run)

**Prasyarat:**
- Google Cloud account dengan billing aktif
- gcloud CLI terinstall dan sudah login (`gcloud auth login`)
  > *Catatan pengguna Windows: Jika gcloud diblokir di VS Code, jalankan `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` di PowerShell terlebih dahulu.*
- Project GCP sudah dibuat dan di-set sebagai aktif (`gcloud config set project YOUR_PROJECT_ID`)
- Cloud Run API sudah diaktifkan (`gcloud services enable run.googleapis.com`)

Untuk setup GCP dari nol, ikuti [panduan resmi Google Cloud Run](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service).

**Deploy:**
```bash
gcloud run deploy baca-dulu --source . --project=YOUR_PROJECT_ID --region asia-southeast2 --allow-unauthenticated
```

**Set environment variable setelah deploy:**
1. Buka Cloud Run di Google Cloud Console
2. Pilih service `baca-dulu` → Edit & Deploy New Revision
3. Di bagian Variables & Secrets, tambahkan:
   - Name: `GEMINI_API_KEY`
   - Value: `your_actual_gemini_api_key`
   
## Struktur Project

```
baca-dulu/
├── public/
│   ├── index.html      # UI utama
│   ├── style.css       # Styling
│   └── app.js          # Frontend logic & parser
├── server.js           # Express backend + Gemini proxy
├── package.json        # "type": "module" (ES Modules)
├── Dockerfile
├── .env                # GEMINI_API_KEY (jangan di-commit)
├── .gitignore
└── README.md
```

## Catatan Teknis

- ES Module (`import/export`), `"type": "module"` di `package.json`
- Multer v2 untuk file upload handling
- File limit: 20MB
- Port: 8080 (Cloud Run default)
- Guardrail saat ini di prompt-level; rencana upgrade ke gatekeeper layer terpisah

## Dibuat oleh

**Ramadhan Dwi Saputra** — Submission untuk **#JuaraVibeCoding 2026**