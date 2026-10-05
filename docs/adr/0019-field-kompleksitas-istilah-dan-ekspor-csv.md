# Field `kompleksitas` dan `istilah` di YAML Topik, dan ekspor CSV saat build

## Status

accepted

## Konteks

Ticket #14 (Ekspor) meminta lima hal:

- Progres bisa diunduh sebagai berkas
- Catatan bisa diunduh sebagai Markdown
- Ada ekspor CSV berisi kompleksitas waktu dan ruang tiap struktur, definisi istilah,
  dan pasangan istilah Indonesia–English
- CSV bisa diimpor ke Anki tanpa penyuntingan manual
- Ekspor mencakup Topik yang sudah diselesaikan

Dua yang pertama sudah sebagian ada sebelum ticket ini:

- `GET /api/ekspor/progres` (dibangun #7) sudah mengunduh Progres sebagai JSON.
  Komentarnya di `routes/progres.rs` secara eksplisit menyebut #14 sebagai pemilik
  keputusan apakah endpoint itu diserap atau tetap terpisah.
- Unduhan Markdown Catatan **per Topik** sudah ada di #11, disusun di antarmuka
  (ADR-0018). Yang belum: ekspor gabungan semua Catatan.

Yang membuat ticket ini bukan sekadar penambahan endpoint adalah **kriteria ketiga:
datanya tidak punya sumber terstruktur.**

- **Kompleksitas** hidup sebagai tabel Markdown di dalam prosa Materi
  (`content/stack.yaml`, bagian "## Kompleksitas"), bukan sebagai field YAML. Skema
  di issue #1 tidak punya field kompleksitas.
- **Definisi istilah** dan **pasangan istilah Indonesia–English** tidak ada di mana
  pun. Tidak ada berkas glosarium; `content/` hanya berisi `jalur.yaml`, `stack.yaml`,
  dan `README.md`.

Skema YAML dibekukan di issue #1, dan `content/README.md` melarang mengarang skema
baru. Jadi keputusan ini adalah keputusan pemilik proyek, bukan agen — dan sudah
ditanyakan. Jawabannya:

1. **Sumber data**: tambah field terstruktur ke skema YAML Topik.
2. **Ekspor gabungan**: tetap terpisah — Progres tetap punya endpointnya sendiri, dan
   CSV disusun saat build.
3. **Bentuk berkas Anki**: satu CSV dengan kolom Tags yang menandai jenis fakta.

## Keputusan

**Tiga keputusan, semuanya mengikuti jawaban pemilik.**

### 1. Field `kompleksitas` dan `istilah` di skema YAML Topik

Skema Topik bertambah dua field **wajib**:

```yaml
kompleksitas:
  - struktur: { id: Stack (array), en: Stack (array) }
    ruang: O(n)
    operasi:
      - nama: { id: Tambah elemen (push), en: Add element (push) }
        waktu: O(1)
istilah:
  - istilah: { id: Tumpukan, en: Stack }
    definisi:
      id: Struktur yang menambah dan mengambil dari ujung yang sama…
      en: A structure that adds and removes from the same end…
```

`ruang` ada sekali per struktur; `waktu` ada per operasi — "berapa ruangnya" dijawab
sekali untuk sebuah struktur, "berapa waktunya" dijawab per operasi. `waktu` dan
`ruang` adalah teks apa adanya (`O(1)`, `O(n log n)`): notasinya sama di kedua bahasa,
jadi menyimpannya sebagai `{ id, en }` hanya menghasilkan dua salinan yang bisa
menyimpang.

Keduanya wajib, dan gerbang build di `periksa.ts` menolak Topik yang tidak punya,
tidak lengkap dua bahasa, atau punya struktur tanpa operasi.

### 2. CSV disusun saat build, disajikan statis — tanpa backend

Route handler `app/[bahasa]/ekspor/anki/route.ts` dengan `dynamic = "force-static"`
dan `generateStaticParams` menyusun CSV dari `content/` **saat build**, satu berkas
per bahasa, dan menyajikannya sebagai berkas statis di `/[bahasa]/ekspor/anki`.
Penyusunnya (`lib/ekspor/`) adalah fungsi murni.

`GET /api/ekspor/progres` **tetap** seperti sekarang. Unduhan gabungan seluruh
Catatan **tambahan** disusun di antarmuka (mengikuti ADR-0018), bukan lewat endpoint
backend baru.

### 3. Satu CSV, tiga jenis kartu, ditandai kolom Tags

Satu berkas CSV berisi tiga jenis fakta, dibedakan lewat tag: `kompleksitas`,
`istilah`, dan `istilah-id-en` (plus slug Topik). Format berkasnya mengikuti manual
Anki: header `#separator:Comma`, `#html:false`, `#notetype:Basic`, `#deck:DSA`,
`#columns:Front,Back,Tags`, dan `#tags column:3`.

## Alasan

**Kenapa field terstruktur, bukan mengurai tabel Markdown.** Mengurai tabel dari
prosa akan bergantung pada bentuk teksnya — merapikan tabel, mengubah jumlah kolom, atau
menambahkan penjelasan di sekitarnya akan diam-diam merusak CSV. Tabel itu untuk dibaca
manusia; field terstruktur untuk mesin. Keduanya dibiarkan ada, dan komentar di
`stack.yaml` menyebut kenapa. Selain itu, mengurai tabel **tidak menyelesaikan apa
pun** untuk definisi istilah, yang memang belum punya sumber.

**Kenapa kompleksitas menempel pada Topiknya, bukan di berkas glosarium terpisah.**
Fakta kompleksitas adalah tentang struktur yang diajarkan sebuah Topik, jadi ia satu
berkas dengan Topiknya — satu sumber kebenaran. Berkas glosarium terpisah akan membuat
kompleksitas ada di dua tempat (glosarium dan tabel di Materi) yang bisa menyimpang,
dan menambah berkas yang harus dijaga sinkron setiap kali Topik baru ditulis. Definisi
istilah ikut menempel karena itu keputusan pemilik, dan karena istilah sebuah Topik
memang kosakata Topik itu.

**Kenapa CSV disusun saat build.** Datanya hidup di git (`content/`), bukan di
database. Backend tidak membacanya (ADR-0003). Menyusunnya di backend berarti
menyalin pembacaan YAML ke Rust, padahal hasilnya hanya berubah saat konten berubah —
yaitu saat build. Berkas statis juga **tetap bisa diunduh saat backend mati**, dan
tidak butuh token.

**Kenapa Progres tetap terpisah.** Progres **hanya** ada di server, jadi unduhannya
memang harus lewat backend — pola yang sudah dipakai #7. Menggabungkannya dengan CSV
(berkas statis) atau Catatan (disusun di antarmuka) berarti memaksa dua sumber yang
berbeda menjadi satu endpoint yang lebih rumit dan tidak lebih berguna. Issue #1
menyebut "satu endpoint Ekspor gabungan", tetapi ADR-0018 sudah menunjukkan kenapa
backend tidak bisa menyusun Markdown Catatan yang baik (judul Topik hidup di git).
Keputusan pemilik adalah tetap terpisah.

**Kenapa satu CSV, bukan tiga berkas.** Satu berkas lebih mudah diunduh dan diimpor;
kolom Tags membuat tiga jenis fakta tetap bisa disaring di Anki. Tiga berkas akan
memaksa pemelajar mengimpor tiga kali untuk mendapatkan hasil yang sama.

**Kenapa `#deck` dan `#notetype` di header.** Manual Anki menyebut `#deck` yang
menyebut dek yang belum ada akan **membuatnya**, jadi tidak perlu menyiapkan dek di
Anki lebih dulu — itu bagian dari "impor tanpa penyuntingan manual". `#columns` dan
`#tags column` memberi tahu Anki nama kolom dan kolom tag, sehingga dialog impor tidak
perlu dipetakan manual.

**Kenapa `#html:false`.** Isinya teks biasa; notasi `O(n)` dan definisi tidak memakai
HTML. Dengan begitu tanda kurung dan `&` tidak perlu di-escape, dan definisi terbaca
apa adanya.

**Kenapa sisi depan kartu diberi awalan** ("Kompleksitas waktu", "Definisi",
"Istilah"). Anki menentukan keunikan catatan dari **kolom pertamanya**. Tanpa awalan,
kartu definisi dan kartu pasangan untuk istilah yang sama akan berdepan sama
("Tumpukan"), dan Anki menolaknya sebagai duplikat — itu langsung melanggar "impor
tanpa penyuntingan manual". Ada uji yang menjaga ini.

**Kenapa istilah tanpa padanan tidak menghasilkan kartu pasangan.** "LIFO" sama di
kedua bahasa; kartu "LIFO → LIFO" tidak menguji apa pun. Definisinya tetap dibuat,
karena justru itulah yang perlu diketahui tentang istilah seperti itu.

**Kenapa kartu pasangan mengikuti bahasa antarmuka.** Di Indonesia, depan Indonesia
dan belakang English; di English dibalik. Satu aturan: **ingat istilah dalam bahasa
yang lain**. Itu membuat berkas Indonesia dan English dua-duanya berguna.

**Kenapa `kompleksitas` dan `istilah` wajib, bukan opsional.** CSV yang isinya
bergantung pada Topik mana yang kebetulan punya field akan diam-diam kehilangan baris.
Menjadikannya wajib membuat gerbang build menolak Topik yang belum lengkap, bukan
menghasilkan berkas yang bolong tanpa pesan.

## Konsekuensi

- **Skema di issue #1 bertambah dua field.** Issue #1 sendiri tidak diubah; perubahan
  dicatat di sini dan di `content/README.md`, mengikuti kebiasaan repo ini (ADR-0018
  juga menambah perilaku tanpa menyunting issue).
- **Menulis Topik baru kini menuntut `kompleksitas` dan `istilah`.** Itu menambah
  pekerjaan per Topik, dan disengaja: gerbang menolak Topik yang belum lengkap.
- **Kompleksitas kini ada di dua tempat** — tabel di prosa Materi, dan field
  terstruktur. Keduanya bisa menyimpang. Tidak ada gerbang yang membandingkannya, dan
  itu diterima: tabelnya untuk dibaca, fieldnya untuk mesin, dan menyamakannya
  otomatis berarti mengurai tabel lagi — persis yang dihindari. **Perlu disiplin saat
  menyunting Materi**: mengubah tabel kompleksitas berarti mengubah field-nya juga.
- **Kartu Anki dihasilkan per bahasa**, jadi ada dua berkas (`dsa-anki-id.csv`,
  `dsa-anki-en.csv`). Tag **tidak** diterjemahkan, supaya penyaringnya sama di kedua
  berkas.
- **Kriteria "ekspor mencakup Topik yang sudah diselesaikan"** terpenuhi dengan
  sendirinya: CSV dibangun dari semua Topik yang punya berkas, tanpa melihat Progres.
  Saat ini baru `stack` yang punya berkas, jadi baru Topik itu yang masuk — dan itu
  tidak bisa diuji lebih jauh sampai Topik kedua ditulis.
- **`cargo` tidak tersentuh.** Ticket ini murni frontend + konten.

## Alternatif yang ditolak

**Berkas glosarium baru (`content/glosarium.yaml`).** Ditolak karena kompleksitas akan
ada di dua tempat yang bisa menyimpang, dan karena istilah memang kosakata Topiknya.
Keputusan pemilik juga memilih field di Topik.

**Mengurai tabel Markdown kompleksitas dari Materi saat build.** Ditolak karena rapuh
(bergantung bentuk tabel) dan tidak menyelesaikan definisi istilah sama sekali.

**Endpoint Ekspor gabungan di backend (Progres + Catatan + CSV).** Ditolak: Progres
hanya ada di server, Catatan paling baik disusun di antarmuka (ADR-0018), dan CSV bisa
disusun saat build. Menggabungkan ketiganya memaksa satu endpoint menangani tiga
sumber yang berubah karena alasan berbeda. Keputusan pemilik: tetap terpisah.

**Tiga berkas CSV terpisah (kompleksitas, istilah, pasangan).** Ditolak karena
memaksa tiga impor untuk satu tujuan. Keputusan pemilik: satu berkas + kolom Tags.

**Memakai `#separator:Semicolon`.** Ditolak karena koma adalah pemisah yang paling
akrab kalau berkasnya ingin dibuka di spreadsheet, dan penyandi CSV sudah menangani
sel yang memuat koma.

**Memakai HTML di dalam sel (`#html:true`) untuk baris baru.** Ditolak karena isinya
tidak butuh baris baru di dalam sel, dan mengaktifkan HTML membuka pertanyaan escaping
`<`, `>`, `&` yang tidak perlu.

## Sumber

- Issue #14 — kriteria penerimaan: Progres bisa diunduh; Catatan bisa diunduh sebagai
  Markdown; CSV kompleksitas + definisi istilah + pasangan id–en; CSV bisa diimpor ke
  Anki tanpa penyuntingan manual; ekspor mencakup Topik yang sudah diselesaikan.
- Issue #1 — skema YAML Topik; "Penyimpanan: Progres, Kotak Penjelasan, dan Catatan
  hidup di database backend"; "Kontrak API backend — Ekspor".
- Anki Manual, "Text Files" — `https://docs.ankiweb.net/importing/text-files.html`.
  Diverifikasi lewat WebFetch **dan** ctx7 (`/websites/ankiweb_net`, 703 cuplikan).
  Yang dikutip: berkas harus UTF-8; header `#kunci:nilai` di baris-baris awal; kunci
  `separator`, `html`, `notetype`, `deck`, `columns`, `tags column`; jumlah kolom dari
  baris pertama yang bukan komentar; sel dikutip bila memuat pemisah/tanda kutip/baris
  baru, tanda kutip digandakan; `#deck` yang belum ada akan dibuat.
- Next.js 16.3.7, dokumentasi yang dibundel di `frontend/node_modules/next/dist/docs/`
  — `01-app/03-api-reference/03-file-conventions/route.md` (`params` adalah Promise;
  `dynamic`/`generateStaticParams` untuk route handler) dan
  `04-functions/generate-static-params.md`.
- ADR-0003 — Materi di git, Catatan di database.
- ADR-0008 — Jalur manifest di `content/`.
- ADR-0018 — Catatan per Topik; unduhan Markdown disusun di antarmuka; pola
  "batas dengan #14" pada endpoint ekspor.
- `CONTEXT.md` — **Topik**, **Materi**, **Istilah**, **Catatan**, **Progres**.
- `content/README.md` — larangan mengarang skema baru; gerbang validasi.
