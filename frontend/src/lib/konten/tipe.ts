/**
 * Bentuk data Materi dan Soal.
 *
 * Modul ini hanya berisi *bentuk* — tipe TypeScript yang mencerminkan skema YAML
 * di issue #1. Tidak ada perilaku di sini, sehingga satu-satunya alasan modul ini
 * berubah adalah skema di issue #1 berubah.
 *
 * Istilah mengikuti `CONTEXT.md`: **Topik**, **Materi**, **Soal**, **Kuis**,
 * **Soal Kode**, **Pembahasan**. Kuis dan Soal Kode adalah dua hal berbeda dan
 * tidak boleh dipertukarkan.
 */

/**
 * Teks dwibahasa.
 *
 * Skema di issue #1 memakai objek `{ id, en }`, bukan dua field terpisah, supaya
 * setiap penulis Materi wajib mengisi keduanya sejak awal — tidak ada Materi yang
 * bisa setengah diterjemahkan tanpa ketahuan.
 */
export interface TeksDwibahasa {
  id: string;
  en: string;
}

/**
 * Satu baris daftar Jalur.
 *
 * Jalur lengkap (12 Topik) dideklarasikan di `content/jalur.yaml`, bukan diturunkan
 * dari berkas Topik yang sudah ada. Alasan: Stack adalah nomor 4 dengan prasyarat
 * [3], jadi daftar nomor harus ada lebih dulu sebelum Topik 3 ditulis.
 */
export interface TopikJalur {
  nomor: number;
  slug: string;
  judul: TeksDwibahasa;
  prasyarat: number[];
}

/** Isi `content/jalur.yaml`. */
export interface Jalur {
  topik: TopikJalur[];
}

/** Satu pilihan jawaban pada Kuis. */
export interface OpsiKuis {
  teks: TeksDwibahasa;
  benar: boolean;
}

/** Kuis: pilihan ganda yang dinilai otomatis, berbentuk skenario nyata. */
export interface Kuis {
  tipe: "kuis";
  skenario: TeksDwibahasa;
  /** Opsional — potongan kode untuk ditebak outputnya. */
  kode?: string;
  opsi: OpsiKuis[];
  /** Pembahasan. Baru terbuka setelah jawaban benar (aturan itu milik #6). */
  penjelasan: TeksDwibahasa;
}

/** Satu kasus uji pada Soal Kode. */
export interface TestCase {
  /** Argumen posisional yang diberikan ke fungsi. */
  argumen: unknown[];
  /** Nilai yang harus dikembalikan fungsi. */
  diharapkan: unknown;
}

/** Soal Kode: implementasi struktur data dari nol, diuji test case otomatis. */
export interface SoalKode {
  tipe: "soal-kode";
  skenario: TeksDwibahasa;
  /** Nama fungsi yang dipanggil test case. */
  fungsi: string;
  test_case: TestCase[];
  /** Solusi acuan. Wajib ada; dijalankan terhadap test case-nya sendiri di #10. */
  solusi_referensi: string;
}

/** Soal adalah gabungan dua bentuk yang dibedakan oleh field `tipe`. */
export type Soal = Kuis | SoalKode;

/**
 * Status Progres sebuah Topik.
 *
 * Ini satu-satunya bagian bentuk data di modul ini yang **bukan** berasal dari
 * berkas YAML: Progres hidup di database backend (ADR-0003). Tipenya ada di sini
 * karena ia kosakata yang dipakai bersama oleh sidebar dan, nanti, backend.
 *
 * Belum ada data yang mengisinya. Ticket #7 membangun endpoint Progres dan #8
 * menyambungkannya ke tampilan; sampai saat itu seluruh Topik tampil `"belum"`.
 * Nilainya sengaja hanya tiga, sesuai `docs/design-tree.md` (○ belum, ◐ sedang,
 * ● selesai).
 */
export type StatusProgres = "belum" | "sedang" | "selesai";

/**
 * Satu Topik utuh, hasil membaca satu berkas `content/<slug>.yaml`.
 *
 * Field `nomor`, `slug`, `judul`, dan `prasyarat` juga ada di `jalur.yaml`; nilainya
 * wajib sama. Duplikasi ini disengaja dan dijaga oleh validator — lihat
 * `docs/adr/0008-jalur-manifest-di-content.md`.
 */
export interface Topik {
  nomor: number;
  slug: string;
  judul: TeksDwibahasa;
  prasyarat: number[];
  materi: TeksDwibahasa;
  soal: Soal[];
}

/**
 * Satu masalah konten yang ditemukan saat build.
 *
 * `lokasi` menunjuk posisi di dalam berkas (mis. `soal[1].opsi`), bukan nomor baris.
 * Kesalahan *sintaks* YAML sudah membawa nomor baris dari pustaka `yaml` dan
 * dilaporkan terpisah oleh `baca.ts`. Pemisahan ini menjaga validator tetap murni:
 * ia bekerja pada nilai JavaScript biasa, bukan pada pohon AST.
 */
export interface Masalah {
  /** Berkas relatif terhadap akar repo, mis. `content/stack.yaml`. */
  berkas: string;
  /** Jalur di dalam berkas, mis. `soal[1].opsi`. Kosong kalau masalahnya di akar. */
  lokasi: string;
  pesan: string;
}
