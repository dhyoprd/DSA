/**
 * Status Progres sebuah Topik, diturunkan dari status Soal-soalnya.
 *
 * Backend menyimpan Progres **per Soal** (`store::progres`), dan menurunkan status
 * satu Soal di sana lewat `status_dari`. Yang belum ada di mana pun adalah aturan
 * menggabungkan status beberapa Soal menjadi satu status **Topik** — dan itu aturan
 * yang dipakai sidebar untuk menggambar ○ ◐ ●.
 *
 * Aturannya hidup di sini, satu tempat, sebagai fungsi murni. Sama alasannya dengan
 * `lib/kuis/penilaian.ts`: salah di sini berarti sidebar berbohong tanpa satu pun
 * error, dan pemelajar tidak punya cara membedakannya dari Progresnya yang memang
 * begitu. Karena itu ia dipisah dari komponen supaya bisa diuji tanpa merender React.
 *
 * **Aturan yang dipakai** (diputuskan pemilik, dicatat di ADR-0024):
 *
 * - `selesai` — **seluruh** Soal Topik sudah pernah dijawab benar.
 * - `sedang`  — sudah ada percobaan, tetapi belum semuanya benar.
 * - `belum`   — belum ada percobaan sama sekali, atau Topiknya belum punya Soal.
 *
 * Status per Soal **tidak** dihitung ulang di sini. Modul ini membaca `status` yang
 * sudah diturunkan backend (`status_dari`), sehingga aturan "salah setelah benar
 * tetap selesai" tetap hidup di satu tempat dan tidak bisa menyimpang di sini.
 */

import type { BarisProgres } from "../api.ts";
import type { StatusProgres } from "../konten/tipe.ts";

/**
 * Status satu Topik, dari baris Progres Soal-soalnya.
 *
 * `jumlahSoal` wajib, bukan dihitung dari `baris`. Baris Progres hanya ada untuk Soal
 * yang **pernah disentuh**; Soal yang belum dicoba tidak punya baris. Kalau jumlahnya
 * dihitung dari panjang `baris`, satu Soal benar dari enam akan tampak "semuanya
 * benar" — dan Topik yang baru disentuh sekali langsung tampil ●.
 *
 * `jumlahSoal === 0` berarti Topik ini belum punya Soal sama sekali (belum ada
 * berkasnya di `content/`). Topik seperti itu tidak mungkin selesai, jadi statusnya
 * `belum` — bukan `selesai` karena "semua nol Soal benar" secara teknis benar.
 */
export function statusTopik(
  baris: readonly BarisProgres[],
  jumlahSoal: number,
): StatusProgres {
  if (jumlahSoal <= 0) return "belum";

  const selesai = baris.filter((b) => b.status === "selesai").length;
  // `>=`, bukan `===`: baris yang tertinggal dari perubahan berkas (mis. Soal
  // dihapus, indeksnya menyusut) tidak boleh membuat Topik mustahil selesai.
  if (selesai >= jumlahSoal) return "selesai";

  if (baris.some((b) => b.percobaan > 0)) return "sedang";

  return "belum";
}

/**
 * Status seluruh Topik yang dikenal, dipetakan per slug.
 *
 * Kunci hasilnya adalah kunci `jumlahSoal` — yaitu Topik yang **punya berkas**. Topik
 * yang belum ditulis tidak muncul di sini, dan pemanggil memperlakukannya sebagai
 * `belum` lewat nilai cadangan. Itu memang keadaannya: Topik tanpa berkas tidak bisa
 * dikerjakan, jadi tidak mungkin berstatus selain `belum`.
 *
 * Baris milik slug yang tidak ada di `jumlahSoal` diabaikan: pemanggil yang menentukan
 * Topik mana yang ditampilkan, dan daftar itu datang dari `content/jalur.yaml`.
 */
export function petaStatus(
  baris: readonly BarisProgres[],
  jumlahSoal: Readonly<Record<string, number>>,
): Record<string, StatusProgres> {
  const perSlug = new Map<string, BarisProgres[]>();

  for (const satu of baris) {
    const ada = perSlug.get(satu.topik_slug);
    if (ada === undefined) {
      perSlug.set(satu.topik_slug, [satu]);
    } else {
      ada.push(satu);
    }
  }

  const hasil: Record<string, StatusProgres> = {};
  for (const [slug, jumlah] of Object.entries(jumlahSoal)) {
    hasil[slug] = statusTopik(perSlug.get(slug) ?? [], jumlah);
  }
  return hasil;
}
