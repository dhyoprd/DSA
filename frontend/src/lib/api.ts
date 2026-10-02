/**
 * Satu-satunya tempat antarmuka berbicara dengan backend.
 *
 * Semua permintaan lewat path relatif `/api/...`, yang diteruskan ke backend oleh
 * rewrite di `next.config.ts`. Kalau nanti backend pindah alamat, yang berubah
 * hanya konfigurasi itu — bukan kode di sini.
 *
 * Token disisipkan ke setiap permintaan dari `token.ts`. Cara token sampai ke sini
 * (diketik sekali di antarmuka) ada di `docs/adr/0011-token-diketik-di-antarmuka.md`.
 */

import { ambilToken } from "./token.ts";
import type { Kamus } from "./bahasa/kamus.ts";
import type { StatusProgres } from "./konten/tipe.ts";

/** Balasan `GET /api/health`. */
export interface HealthResponse {
  status: string;
  service: string;
}

/** Satu baris Progres dari backend. */
export interface BarisProgres {
  topik_slug: string;
  soal_indeks: number;
  percobaan: number;
  benar_terakhir: string | null;
  status: StatusProgres;
}

/**
 * Ambil status kesehatan backend.
 *
 * Melempar kalau backend tidak menjawab, supaya pemanggil bisa membedakan
 * "backend hidup" dari "backend mati" dan menampilkannya ke pengguna.
 *
 * `kamus` wajib, bukan opsional dengan cadangan: pesan galat di sini adalah kalimat
 * yang dibaca pemakai, dan modul ini tidak punya cara tahu bahasa apa yang sedang
 * berlaku — bahasa datang dari URL, dan URL bukan urusannya. Memberinya nilai
 * cadangan berarti halaman English bisa diam-diam menampilkan galat Indonesia.
 */
export async function getHealth(kamus: Kamus): Promise<HealthResponse> {
  const response = await fetch("/api/health", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(pesanGalat(response.status, kamus));
  }

  return response.json() as Promise<HealthResponse>;
}

/**
 * Baca seluruh Progres.
 *
 * `token` boleh diberikan untuk memeriksa token yang **belum** disimpan — dipakai
 * formulir token untuk membuktikan tokennya diterima sebelum ia disimpan. Kalau
 * tidak diberikan, token diambil dari penyimpanan.
 *
 * Galatnya sudah berupa pesan yang bisa ditampilkan langsung, karena status HTTP
 * diterjemahkan di sini (`pesanGalat`) alih-alih dibocorkan ke pemanggil.
 */
export async function ambilProgres(token: string | undefined, kamus: Kamus): Promise<BarisProgres[]> {
  const response = await fetch("/api/progres", {
    cache: "no-store",
    headers: headerToken(token),
  });

  if (!response.ok) {
    throw new Error(pesanGalat(response.status, kamus));
  }

  const isi = (await response.json()) as { progres: BarisProgres[] };
  return isi.progres;
}

/**
 * Unduh seluruh Progres sebagai berkas.
 *
 * Memakai `fetch`, bukan `<a href>`, karena endpoint-nya butuh header
 * `Authorization` dan navigasi biasa tidak membawa header. Berkasnya diambil sebagai
 * blob, lalu unduhannya dipicu lewat tautan sementara.
 *
 * Nama berkasnya diambil dari header `Content-Disposition` kalau ada, supaya backend
 * tetap satu-satunya yang menentukan nama — antarmuka tidak perlu tahu.
 */
export async function unduhProgres(kamus: Kamus): Promise<void> {
  const response = await fetch("/api/ekspor/progres", {
    cache: "no-store",
    headers: { ...headerToken() },
  });

  if (!response.ok) {
    throw new Error(pesanGalat(response.status, kamus));
  }

  const blob = await response.blob();
  const nama = namaBerkas(response) ?? "progres.json";

  const url = URL.createObjectURL(blob);
  const tautan = document.createElement("a");
  tautan.href = url;
  tautan.download = nama;
  document.body.append(tautan);
  tautan.click();
  tautan.remove();
  // URL objek menahan blob di memori sampai dilepas; tanpa ini unduhan besar
  // meninggalkan memori yang tidak kembali sampai halaman ditutup.
  URL.revokeObjectURL(url);
}

/** Nama berkas dari header `Content-Disposition`, atau `null` kalau tidak ada. */
function namaBerkas(response: Response): string | null {
  const header = response.headers.get("content-disposition");
  if (header === null) return null;

  const cocok = /filename="([^"]+)"/.exec(header);
  return cocok?.[1] ?? null;
}

/**
 * Header `Authorization`, atau kosong kalau token belum pernah diisi.
 *
 * `token` boleh diberikan untuk memakai token yang belum tersimpan. Mengembalikan
 * objek kosong (bukan melempar) kalau tokennya tidak ada, supaya permintaan tetap
 * terkirim dan backend yang menjawab `401` — satu jalur galat, bukan dua. Kalau
 * fungsi ini melempar lebih dulu, "belum mengisi token" dan "token salah" akan lewat
 * jalur yang berbeda, padahal bagi pemakainya keduanya sama: isi token yang benar.
 */
function headerToken(token?: string): Record<string, string> {
  const dipakai = token ?? ambilToken();
  if (dipakai === null || dipakai.length === 0) return {};
  return { Authorization: `Bearer ${dipakai}` };
}

/** Pesan yang berguna untuk pemakai, berdasarkan status HTTP, dalam bahasa aktif. */
function pesanGalat(status: number, kamus: Kamus): string {
  if (status === 401) {
    return kamus.galatToken;
  }
  // Rewrite Next membalas 5xx ketika backend tidak bisa dihubungi. Tanpa cabang ini,
  // backend yang sedang mati akan tampak seperti kesalahan token, dan pemakai akan
  // menempel ulang token yang sebenarnya benar.
  if (status >= 500) {
    return kamus.galatBackendMati;
  }
  return `${kamus.galatStatus} ${String(status)}`;
}
