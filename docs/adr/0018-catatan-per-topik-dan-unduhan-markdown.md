# Catatan per Topik di database, dan unduhan Markdown disusun di antarmuka

## Status

accepted

## Konteks

`CONTEXT.md` mendefinisikan **Catatan**: "Tulisanmu sendiri tentang sebuah Topik.
Tersimpan di database, bukan di file." ADR-0003 sudah memutuskan Catatan hidup di
database backend, terpisah dari Materi yang hidup di git, dan menyebut satu
konsekuensi eksplisit:

> Catatan hanya ada di satu tempat, sehingga tombol export ke Markdown wajib ada
> sebagai jaring pengaman.

Ticket #11 membangun editor Catatan pertama. Dua hal **belum** diputuskan, dan karena
itu diputuskan di sini:

1. **Apa isi unduhan Markdown di #11.** Kriteria penerimaan #11 meminta "Catatan bisa
   diunduh sebagai Markdown". Ticket #14 (Ekspor) juga menyebut "Catatan bisa diunduh
   sebagai Markdown", dan issue #1 menyebut satu endpoint Ekspor gabungan
   (Progres + Catatan). Tanpa keputusan, keduanya bisa membangun hal yang sama dua kali.
2. **Di mana berkas Markdown disusun** — di backend lewat endpoint unduhan, mengikuti
   pola `GET /api/ekspor/progres` dari #7, atau di antarmuka dari tulisan yang sedang
   ada di editor.

## Keputusan

**Satu tabel `catatan`, satu baris per Topik** — bukan per Soal seperti `penjelasan`.
Kuncinya `topik_slug` saja, dengan `isi` (Markdown, apa adanya) dan `diperbarui`
(waktu ISO-8601 UTC). Tanpa kolom skor. Migrasi ditulis sebagai berkas **baru**
(`0003_catatan.sql`), bukan suntingan `0001` atau `0002` — sqlx menyimpan checksum
migrasi yang sudah dijalankan dan menolak startup kalau isinya berubah.

**Endpoint `GET` dan `PUT /api/catatan/:slug`**, di bawah penjaga token yang sama
dengan Progres dan Kotak Penjelasan. `PUT` karena permintaannya mengganti seluruh isi
satu Catatan yang alamatnya pasti.

**Unduhan Markdown disusun di antarmuka, bukan di backend**, dari tulisan yang sedang
ada di editor. #11 menyediakan unduhan **per Topik** (`stack.md`); ekspor gabungan
seluruh Progres + Catatan tetap milik #14.

## Alasan

**Kenapa satu baris per Topik, bukan per Soal.** `CONTEXT.md` mendefinisikan Catatan
sebagai tulisan tentang sebuah **Topik**. Kotak Penjelasan disimpan per Soal karena ia
menjawab satu Soal; Catatan merangkum satu Topik. Kunci yang berbeda mengikuti arti
yang berbeda, bukan sekadar menyalin bentuk tabel tetangga.

**Kenapa berkas Markdown disusun di antarmuka.** Backend **tidak bisa** menyusun
berkas yang baik sendirian: judul Topik hidup di `content/jalur.yaml` (git), bukan di
database, dan backend tidak membacanya (ADR-0003). Endpoint unduhan backend karena itu
hanya bisa menghasilkan badan tulisan tanpa judul — berkas yang lebih buruk daripada
yang bisa dibuat antarmuka, yang sudah tahu judul Topiknya. Menyusunnya di antarmuka
juga membuat unduhan tetap bekerja **saat backend mati**, dan mengunduh apa yang
benar-benar dilihat pemelajar — termasuk suntingan yang belum sempat disimpan. Justru
saat backend bermasalah itulah salinan sendiri (alasan ADR-0003) paling berguna.

**Kenapa unduhan di #11 hanya per Topik.** Tombolnya ada di halaman satu Topik, jadi
berkas satu Topik adalah yang masuk akal di sana. Ekspor gabungan menuntut keputusan
yang belum diambil (satu berkas atau arsip, bagaimana Topik digabung), dan itu lingkup
#14. Pola yang sama sudah dipakai #7: `GET /api/ekspor/progres` dinamai menurut
resourcenya supaya ia tidak mengklaim kontrak gabungan issue #1, dan #14 yang
memutuskan apakah menyerapnya.

**Kenapa `key={topik.slug}` dipasang pada editor.** Next.js mempertahankan keadaan
komponen klien saat berpindah rute kalau komponennya menempati posisi yang sama —
`/id/topik/stack` dan `/id/topik/queue` berbagi layout dan sama-sama merender editor di
posisi itu. Tanpa `key`, instance yang sama dipakai ulang dengan `slugTopik` baru, dan
penanda "sudah menyalin tulisan awal" di dalamnya membuat editor menampilkan Catatan
Topik **sebelumnya**. `key` memaksa React memasang instance baru per Topik — cara yang
didokumentasikan React untuk keadaan yang terikat entitas.

**Kenapa mengosongkan editor tidak menghapus barisnya.** Sama dengan Kotak Penjelasan:
`diperbarui` yang terisi menandakan Catatan Topik ini sudah pernah dibuka, dan itu
informasi yang hilang kalau barisnya dihapus. Menghapusnya juga akan membuat dua cara
berbeda untuk mencapai keadaan yang sama ("belum pernah menulis" dan "menulis lalu
mengosongkan").

**Kenapa tidak ada kolom skor.** Catatan ditulis pemelajar untuk dirinya sendiri
(issue #1 user story 55), bukan sesuatu yang dinilai. Menambahkan satu kolom penilaian
akan mengubah sifatnya, dan itu kebalikan dari tujuannya.

## Konsekuensi

- **Catatan bisa ditulis dari laptop dan HP** (user story 56, 57) karena tersimpan di
  backend, bukan di peramban. Ia juga selamat saat data peramban dibersihkan
  (kriteria penerimaan #11).
- **Editor memuat sendiri**, berbeda dari `KotakPenjelasan` yang menerima tulisannya
  sebagai prop. Kotak Penjelasan hanya dirender setelah jawaban benar, jadi
  pemuatannya harus terjadi lebih dulu di `kuis.tsx`; editor Catatan selalu ada, jadi
  ia bisa memuat saat dipasang. Halaman Topik tetap komponen server yang statis.
- **Berkas unduhan bernama `<slug>.md`**, bukan memakai judul Topik: slug sudah aman
  sebagai nama berkas, dan judul bisa memuat spasi serta tanda baca yang harus
  di-escape berbeda di tiap sistem operasi.
- **Batas 2 MB dari `axum` sudah cukup**, jadi tidak ada batas ukuran tambahan.
- **Tidak ada penilaian Markdown di editor.** Isinya disimpan dan diunduh apa adanya;
  antarmuka tidak merender Markdown Catatan menjadi HTML. Merender berarti
  menambahkan pengurai Markdown ke bundel klien dan membuka pertanyaan sanitasi HTML,
  dan tak satu pun diminta kriteria penerimaan #11.

## Alternatif yang ditolak

**Endpoint unduhan di backend (`GET /api/ekspor/catatan/:slug`), mengikuti pola
`/api/ekspor/progres`.** Ditolak karena backend tidak punya judul Topik — ia hanya bisa
mengeluarkan badan tulisan, sehingga berkasnya kehilangan konteks Topik apa yang
dibahas. Pola Progres tidak berlaku di sini: Progres **hanya** ada di server, sedangkan
Catatan sudah ada di peramban saat editor terbuka.

**Menyusun ekspor gabungan seluruh Catatan sekarang.** Ditolak: itu mengerjakan
sebagian besar #14 tanpa keputusannya (satu berkas atau arsip, cara Topik digabung),
dan menambah endpoint yang harus dirawat sebelum kebutuhannya jelas.

**Menyimpan Catatan di `localStorage`.** Ditolak karena pemelajar memakai laptop dan HP
secara setara (user story 10, 52, 57) — tulisan harus ikut berpindah perangkat, dan itu
hanya mungkin kalau disimpan di backend. Sama dengan alasan yang menolaknya untuk
Kotak Penjelasan (ADR-0017).

**Menaruh Catatan di berkas YAML Topik.** Ditolak: tulisan itu milik pemelajar, bukan
Materi, dan bertentangan dengan ADR-0003.

**Merender Markdown Catatan menjadi HTML di editor.** Ditolak untuk ticket ini: tidak
diminta kriteria penerimaan, menambah pengurai Markdown ke bundel klien, dan membuka
pertanyaan sanitasi HTML yang tidak perlu untuk satu pengguna.

## Sumber

- Issue #11 — kriteria penerimaan: Catatan bisa ditulis per Topik; tersimpan di
  backend; sinkron antara laptop dan HP; tampil di bawah Materi Topik itu; bisa diunduh
  sebagai Markdown; tidak hilang saat data browser dibersihkan.
- Issue #1 — user story 55–59; "Penyimpanan: Progres, Kotak Penjelasan, dan Catatan
  hidup di database backend"; skema `catatan` — "satu baris per Topik: isi Markdown,
  waktu diperbarui"; "Kontrak API backend — Catatan — membaca dan menulis Catatan per
  Topik"; "Ekspor — mengembalikan seluruh Progres dan Catatan sebagai satu berkas
  unduhan".
- Issue #14 — kriteria penerimaan "Catatan bisa diunduh sebagai Markdown" (ekspor
  gabungan, lingkup #14).
- `CONTEXT.md` — **Catatan**, **Topik**, **Materi**.
- `docs/design-tree.md` Cabang 1 (editor Catatan di situs), Cabang 2, dan baris
  "Catatan di YAML (R7) vs editor Catatan di situs (R14) → Catatan pindah ke database +
  tombol export. ADR-0003".
- ADR-0003 — Materi di git, Catatan di database; tombol export sebagai jaring pengaman.
- ADR-0006 — autentikasi satu token; endpoint Catatan ikut dijaga token.
- ADR-0010 — SQLite + LiteFS; tabel `catatan` disebut di sana sejak awal.
- ADR-0017 — pola yang sama untuk Kotak Penjelasan (tabel, endpoint `PUT`, baris tidak
  dihapus saat dikosongkan, tanpa kolom skor).
- axum 0.8.9 — `MethodRouter::put` dan balasan tuple `(header, value)` (diverifikasi
  lewat ctx7 `/tokio-rs/axum`; pola yang sama sudah dipakai `routes/progres.rs`).
- Next.js 16 — keadaan komponen klien dipertahankan lintas navigasi; `key` untuk
  memasang ulang (diverifikasi lewat ctx7 `/vercel/next.js`, dokumen `bfcacheId`).
