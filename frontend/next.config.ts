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
