//! Galat yang bisa dikembalikan handler sebagai balasan HTTP.
//!
//! Handler tidak boleh membocorkan detail database ke antarmuka: pesan `sqlx`
//! memuat nama tabel dan potongan query, yang tidak berguna bagi pemelajar dan
//! berlebihan untuk situs publik. Karena itu galat aslinya **dicatat ke log**, dan
//! yang dikirim ke antarmuka hanyalah bentuk yang seragam.
//!
//! **Pengecualian: [`Galat::Pelanggaran`].** Pesannya memang **harus** sampai ke
//! pemelajar — "kode terlalu panjang: 20000 byte, batasnya 16384 byte" adalah
//! informasi yang ia butuhkan untuk memperbaiki kirimannya. Karena itu varian ini
//! diteruskan apa adanya, bukan diganti pesan seragam. Ia juga bukan kesalahan
//! internal: permintaannya ditolak karena aturan, dan status HTTP-nya mencerminkan
//! itu.

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;

use crate::eksekusi::Pelanggaran;

/// Galat internal backend.
#[derive(Debug)]
pub enum Galat {
    /// Database tidak bisa dibaca atau ditulis.
    Database(sqlx::Error),
    /// Permintaan ditolak sebelum dijalankan, karena melanggar batas.
    Pelanggaran(Pelanggaran),
}

impl From<sqlx::Error> for Galat {
    fn from(error: sqlx::Error) -> Self {
        Galat::Database(error)
    }
}

impl From<Pelanggaran> for Galat {
    fn from(pelanggaran: Pelanggaran) -> Self {
        Galat::Pelanggaran(pelanggaran)
    }
}

impl IntoResponse for Galat {
    fn into_response(self) -> Response {
        match self {
            Galat::Database(error) => {
                // Dicatat lengkap di sini; yang dikirim ke antarmuka hanya ringkasannya.
                tracing::error!(error = %error, "permintaan gagal karena masalah database");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({ "galat": "masalah internal backend" })),
                )
                    .into_response()
            }
            Galat::Pelanggaran(pelanggaran) => {
                // Batas laju adalah keadaan sementara yang jawabannya "coba lagi
                // nanti" — itu `429`. Pelanggaran lain (kode kosong, terlalu panjang,
                // terlalu banyak kasus) tidak akan berubah kalau dicoba lagi tanpa
                // mengubah kirimannya, jadi itu `400`.
                let status = match pelanggaran {
                    Pelanggaran::BatasLaju { .. } => StatusCode::TOO_MANY_REQUESTS,
                    _ => StatusCode::BAD_REQUEST,
                };
                // `jenis` dikirim bersama `galat`: antarmuka memakainya untuk memilih
                // kalimatnya sendiri dari kamus dua bahasa, dan jatuh ke `galat` kalau
                // jenisnya belum dikenal. Tanpa `jenis`, situs English akan
                // menampilkan pesan Indonesia.
                (
                    status,
                    Json(serde_json::json!({
                        "galat": pelanggaran.pesan(),
                        "jenis": pelanggaran.jenis(),
                    })),
                )
                    .into_response()
            }
        }
    }
}
