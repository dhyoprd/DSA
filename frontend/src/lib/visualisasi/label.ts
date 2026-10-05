/**
 * Kosakata Visualisasi yang bergantung pada bahasa **dan** struktur.
 *
 * **Kenapa bukan di kamus.** `kamus.ts` adalah peta datar `Record<Bahasa, Kamus>` —
 * satu bahasa, satu kalimat. Yang dibutuhkan di sini dua sumbu: bahasa **dan**
 * struktur. Ujung tempat elemen keluar disebut "atas" pada Stack tetapi "depan" pada
 * Queue, dan keduanya juga berubah antara Indonesia dan English. Memaksakannya ke
 * kamus datar berarti membuat field seperti `ujungKeluarStack` dan `ujungKeluarQueue`
 * untuk setiap struktur baru — dan struktur berikutnya (Tree, Heap, Graph) akan
 * menambah lagi. Dua sumbu ditulis sebagai dua sumbu.
 *
 * **Tipenya memaksa kelengkapannya.** `Record<Bahasa, Record<JenisStruktur, Label>>`
 * membuat TypeScript menolak bahasa atau struktur yang labelnya kurang, persis seperti
 * `Record<Bahasa, Kamus>` di kamus. Itu gerbang pertama; ujinya memeriksa hal yang
 * tidak terlihat tipe, mis. teks kosong.
 *
 * **Modul murni.** Tidak menyentuh DOM, React, maupun pustaka animasi.
 */

import type { Bahasa } from "../bahasa/bahasa.ts";
import type { JenisStruktur } from "./struktur.ts";

/** Kata-kata yang menyebut satu struktur data di satu bahasa. */
export interface LabelStruktur {
  /** Nama struktur seperti yang ditulis di Materi, mis. "Stack" / "Tumpukan". */
  nama: string;
  /** Satu kalimat yang menerangkan aturannya, untuk dibaca pemelajar. */
  aturan: string;
  /** Nama ujung tempat elemen **masuk**, mis. "atas" atau "belakang". */
  ujungMasuk: string;
  /** Nama ujung tempat elemen **keluar**, mis. "atas" atau "depan". */
  ujungKeluar: string;
}

/**
 * Label tiap struktur, di tiap bahasa.
 *
 * Nama strukturnya sendiri **tidak diterjemahkan**: "Stack" dan "Queue" adalah istilah
 * teknis English yang dipakai apa adanya di kedua bahasa (Materi Indonesia pun menulis
 * "Stack" dan "Queue"). Yang diterjemahkan adalah kalimat penjelas dan nama ujungnya,
 * karena itu kata biasa. "Tumpukan" dan "Antrean" muncul di kalimat aturan sebagai
 * padanan, sama seperti di `CONTEXT.md`.
 */
export const LABEL: Record<Bahasa, Record<JenisStruktur, LabelStruktur>> = {
  id: {
    stack: {
      nama: "Stack",
      aturan:
        "Elemen masuk dan keluar dari ujung yang sama. Yang terakhir masuk keluar lebih dulu.",
      ujungMasuk: "atas",
      ujungKeluar: "atas",
    },
    queue: {
      nama: "Queue",
      aturan:
        "Elemen masuk dari belakang dan keluar dari depan. Yang pertama masuk keluar lebih dulu.",
      ujungMasuk: "belakang",
      ujungKeluar: "depan",
    },
  },
  en: {
    stack: {
      nama: "Stack",
      aturan:
        "Elements enter and leave from the same end. The last one in comes out first.",
      ujungMasuk: "top",
      ujungKeluar: "top",
    },
    queue: {
      nama: "Queue",
      aturan:
        "Elements enter at the back and leave from the front. The first one in comes out first.",
      ujungMasuk: "back",
      ujungKeluar: "front",
    },
  },
};

/** Label satu struktur di satu bahasa. */
export function labelUntuk(bahasa: Bahasa, jenis: JenisStruktur): LabelStruktur {
  return LABEL[bahasa][jenis];
}
