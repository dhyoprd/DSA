//! Uji endpoint Kotak Penjelasan di batas API.
//!
//! Yang diuji adalah kontrak yang dilihat antarmuka: status HTTP, bentuk balasan,
//! dan bahwa token memang dijaga. Kriteria penerimaan ticket #8 yang bisa dibuktikan
//! di sini: "Tulisan tersimpan di backend" dan "Tulisan muncul kembali saat Kuis itu
//! dibuka lagi" (bagian backendnya).

mod pendukung;

use axum::http::StatusCode;
use pendukung::{
    badan_json, dengan_token, pastikan_status, permintaan_get, permintaan_put_json, AplikasiUji,
};
use tower::ServiceExt;

// --- Token --------------------------------------------------------------------

#[tokio::test]
async fn tanpa_token_ditolak_401() {
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .app()
        .oneshot(permintaan_get("/api/penjelasan/stack/0"))
        .await
        .unwrap();

    pastikan_status(&response, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn menulis_tanpa_token_ditolak_401() {
    // Membaca saja tidak cukup diuji: endpoint tulis juga harus dijaga, karena
    // itulah yang bisa merusak tulisan pemelajar kalau terbuka.
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .app()
        .oneshot(permintaan_put_json(
            "/api/penjelasan/stack/0",
            &serde_json::json!({ "isi": "apa saja" }),
        ))
        .await
        .unwrap();

    pastikan_status(&response, StatusCode::UNAUTHORIZED);
}

// --- Menulis lalu membaca kembali ----------------------------------------------

#[tokio::test]
async fn tulisan_bisa_disimpan_lalu_dibaca_kembali_dengan_isi_yang_sama() {
    let aplikasi = AplikasiUji::baru().await;

    let tulis = aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/penjelasan/stack/2",
            &serde_json::json!({ "isi": "Karena pop mengambil elemen teratas." }),
        ))
        .await;
    pastikan_status(&tulis, StatusCode::OK);

    let disimpan = badan_json(tulis).await;
    assert_eq!(disimpan["topik_slug"], "stack");
    assert_eq!(disimpan["soal_indeks"], 2);
    assert_eq!(disimpan["isi"], "Karena pop mengambil elemen teratas.");
    assert!(disimpan["diperbarui"].is_string());

    // Baca kembali — inilah "tulisan muncul kembali saat Kuis itu dibuka lagi".
    let baca = aplikasi
        .kirim_bertoken(permintaan_get("/api/penjelasan/stack/2"))
        .await;
    pastikan_status(&baca, StatusCode::OK);

    let isi = badan_json(baca).await;
    assert_eq!(isi["isi"], "Karena pop mengambil elemen teratas.");
    assert_eq!(isi["diperbarui"], disimpan["diperbarui"]);
}

#[tokio::test]
async fn kotak_yang_belum_pernah_ditulis_dibalas_200_dengan_isi_kosong() {
    // Bukan 404. "Belum pernah menulis" adalah keadaan normal setiap Soal, dan
    // membalas 404 akan memaksa antarmuka menampilkan galat kepada pemelajar yang
    // hanya belum menulis apa-apa.
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .kirim_bertoken(permintaan_get("/api/penjelasan/stack/5"))
        .await;
    pastikan_status(&response, StatusCode::OK);

    let isi = badan_json(response).await;
    assert_eq!(isi["topik_slug"], "stack");
    assert_eq!(isi["soal_indeks"], 5);
    assert_eq!(isi["isi"], "");
    assert!(isi["diperbarui"].is_null());
}

#[tokio::test]
async fn menyimpan_ulang_mengganti_seluruh_isi_bukan_menambah() {
    let aplikasi = AplikasiUji::baru().await;

    aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/penjelasan/stack/1",
            &serde_json::json!({ "isi": "versi pertama" }),
        ))
        .await;
    let kedua = aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/penjelasan/stack/1",
            &serde_json::json!({ "isi": "versi kedua" }),
        ))
        .await;
    pastikan_status(&kedua, StatusCode::OK);

    let baris = badan_json(kedua).await;
    assert_eq!(baris["isi"], "versi kedua", "isi lama harus tergantikan");

    // Dan hanya ada satu baris: menyimpan ulang tidak menumpuk baris baru.
    let baca = aplikasi
        .kirim_bertoken(permintaan_get("/api/penjelasan/stack/1"))
        .await;
    assert_eq!(badan_json(baca).await["isi"], "versi kedua");
}

#[tokio::test]
async fn mengosongkan_kotak_diterima_dan_barisnya_tetap_ada() {
    // Mengosongkan kotak adalah cara sah membatalkan tulisan. Barisnya sengaja tidak
    // dihapus: `diperbarui` yang terisi menandakan Kotak Penjelasan Soal ini sudah
    // pernah dibuka, dan itu informasi yang hilang kalau barisnya dihapus.
    let aplikasi = AplikasiUji::baru().await;

    aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/penjelasan/stack/3",
            &serde_json::json!({ "isi": "tulisan awal" }),
        ))
        .await;

    let kosong = aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/penjelasan/stack/3",
            &serde_json::json!({ "isi": "" }),
        ))
        .await;
    pastikan_status(&kosong, StatusCode::OK);

    let baris = badan_json(kosong).await;
    assert_eq!(baris["isi"], "");
    assert!(
        baris["diperbarui"].is_string(),
        "waktu penyimpanan tetap ada walau isinya kosong"
    );
}

#[tokio::test]
async fn tulisan_soal_berbeda_di_topik_yang_sama_terpisah() {
    let aplikasi = AplikasiUji::baru().await;

    aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/penjelasan/stack/0",
            &serde_json::json!({ "isi": "jawaban soal nol" }),
        ))
        .await;
    aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/penjelasan/stack/1",
            &serde_json::json!({ "isi": "jawaban soal satu" }),
        ))
        .await;

    let nol = aplikasi
        .kirim_bertoken(permintaan_get("/api/penjelasan/stack/0"))
        .await;
    let satu = aplikasi
        .kirim_bertoken(permintaan_get("/api/penjelasan/stack/1"))
        .await;

    assert_eq!(badan_json(nol).await["isi"], "jawaban soal nol");
    assert_eq!(badan_json(satu).await["isi"], "jawaban soal satu");
}

#[tokio::test]
async fn tulisan_dengan_aksara_utf8_tidak_rusak() {
    // Tulisan pemelajar berbahasa Indonesia dan bisa memuat tanda kutip lengkung,
    // panah, atau emoji. Kalau penyimpanan memotong atau mengubahnya, pemelajar akan
    // menemukan tulisannya sendiri rusak tanpa tahu sebabnya.
    let aplikasi = AplikasiUji::baru().await;
    let asli = "Karena LIFO → yang terakhir masuk, keluar dulu. “Tumpukan” itu.";

    aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/penjelasan/stack/4",
            &serde_json::json!({ "isi": asli }),
        ))
        .await;

    let baca = aplikasi
        .kirim_bertoken(permintaan_get("/api/penjelasan/stack/4"))
        .await;
    assert_eq!(badan_json(baca).await["isi"], asli);
}

// --- Bentuk permintaan yang salah ----------------------------------------------

#[tokio::test]
async fn indeks_yang_bukan_angka_ditolak_400() {
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/penjelasan/stack/bukan-angka",
            &serde_json::json!({ "isi": "apa saja" }),
        ))
        .await;

    pastikan_status(&response, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn badan_tanpa_field_isi_ditolak_422() {
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/penjelasan/stack/0",
            &serde_json::json!({ "salah_ketik": "apa saja" }),
        ))
        .await;

    pastikan_status(&response, StatusCode::UNPROCESSABLE_ENTITY);
}

// --- Bertahan setelah backend disiapkan ulang ----------------------------------

#[tokio::test]
async fn tulisan_bertahan_setelah_database_dibuka_ulang() {
    // Kriteria penerimaan #8: "Tulisan muncul kembali saat Kuis itu dibuka lagi".
    // Bagian yang bisa dibuktikan di backend adalah bahwa tulisan ada di berkas, bukan
    // di memori proses — itu yang membuatnya muncul lagi dari perangkat lain juga.
    let aplikasi = AplikasiUji::baru().await;

    aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/penjelasan/stack/4",
            &serde_json::json!({ "isi": "alasan yang saya tulis" }),
        ))
        .await;

    let berkas = aplikasi.berkas().to_path_buf();

    let pool = dsa_backend::db::buka(&berkas)
        .await
        .expect("database harus bisa dibuka ulang");
    let state = dsa_backend::AppState::baru(pendukung::TOKEN.to_string(), pool);
    let app_baru = dsa_backend::app(state);

    let response = app_baru
        .oneshot(dengan_token(permintaan_get("/api/penjelasan/stack/4")))
        .await
        .unwrap();
    pastikan_status(&response, StatusCode::OK);

    assert_eq!(badan_json(response).await["isi"], "alasan yang saya tulis");
}
