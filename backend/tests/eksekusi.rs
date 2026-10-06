//! Uji integrasi endpoint Eksekusi Kode.
//!
//! Yang diuji di sini adalah **kontrak HTTP**: path, token, status, dan bentuk badan
//! balasan. Kode Python-nya **tidak** benar-benar dijalankan — penjalannya palsu
//! (lihat `pendukung`), sehingga uji ini cepat dan tidak menuntut Docker hidup.
//!
//! Yang benar-benar menjalankan kode diuji di dua tempat lain:
//! `runner/` (uji perilaku runner) dan gerbang `npm run verifikasi-soal` (solusi
//! referensi terhadap test case-nya sendiri).
//!
//! Pembagian itu disengaja: kontrak HTTP berubah kalau bentuk permintaan berubah,
//! sedangkan perilaku runner berubah kalau cara menilai berubah. Dua alasan berbeda
//! untuk berubah, jadi dua berkas uji yang berbeda.

mod pendukung;

use axum::http::StatusCode;
use dsa_backend::eksekusi::batas::BATAS_UKURAN_KODE;
use dsa_backend::eksekusi::hasil::{Hasil, HasilKasus, Status};
use pendukung::{badan_json, pastikan_status, permintaan_json, AplikasiUji};
use tower::ServiceExt;

/// Badan permintaan yang sah, dengan kode dan test case yang bisa diganti.
fn permintaan(kode: &str, jumlah_kasus: usize) -> serde_json::Value {
    let test_case: Vec<serde_json::Value> = (0..jumlah_kasus)
        .map(|i| serde_json::json!({ "argumen": [i], "diharapkan": i }))
        .collect();

    serde_json::json!({
        "topik_slug": "stack",
        "soal_indeks": 5,
        "kode": kode,
        "fungsi": "proses",
        "test_case": test_case,
    })
}

// --- Token ---------------------------------------------------------------------

#[tokio::test]
async fn tanpa_token_ditolak_401() {
    // Eksekusi kode menjalankan kode yang dikirim lewat jaringan. Ia **wajib** di
    // belakang token; tanpa itu siapa pun yang menemukan URL-nya bisa menjalankan
    // kode di mesin ini.
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .app()
        .oneshot(permintaan_json("/api/eksekusi", &permintaan("x = 1", 1)))
        .await
        .unwrap();

    pastikan_status(&response, StatusCode::UNAUTHORIZED);
}

// --- Jalur bahagia -------------------------------------------------------------

#[tokio::test]
async fn kode_yang_lulus_membalas_hasil_per_kasus() {
    let kasus = vec![
        HasilKasus {
            indeks: 0,
            argumen: serde_json::json!([1]),
            diharapkan: serde_json::json!(2),
            hasil: serde_json::json!(2),
            lulus: true,
            galat: None,
            keluaran: String::new(),
        },
        HasilKasus {
            indeks: 1,
            argumen: serde_json::json!([2]),
            diharapkan: serde_json::json!(3),
            hasil: serde_json::json!(99),
            lulus: false,
            galat: None,
            keluaran: "jejak".to_string(),
        },
    ];
    let hasil = Hasil {
        status: Status::Ok,
        kasus,
        keluaran: String::new(),
        pesan: None,
        durasi_ms: 12,
    };

    let aplikasi = AplikasiUji::dengan_hasil_eksekusi(hasil).await;

    let response = aplikasi
        .kirim_bertoken(permintaan_json("/api/eksekusi", &permintaan("def proses(x): ...", 2)))
        .await;

    pastikan_status(&response, StatusCode::OK);

    let isi = badan_json(response).await;
    assert_eq!(isi["status"], "ok");
    // Kriteria penerimaan #10: "Terlihat test case mana yang lulus dan mana yang
    // gagal", "Terlihat input, output yang dihasilkan, dan output yang diharapkan".
    let daftar = isi["kasus"].as_array().expect("kasus harus array");
    assert_eq!(daftar.len(), 2);
    assert_eq!(daftar[0]["lulus"], true);
    assert_eq!(daftar[1]["lulus"], false);
    assert_eq!(daftar[1]["hasil"], 99);
    assert_eq!(daftar[1]["diharapkan"], 3);
    assert_eq!(daftar[1]["keluaran"], "jejak");
}

#[tokio::test]
async fn galat_sintaks_membalas_200_dengan_status_galat_sintaks() {
    // Kode yang gagal sintaks bukan kegagalan **permintaan**: permintaannya berhasil,
    // dan jawabannya adalah "kodenya gagal, ini sebabnya". Membalas 4xx akan membuat
    // antarmuka menampilkannya sebagai masalah backend.
    let hasil = Hasil::tanpa_eksekusi(Status::GalatSintaks, "invalid syntax (baris 1)");
    let aplikasi = AplikasiUji::dengan_hasil_eksekusi(hasil).await;

    let response = aplikasi
        .kirim_bertoken(permintaan_json("/api/eksekusi", &permintaan("def proses(:", 1)))
        .await;

    pastikan_status(&response, StatusCode::OK);

    let isi = badan_json(response).await;
    assert_eq!(isi["status"], "galat-sintaks");
    assert_eq!(isi["pesan"], "invalid syntax (baris 1)");
}

#[tokio::test]
async fn lewat_waktu_membalas_200_dengan_pesan_yang_berbeda_dari_galat_sintaks() {
    // Kriteria penerimaan #10: "Pesan timeout jelas berbeda dari pesan kesalahan
    // sintaks". Uji ini mengikat perbedaan itu: statusnya beda, dan pesannya beda.
    let hasil = Hasil::tanpa_eksekusi(Status::LewatWaktu, "Kode berjalan lebih dari 5 detik lalu dihentikan.");
    let aplikasi = AplikasiUji::dengan_hasil_eksekusi(hasil).await;

    let response = aplikasi
        .kirim_bertoken(permintaan_json(
            "/api/eksekusi",
            &permintaan("def proses(x):\n    while True: pass\n", 1),
        ))
        .await;

    pastikan_status(&response, StatusCode::OK);

    let isi = badan_json(response).await;
    assert_eq!(isi["status"], "lewat-waktu");
    assert_ne!(isi["status"], "galat-sintaks");
    assert!(
        isi["pesan"].as_str().unwrap().contains("detik"),
        "pesan lewat-waktu harus menyebut waktu: {}",
        isi["pesan"]
    );
}

// --- Batas ukuran --------------------------------------------------------------

#[tokio::test]
async fn kode_melebihi_batas_ukuran_ditolak_400() {
    // Kriteria penerimaan #10: "Kode yang melebihi batas ukuran ditolak".
    let aplikasi = AplikasiUji::baru().await;
    let kode = "a".repeat(BATAS_UKURAN_KODE + 1);

    let response = aplikasi
        .kirim_bertoken(permintaan_json("/api/eksekusi", &permintaan(&kode, 1)))
        .await;

    pastikan_status(&response, StatusCode::BAD_REQUEST);
    let isi = badan_json(response).await;
    assert!(
        isi["galat"].as_str().unwrap().contains("terlalu panjang"),
        "pesan harus menjelaskan sebabnya: {}",
        isi["galat"]
    );
}

#[tokio::test]
async fn kode_terlalu_panjang_tidak_sampai_dijalankan() {
    // Yang penting bukan hanya statusnya, tetapi bahwa kodenya **tidak pernah**
    // mencapai penjalan: menolak setelah menjalankan berarti batasnya tidak
    // melindungi apa pun.
    let aplikasi = AplikasiUji::baru().await;
    let kode = "a".repeat(BATAS_UKURAN_KODE + 1);

    let _ = aplikasi
        .kirim_bertoken(permintaan_json("/api/eksekusi", &permintaan(&kode, 1)))
        .await;

    assert_eq!(aplikasi.jumlah_eksekusi(), 0);
}

#[tokio::test]
async fn kode_kosong_ditolak_400() {
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .kirim_bertoken(permintaan_json("/api/eksekusi", &permintaan("   \n  ", 1)))
        .await;

    pastikan_status(&response, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_case_berlebihan_ditolak_400() {
    // Batas jumlah kasus melindungi dari satu submission yang menahan kontainer jauh
    // lebih lama daripada batas waktunya.
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .kirim_bertoken(permintaan_json(
            "/api/eksekusi",
            &permintaan("def proses(x): return x", 1000),
        ))
        .await;

    pastikan_status(&response, StatusCode::BAD_REQUEST);
}

// --- Batas laju ----------------------------------------------------------------

#[tokio::test]
async fn batas_laju_menolak_setelah_jatahnya_habis() {
    // Di produksi ADR-0002 mewajibkan batas laju. Uji ini menjalankan eksekusi
    // berkali-kali sampai jatahnya habis, lalu memastikan yang berikutnya ditolak
    // dengan `429` — bukan `400`, karena mencoba lagi nanti akan berhasil.
    let aplikasi = AplikasiUji::baru().await;

    let mut ditolak = false;
    // 100 jauh lebih banyak daripada batas bawaan (30), jadi jatahnya pasti habis.
    for _ in 0..100 {
        let response = aplikasi
            .kirim_bertoken(permintaan_json(
                "/api/eksekusi",
                &permintaan("def proses(x): return x", 1),
            ))
            .await;

        if response.status() == StatusCode::TOO_MANY_REQUESTS {
            let isi = badan_json(response).await;
            assert!(
                isi["galat"].as_str().unwrap().contains("Terlalu banyak"),
                "pesan harus menjelaskan sebabnya: {}",
                isi["galat"]
            );
            ditolak = true;
            break;
        }
    }

    assert!(ditolak, "batas laju harus menolak sebelum 100 eksekusi");
}

// --- Bentuk permintaan ---------------------------------------------------------

#[tokio::test]
async fn badan_tanpa_field_wajib_ditolak_422() {
    // `axum` menolak badan yang tidak cocok bentuknya sebelum handler berjalan.
    // Field `test_case` sengaja hilang.
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .kirim_bertoken(permintaan_json(
            "/api/eksekusi",
            &serde_json::json!({ "topik_slug": "stack", "soal_indeks": 5, "kode": "x = 1" }),
        ))
        .await;

    pastikan_status(&response, StatusCode::UNPROCESSABLE_ENTITY);
}
