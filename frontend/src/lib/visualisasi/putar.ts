/**
 * Aturan pemutaran Visualisasi: langkah ke berapa sekarang, dan sedang berjalan atau
 * tidak.
 *
 * **Kenapa di luar komponen.** Kriteria penerimaan #15 meminta empat hal yang semuanya
 * soal keadaan: bisa maju, bisa **mundur** langkah demi langkah, bisa diputar ulang,
 * dan bisa berjalan sendiri. Aturan itu gampang ditulis di dalam komponen dengan
 * `useState` — dan begitu ditulis di sana, satu-satunya cara mengujinya adalah
 * merender React. Padahal yang paling perlu diuji justru batasnya: tombol mundur di
 * langkah 0, tombol maju di langkah terakhir, dan pemutaran otomatis yang harus
 * berhenti sendiri di ujung. Semuanya bisa salah tanpa satu pun error muncul.
 *
 * **Modul murni.** Masukannya keadaan sekarang, keluarannya keadaan berikutnya. Tidak
 * menyentuh DOM, React, maupun timer. Komponen yang memakainya hanya menggambar dan
 * memasang `setInterval`; aturan "apa yang terjadi" ada di sini.
 *
 * **Bedanya `maju` dan `majuOtomatis`.** Keduanya menambah satu langkah, tetapi
 * `maju` adalah tindakan pemakai dan `majuOtomatis` adalah timer:
 *
 * - `maju` **menghentikan** pemutaran. Pemakai yang menekan maju sedang mengambil
 *   kendali; kalau timer tetap berjalan, langkahnya melompat dua-tiga sekaligus dan
 *   justru langkah itulah yang ingin ia perhatikan.
 * - `majuOtomatis` yang mencapai ujung **menghentikan dirinya sendiri**. Tanpa itu,
 *   timer terus berdetak pada keadaan yang tidak berubah, dan tombolnya tetap
 *   bertuliskan "jeda" padahal tidak ada lagi yang berjalan.
 */

import { diUjung, type Langkah } from "./struktur.ts";

/** Keadaan pemutaran: posisi sekarang, dan apakah sedang berjalan sendiri. */
export interface KeadaanPutar {
  /**
   * Jumlah langkah yang sudah dijalankan (0 … `langkah.length`).
   *
   * Sama artinya dengan `indeks` di `keadaanPada`: ia adalah **jumlah langkah yang
   * sudah dijalankan**, bukan posisi langkah yang sedang disorot.
   */
  indeks: number;
  /** Sedang berjalan sendiri mengikuti timer. */
  bermain: boolean;
}

/** Keadaan awal: belum ada langkah yang dijalankan, tidak sedang berjalan. */
export function keadaanPutarAwal(): KeadaanPutar {
  return { indeks: 0, bermain: false };
}

/**
 * Maju satu langkah, karena pemakai menekannya.
 *
 * Berhenti di ujung (dijepit ke `langkah.length`), dan **menghentikan pemutaran** —
 * lihat alasan di atas.
 */
export function maju(keadaan: KeadaanPutar, langkah: Langkah[]): KeadaanPutar {
  return {
    indeks: Math.min(keadaan.indeks + 1, langkah.length),
    bermain: false,
  };
}

/**
 * Mundur satu langkah, karena pemakai menekannya.
 *
 * Berhenti di awal (dijepit ke `0`) dan menghentikan pemutaran. Batas `0` penting:
 * tanpa penjepitan, menekan mundur dari keadaan kosong menghasilkan indeks negatif,
 * dan `keadaanPada` harus menanganinya — pembagian tanggung jawab yang tidak jelas.
 */
export function mundur(keadaan: KeadaanPutar): KeadaanPutar {
  return { indeks: Math.max(keadaan.indeks - 1, 0), bermain: false };
}

/**
 * Kembali ke awal, dan berhenti.
 *
 * Kriteria penerimaan meminta Visualisasi "bisa diputar ulang dari awal". Tombolnya
 * mengembalikan ke keadaan kosong — bukan ke langkah pertama — supaya pemelajar
 * melihat strukturnya kosong lebih dulu, lalu setiap langkah masuk satu per satu.
 * Berhenti memutar karena keadaan yang baru direset tidak boleh langsung berlari.
 */
export function ulang(): KeadaanPutar {
  return keadaanPutarAwal();
}

/**
 * Mulai berjalan sendiri.
 *
 * **Kalau sudah di ujung, ia mengulang dari awal.** Alternatifnya adalah tidak
 * melakukan apa-apa — dan itu berarti tombol "putar" menjadi mati di ujung tanpa
 * menjelaskan kenapa, sehingga pemelajar harus menemukan sendiri bahwa ia perlu
 * menekan "ulang" dulu. Mengulang dari awal adalah yang dilakukan pemutar media mana
 * pun, dan tombol "ulang" tetap ada untuk yang ingin berhenti di keadaan kosong.
 */
export function putar(keadaan: KeadaanPutar, langkah: Langkah[]): KeadaanPutar {
  if (diUjung(langkah, keadaan.indeks)) {
    return { indeks: 0, bermain: true };
  }
  return { indeks: keadaan.indeks, bermain: true };
}

/** Berhenti berjalan sendiri, tanpa mengubah posisi. */
export function jeda(keadaan: KeadaanPutar): KeadaanPutar {
  return { indeks: keadaan.indeks, bermain: false };
}

/**
 * Satu detak timer: maju satu langkah, atau berhenti kalau sudah di ujung.
 *
 * Berbeda dari `maju` dalam dua hal: ia **tidak** menyalakan `bermain` (timer sudah
 * berjalan), dan ia **mematikannya** begitu langkah terakhir tercapai.
 */
export function majuOtomatis(keadaan: KeadaanPutar, langkah: Langkah[]): KeadaanPutar {
  const berikutnya = Math.min(keadaan.indeks + 1, langkah.length);
  return { indeks: berikutnya, bermain: !diUjung(langkah, berikutnya) };
}

/**
 * Jeda antar langkah saat berjalan sendiri, dalam milidetik.
 *
 * Cukup lambat untuk dilihat dan dibaca, cukup cepat untuk tidak membosankan pada
 * rangkaian pendek. Ia di sini, bukan di komponen, karena ia bagian dari aturan
 * pemutaran — dan karena uji "berapa lama" tidak masuk akal dijalankan di komponen.
 */
export const JEDA_OTOMATIS_MS = 900;
