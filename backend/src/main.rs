//! Titik masuk proses backend.
//!
//! Hanya menangani siklus hidup: baca konfigurasi, siapkan logging, bind, sajikan.
//! Seluruh bentuk aplikasi ada di `lib.rs`.

use dsa_backend::{app, config::Config};

#[tokio::main]
async fn main() {
    // `RUST_LOG` mengatur tingkat logging; bawaan `info` untuk crate ini.
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "dsa_backend=info,tower_http=info".into()),
        )
        .init();

    let config = Config::from_env();

    let listener = tokio::net::TcpListener::bind(config.addr)
        .await
        .unwrap_or_else(|error| panic!("gagal bind ke {}: {error}", config.addr));

    tracing::info!(addr = %config.addr, "backend siap menerima permintaan");

    axum::serve(listener, app())
        .await
        .expect("server berhenti dengan error");
}
