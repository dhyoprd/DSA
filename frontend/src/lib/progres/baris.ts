/**
 * Menggabungkan baris Progres yang baru dicatat ke dalam daftar yang sudah ada.
 *
 * Endpoint tulis (`POST /api/progres/:slug/:indeks`) mengembalikan **baris setelah
 * perubahan**, bukan seluruh daftar. Itu disengaja di backend: satu permintaan, tanpa
 * permintaan baca kedua. Konsekuensinya antarmuka yang menyimpan daftarnya sendiri
 * harus menempelkan baris itu ke daftar yang dimilikinya — dan itulah satu-satunya
 * pekerjaan modul ini.
 *
 * Dipisah dari komponen sebagai fungsi murni supaya bisa diuji tanpa React. Aturan
 * penggabungannya kecil, tetapi salah di sini berarti baris lama dan baru bisa
 * muncul bersamaan, dan status Topik dihitung dari daftar yang isinya salah.
 */

import type { BarisProgres } from "../api.ts";

/**
 * Ganti baris yang sama, atau tambahkan kalau belum ada.
 *
 * Kuncinya `(topik_slug, soal_indeks)` — sama dengan kunci primer tabel Progres. Dua
 * baris dengan kunci sama tidak boleh muncul bersamaan: `statusTopik` menghitung
 * "berapa Soal yang selesai" dari daftar ini, jadi baris ganda membuat satu Soal
 * terhitung dua kali dan Topik tampak lebih selesai daripada kenyataannya.
 *
 * Urutan tidak dijaga: `statusTopik` tidak bergantung padanya, dan daftar ini tidak
 * pernah ditampilkan apa adanya.
 */
export function gabungBaris(
  daftar: readonly BarisProgres[],
  baru: BarisProgres,
): BarisProgres[] {
  const sama = (b: BarisProgres): boolean =>
    b.topik_slug === baru.topik_slug && b.soal_indeks === baru.soal_indeks;

  if (!daftar.some(sama)) return [...daftar, baru];

  return daftar.map((b) => (sama(b) ? baru : b));
}
