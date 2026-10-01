import Link from "next/link";

import { konten } from "@/lib/konten/muat.ts";

import { BackendStatus } from "./backend-status";
import { TokenForm } from "./token-form";

/**
 * Halaman awal — kerangka statis.
 *
 * Isinya sengaja kosong dari Materi: navigasi Jalur yang sesungguhnya (sidebar 12
 * Topik, penanda Progres, label "segera") adalah lingkup ticket #4. Yang ada di sini
 * hanya tautan ke Topik yang sudah punya berkas, supaya rantai Materi bisa dicoba.
 *
 * `TokenForm` adalah antarmuka tempat token dimasukkan sekali (ticket #7). Ia
 * komponen klien, jadi halaman ini tetap statis dan Materi tetap terbaca walaupun
 * backend mati.
 */
export default function HomePage() {
  const { topik } = konten();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <p
        className="font-mono text-xs tracking-widest uppercase"
        style={{ color: "var(--color-muted)" }}
      >
        Situs belajar DSA
      </p>

      <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
        Kerangka tiga bagian sudah menyala.
      </h1>

      <p className="text-base leading-relaxed" style={{ color: "var(--color-muted)" }}>
        Antarmuka Next.js, backend Rust, dan folder Materi berjalan bersama. Kuis dan
        Soal Kode menyusul di ticket berikutnya.
      </p>

      <ul className="flex flex-col gap-2">
        {topik.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/topik/${t.slug}`}
              className="font-medium underline underline-offset-4"
              style={{ color: "var(--color-accent)" }}
            >
              {t.judul.id}
            </Link>
          </li>
        ))}
      </ul>

      <BackendStatus />
      <TokenForm />
    </main>
  );
}
