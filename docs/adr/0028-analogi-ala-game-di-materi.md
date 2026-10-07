# Analogi ala Game di Materi

## Status

accepted

## Konteks

Pemilik proyek meminta Materi lebih mudah dicerna: menambahkan penjelasan bergaya game
("Explain in Fortnite terms", "Explain in Minecraft terms") supaya lebih menarik dan
lebih ringan dibaca. Usulan ini datang dari pemilik sendiri, bukan dari ticket mana pun
— **tidak ada ticket untuknya**, dan keputusannya diambil dalam satu sesi grilling
(2026-10-07).

**Keadaan Materi sebelum keputusan ini**, terverifikasi dengan membaca kesembilan berkas
`content/*.yaml`:

- **Nol humor budaya pop.** Pencarian di sembilan berkas penuh (termasuk `soal`,
  penjelasan, `istilah`, dan komentar) untuk nama game, meme, film, dan slang internet
  mengembalikan **nol hasil**. Nol emoji. Nol tanda seru dalam prosa.
- **Nada: tutorial teknis yang ramah.** Sapaan "kamu" (konsisten, "anda" nol kali),
  kalimat pendek, istilah asing dimiringkan dengan padanannya, diagram ASCII.
- **Analogi yang ada semuanya sehari-hari**: loker sekolah, kamus, tumpukan piring,
  kartu di tangan, perburuan harta karun, pohon tumbuh terbalik. Bukan budaya pop.
- **Dua Topik belum punya analogi naratif sama sekali**: `hash-table` dan `rekursi`.
- **Panjang Materi satu bahasa: 178–419 baris.** Bagian ini menambah 6–10 baris.

**Tiga kendala yang membentuk keputusan:**

1. **Skema dibekukan di issue #1**, dan `content/README.md` melarang mengarang skema
   baru. Menambahkan field baru (mis. `penjelasan_game`) menuntut ADR tersendiri seperti
   ADR-0019, plus perubahan di `tipe.ts`, `periksa.ts`, penyusun CSV, komponen halaman,
   dan beberapa berkas uji. Menambahkan **prosa** di dalam `materi` tidak menuntut
   perubahan kode sama sekali — terverifikasi: `daftarBagian` (`lib/konten/bagian.ts`)
   mem-parse Markdown secara dinamis saat build, jadi anchor, daftar isi, dan indeks
   Pencarian ikut menyesuaikan sendiri.

2. **Gerbang konten tidak memeriksa kebenaran isi.** `docs/design-tree.md` mencatat
   **14 cacat isi** yang ditemukan di #18–#23 (linked-list 2, hash-table 2, rekursi 2,
   sorting 4, binary-search 3, tree-bst 1 — dihitung dari dokumen itu, bukan diingat),
   dan **tidak satu pun** ditangkap gerbang. Analogi yang memetakan konsep dengan
   salah termasuk kelas itu — dan lebih berbahaya, karena ia menanam model mental yang
   keliru dan pembaca tidak punya cara mengetahui bahwa ia salah.

3. **Semua Topik masuk satu dek Anki**, dan bagian ini menambah satu heading ke daftar
   isi setiap Topik. Konsekuensi yang diterima: "Analogi ala Game" tampil sejajar dengan
   "Tabel kompleksitas" di daftar isi kanan dan ikut terindeks Pencarian.

## Keputusan

**Satu bagian Markdown baru di dalam `materi`, tanpa perubahan kode apa pun.**

### 1. Bentuk: bagian `## ` di akhir Materi

Setiap Topik mendapat satu bagian baru di `materi.id` **dan** `materi.en`, diletakkan
**paling akhir** — sesudah "Jebakan yang sering terjadi". Judulnya seragam:
`## Analogi ala Game` (id) dan `## Game Analogies` (en). Panjang 6–10 baris per bahasa.

Diletakkan di akhir karena dengan begitu pembaca sudah memegang konsepnya dan analogi
berfungsi sebagai **penguat**; kalau ditaruh di awal ia menjadi **pengganti** penjelasan,
dan itulah cara miskonsepsi tertanam. Judulnya seragam supaya daftar isi tetap rapi
walau game yang dipakai berbeda-beda antar Topik.

**Tidak ada field skema baru.** Alasan: bentuk ini nol perubahan kode, sesuai aturan
repo "Topik baru = satu berkas `content/<slug>.yaml` yang lolos gerbang yang sudah ada".

### 2. Isi: satu analogi per Topik, ditutup batas pemetaan

- **Satu** analogi per Topik, dari game yang paling cocok — bukan selalu Fortnite dan
  Minecraft. Memaksa Fortnite untuk konsep yang tidak nyambung menghasilkan analogi
  yang dipaksakan, dan justru itu yang menyesatkan.
- Tiap istilah game ("hotbar", "storm circle", "hopper") **dijelaskan singkat dalam
  tanda kurung, sekali** — konsisten dengan cara Materi menjelaskan `*collision*`,
  `*load factor*`, `*traversal*`.
- **Tiap bagian wajib ditutup baris koreksi** dengan penanda persis:
  **`**Batas analogi:**`** (id) dan **`**Where the analogy ends:**`** (en). Baris ini
  menyebut di mana pemetaannya berhenti. Wajib, tidak opsional — dan penanda ini yang
  dicari pemeriksa mandiri.
- Kalau sebuah analogi meleset di satu titik, **tetap ditulis** dan titik itu
  **disebutkan** di baris koreksi. Bagian yang mengakui kelemahannya sendiri masih
  mengajarkan sesuatu; bagian yang hilang tidak mengajarkan apa pun.

### 3. Nada: santai, tanpa hiasan

- **Tanpa emoji** — konsisten dengan sembilan berkas yang sudah ada (nol emoji).
- **Tanpa kata slang** ("wkwk", "gacor", "cuan"). Yang santai adalah **register**
  (cara bicara), bukan kosakata. Lucunya datang dari perbandingan game-nya.
- **Tanpa notasi `O(...)`** sama sekali di bagian ini; pakai kata biasa ("jauh lebih
  cepat", "tumbuh lambat"). Analogi kehilangan gunanya kalau ujungnya `O(n log n)`,
  dan pemeriksa mandiri membandingkan **setiap** nilai `O(...)` di prosa dengan field
  `kompleksitas` dua arah — menulis nilai baru di sini akan menggagalkannya.
- Boleh menyindir **game-nya**, tidak pernah **pemainnya**.

### 4. Batas: hanya Materi

Kuis, Pembahasan, dan Soal Kode **tidak disentuh**. Kuis dan Pembahasan adalah alat
penilaian, dan Kuis sudah pernah punya cacat "pengecoh yang sebenarnya juga benar";
menambah lapisan lucu di sana menambah permukaan untuk cacat semacam itu.

### 5. Cakupan: sembilan Topik yang ada, plus setiap Topik baru

Retrofit kesembilan Topik yang sudah punya berkas (#16–#23), dan setiap Topik baru
(#24 Heap, #25 Graph, #26 DP) wajib punya bagian ini juga. Kalau hanya sembilan Topik
yang punya, #24 akan jadi satu-satunya Topik tanpa bagian itu — dan justru itu yang
terasa seperti kelalaian.

**Urutan pengerjaan:** urutan Jalur (big-o → array-string → linked-list → stack →
hash-table → rekursi → sorting → binary-search → tree-bst).

### 6. Pemetaan game

| Topik | Game | Titik pemetaan |
|---|---|---|
| #16 Big-O | Fortnite | Tier list senjata — membandingkan senjata lewat laju, bukan angka mentahnya |
| #17 Array & String | Minecraft | Hotbar — langsung tekan slot 4 tanpa membuka slot 1–3. Itu indeks |
| #18 Linked List | Minecraft | Rel minecart — tiap rel menyambung ke rel berikutnya, tidak bisa lompat |
| #4 Stack & Queue | Fortnite | Build fight — bangunan terakhir dibangun, pertama dihancurkan |
| #19 Hash Table | Minecraft | Chest berlabel — tahu persis chest mana, tidak membuka satu-satu |
| #20 Rekursi | Minecraft | Crafting bersarang — stick butuh plank, plank butuh log |
| #21 Sorting | Minecraft | Hopper sorter — menyusun isi chest menurut jenis |
| #22 Binary Search | Fortnite | Storm circle menyusut — area pencarian mempersempit |
| #23 Tree & BST | Minecraft | Pohon, dan BST sebagai pohon yang tumbuh teratur |

Dua Topik memakai Minecraft untuk hal yang mirip — **array-string** (hotbar) dan
**hash-table** (chest). Keduanya berbunyi "akses langsung tanpa menelusuri". Yang
membedakan secara teknis: array-string menekankan **nomor slotnya**, hash-table
menekankan **cara menentukan nomor itu**. Kalau saat menulis tetap terlalu mirip,
perbedaannya diperjelas, bukan dibiarkan.

## Alasan

**Kenapa prosa, bukan field baru.** Field baru menuntut ADR tersendiri, perubahan enam
berkas kode, dan penambahan field ke semua berkas Topik serta beberapa berkas uji —
semuanya permanen, untuk konten yang sifatnya bumbu. Prosa tidak menuntut satu baris kode
pun. Yang dikorbankan: bagian ini selalu terlihat dan ikut masuk daftar isi, sedangkan
field baru bisa disembunyikan di balik tombol. Itu diterima, karena bagian ini memang
dimaksudkan untuk dibaca, bukan disembunyikan.

**Kenapa baris koreksi wajib.** Analogi yang salah lebih sulit dibongkar daripada tidak
tahu sama sekali: pembaca membawa model mental yang keliru ke Topik berikutnya, dan
tidak ada gerbang yang bisa menangkapnya. Baris koreksi adalah satu-satunya jaring
pengaman yang ada, dan ia hanya bekerja kalau selalu ada — kalau opsional, ia akan
dilewatkan justru pada analogi yang paling butuh.

**Kenapa tanpa slang.** "wkwk" di dalam Materi belajar terasa seperti dosen yang mencoba
jadi teman mahasiswanya, dan justru melemahkan leluconnya sendiri. Materi ini akan dibaca
ulang bertahun-tahun; slang yang sedang tren adalah hal pertama yang terasa basi. Yang
dijaga adalah register yang santai, bukan kosakatanya.

**Kenapa hanya Materi.** Kuis dan Pembahasan menilai pemahaman; menambahkan lapisan
humor di sana menambah permukaan untuk cacat seperti "pengecoh yang sebenarnya juga
benar" yang sudah pernah terjadi di #18 dan #19, sementara manfaatnya paling kecil.

## Konsekuensi

**Yang diterima:**

- **Daftar isi kanan setiap Topik bertambah satu entri**, sejajar dengan "Tabel
  kompleksitas". Otomatis dari `daftarBagian`; tidak bisa dimatikan tanpa mengubah kode.
- **Bagian ini ikut terindeks Pencarian.** Mengetik "Minecraft" akan menemukan Topik
  yang memakainya. Efek sampingnya kecil: bagian ini hanya cocok dengan kata game,
  bukan kata teknis, jadi tidak mengotori hasil pencarian istilah DSA.
- **Materi bertambah 6–10 baris per bahasa per Topik** — 1,4–2,4% pada Materi
  terpanjang (`tree-bst`, 419 baris) dan 3,4–5,6% pada terpendek (`binary-search` en,
  178 baris). Dihitung, bukan diperkirakan.
- **Kesembilan Topik yang ada harus disunting**, dan #19–#23 di antaranya **belum
  direview pemilik**. Retrofit ditunda sampai review itu selesai, supaya review tidak
  tercampur dengan penilaian tambahan baru.

**Yang harus dijaga:**

- **Tidak ada blok ```` ```python ```` di bagian ini.** Konvensi repo mewajibkan setiap
  blok kode bisa dijalankan sendiri; di bagian analogi itu tidak masuk akal, jadi tidak
  ada blok kode sama sekali — hanya prosa.
- **Tidak ada notasi `O(...)`**, karena pemeriksa mandiri membandingkan nilai di prosa
  dengan field `kompleksitas` dua arah.
- **Jumlah heading `## ` harus tetap simetris** antara `materi.id` dan `materi.en`.

**Verifikasi yang menyertai (bukan gerbang otomatis):**

1. **Pemeriksa mandiri** di luar repo: setiap bagian punya baris `**Batas analogi:**`
   (id) dan `**Where the analogy ends:**` (en); jumlah heading `## ` id/en simetris;
   tidak ada notasi `O(...)` di dalam bagian; tidak ada istilah game yang muncul tanpa
   penjelasan dalam tanda kurung; tidak ada emoji.
2. **Penyerangan balik oleh AI lain**: tiap analogi diperiksa untuk mencari pemetaan
   yang meleset — bagian mana yang tidak sejalan dengan Materi, dan apakah baris koreksi
   benar-benar menyebut titik itu.

Keduanya wajib, karena gerbang konten yang ada **tidak memeriksa kebenaran isi** —
sesuai temuan #16–#23 bahwa tidak satu pun cacat isi ditangkap gerbang.

## Alternatif yang ditolak

**1. Field baru `penjelasan_game{id,en}` ditampilkan di balik tombol.** Ditolak: menuntut
ADR tersendiri (skema dibekukan di issue #1), perubahan di `tipe.ts`, `periksa.ts`,
penyusun CSV, komponen halaman, `kamus.ts`, dan beberapa berkas uji — permanen, untuk
konten yang sifatnya bumbu. Keuntungannya (bisa disembunyikan) justru bertentangan
dengan maksudnya: bagian ini memang untuk dibaca.

**2. Rute terpisah "Mode Santai"** yang mengumpulkan semua analogi. Ditolak: menuntut
keputusan baru soal di mana teksnya disimpan (duplikasi di `materi` atau field baru),
plus perubahan kode sedang. Memisahkannya juga mematahkan gunanya: analogi paling berguna
justru saat dibaca **berdampingan** dengan Materi yang dijelaskannya.

**3. Selalu Fortnite dan Minecraft untuk semua Topik.** Ditolak: memaksa Fortnite untuk
konsep yang tidak nyambung menghasilkan analogi yang dipaksakan, dan analogi yang
dipaksakan justru yang menyesatkan.

**4. Tanpa baris koreksi.** Ditolak: menghilangkan satu-satunya jaring pengaman terhadap
miskonsepsi, dan gerbang yang ada tidak bisa menangkapnya. Bagian ini akan menjadi
satu-satunya isi Materi yang boleh salah tanpa konsekuensi.

**5. Bumbu juga di Kuis dan Pembahasan.** Ditolak: menambah permukaan cacat di alat
penilaian (kelas cacat "pengecoh yang sebenarnya juga benar" sudah terjadi di #18 dan
#19), sementara manfaatnya paling kecil di sana.

**6. Emoji di bagian game saja.** Ditolak: memecah konsistensi sembilan berkas yang
sudah nol emoji, dan teks yang butuh emoji untuk terasa lucu biasanya memang tidak lucu.

**7. Retrofit sekarang, review #19–#23 sesudahnya.** Ditolak: pemilik harus menilai lima
Topik **plus** menilai apakah tambahan barunya benar — dua pekerjaan tercampur, dan
temuan lama bisa terkubur oleh tambahan baru.

## Sumber

- **Grilling pemilik, 2026-10-07** — 27 keputusan, sesi ini. Pemetaan game, batas nada,
  penanda koreksi, dan urutan kerja semuanya keputusan pemilik.
- **Pembacaan sembilan `content/*.yaml`** (verifikasi keadaan nada: nol humor budaya pop,
  nol emoji, nol tanda seru dalam prosa; panjang 178–419 baris per bahasa; `hash-table`
  dan `rekursi` tanpa analogi naratif).
- **`frontend/src/lib/konten/bagian.ts`** dan **`materi-markdown.tsx`** — bukti bahwa
  menambah heading `## ` tidak menuntut perubahan kode: anchor, daftar isi, dan indeks
  Pencarian dihitung dinamis dari Markdown saat build (ADR-0009).
- **ADR-0019** — preseden cara menambah sesuatu ke skema tanpa menyunting issue #1.
- **ADR-0005** (`0005-soal-original-berbasis-skenario.md`) — "Soal ditulis original
  berbasis skenario, tidak menyalin soal LeetCode". Bagian analogi juga tulisan
  original, bukan salinan dari mana pun.
- **`CONTEXT.md`** — kosakata wajib. Keputusan ini tidak menambah istilah domain baru,
  jadi `CONTEXT.md` tidak berubah.
