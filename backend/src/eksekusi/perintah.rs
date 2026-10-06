//! Penyusun perintah `docker run` untuk satu eksekusi.
//!
//! Modul ini **murni**: dari nama image dan nama kontainer, ia menghasilkan daftar
//! argumen. Tidak menjalankan apa pun. Itu disengaja — inilah tempat batas-batas
//! keamanan dinyatakan, dan satu argumen yang salah ketik berarti batas itu tidak
//! berlaku. Menyusunnya sebagai data membuatnya bisa diperiksa uji tanpa Docker.
//!
//! ## Satu sumber dengan gerbang build
//!
//! Daftar argumennya **tidak ditulis di sini**. Ia hidup di
//! `runner/perintah-docker.json`, dan dibaca dua pihak:
//!
//! - modul ini, lewat `include_str!` — ditanam ke dalam binary saat kompilasi,
//!   sehingga tidak ada berkas yang harus ikut ter-deploy;
//! - `frontend/scripts/verifikasi-soal.ts`, yang menjalankan solusi referensi lewat
//!   kontainer yang sama.
//!
//! Sebelumnya keduanya menyusun argumennya sendiri-sendiri. Dua salinan batas
//! keamanan bisa menyimpang tanpa ketahuan — dan yang menyimpang adalah batas, jadi
//! gejalanya bukan error, melainkan batas yang diam-diam tidak berlaku. Ujinya di
//! bawah menjaga berkas JSON itu, bukan salinan Rust-nya.
//!
//! ## Kenapa daftar argumen, bukan satu string perintah
//!
//! Argumen yang diberikan langsung ke `Command::args` tidak melewati shell, sehingga
//! kode pemelajar tidak bisa menyusup lewat karakter seperti `;` atau `$()`. Kalau
//! perintah ini disusun sebagai string lalu dijalankan lewat shell, seluruh isolasi di
//! bawah menjadi sia-sia.

use std::sync::OnceLock;

/// Berkas template, ditanam saat kompilasi.
///
/// Jalurnya relatif terhadap berkas ini: `backend/src/eksekusi/` → tiga tingkat naik
/// → akar repo → `runner/`.
const TEMPLATE: &str = include_str!("../../../runner/perintah-docker.json");

/// Nama image runner. Dibaca dari konfigurasi supaya versi image bisa dinaikkan
/// tanpa menyentuh kode ini.
#[derive(Debug, Clone)]
pub struct Image(pub String);

/// Bentuk berkas template. Hanya field `args` yang dipakai.
#[derive(Debug, serde::Deserialize)]
struct Template {
    args: Vec<String>,
}

/// Argumen template, diurai sekali untuk umur proses.
///
/// `expect` dipakai, bukan `unwrap_or_default`: berkas ini ditanam saat kompilasi,
/// jadi isinya sudah pasti terbaca dan berbentuk benar pada binary yang berhasil
/// dibangun. Kalau sampai gagal, itu bug programmer — dan daftar argumen kosong akan
/// menjalankan `docker` tanpa batas apa pun, yang jauh lebih buruk daripada berhenti.
fn template() -> &'static Template {
    static TEMPLATE_TERURAI: OnceLock<Template> = OnceLock::new();
    TEMPLATE_TERURAI.get_or_init(|| {
        serde_json::from_str(TEMPLATE)
            .expect("runner/perintah-docker.json harus berisi JSON dengan field `args`")
    })
}

/// Susun argumen `docker run` untuk satu eksekusi.
///
/// Setiap flag di template adalah satu batas yang dijanjikan `docs/adr/0002`:
///
/// - `--network none` — **mitigasi terpenting.** Tanpa jaringan, kode yang dijalankan
///   tidak bisa menambang kripto, mengirim spam, atau menyerang pihak ketiga.
/// - `--memory` dan `--memory-swap` sama besar, sehingga kontainer tidak bisa
///   mengalihkan tekanan memori ke swap dan melewati batasnya.
/// - `--cpus 1` — batas CPU, sejalan dengan batas 1 shared CPU di produksi.
/// - `--pids-limit` — mencegah fork bomb.
/// - `--read-only` + `--tmpfs /tmp` — filesystem tidak bisa ditulis, kecuali `/tmp`
///   yang dibatasi ukurannya dan tidak boleh dieksekusi.
/// - `--cap-drop ALL` dan `--no-new-privileges` — kontainer tidak punya capability
///   dan tidak bisa menaikkan haknya.
/// - `--rm` — kontainer dibuang saat selesai, sehingga tidak ada keadaan yang
///   diwariskan submission berikutnya.
///
/// **`-i` wajib ada.** Pekerjaan dikirim lewat stdin; tanpa `-i`, stdin kontainer
/// tertutup dan runner membaca string kosong, lalu membalas galat protokol — gejala
/// yang menyesatkan karena kodenya sebenarnya benar.
///
/// **`--name` wajib ada.** Nama kontainer dipakai membunuhnya saat batas waktu
/// terlampaui. Membunuh proses `docker run` saja tidak cukup: kontainer tetap hidup
/// dan terus memakai CPU (terverifikasi saat membangun ticket ini).
pub fn argumen_docker(image: &Image, nama_kontainer: &str) -> Vec<String> {
    template()
        .args
        .iter()
        .map(|argumen| match argumen.as_str() {
            "{nama}" => nama_kontainer.to_string(),
            "{image}" => image.0.clone(),
            lain => lain.to_string(),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn argumen() -> Vec<String> {
        argumen_docker(&Image("dsa-runner:lokal".to_string()), "dsa-eksekusi-abc123")
    }

    /// Cari nilai setelah sebuah flag, atau `None`.
    fn nilai_untuk(args: &[String], flag: &str) -> Option<String> {
        let posisi = args.iter().position(|a| a == flag)?;
        args.get(posisi + 1).cloned()
    }

    // Uji di bawah ini menjaga **berkas JSON**, bukan salinan Rust-nya: kalau salah
    // satu flag hilang dari `runner/perintah-docker.json`, ujinya gagal. Itu yang
    // membuat berkas bersama itu aman — batas keamanan yang hilang akan terlihat,
    // bukan diam-diam tidak berlaku.

    #[test]
    fn jaringan_ditolak_total() {
        // Batas terpenting: kalau uji ini gagal, seluruh alasan ADR-0002 tidak lagi
        // berlaku.
        assert_eq!(nilai_untuk(&argumen(), "--network").as_deref(), Some("none"));
    }

    #[test]
    fn memori_dibatasi_dan_tanpa_swap() {
        let args = argumen();
        let memori = nilai_untuk(&args, "--memory").expect("--memory harus ada");
        let swap = nilai_untuk(&args, "--memory-swap").expect("--memory-swap harus ada");
        assert_eq!(memori, "256m");
        // Sama besar, supaya tekanan memori tidak dialihkan ke swap.
        assert_eq!(memori, swap);
    }

    #[test]
    fn cpu_dibatasi() {
        assert_eq!(nilai_untuk(&argumen(), "--cpus").as_deref(), Some("1"));
    }

    #[test]
    fn pids_dibatasi() {
        assert!(nilai_untuk(&argumen(), "--pids-limit").is_some());
    }

    #[test]
    fn filesystem_read_only() {
        let args = argumen();
        assert!(args.contains(&"--read-only".to_string()));
        // `/tmp` tetap boleh ditulis, tetapi tidak boleh dieksekusi.
        let tmpfs = nilai_untuk(&args, "--tmpfs").expect("--tmpfs harus ada");
        assert!(tmpfs.starts_with("/tmp:"));
        assert!(tmpfs.contains("noexec"));
    }

    #[test]
    fn capability_dibuang_dan_hak_tidak_bisa_naik() {
        let args = argumen();
        assert_eq!(nilai_untuk(&args, "--cap-drop").as_deref(), Some("ALL"));
        assert_eq!(
            nilai_untuk(&args, "--security-opt").as_deref(),
            Some("no-new-privileges")
        );
    }

    #[test]
    fn kontainer_dibuang_dan_stdin_terbuka() {
        let args = argumen();
        assert!(args.contains(&"--rm".to_string()));
        // `-i` wajib: pekerjaan dikirim lewat stdin.
        assert!(args.contains(&"-i".to_string()));
    }

    #[test]
    fn kontainer_diberi_nama_supaya_bisa_dibunuh() {
        let args = argumen();
        assert_eq!(
            nilai_untuk(&args, "--name").as_deref(),
            Some("dsa-eksekusi-abc123")
        );
    }

    #[test]
    fn image_ada_di_paling_akhir() {
        // Image harus menjadi argumen terakhir: apa pun setelahnya akan dianggap
        // sebagai perintah untuk dijalankan di dalam kontainer.
        let args = argumen();
        assert_eq!(args.last().map(String::as_str), Some("dsa-runner:lokal"));
    }

    #[test]
    fn placeholder_tidak_ada_yang_tertinggal() {
        // Placeholder yang tidak tergantikan akan dikirim apa adanya ke Docker, dan
        // Docker akan menolaknya dengan pesan yang tidak menyebut penyebabnya.
        for arg in argumen() {
            assert!(
                !arg.starts_with('{') || !arg.ends_with('}'),
                "placeholder tidak tergantikan: {arg:?}"
            );
        }
    }

    #[test]
    fn tidak_ada_argumen_yang_diteruskan_ke_shell() {
        // Semua argumen harus menjadi elemen tersendiri di daftar, bukan potongan
        // string yang mengandung spasi — kalau tidak, pemisahan argumennya terjadi
        // di shell dan kode pemelajar bisa menyusup.
        for arg in argumen() {
            assert!(
                !arg.contains(' ') || arg.starts_with("/tmp:"),
                "argumen mengandung spasi: {arg:?}"
            );
        }
    }
}
