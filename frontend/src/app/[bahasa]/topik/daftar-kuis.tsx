import type { ReactNode } from "react";

import type { Bahasa } from "@/lib/bahasa/bahasa.ts";
import type { Kamus } from "@/lib/bahasa/kamus.ts";
import { sorotKode } from "@/lib/konten/sorot-kode.ts";
import type { Kuis as BentukKuis, Topik } from "@/lib/konten/tipe.ts";
import { TeksKaya } from "@/lib/konten/teks-kaya.tsx";

import { Kuis, type KuisSiap } from "./kuis.tsx";

/**
 * Daftar seluruh Kuis sebuah Topik.
 *
 * Komponen server, tanpa JavaScript. Yang dikerjakan di sini empat: memilih Soal
 * ber-`tipe: kuis`, memilih versi bahasanya, merender teks Markdown-nya menjadi
 * ReactNode, dan memberinya nomor urut. Aturan penilaian dan pengacakan ada di
 * `src/lib/kuis/`; komponen interaktifnya ada di `kuis.tsx`.
 *
 * **Kenapa Markdown dirender di sini, bukan di komponen klien.** `react-markdown`
 * beserta penguraian Markdown-nya adalah paket yang tidak kecil. Kalau `kuis.tsx`
 * yang mengimpornya, seluruh pengurai itu ikut masuk bundel sisi klien hanya untuk
 * merender tiga potong teks pendek. Dirender di server, hasilnya menjadi ReactNode
 * yang dikirim sebagai prop — bentuk komposisi server → klien yang didukung Next.js,
 * dan bundel klien hanya berisi logika Kuis yang memang perlu hidup di peramban.
 *
 * **Bahasa dipilih di sini**, bukan di `kuis.tsx`: teksnya sudah menjadi ReactNode
 * saat menyeberang ke klien, jadi versi bahasanya harus dipilih sebelum itu. Ini juga
 * sebabnya `kuis.tsx` tidak perlu tahu bahasa sama sekali — ia hanya menerima teks
 * jadi dan label yang sudah diterjemahkan.
 *
 * `indeksSoal` yang diteruskan adalah posisi Soal di dalam `topik.soal` — bukan
 * nomor urut Kuis — karena itulah yang dipakai benih pengacakan. Memakai nomor urut
 * Kuis akan membuat benih Kuis pertama bertabrakan dengan Soal Kode.
 */

interface Props {
  topik: Topik;
  /** Bahasa yang sedang berlaku. */
  bahasa: Bahasa;
  /** Kamus bahasa yang sedang berlaku. */
  kamus: Kamus;
}

/** Soal ber-tipe Kuis, beserta posisinya di dalam daftar Soal Topik. */
function kuisDenganPosisi(topik: Topik): { kuis: BentukKuis; indeksSoal: number }[] {
  return topik.soal
    .map((soal, indeksSoal) => ({ soal, indeksSoal }))
    .filter(
      (item): item is { soal: BentukKuis; indeksSoal: number } => item.soal.tipe === "kuis",
    )
    .map((item) => ({ kuis: item.soal, indeksSoal: item.indeksSoal }));
}

/**
 * Blok kode satu Kuis, sudah disorot kalau bisa.
 *
 * **Disorot di sini (server), bukan di `kuis.tsx` (klien).** Alasannya sama dengan
 * alasan Markdown dirender di sini: penyorot beserta grammar-nya adalah paket besar,
 * dan mengimpornya di komponen klien akan memasukkannya ke bundel peramban hanya untuk
 * mewarnai potongan kode pendek. Dirender di server, hasilnya menyeberang sebagai
 * ReactNode — pola yang sudah dipakai untuk skenario dan opsi.
 *
 * **Fallback.** Kalau penyorotan tidak tersedia, blok dirender polos seperti
 * sebelumnya. Kode yang tidak terbaca jauh lebih buruk daripada kode tanpa warna.
 */
function blokKode(kode: string): ReactNode {
  const tersorot = sorotKode(kode);
  if (tersorot === null) {
    return (
      <pre>
        <code data-bahasa="python">{kode}</code>
      </pre>
    );
  }
  return (
    <pre className="shiki">
      <code data-bahasa="python">
        {tersorot.baris.map((baris, i) => (
          <span className="line" key={i}>
            {baris.map((potongan, j) => (
              <span key={j} style={potongan.warna === undefined ? undefined : { color: potongan.warna }}>
                {potongan.teks}
              </span>
            ))}
          </span>
        ))}
      </code>
    </pre>
  );
}

/** Ubah satu Kuis dari bentuk YAML menjadi bentuk siap render, dalam satu bahasa. */
function siapkanKuis(kuis: BentukKuis, bahasa: Bahasa): KuisSiap {
  return {
    skenario: <TeksKaya markdown={kuis.skenario[bahasa]} />,
    kode: kuis.kode === undefined ? undefined : blokKode(kuis.kode),
    opsi: kuis.opsi.map((opsi) => ({
      teks: <TeksKaya markdown={opsi.teks[bahasa]} />,
      benar: opsi.benar,
    })),
    penjelasan: <TeksKaya markdown={kuis.penjelasan[bahasa]} />,
  };
}

export function DaftarKuis({ topik, bahasa, kamus }: Props) {
  const daftar = kuisDenganPosisi(topik);

  // Topik tanpa Kuis tidak menampilkan judul bagian yang menggantung. Gerbang build
  // menjamin ini tidak terjadi untuk Topik yang sah, jadi cabang ini hanya jaring
  // pengaman.
  if (daftar.length === 0) return null;

  return (
    <section className="mt-16" aria-labelledby="kuis-judul">
      <h2 id="kuis-judul" className="text-xl font-semibold tracking-tight">
        {kamus.kuis}
      </h2>
      <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
        {kamus.kuisRingkasan}
      </p>

      <div className="mt-8 flex flex-col gap-10">
        {daftar.map((item, urutan) => (
          <Kuis
            key={item.indeksSoal}
            kuis={siapkanKuis(item.kuis, bahasa)}
            indeksSoal={item.indeksSoal}
            nomor={urutan + 1}
            total={daftar.length}
            slugTopik={topik.slug}
            kamus={kamus}
          />
        ))}
      </div>
    </section>
  );
}
