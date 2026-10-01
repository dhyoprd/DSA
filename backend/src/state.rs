//! State bersama yang dipakai seluruh handler.
//!
//! Satu struct kecil yang diklon ke setiap permintaan. `SqlitePool` sudah berupa
//! handle yang aman dibagi dan murah diklon, dan `String` token juga murah.

use sqlx::SqlitePool;

/// State aplikasi: token yang diharapkan, dan pool koneksi database.
#[derive(Clone)]
pub struct AppState {
    /// Token yang harus dibawa setiap permintaan ke endpoint terlindungi.
    pub api_token: String,
    /// Pool koneksi SQLite. Dipegang sebagai pool, bukan koneksi tunggal, supaya
    /// beberapa permintaan bisa dilayani bersamaan.
    pub pool: SqlitePool,
}

impl AppState {
    /// Susun state dari konfigurasi dan pool yang sudah dibuka.
    pub fn baru(api_token: String, pool: SqlitePool) -> Self {
        Self { api_token, pool }
    }
}
