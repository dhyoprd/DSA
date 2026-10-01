/**
 * Tempat token rahasia disimpan di browser.
 *
 * Satu modul, supaya tidak ada pembacaan `localStorage` yang tersebar dan supaya
 * satu-satunya hal yang perlu diperiksa saat mengubah cara penyimpanan adalah berkas
 * ini. Keputusan "diketik sekali di antarmuka" ada di
 * `docs/adr/0011-token-diketik-di-antarmuka.md`.
 *
 * Bagian yang murni (normalisasi token) dipisah dari bagian yang menyentuh browser,
 * supaya aturannya bisa diuji tanpa DOM — uji di repo ini memakai test runner Node,
 * yang tidak punya `localStorage`.
 */

/** Kunci penyimpanan. Satu tempat, supaya tidak ada salah ketik yang senyap. */
const KUNCI = "dsa-api-token";

/**
 * Rapikan token yang diketik pemakai.
 *
 * Pemakai menempel token dari terminal, dan tempelan hampir selalu membawa spasi
 * atau baris baru di ujungnya. Tanpa ini, token yang benar akan ditolak `401` dan
 * pemakai tidak punya cara melihat kenapa — perbedaan spasi tidak terlihat di layar.
 *
 * Fungsi murni: masukannya teks, keluarannya teks. Mengembalikan `null` kalau setelah
 * dirapikan tidak ada isinya, supaya "belum diisi" dan "diisi kosong" tidak menjadi
 * dua keadaan berbeda.
 */
export function normalkanToken(mentah: string): string | null {
  const bersih = mentah.trim();
  return bersih.length > 0 ? bersih : null;
}

/**
 * Ambil token yang tersimpan, atau `null` kalau belum ada.
 *
 * `localStorage` bisa melempar: mode privat, data situs yang diblokir, atau kuota
 * penuh. Semua itu diperlakukan sama — seolah token belum diisi — sehingga halaman
 * tetap tampil dan pemakai diminta mengisi token, bukan melihat layar galat.
 *
 * Aman dipanggil dari server: `window` diperiksa lebih dulu, sehingga komponen yang
 * dirender di server tidak gagal.
 */
export function ambilToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const tersimpan = window.localStorage.getItem(KUNCI);
    return tersimpan === null ? null : normalkanToken(tersimpan);
  } catch {
    return null;
  }
}

/**
 * Simpan token. Mengembalikan `false` kalau browser menolak menyimpannya.
 *
 * Pemanggil memakai nilai kembaliannya untuk memberi tahu pemakai bahwa tokennya
 * tidak bisa diingat — lebih baik daripada diam-diam gagal dan meminta token lagi
 * di setiap halaman tanpa penjelasan.
 */
export function simpanToken(mentah: string): boolean {
  const bersih = normalkanToken(mentah);
  if (bersih === null) return false;

  try {
    window.localStorage.setItem(KUNCI, bersih);
    return true;
  } catch {
    return false;
  }
}

/** Hapus token yang tersimpan. */
export function hapusToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KUNCI);
  } catch {
    // Tidak ada yang bisa dilakukan kalau browser menolak; keadaan yang diinginkan
    // adalah token tidak ada, dan itu memang hasil akhirnya.
  }
}
