/**
 * Menyusun berkas Markdown unduhan dari Catatan sebuah Topik.
 *
 * **Kenapa ada, dan kenapa di antarmuka.** Kriteria penerimaan #11 meminta Catatan
 * "bisa diunduh sebagai Markdown". Berkas itu disusun di sini, bukan di backend,
 * karena judul Topik hidup di `content/jalur.yaml` (git) dan backend tidak membacanya
 * (ADR-0003) — backend hanya tahu isi tulisan, bukan Topik apa yang sedang dibuka.
 * Antarmuka yang tahu judulnya, jadi ia yang bisa membuat berkas yang berguna:
 * berjudul, dan tidak bergantung pada backend yang mungkin sedang mati.
 *
 * **Fungsi murni, tanpa React dan tanpa DOM.** Yang bisa salah di sini adalah
 * bentuk berkasnya (judul hilang, badan kosong, baris baru berlebih), dan itu jauh
 * lebih enak diuji sebagai teks daripada lewat render. Yang mengunduh — memicu
 * `<a download>` — ada di komponen, karena itu memang urusan peramban.
 */

/**
 * Susun isi berkas Markdown dari judul Topik dan badan Catatan.
 *
 * Judul ditulis sebagai heading `#`, sehingga berkasnya bisa dibaca sebagai dokumen
 * utuh tanpa kehilangan konteks Topik apa yang dibahas. Badan tulisan ditambahkan apa
 * adanya — ia sudah Markdown, dan menyuntingnya (mis. meng-escape) akan mengubah
 * tulisan pemelajar, yang justru merusak gunanya sebagai salinan.
 *
 * Badan yang kosong (atau hanya spasi) menghasilkan berkas berisi judul saja, tanpa
 * baris kosong menggantung di ujungnya.
 */
export function markdownCatatan(judul: string, isi: string): string {
  const badan = isi.trimEnd();
  if (badan.length === 0) return `# ${judul}\n`;
  return `# ${judul}\n\n${badan}\n`;
}

/**
 * Nama berkas unduhan untuk sebuah Topik.
 *
 * Selalu `<slug>.md`: slug sudah aman dipakai sebagai nama berkas (huruf kecil dan
 * tanda hubung), dan pemelajar melihat Topik yang sama di URL. Judul **tidak** dipakai
 * sebagai nama berkas karena ia bisa memuat spasi dan tanda baca yang harus di-escape
 * berbeda di tiap sistem operasi.
 */
export function namaBerkasCatatan(slug: string): string {
  return `${slug}.md`;
}
