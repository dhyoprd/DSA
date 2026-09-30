/**
 * Menyusun daftar navigasi Jalur dari dua sumber yang berbeda.
 *
 * Sumber pertama adalah `content/jalur.yaml` — daftar 12 Topik yang berlaku untuk
 * seluruh situs, dibaca saat build. Sumber kedua adalah berkas Topik yang benar-benar
 * ada. Sidebar menampilkan yang pertama, dan menandai mana yang sudah bisa dibuka
 * berdasarkan yang kedua.
 *
 * Modul ini murni supaya aturan "tersedia atau tidak" bisa diuji tanpa merender
 * komponen React — bagian dari keputusan issue #1 bahwa tampilan diperiksa manual,
 * tetapi logika di baliknya tetap diuji otomatis.
 *
 * Yang **tidak** ada di sini: status Progres (belum / sedang / selesai). Status itu
 * datang dari backend, bukan dari berkas konten, sehingga ia punya alasan sendiri
 * untuk berubah. `Sidebar` menerimanya sebagai prop terpisah — lihat komponennya.
 */

import type { Topik, TopikJalur } from "./tipe.ts";

/** Satu baris di sidebar. */
export interface BarisNavigasi {
  nomor: number;
  slug: string;
  judul: TopikJalur["judul"];
  /** `true` kalau Topik ini punya berkas dan bisa dibuka. */
  tersedia: boolean;
}

/**
 * Gabungkan daftar Jalur dengan Topik yang sudah punya berkas.
 *
 * Judul diambil dari Jalur, bukan dari berkas Topik, karena Jalur adalah daftar yang
 * berlaku untuk seluruh situs. Validator sudah memastikan keduanya sepakat, jadi
 * pilihan ini tidak mengubah apa yang dilihat pembaca — ia hanya menetapkan satu
 * sumber yang menang kalau suatu saat keduanya berbeda.
 *
 * Berkas Topik yang tidak ada di Jalur diabaikan: Jalur yang menentukan Topik mana
 * yang ditampilkan. (Validator juga sudah menolak keadaan itu saat build.)
 */
export function susunNavigasi(jalur: TopikJalur[], topik: Topik[]): BarisNavigasi[] {
  const slugTersedia = new Set(topik.map((t) => t.slug));

  return [...jalur]
    .sort((a, b) => a.nomor - b.nomor)
    .map((baris) => ({
      nomor: baris.nomor,
      slug: baris.slug,
      judul: baris.judul,
      tersedia: slugTersedia.has(baris.slug),
    }));
}
