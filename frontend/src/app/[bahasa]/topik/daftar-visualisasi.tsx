import type { Bahasa } from "@/lib/bahasa/bahasa.ts";
import type { Kamus } from "@/lib/bahasa/kamus.ts";
import { LANGKAH_CONTOH } from "@/lib/visualisasi/langkah.ts";
import { labelUntuk, type LabelStruktur } from "@/lib/visualisasi/label.ts";
import { puncakSel, type JenisStruktur } from "@/lib/visualisasi/struktur.ts";

import { Visualisasi, type VisualisasiSiap } from "./visualisasi.tsx";

/**
 * Daftar Visualisasi sebuah Topik.
 *
 * Komponen server, tanpa JavaScript. Yang dikerjakan di sini tiga: memilih struktur
 * mana yang divisualisasikan, memilih versi bahasanya, dan menyerahkan datanya ke
 * komponen klien. Aturan "apa isi struktur setelah sekian langkah" dan "apa yang
 * dilakukan tiap tombol" ada di `src/lib/visualisasi/`; komponen interaktifnya ada di
 * `visualisasi.tsx`.
 *
 * **Kenapa dua komponen, bukan satu.** Pemisahan ini sama dengan pola
 * `daftar-kuis.tsx` → `kuis.tsx`: yang memilih bahasa dan menyusun data adalah
 * komponen server, yang hidup di peramban hanya yang memang butuh keadaan. Dengan
 * begitu bahasa tidak pernah menjadi keadaan di klien, dan data yang menyeberang sudah
 * jadi dan tinggal digambar.
 *
 * **Yang menyeberang harus bisa diserialkan.** `VisualisasiSiap` hanya berisi teks,
 * angka, boolean, dan array biasa — tidak ada fungsi, elemen React, atau kelas. Itu
 * syarat batas server/klien di Next.js, dan bentuknya dijaga tipe.
 *
 * **Kenapa Stack dan Queue, padahal ticket hanya menyebut Stack.** Topik ini bernama
 * "Stack & Queue", dan Materi di dalamnya membangun klaim yang butuh keduanya untuk
 * dibuktikan: "tiga nilai yang sama dimasukkan dengan urutan yang sama akan keluar
 * dengan urutan terbalik dari Stack, dan dengan urutan yang sama dari Queue". Satu
 * Visualisasi Stack saja tidak bisa membuktikan klaim itu — pemelajar hanya melihat
 * satu dari dua sisi perbandingan. Keputusan pemilik, dicatat di ADR-0021.
 */

/** Struktur yang ditampilkan untuk Topik Stack, urut tampil. */
const STRUKTUR_TOPIK_STACK: JenisStruktur[] = ["stack", "queue"];

/**
 * Topik mana menampilkan Visualisasi apa.
 *
 * Masih satu Topik, dan itu bukan kelalaian: hanya `stack` yang punya berkas Materi.
 * Peta ini — bukan cabang `if (slug === "stack")` yang tersebar — supaya menambah
 * Visualisasi Topik berikutnya adalah menambah satu baris di sini, bukan menyunting
 * aturan yang sudah ada. Pola yang sama dengan `susunNavigasi` dan `susunIndeks`.
 */
const VISUALISASI_PER_TOPIK: Record<string, JenisStruktur[]> = {
  stack: STRUKTUR_TOPIK_STACK,
};

interface Props {
  /** Slug Topik, untuk mencari Visualisasi yang cocok. */
  slug: string;
  /** Bahasa yang sedang berlaku. */
  bahasa: Bahasa;
  /** Kamus bahasa yang sedang berlaku, untuk kalimat antarmuka. */
  kamus: Kamus;
}

export function DaftarVisualisasi({ slug, bahasa, kamus }: Props) {
  const struktur = VISUALISASI_PER_TOPIK[slug];

  // Topik yang belum punya Visualisasi tidak menampilkan judul bagian yang
  // menggantung. Sampai 11 Topik lain ditulis, inilah keadaan yang paling sering.
  if (struktur === undefined || struktur.length === 0) return null;

  return (
    <section className="mt-16" aria-labelledby="visualisasi-judul">
      <h2 id="visualisasi-judul" className="text-xl font-semibold tracking-tight">
        {kamus.visualisasi}
      </h2>
      <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
        {kamus.visualisasiRingkasan}
      </p>

      {/*
        Satu kalimat yang menerangkan kenapa ada **dua** Visualisasi, bukan satu. Tanpa
        ini, pemelajar yang membuka Stack dan melihat dua kartu akan menduga kartu
        kedua adalah pengulangan — padahal justru perbandingan itulah isinya.
      */}
      <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
        {kamus.visualisasiBandingkan}
      </p>

      {/*
        Satu kartu per struktur, ditumpuk tegak. Di HP keduanya jadi dua bagian yang
        berurutan, dan pemelajar bisa membandingkan isi keduanya setelah menjalankan
        langkah yang sama — itulah gunanya urutan langkah yang sama untuk keduanya.

        `key` per jenis struktur, karena satu halaman bisa memuat dua Visualisasi dan
        masing-masing punya keadaan sendiri yang tidak boleh tercampur.
      */}
      <div className="mt-8 flex flex-col gap-10">
        {struktur.map((jenis) => (
          <Visualisasi key={jenis} siap={siapkan(jenis, bahasa, kamus)} />
        ))}
      </div>
    </section>
  );
}

/** Susun data satu Visualisasi, dalam satu bahasa, siap menyeberang ke klien. */
function siapkan(
  jenis: JenisStruktur,
  bahasa: Bahasa,
  kamus: Kamus,
): VisualisasiSiap {
  const label: LabelStruktur = labelUntuk(bahasa, jenis);

  return {
    jenis,
    label,
    langkah: LANGKAH_CONTOH,
    // Ruang yang disediakan wadah. Dihitung dari datanya, bukan angka yang ditulis
    // tangan di komponen, supaya menambah langkah tidak membuat wadahnya terlalu
    // pendek — dan supaya tinggi halaman tidak berubah saat animasinya berjalan.
    puncak: puncakSel(LANGKAH_CONTOH),
    teks: {
      push: kamus.visualisasiPush,
      pop: kamus.visualisasiPop,
      awal: kamus.visualisasiAwal,
      kosong: kamus.visualisasiKosong,
      langkah: kamus.visualisasiLangkah,
      keluar: kamus.visualisasiKeluar,
      isi: kamus.visualisasiIsi,
      isiKosong: kamus.visualisasiIsiKosong,
      popKosong: kamus.visualisasiPopKosong,
      penghitung: kamus.visualisasiPenghitung,
      mundur: kamus.visualisasiMundur,
      maju: kamus.visualisasiMaju,
      ulang: kamus.visualisasiUlang,
      putar: kamus.visualisasiPutar,
      jeda: kamus.visualisasiJeda,
    },
  };
}
