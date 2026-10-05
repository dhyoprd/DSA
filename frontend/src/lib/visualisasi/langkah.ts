/**
 * Langkah-langkah Visualisasi Stack dan Queue.
 *
 * **Kenapa urutannya sama untuk keduanya.** Materi Topik ini menyatakan klaimnya
 * sendiri: *"Tiga nilai yang sama dimasukkan dengan urutan yang sama akan keluar
 * dengan urutan terbalik dari Stack, dan dengan urutan yang sama dari Queue."*
 * Visualisasi yang memakai urutan **berbeda** untuk kedua struktur tidak membuktikan
 * apa pun — pemelajar melihat dua animasi yang berbeda dan tidak bisa membandingkan.
 * Dengan satu urutan yang dipakai dua kali, yang berubah hanya satu hal: ujung mana
 * yang diambil `pop`. Itulah LIFO dan FIFO, dan itulah yang terlihat.
 *
 * **Kenapa di dalam kode, bukan di `content/stack.yaml`.** Urutan langkah adalah
 * bagian dari cara **menggambar** sebuah konsep, bukan dari isi pelajarannya. Ia tidak
 * dibaca pemelajar sebagai teks, tidak diterjemahkan, dan tidak masuk ekspor mana pun.
 * Menaruhnya di YAML berarti menambah field wajib baru beserta validator dan
 * gerbangnya, untuk data yang belum tentu dipakai Topik lain dengan bentuk yang sama —
 * dan aturan repo ini adalah abstraksi ditambahkan saat ada kebutuhan kedua, bukan
 * sebelumnya. Kalau kelak 11 Topik lain memang butuh bentuk yang sama, memindahkannya
 * ke YAML adalah perubahan yang jelas, bukan penyimpangan. Keputusan ini dicatat di
 * `docs/adr/0021`.
 *
 * **Yang menjaga datanya tetap sah.** Ada uji yang menjalankan urutan ini pada kedua
 * struktur dan memeriksa bahwa tidak pernah ada `pop` pada struktur kosong, bahwa
 * `push` pertama masuk lebih dulu daripada `pop` pertama, dan bahwa hasil akhirnya
 * memang berbeda antara Stack dan Queue. Tanpa uji itu, salah ketik satu langkah akan
 * menghasilkan animasi yang tampak wajar tetapi mengajarkan hal yang salah.
 */

import type { Langkah } from "./struktur.ts";

/**
 * Urutan contoh yang dipakai Stack dan Queue.
 *
 * Tiga nilai masuk berurutan (1, 2, 3), lalu dua keluar. Setelah itu:
 *
 * - **Stack** mengeluarkan 3 lalu 2, dan menyisakan 1 — yang terakhir masuk keluar
 *   lebih dulu.
 * - **Queue** mengeluarkan 1 lalu 2, dan menyisakan 3 — yang pertama masuk keluar
 *   lebih dulu.
 *
 * Berhenti di dua `pop`, bukan tiga: menyisakan satu kotak membuat perbedaannya
 * terlihat **setelah** animasi selesai, bukan hanya selama animasi berjalan. Kalau
 * ketiganya dikeluarkan, kedua struktur berakhir kosong dan sama.
 */
export const LANGKAH_CONTOH: Langkah[] = [
  { operasi: "push", nilai: 1 },
  { operasi: "push", nilai: 2 },
  { operasi: "push", nilai: 3 },
  { operasi: "pop" },
  { operasi: "pop" },
];
