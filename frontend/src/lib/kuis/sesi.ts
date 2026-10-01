/**
 * Id sesi: apa yang membuat pengacakan opsi "stabil untuk satu sesi".
 *
 * Issue #1 meminta opsi tidak berpindah tempat saat pemelajar mencoba lagi, dan user
 * story 25 menyebut "stabil untuk satu sesi". Maka benih pengacakan tidak boleh
 * berasal dari waktu, urutan pemanggilan, atau `Math.random()` yang dipanggil ulang —
 * ia harus berasal dari sesuatu yang **tetap** selama sesi belajar berlangsung.
 *
 * Yang dipilih: `sessionStorage`, bukan `localStorage`. Bedanya disengaja dan persis
 * yang diminta:
 *
 * - `sessionStorage` hidup selama satu tab terbuka, dan **hilang saat tab ditutup**.
 *   Itu arti "satu sesi" di sini: sekali duduk, urutan opsi tetap; besok, urutannya
 *   boleh berbeda supaya pola posisi tidak bisa dihafal (user story 24).
 * - `localStorage` akan mengabadikan urutan yang sama untuk seterusnya, dan itu justru
 *   mengembalikan kebiasaan "jawabannya di posisi B" yang ingin dihilangkan.
 *
 * Sama seperti `tema.ts` dan `token.ts`, bagian yang murni dipisah dari bagian yang
 * menyentuh peramban, supaya aturannya bisa diuji dengan test runner Node yang tidak
 * punya `sessionStorage`.
 */

/** Kunci `sessionStorage`. Satu tempat, supaya tidak ada salah ketik yang senyap. */
const KUNCI = "dsa-id-sesi";

/**
 * Bentuk id sesi yang diterima dari penyimpanan.
 *
 * Nilai apa pun yang tidak cocok akan dianggap "belum ada sesi" dan diganti. Ini
 * penjaga terhadap isi yang rusak atau disunting tangan: id yang buruk tidak
 * menggagalkan apa pun secara terlihat, ia hanya membuat pengacakan tidak stabil —
 * gejala yang sulit ditelusuri. Membatasinya di sini membuatnya jelas.
 */
const BENTUK_SAH = /^[A-Za-z0-9-]{8,64}$/;

/**
 * Baca id sesi dari nilai mentah `sessionStorage`.
 *
 * Mengembalikan `null` kalau belum ada atau bentuknya tidak sah. `null` berarti
 * "buat yang baru", bukan galat: sesi yang belum punya id adalah keadaan yang normal
 * pada kunjungan pertama.
 */
export function bacaIdSesi(mentah: string | null): string | null {
  if (mentah === null) return null;
  return BENTUK_SAH.test(mentah) ? mentah : null;
}

/**
 * Id sesi baru.
 *
 * `crypto.randomUUID()` dipakai kalau ada. Peramban yang tidak menyediakannya — atau
 * halaman yang tidak berjalan di konteks aman, tempat API itu tidak tersedia — jatuh
 * ke id yang dibangun dari waktu dan keacakan. Keduanya hanya perlu **unik di dalam
 * satu peramban**, karena benih pengacakan tidak pernah dikirim ke mana pun dan tidak
 * dibandingkan dengan id peramban lain.
 */
export function idSesiBaru(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const acak = Math.random().toString(36).slice(2, 10);
  return `sesi-${String(Date.now())}-${acak}`;
}

/**
 * Id sesi yang berlaku sekarang, membuatnya kalau belum ada.
 *
 * Aman dipanggil dari server: tanpa `sessionStorage`, ia mengembalikan id baru
 * sementara yang tidak disimpan. Nilainya tidak akan dipakai untuk merender apa pun
 * (opsi baru diacak setelah komponen hidup di peramban), tetapi fungsi ini tidak
 * boleh melempar kalau dipanggil di sana.
 *
 * `sessionStorage` bisa melempar: mode privat, data situs yang diblokir, atau kuota
 * penuh. Semua diperlakukan sama — id sementara untuk render ini — sehingga Kuis
 * tetap tampil alih-alih gagal. Yang hilang hanyalah kestabilan urutan antar muat
 * ulang, dan itu jauh lebih baik daripada halaman yang tidak bisa dibuka.
 */
export function ambilIdSesi(): string {
  if (typeof window === "undefined") return idSesiBaru();

  try {
    const tersimpan = bacaIdSesi(window.sessionStorage.getItem(KUNCI));
    if (tersimpan !== null) return tersimpan;

    const baru = idSesiBaru();
    window.sessionStorage.setItem(KUNCI, baru);
    return baru;
  } catch {
    return idSesiBaru();
  }
}

// --- Sumber untuk `useSyncExternalStore` ---------------------------------------
//
// Komponen Kuis tidak bisa memanggil `ambilIdSesi()` langsung saat merender. Nilai
// itu hanya ada di peramban, sehingga render di server dan render pertama di klien
// akan menghasilkan urutan opsi yang berbeda — dan React menyebut itu hydration
// mismatch. `useSyncExternalStore` justru dibuat untuk keadaan ini: ia memakai
// `getServerSnapshot` di server **dan** saat hidrasi, lalu menggantinya dengan
// `getSnapshot` sesudahnya. Hasilnya tidak ada peringatan, dan tidak ada kedipan
// urutan seperti kalau id-nya dibaca di `useEffect` — efek berjalan setelah cat
// pertama, sehingga opsi sempat tampil dalam urutan aslinya lebih dulu.
//
// Id sesi tidak pernah berubah selama satu halaman hidup, jadi tidak ada perubahan
// yang perlu diberitahukan: `subscribe` hanya mengembalikan fungsi pelepas. Yang
// penting `getSnapshot` mengembalikan nilai yang sama di setiap pemanggilan, dan
// cache di bawah yang menjaminnya.

/**
 * `getServerSnapshot`: `null`, artinya "id sesi belum diketahui".
 *
 * **Sengaja `null`, bukan teks penanda.** Versi pertama memakai string
 * `"sesi-server"` sebagai penanda, dan itu cacat: penanda itu lolos `BENTUK_SAH`,
 * jadi kalau string tersebut pernah masuk `sessionStorage` — disunting tangan, atau
 * ditulis kode lain — `bacaIdSesi` akan menerimanya sebagai id sungguhan, komponen
 * mengira sesinya sudah siap, dan kelima Kuis tampil sebagai kotak kosong yang
 * terkunci tanpa cara pulih. `null` tidak bisa bertabrakan dengan id mana pun, jadi
 * seluruh kelas cacat itu hilang, bukan sekadar satu nilainya dihindari.
 */
export function idSesiServer(): null {
  return null;
}

let cacheId: string | null = null;

/**
 * `getSnapshot`: id sesi sungguhan, dibaca sekali lalu di-cache.
 *
 * Cache-nya bukan optimasi: `useSyncExternalStore` memanggil ini berkali-kali dan
 * membandingkan hasilnya. Mengembalikan id baru setiap panggilan akan membuat React
 * merender tanpa henti.
 */
export function idSesiKlien(): string {
  cacheId ??= ambilIdSesi();
  return cacheId;
}

/** `subscribe`: id sesi tidak berubah, jadi tidak ada yang perlu diberitahukan. */
export function langgananIdSesi(): () => void {
  return () => {
    // Sengaja kosong. Lihat penjelasan di atas.
  };
}
