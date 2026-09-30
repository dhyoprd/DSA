import type { NextConfig } from "next";

// Antarmuka memanggil backend lewat rewrite di server Next, bukan lintas origin,
// sehingga tidak perlu CORS. Alamat backend dibaca di sisi server saja, jadi tidak
// perlu prefiks NEXT_PUBLIC_.
//
// Catatan: ini belum memutuskan bagaimana token (ADR-0006) dikirim. Ticket Backend:
// token + Progres yang menentukannya, dan ADR-0006 mencatat bahwa token hidup di
// variabel lingkungan frontend sehingga bisa dibaca dari DevTools. Jangan mengklaim
// jaminan yang lebih kuat dari itu tanpa membuka kembali ADR-nya.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

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
