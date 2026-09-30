# Situs belajar DSA

Situs belajar Data Structures & Algorithms pribadi: 12 Topik, Materi dua bahasa,
Kuis skenario, dan Soal Kode yang dijalankan backend Rust.

Rencana lengkap dan seluruh keputusan ada di `docs/design-tree.md`. Kosakata proyek
ada di `CONTEXT.md`. Keputusan arsitektur ada di `docs/adr/`.

## Struktur repo

| Folder | Isi |
|---|---|
| `frontend/` | Antarmuka Next.js (App Router, TypeScript, Tailwind) |
| `backend/` | Backend Rust (axum) — Eksekusi Kode, Progres, Catatan |
| `content/` | Satu berkas YAML per Topik, dibaca saat build |

## Menyalakan

Butuh Docker Desktop yang jalan.

```bash
docker compose up
```

- Antarmuka: <http://localhost:3000>
- Backend: <http://localhost:8080/api/health>

Satu perintah itu menyalakan keduanya. Antarmuka memanggil backend lewat rewrite
di server Next (`frontend/next.config.ts`), jadi tidak ada CORS.

`docker compose up` belum butuh berkas `.env`. Kalau nanti backend membaca rahasia,
salin contohnya lebih dulu dan isi nilainya:

```bash
cp .env.example .env
```

Menghentikan: `Ctrl+C`, lalu `docker compose down`.

### Port

Bawaan `3000` (antarmuka) dan `8080` (backend). Di Windows, sebagian rentang port
direservasi Hyper-V/WSL2, dan port yang jatuh di dalamnya gagal di-bind dengan pesan
"access a socket in a way forbidden by its access permissions". Periksa dengan
`netsh interface ipv4 show excludedportrange protocol=tcp`, lalu ganti lewat `.env`:

```
FRONTEND_PORT=3100
BACKEND_PORT=8180
```

### Hot reload

- **Antarmuka** — kode di-bind ke container, jadi perubahan memicu Fast Refresh.
  Dua penyesuaian diperlukan supaya ini benar-benar bekerja di Docker Desktop
  Windows, dan keduanya sudah diuji, bukan tebakan:
  1. `npm run dev:docker` memakai **webpack**, bukan Turbopack. Watcher Turbopack
     (bawaan Next 16) tidak pernah membangun ulang berkas yang di-bind dari host
     Windows — halaman tetap menyajikan isi lama walaupun berkas di dalam container
     sudah berubah. Di host, `npm run dev` tetap memakai Turbopack.
  2. Compose menyetel `WATCHPACK_POLLING=true`. Docker Desktop tidak meneruskan
     event filesystem dari host, jadi watcher webpack harus polling untuk melihat
     perubahan. Tanpa ini, perubahan berkas juga tidak membangun ulang.
- **Backend** — kode di-bind, tetapi Rust adalah bahasa terkompilasi: perubahan
  perlu kompilasi ulang. `docker compose restart backend` menjalankan ulang
  `cargo run` dengan kode terbaru (kompilasi pertama 1-3 menit, setelahnya lebih cepat
  karena `target/` disimpan di volume bernama).

### Tanpa Docker

Backend dan antarmuka bisa dijalankan langsung di host, dan itu **lebih cepat**:

```bash
# terminal 1
cd backend && cargo run

# terminal 2
cd frontend && npm install && npm run dev
```

## Menjalankan test

```bash
cd backend && cargo test          # uji integrasi di batas API
cd frontend && npm run typecheck  # pemeriksaan tipe
```

## Catatan: Docker Compose memperlambat loop pengembangan

Next.js secara resmi menyarankan menjalankan `next dev` **tanpa** Docker di macOS
dan Windows, karena lapisan berbagi berkas Docker Desktop menunda event filesystem
dan membuat Fast Refresh lambat. Compose di repo ini tetap ada karena keputusan
proyek memang memakainya (`docs/design-tree.md`). Penyesuaian di bagian Hot reload
adalah yang membuatnya benar-benar bekerja, bukan sekadar mengikuti dokumentasi.
Kalau loop terasa terlalu lambat, jalur "Tanpa Docker" di atas adalah jalan pintasnya.
