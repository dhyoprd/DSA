# Jalur dideklarasikan di `content/jalur.yaml`, tidak diturunkan dari berkas Topik

## Status

accepted

## Konteks

Issue #1 menetapkan skema satu berkas YAML per Topik, berisi `nomor`, `slug`,
`judul`, `prasyarat`, `materi`, dan `soal`. Ia tidak menetapkan dari mana **daftar
12 Topik** berasal.

Dua kebutuhan memaksa pertanyaan ini dijawab lebih dulu, sebelum ticket #3 bisa
menulis kode:

1. **Gerbang validasi** harus menolak `prasyarat` yang menunjuk Topik tidak ada.
   Untuk itu ia butuh daftar nomor Topik yang lengkap.
2. **Sidebar** (ticket #4) harus menampilkan 12 Topik, termasuk yang belum punya
   Materi, dengan label "segera" dan tidak bisa diklik.

Urutan membangun menambah satu tekanan lagi: Topik pertama yang ditulis adalah
**Stack, nomor 4**, dengan `prasyarat: [3]`. Padahal Topik 3 (Linked List) belum
tulis. Tanpa daftar yang mendeklarasikan Topik 1–12 lebih dulu, prasyarat yang sah
akan tampak seperti prasyarat yang menunjuk Topik tidak ada — dan Topik Stack gagal
gerbangnya sendiri.

## Keputusan

Daftar 12 Topik dideklarasikan eksplisit di `content/jalur.yaml`, berisi `nomor`,
`slug`, `judul{id,en}`, dan `prasyarat` untuk setiap Topik. Berkas Topik
(`content/<slug>.yaml`) hanya ada untuk Topik yang sudah siap ditulis.

Konsekuensinya, `nomor`, `slug`, `judul`, dan `prasyarat` muncul di dua tempat:
`jalur.yaml` dan berkas Topik. Duplikasi ini **disengaja**, dan validator menolak
build kalau keduanya berbeda — nilai di `jalur.yaml` yang dianggap benar untuk
daftar, nilai di berkas Topik untuk halamannya, dan keduanya wajib sepakat.

## Alasan

**Ia memisahkan dua hal yang memang berbeda.** "Topik apa saja yang ada di Jalur"
adalah keputusan Jalur yang jarang berubah dan berlaku untuk seluruh situs.
"Isi Topik ini" adalah tulisan yang ditambah terus. Menaruh keduanya di berkas yang
sama berarti menulis 12 berkas kosong lebih dulu hanya supaya sidebar bisa dirender.

**Ia menjaga sumber kebenaran tetap di git.** Alternatif konstanta TypeScript akan
menaruh daftar Jalur di dalam kode, bertentangan dengan keputusan `design-tree.md`
bahwa Materi dan Soal hidup di git dan dibaca saat build (ADR-0003).

**Ia membuat urutan bisa diubah tanpa memutus tautan.** `nomor` menentukan urutan
Jalur, `slug` menentukan alamat halaman. Karena keduanya dipisah dan didaftarkan di
satu tempat, mengubah urutan Topik tidak merusak tautan yang sudah ada.

**Duplikasinya dijaga mesin, bukan disiplin.** Duplikasi yang tidak dijaga akan
menyimpang. Karena validator memeriksa keselarasan kedua berkas, penyimpangan
menghentikan build — bukan menghasilkan sidebar yang menyebut hal berbeda dari
halaman Topiknya.

## Konsekuensi

- Menambah atau mengubah urutan Topik berarti menyunting `content/jalur.yaml` dan
  berkas Topik yang bersangkutan. Build gagal kalau keduanya tidak sepakat.
- `jalur.yaml` memakai nama field yang sama dengan berkas Topik (`nomor`, `slug`,
  `judul`, `prasyarat`), sehingga satu pembaca bisa memahami keduanya.
- Nomor Topik wajib membentuk urutan 1..N tanpa lubang dan tanpa duplikat. Nomor
  tidak boleh melompat karena itu tanda Topik terlewat, bukan fitur.
- Topik yang sudah punya berkas tetap harus lolos gerbang lengkap (5 Kuis + 1 Soal
  Kode). Jadi berkas Topik tidak bisa ditambahkan "setengah jalan" — menambah satu
  berkas berarti menulis Topik itu sampai tuntas. Ini disengaja: lebih baik Topik
  tampil "segera" daripada tampil setengah jadi.
- **Gerbang membaca `content/` dari luar folder `frontend/`.** Di lokal dan di Docker
  Compose itu beres (Compose memasang `content/` ke container, lihat
  `docker-compose.yml`). Di Vercel, `content/` harus ikut ter-upload — kalau Vercel
  diatur memakai Root Directory `frontend/`, folder `content/` tidak ikut dan build
  gagal. Variabel `CONTENT_DIR` disediakan sebagai jalan keluar. Penyebaran belum
  punya ticket sendiri, jadi hal ini dicatat di sini supaya tidak ketahuan saat
  pertama kali men-deploy.

## Alternatif yang ditolak

**Turunkan Jalur dari berkas Topik yang ada.** Tanpa berkas tambahan: daftar Topik =
isi direktori `content/`. Ditolak karena prasyarat Stack (`[3]`) tidak bisa
diverifikasi selama Topik 3 belum ditulis, sehingga aturan prasyarat harus dimatikan
justru pada saat ia paling berguna. Sidebar juga akan tumbuh dari satu Topik menjadi
12, bukan menampilkan cakupan penuh sejak hari pertama seperti yang diminta issue #1
(user story 1 dan 3).

**Konstanta TypeScript di `frontend/src/lib/`.** Tidak menambah skema YAML. Ditolak
karena menaruh daftar Jalur di dalam kode, bukan di git bersama Materi — dua
sumber kebenaran untuk hal yang sama, dan bertentangan dengan ADR-0003.

**Berkas Topik kosong untuk ke-12 Topik sejak awal.** Sidebar langsung lengkap tanpa
skema baru. Ditolak karena 11 berkas kosong akan gagal gerbang validasi (tidak punya
5 Kuis), sehingga gerbang harus dilonggarkan untuk berkas yang "belum selesai" —
melemahkan tepat pemeriksaan yang jadi alasan gerbang itu ada.
