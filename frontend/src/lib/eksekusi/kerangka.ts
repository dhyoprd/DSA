/**
 * Kerangka kode awal untuk editor Soal Kode.
 *
 * **Modul murni.** Masukannya nama fungsi, keluarannya teks Python. Tidak menyentuh
 * React maupun DOM, sehingga bisa diuji dengan test runner Node.
 *
 * **Kenapa kerangka, bukan editor kosong.** Pemelajar di proyek ini awam DSA dan
 * belum pernah menulis Python untuk struktur data. Editor yang benar-benar kosong
 * membuatnya harus menebak dari mana mulai — termasuk **nama fungsi yang dipanggil
 * test case**, padahal itu bukan bagian dari soalnya. Kerangka ini menghilangkan
 * tebakan itu dan menyisakan pekerjaan yang memang jadi soalnya: mengimplementasikan
 * strukturnya.
 *
 * **Kenapa `*args`, bukan nama parameter.** Yang diketahui dari data hanya nama fungsi
 * (field `fungsi`), bukan nama parameternya. Mengarang nama seperti `perintah` akan
 * benar untuk Soal Stack ini dan salah untuk Soal berikutnya — dan kerangka yang salah
 * lebih buruk daripada kerangka yang umum. `*args` selalu benar: test case memanggil
 * dengan argumen posisional, jadi apa pun bentuk Soalnya, kerangka ini menerimanya.
 * Skenario Soal di atas editor yang menjelaskan bentuk argumennya; kerangka ini tidak
 * perlu mengulanginya.
 *
 * **Yang tidak ada di sini: `solusi_referensi`.** Kerangka ini sengaja tidak memuat
 * satu baris pun logika jawaban. Kalau ia memuatnya, latihannya hilang — dan itu kelas
 * cacat yang tidak akan terlihat dari uji mana pun, karena kodenya tetap "berjalan".
 */

/**
 * Kerangka kode untuk sebuah Soal Kode.
 *
 * `namaFungsi` datang dari `content/<slug>.yaml` (field `fungsi`). Nilai yang tidak
 * sah sebagai nama fungsi Python tetap dikembalikan apa adanya — gerbang konten yang
 * bertanggung jawab menolaknya, bukan fungsi ini. Menambahkan pemeriksaan di sini akan
 * menyembunyikan masalah konten dari tempat yang seharusnya melaporkannya.
 */
export function kerangkaAwal(namaFungsi: string): string {
  return [
    `def ${namaFungsi}(*args):`,
    "    # Tulis implementasimu di sini, lalu tekan Jalankan.",
    "    pass",
    "",
  ].join("\n");
}
