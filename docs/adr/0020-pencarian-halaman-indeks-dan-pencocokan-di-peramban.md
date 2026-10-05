# Pencarian: halaman sendiri, indeks dari Materi, pencocokan di peramban

## Status

accepted

## Konteks

Ticket #13 (Pencarian) meminta empat hal:

- Kotak pencarian tersedia
- Hasil menunjuk Topik dan bagian Materi tempat istilah muncul
- Bekerja di laptop dan HP
- Hasil pencarian bisa diklik menuju bagian yang dimaksud

`docs/design-tree.md` menempatkan Pencarian sebagai langkah **kedua** Fase 1, tepat
setelah rantai inti Stack. Ia tidak menyebut bentuknya.

Tiga hal yang harus diputuskan, dan tidak satupun dijawab ticket atau design-tree:

1. **Di mana kotak pencarian berada.** Ticket hanya bilang "kotak pencarian tersedia".
2. **Bagaimana pencarian bekerja** — hasil muncul saat mengetik, atau setelah menekan
   Enter.
3. **Dari mana indeksnya disusun.** Materi hidup di `content/*.yaml` (git, ADR-0003),
   jadi tidak ada indeks yang siap dipakai.

Ketiganya adalah keputusan pemilik, bukan agen, dan sudah ditanyakan. Jawabannya:

1. **Halaman sendiri** (`/[bahasa]/pencarian`), ditautkan dari beranda dan sidebar.
2. **Hasil muncul saat mengetik**, tanpa memuat ulang halaman.
3. Indeks disusun dari Materi — konsekuensi dari #3, bukan pilihan terpisah.

## Keputusan

**Tiga keputusan, semuanya mengikuti jawaban pemilik.**

### 1. Halaman sendiri, ditautkan dari beranda dan sidebar

Rute baru `app/[bahasa]/pencarian/`, dengan tautan ke sana dari **beranda** (setelah
daftar Topik) dan dari **sidebar** setiap halaman Topik (di atas daftar Jalur).

### 2. Indeks disusun saat build, pencocokan di peramban

`lib/pencarian/indeks.ts` menyusun satu entri per **bagian** Materi — setiap judul
`##`, `###`, … — berisi teks badan bagian itu. Halaman pencarian (Server Component,
statis) menyerahkan indeks itu sebagai prop ke komponen klien `pencarian.tsx`, yang
mencocokkan pada setiap ketukan dengan `useDeferredValue`.

### 3. Modul pencarian dipisah menurut dua alasan yang berbeda

- `indeks.ts` — **apa yang diindeks**: memecah Materi menjadi bagian, membuang
  penanda Markdown, mengambil anchor. Berubah kalau bentuk indeks berubah.
- `cari.ts` — **apa yang cocok dan bagaimana hasilnya disajikan**: pencocokan,
  pemeringkatan, pemotongan cuplikan, penentuan rentang sorot. Berubah kalau aturan
  pencarian berubah.

Keduanya murni dan diuji terpisah dengan `node --test`.

## Alasan

**Kenapa halaman sendiri, bukan kotak di beranda atau sidebar.** Pemakaian sebenarnya
— yang disebut ticket itu sendiri — adalah "saat membaca ulang di Topik ke-8 tidak
perlu menebak di mana suatu istilah dibahas". Pemakai yang sedang membaca Topik ke-8
ada di halaman Topik, bukan di beranda:

- Kotak **di beranda** memaksa ia kembali ke beranda dulu, kehilangan tempatnya.
- Kotak **di sidebar** memakan ruang pita Jalur yang sempit di HP. Pita itu sudah
  berisi 12 baris yang menggulir mendatar; menambahkan kotak isian di sana menjepit
  keduanya.

Halaman sendiri bisa ditautkan dari keduanya, dan di HP ia mendapat lebar penuh untuk
kotak dan daftar hasilnya.

**Kenapa indeks per bagian, bukan per Topik.** Kriteria penerimaan meminta hasil
menunjuk "Topik **dan bagian Materi**". Indeks per Topik hanya bisa menunjuk
Topiknya, dan pemakai harus mencari sendiri di dalam Materi yang panjang — persis
pekerjaan yang ingin dihapus ticket ini.

**Kenapa anchor diambil dari `daftarBagian`, bukan dihitung sendiri.** `bagianId`
harus **sama persis** dengan `id` yang dipasang `materi-markdown.tsx` pada heading,
karena tautan hasil menunjuk ke `#id` itu. Kalau modul ini menghitung slug dengan
caranya sendiri, tautannya menunjuk ke tempat yang salah **tanpa error apa pun** —
kelas kesalahan yang sudah dijaga ADR-0009. Karena itu anchor datang dari
`daftarBagian`, satu-satunya tempat aturan itu hidup. Ada uji yang membandingkan
keduanya, termasuk kasus judul kembar.

**Kenapa pencocokan di peramban, bukan muat ulang halaman dengan `?q=`.** Pemilik
memilih hasil saat mengetik. Dengan satu Topik, memuat ulang halaman setiap ketukan
akan terasa berat, dan di HP ada jeda jaringan. Pencocokan di peramban juga membuat
pencarian **tetap bekerja saat backend mati** (user story 62) dan tidak mengirim apa
pun ke mana pun.

**Kenapa `useDeferredValue`, bukan debounce sendiri.** Pencarian dijalankan ulang
setiap ketukan. `useDeferredValue` membiarkan kotak isian menampilkan huruf terbaru
lebih dulu sementara daftar hasil menyusul — tanpa timer yang harus dibersihkan, dan
tanpa keadaan "sedang memuat" yang harus dijelaskan ke pemakai. Itu cara React sendiri
untuk "nilai turunan yang boleh tertinggal".

**Kenapa `teksPolos` diurai, bukan diganti regex, dan tidak memakai `toString` apa
adanya.** Regex untuk Markdown selalu salah pada satu kasus atau lain (`*` di dalam
kode, `_` di dalam kata, tanda kurung di dalam tautan), jadi teksnya diurai dengan
parser yang sama dengan yang merender Materi. Tetapi `toString` bawaan hanya merangkai
teks daun **tanpa pemisah**, sehingga dua butir daftar menjadi
`"push menaruh nilai.pop mengambilnya."` dan sel tabel menjadi
`"OperasiWaktuTambah elemenO(1)"`. Teks seperti itu bukan hanya sulit dibaca sebagai
cuplikan — ia juga **salah dicari**: "pop mengambilnya" tidak akan ditemukan. Karena
itu `indeks.ts` memasang pemisah baris di antara blok, butir, dan sel. Cacat ini
ditemukan saat memeriksa indeks terhadap `content/stack.yaml` yang sungguhan, bukan
oleh uji yang sudah ada, dan ujinya ditambahkan setelahnya.

**Kenapa cuplikan selalu memuat kata kunci.** `cari` memakai badan bagian lebih dulu,
dan judulnya kalau kata kuncinya hanya ada di judul. Cuplikan yang tidak memuat kata
yang diketik akan membingungkan: pemakai melihat hasil yang tampak tidak berhubungan
dengan yang ia cari.

**Kenapa `sorot` adalah rentang, bukan HTML.** Modul `cari.ts` tidak pernah
menghasilkan markup yang harus dipercaya, dan komponen yang merender memasang
penandanya dengan memecah teks — tidak ada `dangerouslySetInnerHTML`. Sorotan memakai
warna aksen teks, bukan latar penuh, karena cuplikan adalah kalimat yang sedang dibaca.

## Konsekuensi

- **Indeks dikirim ke peramban di halaman pencarian.** Ia memuat teks badan tiap
  bagian, jadi besarnya sebanding dengan seluruh Materi satu bahasa. Terukur pada satu
  Topik: **8,9 KB JSON (3,1 KB gzip)** per bahasa; dengan 12 Topik penuh ia menjadi
  sekitar **37 KB gzip**. Hanya halaman pencarian yang memuatnya — halaman Topik tidak
  tersentuh. Menerima ukuran ini adalah harga dari "hasil muncul saat mengetik"; kalau
  kelak terasa berat, alternatifnya memotong `teks` per bagian (dengan konsekuensi kata
  kunci yang jauh di dalam bagian tidak lagi ketemu), atau memindahkan pencocokan ke
  server.
- **Halaman pencarian statis dan tanpa backend.** Ia tidak butuh token, dan tetap
  bekerja saat backend mati.
- **Tidak ada uji UI otomatis di repo** (issue #1: "Tanpa unit test UI"). Yang diuji
  otomatis adalah `indeks.ts` dan `cari.ts`; halamannya diverifikasi manual dengan
  Playwright (23 + 4 pemeriksaan, skripnya di luar repo).
- **Tidak ada perubahan skema konten, tidak ada migrasi, backend tidak tersentuh.**
  Ticket ini murni frontend.
- **Kriteria "bekerja di laptop dan HP"** diverifikasi pada 1280×900 dan 390×844,
  termasuk "tidak ada gulir mendatar" di kedua halaman.
- **Istilah baru**: **Pencarian** ditambahkan ke `CONTEXT.md` oleh ticket ini. Fitur
  ini sudah lama ada di design-tree tanpa kosakata resminya; kini ia punya definisi dan
  sinonim yang dilarang (*searching*, *query*, *find*).

## Alternatif yang ditolak

**Kotak pencarian di beranda saja.** Ditolak karena pemakaian sebenarnya terjadi saat
sedang membaca Topik, bukan di beranda. Keputusan pemilik: halaman sendiri + tautan.

**Kotak pencarian di sidebar tiap halaman Topik.** Ditolak karena memakan ruang pita
Jalur yang sempit di HP. Keputusan pemilik.

**Formulir dengan `?q=`, halaman dimuat ulang.** Ditolak karena pemilik memilih hasil
saat mengetik; muat ulang setiap ketukan terasa berat dan di HP ada jeda jaringan.
Kelebihan formulir — hasil bisa dibagikan lewat tautan — tidak dipilih, dan tidak
hilang sepenuhnya: hasil menunjuk anchor yang bisa dibagikan, hanya kata kuncinya yang
tidak ikut di URL.

**Indeks per Topik, bukan per bagian.** Ditolak karena tidak memenuhi kriteria "hasil
menunjuk bagian Materi"; pemakai masih harus mencari sendiri di dalam Materi.

**Menghitung slug anchor sendiri di `indeks.ts`.** Ditolak karena menciptakan salinan
kedua aturan yang sudah hidup di `daftarBagian`, dan dua salinan itu bisa menyimpang
tanpa error — persis yang dihindari ADR-0009.

**Memakai `toString` dari `mdast-util-to-string` apa adanya.** Ditolak setelah
diperiksa terhadap Materi sungguhan: ia merangkai butir daftar dan sel tabel tanpa
pemisah, sehingga teksnya salah dicari. `indeks.ts` memasang pemisahnya sendiri.

**Pencarian kabur (fuzzy) atau peringkat berbobot rumit.** Ditolak karena dengan satu
Topik dan puluhan bagian, kecocokan substring sudah cukup dan bisa diprediksi pemakai.
Kalau nanti isinya membesar, penggantinya cukup mengganti `cari.ts`.

**Indeks disimpan di berkas atau di backend.** Ditolak: kontennya di git dan hanya
berubah saat build, jadi indeks yang diprerender sudah benar dan tidak menambah berkas
yang harus dijaga sinkron (mengikuti alasan ADR-0019 menolak berkas glosarium).

## Sumber

- Issue #13 — kriteria penerimaan: kotak pencarian tersedia; hasil menunjuk Topik dan
  bagian Materi; bekerja di laptop dan HP; hasil bisa diklik menuju bagian yang dimaksud.
- Issue #1 — "Testing: validasi konten saat build + integrasi API di batas backend.
  Tanpa unit test UI"; user story 62 (Materi tetap terbaca saat backend mati).
- `docs/design-tree.md` — Cabang 5, Fase 1 nomor 2 (Pencarian); Cabang 4 (laptop dan
  HP sama penting); Cabang 2 (Materi dibaca saat build).
- `docs/adr/0003-materi-di-git-catatan-di-database.md` — Materi hidup di git, bukan
  database; itu alasan indeks bisa disusun saat build.
- `docs/adr/0009-anchor-daftar-isi-lewat-nomor-baris.md` — anchor dihitung sekali di
  `bagian.ts`; alasan `indeks.ts` tidak menghitungnya sendiri.
- React 19.3.0, tipe yang dibundel di `frontend/node_modules/@types/react/index.d.ts` —
  `useDeferredValue<T>(value: T, initialValue?: T): T`, dengan catatan bahwa ia tidak
  menunda pada render pertama.
- Next.js 16.3.7, dokumentasi yang dibundel di `frontend/node_modules/next/dist/docs/` —
  `01-app/03-api-reference/03-file-conventions/page.md` (`params` adalah Promise;
  `searchParams` memaksa render dinamis — alasan keputusan ini tidak memakainya) dan
  `02-components/link.md` (tautan `#hash` menggulir ke `id` yang dituju).
