# Token diketik sekali di antarmuka dan disimpan di browser, bukan dibakar saat build

## Status

accepted

## Konteks

ADR-0006 menetapkan satu token rahasia sebagai satu-satunya autentikasi. Yang belum
diputuskan adalah **bagaimana token itu sampai ke backend dari antarmuka**. Issue #1
sudah menetapkan dua hal dan keduanya tidak boleh didesain ulang: nama header adalah
`Authorization`, dan token yang salah atau tidak ada dibalas `401`.

Tiga jalan tersedia: token dibakar ke bundle frontend lewat variabel lingkungan
saat build, token diketik sekali pengguna lalu disimpan di browser, atau token
disembunyikan di server Next dan tidak pernah sampai ke browser (proxy).

## Keputusan

Pengguna **mengetik token sekali** di antarmuka. Token disimpan di `localStorage`
browser dan dikirim sebagai header `Authorization` pada setiap permintaan ke
backend.

## Alasan

**Ia menutup ancaman yang sebenarnya.** Situs ini publik. Ancaman nyatanya bukan
"pemilik membuka DevTools", melainkan "orang asing menemukan URL". Dengan token
diketik sekali, pengunjung asing tidak pernah melihat token sama sekali — ia bahkan
tidak tahu token itu ada. Sebaliknya, token yang dibakar saat build ikut terkirim
ke **setiap** pengunjung di dalam bundel JavaScript, dan bisa dibaca siapa pun yang
membuka DevTools di situs publik itu.

**Ia cocok dengan user story 61** ("memasukkan token sekali saja") dan dengan
kriteria penerimaan ticket #7 ("Token dimasukkan sekali di antarmuka"). Keduanya
sudah ditulis sebelum keputusan ini, jadi keduanya memang mengharapkan bentuk ini.

**Ia tidak menambah lapisan yang bisa gagal.** Proxy di server Next berarti setiap
panggilan backend harus lewat Route Handler; satu lapisan lagi antara browser dan
backend yang bisa mati sendiri. Untuk satu token dan satu pengguna, lapisan itu
tidak membeli apa pun yang belum didapat dari pilihan ini.

## Konsekuensi

- **Token harus diketik sekali per browser.** Di laptop dan HP, itu dua kali. Itu
  batas yang diterima sadar, dan jauh lebih ringan daripada mengetiknya setiap
  permintaan.
- **Token tetap ada di browser, jadi batas keamanannya tidak berubah dari
  ADR-0006.** Siapa pun yang punya akses ke browser itu — atau yang bisa menjalankan
  skrip di halaman itu — bisa membacanya. Yang berubah hanyalah siapa yang bisa
  membacanya: bukan lagi setiap pengunjung, melainkan hanya pemilik perangkat.
- **`localStorage` dipilih, bukan cookie.** Cookie akan ikut terkirim otomatis dan
  membuka permukaan CSRF; `localStorage` memaksa kode mengirim header secara
  eksplisit, dan itu justru yang diinginkan di sini.
- **Menghapus data browser menghapus token**, dan pengguna harus mengetiknya lagi.
  Ini tidak berlaku untuk Progres dan Catatan, yang hidup di backend (justru itu
  alasan Progres tidak disimpan di localStorage).
- **Antarmuka perlu satu tempat untuk menyimpan dan membaca token** — satu modul,
  bukan pembacaan `localStorage` yang tersebar.
- **Token salah menghasilkan `401`, dan antarmuka harus menanganinya dengan
  jelas** — menampilkan bahwa tokennya tidak diterima, bukan gagal diam-diam.

## Hubungan dengan ADR-0006 — kontradiksi yang ditandai

ADR-0006, bagian Konsekuensi, menyatakan:

> "Token hidup di variabel lingkungan frontend, sehingga bisa dibaca siapa pun yang
> membuka DevTools di browser."

Keputusan di ADR ini **menggantikan konsekuensi itu**, bukan menambah di sampingnya.
Token tidak lagi hidup di variabel lingkungan frontend, sehingga tidak lagi terbaca
oleh setiap pengunjung. Sisa keputusan ADR-0006 — satu token, tanpa akun, tanpa
halaman login, dan batas bahwa akses ke browser berarti akses ke token — tetap
berlaku.

## Alternatif yang ditolak

**Variabel lingkungan frontend (`NEXT_PUBLIC_API_TOKEN`).** Paling nyaman: tidak
perlu mengetik apa pun, dan bekerja di semua browser. Ditolak karena token ikut
terkirim ke setiap pengunjung situs publik di dalam bundel. Untuk situs yang isinya
Catatan pribadi, ini menyerahkan kuncinya ke orang yang menemukan pintunya.

**Proxy di server Next (Route Handler).** Paling aman: token hanya hidup di server,
tidak pernah sampai ke browser. Ditolak karena menambah satu lapisan untuk setiap
endpoint, dan lapisan itu harus dirawat serta bisa gagal sendiri. Manfaat
keamanannya nyata tetapi tidak sebanding dengan kerumitannya untuk satu pengguna.

## Sumber

- ADR-0006 (`docs/adr/0006-autentikasi-satu-token.md`) — keputusan satu token, dan
  konsekuensi "token di variabel lingkungan frontend" yang digantikan di sini.
- Issue #1, "Kontrak API backend" — header `Authorization`, semantik `401`.
- Issue #7, kriteria penerimaan — "Token dimasukkan sekali di antarmuka".
- Issue #1, user story 61 — "memasukkan token sekali saja".
