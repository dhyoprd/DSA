import type { Kuis as BentukKuis, Topik } from "@/lib/konten/tipe.ts";
import { TeksKaya } from "@/lib/konten/teks-kaya.tsx";

import { Kuis, type KuisSiap } from "./kuis.tsx";

/**
 * Daftar seluruh Kuis sebuah Topik.
 *
 * Komponen server, tanpa JavaScript. Yang dikerjakan di sini tiga: memilih Soal
 * ber-`tipe: kuis`, merender teks Markdown-nya menjadi ReactNode, dan memberinya
 * nomor urut. Aturan penilaian dan pengacakan ada di `src/lib/kuis/`; komponen
 * interaktifnya ada di `kuis.tsx`.
 *
 * **Kenapa Markdown dirender di sini, bukan di komponen klien.** `react-markdown`
 * beserta penguraian Markdown-nya adalah paket yang tidak kecil. Kalau `kuis.tsx`
 * yang mengimpornya, seluruh pengurai itu ikut masuk bundel sisi klien hanya untuk
 * merender tiga potong teks pendek. Dirender di server, hasilnya menjadi ReactNode
 * yang dikirim sebagai prop — bentuk komposisi server → klien yang didukung Next.js,
 * dan bundel klien hanya berisi logika Kuis yang memang perlu hidup di peramban.
 *
 * `indeksSoal` yang diteruskan adalah posisi Soal di dalam `topik.soal` — bukan
 * nomor urut Kuis — karena itulah yang dipakai benih pengacakan. Memakai nomor urut
 * Kuis akan membuat benih Kuis pertama bertabrakan dengan Soal Kode.
 */

interface Props {
  topik: Topik;
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

/** Ubah satu Kuis dari bentuk YAML menjadi bentuk siap render. */
function siapkanKuis(kuis: BentukKuis): KuisSiap {
  return {
    skenario: <TeksKaya markdown={kuis.skenario.id} />,
    kode: kuis.kode,
    opsi: kuis.opsi.map((opsi) => ({
      teks: <TeksKaya markdown={opsi.teks.id} />,
      benar: opsi.benar,
    })),
    penjelasan: <TeksKaya markdown={kuis.penjelasan.id} />,
  };
}

export function DaftarKuis({ topik }: Props) {
  const daftar = kuisDenganPosisi(topik);

  // Topik tanpa Kuis tidak menampilkan judul bagian yang menggantung. Gerbang build
  // menjamin ini tidak terjadi untuk Topik yang sah, jadi cabang ini hanya jaring
  // pengaman.
  if (daftar.length === 0) return null;

  return (
    <section className="mt-16" aria-labelledby="kuis-judul">
      <h2 id="kuis-judul" className="text-xl font-semibold tracking-tight">
        Kuis
      </h2>
      <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
        Jawaban salah boleh dicoba lagi. Pembahasan terbuka setelah jawaban benar.
      </p>

      <div className="mt-8 flex flex-col gap-10">
        {daftar.map((item, urutan) => (
          <Kuis
            key={item.indeksSoal}
            kuis={siapkanKuis(item.kuis)}
            indeksSoal={item.indeksSoal}
            nomor={urutan + 1}
            total={daftar.length}
            slugTopik={topik.slug}
          />
        ))}
      </div>
    </section>
  );
}
