/**
 * Satu-satunya tempat antarmuka berbicara dengan backend.
 *
 * Semua permintaan lewat path relatif `/api/...`, yang diteruskan ke backend oleh
 * rewrite di `next.config.ts`. Kalau nanti backend pindah alamat, yang berubah
 * hanya konfigurasi itu — bukan kode di sini.
 */

/** Balasan `GET /api/health`. */
export interface HealthResponse {
  status: string;
  service: string;
}

/**
 * Ambil status kesehatan backend.
 *
 * Melempar kalau backend tidak menjawab, supaya pemanggil bisa membedakan
 * "backend hidup" dari "backend mati" dan menampilkannya ke pengguna.
 */
export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Backend membalas ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}
