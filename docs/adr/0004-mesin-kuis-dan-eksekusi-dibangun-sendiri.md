# Membangun mesin Kuis dan Eksekusi Kode sendiri, bukan memakai tool yang sudah ada

## Status

accepted

## Konteks

Riset terhadap tool kuis yang sudah ada menemukan beberapa opsi yang jauh lebih murah, dan merekomendasikan salah satunya sebagai pilihan utama. Untuk eksekusi kode, riset merekomendasikan Pyodide yang berjalan di browser tanpa server.

## Keputusan

Mesin Kuis dan Eksekusi Kode dibangun sendiri di dalam situs Next.js, dengan backend Rust untuk menjalankan kode.

## Alasan

Tool kuis yang sudah ada memaksa Kuis ditulis dalam bentuk daftar centang sederhana, sementara Kuis di sini berbentuk skenario dengan kode untuk ditebak outputnya dan kotak penjelasan bebas. Tool yang ada juga tidak bisa menyimpan Kotak Penjelasan dan Catatan ke database backend.

Untuk eksekusi kode, alasan sebenarnya adalah preferensi pengguna ingin memiliki backend Rust, bukan keunggulan teknis. Lihat ADR-0001.

## Konsekuensi

- Seluruh permukaan situs (Materi, Kuis, Soal Kode, Progres, Catatan, Visualisasi) dirancang sendiri, sehingga tidak ada satu tool pun yang bisa dipasang untuk menyelesaikan sebagian besar pekerjaan.
- Backend menjadi komponen yang harus hidup, dan harus di-harden karena situs publik. Lihat ADR-0002.
- Risiko utama: waktu yang dihabiskan untuk membangun mesin jauh melebihi waktu yang dihabiskan untuk belajar DSA. Mitigasinya adalah Fase 1 yang membatasi diri pada satu Topik.

## Alternatif yang ditolak

**mkdocs-quiz (rekomendasi riset).** Paling murah: Kuis ditulis sebagai daftar centang Markdown, ada lokalisasi Indonesia, dan Progres tersimpan di localStorage. Ditolak karena bentuk Kuis-nya tidak bisa menampung skenario dengan kotak penjelasan bebas.

**Google Forms mode kuis.** Nol kode. Ditolak karena konten hidup di server Google, tampilannya tidak bisa dikendalikan, dan tidak bisa menyimpan Catatan.

**Pyodide (Python di browser).** Nol server, nol biaya, nol risiko eksekusi di mesin sendiri. Ditolak karena preferensi pengguna. Alternatif ini akan disarankan lagi oleh siapa pun yang membaca kode ini, dan penolakannya dicatat agar tidak terlihat seperti kelalaian.
