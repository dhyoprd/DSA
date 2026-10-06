/**
 * Bentuk permintaan dan balasan Eksekusi Kode.
 *
 * Modul ini hanya berisi *bentuk* — tipe TypeScript yang mencerminkan protokol
 * backend (`backend/src/eksekusi/`). Tidak ada perilaku di sini, sehingga satu-satunya
 * alasan modul ini berubah adalah protokol itu berubah.
 *
 * **Kenapa `test_case` ikut dikirim, padahal ia milik Soal.** Nilai harapan sudah ada
 * di halaman: Materi dan Soal hidup di git dan menjadi halaman statis (ADR-0003), jadi
 * seluruh `test_case` sudah terkirim di payload halaman. Menyembunyikannya dari
 * backend tidak menambah kerahasiaan apa pun yang belum hilang — alasan yang sama
 * dengan yang dicatat ADR-0014 untuk Pembahasan. Yang dijaga backend bukan rahasia
 * test case-nya, melainkan bahwa kode pemelajar tidak keluar dari kotaknya.
 *
 * Istilah mengikuti `CONTEXT.md`: **Soal Kode** (tulis dan jalankan Python) berbeda
 * dari **Kuis** (pilihan ganda dinilai otomatis). **Eksekusi Kode** adalah menjalankan
 * kodenya, bukan soal itu sendiri.
 */

/** Satu kasus uji, seperti yang tertulis di `content/<slug>.yaml`. */
export interface TestCase {
  argumen: unknown[];
  diharapkan: unknown;
}

/** Badan `POST /api/eksekusi`. */
export interface PermintaanEksekusi {
  topik_slug: string;
  soal_indeks: number;
  /** Kode Python yang ditulis pemelajar. */
  kode: string;
  /** Nama fungsi yang dipanggil test case. */
  fungsi: string;
  /** Test case Soal ini, dari halaman. */
  test_case: TestCase[];
}

/**
 * Status satu kali Eksekusi Kode.
 *
 * Nilainya yang menentukan kalimat apa yang dilihat pemelajar. `lewat-waktu`
 * sengaja terpisah dari `galat-sintaks`: kriteria penerimaan #10 menuntut "pesan
 * timeout jelas berbeda dari pesan kesalahan sintaks".
 *
 * Daftarnya harus sama persis dengan `Status` di `backend/src/eksekusi/hasil.rs` —
 * backend men-serialisasi dengan `rename_all = "kebab-case"`.
 */
export type StatusEksekusi =
  | "ok"
  | "lewat-waktu"
  | "galat-sintaks"
  | "galat-jalan"
  | "galat-runner"
  | "galat-protokol"
  | "kontainer-gagal"
  | "galat-docker";

/** Hasil satu kasus uji. */
export interface HasilKasus {
  indeks: number;
  argumen: unknown;
  diharapkan: unknown;
  hasil: unknown;
  lulus: boolean;
  /** Pesan galat kalau pemanggilan kasus ini melempar, atau `null`. */
  galat: string | null;
  /** Yang dicetak pemelajar selama kasus ini berjalan. */
  keluaran: string;
}

/** Balasan `POST /api/eksekusi`. */
export interface HasilEksekusi {
  status: StatusEksekusi;
  kasus: HasilKasus[];
  /** Yang dicetak pemelajar di tingkat modul (di luar fungsi). */
  keluaran: string;
  /** Penjelasan singkat dari backend, atau `null`. */
  pesan: string | null;
}

/** Apakah status ini berarti kodenya berhasil dinilai (lulus atau tidak per kasus). */
export function selesaiDinilai(status: StatusEksekusi): boolean {
  return status === "ok";
}
