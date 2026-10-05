//! Endpoint Catatan.
//!
//! Dua endpoint: membaca Catatan sebuah Topik, dan menyimpannya. Keduanya
//! terlindungi token — pemasangannya di `routes::router`, bukan di sini, supaya
//! modul ini hanya mengurus bentuk permintaan dan balasan.
//!
//! **Kenapa `PUT`, bukan `POST`.** Sama dengan Kotak Penjelasan: permintaannya
//! mengganti **seluruh** isi satu Catatan yang alamatnya sudah pasti
//! (`/api/catatan/{slug}`). Itu persis arti `PUT` — idempoten. `POST` menyiratkan
//! "tambahkan sesuatu yang baru", dan menyimpan ulang tulisan yang sama bukan
//! penambahan.
//!
//! **Kenapa tidak ada endpoint unduh Markdown di sini.** Unduhan Markdown dibuat di
//! antarmuka, dari tulisan yang sedang ada di editor. Backend **tidak bisa** membuat
//! berkas Markdown yang baik sendirian: judul Topik hidup di `content/jalur.yaml`
//! (git), bukan di database, dan backend tidak membacanya (ADR-0003). Berkas yang
//! dihasilkan backend karena itu hanya berisi badan tulisan tanpa judul — kurang
//! berguna daripada yang bisa dibuat antarmuka, yang tahu judul Topiknya.
//!
//! **Batas ukuran badan tidak dipasang di sini.** `axum` sudah membatasi badan
//! permintaan pada 2 MB (`axum_core::extract::DEFAULT_LIMIT`), dan itu jauh lebih
//! besar daripada Catatan yang wajar untuk satu Topik.

use axum::extract::{Path, State};
use axum::routing::get;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::galat::Galat;
use crate::state::AppState;
use crate::store::catatan::{self, Catatan};

/// Badan permintaan `PUT /api/catatan/:slug`.
#[derive(Debug, Deserialize)]
pub struct Tulisan {
    /// Seluruh isi Catatan, Markdown. Boleh string kosong — itu cara mengosongkannya.
    pub isi: String,
}

/// Satu Catatan dalam balasan.
///
/// `diperbarui` `null` berarti Topik ini belum pernah ditulis. Bentuknya sengaja sama
/// untuk Topik yang sudah ditulis maupun belum, sehingga antarmuka hanya punya satu
/// bentuk untuk ditangani.
#[derive(Debug, Serialize)]
pub struct BarisCatatan {
    pub topik_slug: String,
    pub isi: String,
    /// Waktu penyimpanan terakhir, atau `null` kalau belum pernah ditulis.
    pub diperbarui: Option<String>,
}

impl BarisCatatan {
    /// Catatan yang belum pernah ditulis: kosong, tanpa waktu.
    fn kosong(topik_slug: &str) -> Self {
        BarisCatatan {
            topik_slug: topik_slug.to_string(),
            isi: String::new(),
            diperbarui: None,
        }
    }
}

impl From<Catatan> for BarisCatatan {
    fn from(c: Catatan) -> Self {
        BarisCatatan {
            topik_slug: c.topik_slug,
            isi: c.isi,
            diperbarui: Some(c.diperbarui),
        }
    }
}

/// Kumpulan route yang dimiliki modul ini.
pub fn routes() -> Router<AppState> {
    Router::new().route("/api/catatan/{slug}", get(baca).put(simpan))
}

/// `GET /api/catatan/:slug` — Catatan sebuah Topik.
///
/// Catatan yang belum pernah ditulis dibalas `200` dengan isi kosong, **bukan** `404`.
/// "Belum pernah menulis" adalah keadaan normal setiap Topik, bukan alamat yang salah;
/// membalas `404` akan memaksa antarmuka memperlakukan keadaan biasa sebagai galat,
/// dan menampilkan pesan gagal kepada pemelajar yang hanya belum menulis apa-apa.
async fn baca(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<Json<BarisCatatan>, Galat> {
    let baris = catatan::ambil(&state.pool, &slug).await?;
    Ok(Json(match baris {
        Some(c) => BarisCatatan::from(c),
        None => BarisCatatan::kosong(&slug),
    }))
}

/// `PUT /api/catatan/:slug` — simpan Catatan sebuah Topik.
///
/// Mengembalikan keadaan baris setelah perubahan, bukan sekadar "berhasil", supaya
/// antarmuka bisa menampilkan waktu penyimpanan yang sebenarnya tanpa permintaan
/// kedua — pola yang sama dengan endpoint Progres dan Kotak Penjelasan.
async fn simpan(
    State(state): State<AppState>,
    Path(slug): Path<String>,
    Json(tulisan): Json<Tulisan>,
) -> Result<Json<BarisCatatan>, Galat> {
    let baris = catatan::simpan(&state.pool, &slug, &tulisan.isi).await?;
    Ok(Json(BarisCatatan::from(baris)))
}
