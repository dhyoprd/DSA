/**
 * Nomor Topik dalam bentuk dua digit, mis. `4` menjadi `"04"`.
 *
 * Nomor Topik tampil di tiga tempat — penanda "Topik 04 / 12" di halaman, dan nomor
 * tiap baris sidebar — dan ketiganya harus memakai lebar yang sama supaya daftar
 * 01–12 rata. Karena itu aturannya hidup di satu tempat: kalau lebarnya berubah
 * (mis. menjadi tiga digit saat Jalur bertambah panjang), yang berubah hanya berkas ini.
 *
 * Modul ini murni dan sengaja terpisah dari komponen, supaya bisa diuji tanpa merender
 * apa pun.
 */

/** Lebar nomor Topik. 12 Topik saat ini, jadi dua digit cukup. */
const LEBAR = 2;

/** `4` → `"04"`. Nomor yang lebih panjang dari lebar dibiarkan apa adanya. */
export function nomorDuaDigit(nomor: number): string {
  return String(nomor).padStart(LEBAR, "0");
}
