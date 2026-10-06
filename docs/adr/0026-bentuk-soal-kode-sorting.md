# Bentuk Soal Kode Sorting, dan `kompleksitas` yang berisi algoritma

## Status

accepted

## Konteks

Ticket #21 meminta Topik **Sorting** dikerjakan tuntas: Materi dua bahasa, 5 Kuis
skenario, 1 Soal Kode, dan 6 Pembahasan. Kriteria penerimaannya menyebut "1 Soal Kode
berbentuk implementasi dari nol, dengan test case" dan "Solusi referensi lulus semua
test case saat build".

Dua hal membuat Topik ini berbeda dari Stack, Array & String, Linked List, dan Hash
Table, dan keduanya tidak dijawab ticket:

1. **Sorting bukan struktur data.** `docs/design-tree.md` menetapkan bentuk Soal Kode
   sebagai "implementasi struktur data dari nol" (Cabang 1, "Bentuk Soal Kode").
   Hash table (#19), linked list (#18), dan array (#17) memenuhinya secara alami —
   pemelajar menulis sebuah kelas atau struktur. Sorting adalah **kumpulan algoritma
   untuk menyusun ulang data**, bukan benda yang bisa diimplementasikan. Bentuk yang
   ditetapkan design-tree karena itu tidak bisa dipakai apa adanya, dan penggantinya
   adalah keputusan pemilik. Situasi ini identik dengan Big-O (#16) dan Rekursi (#20),
   yang sudah lebih dulu menyimpang lewat ADR-0023 dan ADR-0025.

2. **Field `kompleksitas` berbentuk untuk struktur data.** Skema di issue #1 dan
   ADR-0019 menetapkan `kompleksitas[].struktur` sebagai nama struktur, dengan `ruang`
   sekali per struktur dan `waktu` per operasi. Topik Sorting justru **mengajarkan
   biaya beberapa algoritma** (`O(n²)` untuk gelembung dan sisip, `O(n log n)` untuk
   gabung), bukan mendaftar operasi sebuah struktur. Pola yang sama sudah dipakai #16
   dan #20.

## Keputusan

**Dua keputusan, keduanya jawaban pemilik.**

### 1. Soal Kode: menulis dua algoritma pengurutan dari nol dan mengembalikan jumlah perbandingan

Pemelajar menulis `urut_gelembung` (iteratif) dan `urut_gabung` (rekursif), masing-masing
mengembalikan **pasangan** `[hasil, jumlah_perbandingan]`. Fungsi `proses(daftar)`
memanggil keduanya dengan daftar yang sama dan mengembalikan satu daftar berisi empat
nilai: `[hasil_gelembung, banding_gelembung, hasil_gabung, banding_gabung]`.

Lima test case memakai nilai yang membuat bedanya terlihat. Untuk delapan elemen,
gelembung memakai **28** perbandingan (`8 × 7 / 2`) sedangkan gabung cukup **17**
(dihitung di Materi sebagai 4 + 6 + 7). Angka itu membuat beda `O(n²)` dan
`O(n log n)` terasa sebagai sesuatu yang bisa diperiksa test case, bukan sekadar
dijelaskan.

Soalnya tetap "implementasi dari nol" dalam arti yang berlaku untuk Topik ini:
kedua algoritmanya ditulis sendiri, dan skenarionya melarang `sorted()` serta
`list.sort()`.

**Gelembung yang dipakai sengaja POLOS — tanpa henti-awal.** Bentuk berhenti-awal
(berhenti begitu satu putaran tidak ada pertukaran) adalah bentuk yang lazim dipakai
di banyak buku, dan pada data yang sudah terurut ia hanya memakai `n - 1` perbandingan
— **lebih sedikit daripada pengurutan gabung**. Kalau bentuk itu yang dipakai, Soal
Kode ini akan mengajarkan hal yang berlawanan dengan Materinya sendiri, dan test
case-nya menjadi bergantung pada isi data. Dengan gelembung polos, jumlah
perbandingannya selalu `n × (n - 1) / 2` dan bisa diprediksi persis. Perbedaan itu
dijelaskan terbuka di bagian "Jebakan yang sering terjadi" di Materi dan di Pembahasan
Kuis 3, bukan disembunyikan.

### 2. `kompleksitas` berisi **algoritma yang dianalisis**, bukan struktur data

Tiga entri: pengurutan gelembung, pengurutan sisip, dan pengurutan gabung. Nama field
tetap `struktur`; isinya yang berbeda — sama seperti ADR-0023 dan ADR-0025.

## Alasan

**Kenapa bukan "struktur data" yang dipaksakan.** Sorting bisa saja dipaksa memakai
struktur — misalnya meminta pemelajar mengimplementasikan heap lalu memakai heapsort.
Tetapi itu mengajarkan hal yang salah tentang Topik ini: pelajarannya bukan "heap punya
biaya begini", melainkan "bentuk data memengaruhi berapa banyak perbandingan yang
dibutuhkan". Heap sendiri sudah jadi bahan Topik 10, dan memakainya di sini akan
menenggelamkan pelajaran pengurutannya.

**Kenapa jumlah perbandingan, bukan waktu.** Mengembalikan jumlah perbandingan membuat
perbandingan `O(n²)` lawan `O(n log n)` menjadi **angka yang bisa diperiksa test case**.
Mengembalikan waktu dalam detik tidak bisa diuji — ia berbeda di setiap mesin, dan itu
justru hal yang Materi Topik 1 ajarkan untuk **tidak** diandalkan. Dengan menghitung
perbandingan, test case menguji konsepnya, bukan kecepatan mesin. Alasan ini sama persis
dengan ADR-0023 dan ADR-0025, dan kesamaannya disengaja: tiga Topik yang bukan struktur
data memecahkan masalah bentuk yang sama dengan cara yang sama.

**Kenapa dua algoritma, bukan satu.** Satu algoritma saja tidak memperlihatkan bahwa
laju pertumbuhan bisa berbeda-beda. Dengan dua algoritma yang menerima daftar yang
sama, `urut_gelembung` memakai `n × (n - 1) / 2` perbandingan sedangkan `urut_gabung`
memakai `O(n log n)` — dan pada delapan elemen selisihnya (28 lawan 17) terbaca
langsung dari hasilnya. Itu membuat "bentuk algoritma menentukan biayanya" menjadi
angka, bukan kalimat.

**Kenapa `urut_gabung` yang rekursif, bukan pengurutan sisip yang iteratif.** Topik ini
punya prasyarat `[2, 6]` — Array & String **dan Rekursi**. Memilih gabung sebagai
algoritma kedua membuat prasyarat Rekursinya benar-benar dipakai: bagi-dan-taklukkan
di Materi adalah pola Rekursi yang persis, dengan kasus dasar `len <= 1` dan langkah
rekursif yang membelah dua. Pengurutan sisip tetap diajarkan di Materi dan muncul di
Kuis 4 sebagai jawaban terbaik untuk data yang hampir terurut, tetapi tidak dipakai di
Soal Kode karena ia tidak menyentuh prasyarat Rekursi sama sekali.

**Kenapa gelembung polos, bukan yang berhenti-awal.** Lihat keputusan 1. Ringkasnya:
bentuk berhenti-awal membuat hasilnya bergantung pada isi data dan, pada data terurut,
membalik kesimpulan Materi. Bentuk polos membuat angkanya pasti dan pelajarannya
konsisten.

**Kenapa `kompleksitas` diisi algoritma, bukan struktur.** Field ini sumber ekspor
CSV/Anki (ticket #14), dan yang layak dihafal dari Topik Sorting adalah biaya
**algoritma**: "pengurutan gelembung `O(n²)`", "pengurutan gabung `O(n log n)`",
"pengurutan sisip `O(n)` pada data terurut". Mengisinya dengan struktur akan
menghasilkan kartu yang salah untuk Topik ini.

**Kenapa nama field tidak diganti.** Mengganti `struktur` menjadi sesuatu yang lebih
umum akan menyentuh `tipe.ts`, validator `periksa.ts`, penyusun kartu `kartu.ts`, dan
uji-ujinya — empat berkas untuk satu Topik. Aturan repo ini adalah abstraksi diubah
saat ada kebutuhan kedua yang nyata, bukan saat satu berkas tidak cocok. ADR-0023 dan
ADR-0025 sudah menempuh jalan yang sama.

**Kenapa penyimpangan ini dicatat di sini, bukan didiamkan.** `design-tree.md` adalah
rencana yang sudah dibaca pemilik, dan menyimpang darinya tanpa catatan berarti
rencananya berbohong. Pola yang sama sudah dipakai #10 (ADR-0022), #15 (ADR-0021),
#16 (ADR-0023), dan #20 (ADR-0025).

## Konsekuensi

- **`docs/design-tree.md` tetap memuat kalimat lamanya.** Kalimat "Bentuk Soal Kode:
  implementasi struktur data dari nol" dibiarkan terlihat sebagai catatan sejarah, dan
  diberi penunjuk ke ADR ini — sama seperti perlakuan pada #16 dan #20.
- **Tanpa perubahan skema, tanpa perubahan validator.** `content/sorting.yaml`
  memenuhi gerbang yang sudah ada; `periksa.ts` dan `tipe.ts` tidak tersentuh. Topik
  baru masuk sebagai **berkas baru**, bukan sebagai cabang baru di kode.
- **`/id/topik/sorting` dan `/en/topik/sorting` statis.** Diperiksa pada keluaran
  build, bersama Topik lain yang sudah punya berkas.
- **Gerbang solusi referensi hijau**: `sorting → soal[5]` lulus 5 test case di
  kontainer `dsa-runner:lokal`.
- **Ekspor Anki bertambah 28 kartu per bahasa**: dari `kompleksitas` (3 kartu ruang —
  satu per struktur — dan 7 kartu waktu — satu per operasi) dan dari `istilah`
  (9 definisi dan 9 pasangan). Diperiksa dengan **memuat konten dan menyusun kartunya**
  lewat `kartuDariTopik`, bukan dihitung dengan rumus — hasilnya 28 kartu per bahasa,
  tanpa depan yang kembar, dan tanpa bentrok dengan Topik lain. "Bagi dan taklukkan"
  (sudah dipakai Rekursi) dan "Pencarian biner" (sudah dipakai Big-O) sengaja **tidak**
  didaftarkan lagi, karena front kartu definisinya akan sama.
- **Empat cacat ditemukan dengan menjalankan dan meninjau ulang, bukan membaca** — sama
  seperti #16 sampai #20:

  **(a) Batas atas rumus ditulis sebagai hasil pengukuran.** Pembahasan Kuis 4 mula-mula
  menyebut pengurutan gabung pada 10.000 elemen memakai `10.000 × 14 = 140.000`
  perbandingan. Itu **batas atas teoretis**, bukan angka sesungguhnya. Dijalankan di
  Python 3.14, gabung pada 10.000 elemen yang sudah terurut memakai **64.608**
  perbandingan, sedangkan sisip memakai **10.019** dan gelembung polos **49.995.000**.
  Angka pengukuran itu yang sekarang tertulis. Ini kelas kesalahan yang sama dengan #20:
  **batas atas rumus bukan hasil pengukuran**, dan keduanya tidak boleh dipertukarkan.

  **(b) `n log n` disajikan sebagai jumlah perbandingan.** Materi mula-mula menulis
  "untuk 16 elemen, `n² = 256` sedangkan `n log n = 16 × 4 = 64`" — padahal Kuis 3
  justru menandai **64** sebagai pengecoh dan menyatakan jumlah sesungguhnya **32**.
  Pembaca yang bertemu keduanya akan melihat dua pernyataan yang saling bertentangan.
  Materi sekarang menyebut 64 sebagai **laju pertumbuhan**, bukan hasil hitung, dan
  menegaskan angka sesungguhnya 32 — sekaligus menyebut pasangan 8 elemen (`n log n =
  24`, hasil sesungguhnya 17) sebagai contoh kedua.

  **(c) Arah perpindahan pada Kuis 5 terbalik.** Jebakan "seluruh data dipertahankan
  urutannya" mula-mula menjelaskan "siswa bernilai 70 tetap akan berpindah ke belakang
  siswa bernilai 80". Itu **salah arah**: pada pengurutan menaik, 70 justru berada di
  depan 80. Dijalankan, yang benar-benar berpindah ke belakang adalah siswa bernilai
  **90** yang tadinya di depan. Kalimatnya diganti dengan contoh itu.

  **(d) "Gabung tidak terpengaruh susunan data" bertabrakan dengan angka sendiri.**
  Kalimat penutup Kuis 4 menyebut gabung "tidak terpengaruh", padahal paragraf
  sebelumnya di Kuis yang sama baru saja menyebut 64.608 lawan 64.620 — beda belasan.
  Kalimatnya diselaraskan menjadi "hampir tidak terpengaruh", dengan gelembung sebagai
  satu-satunya yang benar-benar tidak terpengaruh.

  **Dua cacat lain tertangkap skrip pemeriksa mandiri sebelum sempat masuk:** satu blok
  "Kode referensi" di Kuis 3 memanggil fungsi yang hanya didefinisikan di field `kode`
  soal, sehingga blok itu tidak bisa dijalankan sendiri; dan istilah "Pengurutan stabil"
  muncul di Pembahasan Kuis 5 padahal Materi hanya menyebut "stabil", sehingga kartunya
  akan mengajarkan istilah yang tidak pernah diperkenalkan.

  **Satu cacat lagi ditemukan di dalam skrip pemeriksa itu sendiri**, dan itu layak
  dicatat: pengumpul blok kode mula-mula menaruh perulangan Pembahasan **di dalam**
  syarat "Kuis ini punya field `kode`", sehingga blok "Kode referensi" milik Kuis 4 dan
  Kuis 5 — yang tidak punya field `kode` — tidak pernah dijalankan, padahal skripnya
  melaporkan "semua bersih". Pemeriksa yang salah lapor lebih berbahaya daripada tidak
  ada pemeriksa, jadi jumlah blok yang dijalankan sekarang dihitung dan disebut di
  keluarannya (21 blok).

## Alternatif yang ditolak

**Soal Kode berbentuk implementasi struktur data** (mis. heap lalu heapsort). Ditolak
karena mengajarkan biaya struktur, bukan pengaruh bentuk algoritma terhadap banyaknya
perbandingan, dan karena Heap sudah jadi bahan Topik 10.

**Dua pengurutan iteratif, keduanya O(n²)** (mis. gelembung lawan sisip). Ditolak
karena keduanya sekelas pertumbuhannya, sehingga angka hasilnya tidak memperlihatkan
apa pun yang tidak sudah terlihat dari Materi — persis kesalahan bentuk yang dihindari
ADR-0023.

**Dua pengurutan rekursif, keduanya O(n log n)** (mis. gabung lawan cepat). Ditolak
karena keduanya sekelas pertumbuhannya pula, dan karena quicksort menambah bahan
(kasus terburuk `O(n²)`, pemilihan pivot) yang bukan inti Topik ini.

**Gelembung berhenti-awal.** Ditolak karena pada data yang sudah terurut ia memakai
lebih sedikit perbandingan daripada pengurutan gabung, sehingga Soal Kodenya akan
membantah kesimpulan Materinya, dan jumlah perbandingannya menjadi bergantung pada isi
data — sehingga test case-nya sulit diprediksi. Bentuk polos dipilih supaya angkanya
pasti.

**Mengurutkan dengan kunci `(nama, nilai)` atau mengembalikan daftar hasil saja tanpa
jumlah perbandingan.** Ditolak karena yang diuji menjadi hasil pengurutannya saja,
sedangkan yang ingin ditunjukkan Topik ini justru **biaya**-nya. Tanpa angka
perbandingan, beda `O(n²)` dan `O(n log n)` kembali hanya menjadi kalimat.

**`kompleksitas` diisi kelas pertumbuhan** (O(1), O(log n), …) alih-alih algoritma.
Ditolak karena field `ruang` menjadi tidak wajar: sebuah **kelas** tidak punya
kompleksitas ruang tersendiri; yang punya adalah algoritma yang memakainya.

**Mengganti nama field `struktur`.** Ditolak karena blast radius-nya empat berkas demi
satu Topik — lihat alasan di atas, dan penolakan yang sama di ADR-0023 dan ADR-0025.

**Mengosongkan `kompleksitas` untuk Topik ini.** Ditolak karena field itu **wajib**,
dan itu keputusan sadar ADR-0019: membuatnya opsional akan membuat CSV kehilangan
baris diam-diam begitu Topik kedua ditulis dengan bentuk berbeda.

## Sumber

- Issue #21 — kriteria penerimaan: Materi dua bahasa; 5 Kuis skenario, sebagian dengan
  kode; Pembahasan penuh (pendekatan, kompleksitas, kode referensi, jebakan umum);
  1 Soal Kode implementasi dari nol dengan test case; solusi referensi lulus saat build;
  tidak menyalin soal LeetCode; tampil di sidebar; Progres terlacak.
- Issue #1 — "Bentuk data Materi dan Soal" (skema YAML, `solusi_referensi` wajib lulus
  test case-nya sendiri); "Gerbang validasi Materi saat build".
- `docs/design-tree.md` — Cabang 1: "Bentuk Soal Kode: implementasi struktur data dari
  nol, diuji test case otomatis"; "Batas keras: tidak ada soal bergaya LeetCode";
  Cabang 2: "Penyimpanan konten: satu file YAML per Topik".
- `docs/adr/0023-bentuk-soal-kode-big-o-dan-kompleksitas-algoritma.md` — pola yang
  diikuti ADR ini, untuk Topik pertama yang bukan struktur data. Sumber untuk bentuk
  "kembalikan jumlah langkah" yang di sini menjadi "kembalikan jumlah perbandingan".
- `docs/adr/0025-bentuk-soal-kode-rekursi.md` — pola yang sama untuk Topik kedua yang
  bukan struktur data; sumber untuk kebiasaan mencatat angka hasil pengukuran beserta
  cara memeriksanya.
- `docs/adr/0019-field-kompleksitas-istilah-dan-ekspor-csv.md` — bentuk `kompleksitas`
  dan `istilah`, alasan keduanya wajib, dan pemakaiannya untuk ekspor CSV.
- `docs/adr/0005-soal-original-berbasis-skenario.md` — Soal dan Pembahasan ditulis
  original; soal LeetCode boleh ditautkan, tidak boleh disalin.
- `docs/adr/0003-materi-di-git-catatan-di-database.md` — Materi dan Soal hidup di git
  dan dibaca saat build; backend tidak membacanya. Itu sebabnya Topik baru cukup
  ditambahkan sebagai berkas, tanpa perubahan backend.
- `docs/adr/0022-eksekusi-kode-lokal-lewat-docker.md` — pola mencatat penyimpangan dari
  `design-tree.md` beserta alasan dan sumbernya.
- Python 3.14 — seluruh angka di `content/sorting.yaml` dijalankan, bukan dibaca:
  gelembung polos `n(n-1)/2` (16 → 120, 8 → 28, 5 → 10); gabung pada data yang sama
  (16 → 32, 8 → 17); pohon penggabungan `[8, 3, 5, 1, 9, 2, 7, 4]` = 4 + 6 + 7 = 17;
  dan pada 10.000 elemen: sisip 10.019, gabung 64.608, gelembung polos 49.995.000.
- `content/jalur.yaml` — Topik 7 `sorting`, `prasyarat: [2, 6]`.
- `content/hash-table.yaml` dan `content/big-o.yaml` — bentuk acuan satu Topik utuh
  yang sudah lulus gerbang; yang pertama untuk pola penulisan Materi/Kuis, yang kedua
  untuk pola `kompleksitas` berisi algoritma.
