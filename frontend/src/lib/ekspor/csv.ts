/**
 * Penyandi CSV.
 *
 * Modul ini **hanya** mengurus bentuk teks CSV: kapan sebuah sel perlu dikutip, dan
 * bagaimana tanda kutip di dalamnya di-escape. Ia tidak tahu apa pun tentang Anki,
 * Topik, atau Materi — itu sebabnya satu-satunya alasan ia berubah adalah aturan
 * CSV-nya sendiri berubah.
 *
 * Aturannya mengikuti RFC 4180, yang juga aturan yang disebut manual Anki: sebuah sel
 * perlu dikutip kalau ia memuat pemisah (koma), tanda kutip, atau baris baru; tanda
 * kutip di dalam sel di-escape dengan menggandakannya.
 *
 * **Fungsi murni, tanpa berkas dan tanpa jaringan.** Yang bisa salah di sini adalah
 * bentuk teksnya, dan itu jauh lebih enak diuji sebagai teks.
 */

/**
 * Bungkus satu sel supaya aman di dalam berkas CSV.
 *
 * Sel yang tidak memuat karakter istimewa dikembalikan apa adanya — mengutip
 * semuanya akan benar tetapi menghasilkan berkas yang penuh tanda kutip dan sulit
 * dibaca manusia. Yang perlu dikutip hanya koma, tanda kutip, dan baris baru.
 */
export function selCsv(nilai: string): string {
  // `\r` ikut diperiksa, bukan hanya `\n`: berkas yang disusun di Windows bisa
  // memuat CRLF, dan sel yang memuatnya harus dikutip juga.
  if (!/[",\r\n]/.test(nilai)) return nilai;
  return `"${nilai.replaceAll('"', '""')}"`;
}

/** Susun satu baris CSV dari beberapa sel, dipisah koma. */
export function barisCsv(kolom: string[]): string {
  return kolom.map(selCsv).join(",");
}
