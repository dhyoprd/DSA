//! Bentuk pekerjaan yang dikirim ke runner, dan bentuk hasilnya.
//!
//! Modul ini hanya berisi *bentuk* — tipe yang mencerminkan protokol runner
//! (`runner/runner.py`). Tidak ada perilaku di sini, sehingga satu-satunya alasan
//! modul ini berubah adalah protokol runner berubah.
//!
//! Protokolnya sengaja satu arah dan tanpa keadaan: satu pekerjaan JSON masuk lewat
//! stdin, satu balasan JSON keluar lewat stdout. Tidak ada berkas perantara, tidak
//! ada jaringan, dan tidak ada sesi yang bertahan — sehingga kontainer yang
//! menjalankannya bisa sekali pakai, dan gerbang build bisa memakai kontainer yang
//! sama persis dengan yang dipakai situs.

use serde::{Deserialize, Serialize};

/// Satu kasus uji, dalam bentuk yang dikirim ke runner.
///
/// `diharapkan` **wajib ada** walaupun nilainya boleh `null`: kasus uji tanpa nilai
/// harapan tidak bisa dinilai, dan membiarkannya opsional akan membuatnya diam-diam
/// dianggap "harus null". `argumen` boleh kosong untuk fungsi tanpa parameter.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCase {
    pub argumen: Vec<serde_json::Value>,
    pub diharapkan: serde_json::Value,
}

/// Satu pekerjaan: kode pemelajar, fungsi yang dipanggil, dan kasus ujinya.
#[derive(Debug, Clone, Serialize)]
pub struct Pekerjaan {
    pub kode: String,
    pub fungsi: String,
    pub test_case: Vec<TestCase>,
}

/// Hasil satu kasus uji, apa adanya dari runner.
///
/// `galat` bukan `Option<&str>` yang bisa hilang: satu kasus bisa gagal karena
/// nilainya tidak cocok (tanpa galat), atau karena pemanggilannya melempar. Kedua
/// keadaan itu harus bisa dibedakan pemelajar, jadi keduanya punya field sendiri.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HasilKasus {
    pub indeks: usize,
    pub argumen: serde_json::Value,
    pub diharapkan: serde_json::Value,
    pub hasil: serde_json::Value,
    pub lulus: bool,
    /// Pesan galat kalau pemanggilan kasus ini melempar, atau `null`.
    pub galat: Option<String>,
    /// Yang dicetak pemelajar selama kasus ini berjalan.
    pub keluaran: String,
}

/// Status satu kali Eksekusi Kode.
///
/// Nilainya yang membedakan pesan yang dilihat pemelajar, dan itu kriteria
/// penerimaan #10: "pesan timeout jelas berbeda dari pesan kesalahan sintaks".
/// Karena itu `LewatWaktu` adalah varian tersendiri, bukan sekadar galat.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Status {
    /// Runner selesai menilai. Lulus atau tidaknya dilihat per kasus.
    Ok,
    /// Batas waktu terlampaui, dan kontainer dibunuh.
    LewatWaktu,
    /// Kode tidak bisa dikompilasi.
    GalatSintaks,
    /// Kode gagal dijalankan, atau fungsi yang diminta tidak ada.
    GalatJalan,
    /// Runner sendiri gagal. Ini bug runner, bukan kesalahan pemelajar.
    GalatRunner,
    /// Pekerjaan yang dikirim backend bukan JSON yang sah menurut runner.
    GalatProtokol,
    /// Kontainer berhenti tanpa balasan yang bisa dibaca — mis. dibunuh karena
    /// kehabisan memori. Dibedakan dari `LewatWaktu` karena penyebabnya lain dan
    /// saran yang tepat untuk pemelajar juga lain.
    KontainerGagal,
    /// Perintah `docker` sendiri tidak bisa dijalankan (mis. daemon mati).
    GalatDocker,
}

/// Hasil lengkap satu kali Eksekusi Kode.
#[derive(Debug, Clone, Serialize)]
pub struct Hasil {
    pub status: Status,
    /// Hasil per kasus. Kosong kalau kodenya tidak pernah sampai dinilai.
    pub kasus: Vec<HasilKasus>,
    /// Yang dicetak pemelajar di tingkat modul (di luar fungsi).
    pub keluaran: String,
    /// Penjelasan singkat yang bisa ditampilkan ke pemelajar, atau `null`.
    pub pesan: Option<String>,
    /// Lama eksekusi dalam milidetik. Untuk pencatatan, bukan untuk pemelajar.
    #[serde(skip)]
    pub durasi_ms: u128,
}

impl Hasil {
    /// Hasil untuk pekerjaan yang tidak pernah sampai ke runner.
    ///
    /// Dipakai jalur batas ukuran dan batas laju, dan jalur `docker` yang gagal.
    /// `durasi_ms` nol karena tidak ada yang benar-benar berjalan.
    pub fn tanpa_eksekusi(status: Status, pesan: impl Into<String>) -> Self {
        Hasil {
            status,
            kasus: Vec::new(),
            keluaran: String::new(),
            pesan: Some(pesan.into()),
            durasi_ms: 0,
        }
    }
}

/// Balasan mentah runner, sebelum diperiksa bentuknya.
///
/// Dibuat terpisah dari [`Hasil`] karena runner bisa saja membalas sesuatu yang
/// bentuknya tidak terduga — mis. versi runner yang lebih tua. Menerimanya lewat
/// tipe ini membuat ketidakcocokan itu menjadi galat yang bisa dilaporkan, bukan
/// `panic`.
#[derive(Debug, Deserialize)]
pub struct BalasanRunner {
    pub status: Status,
    #[serde(default)]
    pub kasus: Vec<HasilKasus>,
    #[serde(default)]
    pub keluaran: String,
    #[serde(default)]
    pub pesan: Option<String>,
}
