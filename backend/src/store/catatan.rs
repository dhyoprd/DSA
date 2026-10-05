//! Membaca dan menulis Catatan.
//!
//! Catatan disimpan per **Topik** — satu baris per slug, bukan per Soal seperti
//! Kotak Penjelasan. CONTEXT.md mendefinisikannya sebagai "tulisanmu sendiri tentang
//! sebuah Topik", jadi kuncinya slug Topik saja.
//!
//! **Tidak ada aturan turunan di sini**, sama seperti `penjelasan`. Satu-satunya
//! operasi tulis adalah "ganti seluruh isi Catatan satu Topik", dan tidak ada fakta
//! lain yang bisa dihitung darinya. Karena itu modul ini tidak punya bagian murni
//! untuk diuji terpisah; perilakunya diuji di batas HTTP (`tests/catatan.rs`),
//! sesuai keputusan issue #1 bahwa uji perilaku hidup di seam API.
//!
//! **Tidak ada penilaian.** Catatan ditulis pemelajar untuk dirinya sendiri (issue #1
//! user story 55), bukan sesuatu yang dinilai. Karena itu tidak ada kolom skor, dan
//! tidak ada fungsi di sini yang bisa menyatakan sebuah Catatan "benar" atau "salah".

use sqlx::SqlitePool;

/// Satu baris Catatan untuk sebuah Topik.
///
/// `diperbarui` selalu terisi: baris hanya ada kalau Catatan pernah disimpan, dan
/// setiap penyimpanan menyetel waktunya. Tidak ada keadaan "baris ada tetapi belum
/// pernah diperbarui" di sini.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct Catatan {
    pub topik_slug: String,
    pub isi: String,
    pub diperbarui: String,
}

/// Simpan Catatan sebuah Topik, lalu kembalikan keadaan barisnya.
///
/// Ganti-seluruh-isi, bukan tambah: pemelajar menyunting satu editor, dan yang
/// tersimpan adalah keadaannya yang terakhir. `ON CONFLICT` membuat penyimpanan
/// pertama dan penyimpanan berikutnya lewat jalur yang sama — tidak ada "buat" dan
/// "perbarui" yang harus dibedakan pemanggilnya.
///
/// `RETURNING` dipakai supaya `diperbarui` datang dari database yang menuliskannya,
/// bukan dari jam proses backend. Satu sumber waktu, sama seperti Progres dan Kotak
/// Penjelasan.
///
/// `isi` kosong diperbolehkan dan berarti pemelajar mengosongkan Catatannya.
/// Barisnya tidak dihapus: keberadaannya berarti "Catatan Topik ini pernah diisi".
pub async fn simpan(pool: &SqlitePool, topik_slug: &str, isi: &str) -> Result<Catatan, sqlx::Error> {
    sqlx::query_as::<_, Catatan>(
        r#"
        INSERT INTO catatan (topik_slug, isi, diperbarui)
        VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        ON CONFLICT (topik_slug) DO UPDATE SET
            isi        = excluded.isi,
            diperbarui = excluded.diperbarui
        RETURNING topik_slug, isi, diperbarui
        "#,
    )
    .bind(topik_slug)
    .bind(isi)
    .fetch_one(pool)
    .await
}

/// Catatan sebuah Topik, atau `None` kalau belum pernah disimpan.
///
/// `None` adalah keadaan yang normal, bukan galat: setiap Topik dimulai tanpa
/// Catatan. Karena itu pemanggilnya mengembalikan Catatan kosong, bukan `404` —
/// lihat `routes::catatan`.
pub async fn ambil(pool: &SqlitePool, topik_slug: &str) -> Result<Option<Catatan>, sqlx::Error> {
    sqlx::query_as::<_, Catatan>(
        "SELECT topik_slug, isi, diperbarui
         FROM catatan
         WHERE topik_slug = ?1",
    )
    .bind(topik_slug)
    .fetch_optional(pool)
    .await
}
