# Bentuk Soal Kode Binary Search, dan `kompleksitas` yang berisi algoritma

## Status

accepted

## Konteks

Ticket #22 meminta Topik **Binary Search** dikerjakan tuntas: Materi dua bahasa, 5 Kuis
skenario, 1 Soal Kode, dan Pembahasan. Kriteria penerimaannya menyebut "1 Soal Kode
berbentuk implementasi dari nol, dengan test case" dan "Solusi referensi lulus semua
test case saat build".

Dua hal membuat Topik ini berbeda dari Stack, Array & String, Linked List, dan Hash
Table, dan keduanya tidak dijawab ticket:

1. **Binary Search bukan struktur data.** `docs/design-tree.md` menetapkan bentuk Soal
   Kode sebagai "implementasi struktur data dari nol" (Cabang 1, "Bentuk Soal Kode").
   Hash table (#19), linked list (#18), dan array (#17) memenuhinya secara alami —
   pemelajar menulis sebuah kelas atau struktur. Binary search adalah **algoritma
   pencarian**, bukan benda yang bisa diimplementasikan. Bentuk yang ditetapkan
   design-tree karena itu tidak bisa dipakai apa adanya, dan penggantinya adalah
   keputusan pemilik. Situasi ini identik dengan Big-O (#16), Rekursi (#20), dan
   Sorting (#21), yang sudah lebih dulu menyimpang lewat ADR-0023, ADR-0025, dan
   ADR-0026.

2. **Field `kompleksitas` berbentuk untuk struktur data.** Skema di issue #1 dan
   ADR-0019 menetapkan `kompleksitas[].struktur` sebagai nama struktur, dengan `ruang`
   sekali per struktur dan `waktu` per operasi. Topik Binary Search justru
   **mengajarkan biaya beberapa algoritma** (pencarian biner iteratif dan rekursif,
   keduanya `O(log n)` waktu tetapi berbeda ruang), bukan mendaftar operasi sebuah
   struktur. Pola yang sama sudah dipakai #16, #20, dan #21.

3. **"Pencarian biner" sudah dipakai Topik 1.** `content/big-o.yaml` (#16) sudah
   mendaftarkan "Pencarian biner" sebagai `istilah` **dan** sebagai nama `kompleksitas`.
   Semua Topik masuk **satu dek** Anki, dan Anki menolak catatan dengan front yang sama.
   Karena itu Topik ini **tidak boleh** mendaftarkan "Pencarian biner" lagi. Situasi
   yang sama pernah dihadapi #21, yang melewatkan "Pencarian biner" dan "Bagi dan
   taklukkan" karena alasan itu.

## Keputusan

**Tiga keputusan, dua di antaranya jawaban pemilik.**

### 1. Soal Kode: menulis pencarian biner dua kali dari nol dan mengembalikan langkah serta kedalaman

Pemelajar menulis `cari_biner_iteratif` (perulangan) dan `cari_biner_rekursif`
(fungsi yang memanggil dirinya sendiri). Versi iteratif mengembalikan **pasangan**
`[indeks, jumlah_langkah]`; versi rekursif mengembalikan **tiga nilai**
`[indeks, jumlah_langkah, kedalaman]`. Fungsi `proses(daftar, target)` memanggil
keduanya dengan data yang sama dan mengembalikan satu daftar berisi lima nilai:
`[indeks_iteratif, langkah_iteratif, indeks_rekursif, langkah_rekursif, kedalaman_rekursif]`.

Lima test case memakai nilai yang membuat pelajarannya terlihat. Yang paling penting
adalah kasus keempat: mencari nilai yang **tidak ada** membuat versi rekursif memakai
satu pemanggilan tambahan untuk menemukan rentang yang kosong, sehingga kedalamannya
`4` sedangkan langkahnya `3`. Perbedaan itu disengaja — ia menguji pemahaman yang
sesungguhnya, bukan hafalan.

Soalnya tetap "implementasi dari nol" dalam arti yang berlaku untuk Topik ini: kedua
pencariannya ditulis sendiri, dan skenarionya melarang `bisect`, operator `in`, serta
`list.index()`.

**Yang dibandingkan bukan waktunya, melainkan ruangnya.** Kedua versi memeriksa elemen
yang persis sama dan memakai jumlah langkah yang persis sama — sama-sama `O(log n)`.
Yang berbeda adalah ruang tambahannya: versi perulangan `O(1)`, versi rekursif
`O(log n)` karena setiap pemanggilan menunggu di tumpukan. Ini pelajaran yang tidak
dimiliki Topik mana pun sebelumnya, dan ia masuk akal justru karena prasyarat Topik ini
adalah Rekursi (lewat Sorting).

### 2. `kompleksitas` berisi **algoritma yang dianalisis**, bukan struktur data

Tiga entri: pencarian biner iteratif, pencarian biner rekursif, dan titik sisip. Nama
field tetap `struktur`; isinya yang berbeda — sama seperti ADR-0023, ADR-0025, dan
ADR-0026.

### 3. Nama entri `kompleksitas` dan `istilah` sengaja dibedakan dari Topik 1

"Pencarian biner" **tidak** didaftarkan di Topik ini, karena sudah dipakai #16. Yang
didaftarkan adalah hal-hal yang khas Topik ini dan belum dipakai Topik lain: "Pencarian
biner iteratif", "Pencarian biner rekursif", "Rentang pencarian", "Titik tengah",
"Batas pencarian", "Titik sisip", "Pembagian dua", "Data terurut", dan "Ruang tambahan".

## Alasan

**Kenapa bukan "struktur data" yang dipaksakan.** Binary search bisa saja dipaksa
memakai struktur — misalnya meminta pemelajar mengimplementasikan array terurut lalu
mencarinya. Tetapi itu mengajarkan hal yang salah tentang Topik ini: pelajarannya bukan
"array punya biaya begini", melainkan "membuang separuh data setiap langkah membuat
langkahnya tumbuh logaritmik, dan bentuk penulisannya menentukan berapa memori yang
dipakai". Array sendiri sudah jadi bahan Topik 2.

**Kenapa langkah dan kedalaman, bukan waktu.** Mengembalikan jumlah langkah membuat
perbandingan dengan pencarian linear menjadi **angka yang bisa diperiksa test case**,
dan mengembalikan kedalaman membuat biaya ruang rekursi juga menjadi angka. Mengembalikan
waktu dalam detik tidak bisa diuji — ia berbeda di setiap mesin, dan itu justru hal yang
Materi Topik 1 ajarkan untuk **tidak** diandalkan. Alasan ini sama persis dengan
ADR-0023, ADR-0025, dan ADR-0026, dan kesamaannya disengaja: Topik yang bukan struktur
data memecahkan masalah bentuk yang sama dengan cara yang sama.

**Kenapa dua versi algoritma yang sama, bukan dua algoritma berbeda.** Tiga Topik
sebelumnya membandingkan dua algoritma yang **laju pertumbuhannya berbeda** (`O(n)`
lawan `O(log n)`, `O(2^n)` lawan `O(n)`, `O(n²)` lawan `O(n log n)`). Binary Search
tidak punya dua algoritma pencarian dengan laju berbeda yang sama-sama layak diajarkan
— pencarian linear sudah dipakai #16. Yang tersedia adalah dua **cara menulis algoritma
yang sama**, dan yang membedakan keduanya justru **ruang**, bukan waktu. Itu bukan
kelemahan bentuknya, melainkan pelajaran baru: dua algoritma bisa sama cepat tetapi
tidak sama hemat memori. Perbedaan ruang itu juga yang membuat versi rekursif bermakna
di sini, karena prasyarat Topik ini menyentuh Rekursi.

**Kenapa kasus keempat sengaja tidak ada nilainya.** Empat test case pertama menguji
pencarian yang berhasil; kasus kelima menguji ukuran yang lebih besar. Kalau semuanya
berhasil, pemelajar bisa menyimpulkan bahwa "kedalaman selalu sama dengan langkah" —
padahal itu hanya berlaku saat nilainya ditemukan. Kasus yang **tidak** ditemukan
menunjukkan perbedaannya: versi rekursif memakai satu pemanggilan tambahan untuk
menemukan rentang kosong. Itu justru pertanyaan yang paling mungkin membuat pemelajar
berhenti dan berpikir, dan itulah gunanya.

**Kenapa `kompleksitas` diisi algoritma, bukan struktur.** Field ini sumber ekspor
CSV/Anki (ticket #14), dan yang layak dihafal dari Topik Binary Search adalah biaya
**algoritma**: "pencarian biner `O(log n)`", "versi iteratif ruangnya `O(1)`", "versi
rekursif ruangnya `O(log n)`". Mengisinya dengan struktur akan menghasilkan kartu yang
salah untuk Topik ini.

**Kenapa nama entri dibedakan dari Topik 1.** Anki menentukan keunikan sebuah catatan
dari **kolom pertamanya**, dan front kartu berbentuk "Definisi — <istilah>" serta
"Kompleksitas ruang — <nama>". Karena #16 sudah memakai "Pencarian biner", mendaftarkan
istilah itu lagi akan menghasilkan front yang sama dan Anki akan menolak catatannya.
Membedakan namanya bukan kosmetik — ia yang membuat ekspor kedua Topik bisa masuk satu
dek.

**Kenapa nama field tidak diganti.** Mengganti `struktur` menjadi sesuatu yang lebih
umum akan menyentuh `tipe.ts`, validator `periksa.ts`, penyusun kartu `kartu.ts`, dan
uji-ujinya — empat berkas untuk satu Topik. Aturan repo ini adalah abstraksi diubah
saat ada kebutuhan kedua yang nyata, bukan saat satu berkas tidak cocok. ADR-0023,
ADR-0025, dan ADR-0026 sudah menempuh jalan yang sama.

**Kenapa penyimpangan ini dicatat di sini, bukan didiamkan.** `docs/design-tree.md`
adalah rencana yang sudah dibaca pemilik, dan menyimpang darinya tanpa catatan berarti
rencananya berbohong. Pola yang sama sudah dipakai #10 (ADR-0022), #15 (ADR-0021),
#16 (ADR-0023), #20 (ADR-0025), dan #21 (ADR-0026).

## Konsekuensi

- **`docs/design-tree.md` tetap memuat kalimat lamanya.** Kalimat "Bentuk Soal Kode:
  implementasi struktur data dari nol" dibiarkan terlihat sebagai catatan sejarah, dan
  diberi penunjuk ke ADR ini — sama seperti perlakuan pada #16, #20, dan #21.
- **Tanpa perubahan skema, tanpa perubahan validator.** `content/binary-search.yaml`
  memenuhi gerbang yang sudah ada; `periksa.ts` dan `tipe.ts` tidak tersentuh. Topik
  baru masuk sebagai **berkas baru**, bukan sebagai cabang baru di kode.
- **`/id/topik/binary-search` dan `/en/topik/binary-search` statis.** Diperiksa pada
  keluaran build, bersama Topik lain yang sudah punya berkas — build menghasilkan
  **8 halaman Topik statis**, naik dari 7.
- **Gerbang solusi referensi hijau**: `binary-search → soal[5]` lulus 5 test case di
  kontainer `dsa-runner:lokal`.
- **Ekspor Anki bertambah 27 kartu per bahasa**: dari `kompleksitas` (3 kartu ruang —
  satu per struktur — dan 6 kartu waktu — satu per operasi) dan dari `istilah`
  (9 definisi dan 9 pasangan). Diperiksa dengan **memuat konten dan menyusun kartunya**
  lewat `kartuDariTopik`, bukan dihitung dengan rumus — hasilnya 27 kartu per bahasa,
  tanpa depan yang kembar, dan **tanpa bentrok dengan 350 kartu Topik lain**.
- **Tiga cacat ditemukan dengan menjalankan dan meninjau ulang, bukan membaca** — sama
  seperti #16 sampai #21:

  **(a) Tiga kartu mengajarkan istilah yang tidak pernah diperkenalkan Materi.**
  Istilah "Pembagian dua" (*halving*), "Ruang tambahan" (*auxiliary space*), dan
  pasangan English-nya muncul di daftar `istilah` tetapi Materi hanya memakai kata
  "membuang separuh" dan "ruangnya". Kartunya akan mengajarkan istilah yang nol kali
  disebut. Ketiganya ditangkap **skrip pemeriksa mandiri**, bukan gerbang konten — sama
  seperti kelas cacat yang ditemukan di #17, #18, dan #21. Materi sekarang
  memperkenalkan ketiganya secara eksplisit.

  **(b) Dua blok kode Python Materi adalah potongan ilustratif, bukan program.** Blok
  `while kiri <= kanan:` dan `kiri = tengah + 1` tidak bisa dijalankan sendiri, padahal
  konvensi Topik sebelumnya adalah setiap blok bisa dijalankan. Keduanya digabung menjadi
  satu program lengkap yang memperlihatkan hal yang sama. Sebelum digabung, pengumpul
  mengumpulkan **18** blok dan 2 di antaranya gagal jalan; sekarang **16** blok
  dikumpulkan dan **16 lulus** (jumlah itu dihitung dan disebut di keluaran `uji-kode.py`,
  sesuai pelajaran #21).

  **(c) Klaim "kedalaman sama dengan langkah" hanya berlaku untuk nilai yang ada.**
  Rancangan awal test case tidak punya kasus "nilai tidak ditemukan"; ditambahkan
  sebagai kasus keempat, dengan angka yang sudah dijalankan (`kedalaman` 4, `langkah` 3).
  Tanpa kasus itu, Soal Kodenya akan mengajarkan aturan yang tidak selalu benar.

- **Seluruh angka dijalankan, bukan dibaca.** Dengan Python 3.14: kelima test case;
  jumlah langkah versi iteratif **sama persis** dengan versi rekursif untuk seluruh
  `n ≤ 40` dan semua target; kedalaman rekursif sama dengan jumlah langkah; langkah
  terburuk untuk 16, 1.000, dan 1.000.000 elemen (5, 10, dan 20); jejak `cari 13` di
  `[1, 3, 5, 7, 9, 11, 13, 15]` (3 langkah, indeks 6); `while kiri < kanan` gagal pada
  larik satu elemen (`cari_biner([7], 7)` → `-1`); lupa `+ 1` benar-benar berputar tanpa
  henti; `(kiri + kanan) // 2` tidak meluap di Python; dan pada data yang belum terurut
  `[8, 3, 5, 1, 9, 2, 7, 4]`, nilai **3, 4, 5, 8, dan 9** dilaporkan tidak ditemukan
  padahal ada.

## Alternatif yang ditolak

**Soal Kode berbentuk implementasi struktur data** (mis. array terurut lalu mencarinya).
Ditolak karena mengajarkan biaya struktur, bukan pengaruh bentuk pencarian terhadap
jumlah langkah dan pemakaian memori, dan karena array sudah jadi bahan Topik 2.

**Menulis `cari_biner` sekali saja, tanpa pembanding.** Ditolak karena satu algoritma
saja tidak memperlihatkan bahwa bentuk penulisannya memengaruhi ruang. Tanpa dua versi,
pelajaran "waktu sama, ruang berbeda" kembali hanya menjadi kalimat — persis kesalahan
bentuk yang dihindari ADR-0023, ADR-0025, dan ADR-0026.

**Pencarian biner lawan pencarian linear sebagai Soal Kode.** Ditolak karena **sudah
dipakai Soal Kode Topik 1** (#16, ADR-0023). Memakainya lagi berarti Soal #22 menyalin
Soal #16, dan yang diuji menjadi hafalan angka, bukan penulisan pencarian biner.

**Pencarian biner yang mengembalikan kemunculan pertama dan terakhir** (batas bawah dan
batas atas). Ini alternatif yang sungguh berbeda dan tetap sah. Ditolak karena
membandingkan "batas bawah lawan batas atas" hanya memperlihatkan dua **pertanyaan**
berbeda dari satu teknik, bukan dua **cara** yang berbeda biayanya — dan pelajaran yang
hilang adalah perbedaan ruang antara iteratif dan rekursif, yang justru menyentuh
prasyarat Rekursi. Ia juga lebih dekat ke bahan `bisect` yang justru dilarang.

**Membandingkan pencarian biner dengan pencarian yang memakai tabel hash.** Ditolak
karena pencarian `O(1)` tabel hash hanya berlaku rata-rata dan butuh struktur yang sudah
jadi bahan Topik 5; memaksakannya di sini akan menenggelamkan pelajaran pencarian biner.

**`kompleksitas` diisi kelas pertumbuhan** (O(1), O(log n), …) alih-alih algoritma.
Ditolak karena field `ruang` menjadi tidak wajar: sebuah **kelas** tidak punya
kompleksitas ruang tersendiri; yang punya adalah algoritma yang memakainya.

**Mendaftarkan "Pencarian biner" sebagai `istilah` di Topik ini.** Ditolak karena sudah
dipakai Topik 1 dan front kartunya akan kembar — lihat keputusan 3 dan alasannya.

**Mengganti nama field `struktur`.** Ditolak karena blast radius-nya empat berkas demi
satu Topik — lihat alasan di atas, dan penolakan yang sama di ADR-0023, ADR-0025, dan
ADR-0026.

**Mengosongkan `kompleksitas` untuk Topik ini.** Ditolak karena field itu **wajib**,
dan itu keputusan sadar ADR-0019: membuatnya opsional akan membuat CSV kehilangan
baris diam-diam begitu Topik kedua ditulis dengan bentuk berbeda.

## Sumber

- Issue #22 — kriteria penerimaan: Materi dua bahasa; 5 Kuis skenario, sebagian dengan
  kode; Pembahasan penuh (pendekatan, kompleksitas, kode referensi, jebakan umum);
  1 Soal Kode implementasi dari nol dengan test case; solusi referensi lulus saat build;
  tidak menyalin soal LeetCode; tampil di sidebar; Progres terlacak.
- Issue #1 — "Bentuk data Materi dan Soal" (skema YAML, `solusi_referensi` wajib lulus
  test case-nya sendiri); "Gerbang validasi Materi saat build".
- `docs/design-tree.md` — Cabang 1: "Bentuk Soal Kode: implementasi struktur data dari
  nol, diuji test case otomatis"; "Batas keras: tidak ada soal bergaya LeetCode";
  Cabang 2: "Penyimpanan konten: satu file YAML per Topik".
- `docs/adr/0023-bentuk-soal-kode-big-o-dan-kompleksitas-algoritma.md` — pola yang
  diikuti ADR ini, untuk Topik pertama yang bukan struktur data. Sumber untuk kebiasaan
  "kembalikan jumlah langkah"; juga sumber fakta bahwa "Pencarian biner" sudah dipakai
  Topik 1, baik sebagai `istilah` maupun sebagai nama `kompleksitas`.
- `docs/adr/0025-bentuk-soal-kode-rekursi.md` — pola yang sama untuk Topik kedua yang
  bukan struktur data.
- `docs/adr/0026-bentuk-soal-kode-sorting.md` — pola yang sama untuk Topik ketiga; sumber
  kebiasaan memeriksa bentrok front kartu lintas Topik sebelum mendaftarkan `istilah`.
- `docs/adr/0019-field-kompleksitas-istilah-dan-ekspor-csv.md` — bentuk `kompleksitas`
  dan `istilah`, alasan keduanya wajib, dan pemakaiannya untuk ekspor CSV.
- `docs/adr/0005-soal-original-berbasis-skenario.md` — Soal dan Pembahasan ditulis
  original; soal LeetCode boleh ditautkan, tidak boleh disalin.
- `docs/adr/0003-materi-di-git-catatan-di-database.md` — Materi dan Soal hidup di git
  dan dibaca saat build; backend tidak membacanya. Itu sebabnya Topik baru cukup
  ditambahkan sebagai berkas, tanpa perubahan backend.
- `docs/adr/0022-eksekusi-kode-lokal-lewat-docker.md` — pola mencatat penyimpangan dari
  `design-tree.md` beserta alasan dan sumbernya.
- Python 3.14 — seluruh angka di `content/binary-search.yaml` dijalankan, bukan dibaca:
  lima test case (`[2,1,2,1,1]`, `[0,2,0,2,2]`, `[4,3,4,3,3]`, `[-1,3,-1,3,4]`,
  `[15,5,15,5,5]`); langkah terburuk biner untuk 16/1.000/1.000.000 (5/10/20);
  `cari_biner([7], 7)` dengan `while kiri < kanan` → `-1`; dan pada
  `[8, 3, 5, 1, 9, 2, 7, 4]` nilai 3, 4, 5, 8, 9 dilaporkan tidak ditemukan.
- `content/jalur.yaml` — Topik 8 `binary-search`, `prasyarat: [2, 7]`.
- `content/big-o.yaml` — sumber fakta bentrok kartu: "Pencarian biner" sudah terdaftar
  sebagai `istilah` (dan nama `kompleksitas`), dan `cari_biner` sudah dipakai sebagai
  solusi referensi Soal Kode Topik 1.
- `content/sorting.yaml` — bentuk acuan satu Topik utuh yang sudah lulus gerbang; yang
  terdekat karena sama-sama bukan struktur data, sama-sama `kompleksitas` berisi
  algoritma, dan sama-sama menghadapi bentrok front kartu lintas Topik.
