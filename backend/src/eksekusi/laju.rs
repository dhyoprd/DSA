//! Batas laju eksekusi: berapa kali kode boleh dijalankan dalam satu jendela waktu.
//!
//! ADR-0002 mewajibkan "batas laju per IP" sebagai mitigasi wajib. Di lokal hanya ada
//! satu pengguna, jadi batasnya longgar — yang ditahan adalah satu tab yang tersangkut
//! mengirim berulang, bukan penyalahgunaan.
//!
//! **Jam-nya disuntik, tidak dibaca dari `Instant::now()`.** Itu yang membuat aturan
//! ini bisa diuji tanpa menunggu: uji memajukan waktu sendiri, lalu memeriksa
//! keputusannya. Batas laju yang diuji dengan `sleep` akan memperlambat seluruh suite
//! dan tetap rapuh terhadap mesin yang lambat.
//!
//! **Kenapa di memori, bukan di database.** Batas ini hanya perlu bertahan selama
//! proses backend hidup, dan ia tidak boleh menambah tulisan database ke jalur yang
//! justru sedang dibatasi. Backend di sini satu proses; kalau kelak ia berjalan di
//! beberapa replika, batas per proses tidak lagi cukup dan itu keputusan tersendiri.

use std::collections::VecDeque;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use super::batas::{BATAS_LAJU_JENDELA_DETIK, BATAS_LAJU_MAKS};

/// Pencatat waktu eksekusi terakhir, dan keputusan boleh-tidaknya satu eksekusi baru.
pub struct PembatasLaju {
    /// Waktu eksekusi terakhir, terlama di depan. Hanya yang masih di dalam jendela
    /// yang disimpan; yang lebih tua dibuang saat memeriksa.
    jejak: Mutex<VecDeque<Instant>>,
    maks: usize,
    jendela: Duration,
}

impl PembatasLaju {
    /// Batas laju dengan angka bawaan dari `batas.rs`.
    pub fn baru() -> Self {
        Self::dengan_batas(BATAS_LAJU_MAKS, BATAS_LAJU_JENDELA_DETIK)
    }

    /// Batas laju dengan angka yang ditentukan — dipakai uji.
    pub fn dengan_batas(maks: usize, jendela_detik: u64) -> Self {
        PembatasLaju {
            jejak: Mutex::new(VecDeque::new()),
            maks,
            jendela: Duration::from_secs(jendela_detik),
        }
    }

    /// Catat satu eksekusi baru, atau tolak kalau jendelanya sudah penuh.
    ///
    /// Mengembalikan `Ok(())` kalau eksekusi boleh dimulai, atau `Err` berisi jumlah
    /// eksekusi di jendela itu. Pencatatan terjadi di sini juga — pemanggil tidak
    /// perlu mengingat untuk mencatat terpisah, dan itu menutup celah "lupa mencatat"
    /// yang akan membuat batasnya tidak pernah tercapai.
    ///
    /// **Kunci mutex dipegang selama pemeriksaan dan pencatatan.** Kalau dilepas di
    /// antaranya, dua permintaan bersamaan bisa sama-sama melihat jendela yang belum
    /// penuh lalu sama-sama mencatat — dan batasnya terlewati tepat pada saat ia
    /// paling dibutuhkan.
    pub fn catat(&self, sekarang: Instant) -> Result<(), usize> {
        let mut jejak = self.jejak.lock().unwrap_or_else(|galat| {
            // Mutex yang teracuni berarti ada thread yang panic saat memegangnya.
            // Keadaannya tetap bisa dipakai (isi `VecDeque` utuh), dan menolak semua
            // eksekusi setelah itu akan mematikan fitur tanpa alasan yang jelas —
            // jadi racunnya diabaikan, bukan dijadikan galat.
            galat.into_inner()
        });

        // Buang yang sudah keluar jendela. Dilakukan setiap kali, bukan oleh timer:
        // dengan begitu tidak ada pekerjaan latar yang harus hidup.
        let batas_bawah = sekarang.checked_sub(self.jendela);
        while let Some(depan) = jejak.front() {
            match batas_bawah {
                Some(batas) if *depan < batas => {
                    jejak.pop_front();
                }
                // `checked_sub` gagal berarti `sekarang` lebih awal daripada jendela
                // sejak titik nol waktu — praktisnya hanya di uji. Tidak ada yang
                // dibuang.
                _ => break,
            }
        }

        if jejak.len() >= self.maks {
            return Err(jejak.len());
        }

        jejak.push_back(sekarang);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn eksekusi_di_bawah_batas_diterima() {
        let pembatas = PembatasLaju::dengan_batas(3, 60);
        let awal = Instant::now();
        assert_eq!(pembatas.catat(awal), Ok(()));
        assert_eq!(pembatas.catat(awal), Ok(()));
        assert_eq!(pembatas.catat(awal), Ok(()));
    }

    #[test]
    fn eksekusi_melebihi_batas_ditolak() {
        let pembatas = PembatasLaju::dengan_batas(3, 60);
        let awal = Instant::now();
        for _ in 0..3 {
            assert_eq!(pembatas.catat(awal), Ok(()));
        }
        // Yang keempat ditolak, dan jumlahnya dilaporkan supaya pesannya bisa jujur.
        assert_eq!(pembatas.catat(awal), Err(3));
    }

    #[test]
    fn jendela_bergerak_seiring_waktu() {
        let pembatas = PembatasLaju::dengan_batas(2, 60);
        let awal = Instant::now();

        assert_eq!(pembatas.catat(awal), Ok(()));
        assert_eq!(pembatas.catat(awal), Ok(()));
        assert!(pembatas.catat(awal).is_err());

        // 61 detik kemudian, kedua eksekusi lama sudah keluar jendela.
        let nanti = awal + Duration::from_secs(61);
        assert_eq!(pembatas.catat(nanti), Ok(()));
        assert_eq!(pembatas.catat(nanti), Ok(()));
        assert!(pembatas.catat(nanti).is_err());
    }

    #[test]
    fn hanya_yang_di_luar_jendela_yang_dibuang() {
        let pembatas = PembatasLaju::dengan_batas(2, 60);
        let awal = Instant::now();

        assert_eq!(pembatas.catat(awal), Ok(()));
        // 30 detik kemudian: yang pertama masih di dalam jendela (30 < 60), jadi
        // hanya satu slot yang tersisa.
        let tengah = awal + Duration::from_secs(30);
        assert_eq!(pembatas.catat(tengah), Ok(()));
        assert!(pembatas.catat(tengah).is_err());

        // 61 detik dari awal: yang pertama sudah keluar, yang kedua (di detik 30)
        // masih di dalam (61 - 30 = 31 < 60).
        let nanti = awal + Duration::from_secs(61);
        assert_eq!(pembatas.catat(nanti), Ok(()));
        assert!(pembatas.catat(nanti).is_err());
    }

    #[test]
    fn batas_nol_menolak_semuanya() {
        let pembatas = PembatasLaju::dengan_batas(0, 60);
        assert!(pembatas.catat(Instant::now()).is_err());
    }
}
