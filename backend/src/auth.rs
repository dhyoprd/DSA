//! Pemeriksaan token, sebagai middleware.
//!
//! Satu tempat yang tahu bagaimana token diperiksa. Route yang dilindungi
//! memasangnya lewat `route_layer`, sehingga endpoint publik (kesehatan, dan nanti
//! Eksekusi Kode kalau perlu) tidak ikut terjaga.
//!
//! Nama header dan semantik `401` ditetapkan issue #1 dan tidak didesain di sini.
//! Sumber token di sisi antarmuka ada di
//! `docs/adr/0011-token-diketik-di-antarmuka.md`.

use axum::extract::{Request, State};
use axum::http::{header, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};

use crate::state::AppState;

/// Tolak permintaan yang tidak membawa token yang benar.
///
/// Dipasang dengan `route_layer`, bukan `layer`: `route_layer` hanya berjalan kalau
/// permintaannya cocok dengan sebuah route, sehingga path yang tidak dikenal tetap
/// dibalas `404`, bukan berubah menjadi `401`. Perbedaan itu penting untuk debugging
/// — permintaan ke alamat yang salah harus terlihat sebagai alamat yang salah.
pub async fn wajib_token(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Response {
    let dibawa = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|nilai| nilai.to_str().ok());

    match dibawa {
        Some(nilai) if cocok(nilai, &state.api_token) => next.run(request).await,
        _ => StatusCode::UNAUTHORIZED.into_response(),
    }
}

/// Apakah header `Authorization` membawa token yang benar.
///
/// Dua bentuk diterima: token mentah (`Authorization: <token>`), dan bentuk
/// konvensional `Bearer <token>`.
///
/// Bentuk mentah adalah yang literal dari issue #1 — "header `Authorization` berisi
/// token dari environment" — jadi ia yang wajib diterima. `Bearer` diterima
/// tambahan karena itu bentuk lazim header ini, sehingga klien HTTP mana pun bisa
/// memakainya tanpa kode khusus. Yang ditolak adalah header yang isinya bukan
/// tokennya, apa pun bentuknya.
fn cocok(header: &str, diharapkan: &str) -> bool {
    let dibawa = header.strip_prefix("Bearer ").unwrap_or(header);

    // Bandingkan panjang lebih dulu supaya perbandingan waktu tetapnya hanya
    // dijalankan pada panjang yang sama.
    if dibawa.len() != diharapkan.len() {
        return false;
    }

    // XOR semua byte; hasil nol berarti sama. Tidak ada jalan keluar lebih awal,
    // sehingga lama pemeriksaan tidak bergantung pada isi token.
    dibawa
        .bytes()
        .zip(diharapkan.bytes())
        .fold(0u8, |beda, (a, b)| beda | (a ^ b))
        == 0
}

#[cfg(test)]
mod tests {
    use super::cocok;

    #[test]
    fn menerima_token_mentah_sesuai_issue_1() {
        // Bentuk yang literal disebut issue #1: header berisi token.
        assert!(cocok("rahasia-panjang", "rahasia-panjang"));
    }

    #[test]
    fn menerima_bentuk_bearer_yang_konvensional() {
        assert!(cocok("Bearer rahasia-panjang", "rahasia-panjang"));
    }

    #[test]
    fn menolak_token_yang_salah() {
        assert!(!cocok("Bearer rahasia-panjang", "rahasia-pendek"));
        assert!(!cocok("Bearer lain-sama-panjang", "rahasia-panjang"));
        assert!(!cocok("rahasia-pendek", "rahasia-panjang"));
    }

    #[test]
    fn menolak_header_kosong() {
        assert!(!cocok("", "rahasia-panjang"));
        assert!(!cocok("Bearer ", "rahasia-panjang"));
    }
}
