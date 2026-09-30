# Autentikasi satu token, tanpa sistem akun pengguna

## Status

accepted

## Konteks

Situs dipublikasikan, dan backend menyimpan Catatan serta Progres yang bersifat pribadi. Tanpa pembatas, siapa pun yang menemukan URL bisa membaca catatan pribadi atau menghapus Progres dengan satu permintaan HTTP.

## Keputusan

Backend memerlukan satu token rahasia yang dikirim frontend di setiap permintaan. Tidak ada tabel pengguna, tidak ada halaman login, tidak ada kata sandi.

## Alasan

Situs ini punya tepat satu pengguna. Sistem akun lengkap — hashing kata sandi, manajemen sesi, reset kata sandi — adalah proyek tersendiri yang tidak menyelesaikan masalah apa pun yang dimiliki situs ini. Satu token menutup akses publik dengan biaya paling kecil.

## Konsekuensi

- Token hidup di variabel lingkungan frontend, sehingga bisa dibaca siapa pun yang membuka DevTools di browser. Ini melindungi dari orang asing yang menemukan URL, bukan dari pengguna yang sudah punya akses ke browser itu sendiri. Batas ini diterima secara sadar.
- Tidak ada cara mencabut akses selain mengganti token dan men-deploy ulang.
- Kalau nanti ada pengguna kedua, keputusan ini harus digantikan sistem akun sungguhan.
- Tidak ada rate limit per pengguna, jadi pembatasan laju harus dilakukan per IP.

## Alternatif yang ditolak

**Login email dan kata sandi.** Lebih aman dan siap untuk pengguna lain. Ditolak karena biayanya tidak sebanding untuk situs satu pengguna.

**Tanpa autentikasi.** Paling sederhana. Ditolak karena Catatan adalah tulisan tangan pengguna dan tidak bisa dipulihkan kalau terhapus.
