//! Konfigurasi backend, dibaca dari environment.
//!
//! Modul ini hanya punya satu alasan untuk berubah: cara konfigurasi dibaca.
//! Field ditambah saat memang dipakai, bukan karena mungkin dibutuhkan nanti.

use std::net::SocketAddr;
use std::path::PathBuf;

/// Konfigurasi runtime backend.
#[derive(Clone, Debug)]
pub struct Config {
    /// Alamat yang di-bind oleh server HTTP.
    pub addr: SocketAddr,
    /// Token rahasia. Setiap permintaan ke endpoint terlindungi wajib membawanya.
    /// Keputusan dan batasnya ada di `docs/adr/0006-autentikasi-satu-token.md`.
    pub api_token: String,
    /// Berkas database SQLite.
    /// Alasan mesinnya SQLite ada di `docs/adr/0010-sqlite-litefs-sebagai-mesin-database.md`.
    pub database_path: PathBuf,
}

impl Config {
    /// Baca konfigurasi dari environment.
    ///
    /// - `HOST` (bawaan `0.0.0.0`) — `0.0.0.0` wajib supaya container bisa dijangkau dari luar.
    /// - `PORT` (bawaan `8080`).
    /// - `API_TOKEN` (wajib) — backend menolak menyala tanpa ini.
    /// - `DATABASE_PATH` (bawaan `dsa.db` di direktori kerja).
    pub fn from_env() -> Self {
        let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
        let port = std::env::var("PORT")
            .ok()
            .and_then(|raw| raw.parse::<u16>().ok())
            .unwrap_or(8080);

        let addr = format!("{host}:{port}").parse().unwrap_or_else(|_| {
            panic!("HOST dan PORT tidak membentuk alamat yang sah: {host}:{port}")
        });

        let api_token = std::env::var("API_TOKEN").unwrap_or_default();

        let database_path = std::env::var("DATABASE_PATH")
            .unwrap_or_else(|_| "dsa.db".to_string())
            .into();

        Self {
            addr,
            api_token,
            database_path,
        }
    }

    /// Pastikan konfigurasi bisa dipakai, atau jelaskan apa yang kurang.
    ///
    /// Dipisah dari `from_env` supaya pembacaan environment tetap murni: fungsi ini
    /// yang memutuskan sebuah nilai cukup atau tidak.
    ///
    /// `API_TOKEN` kosong **menghentikan proses**, bukan diabaikan. Backend tanpa
    /// token hanya punya dua perilaku yang mungkin: menolak semua permintaan, atau
    /// menerima semua. Yang pertama membuat situs tidak berguna, yang kedua membuka
    /// Progres dan Catatan ke publik — jadi berhenti dengan pesan jelas adalah satu-
    /// satunya pilihan yang jujur.
    pub fn periksa(&self) {
        if self.api_token.trim().is_empty() {
            panic!(
                "API_TOKEN belum diisi.\n\
                 Backend ini menolak menyala tanpa token: tanpa itu, Progres dan Catatan \
                 bisa dibaca siapa saja yang menemukan URL-nya.\n\
                 Salin .env.example menjadi .env, isi API_TOKEN dengan nilai acak yang \
                 panjang (mis. `openssl rand -hex 32`), lalu jalankan ulang."
            );
        }
    }
}
