//! Batas yang ditegakkan sebelum kode dijalankan.
//!
//! Modul ini **murni**: masukannya angka dan teks, keluarannya keputusan. Tidak ada
//! `docker`, tidak ada proses, tidak ada jam — sehingga aturannya bisa diuji tanpa
//! apa pun yang berjalan. Itu penting karena inilah satu-satunya pertahanan yang
//! berdiri di antara permintaan masuk dan proses yang menjalankan kode.
//!
//! **Kenapa batas ukuran dan jumlah kasus ditegakkan di sini, bukan di runner.**
//! Kode yang terlalu besar tidak perlu sampai ke kontainer sama sekali: menolaknya
//! lebih dulu menghemat satu siklus `docker run` (ratusan milidetik) dan menghindari
//! mengirim teks besar lewat stdin. Batas waktu berbeda — ia hanya bisa ditegakkan
//! dengan menjalankan kode, jadi tempatnya di [`super::jalan`].

/// Batas ukuran kode yang dikirim pemelajar, dalam byte.
///
/// 16 KB jauh lebih besar daripada Soal Kode yang wajar (solusi referensi Stack
/// sekitar 700 byte), tetapi cukup kecil untuk menolak kiriman yang jelas bukan
/// jawaban soal. Kriteria penerimaan #10 menuntut "kode yang melebihi batas ukuran
/// ditolak"; angka ini yang menjadi batasnya.
pub const BATAS_UKURAN_KODE: usize = 16 * 1024;

/// Batas jumlah test case per submission.
///
/// Satu Soal Kode Stack punya 5 kasus. Batas 32 memberi ruang untuk Topik lain yang
/// mungkin butuh lebih banyak, tanpa membiarkan satu submission menjalankan ribuan
/// kasus — yang akan membuat satu permintaan menahan kontainer jauh lebih lama
/// daripada batas waktunya.
pub const BATAS_JUMLAH_KASUS: usize = 32;

/// Batas waktu satu kali eksekusi, dalam detik.
///
/// Angka ini sama dengan batas yang ditetapkan `docs/design-tree.md` untuk produksi
/// (5 detik), supaya perilaku lokal dan produksi tidak berbeda. Yang menegakkannya
/// adalah penghancuran kontainer oleh backend — bukan proses Python di dalamnya.
pub const BATAS_WAKTU_DETIK: u64 = 5;

/// Batas laju: berapa eksekusi yang boleh dimulai dalam satu jendela waktu.
///
/// Di produksi ADR-0002 mewajibkan "batas laju per IP". Di lokal hanya ada satu
/// pengguna, jadi angka ini longgar — fungsinya menahan satu tab yang tersangkut
/// mengirim berulang, bukan menahan penyalahgunaan.
pub const BATAS_LAJU_MAKS: usize = 30;

/// Panjang jendela batas laju, dalam detik.
pub const BATAS_LAJU_JENDELA_DETIK: u64 = 60;

/// Alasan sebuah permintaan ditolak sebelum dijalankan.
///
/// Varian, bukan `String`, supaya pemanggil bisa memetakannya ke status HTTP yang
/// berbeda dan ke kalimat yang berbeda tanpa mencocokkan teks pesan.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Pelanggaran {
    /// Kode melebihi [`BATAS_UKURAN_KODE`].
    UkuranKode { ukuran: usize, batas: usize },
    /// Jumlah test case melebihi [`BATAS_JUMLAH_KASUS`].
    JumlahKasus { jumlah: usize, batas: usize },
    /// Terlalu banyak eksekusi dalam jendela waktu terakhir.
    BatasLaju { batas: usize, jendela_detik: u64 },
    /// Kode kosong — tidak ada yang bisa dijalankan.
    KodeKosong,
}

impl Pelanggaran {
    /// Nama mesin-terbaca untuk pelanggaran ini, dalam bentuk kebab-case.
    ///
    /// **Kenapa ada, padahal sudah ada [`pesan`](Self::pesan).** `pesan` selalu
    /// berbahasa Indonesia, sedangkan situs ini dua bahasa. Antarmuka perlu tahu
    /// **jenis** pelanggarannya supaya bisa memilih kalimatnya sendiri dari kamus —
    /// menampilkan pesan Indonesia di antarmuka English adalah cacat yang tidak
    /// terlihat dari uji backend.
    ///
    /// Nilainya sengaja stabil dan sempit: menambah varian berarti menambah satu
    /// kalimat di kamus, dan antarmuka yang tidak mengenalinya tetap punya `pesan`
    /// sebagai cadangan.
    pub fn jenis(&self) -> &'static str {
        match self {
            Pelanggaran::KodeKosong => "kode-kosong",
            Pelanggaran::UkuranKode { .. } => "ukuran-kode",
            Pelanggaran::JumlahKasus { .. } => "jumlah-kasus",
            Pelanggaran::BatasLaju { .. } => "batas-laju",
        }
    }

    /// Kalimat yang bisa ditampilkan ke pemelajar, dalam bahasa Indonesia.
    ///
    /// **Kenapa backend, bukan kamus antarmuka.** Ini pesan tentang **permintaan yang
    /// ditolak**, bukan tentang isi pelajaran, dan bentuknya sama di kedua bahasa
    /// karena berisi angka. Menaruhnya di sini menjaga batas dan pesannya tetap satu
    /// tempat — pesan yang menyebut angka berbeda dari batas yang ditegakkan adalah
    /// kelas cacat yang sulit terlihat.
    ///
    /// Antarmuka memakai [`jenis`](Self::jenis) untuk memilih kalimatnya sendiri, dan
    /// pesan ini menjadi cadangan kalau jenisnya belum dikenal.
    pub fn pesan(&self) -> String {
        match *self {
            Pelanggaran::KodeKosong => "Kode masih kosong.".to_string(),
            Pelanggaran::UkuranKode { ukuran, batas } => format!(
                "Kode terlalu panjang: {ukuran} byte, batasnya {batas} byte."
            ),
            Pelanggaran::JumlahKasus { jumlah, batas } => format!(
                "Soal ini punya {jumlah} test case, melebihi batas {batas}."
            ),
            Pelanggaran::BatasLaju {
                batas,
                jendela_detik,
            } => format!(
                "Terlalu banyak eksekusi: paling banyak {batas} kali per {jendela_detik} detik. \
                 Tunggu sebentar lalu coba lagi."
            ),
        }
    }
}

/// Periksa ukuran kode dan jumlah test case.
///
/// Mengembalikan `Ok(())` kalau keduanya memenuhi batas, atau `Err` berisi
/// pelanggaran **pertama** yang ditemukan. Berhenti di yang pertama disengaja:
/// pemelajar hanya perlu tahu satu hal yang harus diperbaiki, dan ukuran kode yang
/// salah membuat pemeriksaan jumlah kasus tidak berguna.
///
/// Yang diukur adalah **byte**, bukan jumlah karakter: itulah yang menentukan berapa
/// besar yang dikirim lewat stdin, dan itu yang dibatasi.
pub fn periksa(kode: &str, jumlah_kasus: usize) -> Result<(), Pelanggaran> {
    if kode.trim().is_empty() {
        return Err(Pelanggaran::KodeKosong);
    }

    let ukuran = kode.len();
    if ukuran > BATAS_UKURAN_KODE {
        return Err(Pelanggaran::UkuranKode {
            ukuran,
            batas: BATAS_UKURAN_KODE,
        });
    }

    if jumlah_kasus > BATAS_JUMLAH_KASUS {
        return Err(Pelanggaran::JumlahKasus {
            jumlah: jumlah_kasus,
            batas: BATAS_JUMLAH_KASUS,
        });
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kode_kosong_ditolak() {
        assert_eq!(periksa("", 0), Err(Pelanggaran::KodeKosong));
        assert_eq!(periksa("   \n\t ", 0), Err(Pelanggaran::KodeKosong));
    }

    #[test]
    fn kode_biasa_diterima() {
        assert_eq!(periksa("def proses(x):\n    return x\n", 5), Ok(()));
    }

    #[test]
    fn kode_tepat_di_batas_diterima() {
        // Tepat di batas harus lolos; yang ditolak adalah yang **melebihi**.
        let kode = "a".repeat(BATAS_UKURAN_KODE);
        assert_eq!(periksa(&kode, 1), Ok(()));
    }

    #[test]
    fn kode_satu_byte_lebih_ditolak() {
        let kode = "a".repeat(BATAS_UKURAN_KODE + 1);
        assert_eq!(
            periksa(&kode, 1),
            Err(Pelanggaran::UkuranKode {
                ukuran: BATAS_UKURAN_KODE + 1,
                batas: BATAS_UKURAN_KODE,
            })
        );
    }

    #[test]
    fn ukuran_dihitung_dalam_byte_bukan_karakter() {
        // Huruf beraksen dua byte di UTF-8: 8192 karakter = 16384 byte, tepat di
        // batas. Kalau yang dihitung jumlah karakter, ini akan tampak jauh di bawah
        // batas dan tidak menangkap kiriman yang sebenarnya dua kali lebih besar.
        let kode = "é".repeat(BATAS_UKURAN_KODE / 2);
        assert_eq!(periksa(&kode, 1), Ok(()));

        let kode_lebih = "é".repeat(BATAS_UKURAN_KODE / 2 + 1);
        assert!(matches!(
            periksa(&kode_lebih, 1),
            Err(Pelanggaran::UkuranKode { .. })
        ));
    }

    #[test]
    fn jumlah_kasus_tepat_di_batas_diterima() {
        assert_eq!(periksa("x = 1", BATAS_JUMLAH_KASUS), Ok(()));
    }

    #[test]
    fn jumlah_kasus_lebih_ditolak() {
        assert_eq!(
            periksa("x = 1", BATAS_JUMLAH_KASUS + 1),
            Err(Pelanggaran::JumlahKasus {
                jumlah: BATAS_JUMLAH_KASUS + 1,
                batas: BATAS_JUMLAH_KASUS,
            })
        );
    }

    #[test]
    fn ukuran_diperiksa_sebelum_jumlah_kasus() {
        // Keduanya melanggar; yang dilaporkan adalah ukuran, karena kode yang tidak
        // bisa dikirim membuat jumlah kasusnya tidak relevan.
        let kode = "a".repeat(BATAS_UKURAN_KODE + 1);
        assert!(matches!(
            periksa(&kode, BATAS_JUMLAH_KASUS + 1),
            Err(Pelanggaran::UkuranKode { .. })
        ));
    }

    #[test]
    fn pesan_menyebut_angka_yang_ditegakkan() {
        // Pesan yang menyebut angka berbeda dari batas yang ditegakkan adalah cacat
        // yang tidak terlihat sampai pemelajar bingung. Uji ini mengikat keduanya.
        let pesan = Pelanggaran::UkuranKode {
            ukuran: 99999,
            batas: BATAS_UKURAN_KODE,
        }
        .pesan();
        assert!(pesan.contains(&BATAS_UKURAN_KODE.to_string()), "{pesan}");

        let pesan = Pelanggaran::JumlahKasus {
            jumlah: 100,
            batas: BATAS_JUMLAH_KASUS,
        }
        .pesan();
        assert!(pesan.contains(&BATAS_JUMLAH_KASUS.to_string()), "{pesan}");
    }
}
