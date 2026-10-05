import Link from "next/link";

import { type Bahasa } from "@/lib/bahasa/bahasa.ts";
import { kamusUntuk } from "@/lib/bahasa/kamus.ts";
import { konten } from "@/lib/konten/muat.ts";

import { BackendStatus } from "./backend-status";
import { Ekspor } from "./ekspor";
import { PengalihBahasa } from "./pengalih-bahasa.tsx";
import { PengalihTema } from "./pengalih-tema.tsx";
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
 *
 * Judul Topik ditampilkan dalam bahasa yang sedang berlaku, bukan selalu Indonesia:
 * itu bagian dari "tampilan situs ikut dialihkan" (ticket #12).
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ bahasa: string }>;
}) {
  const { bahasa } = await params;
  /*
   * `as Bahasa` aman karena root layout di `[bahasa]/layout.tsx` sudah memanggil
   * `notFound()` untuk segmen yang tidak sah, dan `dynamicParams = false` membuat
   * Next.js hanya menghasilkan rute untuk bahasa yang ada di `BAHASA`. Tidak ada
   * nilai lain yang bisa sampai ke sini; cast ini hanya memberi tahu TypeScript apa
   * yang sudah dijamin saat runtime.
   */
  const b = bahasa as Bahasa;
  const kamus = kamusUntuk(b);
  const { topik } = konten();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      {/* Pengalih bahasa dan tema juga ada di sini: halaman awal adalah halaman
          pertama yang dibuka, dan pemakai yang ingin bahasa atau tema lain tidak
          seharusnya perlu masuk ke sebuah Topik lebih dulu untuk mengubahnya. */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <PengalihBahasa aktif={b} kamus={kamus} />
        <PengalihTema kamus={kamus} />
      </div>

      <p
        className="font-mono text-xs tracking-widest uppercase"
        style={{ color: "var(--color-muted)" }}
      >
        {kamus.berandaLabel}
      </p>

      <h1 className="text-4xl leading-tight font-semibold tracking-tight">
        {kamus.berandaJudul}
      </h1>

      <p className="text-base leading-relaxed" style={{ color: "var(--color-muted)" }}>
        {kamus.berandaRingkasan}
      </p>

      <ul className="flex flex-col gap-2">
        {topik.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/${b}/topik/${t.slug}`}
              className="font-medium underline underline-offset-4"
              style={{ color: "var(--color-accent)" }}
            >
              {t.judul[b]}
            </Link>
          </li>
        ))}
      </ul>

      {/*
        Tautan ke pencarian (ticket #13). Di beranda, setelah daftar Topik: pemakai
        yang belum tahu harus membuka Topik mana adalah orang yang paling butuh
        mencari, jadi tautannya diletakkan di jalur pertama yang ia baca.
      */}
      <Link
        href={`/${b}/pencarian`}
        className="font-medium underline underline-offset-4"
        style={{ color: "var(--color-accent)" }}
      >
        {kamus.pencarianBuka}
      </Link>

      <BackendStatus kamus={kamus} />
      <TokenForm kamus={kamus} />

      {/*
        Ekspor (ticket #14). Diletakkan setelah formulir token supaya urutannya masuk
        akal: masukkan token dulu, baru mengekspor. Bagian ini tetap bekerja tanpa
        token untuk CSV-nya, karena berkasnya statis.
      */}
      <Ekspor
        topik={topik.map((t) => ({ slug: t.slug, judul: t.judul[b] }))}
        bahasa={b}
        kamus={kamus}
      />
    </main>
  );
}
