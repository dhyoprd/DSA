//! Titik masuk proses backend.
//!
//! Hanya menangani siklus hidup: baca konfigurasi, siapkan logging, buka database,
//! rakit mesin Eksekusi Kode, bind, sajikan. Seluruh bentuk aplikasi ada di `lib.rs`.

use std::sync::Arc;

use dsa_backend::eksekusi::{Image, PenjalanDocker};
use dsa_backend::{app, config::Config, db, AppState};

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

    // Berhenti sebelum bind kalau tokennya belum diisi. Alasannya ada di `Config::periksa`.
    config.periksa();

    let pool = db::buka(&config.database_path)
        .await
        .unwrap_or_else(|pesan| panic!("{pesan}"));

    tracing::info!(path = %config.database_path.display(), "database siap");

    // Penjalan sungguhan: satu kontainer sekali pakai per eksekusi. Image-nya dibaca
    // dari konfigurasi supaya versinya bisa dinaikkan tanpa menyentuh kode.
    let penjalan = Arc::new(PenjalanDocker::baru(Image(config.runner_image.clone())));
    tracing::info!(image = %config.runner_image, "mesin Eksekusi Kode siap");

    let state = AppState::dengan_penjalan(config.api_token.clone(), pool, penjalan);

    let listener = tokio::net::TcpListener::bind(config.addr)
        .await
        .unwrap_or_else(|error| panic!("gagal bind ke {}: {error}", config.addr));

    tracing::info!(addr = %config.addr, "backend siap menerima permintaan");

    axum::serve(listener, app(state))
        .await
        .expect("server berhenti dengan error");
}
