//! State bersama yang dipakai seluruh handler.
//!
//! Satu struct kecil yang diklon ke setiap permintaan. `SqlitePool` sudah berupa
//! handle yang aman dibagi dan murah diklon, `String` token juga murah, dan [`Mesin`]
//! dipegang lewat `Arc` sehingga pengklonannya hanya menambah hitungan.

use std::sync::Arc;

use sqlx::SqlitePool;

use crate::eksekusi::{jalan::Penjalan, Mesin};

/// State aplikasi: token yang diharapkan, pool koneksi, dan mesin Eksekusi Kode.
#[derive(Clone)]
pub struct AppState {
    /// Token yang harus dibawa setiap permintaan ke endpoint terlindungi.
    pub api_token: String,
    /// Pool koneksi SQLite. Dipegang sebagai pool, bukan koneksi tunggal, supaya
    /// beberapa permintaan bisa dilayani bersamaan.
    pub pool: SqlitePool,
    /// Mesin Eksekusi Kode. Dipegang bersama seluruh permintaan karena pembatas
    /// lajunya memang harus satu: batas per proses hanya bermakna kalau seluruh
    /// permintaan melihat jejak yang sama.
    pub mesin: Arc<Mesin>,
}

impl AppState {
    /// Susun state dengan mesin Eksekusi Kode dari penjalan yang diberikan.
    ///
    /// `penjalan` diserahkan, bukan dibuat di dalam: produksi memakai
    /// [`crate::eksekusi::PenjalanDocker`], sedangkan uji route memakai
    /// [`crate::eksekusi::PenjalanPalsu`] supaya kontrak HTTP-nya bisa diperiksa tanpa
    /// menjalankan Docker.
    pub fn dengan_penjalan(
        api_token: String,
        pool: SqlitePool,
        penjalan: Arc<dyn Penjalan>,
    ) -> Self {
        Self {
            api_token,
            pool,
            mesin: Arc::new(Mesin::baru(penjalan)),
        }
    }
}
