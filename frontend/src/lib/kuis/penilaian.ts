/**
 * Penilaian jawaban Kuis, dan aturan kapan Pembahasan boleh terbuka.
 *
 * Semua di sini adalah **fungsi murni** — tanpa React, tanpa DOM, tanpa jaringan.
 * Itu bukan gaya, melainkan keputusan yang sudah ditetapkan issue #1: bug di logika
 * ini bersifat senyap. Jawaban benar bisa ditandai salah tanpa satu pun error, dan
 * pemelajar tidak punya cara membedakannya dari kesalahannya sendiri. Karena itu
 * aturannya hidup di luar komponen, tempat ia bisa diuji langsung.
 *
 * **Progres tidak dikirim ke backend di sini.** Issue #1 menaruh penyimpanan Progres
 * di ticket #8; ticket ini hanya menghitung dan menampilkan. Modul ini sengaja tidak
 * punya fungsi "simpan" — menambahkannya sekarang berarti menebak kontrak API yang
 * belum ada.
 */

/**
 * Keadaan satu Kuis yang sedang dikerjakan.
 *
 * `indeksSalahTerakhir` menyimpan pilihan salah yang **baru saja** dikirim, supaya
 * komponen bisa menandai opsi itu dan tidak menandai pilihan salah yang lama. Ia
 * `null` selama belum ada jawaban salah, dan direset ke `null` begitu jawaban benar —
 * setelah benar, tidak ada lagi yang perlu disorot.
 *
 * Bentuknya sengaja datar dan hanya berisi angka/boolean/null: keadaan ini kelak
 * (ticket #8) akan diserialkan ke Progres, dan bentuk yang sederhana tidak memaksa
 * skema backend menampung struktur bersarang.
 */
export interface KeadaanKuis {
  /** Jumlah jawaban yang sudah dikirim. Bertambah sekali per pengiriman. */
  percobaan: number;
  /** Sudah pernah dijawab benar. Sekali benar, tetap benar. */
  benar: boolean;
  /** Indeks opsi yang terakhir dikirim dan salah, atau `null`. */
  indeksSalahTerakhir: number | null;
}

/** Keadaan awal sebuah Kuis: belum dicoba, belum benar. */
export function keadaanAwal(): KeadaanKuis {
  return { percobaan: 0, benar: false, indeksSalahTerakhir: null };
}

/**
 * Nilai satu jawaban dan kembalikan keadaan berikutnya.
 *
 * Aturannya, berurutan:
 *
 * - **Sudah benar → keadaan tidak berubah.** Kuis yang sudah dijawab benar tidak bisa
 *   dikirim lagi dari antarmuka, tetapi fungsi ini tetap harus tahan dipanggil dua
 *   kali: klik ganda pada opsi benar tidak boleh menghitung dua percobaan. Menjadikan
 *   pengiriman kedua tidak berpengaruh lebih sederhana daripada mengandalkan
 *   antarmuka menonaktifkan tombolnya.
 * - **Benar → `benar: true`, penghitung tetap bertambah.** Jawaban benar tetap satu
 *   percobaan; itulah angka yang jujur untuk user story 30 ("berapa kali saya
 *   mencoba").
 * - **Salah → penghitung bertambah, `benar` tetap `false`.** Tidak ada batas jumlah
 *   percobaan: user story 21 minta percobaan ulang tanpa syarat.
 *
 * `indeksBenar` diberikan pemanggil, bukan dicari di sini: penentuan opsi mana yang
 * benar adalah urusan data (`benar: true` di YAML), dan modul ini tidak perlu tahu
 * bentuk `OpsiKuis`.
 */
export function nilaiJawaban(
  keadaan: KeadaanKuis,
  indeksDipilih: number,
  indeksBenar: number,
): KeadaanKuis {
  if (keadaan.benar) return keadaan;

  const percobaan = keadaan.percobaan + 1;

  if (indeksDipilih === indeksBenar) {
    return { percobaan, benar: true, indeksSalahTerakhir: null };
  }

  return { percobaan, benar: false, indeksSalahTerakhir: indeksDipilih };
}

/**
 * Apakah Pembahasan boleh dibaca.
 *
 * Satu aturan, satu tempat. User story 22 dan keputusan `design-tree.md` sama:
 * Pembahasan hanya terbuka setelah jawaban benar. Menyebarkan syarat ini ke komponen
 * akan membuat "tertutup sampai benar" bergantung pada setiap tempat yang merender
 * Pembahasan — dan satu tempat yang lupa berarti jawabannya bocor.
 */
export function pembahasanTerbuka(keadaan: KeadaanKuis): boolean {
  return keadaan.benar;
}
