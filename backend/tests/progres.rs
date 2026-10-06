//! Uji endpoint Progres di batas API.
//!
//! Yang diuji adalah kontrak yang dilihat antarmuka, bukan detail implementasi:
//! status HTTP, bentuk balasan, dan bahwa token memang dijaga.

mod pendukung;

use axum::http::StatusCode;
use pendukung::{
    badan_json, dengan_token, pastikan_status, permintaan_get, permintaan_json, AplikasiUji,
};
use tower::ServiceExt;

// --- Token --------------------------------------------------------------------

#[tokio::test]
async fn tanpa_token_ditolak_401() {
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .app()
        .oneshot(permintaan_get("/api/progres"))
        .await
        .unwrap();

    pastikan_status(&response, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn token_salah_ditolak_401() {
    let aplikasi = AplikasiUji::baru().await;

    let mut request = permintaan_get("/api/progres");
    request.headers_mut().insert(
        axum::http::header::AUTHORIZATION,
        "Bearer token-yang-salah".parse().unwrap(),
    );

    let response = aplikasi.app().oneshot(request).await.unwrap();
    pastikan_status(&response, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn token_mentah_tanpa_prefix_bearer_diterima() {
    // Issue #1 menulis "header `Authorization` berisi token", tanpa menyebut
    // `Bearer`. Jadi bentuk mentah ini yang wajib diterima — kalau tidak, backend
    // menolak tepat bentuk yang diminta spec.
    let aplikasi = AplikasiUji::baru().await;

    let mut request = permintaan_get("/api/progres");
    request.headers_mut().insert(
        axum::http::header::AUTHORIZATION,
        pendukung::TOKEN.parse().unwrap(),
    );

    let response = aplikasi.app().oneshot(request).await.unwrap();
    pastikan_status(&response, StatusCode::OK);
}

#[tokio::test]
async fn path_tidak_dikenal_tetap_404_bukan_401() {
    // `route_layer` dipilih supaya kesalahan alamat tidak tersamar sebagai
    // kesalahan token. Uji ini menjaga pilihan itu.
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .app()
        .oneshot(dengan_token(permintaan_get("/api/tidak-ada")))
        .await
        .unwrap();

    pastikan_status(&response, StatusCode::NOT_FOUND);
}

// --- Menulis lalu membaca kembali ----------------------------------------------

#[tokio::test]
async fn progres_bisa_ditulis_lalu_dibaca_kembali_dengan_isi_yang_sama() {
    let aplikasi = AplikasiUji::baru().await;

    // Tulis: satu jawaban benar untuk Soal indeks 2 di Topik stack.
    let tulis = aplikasi
        .kirim_bertoken(permintaan_json(
            "/api/progres/stack/2",
            &serde_json::json!({ "benar": true }),
        ))
        .await;
    pastikan_status(&tulis, StatusCode::OK);

    let ditulis = badan_json(tulis).await;
    assert_eq!(ditulis["topik_slug"], "stack");
    assert_eq!(ditulis["soal_indeks"], 2);
    assert_eq!(ditulis["percobaan"], 1);
    assert_eq!(ditulis["status"], "selesai");
    assert!(ditulis["benar_terakhir"].is_string());

    // Baca: seluruh Progres harus memuat baris yang sama.
    let baca = aplikasi
        .kirim_bertoken(permintaan_get("/api/progres"))
        .await;
    pastikan_status(&baca, StatusCode::OK);

    let isi = badan_json(baca).await;
    let daftar = isi["progres"].as_array().expect("progres harus array");
    assert_eq!(daftar.len(), 1);
    assert_eq!(daftar[0]["topik_slug"], "stack");
    assert_eq!(daftar[0]["soal_indeks"], 2);
    assert_eq!(daftar[0]["percobaan"], 1);
    assert_eq!(daftar[0]["status"], "selesai");
    assert_eq!(daftar[0]["benar_terakhir"], ditulis["benar_terakhir"]);
}

#[tokio::test]
async fn progres_awalnya_kosong() {
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .kirim_bertoken(permintaan_get("/api/progres"))
        .await;
    pastikan_status(&response, StatusCode::OK);

    let isi = badan_json(response).await;
    assert_eq!(isi["progres"].as_array().unwrap().len(), 0);
}

// --- Aturan status -------------------------------------------------------------

#[tokio::test]
async fn jawaban_salah_menjadikan_status_sedang() {
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .kirim_bertoken(permintaan_json(
            "/api/progres/stack/0",
            &serde_json::json!({ "benar": false }),
        ))
        .await;
    pastikan_status(&response, StatusCode::OK);

    let baris = badan_json(response).await;
    assert_eq!(baris["percobaan"], 1);
    assert_eq!(baris["status"], "sedang");
    assert!(baris["benar_terakhir"].is_null());
}

#[tokio::test]
async fn mencoba_beberapa_kali_menambah_jumlah_percobaan() {
    let aplikasi = AplikasiUji::baru().await;

    for _ in 0..3 {
        let response = aplikasi
            .kirim_bertoken(permintaan_json(
                "/api/progres/stack/1",
                &serde_json::json!({ "benar": false }),
            ))
            .await;
        pastikan_status(&response, StatusCode::OK);
    }

    let response = aplikasi
        .kirim_bertoken(permintaan_get("/api/progres"))
        .await;
    let isi = badan_json(response).await;

    assert_eq!(isi["progres"][0]["percobaan"], 3);
    assert_eq!(isi["progres"][0]["status"], "sedang");
}

#[tokio::test]
async fn salah_setelah_benar_tetap_selesai_dan_waktu_benar_tidak_hilang() {
    let aplikasi = AplikasiUji::baru().await;

    let benar = aplikasi
        .kirim_bertoken(permintaan_json(
            "/api/progres/stack/3",
            &serde_json::json!({ "benar": true }),
        ))
        .await;
    let waktu_benar = badan_json(benar).await["benar_terakhir"].clone();

    let salah = aplikasi
        .kirim_bertoken(permintaan_json(
            "/api/progres/stack/3",
            &serde_json::json!({ "benar": false }),
        ))
        .await;
    pastikan_status(&salah, StatusCode::OK);

    let baris = badan_json(salah).await;
    assert_eq!(baris["percobaan"], 2);
    assert_eq!(baris["status"], "selesai", "pencapaian tidak boleh dibatalkan");
    assert_eq!(
        baris["benar_terakhir"], waktu_benar,
        "waktu jawaban benar pertama tidak boleh ditimpa atau dikosongkan"
    );
}

#[tokio::test]
async fn soal_berbeda_di_topik_yang_sama_dilacak_terpisah() {
    let aplikasi = AplikasiUji::baru().await;

    aplikasi
        .kirim_bertoken(permintaan_json(
            "/api/progres/stack/0",
            &serde_json::json!({ "benar": true }),
        ))
        .await;
    aplikasi
        .kirim_bertoken(permintaan_json(
            "/api/progres/stack/1",
            &serde_json::json!({ "benar": false }),
        ))
        .await;

    let response = aplikasi
        .kirim_bertoken(permintaan_get("/api/progres"))
        .await;
    let isi = badan_json(response).await;
    let daftar = isi["progres"].as_array().unwrap();

    assert_eq!(daftar.len(), 2);
    assert_eq!(daftar[0]["soal_indeks"], 0);
    assert_eq!(daftar[0]["status"], "selesai");
    assert_eq!(daftar[1]["soal_indeks"], 1);
    assert_eq!(daftar[1]["status"], "sedang");
}

// --- Bentuk permintaan yang salah ----------------------------------------------

#[tokio::test]
async fn indeks_yang_bukan_angka_ditolak_400() {
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .kirim_bertoken(permintaan_json(
            "/api/progres/stack/bukan-angka",
            &serde_json::json!({ "benar": true }),
        ))
        .await;

    pastikan_status(&response, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn badan_tanpa_field_benar_ditolak_422() {
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .kirim_bertoken(permintaan_json(
            "/api/progres/stack/0",
            &serde_json::json!({ "salah_ketik": true }),
        ))
        .await;

    pastikan_status(&response, StatusCode::UNPROCESSABLE_ENTITY);
}

// --- Bertahan setelah backend disiapkan ulang ----------------------------------

#[tokio::test]
async fn progres_bertahan_setelah_database_dibuka_ulang() {
    // Kriteria penerimaan #7: "Progres bertahan setelah refresh dan setelah ganti
    // browser". Uji ini membuktikan bagian yang bisa dibuktikan di backend — bahwa
    // datanya ada di berkas, bukan di memori proses. Membuka pool baru di atas
    // berkas yang sama meniru backend yang dimatikan lalu dinyalakan lagi.
    let aplikasi = AplikasiUji::baru().await;

    aplikasi
        .kirim_bertoken(permintaan_json(
            "/api/progres/stack/4",
            &serde_json::json!({ "benar": true }),
        ))
        .await;

    let berkas = aplikasi.berkas().to_path_buf();

    // Buka ulang database di atas berkas yang sama, tanpa menjalankan ulang uji.
    let pool = dsa_backend::db::buka(&berkas)
        .await
        .expect("database harus bisa dibuka ulang");
    let app_baru = pendukung::app_dari_pool(pool);

    let response = app_baru
        .oneshot(dengan_token(permintaan_get("/api/progres")))
        .await
        .unwrap();
    pastikan_status(&response, StatusCode::OK);

    let isi = badan_json(response).await;
    let daftar = isi["progres"].as_array().unwrap();
    assert_eq!(daftar.len(), 1);
    assert_eq!(daftar[0]["soal_indeks"], 4);
    assert_eq!(daftar[0]["status"], "selesai");
}

// --- Ekspor --------------------------------------------------------------------

#[tokio::test]
async fn ekspor_mengembalikan_seluruh_progres_sebagai_berkas_unduhan() {
    let aplikasi = AplikasiUji::baru().await;

    aplikasi
        .kirim_bertoken(permintaan_json(
            "/api/progres/stack/0",
            &serde_json::json!({ "benar": true }),
        ))
        .await;
    aplikasi
        .kirim_bertoken(permintaan_json(
            "/api/progres/stack/1",
            &serde_json::json!({ "benar": false }),
        ))
        .await;

    let response = aplikasi
        .kirim_bertoken(permintaan_get("/api/ekspor/progres"))
        .await;
    pastikan_status(&response, StatusCode::OK);

    // Header yang membuat browser mengunduh, bukan menampilkan.
    let disposition = response
        .headers()
        .get(axum::http::header::CONTENT_DISPOSITION)
        .expect("harus ada Content-Disposition")
        .to_str()
        .unwrap();
    assert!(
        disposition.contains("attachment"),
        "harus berupa unduhan, dapat: {disposition}"
    );

    let isi = badan_json(response).await;
    let daftar = isi["progres"].as_array().unwrap();
    assert_eq!(daftar.len(), 2);
}

#[tokio::test]
async fn ekspor_tanpa_token_ditolak_401() {
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .app()
        .oneshot(permintaan_get("/api/ekspor/progres"))
        .await
        .unwrap();

    pastikan_status(&response, StatusCode::UNAUTHORIZED);
}

// --- Tulisan bersamaan ---------------------------------------------------------

#[tokio::test]
async fn tulisan_bersamaan_ke_baris_yang_sama_tidak_gagal() {
    // Pool membuka lebih dari satu koneksi. Kalau SQLite mengunci berkas saat satu
    // tulis berjalan, tulis yang bersamaan bisa gagal dengan "database is locked" —
    // dan itu akan terlihat sebagai 500 di antarmuka, bukan sebagai kesalahan pemakai.
    let aplikasi = AplikasiUji::baru().await;

    let mut tugas = Vec::new();
    for _ in 0..10 {
        let app = aplikasi.app();
        tugas.push(tokio::spawn(async move {
            let request = dengan_token(permintaan_json(
                "/api/progres/stack/0",
                &serde_json::json!({ "benar": true }),
            ));
            app.oneshot(request).await.unwrap().status()
        }));
    }

    let mut gagal = 0;
    for tugas in tugas {
        if tugas.await.unwrap() != StatusCode::OK {
            gagal += 1;
        }
    }
    assert_eq!(gagal, 0, "ada tulisan yang gagal karena penguncian database");
}
