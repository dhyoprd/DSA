/**
 * Bahasa antarmuka: apa saja yang bisa dipilih, dan bagaimana nilai mentah dibaca.
 *
 * Dua hal yang mudah tertukar di sini:
 *
 * - **Bahasa yang berlaku** — `"id"` atau `"en"`. Ia datang dari segmen URL
 *   (`/id/...`, `/en/...`), **bukan** dari penyimpanan peramban. URL adalah sumber
 *   kebenarannya: itulah yang membuat Materi tetap halaman statis, tautannya bisa
 *   dibagikan, dan setiap halaman bisa di-cache per bahasa.
 * - **Pilihan yang diingat** — cookie `dsa-bahasa`. Ia dipakai **satu** tempat:
 *   `src/proxy.ts` membacanya saat permintaan tidak menyebut bahasa (`/`,
 *   `/topik/stack`) untuk memutuskan ke bahasa mana permintaan itu dialihkan.
 *
 * Karena bahasa yang berlaku selalu datang dari URL, modul ini murni: tidak
 * menyentuh DOM, cookie, maupun React, kecuali [`simpanPilihanBahasa`] yang menulis
 * cookie di peramban dan menjaga dirinya dengan `typeof document`. Itu mengikuti pola
 * `tema.ts`: bagian murni bisa diuji dengan test runner Node, bagian yang menyentuh
 * peramban hidup berdampingan dengan komentar yang jelas.
 *
 * Istilah mengikuti kosakata proyek: **Bahasa**. Nilainya memakai kode ISO 639-1
 * (`id`, `en`) karena itu yang dibaca `<html lang>` dan mesin pencari.
 */

/** Bahasa yang tersedia, urut tampil. Urutan ini juga urutan tombol pengalih. */
export const BAHASA = ["id", "en"] as const;

/** Satu bahasa yang sah. */
export type Bahasa = (typeof BAHASA)[number];

/**
 * Bahasa yang dipakai saat belum ada pilihan yang tersimpan.
 *
 * `"id"`, bukan `"en"`, karena user story 66 meminta antarmuka situs berbahasa
 * Indonesia supaya terasa milik pemakainya sendiri. Materi tetap dua bahasa; yang
 * diberi awalan Indonesia hanyalah bahasa awal.
 */
export const BAHASA_BAWAAN: Bahasa = "id";

/**
 * Nama cookie pilihan bahasa.
 *
 * Satu tempat, supaya penulisnya (pengalih bahasa di peramban) dan pembacanya
 * (`proxy.ts` di server) tidak bisa berbeda kunci. Cookie dipilih daripada
 * `localStorage` karena hanya cookie yang ikut terkirim pada permintaan halaman,
 * sehingga pengalihan `/` ke bahasa yang diingat bisa diputuskan **di server** —
 * sebelum halaman dirender, tanpa kedipan bahasa.
 */
export const KUNCI_BAHASA = "dsa-bahasa";

/** Masa berlaku cookie pilihan bahasa, dalam detik (satu tahun). */
const UMUR_COOKIE = 31_536_000;

/**
 * Apakah nilai ini salah satu bahasa yang sah.
 *
 * Dipakai untuk dua nilai yang bentuknya sama tetapi asalnya berbeda: segmen URL
 * (`params.bahasa`) dan isi cookie. Keduanya teks yang tidak bisa dipercaya sebelum
 * diperiksa.
 */
export function adalahBahasa(nilai: unknown): nilai is Bahasa {
  return typeof nilai === "string" && (BAHASA as readonly string[]).includes(nilai);
}

/**
 * Baca bahasa dari nilai mentah, dengan bahasa bawaan sebagai cadangan.
 *
 * Nilai yang tidak dikenal — termasuk `null` saat cookie belum ada — berarti bahasa
 * bawaan. Menganggapnya `"en"` akan menampilkan antarmuka English kepada pemakai yang
 * belum pernah memilih apa pun, dan itu kebalikan dari default yang ditetapkan.
 */
export function bacaBahasa(mentah: string | null | undefined): Bahasa {
  return adalahBahasa(mentah) ? mentah : BAHASA_BAWAAN;
}

/**
 * Bahasa yang tersirat dari sebuah pathname, atau `null` kalau tidak ada.
 *
 * Segmen pertama pathname adalah bahasa (`/en/topik/stack` → `"en"`). Mengembalikan
 * `null` — bukan bahasa bawaan — supaya pemanggil yang mendapat pathname tanpa bahasa
 * melihat keadaannya apa adanya, bukan nilai yang diam-diam ditebak. Halaman yang
 * dirender selalu berada di bawah `/[bahasa]`, jadi `null` menandakan kesalahan,
 * bukan keadaan normal.
 *
 * Dipakai pengalih bahasa: komponennya perlu tahu bahasa mana yang sedang aktif untuk
 * menandai tombolnya dan untuk menyusun tautan ke bahasa lain.
 */
export function bahasaDariPathname(pathname: string): Bahasa | null {
  const segmenPertama = pathname.split("/")[1] ?? "";
  return adalahBahasa(segmenPertama) ? segmenPertama : null;
}

/**
 * Pathname yang sama, dengan bahasanya ditukar.
 *
 * Inilah satu-satunya aturan "pindah bahasa tetap di halaman yang sama": dari
 * `/id/topik/stack` ke `/en/topik/stack`. Menyusunnya di sini — bukan di komponen —
 * supaya bisa diuji tanpa merender apa pun, dan supaya pengalih bahasa tidak perlu
 * tahu bentuk URL halaman.
 *
 * Pathname yang belum berbahasa diberi awalan bahasa tujuan; itu membuat fungsi ini
 * tetap benar kalau suatu saat dipanggil dari luar `/[bahasa]`.
 */
export function gantiBahasa(pathname: string, bahasa: Bahasa): string {
  const bagian = pathname.split("/");

  // `bagian[0]` selalu "" karena pathname dimulai dengan "/".
  if (adalahBahasa(bagian[1])) {
    bagian[1] = bahasa;
    return bagian.join("/");
  }

  return `/${bahasa}${pathname === "/" ? "" : pathname}`;
}

/**
 * Simpan pilihan bahasa ke cookie, supaya kunjungan berikutnya ke `/` memakai bahasa
 * yang sama. Mengembalikan `false` kalau cookie tidak bisa ditulis.
 *
 * Atributnya: `path=/` supaya berlaku di seluruh situs, `max-age` satu tahun supaya
 * tidak perlu diisi ulang, dan `samesite=lax` supaya cookie ikut pada navigasi biasa
 * tetapi tidak pada permintaan lintas situs. `secure` sengaja **tidak** dipasang:
 * di pengembangan situs disajikan lewat `http`, dan cookie `secure` akan diabaikan
 * di sana — pilihan yang tampak tersimpan padahal tidak.
 *
 * Aman dipanggil dari server: tanpa `document`, ia mengembalikan `false`.
 */
export function simpanPilihanBahasa(bahasa: Bahasa): boolean {
  if (typeof document === "undefined") return false;

  try {
    document.cookie =
      `${KUNCI_BAHASA}=${bahasa}; path=/; max-age=${String(UMUR_COOKIE)}; samesite=lax`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Nama tiap bahasa untuk tombol pengalih, ditulis **dalam bahasa itu sendiri**
 * (*endonim*): "Indonesia" dan "English", bukan terjemahannya.
 *
 * Sengaja bukan bagian dari kamus antarmuka. Kamus menerjemahkan kalimat; nama bahasa
 * tidak diterjemahkan — pemakai yang tersesat di antarmuka English harus tetap
 * mengenali tombol menuju bahasanya. Karena itu peta ini sama di kedua bahasa.
 */
export const NAMA_BAHASA: Record<Bahasa, string> = {
  id: "Indonesia",
  en: "English",
};
