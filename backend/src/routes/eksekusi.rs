//! Endpoint Eksekusi Kode.
//!
//! Satu endpoint: `POST /api/eksekusi`. Terlindungi token — pemasangannya di
//! `routes::router`, bukan di sini, supaya modul ini hanya mengurus bentuk permintaan
//! dan balasan.
//!
//! **Kenapa `POST`, bukan `PUT`.** Berbeda dari Catatan dan Kotak Penjelasan, di sini
//! tidak ada sumber daya beralamat pasti yang diganti: setiap panggilan menjalankan
//! kode, memakai waktu CPU, dan menambah jejak batas laju. Itu bukan idempoten, dan
//! `POST` adalah metode yang jujur untuknya.
//!
//! **Kenapa hasilnya `200`, bukan `201`.** Tidak ada yang dibuat. Balasannya adalah
//! hasil penilaian, dan itu isi dari permintaan itu sendiri.
//!
//! **Kenapa galat pemelajar tetap `200`.** Kode yang gagal sintaks atau lewat batas
//! waktu bukan kegagalan **permintaan** — permintaannya berhasil, dan jawabannya
//! adalah "kodenya gagal, ini sebabnya". Yang dibalas bukan-`200` hanya permintaan
//! yang ditolak sebelum dijalankan (kode kosong, terlalu panjang, batas laju), karena
//! di sana tidak ada hasil untuk dilaporkan.

use axum::extract::State;
use axum::routing::post;
use axum::{Json, Router};

use crate::eksekusi::{hasil::Hasil, Permintaan};
use crate::galat::Galat;
use crate::state::AppState;

/// Kumpulan route yang dimiliki modul ini.
pub fn routes() -> Router<AppState> {
    Router::new().route("/api/eksekusi", post(jalankan))
}

/// `POST /api/eksekusi` — jalankan kode pemelajar terhadap test case Soal ini.
///
/// Badan permintaan adalah [`Permintaan`]; bentuk balasannya [`Hasil`]. Keduanya
/// di-serialisasi apa adanya, sehingga menambah field di salah satunya tidak menuntut
/// perubahan di sini.
async fn jalankan(
    State(state): State<AppState>,
    Json(permintaan): Json<Permintaan>,
) -> Result<Json<Hasil>, Galat> {
    let hasil = state.mesin.jalankan(&permintaan).await?;
    Ok(Json(hasil))
}
