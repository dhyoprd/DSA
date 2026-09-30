//! Konfigurasi backend, dibaca dari environment.
//!
//! Modul ini hanya punya satu alasan untuk berubah: cara konfigurasi dibaca.
//! Field ditambah saat memang dipakai, bukan karena mungkin dibutuhkan nanti.

use std::net::SocketAddr;

/// Konfigurasi runtime backend.
#[derive(Clone, Debug)]
pub struct Config {
    /// Alamat yang di-bind oleh server HTTP.
    pub addr: SocketAddr,
}

impl Config {
    /// Baca konfigurasi dari environment, dengan nilai bawaan yang aman untuk lokal.
    ///
    /// - `HOST` (bawaan `0.0.0.0`) — `0.0.0.0` wajib supaya container bisa dijangkau dari luar.
    /// - `PORT` (bawaan `8080`).
    pub fn from_env() -> Self {
        let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
        let port = std::env::var("PORT")
            .ok()
            .and_then(|raw| raw.parse::<u16>().ok())
            .unwrap_or(8080);

        let addr = format!("{host}:{port}").parse().unwrap_or_else(|_| {
            panic!("HOST dan PORT tidak membentuk alamat yang sah: {host}:{port}")
        });

        Self { addr }
    }
}
