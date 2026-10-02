import type { NextConfig } from "next";

import { jalankanGerbangKonten } from "./src/lib/konten/gerbang.ts";

// Antarmuka memanggil backend lewat rewrite di server Next, bukan lintas origin,
// sehingga tidak perlu CORS. Alamat backend dibaca di sisi server saja, jadi tidak
// perlu prefiks NEXT_PUBLIC_.
//
// Catatan: ini belum memutuskan bagaimana token (ADR-0006) dikirim. Ticket Backend:
// token + Progres yang menentukannya, dan ADR-0006 mencatat bahwa token hidup di
// variabel lingkungan frontend sehingga bisa dibaca dari DevTools. Jangan mengklaim
// jaminan yang lebih kuat dari itu tanpa membuka kembali ADR-nya.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

// Gerbang validasi konten. Diletakkan di sini, bukan di script terpisah, supaya
// tidak bisa dilewati: `next build` dan `next dev` sama-sama membaca berkas ini,
// jadi konten yang rusak menghentikan keduanya tanpa perlu disiplin manual.
// Kebijakan gerbangnya ada di src/lib/konten/gerbang.ts.
jalankanGerbangKonten();

const nextConfig: NextConfig = {
  experimental: {
    /*
     * Halaman 404 untuk alamat yang tidak cocok rute mana pun.
     *
     * Restrukturisasi ticket #12 menaruh root layout di `app/[bahasa]/layout.tsx`,
     * dan Next.js menangani alamat yang tidak cocok rute apa pun di tingkat routing —
     * sebelum layout itu dirender. Tanpa berkas ini, 404 tampil sebagai `<html>`
     * polos tanpa `lang` dan tanpa token warna situs. Dokumentasi Next.js menyebut
     * "root layout memakai segmen dinamis tingkat atas" sebagai salah satu pemicu
     * yang mengharuskan `global-not-found`. Halamannya ada di
     * `src/app/global-not-found.tsx`.
     *
     * Fiturnya masih eksperimental, jadi namanya ada di bawah `experimental`.
     */
    globalNotFound: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
