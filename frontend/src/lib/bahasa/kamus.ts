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
    kuisRingkasan: "Jawaban salah boleh dicoba lagi. Pembahasan terbuka setelah jawaban benar.",
    pembahasan: "Pembahasan",
    belumTepat: "Belum tepat. Coba lagi.",
    benar: "Benar.",
    percobaan: "Percobaan",
    jawabanSalah: " — jawaban salah",

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
    kuisRingkasan: "Wrong answers can be retried. The Explanation opens after a correct answer.",
    pembahasan: "Explanation",
    belumTepat: "Not quite. Try again.",
    benar: "Correct.",
    percobaan: "Attempts",
    jawabanSalah: " — wrong answer",

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
