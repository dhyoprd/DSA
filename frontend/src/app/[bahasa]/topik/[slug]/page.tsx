import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { type Bahasa } from "@/lib/bahasa/bahasa.ts";
import { kamusUntuk } from "@/lib/bahasa/kamus.ts";
import { daftarBagian } from "@/lib/konten/bagian.ts";
import { MateriMarkdown } from "@/lib/konten/materi-markdown.tsx";
import { konten, topikDenganSlug } from "@/lib/konten/muat.ts";
import { susunNavigasi } from "@/lib/konten/navigasi.ts";
import { nomorDuaDigit } from "@/lib/konten/nomor.ts";

import { DaftarIsi } from "../daftar-isi.tsx";
import { DaftarKuis } from "../daftar-kuis.tsx";
import { PengalihBahasa } from "../../pengalih-bahasa.tsx";
import { PengalihTema } from "../../pengalih-tema.tsx";
import { Sidebar } from "../sidebar.tsx";

/**
 * Halaman Topik: sidebar Jalur, Materi, Kuis, dan daftar isi.
 *
 * `generateStaticParams` membuat halaman setiap Topik yang punya berkas menjadi
 * statis saat build, sesuai keputusan issue #1 bahwa Materi tidak melalui backend.
 * Konsekuensinya Materi tetap terbaca kalau backend mati (user story 62).
 *
 * Halaman ini adalah **titik sambungan**, bukan tempat aturan hidup: aturan
 * "Topik mana yang tersedia" ada di `susunNavigasi`, aturan "bagian mana yang ada"
 * ada di `daftarBagian`, aturan "bagaimana Markdown tampil" ada di `MateriMarkdown`,
 * dan aturan "Kuis mana yang tampil" ada di `DaftarKuis`. Yang dikerjakan di sini
 * hanya menyusunnya dan menyerahkan `id` bagian ke dua tempat yang harus sepakat.
 *
 * Halaman tetap statis walaupun memuat Kuis: `DaftarKuis` merender kerangka Kuis di
 * server, dan yang interaktif — pengacakan opsi, penilaian, Pembahasan — baru hidup
 * setelah React mengambil alih di peramban.
 *
 * **Bahasa mengikuti segmen URL** (ticket #12), bukan pilihan di peramban. Segmen
 * `[bahasa]` ada di atas halaman ini, jadi ia sudah pasti sah saat kode ini berjalan
 * — root layout di `[bahasa]/layout.tsx` yang menolak segmen yang tidak dikenal.
 * Bahasa itu dipakai tiga tempat: teks antarmuka dari kamus, `topik.materi[b]`, dan
 * seluruh `judul[b]`/`skenario[b]` di dalam Soal.
 */
export function generateStaticParams(): { slug: string }[] {
  return konten().topik.map((topik) => ({ slug: topik.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bahasa: string; slug: string }>;
}): Promise<Metadata> {
  const { bahasa, slug } = await params;
  const b = bahasa as Bahasa;
  const topik = topikDenganSlug(slug);
  if (topik === null) return {};
  return { title: `${topik.judul[b]} — ${kamusUntuk(b).judulSitus}` };
}

export default async function HalamanTopik({
  params,
}: {
  params: Promise<{ bahasa: string; slug: string }>;
}) {
  const { bahasa, slug } = await params;
  const b = bahasa as Bahasa;
  const kamus = kamusUntuk(b);

  const topik = topikDenganSlug(slug);
  if (topik === null) notFound();

  const { jalur, topik: semuaTopik } = konten();
  const navigasi = susunNavigasi(jalur, semuaTopik);

  // Materi dalam bahasa yang sedang berlaku. Daftar isi disusun dari Markdown yang
  // sama, jadi judul bagiannya pun ikut bahasa yang berlaku.
  const bagian = daftarBagian(topik.materi[b]);

  // Dipetakan dari nomor baris judul ke `id` yang diberikan `daftarBagian`. Dihitung
  // sekali dan dipakai dua tempat — daftar isi dan heading — sehingga keduanya tidak
  // mungkin menyimpang.
  const idJudul = new Map(bagian.map((x) => [x.baris, x.id]));

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
      {/*
        Pengalih bahasa dan tema di kanan atas, mengikuti aliran halaman. Diletakkan
        **di luar** grid supaya keduanya tidak mengambil kolom dari daftar isi di layar
        lebar, dan tidak menambah tinggi baris pertama grid di layar sempit.

        Keduanya sengaja tidak mengapung: pengalih yang selalu terlihat akan menutupi
        Materi atau pita Jalur di layar HP, dan keduanya jarang diubah saat membaca.
      */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <PengalihBahasa aktif={b} kamus={kamus} />
        <PengalihTema kamus={kamus} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[15rem_minmax(0,1fr)_13rem] lg:gap-12">
        <aside className="order-1 lg:col-start-1">
          <Sidebar baris={navigasi} slugAktif={topik.slug} bahasa={b} kamus={kamus} />
        </aside>

        <main className="order-3 min-w-0 lg:col-start-2 lg:row-start-1">
          {/* Nomor dan total Topik, supaya posisi dalam Jalur terlihat (user story 5). */}
          <p
            className="font-mono text-xs tracking-widest uppercase"
            style={{ color: "var(--color-muted)" }}
          >
            {kamus.topik} {nomor} / {total}
          </p>

          <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            {topik.judul[b]}
          </h1>

          <article className="mt-8 max-w-[68ch] text-base">
            <MateriMarkdown markdown={topik.materi[b]} idJudul={idJudul} />
          </article>

          {/*
            Kuis diletakkan di dalam `main`, setelah Materi — urutan yang sama dengan
            `design-tree.md`: baca konsepnya dulu, baru uji diri. Lebar bacanya
            dibatasi seperti Materi supaya keduanya terasa satu kolom.
          */}
          <div className="max-w-[68ch]">
            <DaftarKuis topik={topik} bahasa={b} kamus={kamus} />
          </div>
        </main>

        <aside className="order-2 lg:col-start-3 lg:row-start-1">
          <DaftarIsi bagian={bagian} kamus={kamus} />
        </aside>
      </div>
    </div>
  );
}
