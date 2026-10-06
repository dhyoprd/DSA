//! Uji endpoint Catatan di batas API.
//!
//! Yang diuji adalah kontrak yang dilihat antarmuka: status HTTP, bentuk balasan,
//! dan bahwa token memang dijaga. Kriteria penerimaan ticket #11 yang bisa
//! dibuktikan di sini: "Tersimpan di backend", "Sinkron antara laptop dan HP"
//! (bagian backendnya: data ada di berkas, bukan di memori proses), dan "Tidak
//! hilang saat data browser dibersihkan".
//!
//! Catatan berbeda dari Kotak Penjelasan dalam satu hal yang penting di sini:
//! kuncinya **slug Topik saja**, bukan pasangan (slug, indeks). Uji-uji di bawah
//! menjaga hal itu — dua Topik terpisah, dan tidak ada indeks di alamatnya.

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
        .oneshot(permintaan_get("/api/catatan/stack"))
        .await
        .unwrap();

    pastikan_status(&response, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn menulis_tanpa_token_ditolak_401() {
    // Membaca saja tidak cukup diuji: endpoint tulis juga harus dijaga, karena
    // itulah yang bisa merusak Catatan pemelajar kalau terbuka.
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .app()
        .oneshot(permintaan_put_json(
            "/api/catatan/stack",
            &serde_json::json!({ "isi": "apa saja" }),
        ))
        .await
        .unwrap();

    pastikan_status(&response, StatusCode::UNAUTHORIZED);
}

// --- Menulis lalu membaca kembali ----------------------------------------------

#[tokio::test]
async fn catatan_bisa_disimpan_lalu_dibaca_kembali_dengan_isi_yang_sama() {
    let aplikasi = AplikasiUji::baru().await;

    let tulis = aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/catatan/stack",
            &serde_json::json!({ "isi": "## Ringkasan\n\nLIFO: yang terakhir masuk keluar dulu." }),
        ))
        .await;
    pastikan_status(&tulis, StatusCode::OK);

    let disimpan = badan_json(tulis).await;
    assert_eq!(disimpan["topik_slug"], "stack");
    assert_eq!(
        disimpan["isi"],
        "## Ringkasan\n\nLIFO: yang terakhir masuk keluar dulu."
    );
    assert!(disimpan["diperbarui"].is_string());

    // Baca kembali — inilah "tersimpan di backend" dan "sinkron antara perangkat".
    let baca = aplikasi
        .kirim_bertoken(permintaan_get("/api/catatan/stack"))
        .await;
    pastikan_status(&baca, StatusCode::OK);

    let isi = badan_json(baca).await;
    assert_eq!(
        isi["isi"],
        "## Ringkasan\n\nLIFO: yang terakhir masuk keluar dulu."
    );
    assert_eq!(isi["diperbarui"], disimpan["diperbarui"]);
}

#[tokio::test]
async fn catatan_yang_belum_pernah_ditulis_dibalas_200_dengan_isi_kosong() {
    // Bukan 404. "Belum pernah menulis" adalah keadaan normal setiap Topik, dan
    // membalas 404 akan memaksa antarmuka menampilkan galat kepada pemelajar yang
    // hanya belum menulis apa-apa.
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .kirim_bertoken(permintaan_get("/api/catatan/queue"))
        .await;
    pastikan_status(&response, StatusCode::OK);

    let isi = badan_json(response).await;
    assert_eq!(isi["topik_slug"], "queue");
    assert_eq!(isi["isi"], "");
    assert!(isi["diperbarui"].is_null());
}

#[tokio::test]
async fn menyimpan_ulang_mengganti_seluruh_isi_bukan_menambah() {
    let aplikasi = AplikasiUji::baru().await;

    aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/catatan/stack",
            &serde_json::json!({ "isi": "versi pertama" }),
        ))
        .await;
    let kedua = aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/catatan/stack",
            &serde_json::json!({ "isi": "versi kedua" }),
        ))
        .await;
    pastikan_status(&kedua, StatusCode::OK);

    let baris = badan_json(kedua).await;
    assert_eq!(baris["isi"], "versi kedua", "isi lama harus tergantikan");

    // Dan hanya ada satu baris: menyimpan ulang tidak menumpuk baris baru.
    let baca = aplikasi
        .kirim_bertoken(permintaan_get("/api/catatan/stack"))
        .await;
    assert_eq!(badan_json(baca).await["isi"], "versi kedua");
}

#[tokio::test]
async fn mengosongkan_catatan_diterima_dan_barisnya_tetap_ada() {
    // Mengosongkan editor adalah cara sah membatalkan tulisan. Barisnya sengaja tidak
    // dihapus: `diperbarui` yang terisi menandakan Catatan Topik ini sudah pernah
    // dibuka.
    let aplikasi = AplikasiUji::baru().await;

    aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/catatan/stack",
            &serde_json::json!({ "isi": "tulisan awal" }),
        ))
        .await;

    let kosong = aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/catatan/stack",
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
async fn catatan_topik_berbeda_terpisah() {
    // Kuncinya slug Topik saja. Kalau tabelnya salah dikunci (mis. dengan indeks yang
    // tidak ada), dua Topik bisa saling menimpa — dan itu baru ketahuan saat pemelajar
    // kehilangan Catatan sebuah Topik tanpa sebab.
    let aplikasi = AplikasiUji::baru().await;

    aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/catatan/stack",
            &serde_json::json!({ "isi": "catatan stack" }),
        ))
        .await;
    aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/catatan/queue",
            &serde_json::json!({ "isi": "catatan queue" }),
        ))
        .await;

    let stack = aplikasi
        .kirim_bertoken(permintaan_get("/api/catatan/stack"))
        .await;
    let queue = aplikasi
        .kirim_bertoken(permintaan_get("/api/catatan/queue"))
        .await;

    assert_eq!(badan_json(stack).await["isi"], "catatan stack");
    assert_eq!(badan_json(queue).await["isi"], "catatan queue");
}

#[tokio::test]
async fn catatan_dengan_aksara_utf8_dan_markdown_tidak_rusak() {
    // Catatan ditulis Markdown dan berbahasa Indonesia: ia bisa memuat tanda kutip
    // lengkung, panah, emoji, dan penanda Markdown. Kalau penyimpanan memotong atau
    // mengubahnya, pemelajar akan menemukan tulisannya sendiri rusak tanpa tahu
    // sebabnya.
    let aplikasi = AplikasiUji::baru().await;
    let asli = "# Catatan\n\n- LIFO → **yang terakhir** masuk, keluar dulu 🚀\n- “Tumpukan” itu.";

    aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/catatan/stack",
            &serde_json::json!({ "isi": asli }),
        ))
        .await;

    let baca = aplikasi
        .kirim_bertoken(permintaan_get("/api/catatan/stack"))
        .await;
    assert_eq!(badan_json(baca).await["isi"], asli);
}

// --- Bentuk permintaan yang salah ----------------------------------------------

#[tokio::test]
async fn badan_tanpa_field_isi_ditolak_422() {
    let aplikasi = AplikasiUji::baru().await;

    let response = aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/catatan/stack",
            &serde_json::json!({ "salah_ketik": "apa saja" }),
        ))
        .await;

    pastikan_status(&response, StatusCode::UNPROCESSABLE_ENTITY);
}

// --- Bertahan setelah backend disiapkan ulang ----------------------------------

#[tokio::test]
async fn catatan_bertahan_setelah_database_dibuka_ulang() {
    // Kriteria penerimaan #11: "Tidak hilang saat data browser dibersihkan" dan
    // "Sinkron antara laptop dan HP". Bagian yang bisa dibuktikan di backend adalah
    // bahwa Catatan ada di berkas, bukan di memori proses — itu yang membuatnya
    // muncul lagi dari perangkat lain juga.
    let aplikasi = AplikasiUji::baru().await;

    aplikasi
        .kirim_bertoken(permintaan_put_json(
            "/api/catatan/stack",
            &serde_json::json!({ "isi": "catatan yang saya tulis" }),
        ))
        .await;

    let berkas = aplikasi.berkas().to_path_buf();

    let pool = dsa_backend::db::buka(&berkas)
        .await
        .expect("database harus bisa dibuka ulang");
    let app_baru = pendukung::app_dari_pool(pool);

    let response = app_baru
        .oneshot(dengan_token(permintaan_get("/api/catatan/stack")))
        .await
        .unwrap();
    pastikan_status(&response, StatusCode::OK);

    assert_eq!(
        badan_json(response).await["isi"],
        "catatan yang saya tulis"
    );
}
