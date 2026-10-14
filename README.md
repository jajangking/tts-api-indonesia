# TTS API — Gemini TTS Bahasa Indonesia

REST API sederhana: terima teks → kembalikan audio WAV suara Bahasa Indonesia
yang natural (model `gemini-3.8-flash-tts`, fallback otomatis ke
`gemini-2.5-flash-preview-tts` / `gemini-2.5-pro-preview-tts` bila kuota model
utama habis).

Tanpa dependensi npm — murni Node.js 18+ (`fetch` bawaan).

## Endpoint

| Method | Path | Fungsi |
|---|---|---|
| `POST` | `/api/tts` | Teks → audio WAV |
| `GET` | `/api/voices` | Daftar voice + model |
| `GET` | `/samples` | Halaman dengar/unduh file `.wav` di folder `samples/` |
| `GET` | `/` | Halaman uji (textarea + player, key tidak terekspos) |

### POST /api/tts

Request:

```json
{
  "text": "Jam di tanganmu berdetak 86 ribu kali sehari.",
  "voice": "Kore",
  "language": "id-ID",
  "style": "Narasi dokumenter yang hangat"
}
```

- `text` wajib, maks 5000 karakter.
- `voice` opsional (default `Kore`), lihat `/api/voices`.
- `language` opsional (default `id-ID`).
- `style` opsional — instruksi gaya bicara, ditempel ke prompt.

Response sukses: `audio/wav` (PCM 16-bit mono 24000 Hz).
Response gagal: JSON `{ "error": "..." }` (400 validasi, 502 error hulu).

Contoh:

```sh
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Halo dunia.","voice":"Kore","language":"id-ID"}' \
  --output suara.wav
```

## Menjalankan

```sh
cp .env.example .env        # isi GEMINI_API_KEY
# GEMINI_API_KEY=... PORT=3000
node server.mjs
```

API key gratis: [aistudio.google.com](https://aistudio.google.com) → Get API Key.
**Jangan pernah commit file `.env` / API key ke repo.**

## Struktur

```
.
├── server.mjs      # seluruh server (tanpa dependensi)
├── .env.example    # contoh env
├── .gitignore      # mengabaikan .env, *.wav, *.mp3, *.m4a
└── README.md
```

## Catatan kuota

Paket gratis Gemini API membatasi jumlah request/hari per model
(error `Quota exceeded ... retry in XXh`). Server otomatis mencoba model
cadangan bila model utama kehabisan kuota.

## Lisensi

MIT
