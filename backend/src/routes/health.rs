//! Endpoint kesehatan backend.
//!
//! Dipakai antarmuka untuk membuktikan bahwa frontend dan backend bisa saling bicara.
//! Endpoint ini sengaja tidak butuh token: ia tidak membaca atau mengubah data apa pun.

use axum::{routing::get, Json, Router};
use serde::Serialize;

use crate::state::AppState;

/// Bentuk balasan `GET /api/health`.
#[derive(Debug, Serialize)]
pub struct HealthResponse {
    /// Selalu `"ok"` kalau server hidup.
    pub status: &'static str,
    /// Nama layanan, supaya jelas siapa yang menjawab.
    pub service: &'static str,
}

/// Kumpulan route yang dimiliki modul ini.
///
/// Tipe `Router<AppState>` ditulis walaupun handler ini tidak memakai state: semua
/// route harus memakai tipe state yang sama agar bisa digabung di `routes::router`.
/// Handler-nya sendiri tetap tidak menerima `State`, jadi tidak ada ketergantungan
/// yang muncul hanya karena anotasi ini.
pub fn routes() -> Router<AppState> {
    Router::new().route("/api/health", get(health))
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "dsa-backend",
    })
}
