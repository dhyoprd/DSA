import type { Bahasa } from "@/lib/bahasa/bahasa.ts";
import type { Kamus } from "@/lib/bahasa/kamus.ts";
import type { SoalKode as BentukSoalKode, Topik } from "@/lib/konten/tipe.ts";
import { TeksKaya } from "@/lib/konten/teks-kaya.tsx";

import { SoalKode } from "./soal-kode.tsx";

/**
 * Soal Kode sebuah Topik.
 *
 * Komponen server, tanpa JavaScript. Yang dikerjakan di sini: memilih Soal ber-`tipe:
 * soal-kode`, memilih versi bahasanya, merender skenarionya sebagai ReactNode, dan
 * menyerahkan sisanya ke komponen klien. Aturan penerjemahan hasil ada di
 * `src/lib/eksekusi/`; editornya di `soal-kode.tsx`.
 *
 * **Kenapa skenario dirender di sini, bukan di komponen klien.** Sama dengan Kuis:
 * `react-markdown` adalah paket yang tidak kecil, dan kalau `soal-kode.tsx` yang
 * mengimpornya, seluruh pengurai itu ikut masuk bundel sisi klien hanya untuk merender
 * satu potong teks. Dirender di server, hasilnya menjadi ReactNode yang dikirim
 * sebagai prop — dan bundel klien hanya berisi logika editor yang memang perlu hidup
 * di peramban.
 *
 * **Bahasa dipilih di sini**, bukan di `soal-kode.tsx`: teksnya sudah jadi ReactNode
 * saat menyeberang. Bahasa juga diteruskan sebagai nilai mentah karena kunci draf
 * membutuhkannya — draf kode untuk Materi Indonesia dan English adalah dua percobaan
 * yang berbeda.
 *
 * `indeksSoal` yang diteruskan adalah posisi Soal di dalam `topik.soal` — sama dengan
 * yang dipakai Kuis, dan sama dengan yang dipakai kunci draf.
 */
interface Props {
  topik: Topik;
  /** Bahasa yang sedang berlaku. */
  bahasa: Bahasa;
  /** Kamus bahasa yang sedang berlaku. */
  kamus: Kamus;
}

/** Soal ber-tipe Soal Kode, beserta posisinya di dalam daftar Soal Topik. */
function soalKodeDenganPosisi(
  topik: Topik,
): { soal: BentukSoalKode; indeksSoal: number }[] {
  return topik.soal
    .map((soal, indeksSoal) => ({ soal, indeksSoal }))
    .filter(
      (item): item is { soal: BentukSoalKode; indeksSoal: number } =>
        item.soal.tipe === "soal-kode",
    );
}

export function DaftarSoalKode({ topik, bahasa, kamus }: Props) {
  const daftar = soalKodeDenganPosisi(topik);

  // Topik tanpa Soal Kode tidak menampilkan judul bagian yang menggantung. Gerbang
  // build menjamin ini tidak terjadi untuk Topik yang sah, jadi cabang ini hanya
  // jaring pengaman.
  if (daftar.length === 0) return null;

  return (
    <section className="mt-16" aria-labelledby="soal-kode-bagian-judul">
      <h2 id="soal-kode-bagian-judul" className="text-xl font-semibold tracking-tight">
        {kamus.soalKode}
      </h2>
      <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
        {kamus.soalKodeRingkasan}
      </p>

      <div className="mt-6 flex flex-col gap-10">
        {daftar.map((item) => (
          <div key={item.indeksSoal}>
            {/*
              Skenario dirender sebagai blok di sini, terpisah dari komponen klien —
              sehingga ia terbaca walaupun JavaScript belum hidup, sama seperti Materi.
            */}
            <div className="text-base">
              <TeksKaya markdown={item.soal.skenario[bahasa]} />
            </div>

            <SoalKode
              slugTopik={topik.slug}
              bahasa={bahasa}
              indeksSoal={item.indeksSoal}
              fungsi={item.soal.fungsi}
              testCase={item.soal.test_case}
              kamus={kamus}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
