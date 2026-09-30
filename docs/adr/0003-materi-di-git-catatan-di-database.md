# Materi dibaca dari git saat build, Catatan disimpan di database

## Status

accepted

## Konteks

Materi ditulis dalam file YAML per Topik. Catatan juga awalnya direncanakan di YAML, tetapi pengguna ingin bisa mencatat dari HP lewat situs. Editor di situs menulis ke database, sedangkan YAML dibaca saat build — dua hal ini tidak bisa berbagi satu sumber kebenaran.

## Keputusan

Materi dan Soal hidup di file YAML di dalam git, dibaca saat build dan menghasilkan halaman statis. Catatan dan Progres hidup di database backend, ditulis lewat situs.

## Alasan

Keduanya punya pola perubahan yang berbeda. Materi jarang berubah, perlu riwayat versi, dan tidak perlu ditulis dari HP. Catatan sering berubah, tidak butuh riwayat git, dan justru paling berguna kalau bisa ditulis kapan saja dari perangkat mana saja. Memisahkannya berarti masing-masing memakai alat yang tepat.

## Konsekuensi

- Field `catatan:` tidak ada di YAML. Satu jenis data, satu tempat penyimpanan.
- Mengubah Materi butuh build ulang situs. Memperbaiki typo dari HP dilakukan lewat GitHub di browser.
- Kalau backend mati, Materi dan Soal tetap bisa dibaca (halaman statis), tetapi Catatan, Progres, dan Eksekusi Kode mati.
- Catatan hanya ada di satu tempat, sehingga tombol export ke Markdown wajib ada sebagai jaring pengaman.

## Alternatif yang ditolak

**Editor di situs yang bisa mengubah Materi, dengan tombol Export ke YAML.** Ditolak karena menciptakan dua sumber kebenaran: perubahan di database akan hilang saat build ulang dari git kalau pengguna lupa menekan Export.

**Editor yang menulis langsung ke git lewat API.** Ditolak karena backend butuh token git dengan hak tulis ke repo, sehingga backend yang dikompromikan bisa menulis ulang seluruh repo, bukan hanya database progres.
