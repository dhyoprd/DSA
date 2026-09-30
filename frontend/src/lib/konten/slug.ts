/**
 * Mengubah teks judul menjadi potongan alamat (slug) yang aman dipakai sebagai `id`.
 *
 * Dipisah dari `bagian.ts` karena punya alasan sendiri untuk berubah: `bagian.ts`
 * berubah kalau cara menemukan judul berubah, modul ini berubah kalau aturan
 * penulisan slug berubah. Keduanya juga diuji terpisah — aturan karakter di sini,
 * penelusuran pohon Markdown di sana.
 *
 * Aturannya sama dengan slug GitHub, karena itu yang lazim dilihat pembaca di URL:
 * huruf kecil, dipisah tanda hubung, tanpa tanda baca. Tanda diakritik dilipat ke
 * huruf dasarnya (`café` → `cafe`) dan angka bergaya superskrip dilipat ke angka
 * biasa (`n²` → `n2`), supaya notasi kompleksitas seperti O(n²) tetap punya alamat
 * yang bisa dibaca.
 *
 * Fungsi ini **tidak** menjamin keunikan. Dua judul yang sama menghasilkan slug yang
 * sama; yang memberi nomor urut untuk membedakannya adalah `bagian.ts`, karena
 * keunikan hanya punya arti di dalam satu dokumen.
 */

/** Buang tanda diakritik yang tersisa setelah pelipatan kompatibilitas. */
const TANDA_DIAKRITIK = /[̀-ͯ]/g;

/** Apa pun yang bukan huruf a-z atau angka menjadi pemisah. */
const BUKAN_ALFANUMERIK = /[^a-z0-9]+/g;

/** Pemisah yang menggantung di ujung dibuang. */
const PEMISAH_UJUNG = /^-+|-+$/g;

/**
 * Slug dasar dari sebuah teks. Mengembalikan teks kosong kalau tidak ada huruf atau
 * angka yang tersisa (mis. judul yang seluruhnya tanda baca); pemanggil yang
 * memutuskan penggantinya, karena hanya pemanggil yang tahu konteksnya.
 */
export function slugDasar(teks: string): string {
  return teks
    .normalize("NFKD")
    .replace(TANDA_DIAKRITIK, "")
    .toLowerCase()
    .replace(BUKAN_ALFANUMERIK, "-")
    .replace(PEMISAH_UJUNG, "");
}
