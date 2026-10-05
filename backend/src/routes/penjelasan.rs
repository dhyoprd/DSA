//! Endpoint Kotak Penjelasan.
//!
//! Dua endpoint: membaca tulisan sebuah Soal, dan menyimpannya. Keduanya terlindungi
//! token — pemasangannya di `routes::router`, bukan di sini, supaya modul ini hanya
//! mengurus bentuk permintaan dan balasan.
//!
//! **Kenapa `PUT`, bukan `POST`.** Permintaannya mengganti **seluruh** isi satu kotak
//! yang alamatnya sudah pasti (`/api/penjelasan/{slug}/{indeks}`). Itu persis arti
//! `PUT`: idempoten — mengirim tulisan yang sama dua kali menghasilkan keadaan yang
//! sama. `POST` menyiratkan "tambahkan sesuatu yang baru", dan menyimpan ulang tulisan
//! yang sama bukan penambahan.
//!
//! **Batas ukuran badan tidak dipasang di sini.** `axum` sudah membatasi badan
//! permintaan pada 2 MB (`axum_core::extract::DEFAULT_LIMIT`), dan itu jauh lebih
//! besar daripada tulisan yang wajar untuk satu Kotak Penjelasan. Batas tambahan
//! berarti angka yang harus dipilih dan dirawat tanpa kebutuhan yang jelas.

use axum::extract::{Path, State};
use axum::routing::get;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::galat::Galat;
use crate::state::AppState;
use crate::store::penjelasan::{self, Penjelasan};

/// Badan permintaan `PUT /api/penjelasan/:slug/:indeks`.
#[derive(Debug, Deserialize)]
pub struct Tulisan {
    /// Seluruh isi kotak. Boleh string kosong — itu cara mengosongkan kotaknya.
    pub isi: String,
}

/// Satu Kotak Penjelasan dalam balasan.
///
/// `diperbarui` `null` berarti Soal ini belum pernah ditulis. Bentuknya sengaja sama
/// untuk Soal yang sudah ditulis maupun belum, sehingga antarmuka hanya punya satu
/// bentuk untuk ditangani.
#[derive(Debug, Serialize)]
pub struct BarisPenjelasan {
    pub topik_slug: String,
    pub soal_indeks: i64,
    pub isi: String,
    /// Waktu penyimpanan terakhir, atau `null` kalau belum pernah ditulis.
    pub diperbarui: Option<String>,
}

impl BarisPenjelasan {
    /// Kotak yang belum pernah ditulis: kosong, tanpa waktu.
    fn kosong(topik_slug: &str, soal_indeks: i64) -> Self {
        BarisPenjelasan {
            topik_slug: topik_slug.to_string(),
            soal_indeks,
            isi: String::new(),
            diperbarui: None,
        }
    }
}

impl From<Penjelasan> for BarisPenjelasan {
    fn from(p: Penjelasan) -> Self {
        BarisPenjelasan {
            topik_slug: p.topik_slug,
            soal_indeks: p.soal_indeks,
            isi: p.isi,
            diperbarui: Some(p.diperbarui),
        }
    }
}

/// Kumpulan route yang dimiliki modul ini.
pub fn routes() -> Router<AppState> {
    Router::new().route(
        "/api/penjelasan/{slug}/{indeks}",
        get(baca).put(simpan),
    )
}

/// `GET /api/penjelasan/:slug/:indeks` — tulisan Kotak Penjelasan sebuah Soal.
///
/// Kotak yang belum pernah ditulis dibalas `200` dengan isi kosong, **bukan** `404`.
/// "Belum pernah menulis" adalah keadaan normal setiap Soal, bukan alamat yang salah;
/// membalas `404` akan memaksa antarmuka memperlakukan keadaan biasa sebagai galat,
/// dan menampilkan pesan gagal kepada pemelajar yang hanya belum menulis apa-apa.
async fn baca(
    State(state): State<AppState>,
    Path((slug, indeks)): Path<(String, i64)>,
) -> Result<Json<BarisPenjelasan>, Galat> {
    let baris = penjelasan::ambil(&state.pool, &slug, indeks).await?;
    Ok(Json(match baris {
        Some(p) => BarisPenjelasan::from(p),
        None => BarisPenjelasan::kosong(&slug, indeks),
    }))
}

/// `PUT /api/penjelasan/:slug/:indeks` — simpan tulisan Kotak Penjelasan.
///
/// Mengembalikan keadaan baris setelah perubahan, bukan sekadar "berhasil", supaya
/// antarmuka bisa menampilkan waktu penyimpanan yang sebenarnya tanpa permintaan
/// kedua — pola yang sama dengan endpoint Progres.
///
/// `indeks` diambil sebagai `i64` supaya indeks yang bukan angka ditolak `axum`
/// dengan `400` sebelum sampai ke database.
async fn simpan(
    State(state): State<AppState>,
    Path((slug, indeks)): Path<(String, i64)>,
    Json(tulisan): Json<Tulisan>,
) -> Result<Json<BarisPenjelasan>, Galat> {
    let baris = penjelasan::simpan(&state.pool, &slug, indeks, &tulisan.isi).await?;
    Ok(Json(BarisPenjelasan::from(baris)))
}
