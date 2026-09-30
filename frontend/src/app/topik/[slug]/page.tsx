import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { daftarBagian } from "@/lib/konten/bagian.ts";
import { MateriMarkdown } from "@/lib/konten/materi-markdown.tsx";
import { konten, topikDenganSlug } from "@/lib/konten/muat.ts";
import { susunNavigasi } from "@/lib/konten/navigasi.ts";
import { nomorDuaDigit } from "@/lib/konten/nomor.ts";

import { DaftarIsi } from "../daftar-isi.tsx";
import { Sidebar } from "../sidebar.tsx";

/**
 * Halaman Topik: sidebar Jalur, Materi, dan daftar isi.
 *
 * `generateStaticParams` membuat halaman setiap Topik yang punya berkas menjadi
 * statis saat build, sesuai keputusan issue #1 bahwa Materi tidak melalui backend.
 * Konsekuensinya Materi tetap terbaca kalau backend mati (user story 62).
 *
 * Halaman ini adalah **titik sambungan**, bukan tempat aturan hidup: aturan
 * "Topik mana yang tersedia" ada di `susunNavigasi`, aturan "bagian mana yang ada"
 * ada di `daftarBagian`, dan aturan "bagaimana Markdown tampil" ada di
 * `MateriMarkdown`. Yang dikerjakan di sini hanya menyusunnya dan menyerahkan
 * `id` bagian ke dua tempat yang harus sepakat.
 *
 * Belum ada di sini, dan memang bukan lingkup ticket ini: pengalih bahasa (#12),
 * tema (#5), Progres dari backend (#8), Kuis (#6), dan Soal Kode (#10).
 */
export function generateStaticParams(): { slug: string }[] {
  return konten().topik.map((topik) => ({ slug: topik.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topik = topikDenganSlug(slug);
  if (topik === null) return {};
  return { title: `${topik.judul.id} — Situs belajar DSA` };
}

export default async function HalamanTopik({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topik = topikDenganSlug(slug);
  if (topik === null) notFound();

  const { jalur, topik: semuaTopik } = konten();
  const navigasi = susunNavigasi(jalur, semuaTopik);

  // Materi versi Indonesia. Pengalih bahasa adalah lingkup ticket #12.
  const bagian = daftarBagian(topik.materi.id);

  // Dipetakan dari nomor baris judul ke `id` yang diberikan `daftarBagian`. Dihitung
  // sekali dan dipakai dua tempat — daftar isi dan heading — sehingga keduanya tidak
  // mungkin menyimpang.
  const idJudul = new Map(bagian.map((b) => [b.baris, b.id]));

  const nomor = nomorDuaDigit(topik.nomor);
  const total = nomorDuaDigit(navigasi.length);

  /*
   * Satu grid, tiga kolom di layar lebar. Di layar sempit ketiganya menumpuk, dan
   * `order` menaruh daftar isi **di antara** sidebar dan Materi — di bawah Materi
   * ia tidak akan pernah terlihat sebelum pembaca selesai membaca.
   *
   * `DaftarIsi` dipanggil **sekali**, dan di sini hanya ditempatkan. Komponen itu
   * sendiri yang memutuskan bentuknya menurut lebar layar (terlipat di HP, menempel
   * di layar lebar), sehingga isi kedua bentuk selalu berasal dari satu sumber dan
   * tidak bisa menyimpang.
   */
  return (
    <div className="mx-auto max-w-[84rem] px-5 py-8 sm:px-8 lg:py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[15rem_minmax(0,1fr)_13rem] lg:gap-12">
        <aside className="order-1 lg:col-start-1">
          <Sidebar baris={navigasi} slugAktif={topik.slug} />
        </aside>

        <main className="order-3 min-w-0 lg:col-start-2 lg:row-start-1">
          {/* Nomor dan total Topik, supaya posisi dalam Jalur terlihat (user story 5). */}
          <p
            className="font-mono text-xs tracking-widest uppercase"
            style={{ color: "var(--color-muted)" }}
          >
            Topik {nomor} / {total}
          </p>

          <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            {topik.judul.id}
          </h1>

          <article className="mt-8 max-w-[68ch] text-base">
            <MateriMarkdown markdown={topik.materi.id} idJudul={idJudul} />
          </article>
        </main>

        <aside className="order-2 lg:col-start-3 lg:row-start-1">
          <DaftarIsi bagian={bagian} />
        </aside>
      </div>
    </div>
  );
}
