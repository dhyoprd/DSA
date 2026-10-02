import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";

import { BAHASA, adalahBahasa, type Bahasa } from "@/lib/bahasa/bahasa.ts";
import { kamusUntuk } from "@/lib/bahasa/kamus.ts";
import { skripTema } from "@/lib/tema.ts";

import "../globals.css";

/*
 * Inter adalah satu-satunya keluarga huruf di situs ini (docs/design-tree.md).
 * `next/font` menyalin berkasnya saat build dan menyajikannya dari domain sendiri,
 * sehingga tidak ada permintaan ke Google saat halaman dibuka, dan tidak ada
 * pergeseran tata letak saat hurufnya tiba (`display: "swap"`).
 *
 * `variable` memasang custom property `--font-inter`, yang dipakai `globals.css` untuk
 * mengikat `font-sans`. Jadi tidak ada nama keluarga huruf yang ditulis ulang di
 * komponen. Inter adalah satu-satunya keluarga huruf yang diunduh; `font-mono` di
 * `globals.css` adalah tumpukan huruf sistem, bukan keluarga kedua.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/**
 * Segmen bahasa: seluruh halaman situs hidup di bawah `/[bahasa]`, dan **ini root
 * layout-nya** — tidak ada `app/layout.tsx`.
 *
 * Alasannya bukan gaya. Bahasa yang berlaku harus diketahui di `<html lang>`, dan
 * `<html>` hanya boleh ditulis satu tempat. Kalau root layout berada di luar segmen
 * bahasa, ia tidak melihat `params.bahasa`, sehingga `<html lang>` harus ditebak atau
 * diisi konstanta — dan pembaca layar serta mesin pencari akan membaca bahasa yang
 * salah untuk separuh halaman. Menaruh root layout di dalam segmen membuat bahasa
 * tersedia tepat di tempat ia dibutuhkan.
 *
 * Konsekuensinya `generateStaticParams` ada di sini, bukan di halaman: Next.js
 * membuat satu cabang statis per bahasa, lalu setiap halaman di bawahnya di-generate
 * untuk setiap bahasa. Itu yang membuat `/id/...` dan `/en/...` dua halaman statis
 * terpisah, masing-masing bisa di-cache sendiri.
 */
export function generateStaticParams(): { bahasa: string }[] {
  return BAHASA.map((bahasa) => ({ bahasa }));
}

/*
 * Hanya `id` dan `en` yang boleh dirender; segmen bahasa lain dibalas 404.
 *
 * Ini **bukan** penjaga untuk `/fr/topik/stack`, walaupun terlihat seperti itu:
 * `proxy.ts` sudah mengalihkan alamat itu lebih dulu (ke `/id/fr/topik/stack`, yang
 * lalu 404), jadi `dynamicParams` tidak pernah melihatnya. Diverifikasi dengan
 * menjalankan build produksi: `/fr/topik/stack` berakhir 404 baik nilai ini `true`
 * maupun `false`.
 *
 * Yang dijaga `dynamicParams = false` adalah permintaan yang **melewati** proxy —
 * terutama prefetch router Next, yang dikecualikan matcher `proxy.ts` lewat header
 * `next-router-prefetch`. Tanpa baris ini, permintaan seperti itu dirender dengan
 * segmen bahasa yang tidak sah dan **gagal 500** (`Cannot read properties of
 * undefined`), bukan 404. Diverifikasi: dengan `false` hasilnya 404, dengan `true`
 * hasilnya 500.
 *
 * Jadi baris ini menjaga jalur yang jarang terlihat, bukan jalur yang biasa dipakai.
 * Itu tetap alasan yang cukup untuk mempertahankannya.
 */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bahasa: string }>;
}): Promise<Metadata> {
  const { bahasa } = await params;
  const kamus = kamusUntuk(bahasaDari(bahasa));
  return { title: kamus.judulSitus, description: kamus.deskripsiSitus };
}

/*
 * `color-scheme` dipasang di `<head>` sebagai meta tag, bukan hanya di CSS. Meta tag
 * ini dibaca peramban sebelum CSS selesai diunduh, sehingga latar halaman tidak
 * berkedip putih saat tema gelap dibuka di jaringan lambat.
 */
export const viewport: Viewport = {
  colorScheme: "light dark",
};

/**
 * Bahasa dari segmen, atau 404 kalau tidak sah.
 *
 * Dipisah supaya `generateMetadata` dan `RootLayout` memakai pemeriksaan yang sama —
 * dua salinan aturan "bahasa mana yang sah" adalah persis yang memungkinkan satu
 * tempat menerima bahasa yang ditolak tempat lain.
 */
function bahasaDari(nilai: string): Bahasa {
  if (!adalahBahasa(nilai)) notFound();
  return nilai;
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ bahasa: string }>;
}) {
  const { bahasa } = await params;
  const bahasaSah = bahasaDari(bahasa);

  return (
    /*
     * `lang` diisi bahasa yang sedang berlaku, bukan konstanta: itu satu-satunya
     * alasan root layout berada di dalam segmen bahasa. Tanpa ini pembaca layar
     * melafalkan halaman English dengan aturan pelafalan Indonesia.
     *
     * Tidak ada `data-theme` di sini, dan itu disengaja: tidak adanya atribut berarti
     * tema mengikuti pengaturan sistem — default yang ditetapkan docs/design-tree.md.
     * Pengalih tema yang menambahkannya.
     *
     * `suppressHydrationWarning` diperlukan karena skrip di bawah mengubah atribut
     * `data-theme` di elemen ini sebelum React hidup. Tanpa itu React menganggapnya
     * ketidakcocokan hidrasi dan membangun ulang pohonnya, dan justru itu yang
     * menimbulkan kedipan yang ingin dihindari.
     */
    <html lang={bahasaSah} className={inter.variable} suppressHydrationWarning>
      <head>
        {/*
         * Skrip ini berjalan **sebelum cat pertama**, jadi tema yang dipilih sudah
         * terpasang saat halaman pertama kali terlihat. Tanpa ini, halaman dirender
         * terang lalu berkedip ke gelap begitu React hidup.
         *
         * Isinya disusun `skripTema` dari peta yang sama dengan yang dipakai
         * pengalih tema, dan `tema.test.ts` membandingkan keduanya — jadi keduanya
         * tidak bisa menyimpang tanpa ketahuan.
         *
         * Tema, bukan bahasa, yang dipasang lewat skrip sebaris: bahasa sudah diketahui
         * di server (ia datang dari URL), sedangkan tema hanya ada di penyimpanan
         * peramban. Itulah bedanya, dan itu sebabnya keduanya memakai mekanisme
         * berbeda.
         */}
        <script dangerouslySetInnerHTML={{ __html: skripTema() }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
