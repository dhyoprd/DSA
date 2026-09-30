/**
 * Gerbang validasi konten saat build.
 *
 * Satu tempat yang memutuskan: kalau konten tidak sah, build berhenti. Dipanggil dari
 * `next.config.ts`, sehingga berjalan pada `next build` **dan** `next dev` tanpa perlu
 * script terpisah atau disiplin manual. Konten yang rusak ketahuan saat build, bukan
 * saat sedang belajar.
 *
 * Modul ini terpisah dari `muat.ts` karena punya alasan berbeda untuk berubah: `muat.ts`
 * berubah kalau cara memuat berubah, sedangkan modul ini berubah kalau *kebijakan*
 * gerbang berubah. Kebijakan berikutnya sudah diketahui: ticket #10 menambahkan
 * pemeriksaan bahwa `solusi_referensi` lulus test case-nya sendiri — itu butuh mesin
 * Eksekusi Kode, dan tempatnya di sini, bukan di `periksa.ts` yang murni.
 */

import { GalatKonten, muatKonten, type Konten } from "./muat.ts";

/**
 * Jalankan gerbang validasi konten.
 *
 * Mengembalikan konten kalau sah. Kalau tidak, melempar `Error` biasa berisi daftar
 * masalah yang sudah diformat, supaya pesannya terbaca langsung di keluaran build.
 *
 * `GalatKonten` sengaja dibungkus: pesan Next.js untuk galat di `next.config.ts`
 * tidak menampilkan isi galat secara utuh, jadi pesannya disusun ulang di sini dan
 * di-`console.error` juga, agar pasti terlihat.
 */
export function jalankanGerbangKonten(): Konten {
  try {
    return muatKonten();
  } catch (galat) {
    if (galat instanceof GalatKonten) {
      const pesan = [
        "",
        "Gerbang validasi konten menghentikan build.",
        "",
        galat.message,
        "",
        "Perbaiki berkas di content/ lalu jalankan ulang. Skema dan aturannya ada di",
        "issue #1 dan content/README.md.",
        "",
      ].join("\n");
      console.error(pesan);
      throw new Error("Konten tidak sah — lihat daftar masalah di atas.");
    }
    throw galat;
  }
}
