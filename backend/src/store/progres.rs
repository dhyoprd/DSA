//! Membaca dan menulis Progres.
//!
//! Progres disimpan per (Topik, Soal). Satu-satunya operasi tulis yang dibutuhkan
//! situs ini adalah "Soal ini baru dijawab, benar atau salah" — tidak ada alur lain
//! yang mengubah Progres, jadi tidak ada operasi tulis lain di sini.

use sqlx::SqlitePool;

/// Status **sebuah Soal**, sesuai `docs/design-tree.md` (○ belum, ◐ sedang, ● selesai).
///
/// Nilainya **diturunkan**, tidak disimpan. Turunannya ada di [`status_dari`], dan
/// itu satu-satunya tempat aturan ini hidup — sama seperti daftar isi yang id-nya
/// dihitung di satu tempat (ADR-0009).
///
/// Ini status per Soal, bukan per Topik. User story 51 meminta status per Topik
/// (belum / sedang / selesai); aturan penggabungan Soal menjadi satu status Topik
/// belum ditetapkan di sini, karena yang menggambar sidebar adalah #8. Yang
/// disediakan modul ini adalah bahan mentahnya: `percobaan` dan `benar_terakhir`
/// per Soal.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Belum,
    Sedang,
    Selesai,
}

/// Satu baris Progres untuk sebuah Soal.
///
/// `benar_terakhir` berisi waktu jawaban benar yang paling akhir, atau `None` kalau
/// Soal ini belum pernah dijawab benar. Sekali terisi, ia **tidak pernah dikosongkan
/// kembali** — menjawab salah setelah benar tidak membatalkan pencapaian itu.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct Progres {
    pub topik_slug: String,
    pub soal_indeks: i64,
    pub percobaan: i64,
    pub benar_terakhir: Option<String>,
}

impl Progres {
    /// Status Soal ini: belum, sedang, atau selesai.
    pub fn status(&self) -> Status {
        status_dari(self.percobaan, self.benar_terakhir.is_some())
    }
}

/// Aturan status, dalam bentuk paling murni: dari dua fakta ke satu nilai.
///
/// Dipisah dari [`Progres`] supaya bisa diuji tanpa database sama sekali — aturan
/// inilah yang menentukan penanda ○ ◐ ●, dan salah di sini berarti sidebar berbohong
/// tanpa error apa pun.
///
/// - Belum pernah dicoba → `Belum`.
/// - Sudah dicoba tetapi belum pernah benar → `Sedang`.
/// - Pernah benar → `Selesai`, walaupun sesudahnya sempat salah lagi.
pub fn status_dari(percobaan: i64, pernah_benar: bool) -> Status {
    if pernah_benar {
        Status::Selesai
    } else if percobaan > 0 {
        Status::Sedang
    } else {
        Status::Belum
    }
}

/// Catat satu jawaban untuk sebuah Soal, lalu kembalikan keadaan barunya.
///
/// Satu operasi, bukan "baca lalu tulis": `RETURNING` membuat keadaan setelah
/// perubahan datang dari database yang sama yang menyimpannya, sehingga antarmuka
/// tidak perlu membaca ulang dan tidak bisa melihat keadaan yang basi.
///
/// `benar_terakhir` diisi hanya kalau `benar` bernilai true, dan tidak pernah
/// dikosongkan — `COALESCE` memilih nilai lama kalau sudah ada.
pub async fn catat(
    pool: &SqlitePool,
    topik_slug: &str,
    soal_indeks: i64,
    benar: bool,
) -> Result<Progres, sqlx::Error> {
    sqlx::query_as::<_, Progres>(
        r#"
        INSERT INTO progres (topik_slug, soal_indeks, percobaan, benar_terakhir)
        VALUES (
            ?1,
            ?2,
            1,
            CASE WHEN ?3 THEN strftime('%Y-%m-%dT%H:%M:%SZ', 'now') END
        )
        ON CONFLICT (topik_slug, soal_indeks) DO UPDATE SET
            percobaan      = progres.percobaan + 1,
            benar_terakhir = COALESCE(progres.benar_terakhir, excluded.benar_terakhir)
        RETURNING topik_slug, soal_indeks, percobaan, benar_terakhir
        "#,
    )
    .bind(topik_slug)
    .bind(soal_indeks)
    .bind(benar)
    .fetch_one(pool)
    .await
}

/// Seluruh Progres, urut Topik lalu Soal.
///
/// Dipakai untuk menggambar sidebar (status per Topik) dan, nanti, untuk Ekspor
/// (#14). Dikembalikan sebagai daftar apa adanya; pengelompokannya urusan pemanggil.
pub async fn semua(pool: &SqlitePool) -> Result<Vec<Progres>, sqlx::Error> {
    sqlx::query_as::<_, Progres>(
        "SELECT topik_slug, soal_indeks, percobaan, benar_terakhir
         FROM progres
         ORDER BY topik_slug, soal_indeks",
    )
    .fetch_all(pool)
    .await
}

#[cfg(test)]
mod tests {
    use super::{status_dari, Status};

    #[test]
    fn belum_dicoba_berarti_belum() {
        assert_eq!(status_dari(0, false), Status::Belum);
    }

    #[test]
    fn sudah_dicoba_tetapi_belum_benar_berarti_sedang() {
        assert_eq!(status_dari(1, false), Status::Sedang);
        assert_eq!(status_dari(7, false), Status::Sedang);
    }

    #[test]
    fn pernah_benar_berarti_selesai() {
        assert_eq!(status_dari(1, true), Status::Selesai);
    }

    #[test]
    fn salah_setelah_benar_tetap_selesai() {
        // Percobaan bertambah, tetapi pencapaian tidak dibatalkan.
        assert_eq!(status_dari(9, true), Status::Selesai);
    }
}
