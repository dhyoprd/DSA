/**
 * Penilaian jawaban Kuis, dan aturan kapan Pembahasan boleh terbuka.
 *
 * Semua di sini adalah **fungsi murni** — tanpa React, tanpa DOM, tanpa jaringan.
 * Itu bukan gaya, melainkan keputusan yang sudah ditetapkan issue #1: bug di logika
 * ini bersifat senyap. Jawaban benar bisa ditandai salah tanpa satu pun error, dan
 * pemelajar tidak punya cara membedakannya dari kesalahannya sendiri. Karena itu
 * aturannya hidup di luar komponen, tempat ia bisa diuji langsung.
 *
 * **Dua langkah setelah jawaban benar, dan keduanya disengaja** (ticket #8). Menjawab
 * benar tidak langsung membuka Pembahasan:
 *
 * 1. Kotak Penjelasan muncul — tempat pemelajar menulis alasannya dengan kata sendiri.
 * 2. Pembahasan baru terbuka setelah tombol "Bandingkan dengan Pembahasan" ditekan.
 *
 * Kalau Pembahasan terbuka sendiri, langkah pertama dilewati: pemelajar membaca
 * penjelasan referensi lebih dulu, lalu menulis "alasan" yang sebenarnya sudah
 * dipandu jawabannya. Itu kebalikan dari tujuan fitur ini (user story 26–27), dan
 * user story 49 meminta Pembahasan memang "tersembunyi di balik tombol".
 *
 * **Progres tidak dikirim ke backend di sini.** Ticket #8 hanya menghubungkan Kotak
 * Penjelasan; penyambungan Progres ke tampilan belum dikerjakan, dan modul ini tidak
 * menebak kontraknya.
 */

/**
 * Keadaan satu Kuis yang sedang dikerjakan.
 *
 * `indeksSalahTerakhir` menyimpan pilihan salah yang **baru saja** dikirim, supaya
 * komponen bisa menandai opsi itu dan tidak menandai pilihan salah yang lama. Ia
 * `null` selama belum ada jawaban salah, dan direset ke `null` begitu jawaban benar —
 * setelah benar, tidak ada lagi yang perlu disorot.
 *
 * Bentuknya sengaja datar dan hanya berisi angka/boolean/null, supaya tidak memaksa
 * struktur bersarang kalau kelak ia diserialkan. `pembahasanDibuka` ditambahkan ticket
 * #8 dan tetap boolean sederhana.
 */
export interface KeadaanKuis {
  /** Jumlah jawaban yang sudah dikirim. Bertambah sekali per pengiriman. */
  percobaan: number;
  /** Sudah pernah dijawab benar. Sekali benar, tetap benar. */
  benar: boolean;
  /** Indeks opsi yang terakhir dikirim dan salah, atau `null`. */
  indeksSalahTerakhir: number | null;
  /**
   * Pemelajar sudah menekan tombol yang membuka Pembahasan (ticket #8).
   *
   * Terpisah dari `benar`, dan itu intinya: menjawab benar **tidak** membuka
   * Pembahasan. Ada satu langkah di antaranya — menulis alasan di Kotak Penjelasan.
   * Tanpa field ini, kedua keadaan itu tidak bisa dibedakan, dan Pembahasan kembali
   * terbuka sendiri.
   */
  pembahasanDibuka: boolean;
}

/** Keadaan awal sebuah Kuis: belum dicoba, belum benar, Pembahasan tertutup. */
export function keadaanAwal(): KeadaanKuis {
  return {
    percobaan: 0,
    benar: false,
    indeksSalahTerakhir: null,
    pembahasanDibuka: false,
  };
}

/**
 * Keadaan Kuis yang sudah dijawab benar, dipulihkan dari tulisan Kotak Penjelasan
 * yang tersimpan di backend (ticket #8).
 *
 * **Kenapa ini perlu.** `KeadaanKuis` hidup di memori komponen, jadi ia kembali ke
 * `keadaanAwal()` setiap kali halaman dimuat ulang — dan kriteria penerimaan #8
 * meminta "Tulisan muncul kembali saat Kuis itu dibuka lagi". Tanpa pemulihan ini,
 * Kotak Penjelasan tidak akan muncul sama sekali setelah muat ulang, karena
 * kemunculannya bergantung pada `benar`.
 *
 * **Kenapa adanya tulisan tersimpan sah dijadikan bukti "sudah benar".** Kotak
 * Penjelasan hanya muncul setelah jawaban benar, jadi tulisan tidak mungkin ada tanpa
 * jawaban benar lebih dulu. Kesimpulan itu berlaku karena aturan kemunculannya
 * sendiri — bukan tebakan dari data lain.
 *
 * **Yang sengaja tidak dipulihkan: `percobaan`.** Jumlah percobaan hidup di Progres
 * (`benar_terakhir`, `percobaan`), dan penyambungan Progres ke tampilan bukan lingkup
 * ticket ini. Mengisinya dengan angka karangan akan menampilkan hitungan yang salah,
 * jadi ia dibiarkan 0 — dan 0 berarti penandanya memang tidak ditampilkan.
 *
 * `pembahasanDibuka` juga `false`: pemelajar memulihkan tulisannya, bukan otomatis
 * membaca Pembahasan. Ia tetap harus menekan tombolnya, sama seperti setelah menjawab.
 */
export function keadaanDariTulisanTersimpan(): KeadaanKuis {
  return {
    percobaan: 0,
    benar: true,
    indeksSalahTerakhir: null,
    pembahasanDibuka: false,
  };
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
  // `pembahasanDibuka` dibawa apa adanya. Sebelum jawaban benar ia selalu `false`,
  // tetapi menuliskannya eksplisit membuat aturannya jelas: menjawab tidak pernah
  // mengubah status Pembahasan.
  const pembahasanDibuka = keadaan.pembahasanDibuka;

  if (indeksDipilih === indeksBenar) {
    return { percobaan, benar: true, indeksSalahTerakhir: null, pembahasanDibuka };
  }

  return { percobaan, benar: false, indeksSalahTerakhir: indeksDipilih, pembahasanDibuka };
}

/**
 * Buka Pembahasan karena pemelajar menekan tombolnya.
 *
 * **Menjawab benar adalah prasyaratnya.** Tombol yang membuka Pembahasan baru ada
 * setelah jawaban benar, jadi keadaan ini seharusnya tidak pernah tercapai
 * sebelumnya — tetapi aturannya tetap ditegakkan di sini, bukan hanya di antarmuka.
 * Itu pembagian yang sama dengan `pembahasanTerbuka`: kalau syaratnya hanya hidup di
 * komponen, satu tempat yang lupa memasangnya akan membocorkan jawaban, dan itu tidak
 * akan terlihat sebagai kesalahan apa pun.
 *
 * Idempoten: menekan dua kali tidak mengubah apa-apa, sehingga klik ganda tidak
 * menimbulkan keadaan yang berbeda.
 */
export function bukaPembahasan(keadaan: KeadaanKuis): KeadaanKuis {
  if (!keadaan.benar || keadaan.pembahasanDibuka) return keadaan;
  return { ...keadaan, pembahasanDibuka: true };
}

/**
 * Apakah Pembahasan boleh dibaca.
 *
 * Dua syarat, dan keduanya perlu (ticket #8):
 *
 * - **Sudah benar** — user story 22 dan `design-tree.md`: tidak bisa melihat jawaban
 *   lebih dulu.
 * - **Tombolnya sudah ditekan** — user story 49: Pembahasan "tersembunyi di balik
 *   tombol". Ini yang memberi ruang bagi Kotak Penjelasan: pemelajar merumuskan
 *   alasannya dulu, baru membandingkannya dengan penjelasan referensi.
 *
 * Satu aturan, satu tempat. Menyebarkan syarat ini ke komponen akan membuat
 * "tertutup sampai benar" bergantung pada setiap tempat yang merender Pembahasan —
 * dan satu tempat yang lupa berarti jawabannya bocor.
 */
export function pembahasanTerbuka(keadaan: KeadaanKuis): boolean {
  return keadaan.benar && keadaan.pembahasanDibuka;
}

/**
 * Apakah Kotak Penjelasan sudah boleh ditampilkan.
 *
 * Muncul tepat setelah jawaban benar, **sebelum** Pembahasan terbuka — itulah urutan
 * yang diminta user story 26 ("setelah menjawab benar muncul kotak untuk menulis
 * alasan") dan 27 ("lalu membandingkan dengan penjelasan referensi"). Ia tidak
 * bergantung pada `pembahasanDibuka`, karena kalau bergantung, kotaknya baru muncul
 * setelah Pembahasan terbuka — urutan yang terbalik.
 */
export function kotakPenjelasanTampil(keadaan: KeadaanKuis): boolean {
  return keadaan.benar;
}
