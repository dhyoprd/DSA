/**
 * Membaca berkas YAML menjadi nilai JavaScript.
 *
 * Modul ini punya satu alasan untuk berubah: cara berkas dibaca dan cara kesalahan
 * *sintaks* dilaporkan. Aturan *isi* ada di `periksa.ts`, dan pemanggilan keduanya
 * ada di `muat.ts`. Pemisahan ini disengaja supaya validator tetap bisa diuji tanpa
 * berkas, dan supaya modul ini tetap bisa diuji tanpa aturan konten.
 */

import { readFileSync } from "node:fs";

import { LineCounter, parseDocument } from "yaml";

/** Berkas YAML tidak bisa dibaca, atau isinya bukan YAML yang sah. */
export class GalatBaca extends Error {
  /** Berkas relatif terhadap akar repo. */
  readonly berkas: string;

  constructor(message: string, berkas: string) {
    super(message);
    this.name = "GalatBaca";
    this.berkas = berkas;
  }
}

/**
 * Baca danurai satu berkas YAML.
 *
 * Kesalahan sintaks dilempar sebagai `GalatBaca` yang sudah menyebut berkas dan
 * nomor baris — `prettyErrors` bawaan pustaka `yaml` melakukan bagian nomor barisnya,
 * dan `LineCounter` dipakai untuk menerjemahkan offset ke baris:kolom.
 *
 * Melempar, bukan mengembalikan daftar masalah, karena YAML yang tidak bisa diurai
 * tidak punya isi yang bisa diperiksa lebih lanjut. Aturan isi dikumpulkan lewat
 * `periksa.ts` justru supaya semua masalah isi terlihat sekaligus.
 */
export function bacaYaml(berkas: string, jalurLengkap: string): unknown {
  let teks: string;
  try {
    teks = readFileSync(jalurLengkap, "utf8");
  } catch (galat) {
    const pesan = galat instanceof Error ? galat.message : "tidak diketahui";
    throw new GalatBaca(`tidak bisa membaca berkas: ${pesan}`, berkas);
  }

  const penghitungBaris = new LineCounter();
  const dokumen = parseDocument(teks, {
    lineCounter: penghitungBaris,
    prettyErrors: true,
  });

  if (dokumen.errors.length > 0) {
    const rincian = dokumen.errors
      .map((galat) => {
        const posisi = galat.linePos?.[0];
        const tempat =
          posisi === undefined ? "" : ` (baris ${posisi.line}, kolom ${posisi.col})`;
        return `- ${galat.message.split("\n")[0]}${tempat}`;
      })
      .join("\n");
    throw new GalatBaca(`YAML tidak sah:\n${rincian}`, berkas);
  }

  // Berkas kosong menghasilkan `null`; itu dilaporkan sebagai masalah isi oleh
  // pemanggil, bukan sebagai galat sintaks di sini.
  return dokumen.toJS() as unknown;
}
