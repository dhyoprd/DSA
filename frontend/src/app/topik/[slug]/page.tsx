import { notFound } from "next/navigation";

import { MateriMarkdown } from "@/lib/konten/materi-markdown.tsx";
import { konten, topikDenganSlug } from "@/lib/konten/muat.ts";

/**
 * Halaman Topik — versi minimal.
 *
 * Ticket #3 membuktikan satu hal: sebuah Topik bisa dibaca dari berkas, lolos gerbang
 * validasi, dan dirender. Halaman ini sengaja hanya memuat Materi versi Indonesia.
 *
 * Yang **belum** ada di sini, dan menjadi lingkup ticket #4 (Halaman Topik + navigasi
 * Jalur): sidebar 12 Topik, penanda "segera", daftar isi di sisi kanan, nomor dan
 * total Topik, serta pengalih bahasa (#12). Jangan menambahkan tata letak itu di sini.
 *
 * `generateStaticParams` membuat halaman setiap Topik yang punya berkas menjadi
 * statis saat build, sesuai keputusan issue #1 bahwa Materi tidak melalui backend.
 */
export function generateStaticParams(): { slug: string }[] {
  return konten().topik.map((topik) => ({ slug: topik.slug }));
}

export default async function HalamanTopik({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topik = topikDenganSlug(slug);
  if (topik === null) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p
        className="font-mono text-xs tracking-widest uppercase"
        style={{ color: "var(--color-muted)" }}
      >
        Topik {String(topik.nomor).padStart(2, "0")} · Materi (draf)
      </p>

      <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-tight">
        {topik.judul.id}
      </h1>

      <p className="mt-3 text-sm" style={{ color: "var(--color-muted)" }}>
        Versi English belum ditampilkan di halaman ini. Pengalih bahasa adalah lingkup
        ticket #12.
      </p>

      <hr
        className="my-10"
        style={{ borderColor: "var(--color-border)" }}
      />

      <article className="text-base">
        <MateriMarkdown markdown={topik.materi.id} />
      </article>

      <p className="mt-16 text-sm" style={{ color: "var(--color-muted)" }}>
        {topik.soal.filter((s) => s.tipe === "kuis").length} Kuis dan{" "}
        {topik.soal.filter((s) => s.tipe === "soal-kode").length} Soal Kode sudah ada di
        berkas Topik ini, tetapi belum dirender. Kuis adalah ticket #6; Soal Kode adalah
        ticket #10.
      </p>
    </main>
  );
}
