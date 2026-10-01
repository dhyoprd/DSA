# Inter adalah satu-satunya huruf yang diunduh; kode dan angka memakai tumpukan monospace sistem

## Status

accepted

## Konteks

`docs/design-tree.md`, Cabang 4, menetapkan "**Font**: Inter", dan kriteria penerimaan
issue #5 berbunyi "Font Inter dipakai di seluruh situs".

Ticket #5 memindahkan gaya Materi ke sistem token. Di situ muncul dua kebutuhan yang
tidak dipenuhi Inter:

1. **Blok kode.** Materi berisi kode Python (dan nanti kode jawaban pemelajar). Kode
   membutuhkan huruf berlebar tetap: indentasi Python adalah sintaks, dan dengan huruf
   proporsional ia berhenti terbaca. Gaya ini sudah ada sebelum #5 — `.materi
   :where(code)` memakai tumpukan `ui-monospace, SFMono-Regular, Menlo, Consolas,
   monospace`.
2. **Angka meta.** Nomor Topik di sidebar (`01`–`12`) dan penanda "04 / 12" berbaris
   vertikal dan berdampingan. Dengan huruf proporsional, lebarnya berbeda-beda dan
   kolomnya bergoyang saat angkanya berubah.

Pertanyaannya: apakah memakai tumpukan monospace sistem melanggar "Font: Inter".

## Keputusan

**Inter adalah satu-satunya keluarga huruf yang diunduh** (`next/font`, satu berkas,
diikat ke `--font-sans`). Tumpukan **monospace sistem** — yang tidak mengambil berkas
apa pun dari jaringan — dipakai untuk kode dan untuk **label meta berukuran kecil**,
lewat token `--font-mono`.

Cakupan tumpukan monospace, daftar lengkapnya:

| Pemakaian | Di mana |
|---|---|
| Blok dan potongan kode | `.materi :where(code)` — kode Python di Materi |
| Nomor dan label Jalur | `sidebar.tsx` — nomor `01`–`12`, label "segera", judul "Jalur · 12 Topik" |
| Penanda posisi | halaman Topik ("Topik 04 / 12"), label "Daftar isi" |
| Label kecil di halaman awal | `page.tsx` ("Situs belajar DSA") |
| Status backend | `backend-status.tsx` |
| Masukan token | `token-form.tsx` — token memang teks berlebar tetap |

Jadi monospace di sini bukan hanya untuk kode: ia juga **gaya tipografi untuk label
meta** — huruf kecil, huruf kapital semua, jarak antarhuruf lebar. Label seperti itu
sudah memakai `font-mono` sejak ticket #4, dan ticket #5 tidak memperkenalkannya.

"Inter dipakai di seluruh situs" dibaca sebagai: **seluruh teks situs memakai Inter**,
kecuali teks yang memang butuh lebar tetap. Monospace sistem bukan keluarga kedua yang
dipilih; ia tumpukan cadangan bawaan sistem operasi, dengan perilaku yang sama seperti
`system-ui` — tidak ada yang diunduh, tidak ada yang dipilih mereknya.

## Alasan

**Yang diminta design-tree.md adalah pilihan huruf, dan pilihan itu tetap satu.**
Design-tree.md menetapkan Inter sebagai huruf situs, bukan "hanya satu tumpukan
`font-family` boleh muncul di CSS". Membaca secara harfiah akan melarang monospace
sama sekali, dan itu membuat blok kode tidak terbaca — hasil yang jelas bukan yang
dimaksudkan.

**Tumpukan monospace tidak menambah biaya jaringan.** Ia memakai huruf yang sudah ada
di sistem operasi. Jadi keputusan ini tidak melanggar semangat "Inter saja" kalau
alasan aturannya adalah keseragaman tampilan dan penghematan unduhan.

**Sudah begitu sebelum ticket ini.** `.materi :where(code)` memakai tumpukan yang sama
sejak ticket #3, dan label meta memakai `font-mono` sejak ticket #4. Keduanya sudah ada
di `main` sebelum #5 dimulai. #5 tidak memperkenalkan tumpukan monospace; ia hanya
memberinya nama (`--font-mono`) supaya tidak ada dua tumpukan monospace yang berbeda
muncul di kemudian hari.

## Konsekuensi

- **Tampilan kode berbeda antar sistem operasi.** Menlo di macOS, Consolas di Windows,
  dan seterusnya. Untuk kode Python berlebar tetap, perbedaan itu tidak mengubah
  keterbacaan. Kalau kelak penyorotan sintaks ditambahkan, ini bisa ditinjau ulang.
- **`--font-mono` adalah token, bukan nilai yang ditulis ulang.** Komponen yang butuh
  monospace memakai `var(--font-mono)` atau kelas `font-mono`, sehingga tumpukannya
  bisa diganti di satu tempat.
- **Kalau kelak ada kebutuhan monospace yang benar-benar harus seragam** — misalnya
  membandingkan kode referensi dengan kode pemelajar berdampingan — keputusan ini
  perlu dibuka kembali, bukan ditambal diam-diam.

## Alternatif yang ditolak

**Mengunduh huruf monospace kedua (mis. JetBrains Mono, Fira Code).** Ditolak karena
menambah satu berkas huruf untuk manfaat yang tidak dibutuhkan: kode di situs ini
pendek dan tidak berdampingan dengan kode lain. Tumpukan sistem sudah memenuhi syarat
berlebar tetap.

**Memakai Inter untuk kode juga.** Ditolak karena Inter bukan huruf berlebar tetap;
indentasi Python akan berhenti sejajar.

## Sumber

- `docs/design-tree.md`, Cabang 4 — "**Font**: Inter."
- Issue #5, kriteria penerimaan — "Font Inter dipakai di seluruh situs".
- `frontend/src/app/globals.css` — token `--font-sans` dan `--font-mono`.
- `frontend/src/app/layout.tsx` — pemuatan Inter lewat `next/font`.
