# Eksekusi kode ditangani backend Rust, bukan di browser

## Status

accepted

## Konteks

Situs ini punya satu pengguna, Progres-nya di localStorage, dan tidak punya pekerjaan lain yang butuh server. Satu-satunya alasan backend ada adalah menjalankan kode Python dari Soal Kode.

Alternatifnya adalah Pyodide: interpreter CPython yang dikompilasi ke WebAssembly, jalan sepenuhnya di browser, nol server, nol biaya.

## Keputusan

Kode dijalankan oleh backend Rust, bukan Pyodide.

## Alasan

Pilihan sadar pengguna, bukan hasil analisis teknis. Pengguna ingin backend Rust ada di proyek ini. Keuntungan sampingan: tidak ada unduhan ~11,6 MB saat halaman pertama dibuka.

Dicatat apa adanya karena alasan sebenarnya adalah preferensi, bukan superioritas teknis. Pyodide lebih murah, lebih aman, dan cukup untuk kebutuhan ini.

## Konsekuensi

- Situs tidak lagi bisa di-deploy sebagai hosting statis. Butuh mesin yang menjalankan proses.
- Backend menerima dan mengeksekusi kode arbitrary. Kalau situs ini publik, ini lubang keamanan serius. Lihat ADR-0002.
- Menjalankan kode di container di Windows menuntut WSL2 + Docker.
- Menambah satu sistem yang harus hidup supaya Soal Kode berfungsi. Kalau backend mati, fitur itu mati.
- Butuh timeout wajib. Tanpa itu, satu infinite loop menggantung proses backend.

## Alternatif yang ditolak

**Pyodide (WASM di browser).** Ditolak, walaupun ini yang direkomendasikan riset. Ukurannya ~11,6 MB pada pemuatan pertama (ter-cache setelahnya), dan ia menjalankan kode di dalam sandbox browser sehingga tidak ada risiko eksekusi di mesin sendiri.

Alasan penolakan dicatat di sini karena alternatif ini akan disarankan lagi oleh siapa pun yang membaca kode ini. Tanpa catatan ini, penghapusan backend akan terlihat seperti perbaikan yang jelas.
