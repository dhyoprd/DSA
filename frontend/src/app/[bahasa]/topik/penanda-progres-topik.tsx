"use client";

import type { Kamus } from "@/lib/bahasa/kamus.ts";

import { PenandaProgres } from "./penanda-progres.tsx";
import { useProgres } from "./progres-provider.tsx";

/**
 * Penanda Progres sebuah Topik, dibaca dari `ProgresProvider`.
 *
 * Komponen klien, dan itu satu-satunya alasannya ada: React context tidak bisa dibaca
 * dari komponen server. `Sidebar` tetap komponen server — ia hanya merender komponen
 * kecil ini per baris, sehingga seluruh daftar Jalur tidak ikut masuk bundel klien
 * hanya untuk menampilkan enam lambang.
 *
 * Lambang, warna, dan teks pembaca layarnya tetap milik `PenandaProgres`; di sini
 * hanya dibaca dari context, bukan diwarisi lewat prop. Itu yang membuat sidebar ikut
 * berubah begitu sebuah Kuis dijawab, tanpa permintaan kedua ke backend.
 */

interface Props {
  /** Slug Topik baris ini. */
  slug: string;
  /** Kamus bahasa yang sedang berlaku, untuk nama statusnya. */
  kamus: Kamus;
  /** Ukuran lambang dalam kelas Tailwind. */
  kelas?: string;
}

export function PenandaProgresTopik({ slug, kamus, kelas }: Props) {
  const { status } = useProgres();

  // Topik yang belum ditulis tidak ada di peta status, dan itu memang `belum`.
  return <PenandaProgres status={status[slug] ?? "belum"} kamus={kamus} kelas={kelas} />;
}
