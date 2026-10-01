# SQLite di volume Fly, direplikasi LiteFS, sebagai mesin database backend

## Status

accepted

## Konteks

Ticket #7 menyimpan Progres di backend, dan #8, #11, serta #14 menyusul dengan Kotak
Penjelasan dan Catatan. Sebelum satu baris pun ditulis, mesin database-nya harus
diputuskan: tidak ada ADR yang menetapkannya, `backend/Cargo.toml` tidak memuat
`sqlx`/`diesel`/`sea-orm`, dan `docker-compose.yml` hanya punya service `backend`
dan `frontend`. Ini keputusan arsitektur, bukan detail implementasi.

Bentuk datanya kecil dan sempit. Issue #1 menetapkan tiga tabel — `progres`
(satu baris per Topik×Soal), `penjelasan` (satu baris per Soal), `catatan` (satu
baris per Topik) — tanpa tabel pengguna, karena situs ini punya tepat satu
pengguna. Volume tulisnya rendah: satu orang menekan tombol. Yang dituntut bukan
skala, melainkan **tidak hilang** dan **terbaca dari laptop maupun HP**.

## Keputusan

Backend memakai **SQLite** melalui `sqlx`, dengan berkas database di sebuah
**Fly Volume**, dan **LiteFS** mereplikasi berkas itu antar Machine di dalam satu
region.

## Alasan

**SQLite cocok dengan bentuk datanya.** Satu berkas, tanpa layanan terpisah, tanpa
kredensial jaringan. Tiga tabel dengan satu penulis tidak membutuhkan server
database, dan menambahkannya berarti menambah satu hal yang harus hidup supaya
Progres bisa dibaca.

**Fly Volume memberi berkas itu tempat tinggal yang tetap.** Dokumentasi Fly
menyatakan setiap Machine hanya bisa memasang satu volume, dan satu volume hanya
bisa dipasang ke satu Machine. Untuk situs satu pengguna, satu Machine dengan satu
volume yang dipasang permanen sudah memenuhi kebutuhan.

**LiteFS menutup kelemahan paling nyata dari SQLite di Fly.** Dokumentasi Fly
memperingatkan bahwa satu Machine dengan satu volume berarti ada downtime saat
host gagal dan saat deploy. LiteFS adalah FUSE filesystem yang mereplikasi
perubahan SQLite per transaksi ke Machine lain, sehingga salinan data tetap ada di
lebih dari satu tempat. Ini yang dipilih alih-alih menerima risiko itu.

## Konsekuensi

- **Kolom `status` tidak disimpan, melainkan diturunkan.** Issue #1 menyebut tabel
  `progres` berisi "status, jumlah percobaan, waktu jawaban benar terakhir". Tabel
  yang dibangun hanya menyimpan `percobaan` dan `benar_terakhir`; `status` (belum /
  sedang / selesai) dihitung dari keduanya oleh `store::progres::status_dari`.
  Ini penyimpangan yang disengaja dari kalimat issue #1, dan alasannya sama dengan
  alasan ADR-0009 menolak `rehype-slug`: menyimpan `status` berarti menyimpan dua
  salinan satu fakta yang bisa saling menyimpang, dan penyimpangannya senyap —
  sidebar akan menampilkan penanda yang berbeda dari data yang mendasarinya tanpa
  ada yang gagal. Bentuk turunan juga menutup satu pertanyaan yang tidak perlu:
  apakah Soal yang sudah benar lalu dijawab salah lagi tetap "selesai". Dengan
  bentuk ini jawabannya mengikuti satu aturan di satu tempat, bukan bergantung pada
  urutan penulisan kolom.
- **LiteFS menambah satu komponen yang harus jalan, dan itu biaya nyata.** Ia
  bekerja sebagai FUSE filesystem, sehingga container butuh akses `/dev/fuse` dan
  capability `SYS_ADMIN`. Setiap Machine yang menjalankannya memerlukan konfigurasi
  `litefs.yml` dan peran primary/replica yang harus benar.
- **LiteFS masih pra-1.0.** Dokumentasi Fly sendiri menyatakan API-nya bisa
  berubah dan fitur bisa dihapus, dan bahwa Fly "tidak bisa memberikan dukungan
  atau panduan untuk produk ini". Risiko ini diterima sadar, sama seperti risiko
  lain di ADR-0002.
- **Hanya primary yang boleh menulis.** Pada replica, direktori LiteFS dipasang
  read-only lewat FUSE. Backend yang menerima permintaan tulis saat bukan primary
  harus gagal dengan jelas, bukan menggantung.
- **Backend tidak boleh memakai autostop/autostart.** Dokumentasi Fly memperingatkan
  ini bertentangan dengan kepemilikan lease LiteFS. Konfigurasi Machine harus
  mematikannya.
- **Backup tetap wajib, dan bukan LiteFS yang mengerjakannya.** Dokumentasi Fly
  menyarankan backup rutin ke luar. Jaring pengaman yang sudah dijanjikan adalah
  tombol Ekspor (#14) dan unduhan Markdown (#11); LiteFS melindungi dari kegagalan
  host, bukan dari kesalahan pengguna.
- **Di lokal, LiteFS tidak dipakai.** `docker compose up` menjalankan SQLite biasa
  di sebuah volume biasa. LiteFS baru relevan di produksi, dan mengembangkannya
  secara lokal hanya menambah hambatan tanpa menguji apa pun yang berbeda.
- **Kredensial database tidak ada.** Tidak ada URL dengan kata sandi; yang ada
  hanyalah sebuah path berkas, dibaca dari environment (`DATABASE_PATH`).

## Alternatif yang ditolak

**Fly Postgres (unmanaged).** Menyelesaikan downtime dengan cara yang jauh lebih
mahal: satu app dan satu cluster tambahan untuk dirawat, biaya bulanan, dan Fly
sudah tidak mengelolanya. Untuk satu pengguna dengan tiga tabel, ini membeli
ketersediaan yang tidak dibutuhkan, dengan kerumitan yang dibayar setiap hari.

**SQLite di volume, tanpa replikasi.** Paling sederhana, dan itu pilihan yang jujur
untuk banyak kasus. Ditolak karena dokumentasi Fly menyebut risikonya secara
eksplisit — downtime saat host gagal dan setiap kali deploy — dan pemilik proyek
memilih menutupnya dengan LiteFS alih-alih menerimanya.

**Postgres terkelola di luar Fly (Supabase, Neon).** Menghilangkan beban
operasional dan memberi replikasi bawaan. Ditolak karena menambah ketergantungan
jaringan dari backend ke pihak ketiga, padahal backend sudah harus berada di Fly
untuk Eksekusi Kode (ADR-0002, ADR-0007). Dua penyedia untuk satu situs kecil tidak
sebanding dengan manfaatnya.

## Sumber

- <https://docs.fly.io/volumes/overview> — "A Machine can only mount one volume, and
  each volume can only be mounted on one Machine"; peringatan bahwa satu Machine
  dengan satu volume berisiko downtime dan kehilangan data, dan saran backup rutin.
- <https://docs.fly.io/machines/flyctl/fly-machine-run> — cara memasang volume.
- <https://docs.fly.io/litefs/> — LiteFS sebagai FUSE filesystem; status pra-1.0;
  "We are not able to provide support or guidance for this product. Use with
  caution."; peringatan tentang autostop/autostart dan kepemilikan lease.
- <https://github.com/superfly/litefs> — `docker run --device /dev/fuse --cap-add
  SYS_ADMIN`; direktori replica dipasang read-only (mode 0555) dan penulisan
  ditolak dengan `ErrReadOnlyReplica`.
