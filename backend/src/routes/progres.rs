//! Endpoint Progres.
//!
//! Tiga endpoint: membaca seluruh Progres, mencatat satu jawaban, dan mengunduh
//! seluruh Progres sebagai berkas. Ketiganya terlindungi token — pemasangannya di
//! `routes::router`, bukan di sini, supaya modul ini hanya mengurus bentuk
//! permintaan dan balasan.

use axum::extract::{Path, State};
use axum::http::header;
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::galat::Galat;
use crate::state::AppState;
use crate::store::progres::{self, Progres, Status};

/// Badan permintaan `POST /api/progres/:slug/:indeks`.
#[derive(Debug, Deserialize)]
pub struct Jawaban {
    /// Apakah jawaban untuk Soal ini benar.
    pub benar: bool,
}

/// Satu baris Progres dalam balasan.
#[derive(Debug, Serialize)]
pub struct BarisProgres {
    pub topik_slug: String,
    pub soal_indeks: i64,
    pub percobaan: i64,
    /// Waktu jawaban benar terakhir, atau `null` kalau belum pernah benar.
    pub benar_terakhir: Option<String>,
    /// Turunan dari dua field di atas, dihitung oleh `store::progres::status_dari`.
    pub status: Status,
}

impl From<Progres> for BarisProgres {
    fn from(p: Progres) -> Self {
        BarisProgres {
            status: p.status(),
            topik_slug: p.topik_slug,
            soal_indeks: p.soal_indeks,
            percobaan: p.percobaan,
            benar_terakhir: p.benar_terakhir,
        }
    }
}

/// Balasan `GET /api/progres`.
#[derive(Debug, Serialize)]
pub struct DaftarProgres {
    pub progres: Vec<BarisProgres>,
}

/// Baca seluruh Progres dan bungkus sebagai balasan.
///
/// Dipakai oleh dua endpoint — daftar biasa dan unduhan — yang memang harus
/// mengembalikan isi yang sama. Satu tempat, supaya keduanya tidak bisa menyimpang.
async fn daftar(state: &AppState) -> Result<DaftarProgres, Galat> {
    let baris = progres::semua(&state.pool).await?;
    Ok(DaftarProgres {
        progres: baris.into_iter().map(BarisProgres::from).collect(),
    })
}

/// Kumpulan route yang dimiliki modul ini.
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/progres", get(baca_semua))
        .route("/api/progres/{slug}/{indeks}", post(catat))
        .route("/api/ekspor/progres", get(ekspor))
}

/// `GET /api/progres` — seluruh Progres.
async fn baca_semua(State(state): State<AppState>) -> Result<Json<DaftarProgres>, Galat> {
    Ok(Json(daftar(&state).await?))
}

/// `POST /api/progres/{slug}/{indeks}` — catat satu jawaban.
///
/// Mengembalikan keadaan baris setelah perubahan, bukan sekadar "berhasil", supaya
/// antarmuka bisa langsung memperbarui penandanya tanpa permintaan kedua.
///
/// `indeks` diambil sebagai `i64` supaya indeks yang bukan angka ditolak `axum`
/// dengan `400` sebelum sampai ke database.
async fn catat(
    State(state): State<AppState>,
    Path((slug, indeks)): Path<(String, i64)>,
    Json(jawaban): Json<Jawaban>,
) -> Result<Json<BarisProgres>, Galat> {
    let baris = progres::catat(&state.pool, &slug, indeks, jawaban.benar).await?;
    Ok(Json(BarisProgres::from(baris)))
}

/// `GET /api/ekspor/progres` — unduh seluruh Progres sebagai satu berkas JSON.
///
/// Kriteria penerimaan ticket #7 meminta "Progres bisa diunduh sebagai berkas", dan
/// user story 54 menginginkannya sebagai salinan sendiri kalau sesuatu terjadi pada
/// server. Itu juga jaring pengaman yang disebut ADR-0010: LiteFS melindungi dari
/// kegagalan host, tetapi tidak dari kesalahan pengguna.
///
/// **Batas dengan ticket #14.** Issue #1 menyebut satu endpoint "Ekspor —
/// mengembalikan seluruh Progres dan Catatan sebagai satu berkas unduhan". Endpoint
/// di sini **bukan** endpoint itu: ia hanya Progres, karena Catatan baru dibangun di
/// #11. Namanya sengaja menyebut resourcenya (`/ekspor/progres`) supaya ia tidak
/// mengklaim kontrak gabungan itu. Ticket #14 yang memiliki endpoint Ekspor
/// sesungguhnya dan harus memutuskan apakah yang ini diserap ke dalamnya atau tetap
/// terpisah.
///
/// Bentuk isinya sama dengan `GET /api/progres`, sehingga satu modul di antarmuka
/// bisa membaca keduanya. Yang membedakan hanya header `Content-Disposition`, yang
/// membuat browser mengunduhnya alih-alih menampilkannya.
async fn ekspor(State(state): State<AppState>) -> Result<impl IntoResponse, Galat> {
    let isi = serde_json::to_string_pretty(&daftar(&state).await?)
        // Serialisasi struct ini tidak bisa gagal: seluruh fieldnya tipe sederhana
        // tanpa peta dengan kunci non-teks. Kalau ini sampai gagal, itu bug
        // programmer, bukan keadaan runtime — jadi `expect` dengan pesan jelas lebih
        // jujur daripada mengembalikan 500 yang menyamarkan bug sebagai masalah
        // database.
        .expect("DaftarProgres selalu bisa diserialisasi");

    Ok((
        [
            (header::CONTENT_TYPE, "application/json; charset=utf-8".to_string()),
            (
                header::CONTENT_DISPOSITION,
                "attachment; filename=\"progres.json\"".to_string(),
            ),
        ],
        isi,
    ))
}
