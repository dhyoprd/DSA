# Kotak Penjelasan per Soal, dan Pembahasan baru terbuka setelah tombolnya ditekan

## Status

accepted

## Konteks

`CONTEXT.md` mendefinisikan **Kotak Penjelasan**: "Tempat kamu menulis alasan
jawabanmu dengan kata sendiri, lalu membandingkannya dengan penjelasan referensi.
Tidak dinilai otomatis." `docs/design-tree.md` Cabang 1 menetapkannya sebagai bagian
rantai inti Fase 1, dan Cabang 2 menetapkan penyimpanannya di database backend.

Ticket #6 sudah membangun komponen Kuis, tetapi belum menyambungkan apa pun ke
backend: jumlah percobaan hidup di memori komponen, dan tidak ada Kotak Penjelasan.
Ticket #8 menutup celah itu.

Dua hal **belum** diputuskan oleh issue #1, dan karena itu diputuskan di sini:

1. **Apakah menjawab benar langsung membuka Pembahasan.** Issue #1 memuat dua syarat
   yang saling menekan. User story 22 dan `design-tree.md`: "Pembahasan hanya terbuka
   setelah jawaban benar" — itu yang dibangun #6. User story 49: "Pembahasan
   tersembunyi di balik tombol, sehingga saya benar-benar mencoba dulu sebelum
   melihatnya". Kalau Pembahasan terbuka sendiri begitu jawaban benar, Kotak
   Penjelasan kehilangan gunanya: pemelajar membaca penjelasan referensi lebih dulu,
   lalu menulis "alasan" yang sudah dipandu jawabannya.
2. **Bagaimana tulisan tersimpan muncul kembali setelah halaman dimuat ulang.**
   `KeadaanKuis` hidup di memori komponen dan kembali ke `keadaanAwal()` setiap muat
   ulang. Kalau Kotak Penjelasan hanya muncul setelah jawaban benar, ia tidak akan
   pernah muncul lagi setelah muat ulang — padahal kriteria penerimaan #8 meminta
   "Tulisan muncul kembali saat Kuis itu dibuka lagi".

## Keputusan

**Satu tabel `penjelasan` per (Topik, Soal)**, dengan `isi` (tulisan pemelajar) dan
`diperbarui` (waktu ISO-8601 UTC). Tanpa kolom skor apa pun. Endpoint
`GET /api/penjelasan/:slug/:indeks` dan `PUT /api/penjelasan/:slug/:indeks`, keduanya
di bawah penjaga token yang sama dengan Progres. Migrasi ditulis sebagai berkas
**baru** (`0002_penjelasan.sql`), bukan suntingan `0001` — sqlx menyimpan checksum
migrasi yang sudah dijalankan dan menolak startup kalau isinya berubah.

**Menjawab benar tidak membuka Pembahasan.** Setelah benar, Kotak Penjelasan muncul;
Pembahasan baru terbuka setelah tombol "Bandingkan dengan Pembahasan" ditekan. Aturan
itu hidup di `frontend/src/lib/kuis/penilaian.ts` sebagai fungsi murni
(`pembahasanTerbuka` = `benar && pembahasanDibuka`), bukan di komponen.

**Tulisan yang tersimpan adalah bukti bahwa jawabannya sudah pernah benar.** Saat
`kuis.tsx` memuat tulisan dari backend, `diperbarui` yang terisi memulihkan keadaan ke
"sudah benar" (`keadaanDariTulisanTersimpan`). Itu yang membuat kotaknya muncul lagi
setelah muat ulang.

## Alasan

**Kenapa `PUT`, bukan `POST`.** Permintaannya mengganti **seluruh** isi satu kotak yang
alamatnya sudah pasti, dan mengirim tulisan yang sama dua kali menghasilkan keadaan
yang sama. Itu persis arti `PUT`; `POST` menyiratkan "tambahkan sesuatu yang baru".

**Kenapa kotak yang belum pernah ditulis dibalas `200` dengan isi kosong, bukan
`404`.** "Belum pernah menulis" adalah keadaan normal **setiap** Soal, bukan alamat
yang salah. Membalas `404` akan memaksa antarmuka memperlakukan keadaan biasa sebagai
galat, dan menampilkan pesan gagal kepada pemelajar yang hanya belum menulis apa-apa.
Bentuk balasannya sengaja sama untuk kedua keadaan, sehingga antarmuka hanya punya satu
bentuk untuk ditangani.

**Kenapa mengosongkan kotak tidak menghapus barisnya.** `diperbarui` yang terisi
menandakan Kotak Penjelasan Soal itu sudah pernah dibuka, dan itu informasi yang hilang
kalau barisnya dihapus. Menghapusnya juga akan membuat dua cara berbeda untuk mencapai
keadaan yang sama ("belum pernah menulis" dan "menulis lalu mengosongkan"), yang lalu
harus dibedakan lagi di suatu tempat.

**Kenapa tidak ada kolom skor.** Tulisan ini tidak dinilai otomatis (user story 28).
Menambahkan satu kolom penilaian akan mengubah sifat fitur ini dari "merumuskan
pemahaman" menjadi "mengerjakan ujian", dan itu kebalikan dari tujuannya. Karena itu
tidak ada fungsi di `store::penjelasan` yang bisa menyatakan sebuah tulisan benar atau
salah.

**Kenapa `percobaan` tidak ikut dipulihkan.** Jumlah percobaan yang sebenarnya hidup di
Progres (`percobaan`, `benar_terakhir`), dan menyambungkan Progres ke tampilan **bukan**
lingkup ticket ini. Mengisinya dengan angka karangan akan menampilkan hitungan yang
salah — lebih buruk daripada tidak menampilkannya. `percobaan` tetap 0 setelah muat
ulang, dan karena penandanya hanya muncul kalau `percobaan > 0`, ia memang tidak
tampil.

**Kenapa pemulihan dari tulisan tersimpan sah sebagai bukti "sudah benar".** Kotak
Penjelasan hanya muncul setelah jawaban benar, jadi tulisan tidak mungkin ada tanpa
jawaban benar lebih dulu. Kesimpulan itu berlaku karena aturan kemunculannya sendiri,
bukan tebakan dari data lain.

## Konsekuensi

- **Menjawab benar kini punya dua langkah, bukan satu.** Ini perubahan perilaku yang
  terlihat, dan disengaja: user story 49 meminta Pembahasan memang tersembunyi di balik
  tombol. Komentar di `kuis.tsx` yang sebelumnya memakai `terbuka` sebagai syarat
  "sudah selesai" diperbaiki menjadi `keadaan.benar` — kalau tidak, opsi tetap bisa
  diklik setelah dijawab benar, dan umpan balik "Belum tepat" muncul untuk jawaban yang
  justru sudah benar. Keduanya ditemukan dengan menjalankan, bukan membaca.
- **`KeadaanKuis` bertambah satu field** (`pembahasanDibuka`) dan satu fungsi pemulihan
  (`keadaanDariTulisanTersimpan`). Keduanya tetap murni dan diuji tanpa React.
- **Progres masih belum tersambung ke tampilan.** Ini yang paling mudah salah dibaca:
  komentar di beberapa berkas menyebut ticket #8 sebagai yang menyambungkan Progres.
  Itu **keliru** dan sudah dikoreksi di tempatnya (`kuis.tsx`, `sidebar.tsx`,
  `penanda-progres.tsx`, `konten/tipe.ts`, `store/progres.rs`, ADR-0014). Yang benar:
  #7 membangun endpoint Progres, dan belum ada ticket yang memasangnya di sidebar.
  Konsekuensinya status ○◐● di sidebar masih selalu ○, dan itu bukan regresi dari
  ticket ini.
- **`backend/src/store/mod.rs` sudah menyebut `penjelasan` sejak #7** sebagai modul yang
  akan ditambahkan #8, jadi struktur itu tidak berubah — hanya modulnya yang sekarang
  ada.
- **Tulisan bisa saja hilang kalau backend tidak bisa dihubungi.** Pemulihan gagal
  secara senyap (kotak ditandai "kosong" alih-alih menampilkan galat di setiap Kuis),
  supaya Materi dan Soal tetap terbaca tanpa token (user story 62). Yang tidak
  dikorbankan: menyimpan tetap memberi pesan galat yang jelas, bukan gagal diam-diam.
- **Batas 2 MB dari `axum` sudah cukup**, jadi tidak ada batas ukuran tambahan yang
  dipasang. Angka yang dipilih dan dirawat tanpa kebutuhan hanya menambah yang harus
  dipikirkan.

## Alternatif yang ditolak

**Membiarkan Pembahasan terbuka otomatis setelah jawaban benar, dan menambahkan tombol
yang hanya menggulir ke sana.** Ditolak: itu tidak memenuhi user story 49, dan
menghapus alasan Kotak Penjelasan ada. Pemelajar yang membaca penjelasan referensi lebih
dulu akan menulis "alasan" yang sebenarnya menyalin penjelasan itu.

**Menyimpan Kotak Penjelasan di `localStorage`.** Ditolak karena pemelajar memakai
laptop dan HP secara setara (user story 10, 52) — tulisan harus ikut berpindah
perangkat, dan itu hanya mungkin kalau disimpan di backend.

**Menaruh tulisan di berkas YAML Topik.** Ditolak: tulisan itu milik pemelajar, bukan
Materi. Menaruhnya di git berarti setiap tulisan menjadi perubahan berkas, dan
bertentangan dengan ADR-0003.

**Memulihkan "sudah benar" dari Progres, bukan dari tulisan tersimpan.** Ditolak
**untuk ticket ini** karena Progres belum tersambung ke tampilan; memakainya di sini
berarti mengerjakan penyambungan itu diam-diam. Kalau nanti Progres tersambung,
memulihkan dari Progres akan lebih tepat untuk Soal yang sudah benar tetapi belum
ditulisi — dan saat itu keputusan ini layak ditinjau ulang, bukan diabaikan.

**Menambahkan batas ukuran tulisan sendiri.** Ditolak karena `axum` sudah membatasi
badan permintaan pada 2 MB, jauh di atas tulisan yang wajar untuk satu Kotak
Penjelasan.

**Menghapus baris saat kotak dikosongkan.** Ditolak: lihat alasan di atas.

## Sumber

- Issue #1 — user story 26, 27, 28, 29, 49, 52, 62; "Penyimpanan: Progres, Kotak
  Penjelasan, dan Catatan hidup di database backend"; "Kontrak API backend —
  Penjelasan — membaca dan menulis Kotak Penjelasan per Soal."
- Issue #8 — kriteria penerimaan: kotak muncul setelah jawaban benar; tulisan tersimpan
  di backend; tulisan muncul kembali saat Kuis dibuka lagi; ada tombol membandingkan
  dengan penjelasan referensi; tulisan tidak dinilai otomatis; bisa ditulis dari laptop
  maupun HP.
- `CONTEXT.md` — **Kotak Penjelasan**, **Pembahasan**, **Kuis**.
- `docs/design-tree.md` Cabang 1 dan Cabang 2.
- ADR-0003 — Materi di git, Catatan di database (pola yang sama untuk Kotak
  Penjelasan).
- ADR-0006 — autentikasi satu token; endpoint Penjelasan ikut dijaga token.
- ADR-0010 — SQLite + LiteFS; tabel `penjelasan` disebut di sana sejak awal.
- ADR-0014 — sesi Kuis di `sessionStorage`; dikoreksi di tempatnya soal penunjukan
  ticket #8.
- axum, `MethodRouter` — fungsi `put` tersedia di `axum::routing` (diverifikasi di
  `axum-0.8.9/src/routing/method_routing.rs`: `top_level_handler_fn!(put, PUT)`).
- axum-core, `Request::with_limited_body` — batas badan bawaan 2 MB
  (`DEFAULT_LIMIT = 2_097_152`), diverifikasi di
  `axum-core-0.5.6/src/ext_traits/request.rs`.
