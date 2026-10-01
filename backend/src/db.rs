//! Pembukaan database dan penjalanan migrasi.
//!
//! Modul ini hanya tahu satu hal: bagaimana mendapat `SqlitePool` yang siap dipakai
//! dari sebuah path. Ia tidak tahu tabel apa yang ada di dalamnya — itu urusan
//! berkas di `backend/migrations/`.
//!
//! Mesinnya SQLite di sebuah berkas; alasannya di
//! `docs/adr/0010-sqlite-litefs-sebagai-mesin-database.md`.

use std::path::Path;

use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;

/// Buka (dan buat kalau belum ada) database di `path`, lalu jalankan migrasi.
///
/// Migrasi ditanam ke dalam binary oleh `sqlx::migrate!`, jadi tidak ada langkah
/// terpisah yang bisa terlupa saat men-deploy — pola yang sama dengan gerbang
/// validasi Materi yang dipanggil dari `next.config.ts`.
///
/// **Mengubah berkas migrasi yang sudah pernah dijalankan akan menggagalkan startup.**
/// SQLx menyimpan checksum setiap migrasi yang sudah diterapkan, dan menolak jalan
/// kalau isinya berubah — bahkan kalau yang berubah hanya komentar. Pesannya
/// `migration N was previously applied but has been modified`. Perbaikannya:
/// tambahkan berkas migrasi **baru**, jangan menyunting yang lama. Untuk database
/// pengembangan yang isinya boleh hilang, hapus berkas `.db`-nya lalu jalankan lagi.
///
/// Mengembalikan galat sebagai `String` supaya pemanggil di `main.rs` bisa
/// menghentikan proses dengan pesan yang berguna, bukan `panic!` di dalam pustaka.
pub async fn buka(path: &Path) -> Result<SqlitePool, String> {
    // `create_if_missing` wajib: tanpa itu SQLite menolak membuka berkas yang belum
    // ada, dan menjalankan backend di mesin baru akan gagal sebelum migrasi sempat
    // membuat tabelnya.
    //
    // `journal_mode` sengaja **tidak** disetel. SQLx memang tidak menyetelnya secara
    // bawaan, dengan alasan yang berlaku persis di sini: menyetelnya bisa mengubah
    // mode sebuah database yang sudah ada, dan perubahan itu butuh kunci eksklusif
    // sehingga bisa gagal dengan `database is locked` kalau ada koneksi lain. Di
    // bawah LiteFS mode jurnal juga urusan si replikator, bukan urusan backend
    // (ADR-0010). Beban tulis situs ini satu orang, jadi mode bawaan sudah cukup.
    //
    // `busy_timeout` tidak disetel karena bawaannya sudah 5 detik — cukup untuk
    // antrean tulis dari pool, dan ada uji yang menjaganya.
    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .map_err(|error| format!("gagal membuka database di {}: {error}", path.display()))?;

    sqlx::migrate!()
        .run(&pool)
        .await
        .map_err(|error| format!("migrasi database gagal: {error}"))?;

    Ok(pool)
}
