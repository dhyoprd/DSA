//! Perakitan route.
//!
//! Setiap endpoint hidup di modulnya sendiri; modul ini hanya menggabungkannya.
//! Menambah endpoint baru berarti menambah modul dan satu baris `merge` di sini,
//! bukan menyunting modul endpoint yang sudah ada.

pub mod health;

use axum::Router;

/// Bangun seluruh route aplikasi.
pub fn router() -> Router {
    Router::new().merge(health::routes())
}
