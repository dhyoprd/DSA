//! Menjalankan satu pekerjaan di dalam kontainer, dengan batas waktu.
//!
//! Di sinilah batas waktu benar-benar ditegakkan — bukan di runner. Proses Python
//! yang berputar tanpa henti tidak bisa menghentikan dirinya sendiri dengan andal,
//! jadi yang membunuh adalah backend, dengan menghancurkan kontainernya.
//!
//! **Kenapa ada trait [`Penjalan`].** Route uji harus bisa memeriksa kontrak HTTP-nya
//! (400 untuk kode terlalu panjang, 429 untuk batas laju, 200 untuk hasil) tanpa
//! menjalankan Docker. Dengan penjalan disuntik lewat `AppState`, uji route memakai
//! [`PenjalanPalsu`] dan tetap cepat, sementara produksi memakai [`PenjalanDocker`].
//! Ini bukan abstraksi di depan kebutuhan: kedua implementasinya nyata dan dipakai.
//!
//! **Kenapa method-nya mengembalikan `Pin<Box<dyn Future>>`, bukan `async fn`.**
//! `AppState` menyimpan penjalan sebagai `Arc<dyn Penjalan>` supaya route tidak perlu
//! tahu implementasinya. `async fn` di dalam trait tidak object-safe, jadi bentuk
//! eksplisit itu dipakai — dengan konsekuensi satu alokasi `Box` per eksekusi, yang
//! tidak berarti apa-apa dibanding satu siklus `docker run`.

use std::future::Future;
use std::pin::Pin;
use std::process::Stdio;
use std::time::{Duration, Instant};

use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::process::Command;

use super::batas::BATAS_WAKTU_DETIK;
use super::hasil::{BalasanRunner, Hasil, Pekerjaan, Status};
use super::perintah::{argumen_docker, Image};

/// Cara menjalankan satu pekerjaan.
pub trait Penjalan: Send + Sync + 'static {
    /// Jalankan satu pekerjaan dan kembalikan hasilnya.
    ///
    /// Tidak pernah melempar: setiap kegagalan — termasuk Docker yang tidak bisa
    /// dijalankan — dikembalikan sebagai [`Hasil`] dengan status yang sesuai. Itu
    /// membuat pemanggil di route hanya punya satu bentuk yang harus ditangani, dan
    /// galat infrastruktur tetap sampai ke pemelajar sebagai pesan, bukan `500` polos.
    fn jalankan<'a>(
        &'a self,
        pekerjaan: Pekerjaan,
    ) -> Pin<Box<dyn Future<Output = Hasil> + Send + 'a>>;
}

/// Penjalan sungguhan: satu kontainer sekali pakai per pekerjaan.
pub struct PenjalanDocker {
    image: Image,
    batas_waktu: Duration,
}

impl PenjalanDocker {
    /// Penjalan dengan batas waktu bawaan dari `batas.rs`.
    pub fn baru(image: Image) -> Self {
        PenjalanDocker {
            image,
            batas_waktu: Duration::from_secs(BATAS_WAKTU_DETIK),
        }
    }

    /// Penjalan dengan batas waktu yang ditentukan — dipakai uji.
    pub fn dengan_batas_waktu(image: Image, batas_waktu: Duration) -> Self {
        PenjalanDocker {
            image,
            batas_waktu,
        }
    }
}

impl Penjalan for PenjalanDocker {
    fn jalankan<'a>(
        &'a self,
        pekerjaan: Pekerjaan,
    ) -> Pin<Box<dyn Future<Output = Hasil> + Send + 'a>> {
        Box::pin(async move {
            let mulai = Instant::now();
            let nama = nama_kontainer();

            let mut perintah = Command::new("docker");
            perintah
                .args(argumen_docker(&self.image, &nama))
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                // Kalau backend mati saat kontainer berjalan, proses kliennya harus
                // ikut mati — bukan hidup tanpa pemilik sampai batas waktunya habis.
                .kill_on_drop(true);

            let mut anak = match perintah.spawn() {
                Ok(anak) => anak,
                Err(galat) => {
                    // Docker tidak ada, atau daemonnya mati. Ini keadaan infrastruktur,
                    // bukan kesalahan pemelajar, dan pesannya harus mengatakan itu.
                    return Hasil::tanpa_eksekusi(
                        Status::GalatDocker,
                        format!("tidak bisa menjalankan Docker: {galat}"),
                    );
                }
            };

            // Pekerjaan dikirim lewat stdin, lalu stdin ditutup. Penutupan itu penting:
            // tanpa itu `runner.py` menunggu input selamanya dan setiap eksekusi
            // berakhir sebagai lewat-waktu.
            if let Some(mut masuk) = anak.stdin.take() {
                match serde_json::to_vec(&pekerjaan) {
                    Ok(isi) => {
                        if let Err(galat) = masuk.write_all(&isi).await {
                            // Kontainer yang langsung mati membuat penulisan stdin
                            // gagal. Bukan akhir cerita: keluarannya masih dibaca di
                            // bawah, dan kegagalan itu bisa jadi justru sebabnya.
                            tracing::debug!(error = %galat, "gagal menulis pekerjaan ke stdin kontainer");
                        }
                    }
                    Err(galat) => {
                        return Hasil::tanpa_eksekusi(
                            Status::GalatProtokol,
                            format!("pekerjaan tidak bisa diserialisasi: {galat}"),
                        );
                    }
                }
                let _ = masuk.shutdown().await;
            }

            // stdout dan stderr diambil sebelum menunggu, supaya keduanya bisa dibaca
            // bersamaan dengan `wait` dan tidak ada yang mengisi pipa sampai penuh
            // lalu memblokir proses.
            let mut pipa_out = anak.stdout.take().expect("stdout dipasang di atas");
            let mut pipa_err = anak.stderr.take().expect("stderr dipasang di atas");

            let menunggu = async {
                let (keluar, galat, status) = tokio::join!(
                    baca_habis(&mut pipa_out),
                    baca_habis(&mut pipa_err),
                    anak.wait(),
                );
                (keluar, galat, status)
            };

            // Batas waktu ditegakkan di sini. `tokio::time::timeout` dipilih, bukan
            // hanya `kill_on_drop`: yang pertama membiarkan backend tahu **bahwa**
            // batasnya terlampaui, dan itulah yang membedakan pesan lewat-waktu dari
            // pesan galat sintaks — kriteria penerimaan #10.
            match tokio::time::timeout(self.batas_waktu, menunggu).await {
                Ok((keluar, galat, status)) => {
                    let durasi_ms = mulai.elapsed().as_millis();
                    let kode = status.ok().and_then(|s| s.code());
                    tafsirkan(&keluar, &galat, kode, durasi_ms)
                }
                Err(_) => {
                    // Batas waktu terlampaui. Kontainer dibunuh **lewat namanya**,
                    // bukan lewat handle proses: membunuh `docker run` saja
                    // meninggalkan kontainer hidup dan terus memakai CPU
                    // (terverifikasi saat membangun ticket ini).
                    bunuh(&nama).await;

                    // Proses kliennya menyusul sendiri setelah kontainernya mati —
                    // tetapi penantiannya **dibatasi waktu**. Kalau `docker kill`
                    // gagal (daemon yang macet, izin yang berubah), menunggu tanpa
                    // batas berarti permintaan ini menggantung selamanya dan
                    // menahan satu tugas backend — persis yang dilarang kriteria
                    // penerimaan #10 ("backend tetap melayani permintaan
                    // berikutnya"). `kill_on_drop` tetap menjadi jaring terakhir
                    // saat handle ini jatuh.
                    let _ = tokio::time::timeout(Duration::from_secs(10), anak.wait()).await;

                    let mut hasil = Hasil::tanpa_eksekusi(
                        Status::LewatWaktu,
                        format!(
                            "Kode berjalan lebih dari {} detik lalu dihentikan.",
                            self.batas_waktu.as_secs()
                        ),
                    );
                    hasil.durasi_ms = mulai.elapsed().as_millis();
                    hasil
                }
            }
        })
    }
}

/// Baca seluruh isi sebuah pipa. Kegagalan membaca dikembalikan sebagai `Vec` kosong:
/// yang dibutuhkan di sini hanya apa yang sempat terbaca, dan galat pipa bukan
/// informasi yang berguna bagi pemelajar.
///
/// Generik atas `AsyncRead` karena stdout dan stderr punya tipe yang berbeda
/// (`ChildStdout` dan `ChildStderr`) walau keduanya pipa.
async fn baca_habis<P: tokio::io::AsyncRead + Unpin>(pipa: &mut P) -> Vec<u8> {
    let mut penyangga = Vec::new();
    let _ = pipa.read_to_end(&mut penyangga).await;
    penyangga
}

/// Bunuh kontainer lewat namanya.
///
/// Galatnya sengaja diabaikan: kontainer mungkin sudah selesai sendiri di antara
/// timeout dan pemanggilan ini, dan itu bukan masalah. Yang penting tidak ada
/// kontainer yang tertinggal hidup.
async fn bunuh(nama: &str) {
    let hasil = Command::new("docker")
        .args(["kill", nama])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .output()
        .await;

    match hasil {
        Ok(keluaran) if keluaran.status.success() => {
            tracing::info!(kontainer = nama, "kontainer dibunuh karena lewat batas waktu");
        }
        Ok(_) => {
            // Hampir selalu berarti kontainer sudah selesai sendiri. Tingkat debug
            // supaya tidak berisik pada setiap timeout.
            tracing::debug!(kontainer = nama, "kontainer tidak bisa dibunuh (mungkin sudah selesai)");
        }
        Err(galat) => {
            tracing::warn!(kontainer = nama, error = %galat, "gagal memanggil docker kill");
        }
    }
}

/// Ubah keluaran kontainer menjadi [`Hasil`].
///
/// Menerima bagian-bagiannya, bukan `std::process::Output`, supaya bisa diuji di
/// platform mana pun — membangun `Output` secara manual menuntut API khusus Unix
/// atau Windows, dan uji ini justru harus berjalan di mesin pengembangan Windows.
fn tafsirkan(stdout: &[u8], stderr: &[u8], kode_keluar: Option<i32>, durasi_ms: u128) -> Hasil {
    let teks_out = String::from_utf8_lossy(stdout);
    let baris = teks_out.trim();

    if baris.is_empty() {
        // Kontainer yang dibunuh karena kehabisan memori berhenti tanpa menulis apa
        // pun ke stdout. Itu harus terbaca sebagai kontainer yang gagal — bukan
        // sebagai "ok tanpa kasus" yang membingungkan.
        let teks_err = String::from_utf8_lossy(stderr);
        let pesan = if teks_err.trim().is_empty() {
            format!(
                "Kode berhenti tanpa hasil (keluar dengan status {}). \
                 Biasanya ini karena memori yang dipakai melebihi batas.",
                kode_keluar.map_or("tidak diketahui".to_string(), |k| k.to_string())
            )
        } else {
            format!("Kode berhenti tanpa hasil: {}", teks_err.trim())
        };
        return Hasil::tanpa_eksekusi(Status::KontainerGagal, pesan);
    }

    match serde_json::from_str::<BalasanRunner>(baris) {
        Ok(balasan) => Hasil {
            status: balasan.status,
            kasus: balasan.kasus,
            keluaran: balasan.keluaran,
            pesan: balasan.pesan,
            durasi_ms,
        },
        Err(galat) => {
            // Kontainer menulis sesuatu yang bukan JSON. Hampir selalu berarti image
            // runner-nya salah (mis. `python` yang tidak menjalankan `runner.py`).
            // Pesannya menyertakan potongan keluarannya supaya penyebabnya terlihat.
            let potongan: String = baris.chars().take(300).collect();
            Hasil::tanpa_eksekusi(
                Status::GalatRunner,
                format!("balasan runner tidak bisa dibaca ({galat}): {potongan}"),
            )
        }
    }
}

/// Nama kontainer yang unik per eksekusi.
///
/// Unik supaya dua eksekusi yang berjalan bersamaan tidak saling membunuh saat salah
/// satunya lewat batas waktu — `docker kill <nama>` akan mengenai yang salah, dan
/// pemelajar melihat pesan lewat-waktu untuk kode yang sebenarnya selesai.
fn nama_kontainer() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    static URUTAN: AtomicU64 = AtomicU64::new(0);

    let urutan = URUTAN.fetch_add(1, Ordering::Relaxed);
    let waktu = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);

    // Yang dibutuhkan hanya unik di dalam satu mesin, jadi waktu + penghitung sudah
    // cukup; menambah dependensi acak untuk ini tidak sebanding.
    format!("dsa-eksekusi-{:x}-{:x}", waktu, urutan)
}

/// Penjalan palsu untuk uji: mengembalikan hasil yang sudah disiapkan.
///
/// Dipakai uji route supaya kontrak HTTP-nya (status, bentuk badan) bisa diperiksa
/// tanpa menjalankan Docker. Uji yang benar-benar menjalankan kode ada di
/// `runner/` (uji Python) dan di gerbang `npm run verifikasi-soal`.
pub struct PenjalanPalsu {
    hasil: std::sync::Mutex<Option<Hasil>>,
    /// Berapa kali `jalankan` dipanggil. Dipakai uji untuk membuktikan jalur batas
    /// ukuran dan batas laju **tidak** sampai menyentuh penjalan.
    pub jumlah_panggilan: std::sync::atomic::AtomicUsize,
}

impl PenjalanPalsu {
    /// Penjalan palsu yang selalu mengembalikan hasil ini.
    pub fn mengembalikan(hasil: Hasil) -> Self {
        PenjalanPalsu {
            hasil: std::sync::Mutex::new(Some(hasil)),
            jumlah_panggilan: std::sync::atomic::AtomicUsize::new(0),
        }
    }
}

impl Penjalan for PenjalanPalsu {
    fn jalankan<'a>(
        &'a self,
        _pekerjaan: Pekerjaan,
    ) -> Pin<Box<dyn Future<Output = Hasil> + Send + 'a>> {
        Box::pin(async move {
            self.jumlah_panggilan
                .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            self.hasil
                .lock()
                .unwrap_or_else(|galat| galat.into_inner())
                .clone()
                .unwrap_or_else(|| Hasil::tanpa_eksekusi(Status::Ok, ""))
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn balasan_json_yang_sah_dibaca() {
        let hasil = tafsirkan(
            br#"{"status":"ok","kasus":[],"keluaran":"","pesan":null}"#,
            b"",
            Some(0),
            42,
        );
        assert_eq!(hasil.status, Status::Ok);
        assert_eq!(hasil.durasi_ms, 42);
    }

    #[test]
    fn balasan_kosong_menjadi_kontainer_gagal() {
        // Inilah bentuk OOM: exit 137, stdout kosong. Harus terbaca sebagai
        // kontainer yang gagal, bukan sebagai "ok tanpa kasus".
        let hasil = tafsirkan(b"", b"", Some(137), 10);
        assert_eq!(hasil.status, Status::KontainerGagal);
        assert!(hasil.pesan.is_some());
    }

    #[test]
    fn balasan_bukan_json_menjadi_galat_runner() {
        let hasil = tafsirkan(b"Traceback (most recent call last):", b"", Some(1), 10);
        assert_eq!(hasil.status, Status::GalatRunner);
    }

    #[test]
    fn galat_sintaks_dari_runner_diteruskan() {
        let hasil = tafsirkan(
            br#"{"status":"galat-sintaks","kasus":[],"keluaran":"","pesan":"invalid syntax"}"#,
            b"",
            Some(0),
            10,
        );
        assert_eq!(hasil.status, Status::GalatSintaks);
        assert_eq!(hasil.pesan.as_deref(), Some("invalid syntax"));
    }

    #[test]
    fn lewat_waktu_dari_runner_diteruskan() {
        // Runner sendiri tidak pernah membalas "lewat-waktu" (ia tidak punya timer),
        // tetapi backend memakainya untuk timeout, jadi bentuk balasannya harus bisa
        // dibaca kalau kelak runner mengirimkannya.
        let hasil = tafsirkan(
            br#"{"status":"lewat-waktu","kasus":[],"keluaran":"","pesan":"berhenti"}"#,
            b"",
            Some(0),
            10,
        );
        assert_eq!(hasil.status, Status::LewatWaktu);
    }

    #[test]
    fn nama_kontainer_unik() {
        let a = nama_kontainer();
        let b = nama_kontainer();
        assert_ne!(a, b);
        assert!(a.starts_with("dsa-eksekusi-"));
    }

    #[tokio::test]
    async fn penjalan_palsu_mencatat_panggilan() {
        let palsu = PenjalanPalsu::mengembalikan(Hasil::tanpa_eksekusi(Status::Ok, ""));
        let pekerjaan = Pekerjaan {
            kode: "def proses(): pass".to_string(),
            fungsi: "proses".to_string(),
            test_case: Vec::new(),
        };
        let _ = palsu.jalankan(pekerjaan.clone()).await;
        let _ = palsu.jalankan(pekerjaan).await;
        assert_eq!(
            palsu
                .jumlah_panggilan
                .load(std::sync::atomic::Ordering::Relaxed),
            2
        );
    }
}
