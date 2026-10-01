//! Galat yang bisa dikembalikan handler sebagai balasan HTTP.
//!
//! Handler tidak boleh membocorkan detail database ke antarmuka: pesan `sqlx`
//! memuat nama tabel dan potongan query, yang tidak berguna bagi pemelajar dan
//! berlebihan untuk situs publik. Karena itu galat aslinya **dicatat ke log**, dan
//! yang dikirim ke antarmuka hanyalah bentuk yang seragam.

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;

/// Galat internal backend.
#[derive(Debug)]
pub enum Galat {
    /// Database tidak bisa dibaca atau ditulis.
    Database(sqlx::Error),
}

impl From<sqlx::Error> for Galat {
    fn from(error: sqlx::Error) -> Self {
        Galat::Database(error)
    }
}

impl IntoResponse for Galat {
    fn into_response(self) -> Response {
        // Dicatat lengkap di sini; yang dikirim ke antarmuka hanya ringkasannya.
        match &self {
            Galat::Database(error) => {
                tracing::error!(error = %error, "permintaan gagal karena masalah database");
            }
        }

        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "galat": "masalah internal backend" })),
        )
            .into_response()
    }
}
