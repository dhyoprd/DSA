/**
 * Draf kode Soal Kode, disimpan agar tidak hilang saat berpindah halaman.
 *
 * Kriteria penerimaan #10 berbunyi: "Draft kode tidak hilang saat berpindah halaman".
 * Penyimpanan yang dipilih `sessionStorage`, dengan alasan yang sama seperti id sesi
 * Kuis (ADR-0014): ia bertahan melewati muat ulang dan perpindahan rute, dan hilang
 * saat tab ditutup. Itu arti "satu sesi" — sekali duduk, tulisannya tetap ada; besok,
 * pemelajar mulai dari kode awalnya lagi.
 *
 * **Kenapa bukan `localStorage`.** `localStorage` akan mengabadikan satu draf
 * selamanya. Pemelajar yang membuka Soal yang sama berbulan-bulan kemudian akan
 * menemukan tulisannya yang lama, bukan halaman bersih — dan tidak ada cara jelas
 * untuk membedakan "draf yang belum selesai" dari "tulisan lama yang sudah selesai".
 * Kode draf juga bukan Catatan: ia bukan tulisan yang ingin dibaca ulang.
 *
 * **Kenapa bukan backend.** Kode draf berubah setiap beberapa ketikan. Menyimpannya
 * ke backend berarti satu permintaan per jeda ketikan, dan itu justru membebani
 * layanan yang sama yang menjalankan kode. Draf hanya perlu bertahan selama pemelajar
 * berpindah-pindah halaman di satu tab.
 *
 * **Bagian murni dipisah dari bagian yang menyentuh peramban** (`kunciDraf` dan
 * `bacaDraf` dari `simpanDraf`/`hapusDraf`), supaya aturannya bisa diuji dengan test
 * runner Node yang tidak punya `sessionStorage`.
 */

import type { Bahasa } from "../bahasa/bahasa.ts";

/**
 * Kunci penyimpanan draf untuk satu Soal dalam satu bahasa.
 *
 * **Bahasa ikut jadi bagian kunci.** Kode yang ditulis untuk Materi bahasa Indonesia
 * dan kode untuk bahasa English adalah dua percobaan yang berbeda — Soalnya punya
 * skenario yang berbeda di tiap bahasa, dan pemelajar yang berpindah bahasa sedang
 * mengerjakan versi yang lain. Menyatukan keduanya berarti suntingan di satu bahasa
 * menimpa draf di bahasa yang lain tanpa peringatan.
 *
 * **Slug dan indeks ikut jadi bagian kunci.** Satu Topik punya satu Soal Kode, tetapi
 * bentuk kuncinya menyertakan indeks supaya tidak ada asumsi "satu Soal Kode per
 * Topik" yang tertanam di sini — bentuk kunci yang salah akan membuat draf dua Soal
 * saling menimpa begitu Topik kedua punya lebih dari satu.
 */
export function kunciDraf(bahasa: Bahasa, slugTopik: string, indeksSoal: number): string {
  return `dsa-draf-soal-kode:${bahasa}:${slugTopik}:${String(indeksSoal)}`;
}

/**
 * Baca draf dari nilai mentah penyimpanan.
 *
 * Mengembalikan `null` kalau belum ada draf. **Tidak** memeriksa apakah isinya kode
 * yang masuk akal: apa pun yang tersimpan di sana adalah tulisan pemelajar, dan
 * menolaknya karena bentuknya tidak dikenal berarti menghapus pekerjaannya tanpa
 * penjelasan. Satu-satunya pemeriksaan adalah tipe — nilai yang bukan teks (mis. dari
 * versi lama yang menyimpan objek) diabaikan.
 */
export function bacaDraf(mentah: string | null): string | null {
  return typeof mentah === "string" ? mentah : null;
}

/**
 * Simpan draf. Mengembalikan `false` kalau peramban menolak menyimpannya.
 *
 * Pemanggil memakai nilai kembaliannya untuk diam saja, bukan menampilkan galat:
 * penyimpanan draf adalah kenyamanan, bukan fitur yang kegagalannya perlu mengganggu
 * pemelajar yang sedang menulis kode. Mode privat dan kuota penuh adalah keadaan yang
 * normal, bukan kesalahan.
 */
export function simpanDraf(kunci: string, kode: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.sessionStorage.setItem(kunci, kode);
    return true;
  } catch {
    // Mode privat, data situs diblokir, atau kuota penuh. Semua diperlakukan sama:
    // drafnya tidak tersimpan, dan pemelajar tetap bisa bekerja.
    return false;
  }
}

/** Baca draf yang tersimpan, atau `null` kalau belum ada. */
export function ambilDraf(kunci: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    return bacaDraf(window.sessionStorage.getItem(kunci));
  } catch {
    return null;
  }
}

/**
 * Hapus draf yang tersimpan.
 *
 * Dipakai saat pemelajar menekan "kembalikan ke kode awal" — setelah itu tidak ada
 * draf lagi, dan yang benar adalah keadaan bersih, bukan draf lama yang kosong.
 */
export function hapusDraf(kunci: string): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(kunci);
  } catch {
    // Tidak ada yang bisa dilakukan kalau peramban menolak; keadaan yang diinginkan
    // adalah drafnya tidak ada, dan itu memang hasil akhirnya.
  }
}
