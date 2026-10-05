# Visualisasi Stack: di halaman Topik, gerak lewat Motion, langkah di dalam kode

## Status

accepted

## Konteks

Ticket #15 meminta "animasi langkah-demi-langkah push dan pop pada Stack, sehingga
mekanismenya terlihat dan bukan hanya dibaca". Kriteria penerimaannya:

- Animasi push dan pop berjalan
- Bisa maju dan mundur langkah demi langkah
- Bisa diputar ulang dari awal
- Menghormati `prefers-reduced-motion`
- Nyaman dipakai di laptop dan HP

Ticket menyebut **Stack** saja. `CONTEXT.md` sudah punya istilah **Visualisasi**
("Animasi langkah-demi-langkah jalannya sebuah algoritma di dalam situs"), dan
`docs/design-tree.md` menjanjikan 12 Visualisasi, satu per Topik — tetapi belum ada
satu baris kode pun yang memakainya.

Empat hal tidak dijawab ticket maupun design-tree, dan keempatnya keputusan pemilik:

1. **Di mana Visualisasi ditampilkan.**
2. **Teknologi animasinya** — SVG+React, canvas, atau pustaka.
3. **Cakupannya** — Stack saja, atau Stack dan Queue.
4. **Cara memutarnya** — manual saja, atau ditambah putar otomatis.

Satu hal lagi menyusul saat perencanaan: **di mana urutan langkahnya disimpan** —
di dalam kode, atau sebagai field baru di `content/stack.yaml`.

## Keputusan

**Lima keputusan, semuanya mengikuti jawaban pemilik.**

### 1. Di halaman Topik, tepat di bawah Materi

`DaftarVisualisasi` disisipkan di `app/[bahasa]/topik/[slug]/page.tsx`, di antara
Materi dan Catatan. Urutannya jadi: Materi (konsep) → Visualisasi (mekanismenya
bergerak) → Catatan (rangkuman) → Kuis (uji diri).

### 2. Geraknya lewat pustaka `motion` (Framer Motion)

`motion` v14, diimpor dari `motion/react`. Yang dipakai:

- `AnimatePresence` dengan `mode="popLayout"` — kotak yang keluar dilepas dari tata
  letak lebih dulu, sehingga kotak sisanya bisa langsung bergeser.
- `layout` pada tiap kotak — menganimasikan pergeseran itu. Inilah yang menerangkan
  cara kerja Queue: saat yang paling depan keluar, yang di belakangnya maju.
- `MotionConfig reducedMotion="user"` — mematikan animasi transformasi dan tata letak
  bagi pemakai yang memintanya, sambil **mempertahankan** perubahan `opacity`, sehingga
  kotaknya tetap muncul dan hilang tanpa pergeseran.

### 3. Stack **dan** Queue

Kedua struktur divisualisasikan, dengan **urutan langkah yang sama persis**.

### 4. Manual **dan** putar otomatis

Tombol: mundur, maju, ulang, putar/jeda. Pemutaran otomatis berhenti sendiri di
langkah terakhir, dan menekan maju/mundur menghentikannya.

### 5. Urutan langkah di dalam kode, bukan di `content/stack.yaml`

`frontend/src/lib/visualisasi/langkah.ts`. Tidak ada field baru di skema konten, tidak
ada perubahan validator, tidak ada gerbang yang tersentuh.

## Alasan

**Kenapa di halaman Topik, bukan halaman sendiri.** Visualisasi hanya berguna tepat
setelah konsepnya dibaca. Pemakai yang sedang membaca bagian "Cara Stack bekerja"
sudah berada di halaman itu; memindahkannya ke halaman lain berarti ia harus tahu
untuk mencari Visualisasi sebelum tahu bahwa ia membutuhkannya. Sebagai bagian dari
halaman Topik, ia juga dapat lebar kolom yang sama dengan Materi dan Kuis, sehingga
ketiganya terasa satu alur.

**Kenapa `motion`, bukan SVG+React biasa atau canvas.** Pemilik memilih pustaka
animasi. Di antara dua yang disebut — GSAP dan Framer Motion — `motion` yang dipilih
karena masalahnya adalah **perpindahan tata letak yang dipicu keadaan React**, bukan
timeline imperatif yang digulirkan: yang berubah adalah daftar kotak setelah sebuah
langkah dijalankan, dan `AnimatePresence` + `layout` menangani tepat itu secara
deklaratif. GSAP lebih kuat untuk urutan yang dikendalikan `ScrollTrigger`, dan itu
bukan kebutuhan di sini. Yang dibayar sebagai konsekuensi: satu dependensi baru dan
**~45 KB gzip** di halaman Topik. Ukurannya diukur, dan ia **hanya** termuat di rute
Topik — beranda dan halaman pencarian tidak tersentuh (diperiksa dengan mencocokkan
chunk yang memuat `AnimatePresence` terhadap HTML tiap rute).

**Kenapa Stack dan Queue, padahal ticket hanya menyebut Stack.** Topik ini bernama
"Stack & Queue", dan Materi di dalamnya membangun klaim yang butuh keduanya untuk
dibuktikan:

> "Tiga nilai yang sama dimasukkan dengan urutan yang sama akan keluar dengan urutan
> terbalik dari Stack, dan dengan urutan yang sama dari Queue."

Satu Visualisasi Stack saja tidak bisa membuktikan klaim itu — pemelajar hanya melihat
satu dari dua sisi perbandingan. Karena itu kedua struktur memakai **urutan langkah
yang sama** (`LANGKAH_CONTOH`), sehingga satu-satunya hal yang berubah adalah ujung
tempat `pop` mengambil: 3 lalu 2 dari Stack, 1 lalu 2 dari Queue. Perbandingan itu
ditulis terang-terangan di antarmuka (`visualisasiBandingkan`), supaya pemelajar tidak
mengira kartu kedua adalah pengulangan.

**Kenapa langkahnya di kode, bukan di YAML.** Urutan langkah adalah bagian dari cara
**menggambar** sebuah konsep, bukan dari isi pelajarannya: ia tidak dibaca pemelajar
sebagai teks, tidak diterjemahkan, dan tidak masuk ekspor mana pun. Menaruhnya di
`content/stack.yaml` berarti menambah field wajib baru beserta aturan validator dan
gerbang build, untuk data yang belum tentu dipakai 11 Topik berikutnya dengan bentuk
yang sama — dan aturan repo ini adalah abstraksi ditambahkan saat ada kebutuhan kedua,
bukan sebelumnya. Kalau kelak terbukti sama, memindahkannya ke YAML adalah perubahan
yang jelas, bukan penyimpangan.

**Kenapa aturannya di modul murni, bukan di komponen.** Ini pola yang sudah dipakai
repo ini untuk Kuis (`lib/kuis/`) dan Pencarian (`lib/pencarian/`). Alasannya sama:
bug di aturan ini **senyap**. `pop` yang mengambil dari ujung yang keliru menghasilkan
animasi yang berjalan mulus tetapi mengajarkan LIFO dan FIFO yang tertukar, dan tidak
ada error apa pun yang muncul. Aturan itu karena itu hidup di `lib/visualisasi/`
sebagai fungsi murni yang diuji `node --test`:

- `struktur.ts` — apa isi struktur setelah sekian langkah. **Ujung mana yang diambil
  `pop`** ada di sini, satu tempat.
- `putar.ts` — apa yang dilakukan tiap tombol, termasuk batasnya.
- `keterangan.ts` — kalimat untuk pembaca layar.
- `label.ts` — kosakata yang bergantung bahasa **dan** struktur.

**Kenapa `label.ts` terpisah dari `kamus.ts`.** Kamus adalah peta datar
`Record<Bahasa, Kamus>` — satu bahasa, satu kalimat. Yang dibutuhkan di sini dua
sumbu: ujung keluar disebut "atas" pada Stack tetapi "depan" pada Queue, dan keduanya
berubah antara Indonesia dan English. Memaksakannya ke kamus berarti field seperti
`ujungKeluarStack` dan `ujungKeluarQueue` untuk setiap struktur — dan Tree, Heap, serta
Graph akan menambah lagi. Dua sumbu ditulis sebagai dua sumbu:
`Record<Bahasa, Record<JenisStruktur, LabelStruktur>>`.

**Kenapa `key` kotaknya nomor urut penyisipan, bukan indeks posisi.** Pustaka animasi
memakai perubahan posisi antar-render untuk menggeser kotak. Kalau `key`-nya indeks
posisi, `pop` di ujung depan Queue membuat React menganggap **seluruh** kotak diganti —
animasinya jadi pudar-muncul semua, bukan bergeser satu langkah, dan justru pergeseran
itulah yang menerangkan cara kerja Queue. Ada uji yang menjaga agar `id` tidak dipakai
ulang setelah sebuah kotak keluar.

**Kenapa tinggi arena disediakan sejak awal.** `puncakSel` menghitung jumlah kotak
terbanyak yang pernah ada, dan arena menyediakan ruang sebanyak itu sejak awal. Tanpa
itu wadahnya tumbuh dan menyusut setiap langkah, dan seluruh halaman di bawahnya ikut
bergeser. Diukur di HP: tinggi halaman **13382 → 13382** selama lima langkah berjalan.

**Kenapa pembaca layar dapat kalimat, bukan `aria-label`.** Visualisasi adalah gambar;
pembaca layar tidak melihat satu pun kotak yang bergeser. Arena gambarnya diberi
`aria-hidden`, dan yang menyampaikan maknanya adalah kalimat di `role="status"` yang
menyebut peristiwa terakhir (nilai apa masuk atau keluar, lewat ujung mana) dan isi
struktur sekarang. Kalimat itu disusun `keterangan.ts` dan diuji, karena ujung yang
salah di sana mengajarkan aturan yang salah tanpa error apa pun.

**Kenapa `MotionConfig reducedMotion="user"`, bukan cabang `if` di komponen.**
Pustaka animasinya sudah punya cara resmi untuk menghormati `prefers-reduced-motion`,
dan ia menangani perubahan pengaturan perangkat saat halaman terbuka. Menulis cabang
sendiri berarti menggandakan aturannya di setiap animasi yang ditambahkan nanti.

## Konsekuensi

- **Dependensi baru**: `motion` v14 (~45 KB gzip, hanya di rute Topik). Beranda dan
  halaman pencarian tidak termuat. Ini penambahan bobot terbesar yang pernah masuk
  repo ini, dan ia diterima sadar sebagai harga dari "mekanismenya terlihat".
- **Halaman Topik tetap statis.** Yang dirender server adalah kerangka Visualisasi;
  animasinya baru hidup setelah React mengambil alih. `/id/topik/stack` tetap
  ter-prerender (diperiksa pada keluaran build).
- **Tanpa backend, tanpa token.** Visualisasi bekerja penuh saat backend mati —
  diverifikasi: memakai seluruh kendalinya tidak memicu satu pun permintaan ke `/api/`.
- **Tanpa perubahan skema konten, tanpa migrasi.** `content/stack.yaml` tidak
  tersentuh; validator dan gerbang build tidak berubah.
- **Tanpa uji UI otomatis di repo** (issue #1: "Tanpa unit test UI"). Yang diuji
  otomatis adalah empat modul murni `lib/visualisasi/`; halamannya diverifikasi manual
  dengan Playwright — 36 pemeriksaan, skripnya **di luar repo**.
- **Temuan sampingan, bukan cacat ticket ini**: halaman Topik memunculkan 12 galat
  konsol 401 saat dibuka **tanpa token**, seluruhnya dari editor Catatan (#11) dan Kuis
  (#8) yang mencoba memuat tulisan tersimpan. Itu perilaku yang sudah ada dan disengaja
  (lihat komentar di `kuis.tsx`), dan halaman pencarian yang tidak memuat keduanya
  bersih (0 galat). Visualisasi sendiri **tidak** menambah satu pun permintaan jaringan
  — diperiksa terpisah. Tidak diperbaiki di ticket ini karena di luar lingkupnya, tetapi
  dicatat supaya tidak dikira berasal dari Visualisasi.
- **Istilah**: **Visualisasi** (sudah ada di `CONTEXT.md`) dipakai kode untuk pertama
  kalinya. Tidak ada istilah baru yang ditambahkan ticket ini.
- **11 Topik lain belum punya Visualisasi.** Peta `VISUALISASI_PER_TOPIK` di
  `daftar-visualisasi.tsx` sengaja berisi satu baris; Topik tanpa Visualisasi tidak
  menampilkan judul bagian yang menggantung.

## Alternatif yang ditolak

**SVG + React tanpa pustaka, atau canvas.** Pemilik memilih pustaka animasi. SVG+React
dan canvas tetap lebih ringan (nol dependensi), tetapi animasi perpindahan tata letak
harus ditulis dan dirawat sendiri; `motion` menanganinya secara deklaratif lewat
`AnimatePresence` + `layout`, dan menghormati `prefers-reduced-motion` lewat satu prop.

**GSAP.** Kekuatannya adalah timeline imperatif dan animasi yang digulirkan
(`ScrollTrigger`), dan itu bukan masalah di sini: yang berubah adalah daftar kotak
setelah keadaan React berubah. `motion` lebih dekat ke bentuk masalahnya.

**Halaman sendiri (`/[bahasa]/topik/[slug]/visualisasi`).** Ditolak karena memisahkan
Visualisasi dari Materi yang dijelaskannya; pemakai harus tahu untuk mencarinya.

**Visualisasi disisipkan ke dalam Materi.** Ditolak karena Materi adalah Markdown murni
yang dirender `MateriMarkdown`; menyisipkan komponen interaktif ke dalamnya berarti
menambah sintaks baru pada Markdown dan aturan baru di perendernya.

**Cakupan Stack saja.** Ditolak karena klaim perbandingan LIFO/FIFO di Materi tidak
bisa dibuktikan dengan satu struktur — lihat alasan di atas.

**Putar otomatis saja, atau manual saja.** Pemilik memilih keduanya. Manual saja
membuat pemelajar yang ingin melihat alur utuhnya harus menekan tombol berkali-kali;
otomatis saja menghilangkan kendali atas langkah yang belum dipahami.

**Langkah disimpan di `content/stack.yaml`.** Ditolak karena menambah field wajib baru
beserta validator dan gerbangnya, untuk data yang belum tentu dipakai ulang dengan
bentuk yang sama — lihat alasan di atas.

**`keterangan` merangkai kalimat dari potongan kata.** Ditolak karena tata bahasanya
lalu ditentukan di kode, dan harus benar untuk dua bahasa sekaligus. Kalimat yang utuh
(seperti "Strukturnya kosong.") dibawa apa adanya di kamus, di tempat penulisnya bisa
melihat dan memeriksanya.

## Sumber

- Issue #15 — kriteria penerimaan: animasi push dan pop berjalan; bisa maju dan mundur
  langkah demi langkah; bisa diputar ulang dari awal; menghormati
  `prefers-reduced-motion`; nyaman di laptop dan HP.
- Issue #1 — "Testing: validasi konten saat build + integrasi API di batas backend.
  Tanpa unit test UI"; user story 62 (Materi tetap terbaca saat backend mati).
- `docs/design-tree.md` — Cabang 4 (laptop dan HP sama penting; gaya Swiss; aksen
  merah); Cabang 5 (Visualisasi untuk 12 Topik, "dijanjikan, belum dikerjakan").
- `CONTEXT.md` — istilah **Visualisasi**: "Animasi langkah-demi-langkah jalannya sebuah
  algoritma di dalam situs"; sinonim yang dilarang: *animasi*, *demo*, *simulator*.
- `docs/adr/0004-mesin-kuis-dan-eksekusi-dibangun-sendiri.md` — seluruh permukaan situs
  (termasuk Visualisasi) dirancang sendiri, jadi tidak ada tool yang bisa dipasang.
- `docs/adr/0003-materi-di-git-catatan-di-database.md` — Materi hidup di git; itu alasan
  Visualisasi bisa statis dan tidak butuh backend.
- Dokumentasi `motion` v14 (diakses lewat `ctx7`, sumber `motion.dev`) —
  `react-animate-presence` (`mode="popLayout"`, `exit`), `react-layout-animations`
  (prop `layout`), `react-use-reduced-motion` (`useReducedMotion`),
  `react-motion-config` (`MotionConfig reducedMotion="user"`), `react-installation`
  (`npm install motion`, impor dari `motion/react`).
- Next.js 16.3.7, dokumentasi yang dibundel di `frontend/node_modules/next/dist/docs/` —
  `01-app/02-guides/server-and-client-boundary.md` (props harus bisa diserialkan),
  `01-app/02-guides/lazy-loading.md` (`next/dynamic`), `01-app/03-file-conventions/page.md`.
