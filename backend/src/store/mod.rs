//! Akses data ke database.
//!
//! Berisi modul per hal yang disimpan. Setiap modul di sini adalah satu-satunya
//! tempat yang tahu bentuk tabelnya; handler HTTP tidak menulis SQL sendiri.
//!
//! Ticket #8 menambahkan `penjelasan`, #11 menambahkan `catatan` — masing-masing
//! sebagai modul baru di sini, bukan dengan menyunting `progres`.

pub mod catatan;
pub mod penjelasan;
pub mod progres;
