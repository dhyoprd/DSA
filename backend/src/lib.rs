//! Pustaka backend Situs belajar DSA.
//!
//! Modul ini sengaja memisahkan *perakitan aplikasi* dari *siklus hidup proses*.
//! `app()` membangun `Router` murni tanpa menyentuh jaringan, sehingga bisa diuji
//! langsung lewat `tower::ServiceExt::oneshot` tanpa membuka port. `main.rs` yang
//! mengurus binding dan shutdown.
//!
//! Batas tanggung jawab:
//! - `config` — cara konfigurasi dibaca dari environment.
//! - `state` — apa yang dibagi ke seluruh handler.
//! - `db` — cara pool koneksi dibuka dan dimigrasi.
//! - `auth` — bagaimana token diperiksa.
//! - `galat` — bagaimana galat menjadi balasan HTTP.
//! - `store` — bagaimana data dibaca dan ditulis.
//! - `routes` — endpoint apa saja yang ada dan apa balasannya.

pub mod auth;
pub mod config;
pub mod db;
pub mod galat;
pub mod routes;
pub mod state;
pub mod store;

pub use state::AppState;

/// Bangun aplikasi lengkap dari state yang sudah disiapkan.
///
/// Fungsi ini tidak membaca environment dan tidak membuka socket — state diserahkan
/// pemanggil. Itu yang membuatnya bisa diuji tanpa menjalankan server: uji cukup
/// menyiapkan `AppState` dengan database sementara, lalu memanggil `app()`.
///
/// Pembukaan database sengaja **tidak** dilakukan di sini: `app()` tetap sinkron dan
/// murni, sedangkan membuka pool adalah operasi async yang bisa gagal. Pemisahan itu
/// menjaga fungsi ini bebas dari I/O.
pub fn app(state: AppState) -> axum::Router {
    routes::router(state).layer(tower_http::trace::TraceLayer::new_for_http())
}
