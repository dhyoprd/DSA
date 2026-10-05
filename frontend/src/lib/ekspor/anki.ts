/**
 * Menyusun berkas CSV yang bisa diimpor Anki apa adanya.
 *
 * **Kenapa modul ini terpisah dari `kartu.ts`.** `kartu.ts` memutuskan fakta mana yang
 * jadi kartu; modul ini memutuskan bagaimana kartu ditulis sebagai berkas. Dua hal itu
 * berubah karena alasan berbeda, dan format berkasnya adalah **API pihak ketiga** —
 * Anki menentukannya, bukan kita. Memisahkannya membuat perubahan format Anki tidak
 * menyentuh logika "fakta apa yang dihafal".
 *
 * **Formatnya diverifikasi ke dokumentasi resmi, bukan diingat.**
 * `docs.ankiweb.net/importing/text-files.html` (Anki 2.1.54+), lewat WebFetch dan
 * ctx7 (`/websites/ankiweb_net`). Yang dikutip dari sana:
 *
 * - Berkasnya harus teks biasa **UTF-8**.
 * - Header berupa pasangan `#kunci:nilai`, masing-masing di barisnya sendiri, di awal
 *   berkas. `#separator`, `#html`, `#notetype`, `#deck`, `#columns`, dan
 *   `#tags column` adalah kunci yang sah.
 * - Jumlah kolom ditentukan dari baris pertama yang **bukan** komentar. Baris `#...`
 *   diabaikan, jadi header tidak dihitung sebagai data.
 * - Sebuah sel perlu dikutip kalau memuat pemisah, tanda kutip, atau baris baru; tanda
 *   kutip di dalamnya digandakan.
 * - `#deck` yang menyebut dek yang belum ada akan **membuatnya** — jadi tidak perlu
 *   menyiapkan dek di Anki lebih dulu.
 *
 * **Kenapa koma, bukan titik koma.** Kompleksitas (`O(n log n)`) dan definisi memakai
 * spasi, bukan koma, jadi koma jarang muncul — tetapi kalau muncul (mis. di definisi),
 * penyandi CSV mengutipnya dengan benar. Koma juga pemisah yang paling akrab bagi
 * pemakai spreadsheet kalau berkasnya ingin dibuka di sana.
 *
 * **Fungsi murni.** Yang bisa salah di sini adalah bentuk berkasnya, dan itu diuji
 * sebagai teks.
 */

import { barisCsv } from "./csv.ts";
import type { Kartu } from "./kartu.ts";

/** Nama dek yang dipakai di Anki. Satu dek, supaya 12 Topik bisa disaring lewat tag. */
export const NAMA_DEK = "DSA";

/** Nama tipe catatan. "Basic" ada di setiap pemasangan Anki secara bawaan. */
export const NAMA_TIPE_CATATAN = "Basic";

/**
 * Header berkas.
 *
 * `#columns` memberi nama ketiga kolom supaya dialog impor Anki menampilkan
 * "Front/Back/Tags" alih-alih "Field 1/2/3" — itu mengurangi peluang salah memetakan
 * kolom saat impor, dan kriteria penerimaannya adalah "tanpa penyuntingan manual".
 *
 * `#tags column:3` memberi tahu Anki bahwa kolom ketiga berisi tag, sehingga tag
 * tidak perlu dipilih manual di dialog impor.
 *
 * `#html:false` karena isinya teks biasa — notasi `O(n)` dan definisi tidak memakai
 * HTML. Dengan begitu tanda kurung dan `&` di dalamnya tidak perlu di-escape.
 */
const HEADER = [
  "#separator:Comma",
  "#html:false",
  `#notetype:${NAMA_TIPE_CATATAN}`,
  `#deck:${NAMA_DEK}`,
  "#columns:Front,Back,Tags",
  "#tags column:3",
];

/**
 * Susun berkas CSV dari daftar kartu.
 *
 * Setiap kartu menjadi satu baris: `Front,Back,Tags`. Tag digabung dengan spasi —
 * Anki memisahkan beberapa tag dengan spasi di dalam satu sel (dikutip manual:
 * "List of tags, separated by spaces").
 *
 * Berkas diakhiri baris baru, dan **tidak** diberi baris judul kolom tambahan:
 * header `#columns` sudah menyebutkan namanya, dan baris tak berkomentar pertama
 * dibaca Anki sebagai data. Menambahkan baris "Front,Back,Tags" akan membuatnya
 * menjadi kartu pertama yang kosong.
 */
export function berkasAnki(kartu: Kartu[]): string {
  const baris = kartu.map((k) => barisCsv([k.depan, k.belakang, k.tag.join(" ")]));
  return [...HEADER, ...baris].join("\n") + "\n";
}

/**
 * Nama berkas unduhan.
 *
 * Menyebut bahasanya supaya dua unduhan (Indonesia dan English) tidak saling
 * menimpa di folder unduhan, dan menyebut Anki supaya jelas berkas ini untuk apa.
 */
export function namaBerkasAnki(bahasa: string): string {
  return `dsa-anki-${bahasa}.csv`;
}
