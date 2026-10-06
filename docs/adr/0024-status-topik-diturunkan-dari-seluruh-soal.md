# Status Topik diturunkan dari seluruh Soal, di antarmuka

## Status

accepted

## Konteks

Ticket #27 menyambungkan Progres yang sudah ada di backend (ticket #7) ke tampilan.
Satu hal yang dibutuhkannya belum pernah ditetapkan di mana pun: **aturan menggabungkan
status beberapa Soal menjadi satu status Topik** — aturan yang menggambar ○ ◐ ● di
sidebar.

Backend menyimpan Progres **per Soal** (`backend/src/store/progres.rs`), dan menurunkan
status **satu Soal** lewat `status_dari`: pernah benar → `selesai`; pernah dicoba →
`sedang`; belum → `belum`. Untuk status **per Topik**, komentar di modul itu menyatakan
terus terang bahwa aturannya belum ada:

> Ini status per Soal, bukan per Topik. User story 51 meminta status per Topik (belum /
> sedang / selesai); aturan penggabungan Soal menjadi satu status Topik belum ditetapkan
> di sini, karena belum ada ticket yang menggambar status Topik di sidebar.

Ticket #27 mencatat hal yang sama ("Aturan 'sedang' lawan 'selesai' belum ditetapkan")
dan meminta aturan itu **dibaca dulu dari backend sebelum menulis aturan kedua di
antarmuka**. Yang ada di backend adalah aturan per Soal; aturan per Topik memang tidak
ada di sana. Jadi ia harus ditetapkan sekarang.

Setiap Topik punya 6 Soal: 5 Kuis dan 1 Soal Kode (issue #1, `JUMLAH_KUIS` dan
`JUMLAH_SOAL_KODE` di `periksa.ts`).

## Keputusan

**Status Topik diturunkan dari status seluruh Soalnya, dengan aturan berikut:**

| Status | Syarat |
|---|---|
| `selesai` (●) | **seluruh** 6 Soal sudah pernah dijawab benar |
| `sedang` (◐) | sudah ada percobaan, tetapi belum semuanya benar |
| `belum` (○) | belum ada percobaan sama sekali, atau Topiknya belum punya Soal |

Tiga keputusan turunan, dan alasannya:

### 1. Aturannya di antarmuka, bukan di backend

`status_dari` (per Soal) ada di backend karena ia diturunkan dari kolom yang
**disimpan** di sana — `percobaan` dan `benar_terakhir`. Aturan per Topik tidak
menyentuh database sama sekali: ia bekerja pada daftar baris yang sudah dibaca. Jadi ia
tidak punya alasan untuk berada di backend, dan menaruhnya di sana berarti menambah
endpoint atau mengubah balasan `GET /api/progres` untuk keputusan yang murni tampilan.

Tempatnya: `frontend/src/lib/progres/status.ts`, sebagai fungsi murni. Sama alasannya
dengan `lib/kuis/penilaian.ts` — salah di sini berarti sidebar berbohong tanpa satu pun
error, jadi ia harus bisa diuji tanpa merender React.

### 2. Jumlah Soal datang dari konten, bukan dari panjang baris Progres

Baris Progres hanya ada untuk Soal yang **pernah disentuh**. Kalau "semua Soal benar"
disimpulkan dari panjang daftar baris, satu Soal benar dari enam akan tampak "semuanya
benar" — dan Topik yang baru disentuh sekali langsung tampil ●. Karena itu
`statusTopik(baris, jumlahSoal)` menerima `jumlahSoal` sebagai argumen wajib, dihitung
dari berkas Topik saat halaman dirender di server.

### 3. Soal Kode ikut menentukan status Topik

● menuntut **keenam** Soal benar, termasuk Soal Kode. Alternatifnya — hanya kelima Kuis
yang menentukan — akan menampilkan Topik sebagai ● walaupun Soal Kodenya belum
dikerjakan, dan itu bertentangan dengan gagasan "selesai" yang dipakai pemelajar:
Soal Kode adalah bagian Topik, bukan pelengkap.

Konsekuensinya Soal Kode yang **gagal** (galat sintaks, lewat waktu, sebagian test case
tidak lulus) tetap tercatat sebagai satu percobaan → ◐. Itu memang tujuannya:
percobaan yang belum berhasil tetap kemajuan, dan pemelajar melihat ia sudah menyentuh
Topik itu. Yang tidak boleh terjadi adalah percobaan itu dihitung sebagai benar, dan itu
dijamin karena `semuaLulus` hanya `true` untuk status `ok` dengan seluruh kasus lulus.

## Alternatif yang ditolak

**Aturan per Topik ditulis di backend (`store::progres`).** Ditolak: aturan ini tidak
membaca database. Menaruhnya di sana menuntut endpoint baru atau balasan baru, dan
menyebarkan satu keputusan tampilan ke dua bahasa pemrograman.

**Jumlah Soal disimpulkan dari baris Progres.** Ditolak: baris hanya ada untuk Soal yang
pernah disentuh, sehingga satu Soal benar akan tampak sebagai Topik selesai. Ini cacat
senyap — tidak ada error, hanya sidebar yang salah.

**● cukup dari kelima Kuis.** Ditolak: Topik akan tampak selesai sebelum Soal Kodenya
dikerjakan. Lihat keputusan 3.

**● dari satu Soal benar saja.** Ditolak: statusnya berhenti berarti "tuntas", dan
sidebar tidak lagi membedakan Topik yang baru dimulai dari yang sudah dikuasai.

**Aturan ditulis sebagai komentar di kode, tanpa ADR.** Ditolak pemilik: aturan ini
setara dengan `status_dari` — ia menentukan arti ○ ◐ ● yang dibaca pemelajar, dan
tidak ada tempat lain yang mencatatnya.

## Akibat

- `frontend/src/lib/progres/status.ts` menjadi **satu-satunya** tempat aturan per Topik
  hidup. `status_dari` di backend tetap satu-satunya tempat aturan per Soal hidup.
- Status per Topik **tidak** disimpan di database, sama seperti status per Soal —
  keduanya diturunkan, mengikuti alasan yang sama dengan ADR-0009 (satu fakta, satu
  tempat).
- Sidebar berubah dari menerima prop `status` menjadi membacanya dari
  `ProgresProvider` lewat `PenandaProgresTopik`, karena React context tidak bisa dibaca
  dari komponen server.
- Progres dibaca **sekali** per halaman Topik, bukan per komponen: halaman itu sudah
  memunculkan 12 galat konsol `401` tanpa token dari Catatan dan Kuis, dan pembacaan per
  komponen akan melipatgandakannya. Tanpa token, provider tidak mengirim permintaan
  sama sekali — baik baca maupun tulis.
- `POST /api/progres/{slug}/{indeks}` kini benar-benar dipanggil: setiap jawaban Kuis
  dan setiap Eksekusi Kode mencatat hasilnya.

## Rujukan

- Ticket #27 — Antarmuka: sambungkan Progres ke sidebar, Kuis, dan Soal Kode
- Ticket #7 — endpoint Progres (backend)
- `backend/src/store/progres.rs` — `status_dari`, aturan per Soal
- `docs/design-tree.md` — ○ belum, ◐ sedang, ● selesai
- ADR-0009 — satu fakta diturunkan di satu tempat (daftar isi)
- ADR-0014 — sesi Kuis di `sessionStorage` (Progres bukan penggantinya)
