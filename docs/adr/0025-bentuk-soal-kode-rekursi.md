# Bentuk Soal Kode Rekursi, dan `kompleksitas` yang berisi algoritma

## Status

accepted

## Konteks

Ticket #20 meminta Topik **Rekursi** dikerjakan tuntas: Materi dua bahasa, 5 Kuis
skenario, 1 Soal Kode, dan 6 Pembahasan. Kriteria penerimaannya menyebut "1 Soal Kode
berbentuk implementasi dari nol, dengan test case" dan "Solusi referensi lulus semua
test case saat build".

Dua hal membuat Topik ini berbeda dari Stack, Array & String, Linked List, dan Hash
Table, dan keduanya tidak dijawab ticket:

1. **Rekursi bukan struktur data.** `docs/design-tree.md` menetapkan bentuk Soal Kode
   sebagai "implementasi struktur data dari nol" (Cabang 1, "Bentuk Soal Kode").
   Hash table (#19), linked list (#18), dan array (#17) memenuhinya secara alami —
   pemelajar menulis sebuah kelas atau struktur. Rekursi adalah **teknik menulis
   fungsi**, bukan benda yang bisa diimplementasikan. Bentuk yang ditetapkan
   design-tree karena itu tidak bisa dipakai apa adanya, dan penggantinya adalah
   keputusan pemilik. Situasi ini identik dengan Big-O (#16), yang sudah lebih dulu
   menyimpang lewat ADR-0023.

2. **Field `kompleksitas` berbentuk untuk struktur data.** Skema di issue #1 dan
   ADR-0019 menetapkan `kompleksitas[].struktur` sebagai nama struktur, dengan `ruang`
   sekali per struktur dan `waktu` per operasi. Topik Rekursi justru **mengajarkan
   biaya sebuah algoritma** (`O(2^n)` untuk Fibonacci naif, `O(n)` setelah memoisasi),
   bukan mendaftar operasi sebuah struktur. Pola yang sama sudah dipakai #16.

## Keputusan

**Dua keputusan, keduanya jawaban pemilik.**

### 1. Soal Kode: menulis dua fungsi rekursif dari nol dan mengembalikan jumlah pemanggilan

Pemelajar menulis `faktorial` dan `jumlah_digit` dari nol, masing-masing
mengembalikan **pasangan** `[nilai, jumlah_pemanggilan]`. Fungsi `proses(n)`
memanggil keduanya dan mengembalikan satu daftar berisi empat angka:
`[nilai_faktorial, jumlah_pemanggilan_faktorial, nilai_jumlah_digit, jumlah_pemanggilan_jumlah_digit]`.

Lima test case memakai nilai yang membuat bedanya terlihat: untuk `n = 15`, faktorial
dipanggil **15 kali** (tumbuh mengikuti n) sedangkan `jumlah_digit` cukup **2 kali**
(tumbuh mengikuti banyak digit). Angka itu membuat kedalaman rekursi terasa sebagai
sesuatu yang bisa diperiksa test case, bukan sekadar dijelaskan.

Soalnya tetap "implementasi dari nol" dalam arti yang berlaku untuk Topik ini:
rekursinya ditulis sendiri, dan skenarionya melarang perulangan `for`/`while`,
`math.factorial`, serta mengubah angka menjadi teks untuk menghitung digitnya.

### 2. `kompleksitas` berisi **algoritma yang dianalisis**, bukan struktur data

Tiga entri: rekursi sederhana, Fibonacci naif, dan Fibonacci dengan memoisasi. Nama
field tetap `struktur`; isinya yang berbeda — sama seperti ADR-0023.

## Alasan

**Kenapa bukan "struktur data" yang dipaksakan.** Rekursi bisa saja dipaksa memakai
struktur — misalnya meminta pemelajar mengimplementasikan Stack lalu memakai rekursi
untuk menelusurinya. Tetapi itu mengajarkan hal yang salah tentang Topik ini:
pelajarannya bukan "Stack punya biaya begini", melainkan "fungsi yang memanggil
dirinya sendiri butuh kasus dasar, dan kedalamannya punya harga". Memaksa struktur di
sini akan menenggelamkan pelajaran rekursinya.

**Kenapa jumlah pemanggilan, bukan waktu.** Mengembalikan jumlah pemanggilan membuat
perbandingan `O(2^n)` lawan `O(n)` menjadi **angka yang bisa diperiksa test case**.
Mengembalikan waktu dalam detik tidak bisa diuji — ia berbeda di setiap mesin, dan itu
justru hal yang Materi Topik 1 ajarkan untuk **tidak** diandalkan. Dengan menghitung
pemanggilan, test case menguji konsepnya, bukan kecepatan mesin. Alasan ini sama persis
dengan ADR-0023, dan kesamaannya disengaja: dua Topik yang bukan struktur data
memecahkan masalah bentuk yang sama dengan cara yang sama.

**Kenapa dua fungsi, bukan satu.** Satu fungsi rekursif saja tidak memperlihatkan
bahwa laju pertumbuhan bisa berbeda-beda. Dengan dua fungsi yang menerima `n` yang
sama, `faktorial(n)` dipanggil n kali sedangkan `jumlah_digit(n)` dipanggil sebanyak
banyak digitnya — dan pada `n = 15` selisihnya (15 lawan 2) terbaca langsung dari
hasilnya. Itu membuat "kedalaman rekursi mengikuti bentuk persoalannya" menjadi angka,
bukan kalimat.

**Kenapa `jumlah_digit`, bukan Fibonacci.** Fibonacci sudah dipakai Kuis 3 dan Kuis 5
sebagai bahan bacaan (jumlah pemanggilan 2.692.537 untuk `fib(30)`). Memakainya lagi
sebagai Soal Kode akan membuat Soal dan Kuis saling menyalin, dan yang diuji menjadi
hafalan angka, bukan penulisan rekursi. `jumlah_digit` memaksa pemelajar menemukan
sendiri kasus dasarnya (`n < 10`) dan langkah rekursifnya (`n // 10`) — persis dua hal
yang jadi inti Topik ini.

**Kenapa `kompleksitas` diisi algoritma, bukan struktur.** Field ini sumber ekspor
CSV/Anki (ticket #14), dan yang layak dihafal dari Topik Rekursi adalah biaya
**algoritma**: "Fibonacci naif `O(2^n)`", "Fibonacci dengan memoisasi `O(n)`".
Mengisinya dengan struktur akan menghasilkan kartu yang salah untuk Topik ini.

**Kenapa nama field tidak diganti.** Mengganti `struktur` menjadi sesuatu yang lebih
umum akan menyentuh `tipe.ts`, validator `periksa.ts`, penyusun kartu `kartu.ts`, dan
uji-ujinya — empat berkas untuk satu Topik. Aturan repo ini adalah abstraksi diubah
saat ada kebutuhan kedua yang nyata, bukan saat satu berkas tidak cocok. ADR-0023 sudah
menempuh jalan yang sama untuk Big-O.

**Kenapa penyimpangan ini dicatat di sini, bukan didiamkan.** `design-tree.md` adalah
rencana yang sudah dibaca pemilik, dan menyimpang darinya tanpa catatan berarti
rencananya berbohong. Pola yang sama sudah dipakai #10 (ADR-0022), #15 (ADR-0021), dan
#16 (ADR-0023).

## Konsekuensi

- **`docs/design-tree.md` tetap memuat kalimat lamanya.** Kalimat "Bentuk Soal Kode:
  implementasi struktur data dari nol" dibiarkan terlihat sebagai catatan sejarah, dan
  diberi penunjuk ke ADR ini — sama seperti perlakuan pada #16.
- **Tanpa perubahan skema, tanpa perubahan validator.** `content/rekursi.yaml`
  memenuhi gerbang yang sudah ada; `periksa.ts` dan `tipe.ts` tidak tersentuh. Topik
  baru masuk sebagai **berkas baru**, bukan sebagai cabang baru di kode.
- **`/id/topik/rekursi` dan `/en/topik/rekursi` statis.** Diperiksa pada keluaran
  build, bersama Topik lain yang sudah punya berkas.
- **Gerbang solusi referensi hijau**: `rekursi → soal[5]` lulus 5 test case di
  kontainer `dsa-runner:lokal`.
- **Ekspor Anki bertambah 24 kartu**: dari `kompleksitas` (3 kartu ruang — satu per
  struktur — dan 4 kartu waktu — satu per operasi) dan dari `istilah` (9 definisi dan
  8 pasangan; "RecursionError" sama di kedua bahasa sehingga tidak menghasilkan kartu
  pasangan). Diperiksa dengan **memuat konten dan menyusun kartunya** lewat
  `kartuDariTopik`, bukan dihitung dengan rumus — hasilnya 24 kartu per bahasa, tanpa
  depan yang kembar.
- **Dua cacat ditemukan dengan menjalankan dan meninjau ulang, bukan membaca** — sama
  seperti #16, #17, #18, dan #19:

  (a) Materi mula-mula mengklaim `turun(999)` aman dan `turun(1000)` gagal, meniru
  bentuk contoh dari dokumentasi. Dijalankan di Python 3.14, `turun(999)` di tingkat
  modul **gagal** dengan `RecursionError`, karena batas tepatnya bergantung pada
  seberapa dalam pemanggilnya sudah berada di tumpukan. Klaim itu diganti dengan angka
  yang jauh dari batas (`turun(900)` aman, `turun(2000)` gagal), dan Materi sekarang
  menyebut bahwa titik gagalnya bergantung konteks pemanggilan. Komentar kepala berkas
  sempat tertinggal memuat klaim lama itu, dan ikut diperbaiki.

  (b) Diagram pohon rekursi `fib(5)` mula-mula menggambar **13 simpul**, karena satu
  `fib(2)` terdalam dibiarkan tidak dikembangkan — padahal prosa di sebelahnya
  menyebut **15 pemanggilan**. Pembaca yang menghitung gambarnya akan mendapat angka
  berbeda dari teksnya. Diagram diganti dengan pohon yang lengkap 15 simpul, dan
  prosanya kini menyebut perhitungannya (1 + 2 + 4 + 6 + 2) supaya angkanya bisa
  diturunkan dari gambar.

  Keduanya kelas kesalahan yang tidak bisa dilihat dari pembacaan sekilas kode, dan
  tidak ditangkap gerbang mana pun.

## Alternatif yang ditolak

**Soal Kode berbentuk implementasi struktur data** (mis. Stack yang ditelusuri secara
rekursif). Ditolak karena mengajarkan biaya struktur, bukan teknik rekursinya, dan
karena Stack sudah jadi bahan Topik 4.

**Fibonacci naif lawan memoisasi sebagai Soal Kode.** Ditolak karena sudah dipakai Kuis
3 dan Kuis 5 di Topik ini, sehingga Soal dan Kuis akan saling menyalin — dan yang diuji
menjadi hafalan angka, bukan penulisan rekursi.

**Menara Hanoi.** Ditolak karena jawabannya berupa daftar langkah yang panjangnya
`2^n - 1`, sehingga test case-nya lebih mudah salah tulis dan lebih sulit diperiksa
dengan mata. Jumlah pemanggilan memberi angka yang sama-sama dramatis dengan bentuk
test case yang jauh lebih sederhana.

**Penelusuran list bersarang sebagai Soal Kode.** Ditolak karena yang menonjol menjadi
penanganan tipe data (`list` di dalam `list`), bukan kasus dasar dan kedalaman
rekursinya — dua hal yang justru jadi inti Topik ini.

**`kompleksitas` diisi kelas pertumbuhan** (O(1), O(log n), …) alih-alih algoritma.
Ditolak karena field `ruang` menjadi tidak wajar: sebuah **kelas** tidak punya
kompleksitas ruang tersendiri; yang punya adalah algoritma yang memakainya.

**Mengganti nama field `struktur`.** Ditolak karena blast radius-nya empat berkas demi
satu Topik — lihat alasan di atas, dan penolakan yang sama di ADR-0023.

**Mengosongkan `kompleksitas` untuk Topik ini.** Ditolak karena field itu **wajib**,
dan itu keputusan sadar ADR-0019: membuatnya opsional akan membuat CSV kehilangan
baris diam-diam begitu Topik kedua ditulis dengan bentuk berbeda.

## Sumber

- Issue #20 — kriteria penerimaan: Materi dua bahasa; 5 Kuis skenario, sebagian dengan
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
  "kembalikan jumlah langkah" yang di sini menjadi "kembalikan jumlah pemanggilan".
- `docs/adr/0019-field-kompleksitas-istilah-dan-ekspor-csv.md` — bentuk `kompleksitas`
  dan `istilah`, alasan keduanya wajib, dan pemakaiannya untuk ekspor CSV.
- `docs/adr/0005-soal-original-berbasis-skenario.md` — Soal dan Pembahasan ditulis
  original; soal LeetCode boleh ditautkan, tidak boleh disalin.
- `docs/adr/0003-materi-di-git-catatan-di-database.md` — Materi dan Soal hidup di git
  dan dibaca saat build; backend tidak membacanya. Itu sebabnya Topik baru cukup
  ditambahkan sebagai berkas, tanpa perubahan backend.
- `docs/adr/0022-eksekusi-kode-lokal-lewat-docker.md` — pola mencatat penyimpangan dari
  `design-tree.md` beserta alasan dan sumbernya.
- Python 3.14, `docs.python.org/3/library/exceptions.html` — `RecursionError`
  "is raised when the interpreter detects that the maximum recursion depth (see
  `sys.getrecursionlimit()`) is exceeded". Batas bawaan 1.000 diverifikasi dengan
  menjalankan `sys.getrecursionlimit()` di lingkungan proyek, bukan dari ingatan.
- `content/jalur.yaml` — Topik 6 `rekursi`, `prasyarat: [3, 4]`.
- `content/hash-table.yaml` dan `content/big-o.yaml` — bentuk acuan satu Topik utuh
  yang sudah lulus gerbang; yang pertama untuk pola penulisan Materi/Kuis, yang kedua
  untuk pola `kompleksitas` berisi algoritma.
