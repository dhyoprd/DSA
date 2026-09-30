/**
 * Membaca nomor baris awal sebuah simpul Markdown.
 *
 * Nomor baris adalah **kunci sambungan** antara daftar isi dan heading yang dirender:
 * `daftarBagian` menghitung nomor baris dari pohon Markdown, dan
 * `materi-markdown.tsx` mencocokkan heading yang react-markdown berikan berdasarkan
 * nomor baris itu. Kalau kedua sisi membacanya dengan cara yang sedikit berbeda,
 * tautan daftar isi melompat ke tempat yang salah tanpa error apa pun.
 *
 * Modul ini ada supaya pembacaan itu hanya hidup di **satu** tempat. Sebelumnya bentuk
 * `node.position.start.line` diperiksa di tiga tempat (di sini, di
 * `materi-markdown.tsx`, dan di ujinya), sehingga ketiganya bisa menyimpang tanpa
 * ketahuan.
 *
 * Masukannya `unknown`, bukan tipe `hast` atau `mdast`, karena nilainya datang dari
 * pustaka lain lewat react-markdown dan bentuknya tidak dijamin oleh tipe apa pun yang
 * bisa dipercaya di sisi pemanggil. Bentuknya diperiksa satu per satu, bukan dengan
 * `as`, supaya nilai yang tidak terduga menghasilkan `undefined` alih-alih melempar.
 *
 * Fungsi ini murni: tidak menyentuh berkas, DOM, atau React.
 */

/** Nomor baris awal (1-based) sebuah simpul, atau `undefined` kalau tidak ada. */
export function barisSimpul(node: unknown): number | undefined {
  if (typeof node !== "object" || node === null) return undefined;

  const position = (node as { position?: unknown }).position;
  if (typeof position !== "object" || position === null) return undefined;

  const start = (position as { start?: unknown }).start;
  if (typeof start !== "object" || start === null) return undefined;

  const line = (start as { line?: unknown }).line;
  return typeof line === "number" ? line : undefined;
}
