/**
 * Kamus antarmuka: setiap kalimat yang dilihat pemakai, dalam kedua bahasa.
 *
 * **Kenapa ada.** Sebelum ticket #12, seluruh teks antarmuka ditulis langsung dalam
 * bahasa Indonesia di dalam komponennya. Begitu bahasa menjadi pilihan, setiap
 * kalimat itu butuh dua versi — dan menyimpannya di sebelah JSX-nya berarti setiap
 * komponen punya dua salinan yang bisa menyimpang tanpa ketahuan. Kamus ini
 * mengumpulkan semuanya di satu tempat, sehingga "teks mana yang belum diterjemahkan"
 * bisa diperiksa mesin, bukan mata.
 *
 * **Bentuknya data murni, bukan fungsi.** Nilainya dikirim dari komponen server ke
 * komponen klien sebagai prop, dan React hanya bisa menyeberangkan nilai yang bisa
 * diserialkan — fungsi tidak bisa. Karena itu label yang memuat angka (mis. "Kuis 1
 * dari 5") dirakit pemanggilnya dari kata-kata di sini, bukan disimpan sebagai fungsi
 * pemformat.
 *
 * **Yang tidak ada di sini: nama bahasa.** "Indonesia" dan "English" ditulis dalam
 * bahasa itu sendiri dan tidak diterjemahkan; tempatnya di `bahasa.ts`.
 *
 * **Yang juga tidak ada di sini: isi Materi, Kuis, dan Pembahasan.** Itu datang dari
 * `content/*.yaml` dan sudah dua bahasa sejak awal. Kamus ini hanya mengurus
 * *tampilan situs*, bukan isi pelajarannya.
 */

import type { Bahasa } from "./bahasa.ts";

/** Setiap kalimat antarmuka yang bergantung bahasa. */
export interface Kamus {
  // --- Situs -------------------------------------------------------------------
  /** Judul untuk tab peramban dan metadata. */
  judulSitus: string;
  /** Deskripsi untuk metadata. */
  deskripsiSitus: string;

  // --- Beranda -----------------------------------------------------------------
  /** Label kecil di atas judul beranda. */
  berandaLabel: string;
  /** Judul besar beranda. */
  berandaJudul: string;
  /** Satu paragraf penjelas di bawah judul beranda. */
  berandaRingkasan: string;

  // --- Halaman tidak ditemukan -------------------------------------------------
  /** Judul halaman 404. */
  tidakDitemukanJudul: string;
  /** Penjelasan singkat di halaman 404. */
  tidakDitemukanRingkasan: string;
  /** Tautan kembali ke beranda dari halaman 404. */
  tidakDitemukanKembali: string;

  // --- Navigasi Jalur ----------------------------------------------------------
  /** Nama Jalur, dipakai sebagai judul sidebar. */
  jalur: string;
  /** Kata "Topik" bentuk tunggal. */
  topik: string;
  /** Kata "Topik" bentuk jamak, untuk label jumlah. */
  topikJamak: string;
  /** Penanda Topik yang berkasnya belum ditulis. */
  segera: string;

  // --- Daftar isi --------------------------------------------------------------
  /** Judul daftar isi Materi. */
  daftarIsi: string;
  /** `aria-label` navigasi daftar isi. */
  daftarIsiMateri: string;

  // --- Kuis --------------------------------------------------------------------
  /** Nama bagian Kuis. */
  kuis: string;
  /** Kata sambung antara nomor dan jumlah, mis. "dari" pada "Kuis 1 dari 5". */
  kuisDari: string;
  /** Satu kalimat di bawah judul bagian Kuis. */
  kuisRingkasan: string;
  /** Judul Pembahasan yang terbuka setelah jawaban benar. */
  pembahasan: string;
  /** Umpan balik jawaban salah. */
  belumTepat: string;
  /** Umpan balik jawaban benar. */
  benar: string;
  /** Label penghitung percobaan, diikuti angkanya. */
  percobaan: string;
  /** Akhiran `sr-only` pada opsi salah, supaya pembaca layar tahu opsi mana. */
  jawabanSalah: string;

  // --- Kotak Penjelasan (ticket #8) --------------------------------------------
  /** Judul Kotak Penjelasan. */
  kotakPenjelasan: string;
  /** Satu kalimat penjelas di bawah judul Kotak Penjelasan. */
  kotakPenjelasanRingkasan: string;
  /** Label kotak isian, terbaca pembaca layar dan terlihat sebagai label. */
  kotakPenjelasanLabel: string;
  /** Placeholder kotak isian. */
  kotakPenjelasanPlaceholder: string;
  /** Tombol menyimpan tulisan. */
  kotakPenjelasanSimpan: string;
  /** Status saat tulisan sedang disimpan. */
  kotakPenjelasanMenyimpan: string;
  /** Konfirmasi tulisan sudah tersimpan. */
  kotakPenjelasanTersimpan: string;
  /** Tombol membuka Pembahasan untuk dibandingkan. */
  kotakPenjelasanBandingkan: string;
  /** Keterangan bahwa tulisan ini tidak dinilai otomatis. */
  kotakPenjelasanTanpaNilai: string;
  /** Status saat tulisan tersimpan sedang dimuat. */
  kotakPenjelasanMemuat: string;

  // --- Catatan (ticket #11) ----------------------------------------------------
  /** Judul editor Catatan. */
  catatan: string;
  /** Satu kalimat penjelas di bawah judul Catatan. */
  catatanRingkasan: string;
  /** Label editor, terbaca pembaca layar dan terlihat sebagai label. */
  catatanLabel: string;
  /** Placeholder editor. */
  catatanPlaceholder: string;
  /** Tombol menyimpan Catatan. */
  catatanSimpan: string;
  /** Status saat Catatan sedang disimpan. */
  catatanMenyimpan: string;
  /** Konfirmasi Catatan sudah tersimpan. */
  catatanTersimpan: string;
  /** Tombol mengunduh Catatan sebagai Markdown. */
  catatanUnduh: string;
  /** Status saat Catatan tersimpan sedang dimuat. */
  catatanMemuat: string;

  // --- Ekspor (ticket #14) -----------------------------------------------------
  /** Judul bagian ekspor di beranda. */
  ekspor: string;
  /** Satu kalimat penjelas di bawah judul ekspor. */
  eksporRingkasan: string;
  /** Tombol mengunduh seluruh Catatan sebagai satu Markdown. */
  eksporCatatan: string;
  /** Tombol mengunduh CSV untuk Anki. */
  eksporAnki: string;
  /** Status saat ekspor sedang disusun atau diambil. */
  eksporMemuat: string;
  /** Keterangan bahwa CSV Anki bisa diimpor apa adanya. */
  eksporAnkiKeterangan: string;
  /** Awalan sisi depan kartu kompleksitas waktu. */
  eksporKompleksitasWaktu: string;
  /** Awalan sisi depan kartu kompleksitas ruang. */
  eksporKompleksitasRuang: string;
  /** Awalan sisi depan kartu definisi istilah. */
  eksporDefinisi: string;
  /** Awalan sisi depan kartu pasangan istilah Indonesia–English. */
  eksporPasanganIstilah: string;
  /** Judul heading berkas gabungan seluruh Catatan. */
  eksporJudulCatatan: string;

  // --- Pencarian (ticket #13) --------------------------------------------------
  /** Judul halaman dan nama fitur pencarian. */
  pencarian: string;
  /** Satu kalimat penjelas di bawah judul pencarian. */
  pencarianRingkasan: string;
  /** Label kotak isian pencarian, terbaca pembaca layar dan terlihat sebagai label. */
  pencarianLabel: string;
  /** Placeholder kotak isian pencarian. */
  pencarianPlaceholder: string;
  /** Tautan ke halaman pencarian dari beranda dan sidebar. */
  pencarianBuka: string;
  /** Ajakan mengetik, ditampilkan saat kotak masih kosong. */
  pencarianMulai: string;
  /** Keterangan jumlah hasil, diikuti angkanya. */
  pencarianJumlah: string;
  /** Keadaan saat tidak ada bagian Materi yang cocok. */
  pencarianKosong: string;
  /** Keterangan bahwa pencarian berjalan di peramban tanpa mengirim apa pun. */
  pencarianTanpaKirim: string;
  /** Label bagian Materi yang jadi tempat hasil ditemukan. */
  pencarianBagian: string;

  // --- Visualisasi (ticket #15) ------------------------------------------------
  /*
   * Yang ada di sini hanya kalimat yang bergantung **bahasa** saja. Nama struktur
   * dan nama ujungnya (atas / belakang / depan) bergantung pada bahasa **dan**
   * struktur, jadi ia tidak muat di kamus datar ini — tempatnya di
   * `lib/visualisasi/label.ts`, dengan tipe `Record<Bahasa, Record<JenisStruktur, …>>`.
   */
  /** Judul bagian Visualisasi di halaman Topik. */
  visualisasi: string;
  /** Satu kalimat penjelas di bawah judul Visualisasi. */
  visualisasiRingkasan: string;
  /** Nama operasi push, untuk tombol dan pembaca layar. */
  visualisasiPush: string;
  /** Nama operasi pop. */
  visualisasiPop: string;
  /** Keterangan keadaan saat belum ada langkah yang dijalankan. */
  visualisasiAwal: string;
  /** Keterangan saat struktur kosong. */
  visualisasiKosong: string;
  /** Kalimat yang menyebut langkah yang baru dijalankan, diikuti namanya. */
  visualisasiLangkah: string;
  /** Kalimat saat sebuah nilai keluar dari struktur, diikuti nilainya. */
  visualisasiKeluar: string;
  /** Awalan daftar isi struktur saat ini, diikuti nilainya. */
  visualisasiIsi: string;
  /** Kalimat utuh saat struktur tidak berisi apa pun, untuk pembaca layar. */
  visualisasiIsiKosong: string;
  /** Kalimat utuh saat `pop` dijalankan pada struktur yang kosong. */
  visualisasiPopKosong: string;
  /** Penghitung langkah, diikuti posisi dan totalnya. */
  visualisasiPenghitung: string;
  /** Tombol mundur satu langkah. */
  visualisasiMundur: string;
  /** Tombol maju satu langkah. */
  visualisasiMaju: string;
  /** Tombol kembali ke awal. */
  visualisasiUlang: string;
  /** Tombol mulai berjalan sendiri. */
  visualisasiPutar: string;
  /** Tombol menghentikan pemutaran otomatis. */
  visualisasiJeda: string;
  /** Keterangan bahwa urutan langkahnya sama untuk kedua struktur. */
  visualisasiBandingkan: string;

  // --- Soal Kode (ticket #10) --------------------------------------------------
  /** Judul bagian Soal Kode. */
  soalKode: string;
  /** Satu kalimat penjelas di bawah judul bagian Soal Kode. */
  soalKodeRingkasan: string;
  /** Label editor kode. */
  soalKodeLabel: string;
  /** Keterangan nama fungsi yang dipanggil test case, diikuti namanya. */
  soalKodeFungsi: string;
  /** Tombol menjalankan kode. */
  soalKodeJalankan: string;
  /** Tombol saat kode sedang dijalankan. */
  soalKodeMenjalankan: string;
  /** Tombol mengembalikan editor ke kode awalnya. */
  soalKodeKembalikan: string;
  /** Tombol menyalin kode awal ke editor, saat draf kosong. */
  soalKodeMulai: string;
  /** Kalimat saat kode awal dimuat ke editor untuk pertama kali. */
  soalKodePetunjuk: string;
  /** Judul daftar hasil per test case. */
  soalKodeHasil: string;
  /** Kalimat saat semua test case lulus. */
  soalKodeSemuaLulus: string;
  /** Ringkasan jumlah kasus lulus; `{lulus}` dan `{total}` diisi komponen. */
  soalKodeJumlahLulus: string;
  /** Kalimat sebab saat kode tidak bisa dikompilasi. */
  soalKodeGalatSintaks: string;
  /** Kalimat sebab saat kode gagal dijalankan. */
  soalKodeGalatJalan: string;
  /** Kalimat sebab saat kode berjalan terlalu lama. */
  soalKodeLewatWaktu: string;
  /** Kalimat sebab saat kode berhenti tanpa hasil, biasanya kehabisan memori. */
  soalKodeKontainerGagal: string;
  /** Kalimat saat layanan eksekusinya sendiri yang bermasalah. */
  soalKodeGalatLayanan: string;
  /** Teks pengganti nilai yang tidak bisa ditampilkan. */
  soalKodeNilaiTidakAda: string;
  /** Label masukan sebuah test case. */
  soalKodeMasukan: string;
  /** Label hasil yang dihasilkan kode. */
  soalKodeHasilDihasilkan: string;
  /** Label hasil yang diharapkan test case. */
  soalKodeHasilDiharapkan: string;
  /** Label keluaran yang dicetak kode. */
  soalKodeCetakan: string;
  /** Penanda test case lulus. */
  soalKodeLulus: string;
  /** Penanda test case gagal. */
  soalKodeGagal: string;
  /** Label nomor test case, diikuti nomornya. */
  soalKodeKasus: string;
  /** Kalimat saat kode kosong sehingga tidak dijalankan. */
  soalKodeKosong: string;
  /** Kalimat saat kode terlalu panjang untuk dikirim. */
  soalKodeTerlaluPanjang: string;
  /** Kalimat saat terlalu banyak eksekusi dalam waktu singkat. */
  soalKodeTerlaluSering: string;

  // --- Pengalih tema -----------------------------------------------------------
  /** `aria-label` grup tombol tema. */
  tema: string;
  /** Pilihan tema: ikut sistem. */
  temaSistem: string;
  /** Pilihan tema: terang. */
  temaTerang: string;
  /** Pilihan tema: gelap. */
  temaGelap: string;
  /** Peringatan saat pilihan tema gagal disimpan. */
  temaGagalDiingat: string;

  // --- Pengalih bahasa ---------------------------------------------------------
  /** `aria-label` grup tombol bahasa. */
  bahasa: string;

  // --- Penanda Progres ---------------------------------------------------------
  /** Awalan `aria-label` penanda Progres, diikuti nama statusnya. */
  progres: string;
  /** Status Progres: belum dikerjakan. */
  progresBelum: string;
  /** Status Progres: sedang dikerjakan. */
  progresSedang: string;
  /** Status Progres: selesai. */
  progresSelesai: string;

  // --- Formulir token ----------------------------------------------------------
  /** Judul bagian token. */
  token: string;
  /** Penjelasan kenapa token diperlukan. */
  tokenRingkasan: string;
  /** Status saat token sedang diperiksa. */
  tokenMemeriksa: string;
  /** Status saat token sudah tersimpan. */
  tokenTersimpan: string;
  /** Tombol menghapus token. */
  tokenLupakan: string;
  /** Tombol mengunduh Progres. */
  tokenUnduh: string;
  /** Label tersembunyi untuk kotak isian token. */
  tokenLabel: string;
  /** Placeholder kotak isian token. */
  tokenPlaceholder: string;
  /** Tombol menyimpan token. */
  tokenSimpan: string;
  /** Galat saat kotak isian masih kosong. */
  tokenKosong: string;
  /** Galat saat token benar tetapi peramban menolak menyimpannya. */
  tokenTidakBisaDisimpan: string;

  // --- Status backend ----------------------------------------------------------
  /** Awalan baris status backend, diikuti keadaannya. */
  backend: string;
  /** Keadaan backend sedang diperiksa. */
  backendBekerja: string;
  /** Keadaan backend tidak bisa dihubungi. */
  backendMati: string;

  // --- Galat API ---------------------------------------------------------------
  /** Galat saat token ditolak backend. */
  galatToken: string;
  /** Galat saat backend tidak bisa dihubungi. */
  galatBackendMati: string;
  /** Awalan galat status HTTP lain, diikuti angkanya. */
  galatStatus: string;
}

/**
 * Kamus tiap bahasa.
 *
 * Tipenya `Record<Bahasa, Kamus>` supaya TypeScript **menolak** bahasa yang kamusnya
 * kurang satu field. Itu gerbang pertama; `kamus.test.ts` menguji hal yang sama saat
 * runtime untuk bentuk yang tidak terlihat tipe, mis. field kosong.
 */
export const KAMUS: Record<Bahasa, Kamus> = {
  id: {
    judulSitus: "Situs belajar DSA",
    deskripsiSitus: "Belajar Data Structures & Algorithms, satu Topik sekaligus.",

    berandaLabel: "Situs belajar DSA",
    berandaJudul: "Belajar DSA satu Topik sekaligus.",
    berandaRingkasan:
      "Antarmuka Next.js, backend Rust, dan folder Materi berjalan bersama. " +
      "Pilih bahasa dan tema sesuai keinginanmu, lalu mulai dari Topik pertama.",

    tidakDitemukanJudul: "Halaman tidak ditemukan.",
    tidakDitemukanRingkasan:
      "Alamat yang kamu buka tidak ada, atau sudah berubah. Kembali ke beranda untuk memilih Topik.",
    tidakDitemukanKembali: "Kembali ke beranda",

    jalur: "Jalur",
    topik: "Topik",
    topikJamak: "Topik",
    segera: "segera",

    daftarIsi: "Daftar isi",
    daftarIsiMateri: "Daftar isi Materi",

    kuis: "Kuis",
    kuisDari: "dari",
    kuisRingkasan:
      "Jawaban salah boleh dicoba lagi. Setelah jawaban benar, tulis dulu alasanmu, " +
      "baru buka Pembahasan.",
    pembahasan: "Pembahasan",
    belumTepat: "Belum tepat. Coba lagi.",
    benar: "Benar.",
    percobaan: "Percobaan",
    jawabanSalah: " — jawaban salah",

    kotakPenjelasan: "Kotak Penjelasan",
    kotakPenjelasanRingkasan:
      "Tulis alasan jawabanmu dengan kata sendiri. Ini tidak dinilai otomatis — " +
      "yang penting kamu merumuskannya, bukan menjawab benar lagi.",
    kotakPenjelasanLabel: "Alasan jawabanmu",
    kotakPenjelasanPlaceholder: "Menurut saya jawabannya ini karena…",
    kotakPenjelasanSimpan: "Simpan",
    kotakPenjelasanMenyimpan: "Menyimpan…",
    kotakPenjelasanTersimpan: "Tersimpan.",
    kotakPenjelasanBandingkan: "Bandingkan dengan Pembahasan",
    kotakPenjelasanTanpaNilai: "Tulisan ini tidak dinilai otomatis.",
    kotakPenjelasanMemuat: "Memuat tulisan tersimpan…",

    catatan: "Catatan",
    catatanRingkasan:
      "Tulisanmu sendiri tentang Topik ini, tersimpan di backend — jadi tetap ada " +
      "saat kamu berpindah antara laptop dan HP, dan tidak hilang saat data peramban " +
      "dibersihkan. Isinya disimpan sebagai Markdown, jadi bisa diunduh sebagai berkas .md.",
    catatanLabel: "Catatanmu",
    catatanPlaceholder: "Tulis rangkuman, pertanyaan, atau hal yang ingin kamu ingat…",
    catatanSimpan: "Simpan",
    catatanMenyimpan: "Menyimpan…",
    catatanTersimpan: "Tersimpan.",
    catatanUnduh: "Unduh sebagai Markdown",
    catatanMemuat: "Memuat Catatan tersimpan…",

    ekspor: "Ekspor",
    eksporRingkasan:
      "Bawa keluar apa yang sudah kamu kerjakan: seluruh Catatan sebagai satu berkas " +
      "Markdown, dan fakta yang layak dihafal sebagai CSV yang bisa diimpor ke Anki.",
    eksporCatatan: "Unduh semua Catatan (Markdown)",
    eksporAnki: "Unduh CSV untuk Anki",
    eksporMemuat: "Menyiapkan…",
    eksporAnkiKeterangan:
      "Berkas CSV-nya sudah berformat impor Anki — buka Anki, pilih File → Import, " +
      "dan pilih berkasnya. Tidak perlu menyunting apa pun.",
    eksporKompleksitasWaktu: "Kompleksitas waktu",
    eksporKompleksitasRuang: "Kompleksitas ruang",
    eksporDefinisi: "Definisi",
    eksporPasanganIstilah: "Istilah",
    eksporJudulCatatan: "Seluruh Catatan",

    pencarian: "Pencarian",
    pencarianRingkasan:
      "Cari istilah di seluruh Materi. Hasilnya menunjuk Topik dan bagian tempat " +
      "istilah itu muncul, sehingga tidak perlu menebak di mana ia dibahas.",
    pencarianLabel: "Cari istilah",
    pencarianPlaceholder: "mis. LIFO, amortized, deque…",
    pencarianBuka: "Cari di Materi",
    pencarianMulai: "Ketik untuk mencari di seluruh Materi.",
    pencarianJumlah: "hasil",
    pencarianKosong: "Tidak ada bagian Materi yang cocok. Coba kata lain.",
    pencarianTanpaKirim: "Pencarian berjalan di peramban — tidak ada yang dikirim ke mana pun.",
    pencarianBagian: "Bagian",

    visualisasi: "Visualisasi",
    visualisasiRingkasan:
      "Jalankan langkahnya satu per satu dan lihat sendiri di ujung mana elemen masuk " +
      "dan keluar. Urutan langkahnya sengaja sama untuk Stack dan Queue, supaya yang " +
      "berbeda hanya ujungnya.",
    visualisasiPush: "push",
    visualisasiPop: "pop",
    visualisasiAwal: "Tekan maju untuk menjalankan langkah pertama.",
    visualisasiKosong: "Kosong",
    visualisasiLangkah: "Langkah",
    visualisasiKeluar: "Keluar:",
    visualisasiIsi: "Isi sekarang:",
    visualisasiIsiKosong: "Strukturnya kosong.",
    visualisasiPopKosong: "Tidak ada yang keluar — strukturnya kosong.",
    visualisasiPenghitung: "langkah",
    visualisasiMundur: "Mundur",
    visualisasiMaju: "Maju",
    visualisasiUlang: "Ulang",
    visualisasiPutar: "Putar",
    visualisasiJeda: "Jeda",
    visualisasiBandingkan: "Urutan langkahnya sama untuk Stack dan Queue.",

    soalKode: "Soal Kode",
    soalKodeRingkasan:
      "Tulis kode Python dari nol, lalu jalankan. Hasilnya tampil per test case, " +
      "sehingga terlihat kasus mana yang lulus dan mana yang belum.",
    soalKodeLabel: "Kode kamu",
    soalKodeFungsi: "Fungsi yang dipanggil test case:",
    soalKodeJalankan: "Jalankan",
    soalKodeMenjalankan: "Menjalankan…",
    soalKodeKembalikan: "Kembalikan kode awal",
    soalKodeMulai: "Mulai dari kode awal",
    soalKodePetunjuk:
      "Editor ini mulai dari kerangka kosong. Tekan “Mulai dari kode awal” untuk " +
      "memuat kerangka yang perlu kamu lengkapi.",
    soalKodeHasil: "Hasil",
    soalKodeSemuaLulus: "Semua test case lulus.",
    soalKodeJumlahLulus: "{lulus} dari {total} test case lulus.",
    soalKodeGalatSintaks: "Kodenya belum bisa dijalankan karena ada kesalahan penulisan.",
    soalKodeGalatJalan: "Kodenya berhenti karena terjadi kesalahan saat dijalankan.",
    soalKodeLewatWaktu: "Kodenya berjalan terlalu lama lalu dihentikan.",
    soalKodeKontainerGagal:
      "Kodenya berhenti tanpa hasil. Biasanya ini karena memori yang dipakai terlalu besar.",
    soalKodeGalatLayanan:
      "Layanan eksekusi sedang bermasalah. Coba lagi sebentar lagi — ini bukan " +
      "kesalahan kodemu.",
    soalKodeNilaiTidakAda: "tidak ada nilai",
    soalKodeMasukan: "Masukan",
    soalKodeHasilDihasilkan: "Dihasilkan",
    soalKodeHasilDiharapkan: "Diharapkan",
    soalKodeCetakan: "Cetakan",
    soalKodeLulus: "lulus",
    soalKodeGagal: "gagal",
    soalKodeKasus: "Test case",
    soalKodeKosong: "Kodenya masih kosong.",
    soalKodeTerlaluPanjang: "Kodenya terlalu panjang untuk dikirim.",
    soalKodeTerlaluSering: "Terlalu sering dijalankan. Tunggu sebentar lalu coba lagi.",

    tema: "Tema",
    temaSistem: "Sistem",
    temaTerang: "Terang",
    temaGelap: "Gelap",
    temaGagalDiingat: "Tema tidak bisa diingat di peramban ini.",

    bahasa: "Bahasa",

    progres: "Progres",
    progresBelum: "Belum dikerjakan",
    progresSedang: "Sedang dikerjakan",
    progresSelesai: "Selesai",

    token: "Token",
    tokenRingkasan:
      "Progres dan Catatanmu hanya bisa dibaca dengan token. Cukup ditempel sekali di tiap perangkat.",
    tokenMemeriksa: "Memeriksa…",
    tokenTersimpan: "Token tersimpan di perangkat ini.",
    tokenLupakan: "Lupakan token",
    tokenUnduh: "Unduh Progres",
    tokenLabel: "Token rahasia",
    tokenPlaceholder: "Tempel token di sini",
    tokenSimpan: "Simpan",
    tokenKosong: "Token masih kosong.",
    tokenTidakBisaDisimpan:
      "Token benar, tetapi peramban menolak menyimpannya. Token akan hilang saat halaman ditutup.",

    backend: "backend",
    backendBekerja: "bekerja…",
    backendMati: "mati",

    galatToken: "Token tidak diterima. Periksa lagi token yang kamu tempel.",
    galatBackendMati: "Backend tidak bisa dihubungi. Coba lagi sebentar lagi.",
    galatStatus: "Backend membalas",
  },

  en: {
    judulSitus: "DSA Study Site",
    deskripsiSitus: "Learn Data Structures & Algorithms, one Topic at a time.",

    berandaLabel: "DSA Study Site",
    berandaJudul: "Learn DSA, one Topic at a time.",
    berandaRingkasan:
      "The Next.js interface, the Rust backend, and the Material folder run together. " +
      "Pick your language and theme, then start from the first Topic.",

    tidakDitemukanJudul: "Page not found.",
    tidakDitemukanRingkasan:
      "The address you opened does not exist, or it has changed. Go back to the home page to pick a Topic.",
    tidakDitemukanKembali: "Back to home",

    jalur: "Path",
    topik: "Topic",
    topikJamak: "Topics",
    segera: "soon",

    daftarIsi: "Contents",
    daftarIsiMateri: "Material contents",

    kuis: "Quiz",
    kuisDari: "of",
    kuisRingkasan:
      "Wrong answers can be retried. After a correct answer, write your reasoning " +
      "first, then open the Explanation.",
    pembahasan: "Explanation",
    belumTepat: "Not quite. Try again.",
    benar: "Correct.",
    percobaan: "Attempts",
    jawabanSalah: " — wrong answer",

    kotakPenjelasan: "Explanation Box",
    kotakPenjelasanRingkasan:
      "Write why you answered that way, in your own words. This is not graded — " +
      "what matters is that you put it into words, not that you are right again.",
    kotakPenjelasanLabel: "Your reasoning",
    kotakPenjelasanPlaceholder: "I think the answer is this because…",
    kotakPenjelasanSimpan: "Save",
    kotakPenjelasanMenyimpan: "Saving…",
    kotakPenjelasanTersimpan: "Saved.",
    kotakPenjelasanBandingkan: "Compare with the Explanation",
    kotakPenjelasanTanpaNilai: "This writing is not graded automatically.",
    kotakPenjelasanMemuat: "Loading your saved writing…",

    catatan: "Notes",
    catatanRingkasan:
      "Your own writing about this Topic, saved in the backend — so it stays with you " +
      "as you move between laptop and phone, and is not lost when browser data is " +
      "cleared. Markdown is supported.",
    catatanLabel: "Your notes",
    catatanPlaceholder: "Write a summary, a question, or something you want to remember…",
    catatanSimpan: "Save",
    catatanMenyimpan: "Saving…",
    catatanTersimpan: "Saved.",
    catatanUnduh: "Download as Markdown",
    catatanMemuat: "Loading your saved Notes…",

    ekspor: "Export",
    eksporRingkasan:
      "Take out what you have worked on: all your Notes as one Markdown file, and the " +
      "facts worth memorising as a CSV that can be imported into Anki.",
    eksporCatatan: "Download all Notes (Markdown)",
    eksporAnki: "Download CSV for Anki",
    eksporMemuat: "Preparing…",
    eksporAnkiKeterangan:
      "The CSV is already in Anki's import format — open Anki, choose File → Import, " +
      "and pick the file. Nothing needs editing.",
    eksporKompleksitasWaktu: "Time complexity",
    eksporKompleksitasRuang: "Space complexity",
    eksporDefinisi: "Definition",
    eksporPasanganIstilah: "Term",
    eksporJudulCatatan: "All Notes",

    pencarian: "Search",
    pencarianRingkasan:
      "Search for a term across all Material. Results point to the Topic and the " +
      "section where the term appears, so you do not have to guess where it is discussed.",
    pencarianLabel: "Search for a term",
    pencarianPlaceholder: "e.g. LIFO, amortized, deque…",
    pencarianBuka: "Search the Material",
    pencarianMulai: "Type to search across all Material.",
    pencarianJumlah: "results",
    pencarianKosong: "No section matches. Try another word.",
    pencarianTanpaKirim: "Search runs in the browser — nothing is sent anywhere.",
    pencarianBagian: "Section",

    visualisasi: "Visualization",
    visualisasiRingkasan:
      "Run the steps one at a time and see for yourself which end elements enter and " +
      "leave from. The step order is deliberately the same for Stack and Queue, so the " +
      "only thing that differs is the end.",
    visualisasiPush: "push",
    visualisasiPop: "pop",
    visualisasiAwal: "Press next to run the first step.",
    visualisasiKosong: "Empty",
    visualisasiLangkah: "Step",
    visualisasiKeluar: "Out:",
    visualisasiIsi: "Contents now:",
    visualisasiIsiKosong: "The structure is empty.",
    visualisasiPopKosong: "Nothing came out — the structure is empty.",
    visualisasiPenghitung: "steps",
    visualisasiMundur: "Back",
    visualisasiMaju: "Next",
    visualisasiUlang: "Restart",
    visualisasiPutar: "Play",
    visualisasiJeda: "Pause",
    visualisasiBandingkan: "The step order is the same for Stack and Queue.",

    soalKode: "Code Problem",
    soalKodeRingkasan:
      "Write Python from scratch, then run it. The result appears per test case, so " +
      "you can see which ones pass and which do not yet.",
    soalKodeLabel: "Your code",
    soalKodeFungsi: "Function called by the test cases:",
    soalKodeJalankan: "Run",
    soalKodeMenjalankan: "Running…",
    soalKodeKembalikan: "Restore starting code",
    soalKodeMulai: "Load the starting code",
    soalKodePetunjuk:
      "This editor starts empty. Press “Load the starting code” to get the skeleton " +
      "you need to complete.",
    soalKodeHasil: "Result",
    soalKodeSemuaLulus: "All test cases passed.",
    soalKodeJumlahLulus: "{lulus} of {total} test cases passed.",
    soalKodeGalatSintaks: "The code cannot run yet because of a syntax error.",
    soalKodeGalatJalan: "The code stopped because an error occurred while running.",
    soalKodeLewatWaktu: "The code ran too long and was stopped.",
    soalKodeKontainerGagal:
      "The code stopped without producing a result. This is usually because it used " +
      "too much memory.",
    soalKodeGalatLayanan:
      "The execution service is having trouble. Try again in a moment — this is not " +
      "a problem with your code.",
    soalKodeNilaiTidakAda: "no value",
    soalKodeMasukan: "Input",
    soalKodeHasilDihasilkan: "Returned",
    soalKodeHasilDiharapkan: "Expected",
    soalKodeCetakan: "Printed",
    soalKodeLulus: "passed",
    soalKodeGagal: "failed",
    soalKodeKasus: "Test case",
    soalKodeKosong: "The code is still empty.",
    soalKodeTerlaluPanjang: "The code is too long to send.",
    soalKodeTerlaluSering: "Run too often. Wait a moment and try again.",

    tema: "Theme",
    temaSistem: "System",
    temaTerang: "Light",
    temaGelap: "Dark",
    temaGagalDiingat: "The theme cannot be remembered in this browser.",

    bahasa: "Language",

    progres: "Progress",
    progresBelum: "Not started",
    progresSedang: "In progress",
    progresSelesai: "Done",

    token: "Token",
    tokenRingkasan:
      "Your Progress and Notes can only be read with the token. Paste it once per device.",
    tokenMemeriksa: "Checking…",
    tokenTersimpan: "The token is saved on this device.",
    tokenLupakan: "Forget token",
    tokenUnduh: "Download Progress",
    tokenLabel: "Secret token",
    tokenPlaceholder: "Paste the token here",
    tokenSimpan: "Save",
    tokenKosong: "The token is still empty.",
    tokenTidakBisaDisimpan:
      "The token is valid, but the browser refused to save it. It will be lost when the page closes.",

    backend: "backend",
    backendBekerja: "working…",
    backendMati: "down",

    galatToken: "Token not accepted. Check the token you pasted.",
    galatBackendMati: "The backend cannot be reached. Try again in a moment.",
    galatStatus: "Backend replied",
  },
};

/** Kamus untuk satu bahasa. */
export function kamusUntuk(bahasa: Bahasa): Kamus {
  return KAMUS[bahasa];
}
