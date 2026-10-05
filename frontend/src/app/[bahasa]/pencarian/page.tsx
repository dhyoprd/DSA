import type { Metadata } from "next";

import { type Bahasa } from "@/lib/bahasa/bahasa.ts";
import { kamusUntuk } from "@/lib/bahasa/kamus.ts";
import { konten } from "@/lib/konten/muat.ts";
import { susunIndeks } from "@/lib/pencarian/indeks.ts";

import { PengalihBahasa } from "../pengalih-bahasa.tsx";
import { PengalihTema } from "../pengalih-tema.tsx";
import { Pencarian } from "./pencarian.tsx";

/**
 * Halaman pencarian Materi (ticket #13).
 *
 * **Kenapa halaman, bukan kotak di beranda atau sidebar.** Kriteria penerimaan
 * meminta pencarian bisa dipakai "di laptop dan HP", dan pemakaian sebenarnya adalah
 * saat sedang membaca ulang Topik ke-8 dan perlu tahu di mana suatu istilah dibahas.
 * Kotak di beranda memaksa kembali ke beranda dulu; kotak di sidebar memakan ruang
 * pita yang sempit di HP. Halaman sendiri bisa ditautkan dari keduanya, dan di HP ia
 * punya lebar penuh untuk kotak dan hasilnya.
 *
 * **Kenapa statis.** Indeksnya disusun dari `content/*.yaml` saat build dan tidak
 * berubah selama satu build, persis seperti Materi. Halaman ini tidak menyentuh
 * backend dan tidak butuh token, sehingga pencarian tetap bekerja saat backend mati
 * (user story 62). Yang hidup di klien hanya pencocokan di atas indeks yang sudah
 * dikirim — lihat `pencarian.tsx`.
 *
 * **Halaman ini titik sambungan, bukan tempat aturan hidup.** Aturan "bagian mana
 * yang ada" ada di `susunIndeks`, aturan "apa yang cocok" ada di `cari`. Yang
 * dikerjakan di sini hanya menyusun keduanya dan menyerahkan hasilnya ke komponen.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ bahasa: string }>;
}): Promise<Metadata> {
  const { bahasa } = await params;
  const kamus = kamusUntuk(bahasa as Bahasa);
  return { title: `${kamus.pencarian} — ${kamus.judulSitus}` };
}

export default async function HalamanPencarian({
  params,
}: {
  params: Promise<{ bahasa: string }>;
}) {
  const { bahasa } = await params;
  /*
   * `as Bahasa` aman karena root layout di `[bahasa]/layout.tsx` sudah memanggil
   * `notFound()` untuk segmen yang tidak sah, dan `dynamicParams = false` membuat
   * Next.js hanya menghasilkan rute untuk bahasa yang ada di `BAHASA`.
   */
  const b = bahasa as Bahasa;
  const kamus = kamusUntuk(b);

  const { topik } = konten();
  const indeks = susunIndeks(topik, b);

  return (
    <main className="mx-auto max-w-2xl px-5 py-8 sm:px-8 lg:py-12">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <PengalihBahasa aktif={b} kamus={kamus} />
        <PengalihTema kamus={kamus} />
      </div>

      <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
        {kamus.pencarian}
      </h1>

      <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--color-muted)" }}>
        {kamus.pencarianRingkasan}
      </p>

      <div className="mt-8">
        <Pencarian indeks={indeks} bahasa={b} kamus={kamus} />
      </div>
    </main>
  );
}
