import type { NextConfig } from "next";

// Antarmuka memanggil backend lewat rewrite di server Next, bukan lintas origin.
// Konsekuensinya: tidak perlu CORS, dan token tidak pernah dikirim dari kode klien.
// Alamat backend dibaca di sisi server saja, jadi tidak perlu prefiks NEXT_PUBLIC_.
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
