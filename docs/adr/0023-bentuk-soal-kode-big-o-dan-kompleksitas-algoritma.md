# Bentuk Soal Kode Big-O, dan `kompleksitas` yang berisi algoritma

## Status

accepted

## Konteks

Ticket #16 meminta Topik **Big-O / Kompleksitas** dikerjakan tuntas: Materi dua bahasa,
5 Kuis skenario, 1 Soal Kode, dan 6 Pembahasan. Kriteria penerimaannya menyebut
"1 Soal Kode berbentuk implementasi dari nol, dengan test case" dan "Solusi referensi
lulus semua test case saat build".

Dua hal membuat Topik ini berbeda dari Stack, dan keduanya tidak dijawab ticket:

1. **Big-O bukan struktur data.** `docs/design-tree.md` menetapkan bentuk Soal Kode
   sebagai "implementasi struktur data dari nol" (Cabang 1, "Bentuk Soal Kode"). Stack
   memenuhinya secara alami — pemelajar menulis kelas `Stack`. Big-O adalah **cara
   mengukur**, bukan benda yang bisa diimplementasikan. Bentuk yang ditetapkan
   design-tree karena itu tidak bisa dipakai apa adanya, dan penggantinya adalah
   keputusan pemilik.

2. **Field `kompleksitas` berbentuk untuk struktur data.** Skema di issue #1 dan
   ADR-0019 menetapkan `kompleksitas[].struktur` sebagai nama struktur, dengan `ruang`
   sekali per struktur dan `waktu` per operasi. Topik Big-O justru **mengajarkan**
   notasi itu, bukan memakainya untuk mendaftar operasi sebuah struktur.

## Keputusan

**Dua keputusan, keduanya jawaban pemilik.**

### 1. Soal Kode: menulis dua pencarian dari nol dan mengembalikan jumlah langkah

Pemelajar menulis `cari_linear` dan `cari_biner` dari nol, lalu fungsi `proses`
mengembalikan `[jumlah langkah linear, jumlah langkah biner]`. Lima test case memakai
daftar terurut; yang terakhir memakai 16 elemen untuk memperlihatkan bedanya secara
angka (`[16, 5]` — linear tumbuh mengikuti n, biner mengikuti log n).

Soalnya tetap "implementasi dari nol" dalam arti yang berlaku untuk Topik ini:
perulangannya ditulis sendiri, dan skenarionya melarang `bisect` maupun operator `in`.

### 2. `kompleksitas` berisi **algoritma yang dianalisis**, bukan struktur data

Empat entri: pencarian linear, pencarian biner, perulangan bersarang, dan pengurutan.
Nama field tetap `struktur`; isinya yang berbeda.

## Alasan

**Kenapa bukan "struktur data" yang dipaksakan.** Big-O bisa saja dipaksa memakai
struktur — misalnya meminta pemelajar mengimplementasikan array dan menghitung biaya
operasinya. Tetapi itu mengajarkan hal yang salah tentang Topik ini: pelajarannya bukan
"array punya biaya begini", melainkan "cara membaca biaya dari bentuk kode". Meminta
implementasi struktur di Topik 1 juga menyimpang dari urutan Jalur, karena struktur
data baru dibahas mulai Topik 2.

**Kenapa jumlah langkah, bukan waktu.** Mengembalikan jumlah langkah membuat
perbandingan `O(n)` lawan `O(log n)` menjadi **angka yang bisa diperiksa test case**.
Mengembalikan waktu dalam detik tidak bisa diuji — ia berbeda di setiap mesin, dan itu
justru hal yang Materi ini ajarkan untuk **tidak** diandalkan. Dengan menghitung
langkah, test case menguji konsepnya, bukan kecepatan mesin.

**Kenapa lima test case dengan bentuk yang berbeda-beda.** Kasus 1–4 memakai lima
elemen supaya bisa diperiksa dengan mata; kasus 5 memakai enam belas elemen supaya
selisihnya terlihat (16 lawan 5). Kalau semuanya berukuran kecil, pemelajar bisa
menyimpulkan bahwa keduanya hampir sama — kesimpulan yang persis dibantah Topik ini.

**Kenapa `kompleksitas` diisi algoritma, bukan struktur.** Field ini sumber ekspor
CSV/Anki (ticket #14), dan yang layak dihafal dari Topik Big-O adalah biaya
**algoritma**: "pencarian biner O(log n)", "perulangan bersarang O(n²)". Mengisinya
dengan struktur akan menghasilkan kartu yang salah untuk Topik ini. Yang dibayar:
nama field `struktur` tidak lagi harfiah, dan itu dicatat di komentar kepala
`content/big-o.yaml`.

**Kenapa nama field tidak diganti.** Mengganti `struktur` menjadi sesuatu yang lebih
umum (`entri`, `pokok`) akan menyentuh `tipe.ts`, validator `periksa.ts`, penyusun
kartu `kartu.ts`, dan uji-ujinya — empat berkas untuk satu Topik, dengan risiko
menggeser 20 kartu Stack yang sudah benar. Aturan repo ini adalah abstraksi diubah saat
ada kebutuhan kedua yang nyata, bukan saat satu berkas tidak cocok. Kalau Topik 2–12
juga butuh bentuk umum, penggantian nama itu jadi perubahan yang jelas.

**Kenapa penyimpangan ini dicatat di sini, bukan didiamkan.** `design-tree.md` adalah
rencana yang sudah dibaca pemilik, dan menyimpang darinya tanpa catatan berarti
rencananya berbohong. Pola yang sama sudah dipakai #10 (ADR-0022) dan #15 (ADR-0021).

## Konsekuensi

- **`docs/design-tree.md` tetap memuat kalimat lamanya.** Kalimat "Bentuk Soal Kode:
  implementasi struktur data dari nol" dibiarkan terlihat sebagai catatan sejarah, dan
  diberi penunjuk ke ADR ini — sama seperti perlakuan pada `:40`/`:42` di ADR-0022.
- **Tanpa perubahan skema, tanpa perubahan validator.** `content/big-o.yaml` memenuhi
  gerbang yang sudah ada; `periksa.ts` dan `tipe.ts` tidak tersentuh. Topik baru masuk
  sebagai **berkas baru**, bukan sebagai cabang baru di kode.
- **`/id/topik/big-o` dan `/en/topik/big-o` statis.** Diperiksa pada keluaran build,
  bersama `/id/topik/stack`.
- **Gerbang solusi referensi hijau**: `big-o → soal[5]` lulus 5 test case di kontainer
  `dsa-runner:lokal`.
- **Ekspor Anki bertambah 24 kartu**: 10 dari `kompleksitas` (4 kartu ruang — satu per
  struktur — dan 6 kartu waktu — satu per operasi) dan 14 dari `istilah` (7 definisi dan
  7 pasangan Indonesia–English). Diperiksa dengan memuat konten dan menyusun kartunya.
- **Kriteria "Progres Topik ini terlacak" belum terpenuhi, dan itu disengaja.**
  Endpoint Progres sudah ada sejak #7, tetapi menyambungkannya ke tampilan belum
  dikerjakan dan belum pernah punya ticket. Itu pekerjaan tersendiri yang menyentuh
  sidebar dan pencatatan jawaban Kuis serta Soal Kode — bukan lingkup menulis Materi.
  Pemilik memilih memisahkannya menjadi ticket baru. Lihat komentar penutup #16.
- **Dua cacat ditemukan dengan menjalankan, bukan membaca** — dan keduanya sudah
  diperbaiki: (a) klaim "perulangan bagi-dua berputar 20 kali untuk n = 1.000.000"
  salah, hasil sebenarnya 19; (b) Pembahasan Kuis 5 mula-mula menyebut kedua fungsi
  `O(n)` waktu, padahal `salinan_terbalik` memakai `insert(0, ...)` sehingga `O(n²)`.
  Keduanya jenis kesalahan yang lolos dari pembacaan kode.

## Alternatif yang ditolak

**Soal Kode berbentuk implementasi struktur data** (mis. array dengan pencarian manual).
Ditolak karena menyimpang dari urutan Jalur: struktur data baru dibahas mulai Topik 2,
dan memaksa satu di Topik 1 mengajarkan hal yang bukan pelajaran Topik ini.

**Fungsi penghitung pola pertumbuhan** — mengembalikan jumlah langkah untuk beberapa
pola (konstan, log, linear, n log n, kuadrat). Ditolak karena lebih menyerupai latihan
matematis daripada menulis kode, dan tidak memaksa pemelajar menulis perulangan
pencarian yang justru inti perbandingannya.

**Struktur dengan operasi O(1) lawan O(n).** Ditolak karena membawa kembali masalah
yang sama — ia butuh struktur data, dan yang diukur menjadi biaya struktur, bukan
bentuk kode.

**`kompleksitas` diisi kelas pertumbuhan** (O(1), O(log n), …) alih-alih algoritma.
Ditolak karena field `ruang` menjadi tidak wajar: sebuah **kelas** tidak punya
kompleksitas ruang tersendiri; yang punya adalah algoritma yang memakainya.

**Mengganti nama field `struktur`.** Ditolak karena blast radius-nya empat berkas dan
dua puluh kartu Stack yang sudah benar, demi satu Topik — lihat alasan di atas.

**Mengosongkan `kompleksitas` untuk Topik ini.** Ditolak karena field itu **wajib**,
dan itu keputusan sadar ADR-0019: membuatnya opsional akan membuat CSV kehilangan baris
diam-diam begitu Topik kedua ditulis dengan bentuk berbeda.

## Sumber

- Issue #16 — kriteria penerimaan: Materi dua bahasa; 5 Kuis skenario, sebagian dengan
  kode; Pembahasan penuh (pendekatan, kompleksitas, kode referensi, jebakan umum);
  1 Soal Kode implementasi dari nol dengan test case; solusi referensi lulus saat build;
  tidak menyalin soal LeetCode; tampil di sidebar; Progres terlacak.
- Issue #1 — "Bentuk data Materi dan Soal" (skema YAML, `solusi_referensi` wajib lulus
  test case-nya sendiri); "Gerbang validasi Materi saat build".
- `docs/design-tree.md` — Cabang 1: "Bentuk Soal Kode: implementasi struktur data dari
  nol, diuji test case otomatis"; "Batas keras: tidak ada soal bergaya LeetCode";
  Cabang 2: "Penyimpanan konten: satu file YAML per Topik".
- `docs/adr/0019-field-kompleksitas-istilah-dan-ekspor-csv.md` — bentuk `kompleksitas`
  dan `istilah`, alasan keduanya wajib, dan pemakaiannya untuk ekspor CSV.
- `docs/adr/0005-soal-original-berbasis-skenario.md` — Soal dan Pembahasan ditulis
  original; soal LeetCode boleh ditautkan, tidak boleh disalin.
- `docs/adr/0003-materi-di-git-catatan-di-database.md` — Materi dan Soal hidup di git
  dan dibaca saat build; backend tidak membacanya. Itu sebabnya Topik baru cukup
  ditambahkan sebagai berkas, tanpa perubahan backend.
- `docs/adr/0014-sesi-kuis-di-sessionstorage.md` — sesi Kuis hidup di `sessionStorage`
  dan penilaiannya fungsi murni; konteks bagi komentar "jangan ganti dengan
  `localStorage`" di ticket lanjutan #27.
- `docs/adr/0022-eksekusi-kode-lokal-lewat-docker.md` — pola mencatat penyimpangan dari
  `design-tree.md` beserta alasan dan sumbernya.
- `content/jalur.yaml` — Topik 1 `big-o`, `prasyarat: []`.
- `content/stack.yaml` — bentuk acuan satu Topik utuh yang sudah lulus gerbang.
