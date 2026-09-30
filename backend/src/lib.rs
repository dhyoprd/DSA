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
//! - `AppState` — apa yang dibagi ke seluruh handler (saat ini kosong; diisi oleh
//!   ticket token/Progres, bukan sekarang).

pub mod config;
pub mod routes;

/// Keadaan yang dibagi ke seluruh handler.
///
/// Belum membawa apa pun. Ticket Backend: token + Progres yang akan menambahkan
/// pool koneksi database di sini, lewat `with_state`, tanpa mengubah modul route.
#[derive(Clone, Default)]
pub struct AppState;

/// Bangun aplikasi lengkap dari sebuah state.
///
/// Fungsi ini murni: tidak membaca environment, tidak membuka socket.
/// Itu yang membuatnya bisa diuji tanpa menjalankan server.
pub fn app(state: AppState) -> axum::Router {
    routes::router()
        .with_state(state)
        .layer(tower_http::trace::TraceLayer::new_for_http())
}
