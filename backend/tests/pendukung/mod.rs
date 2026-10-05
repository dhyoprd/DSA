//! Perkakas bersama untuk uji integrasi.
//!
//! Setiap uji mendapat database **berkas sementara** sendiri, sehingga uji tidak
//! saling mempengaruhi dan tidak meninggalkan berkas di repo. Bentuk database-nya
//! sama dengan produksi karena migrasi yang sama dijalankan — yang berbeda hanya
//! tempatnya, bukan skemanya.
//!
//! Berkas, bukan `:memory:`, karena pool membuka beberapa koneksi dan setiap
//! koneksi ke `:memory:` mendapat database yang berbeda. Berkas menghindari
//! kejutan itu tanpa perlu trik shared-cache.

// Setiap berkas di `tests/` adalah crate uji tersendiri, dan masing-masing hanya
// memakai sebagian perkakas di sini. Tanpa `allow`, sisa yang tidak dipakai crate
// itu dilaporkan sebagai dead code — padahal ia dipakai crate uji yang lain.
#![allow(dead_code)]

use std::sync::atomic::{AtomicU64, Ordering};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::Router;
use dsa_backend::db;
use dsa_backend::{app, AppState};
use tower::ServiceExt;

/// Token yang dipakai uji. Nilainya tidak penting, yang penting cocok.
pub const TOKEN: &str = "token-uji-yang-panjang";

/// Penghitung untuk memberi setiap uji nama berkas yang unik.
///
/// Nomor urut dipakai, bukan id thread: thread bisa dipakai ulang setelah uji
/// sebelumnya selesai, sehingga nama berbasis thread bisa bertabrakan dan uji
/// berikutnya mewarisi data uji sebelumnya.
static URUTAN: AtomicU64 = AtomicU64::new(0);

/// Aplikasi yang siap diuji, lengkap dengan database sementara.
pub struct AplikasiUji {
    router: Router,
    /// Berkas database uji, dihapus saat struct ini dibuang.
    berkas: std::path::PathBuf,
}

impl Drop for AplikasiUji {
    fn drop(&mut self) {
        // Diabaikan kalau gagal: uji sudah selesai, dan berkas sisa di direktori
        // sementara sistem tidak merusak apa pun.
        let _ = std::fs::remove_file(&self.berkas);
    }
}

impl AplikasiUji {
    /// Siapkan database sementara, jalankan migrasi, lalu rakit aplikasinya.
    pub async fn baru() -> Self {
        let urutan = URUTAN.fetch_add(1, Ordering::Relaxed);
        let berkas = std::env::temp_dir().join(format!(
            "dsa-uji-{}-{urutan}.db",
            std::process::id()
        ));

        let pool = db::buka(&berkas)
            .await
            .expect("database uji harus bisa dibuka");

        let state = AppState::baru(TOKEN.to_string(), pool);

        AplikasiUji {
            router: app(state),
            berkas,
        }
    }

    /// Router-nya, untuk di-`oneshot` oleh uji.
    pub fn app(&self) -> Router {
        self.router.clone()
    }

    /// Berkas database uji, untuk uji yang perlu membukanya ulang.
    pub fn berkas(&self) -> &std::path::Path {
        &self.berkas
    }

    /// Kirim satu permintaan dengan token yang benar.
    pub async fn kirim_bertoken(&self, request: Request<Body>) -> axum::response::Response {
        let request = dengan_token(request);
        self.app().oneshot(request).await.unwrap()
    }
}

/// Sisipkan header `Authorization` bertoken benar ke sebuah permintaan.
pub fn dengan_token(mut request: Request<Body>) -> Request<Body> {
    request.headers_mut().insert(
        axum::http::header::AUTHORIZATION,
        format!("Bearer {TOKEN}").parse().unwrap(),
    );
    request
}

/// Bangun permintaan `POST` dengan badan JSON.
pub fn permintaan_json(uri: &str, badan: &serde_json::Value) -> Request<Body> {
    Request::builder()
        .method("POST")
        .uri(uri)
        .header("content-type", "application/json")
        .body(Body::from(badan.to_string()))
        .unwrap()
}

/// Bangun permintaan `PUT` dengan badan JSON.
///
/// Terpisah dari `permintaan_json` karena metodenya bagian dari kontrak: menyimpan
/// Kotak Penjelasan adalah `PUT` (mengganti seluruh isi satu alamat yang pasti),
/// bukan `POST`. Uji yang memakai metode salah harus gagal, bukan kebetulan lolos.
pub fn permintaan_put_json(uri: &str, badan: &serde_json::Value) -> Request<Body> {
    Request::builder()
        .method("PUT")
        .uri(uri)
        .header("content-type", "application/json")
        .body(Body::from(badan.to_string()))
        .unwrap()
}

/// Bangun permintaan `GET`.
pub fn permintaan_get(uri: &str) -> Request<Body> {
    Request::builder()
        .uri(uri)
        .body(Body::empty())
        .unwrap()
}

/// Baca badan balasan sebagai JSON.
pub async fn badan_json(response: axum::response::Response) -> serde_json::Value {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&bytes).unwrap()
}

/// Pastikan sebuah balasan berstatus tertentu, dengan pesan yang menyebut status
/// sebenarnya kalau tidak cocok.
pub fn pastikan_status(response: &axum::response::Response, diharapkan: StatusCode) {
    assert_eq!(
        response.status(),
        diharapkan,
        "diharapkan {diharapkan}, dapat {}",
        response.status()
    );
}
