//! Perakitan route.
//!
//! Setiap endpoint hidup di modulnya sendiri; modul ini hanya menggabungkannya.
//! Menambah endpoint baru berarti menambah modul dan satu baris `merge` di sini,
//! bukan menyunting modul endpoint yang sudah ada.
//!
//! Di sinilah batas "publik" dan "perlu token" ditegakkan — satu tempat, bukan
//! keputusan yang diulang di setiap modul endpoint.

pub mod catatan;
pub mod eksekusi;
pub mod health;
pub mod penjelasan;
pub mod progres;

use axum::middleware;
use axum::Router;

use crate::auth;
use crate::state::AppState;

/// Bangun seluruh route aplikasi.
///
/// Route publik digabung lebih dulu, lalu route terlindungi dipasang `route_layer`
/// berisi pemeriksaan token. Urutannya penting: `route_layer` hanya berlaku untuk
/// route yang **sudah** terpasang, sehingga route publik tetap terbuka.
///
/// `route_layer` dipilih, bukan `layer`, supaya path yang tidak dikenal tetap
/// dibalas `404`. Dengan `layer`, permintaan ke alamat yang salah akan dibalas `401`
/// dan menyembunyikan kesalahan alamat di balik kesalahan token.
pub fn router(state: AppState) -> Router {
    // Semua modul route memakai `Router<AppState>`, termasuk `health` yang
    // handler-nya tidak menerima `State`. Tipe state harus seragam supaya bisa
    // digabung, dan menyeragamkannya di sini lebih sederhana daripada mengubah tipe
    // di satu modul lalu mengonversinya.
    let publik = Router::<AppState>::new().merge(health::routes());

    let terlindungi = Router::new()
        .merge(progres::routes())
        .merge(penjelasan::routes())
        .merge(catatan::routes())
        .merge(eksekusi::routes())
        .route_layer(middleware::from_fn_with_state(state.clone(), auth::wajib_token));

    publik.merge(terlindungi).with_state(state)
}
