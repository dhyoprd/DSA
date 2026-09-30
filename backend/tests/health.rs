//! Uji integrasi di batas API.
//!
//! Uji ini memanggil `Router` langsung lewat `oneshot`, tanpa membuka port,
//! sehingga cepat dan tidak berebut port dengan proses lain. Yang diuji adalah
//! kontrak yang dilihat antarmuka: path, status, dan bentuk badan balasan.

use axum::{
    body::to_bytes,
    http::{Request, StatusCode},
};
use dsa_backend::app;
use tower::ServiceExt;

#[tokio::test]
async fn health_membalas_ok_dengan_bentuk_yang_diharapkan() {
    let response = app()
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
    let response = app()
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
