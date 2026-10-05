/**
 * Mencari di dalam indeks Materi dan menyusun cuplikan hasil.
 *
 * **Kenapa terpisah dari `indeks.ts`.** "Bagian Materi mana yang ada" dan "kata kunci
 * mana yang cocok, dan bagaimana hasilnya disajikan" adalah dua keputusan yang berubah
 * karena alasan berbeda. `indeks.ts` berubah kalau bentuk indeks berubah; modul ini
 * berubah kalau aturan pencocokan atau penyajian hasil berubah. Karena itu keduanya
 * diuji terpisah dan bisa diganti sendiri-sendiri.
 *
 * **Modul murni.** Tidak menyentuh berkas, DOM, atau React — masukannya nilai biasa,
 * keluarannya nilai biasa. Komponen klien yang memanggilnya di peramban, dan ujinya
 * cukup memanggilnya dengan array biasa.
 *
 * **Pencocokan teks sederhana, sengaja.** Bukan pencarian kabur (fuzzy) atau
 * peringkat berbobot rumit: dengan satu Topik dan puluhan bagian, kecocokan substring
 * sudah cukup, dan pemelajar bisa memprediksi hasilnya. Kalau nanti isinya bertambah
 * besar dan pencarian ini terasa kurang, penggantinya cukup mengganti modul ini.
 */

import type { EntriPencarian } from "./indeks.ts";

/**
 * Satu hasil pencarian.
 *
 * `sorot` adalah **rentang di dalam `cuplikan`**, bukan markup HTML. Dengan begitu
 * modul ini tidak pernah menghasilkan HTML yang harus dipercaya, dan komponen yang
 * merender bisa memutuskan sendiri bagaimana menandainya.
 */
export interface HasilPencarian {
  /** Bagian Materi yang cocok. */
  entri: EntriPencarian;
  /** Teks pendek di sekitar kata kunci, untuk ditampilkan di daftar hasil. */
  cuplikan: string;
  /** Rentang `[mulai, akhir)` di dalam `cuplikan` yang harus ditandai. */
  sorot: RentangSorot[];
}

/** Rentang setengah terbuka `[mulai, akhir)` di dalam sebuah teks. */
export type RentangSorot = [number, number];

/**
 * Panjang maksimum cuplikan, dalam karakter.
 *
 * Cukup untuk satu-dua baris di layar HP, dan cukup untuk melihat kata kuncinya
 * berada dalam konteks apa. Cuplikan yang lebih panjang akan membuat daftar hasil
 * sulit dipindai, padahal justru memindai itulah yang dilakukan pemelajar.
 */
const PANJANG_CUPLIKAN = 180;

/** Berapa karakter sebelum kata kunci yang ikut ditampilkan, untuk memberi konteks. */
const KONTEKS_SEBELUM = 60;

/**
 * Cari bagian Materi yang memuat seluruh kata pada `kataKunci`.
 *
 * **Semua kata harus cocok** ("stack lifo" hanya menemukan bagian yang memuat
 * keduanya), karena itu yang membuat pencarian dua kata berguna untuk mempersempit.
 *
 * **Peringkat.** Kecocokan di judul bagian diberi bobot lebih tinggi daripada di badan
 * — bagian berjudul "Kompleksitas" lebih mungkin yang dicari daripada paragraf yang
 * menyebut kata itu sekilas. Urutannya stabil untuk bobot yang sama (`Array.sort`
 * stabil), sehingga hasil tidak berubah-ubah antar pemanggilan.
 */
export function cari(indeks: EntriPencarian[], kataKunci: string): HasilPencarian[] {
  const kata = pisahKata(kataKunci);
  if (kata.length === 0) return [];

  const hasil: { entri: EntriPencarian; cuplikan: string; sorot: RentangSorot[]; skor: number }[] =
    [];

  for (const entri of indeks) {
    const skor = skorKecocokan(entri, kata);
    if (skor === null) continue;

    const { cuplikan, sorot } = cuplikanUntuk(entri, kata);
    hasil.push({ entri, cuplikan, sorot, skor });
  }

  hasil.sort((a, b) => b.skor - a.skor);

  // `skor` dipakai untuk mengurutkan saja; ia tidak menyeberang ke pemanggil supaya
  // bentuk hasilnya sesederhana yang dibutuhkan tampilan.
  return hasil.map(({ entri, cuplikan, sorot }) => ({ entri, cuplikan, sorot }));
}

/**
 * Bobot kecocokan sebuah entri, atau `null` kalau ada satu kata pun yang tidak cocok.
 *
 * Judul bernilai 3, badan bernilai 1. Satu kata yang cocok di keduanya menyumbang 4,
 * sehingga bagian yang kata kuncinya muncul di judul **dan** badan naik ke atas.
 */
function skorKecocokan(entri: EntriPencarian, kata: string[]): number | null {
  const judul = entri.bagianJudul.toLowerCase();
  const teks = entri.teks.toLowerCase();

  let skor = 0;
  for (const k of kata) {
    const diJudul = judul.includes(k);
    const diTeks = teks.includes(k);
    if (!diJudul && !diTeks) return null;
    if (diJudul) skor += 3;
    if (diTeks) skor += 1;
  }
  return skor;
}

/**
 * Pecah kata kunci menjadi kata-kata yang dicari.
 *
 * Dipisah pada semua jenis spasi (spasi biasa, tab, baris baru) supaya menempelkan
 * beberapa kata dari tempat lain tetap bekerja. Kata kosong dibuang sehingga spasi
 * berlebih tidak menghasilkan kata yang selalu cocok.
 */
function pisahKata(kataKunci: string): string[] {
  return kataKunci
    .toLowerCase()
    .split(/\s+/)
    .filter((k) => k.length > 0);
}

/**
 * Cuplikan untuk sebuah entri.
 *
 * Badan dipakai lebih dulu; kalau kata kuncinya hanya ada di judul, judulnya yang
 * ditampilkan. Dengan begitu cuplikan selalu memuat kata yang dicari — cuplikan yang
 * tidak memuatnya akan membingungkan: pemelajar melihat hasil yang tampak tidak
 * berhubungan dengan yang ia ketik.
 */
function cuplikanUntuk(
  entri: EntriPencarian,
  kata: string[],
): { cuplikan: string; sorot: RentangSorot[] } {
  return (
    buatCuplikan(entri.teks, kata) ??
    buatCuplikan(entri.bagianJudul, kata) ??
    // Jaring pengaman untuk keadaan yang tidak bisa terjadi: `skorKecocokan` sudah
    // memastikan kata kuncinya ada di judul atau badan, dan `buatCuplikan` mencari
    // dengan cara yang sama. Kalau suatu saat keduanya berbeda, hasilnya cuplikan
    // kosong yang terlihat jelas — bukan teks yang menyesatkan.
    { cuplikan: entri.bagianJudul, sorot: [] }
  );
}

/**
 * Potong teks di sekitar kemunculan pertama salah satu kata, dan tandai semua
 * kemunculannya. `null` kalau tidak ada kata yang muncul.
 */
function buatCuplikan(
  teks: string,
  kata: string[],
): { cuplikan: string; sorot: RentangSorot[] } | null {
  const rendah = teks.toLowerCase();

  let posisi = -1;
  let panjangCocok = 0;
  for (const k of kata) {
    const i = rendah.indexOf(k);
    if (i !== -1 && (posisi === -1 || i < posisi)) {
      posisi = i;
      panjangCocok = k.length;
    }
  }
  if (posisi === -1) return null;

  const { mulai, akhir } = jendela(teks, posisi, panjangCocok);
  const potongAwal = mulai > 0;
  const potongAkhir = akhir < teks.length;

  // Tanda "…" ditambahkan **setelah** pemotongan, dan rentang sorot dihitung pada
  // teks akhir — sehingga penanda tidak pernah menggeser posisi yang ditandai.
  const isi = teks.slice(mulai, akhir).trim();
  const cuplikan = `${potongAwal ? "…" : ""}${isi}${potongAkhir ? "…" : ""}`;

  return { cuplikan, sorot: sorotSemua(cuplikan, kata) };
}

/**
 * Batas potongan: jendela selebar `PANJANG_CUPLIKAN` di sekitar kata kunci, yang
 * tepinya digeser ke batas kata supaya tidak memotong kata di tengah.
 */
function jendela(
  teks: string,
  posisi: number,
  panjangCocok: number,
): { mulai: number; akhir: number } {
  let mulai = Math.max(0, posisi - KONTEKS_SEBELUM);
  let akhir = Math.min(teks.length, mulai + PANJANG_CUPLIKAN);

  // Jendela tidak boleh lebih pendek daripada kata kuncinya sendiri.
  akhir = Math.max(akhir, Math.min(teks.length, posisi + panjangCocok));

  // Geser tepi ke batas kata, tetapi jangan sampai memotong kata kuncinya.
  if (mulai > 0) {
    const spasi = teks.indexOf(" ", mulai);
    if (spasi !== -1 && spasi < posisi) mulai = spasi + 1;
  }
  if (akhir < teks.length) {
    const spasi = teks.lastIndexOf(" ", akhir);
    if (spasi !== -1 && spasi > posisi + panjangCocok) akhir = spasi;
  }

  return { mulai, akhir };
}

/**
 * Semua kemunculan kata-kata di dalam teks, sebagai rentang yang tidak bertumpang.
 *
 * Rentang yang bertumpang digabung supaya penandanya tidak menumpuk; kata yang
 * berbeda bisa saling memuat (mis. "stack" dan "sta"), dan tanpa penggabungan hasilnya
 * akan menyorot potongan yang sama dua kali.
 */
function sorotSemua(teks: string, kata: string[]): RentangSorot[] {
  const rendah = teks.toLowerCase();
  const rentang: RentangSorot[] = [];

  for (const k of kata) {
    let dari = 0;
    for (;;) {
      const i = rendah.indexOf(k, dari);
      if (i === -1) break;
      rentang.push([i, i + k.length]);
      dari = i + k.length;
    }
  }

  rentang.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const gabung: RentangSorot[] = [];
  for (const r of rentang) {
    const terakhir = gabung[gabung.length - 1];
    if (terakhir !== undefined && r[0] <= terakhir[1]) {
      terakhir[1] = Math.max(terakhir[1], r[1]);
    } else {
      gabung.push([r[0], r[1]]);
    }
  }

  return gabung;
}
