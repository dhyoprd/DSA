//! Pustaka backend Situs belajar DSA.
//!
//! Modul ini sengaja memisahkan *perakitan aplikasi* dari *siklus hidup proses*.
//! `app()` membangun `Router` murni tanpa menyentuh jaringan, sehingga bisa diuji
//! langsung lewat `tower::ServiceExt::oneshot` tanpa membuka port. `main.rs` yang
//! mengurus binding dan shutdown.
//!
//! Batas tanggung jawab:
//! - `config` — cara konfigurasi dibaca dari environment.
//! - `routes` — endpoint apa saja yang ada dan apa balasannya.

pub mod config;
pub mod routes;

/// Bangun aplikasi lengkap.
///
/// Fungsi ini murni: tidak membaca environment, tidak membuka socket.
/// Itu yang membuatnya bisa diuji tanpa menjalankan server.
///
/// Belum ada state yang dibagi. Ticket Backend: token + Progres menambahkan
/// pool koneksi database, dan saat itu `app()` menerima parameter state dan
/// memanggil `.with_state(...)` di sini.
pub fn app() -> axum::Router {
    routes::router().layer(tower_http::trace::TraceLayer::new_for_http())
}
