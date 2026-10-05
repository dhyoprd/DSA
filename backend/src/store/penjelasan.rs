//! Membaca dan menulis Kotak Penjelasan.
//!
//! Kotak Penjelasan disimpan per (Topik, Soal): tulisan pemelajar sendiri, alasan
//! jawabannya dengan kata sendiri. Sama seperti Progres, kuncinya adalah pasangan
//! (slug, indeks) karena Soal tidak punya `id` di skema YAML (issue #1).
//!
//! **Tidak ada aturan turunan di sini**, berbeda dari `progres` yang punya
//! `status_dari`. Satu-satunya operasi tulis adalah "ganti seluruh isi kotak", dan
//! tidak ada fakta lain yang bisa dihitung darinya. Karena itu modul ini tidak punya
//! bagian murni untuk diuji terpisah; perilakunya diuji di batas HTTP
//! (`tests/penjelasan.rs`), sesuai keputusan issue #1 bahwa uji perilaku hidup di
//! seam API.
//!
//! **Tidak ada penilaian.** Tulisan ini tidak dinilai otomatis (CONTEXT.md, issue #1
//! user story 28). Karena itu tidak ada kolom skor, dan tidak ada fungsi di sini yang
//! bisa menyatakan sebuah tulisan "benar" atau "salah".

use sqlx::SqlitePool;

/// Satu baris Kotak Penjelasan untuk sebuah Soal.
///
/// `diperbarui` selalu terisi: baris hanya ada kalau tulisan pernah disimpan, dan
/// setiap penyimpanan menyetel waktunya. Berbeda dari `progres.benar_terakhir` yang
/// boleh `NULL`, tidak ada keadaan "baris ada tetapi belum pernah diperbarui" di sini.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct Penjelasan {
    pub topik_slug: String,
    pub soal_indeks: i64,
    pub isi: String,
    pub diperbarui: String,
}

/// Simpan tulisan Kotak Penjelasan, lalu kembalikan keadaan barisnya.
///
/// Ganti-seluruh-isi, bukan tambah: pemelajar menyunting satu kotak, dan yang
/// tersimpan adalah keadaannya yang terakhir. `ON CONFLICT` membuat penyimpanan
/// pertama dan penyimpanan berikutnya lewat jalur yang sama — tidak ada "buat" dan
/// "perbarui" yang harus dibedakan pemanggilnya.
///
/// `RETURNING` dipakai supaya `diperbarui` datang dari database yang menuliskannya,
/// bukan dari jam proses backend. Satu sumber waktu, sama seperti Progres.
///
/// `isi` kosong diperbolehkan dan berarti pemelajar mengosongkan kotaknya. Barisnya
/// tidak dihapus: keberadaannya berarti "Kotak Penjelasan Soal ini pernah diisi",
/// dan menghapusnya hanya akan membuat dua cara berbeda untuk mencapai keadaan yang
/// sama.
pub async fn simpan(
    pool: &SqlitePool,
    topik_slug: &str,
    soal_indeks: i64,
    isi: &str,
) -> Result<Penjelasan, sqlx::Error> {
    sqlx::query_as::<_, Penjelasan>(
        r#"
        INSERT INTO penjelasan (topik_slug, soal_indeks, isi, diperbarui)
        VALUES (?1, ?2, ?3, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        ON CONFLICT (topik_slug, soal_indeks) DO UPDATE SET
            isi        = excluded.isi,
            diperbarui = excluded.diperbarui
        RETURNING topik_slug, soal_indeks, isi, diperbarui
        "#,
    )
    .bind(topik_slug)
    .bind(soal_indeks)
    .bind(isi)
    .fetch_one(pool)
    .await
}

/// Tulisan Kotak Penjelasan sebuah Soal, atau `None` kalau belum pernah disimpan.
///
/// `None` adalah keadaan yang normal, bukan galat: setiap Soal dimulai tanpa Kotak
/// Penjelasan. Karena itu pemanggilnya mengembalikan kotak kosong, bukan `404` —
/// lihat `routes::penjelasan`.
pub async fn ambil(
    pool: &SqlitePool,
    topik_slug: &str,
    soal_indeks: i64,
) -> Result<Option<Penjelasan>, sqlx::Error> {
    sqlx::query_as::<_, Penjelasan>(
        "SELECT topik_slug, soal_indeks, isi, diperbarui
         FROM penjelasan
         WHERE topik_slug = ?1 AND soal_indeks = ?2",
    )
    .bind(topik_slug)
    .bind(soal_indeks)
    .fetch_optional(pool)
    .await
}
