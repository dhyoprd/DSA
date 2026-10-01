//! Uji integrasi di batas API.
//!
//! Uji ini memanggil `Router` langsung lewat `oneshot`, tanpa membuka port,
//! sehingga cepat dan tidak berebut port dengan proses lain. Yang diuji adalah
//! kontrak yang dilihat antarmuka: path, status, dan bentuk badan balasan.
//!
//! Ini **seam utama** yang ditetapkan issue #1: seluruh test perilaku otomatis
//! hidup di sini. Fungsi internal Rust tidak diuji terpisah.

mod pendukung;

use axum::body::to_bytes;
use axum::http::{Request, StatusCode};
use pendukung::AplikasiUji;
use tower::ServiceExt;

#[tokio::test]
async fn health_membalas_ok_tanpa_token() {
    // Endpoint kesehatan sengaja tidak butuh token: ia tidak membaca atau mengubah
    // apa pun, dan dipakai antarmuka untuk membuktikan backend hidup. Uji ini menjaga
    // agar pemasangan pemeriksaan token tidak ikut menutupnya — kalau tertutup,
    // indikator status backend di halaman awal akan selalu tampak "mati".
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .app()
        .oneshot(
            Request::builder()
                .uri("/api/health")
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let body: serde_json::Value = serde_json::from_slice(&bytes).unwrap();

    assert_eq!(body["status"], "ok");
    assert_eq!(body["service"], "dsa-backend");
}

#[tokio::test]
async fn path_yang_tidak_dikenal_membalas_404() {
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .app()
        .oneshot(
            Request::builder()
                .uri("/tidak-ada")
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
