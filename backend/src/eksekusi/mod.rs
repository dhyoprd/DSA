//! Mesin Eksekusi Kode: menerima kode Python, menjalankannya, dan menilai test case-nya.
//!
//! Modul ini adalah pintu masuknya, dan isinya sengaja tipis: ia **mengurutkan**
//! langkah, bukan memutuskan aturannya. Aturan ukuran ada di [`batas`], aturan laju di
//! [`laju`], cara menjalankan di [`jalan`], bentuk data di [`hasil`], dan susunan
//! perintah `docker` di [`perintah`]. Masing-masing bisa berubah sendiri, dan yang
//! paling penting: [`batas`], [`perintah`], dan [`laju`] **murni**, sehingga bisa
//! diuji tanpa Docker sama sekali.
//!
//! Urutan langkahnya penting dan itu alasan modul ini ada: batas ukuran diperiksa
//! **sebelum** batas laju dicatat, supaya kiriman yang jelas salah tidak menghabiskan
//! jatah laju pemelajar. Kalau urutannya dibalik, sepuluh kali salah ketik akan
//! memblokir pemelajar selama satu menit.
//!
//! ## Dari mana test case datang, dan kenapa dari antarmuka
//!
//! Permintaan membawa `test_case` dan `fungsi` **dari Soal**, dikirim oleh antarmuka.
//! Itu terasa salah pada pandangan pertama — bukankah pemelajar jadi bisa mengirim
//! nilai harapan yang menguntungkan dirinya?
//!
//! Alasannya: **nilai harapan itu sudah ada di halaman**. Materi dan Soal hidup di git
//! dan menjadi halaman statis (ADR-0003), sehingga seluruh `test_case` — termasuk
//! `solusi_referensi` — ikut terkirim di payload halaman. Itu sudah diterima dan
//! dicatat untuk Pembahasan di ADR-0014 ("Pembahasan tertutup adalah aturan tampilan,
//! bukan rahasia"). Menyembunyikannya dari backend tidak menambah kerahasiaan apa pun
//! yang belum hilang di halaman.
//!
//! Alternatifnya — backend membaca `content/` sendiri — ditolak karena itu menyeret
//! pembacaan berkas ke dalam backend dan memindahkan Soal keluar dari git, persis yang
//! ADR-0003 dan ADR-0014 tolak. Yang dijaga backend di sini bukan **rahasia** test
//! case-nya, melainkan bahwa kode pemelajar tidak bisa keluar dari kotaknya.

pub mod batas;
pub mod hasil;
pub mod jalan;
pub mod laju;
pub mod perintah;

use std::time::Instant;

use hasil::{Hasil, Pekerjaan, TestCase};
use jalan::Penjalan;

pub use batas::{Pelanggaran, BATAS_UKURAN_KODE};
pub use hasil::Status;
pub use jalan::{PenjalanDocker, PenjalanPalsu};
pub use perintah::Image;

/// Permintaan Eksekusi Kode, apa adanya dari antarmuka.
///
/// `topik_slug` dan `soal_indeks` hanya dipakai untuk **pencatatan** — supaya log
/// menunjukkan Soal mana yang dijalankan. Yang benar-benar dijalankan adalah `kode`
/// terhadap `fungsi` dan `test_case` yang ikut di permintaan; lihat penjelasan modul
/// tentang kenapa test case datang dari antarmuka.
#[derive(Debug, Clone, serde::Deserialize)]
pub struct Permintaan {
    pub topik_slug: String,
    pub soal_indeks: i64,
    /// Kode Python yang ditulis pemelajar.
    pub kode: String,
    /// Nama fungsi yang dipanggil test case.
    pub fungsi: String,
    /// Test case Soal ini, dari halaman.
    pub test_case: Vec<TestCase>,
}

/// Mesin Eksekusi Kode, dirakit dari penjalan dan pembatas laju.
///
/// Dipegang di `AppState`, jadi satu instans melayani seluruh permintaan. Pembatas
/// lajunya memang harus bersama: batas per proses hanya bermakna kalau seluruh
/// permintaan melihat jejak yang sama.
pub struct Mesin {
    penjalan: std::sync::Arc<dyn Penjalan>,
    laju: laju::PembatasLaju,
}

impl Mesin {
    /// Rakit mesin dari penjalan yang diberikan.
    pub fn baru(penjalan: std::sync::Arc<dyn Penjalan>) -> Self {
        Mesin {
            penjalan,
            laju: laju::PembatasLaju::baru(),
        }
    }

    /// Jalankan satu permintaan pemelajar.
    ///
    /// Mengembalikan `Err` berisi [`Pelanggaran`] kalau permintaannya ditolak sebelum
    /// dijalankan. Pemanggil (route) yang memetakannya ke status HTTP.
    pub async fn jalankan(&self, permintaan: &Permintaan) -> Result<Hasil, Pelanggaran> {
        // Urutannya disengaja: batas ukuran lebih dulu, baru batas laju. Lihat
        // penjelasan modul.
        batas::periksa(&permintaan.kode, permintaan.test_case.len())?;

        if self.laju.catat(Instant::now()).is_err() {
            return Err(Pelanggaran::BatasLaju {
                batas: batas::BATAS_LAJU_MAKS,
                jendela_detik: batas::BATAS_LAJU_JENDELA_DETIK,
            });
        }

        let hasil = self.penjalan.jalankan(pekerjaan_dari(permintaan)).await;
        catat(&permintaan.topik_slug, permintaan.soal_indeks, &hasil);
        Ok(hasil)
    }

    /// Jalankan kode terhadap test case **tanpa** mencatat batas laju.
    ///
    /// Dipakai gerbang yang memeriksa solusi referensi: itu berjalan sekali saat
    /// build, bukan permintaan pemelajar, jadi ia tidak boleh memakan jatah laju
    /// siapa pun. Batas ukuran dan jumlah kasus **tetap** berlaku — solusi referensi
    /// yang terlalu besar juga tidak boleh lolos.
    pub async fn jalankan_tanpa_laju(
        &self,
        kode: &str,
        fungsi: &str,
        test_case: &[TestCase],
    ) -> Result<Hasil, Pelanggaran> {
        batas::periksa(kode, test_case.len())?;

        Ok(self
            .penjalan
            .jalankan(Pekerjaan {
                kode: kode.to_string(),
                fungsi: fungsi.to_string(),
                test_case: test_case.to_vec(),
            })
            .await)
    }
}

/// Susun pekerjaan runner dari permintaan.
fn pekerjaan_dari(permintaan: &Permintaan) -> Pekerjaan {
    Pekerjaan {
        kode: permintaan.kode.clone(),
        fungsi: permintaan.fungsi.clone(),
        test_case: permintaan.test_case.clone(),
    }
}

/// Catat satu eksekusi ke log.
///
/// ADR-0002 mewajibkan "pencatatan setiap eksekusi" sebagai mitigasi. Yang dicatat
/// adalah **metadata**, bukan kodenya: status, berapa kasus lulus, dan berapa lama.
/// Kode pemelajar sengaja tidak dicatat — ia tulisan pribadi, dan menyalinnya ke log
/// berarti menyimpan bahan yang tidak dibutuhkan.
fn catat(topik: &str, soal: i64, hasil: &Hasil) {
    let lulus = hasil.kasus.iter().filter(|k| k.lulus).count();

    match hasil.status {
        Status::Ok => tracing::info!(
            topik, soal, lulus, total = hasil.kasus.len(), durasi_ms = hasil.durasi_ms,
            "eksekusi selesai"
        ),
        // Status selain Ok berarti kodenya tidak sampai dinilai. Dicatat di tingkat
        // yang sama supaya pola penyalahgunaan (mis. banyak timeout berturut-turut)
        // terlihat di log yang sama.
        status => tracing::info!(
            topik, soal, ?status, durasi_ms = hasil.durasi_ms,
            "eksekusi tidak sampai dinilai"
        ),
    }
}
