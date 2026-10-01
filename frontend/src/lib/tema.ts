/**
 * Pilihan tema, dan bagaimana ia menjadi atribut di `<html>`.
 *
 * Ada dua lapisan yang mudah tertukar:
 *
 * - **Pilihan** — apa yang dipilih pemakai: `"sistem"`, `"terang"`, atau `"gelap"`.
 *   Inilah yang diingat antar kunjungan.
 * - **Atribut** — nilai `data-theme` di `<html>`: `"light"`, `"dark"`, atau tidak
 *   ada sama sekali. Tidak adanya atribut berarti "ikut sistem", dan itulah yang
 *   membuat `docs/design-tree.md` ("default mengikuti sistem") berlaku.
 *
 * **Bagian murni** — [`bacaPilihanTema`], [`atributTema`], dan [`skripTema`] — tidak
 * menyentuh `localStorage` maupun DOM, sehingga bisa diuji dengan test runner Node
 * yang tidak punya keduanya. Tiga fungsi lain sengaja tetap di berkas ini karena
 * aturannya sama dan memisahkannya hanya akan membuat dua berkas yang harus dibaca
 * bersama: [`ambilPilihanTema`] dan [`simpanPilihanTema`] menyentuh `localStorage`,
 * [`pasangTema`] menyentuh `<html>`.
 *
 * [`ambilPilihanTema`] sengaja **tidak** berbagi penolong dengan `ambilToken` di
 * `token.ts`, walaupun bentuk penjagaannya serupa. Yang sama hanyalah empat baris
 * pipa pelindung (`window` → `try` → `catch`); yang berbeda adalah nilai cadangan dan
 * pengolahan sesudahnya. Menyatukannya akan membuat fitur tampilan bergantung pada
 * modul yang mengurus autentikasi API — kopel yang lebih mahal daripada pengulangan
 * yang dihindarinya. Pola yang sama dipakai repo ini untuk hal lain: abstraksi
 * ditambahkan saat ada dua pemakai yang **memang** butuh bentuk yang sama.
 *
 * **Skrip sebaris tidak bisa mengimpor fungsi di sini.** Ia harus berjalan sebelum
 * React hidup, jadi ia harus berupa teks — dan teks itu disusun [`skripTema`] dari
 * peta yang sama dengan [`atributTema`]. Uji di `tema.test.ts` menjalankan teks
 * tersebut lalu membandingkan hasilnya dengan `atributTema`, supaya keduanya tidak
 * bisa menyimpang tanpa ketahuan.
 */

/** Kunci `localStorage`. Satu tempat, supaya skrip dan komponen tidak bisa beda. */
export const KUNCI_TEMA = "dsa-tema";

/** Pilihan yang tersedia, urut tampil. */
export const PILIHAN_TEMA = ["sistem", "terang", "gelap"] as const;

export type PilihanTema = (typeof PILIHAN_TEMA)[number];

/**
 * Nilai `data-theme` untuk setiap pilihan.
 *
 * `null` berarti atributnya **dihapus**, sehingga CSS kembali mengikuti pengaturan
 * sistem. Menghapus, bukan menulis `"sistem"`: `data-theme` adalah tempat CSS
 * membaca, dan nilai yang tidak dikenal CSS hanya akan menyamarkan bahwa tidak ada
 * tema yang dipilih.
 */
export const ATRIBUT_TEMA: Record<PilihanTema, "light" | "dark" | null> = {
  sistem: null,
  terang: "light",
  gelap: "dark",
};

/**
 * Baca pilihan dari nilai mentah `localStorage`.
 *
 * Nilai yang tidak dikenal — termasuk `null` saat belum pernah dipilih — berarti
 * `"sistem"`. Menganggapnya `"terang"` akan menimpa preferensi sistem pemakai
 * tanpa ia meminta, dan itu justru kebalikan dari default yang ditetapkan.
 */
export function bacaPilihanTema(mentah: string | null): PilihanTema {
  const cocok = PILIHAN_TEMA.find((pilihan) => pilihan === mentah);
  return cocok ?? "sistem";
}

/** Nilai `data-theme` untuk sebuah pilihan. */
export function atributTema(pilihan: PilihanTema): "light" | "dark" | null {
  return ATRIBUT_TEMA[pilihan];
}

/**
 * Baca pilihan yang tersimpan, atau `"sistem"` kalau belum ada.
 *
 * `localStorage` bisa melempar: mode privat, data situs yang diblokir, atau kuota
 * penuh. Semua diperlakukan sama — seolah belum pernah memilih — sehingga halaman
 * tetap tampil dengan tema sistem alih-alih gagal.
 *
 * Aman dipanggil dari server: `window` diperiksa lebih dulu.
 */
export function ambilPilihanTema(): PilihanTema {
  if (typeof window === "undefined") return "sistem";

  try {
    return bacaPilihanTema(window.localStorage.getItem(KUNCI_TEMA));
  } catch {
    return "sistem";
  }
}

/**
 * Simpan pilihan. Mengembalikan `false` kalau peramban menolak menyimpannya.
 *
 * Pilihan `"sistem"` **disimpan sebagai nilai**, bukan dihapus dari penyimpanan.
 * Menghapusnya juga akan membuat halaman mengikuti sistem — hasil akhirnya sama —
 * tetapi menyimpannya membuat tiga pilihan diperlakukan seragam, sehingga tidak ada
 * cabang "kecuali sistem" yang harus diingat di setiap tempat yang membaca pilihan.
 *
 * Aman dipanggil dari server: `window` diperiksa lebih dulu, dan tanpa itu fungsi ini
 * mengembalikan `false` alih-alih melempar.
 */
export function simpanPilihanTema(pilihan: PilihanTema): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(KUNCI_TEMA, pilihan);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pasang pilihan ke `<html>` sekarang juga.
 *
 * Dipanggil pengalih tema saat pemakai memilih. Atributnya dipasang lebih dulu,
 * sebelum React merender ulang, supaya warna halaman berubah seketika — bukan
 * menunggu satu putaran render.
 *
 * Atribut yang **dihapus** untuk `"sistem"`, bukan diisi nilai khusus: itulah yang
 * membuat CSS kembali mengikuti `prefers-color-scheme`. Aturan yang sama dipakai
 * [`skripTema`], sehingga pilihan yang sama menghasilkan atribut yang sama baik
 * dipasang skrip maupun komponen.
 *
 * Aman dipanggil dari server: tidak melakukan apa pun di sana.
 */
export function pasangTema(pilihan: PilihanTema): void {
  if (typeof document === "undefined") return;

  const nilai = atributTema(pilihan);
  if (nilai === null) {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", nilai);
  }
}

/**
 * Skrip sebaris yang memasang `data-theme` **sebelum cat pertama**.
 *
 * Tanpa ini, halaman dirender dengan tema terang lalu berkedip ke gelap begitu React
 * hidup — dan kedipan itu terjadi di setiap kunjungan, bukan sekali.
 *
 * `try/catch` menutup mode privat dan data situs yang diblokir, tempat
 * `localStorage` melempar. Di situ atributnya tidak disentuh, sehingga halaman tetap
 * tampil dengan tema sistem alih-alih gagal.
 *
 * Peta pilihan → atribut disisipkan sebagai JSON dari `ATRIBUT_TEMA`, jadi tidak ada
 * salinan kedua yang bisa menyimpang.
 */
export function skripTema(): string {
  const peta = JSON.stringify(ATRIBUT_TEMA);
  return (
    `(function(){try{var p=localStorage.getItem(${JSON.stringify(KUNCI_TEMA)});` +
    `var a=${peta}[p];` +
    `if(a){document.documentElement.setAttribute("data-theme",a)}` +
    `else{document.documentElement.removeAttribute("data-theme")}` +
    `}catch(e){}})()`
  );
}
