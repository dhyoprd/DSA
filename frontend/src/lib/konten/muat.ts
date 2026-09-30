/**
 * Memuat seluruh konten dari `content/`, memvalidasinya, dan menggagalkan build
 * kalau ada yang tidak sah.
 *
 * Modul ini adalah satu-satunya pintu masuk konten. Ia menyatukan tiga hal yang
 * sengaja dipisah: pembacaan berkas (`baca.ts`), aturan isi (`periksa.ts`), dan
 * keputusan untuk menggagalkan build (di sini). Karena itu ia punya tiga alasan
 * untuk berubah, dan itu diterima: memisahkannya lagi akan menyebar urutan
 * langkahnya ke beberapa tempat, padahal urutannya justru yang penting.
 *
 * Urutannya: baca `jalur.yaml` lebih dulu, karena validator Topik memakai daftar
 * Jalur untuk memeriksa `prasyarat`. Berkas Topik yang rusak tidak boleh
 * menggagalkan pembacaan berkas Topik lain — semua masalah dikumpulkan dulu, baru
 * dilempar sekaligus.
 */

import { readdirSync } from "node:fs";
import path from "node:path";

import { bacaYaml, GalatBaca } from "./baca.ts";
import { periksaJalur, periksaTopik } from "./periksa.ts";
import type { Jalur, Masalah, Topik, TopikJalur } from "./tipe.ts";

/** Berkas Jalur. Dikecualikan saat mencari berkas Topik. */
const BERKAS_JALUR = "jalur.yaml";

/**
 * Konten tidak sah. Dibawa sebagai galat supaya build gagal, bukan sekadar
 * dicatat — gerbang validasi memang bertujuan menghentikan build.
 */
export class GalatKonten extends Error {
  readonly masalah: Masalah[];

  constructor(masalah: Masalah[]) {
    super(formatMasalah(masalah));
    this.name = "GalatKonten";
    this.masalah = masalah;
  }
}

/** Hasil memuat konten: Jalur lengkap, dan Topik yang sudah punya berkas. */
export interface Konten {
  /** 12 baris Jalur, urut nomor. Termasuk Topik yang belum ditulis. */
  jalur: TopikJalur[];
  /** Topik yang sudah punya berkas, urut nomor. */
  topik: Topik[];
}

/**
 * Direktori konten.
 *
 * Bawaannya `../content` relatif terhadap direktori kerja, yang benar di dua tempat:
 * di host, `next` dijalankan dari `frontend/` sehingga hasilnya `<repo>/content`; di
 * dalam container, direktori kerjanya `/app` sehingga hasilnya `/content`, dan
 * Compose memasang `content/` ke sana. `CONTENT_DIR` menimpa bawaan itu kalau
 * suatu saat struktur penyebaran berubah.
 */
export function direktoriKonten(): string {
  const ditentukan = process.env.CONTENT_DIR;
  if (ditentukan !== undefined && ditentukan.trim().length > 0) {
    return path.resolve(ditentukan);
  }
  return path.resolve(process.cwd(), "..", "content");
}

/**
 * Baca seluruh konten dari sebuah direktori, lalu validasi.
 *
 * Melempar `GalatKonten` berisi *semua* masalah yang ditemukan, supaya penulis Materi
 * bisa memperbaiki beberapa kesalahan dalam satu putaran, bukan satu per build.
 */
export function muatKonten(direktori: string = direktoriKonten()): Konten {
  const masalah: Masalah[] = [];

  const jalur = muatJalur(direktori, masalah);
  const topik = muatSemuaTopik(direktori, jalur, masalah);

  if (masalah.length > 0) {
    throw new GalatKonten(masalah);
  }

  return { jalur, topik };
}

/** Baca `jalur.yaml`. Mengembalikan daftar kosong kalau berkasnya tidak ada. */
function muatJalur(direktori: string, masalah: Masalah[]): TopikJalur[] {
  const berkas = BERKAS_JALUR;
  const jalurLengkap = path.join(direktori, berkas);

  let nilai: unknown;
  try {
    nilai = bacaYaml(berkas, jalurLengkap);
  } catch (galat) {
    if (galat instanceof GalatBaca) {
      masalah.push({ berkas, lokasi: "", pesan: galat.message });
      return [];
    }
    throw galat;
  }

  masalah.push(...periksaJalur(nilai, berkas));

  const jalur = (nilai as Jalur | null)?.topik;
  return Array.isArray(jalur) ? jalur : [];
}

/** Baca setiap berkas Topik di direktori konten, kecuali `jalur.yaml`. */
function muatSemuaTopik(
  direktori: string,
  jalur: TopikJalur[],
  masalah: Masalah[],
): Topik[] {
  let namaBerkas: string[];
  try {
    namaBerkas = readdirSync(direktori);
  } catch (galat) {
    const pesan = galat instanceof Error ? galat.message : "tidak diketahui";
    masalah.push({ berkas: direktori, lokasi: "", pesan: `tidak bisa dibaca: ${pesan}` });
    return [];
  }

  const berkasTopik = namaBerkas
    .filter((nama) => nama.endsWith(".yaml") || nama.endsWith(".yml"))
    .filter((nama) => nama !== BERKAS_JALUR)
    .sort();

  const topik: Topik[] = [];
  for (const nama of berkasTopik) {
    let nilai: unknown;
    try {
      nilai = bacaYaml(nama, path.join(direktori, nama));
    } catch (galat) {
      if (galat instanceof GalatBaca) {
        masalah.push({ berkas: nama, lokasi: "", pesan: galat.message });
        continue;
      }
      throw galat;
    }

    masalah.push(...periksaTopik(nilai, { berkas: nama, jalur }));
    // Nilai mentah dipakai walaupun ada masalah: tujuan gerbang ini adalah
    // melaporkan semuanya sekaligus, bukan berhenti di berkas pertama.
    topik.push(nilai as Topik);
  }

  // Urutkan berdasarkan nomor. Nilai yang nomornya tidak sah tetap ikut (supaya
  // masalahnya dilaporkan), tetapi tidak dipakai sebagai kunci urut — perbandingan
  // dengan `undefined` menghasilkan `NaN`, yang membuat urutan tidak menentu.
  return topik.sort((a, b) => {
    const nomorA = typeof a?.nomor === "number" ? a.nomor : Number.MAX_SAFE_INTEGER;
    const nomorB = typeof b?.nomor === "number" ? b.nomor : Number.MAX_SAFE_INTEGER;
    return nomorA - nomorB;
  });
}

/** Susun daftar masalah menjadi pesan yang menyebut berkas dan masalahnya. */
function formatMasalah(masalah: Masalah[]): string {
  const baris = masalah.map((m) => {
    const tempat = m.lokasi.length > 0 ? `${m.berkas} → ${m.lokasi}` : m.berkas;
    return `  • ${tempat}: ${m.pesan}`;
  });
  const pembuka =
    masalah.length === 1
      ? "Konten tidak sah (1 masalah):"
      : `Konten tidak sah (${masalah.length} masalah):`;
  return [pembuka, ...baris].join("\n");
}

// --- Cache untuk pemakaian di dalam aplikasi ------------------------------------

let cache: Konten | null = null;

/**
 * Konten yang sudah dimuat, di-cache untuk umur proses.
 *
 * Konten dibaca dari git dan tidak berubah selama satu build, jadi membacanya sekali
 * sudah cukup. Build yang gagal karena konten rusak tetap gagal: galatnya tidak
 * di-cache, sehingga build berikutnya memeriksa ulang.
 */
export function konten(): Konten {
  cache ??= muatKonten();
  return cache;
}

/** Cari satu Topik berdasarkan slug. `null` kalau belum ditulis. */
export function topikDenganSlug(slug: string): Topik | null {
  return konten().topik.find((t) => t.slug === slug) ?? null;
}
