/**
 * Menerjemahkan hasil Eksekusi Kode menjadi kalimat yang bisa dibaca pemelajar.
 *
 * **Modul murni.** Masukannya hasil dari backend, keluarannya ringkasan dan kalimat.
 * Tidak menyentuh React maupun DOM, sehingga bisa diuji dengan test runner Node — dan
 * justru inilah yang paling perlu diuji tanpa render: salah menerjemahkan status
 * berarti pemelajar melihat pesan yang menyesatkan tanpa error apa pun.
 *
 * **Pembeda pesan adalah inti modul ini.** Kriteria penerimaan #10 menuntut pesan
 * timeout jelas berbeda dari pesan kesalahan sintaks. Perbedaan itu ditegakkan di sini,
 * satu tempat, bukan tersebar di dalam JSX.
 */

import type { HasilEksekusi, HasilKasus, StatusEksekusi } from "./tipe.ts";

/**
 * Kalimat antarmuka yang dibutuhkan modul ini, sudah dipilih bahasanya.
 *
 * Diterima sebagai argumen, bukan diimpor dari `kamus.ts`: itu menjaga modul ini tetap
 * murni dan bebas dari ketergantungan bahasa, sekaligus membuat ujinya tidak perlu
 * menyiapkan kamus lengkap — cukup objek kecil ini.
 */
export interface KalimatEksekusi {
  /** Ringkasan: berapa kasus lulus dari berapa. `{lulus}` dan `{total}` diisi. */
  ringkasan: string;
  /** Semua kasus lulus. */
  semuaLulus: string;
  /** Kode tidak bisa dikompilasi. */
  galatSintaks: string;
  /** Kode gagal dijalankan. */
  galatJalan: string;
  /** Kode berjalan terlalu lama. */
  lewatWaktu: string;
  /** Kontainer berhenti tanpa hasil — biasanya kehabisan memori. */
  kontainerGagal: string;
  /** Backend atau runner bermasalah; bukan kesalahan pemelajar. */
  galatLayanan: string;
  /** Label untuk nilai yang tidak bisa ditampilkan sebagai teks. */
  nilaiTidakTersedia: string;
  /** Label masukan sebuah kasus. */
  masukan: string;
  /** Label hasil yang dihasilkan. */
  hasilDihasilkan: string;
  /** Label hasil yang diharapkan. */
  hasilDiharapkan: string;
  /** Label yang dicetak pemelajar. */
  cetakan: string;
  /** Penanda kasus lulus. */
  lulus: string;
  /** Penanda kasus gagal. */
  gagal: string;
}

/** Hasil yang sudah diterjemahkan, siap ditampilkan. */
export interface RingkasanHasil {
  /** Apakah kodenya selesai dinilai (bukan galat sintaks/timeout/layanan). */
  dinilai: boolean;
  /** Apakah seluruh kasus lulus. Selalu `false` kalau tidak dinilai. */
  semuaLulus: boolean;
  /** Berapa kasus yang lulus. */
  jumlahLulus: number;
  /** Berapa kasus seluruhnya. */
  jumlahKasus: number;
  /** Kalimat utama yang dilihat pemelajar. */
  pesan: string;
  /**
   * Rincian tambahan dari backend (mis. pesan sintaks atau pesan lewat-waktu).
   * `null` kalau tidak ada.
   */
  rincian: string | null;
}

/**
 * Ubah satu nilai apa pun menjadi teks yang bisa ditampilkan.
 *
 * Nilai datang dari JSON, jadi bentuknya bisa apa saja — `null`, angka, daftar
 * bersarang. `JSON.stringify` menghasilkan teks yang jujur untuk semuanya, dan itu
 * yang dibutuhkan: pemelajar harus melihat **apa yang sebenarnya** dikembalikan
 * kodenya, bukan bentuk yang sudah dirapikan yang menyembunyikan perbedaan.
 *
 * `undefined` tidak punya representasi JSON, jadi ia diperlakukan sebagai "tidak ada
 * nilai" — kasus yang muncul kalau backend tidak mengirim fieldnya.
 */
export function teksNilai(nilai: unknown, kalimat: KalimatEksekusi): string {
  if (nilai === undefined) return kalimat.nilaiTidakTersedia;
  // `JSON.stringify(undefined)` mengembalikan `undefined`, dan `null` menjadi "null" —
  // keduanya ditangani sebelum ini.
  return JSON.stringify(nilai) ?? kalimat.nilaiTidakTersedia;
}

/**
 * Isi `{lulus}` dan `{total}` pada sebuah kalimat.
 *
 * Penggantian sederhana, bukan `Intl` atau pustaka templating: kalimatnya ditulis
 * sendiri di kamus, dan satu-satunya nilai dinamis di sini adalah dua angka.
 */
function isi(kalimat: string, lulus: number, total: number): string {
  return kalimat.replaceAll("{lulus}", String(lulus)).replaceAll("{total}", String(total));
}

/**
 * Terjemahkan hasil backend menjadi ringkasan yang siap ditampilkan.
 *
 * Setiap status menghasilkan kalimat yang berbeda, dan yang paling penting: `ok`
 * menghasilkan ringkasan jumlah kasus, sedangkan status galat menghasilkan kalimat
 * sebabnya. Pemelajar tidak perlu menebak apakah kodenya salah atau layanannya yang
 * bermasalah.
 */
export function ringkas(
  hasil: HasilEksekusi,
  kalimat: KalimatEksekusi,
): RingkasanHasil {
  const jumlahLulus = hasil.kasus.filter((k) => k.lulus).length;
  const jumlahKasus = hasil.kasus.length;

  if (selesai(hasil.status)) {
    const semuaLulus = jumlahKasus > 0 && jumlahLulus === jumlahKasus;
    return {
      dinilai: true,
      semuaLulus,
      jumlahLulus,
      jumlahKasus,
      pesan: semuaLulus
        ? kalimat.semuaLulus
        : isi(kalimat.ringkasan, jumlahLulus, jumlahKasus),
      // Pesan backend untuk status `ok` tidak dipakai: yang berguna bagi pemelajar
      // adalah jumlah kasusnya, bukan catatan internal runner.
      rincian: null,
    };
  }

  return {
    dinilai: false,
    semuaLulus: false,
    jumlahLulus: 0,
    jumlahKasus,
    pesan: kalimatUntuk(hasil.status, kalimat),
    // Pesan dari backend (mis. "invalid syntax (baris 3)") ditampilkan sebagai
    // rincian: ia yang memberi tahu pemelajar **di mana** kesalahannya.
    rincian: hasil.pesan,
  };
}

/** Apakah status ini berarti kodenya selesai dinilai. */
function selesai(status: StatusEksekusi): boolean {
  return status === "ok";
}

/**
 * Kalimat sebab untuk status yang bukan `ok`.
 *
 * Setiap status punya kalimatnya sendiri. `galat-sintaks` dan `lewat-waktu` sengaja
 * jauh berbeda bunyinya — itu yang dituntut kriteria penerimaan #10 — dan
 * `kontainer-gagal` menyebut memori, karena itulah sebabnya yang paling sering.
 */
function kalimatUntuk(status: StatusEksekusi, kalimat: KalimatEksekusi): string {
  switch (status) {
    case "galat-sintaks":
      return kalimat.galatSintaks;
    case "lewat-waktu":
      return kalimat.lewatWaktu;
    case "galat-jalan":
      return kalimat.galatJalan;
    case "kontainer-gagal":
      return kalimat.kontainerGagal;
    // Ketiga ini berarti masalah di sisi layanan, bukan di kode pemelajar. Dijadikan
    // satu kalimat karena saran untuk pemelajarnya sama: coba lagi, dan kalau tetap
    // gagal, ini bukan salahmu.
    case "galat-runner":
    case "galat-protokol":
    case "galat-docker":
      return kalimat.galatLayanan;
    case "ok":
      // Sudah ditangani di `ringkas`; ada di sini supaya `switch`-nya lengkap dan
      // TypeScript menolak status baru yang lupa ditangani.
      return kalimat.semuaLulus;
  }
}

/** Apakah sebuah kasus menampilkan sesuatu yang layak dilihat pemelajar. */
export function punyaCetakan(kasus: HasilKasus): boolean {
  return kasus.keluaran.trim().length > 0;
}
