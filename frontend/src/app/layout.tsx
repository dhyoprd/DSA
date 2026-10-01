import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { skripTema } from "@/lib/tema.ts";

import "./globals.css";

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

export const metadata: Metadata = {
  title: "Situs belajar DSA",
  description: "Belajar Data Structures & Algorithms, satu Topik sekaligus.",
};

/*
 * `color-scheme` dipasang di `<head>` sebagai meta tag, bukan hanya di CSS. Meta tag
 * ini dibaca peramban sebelum CSS selesai diunduh, sehingga latar halaman tidak
 * berkedip putih saat tema gelap dibuka di jaringan lambat.
 */
export const viewport: Viewport = {
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /*
     * Tidak ada `data-theme` di sini, dan itu disengaja: tidak adanya atribut berarti
     * tema mengikuti pengaturan sistem — default yang ditetapkan
     * docs/design-tree.md. Pengalih tema yang menambahkannya.
     *
     * `suppressHydrationWarning` diperlukan karena skrip di bawah mengubah atribut
     * `data-theme` di elemen ini sebelum React hidup. Tanpa itu React menganggapnya
     * ketidakcocokan hidrasi dan membangun ulang pohonnya, dan justru itu yang
     * menimbulkan kedipan yang ingin dihindari.
     */
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <head>
        {/*
         * Skrip ini berjalan **sebelum cat pertama**, jadi tema yang dipilih sudah
         * terpasang saat halaman pertama kali terlihat. Tanpa ini, halaman dirender
         * terang lalu berkedip ke gelap begitu React hidup.
         *
         * Isinya disusun `skripTema` dari peta yang sama dengan yang dipakai
         * pengalih tema, dan `tema.test.ts` membandingkan keduanya — jadi keduanya
         * tidak bisa menyimpang tanpa ketahuan.
         */}
        <script
          dangerouslySetInnerHTML={{ __html: skripTema() }}
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
