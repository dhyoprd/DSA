/**
 * Aturan gerbang "solusi referensi lulus test case-nya sendiri".
 *
 * **Modul murni.** Masukannya hasil runner, keluarannya daftar masalah. Tidak
 * menyentuh berkas, tidak menyentuh Docker — sehingga bisa diuji dengan test runner
 * Node tanpa menjalankan kontainer.
 *
 * **Kenapa gerbang ini ada.** Test HTTP tidak tahu jawaban yang benar. Satu-satunya
 * cara menangkap test case yang salah tulis adalah menjalankan solusi referensinya
 * terhadap test case itu: kalau solusi acuan tidak lulus, yang salah adalah Soalnya,
 * bukan kodenya. Tanpa gerbang ini, pemelajar bisa stuck berjam-jam pada Soal yang
 * tidak punya jawaban benar. Itu risiko nomor 4 di `docs/design-tree.md`.
 *
 * Gerbangnya hidup di sini, bukan di `periksa.ts`, karena `periksa.ts` murni bekerja
 * pada nilai YAML sedangkan yang ini butuh menjalankan kode. Itu dua alasan berbeda
 * untuk berubah, jadi dua modul yang berbeda.
 */

import type { SoalKode, Topik } from "./tipe.ts";
import type { HasilEksekusi } from "../eksekusi/tipe.ts";

/** Satu masalah yang ditemukan gerbang. */
export interface MasalahSoal {
  /** Slug Topik, mis. `stack`. */
  topik: string;
  /** Posisi Soal di dalam `topik.soal`. */
  indeksSoal: number;
  /** Nama fungsi yang seharusnya dipanggil test case. */
  fungsi: string;
  /** Kalimat masalahnya. */
  pesan: string;
}

/** Semua Soal Kode yang ada di seluruh Topik, beserta lokasinya. */
export function soalKodeSemua(
  topik: Topik[],
): { topik: string; indeksSoal: number; soal: SoalKode }[] {
  return topik.flatMap((t) =>
    t.soal.flatMap((soal, indeksSoal) =>
      soal.tipe === "soal-kode" ? [{ topik: t.slug, indeksSoal, soal }] : [],
    ),
  );
}

/**
 * Periksa hasil satu eksekusi solusi referensi.
 *
 * Mengembalikan daftar masalah — kosong berarti solusi referensinya lulus semuanya.
 * Daftar, bukan boolean, karena penulis Materi perlu tahu **kasus mana** yang gagal
 * dan apa yang dihasilkan; "solusi referensi gagal" saja tidak cukup untuk
 * memperbaikinya.
 */
export function periksaHasil(
  lokasi: { topik: string; indeksSoal: number; fungsi: string },
  hasil: HasilEksekusi,
): MasalahSoal[] {
  const dasar = lokasi;

  // Status selain `ok` berarti solusi referensinya sendiri tidak bisa dijalankan.
  // Itu cacat Soal yang paling parah: tidak ada kode yang bisa lulus.
  if (hasil.status !== "ok") {
    return [
      {
        ...dasar,
        pesan:
          `solusi referensi tidak bisa dijalankan (status "${hasil.status}")` +
          (hasil.pesan === null ? "" : `: ${hasil.pesan}`),
      },
    ];
  }

  if (hasil.kasus.length === 0) {
    return [{ ...dasar, pesan: "test case kosong, jadi tidak ada yang diuji" }];
  }

  return hasil.kasus
    .filter((kasus) => !kasus.lulus)
    .map((kasus) => ({
      ...dasar,
      pesan:
        `solusi referensi gagal pada test case ${kasus.indeks + 1}: ` +
        `diharapkan ${JSON.stringify(kasus.diharapkan)}, ` +
        `dihasilkan ${JSON.stringify(kasus.hasil)}` +
        (kasus.galat === null ? "" : ` (${kasus.galat})`),
    }));
}

/** Susun daftar masalah menjadi pesan yang terbaca di keluaran build. */
export function formatMasalah(masalah: MasalahSoal[]): string {
  const baris = masalah.map(
    (m) => `  • ${m.topik} → soal[${m.indeksSoal}] (fungsi ${m.fungsi}): ${m.pesan}`,
  );
  const pembuka =
    masalah.length === 1
      ? "Solusi referensi tidak lulus (1 masalah):"
      : `Solusi referensi tidak lulus (${masalah.length} masalah):`;
  return [pembuka, ...baris].join("\n");
}
