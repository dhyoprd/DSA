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
import type { HasilEksekusi, PermintaanEksekusi } from "./eksekusi/tipe.ts";

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
 * Satu Kotak Penjelasan dari backend.
 *
 * `diperbarui` `null` berarti Soal ini belum pernah ditulis. Bentuknya sengaja sama
 * untuk Soal yang sudah ditulis maupun belum, sehingga antarmuka hanya punya satu
 * bentuk untuk ditangani — dan "belum pernah menulis" tidak perlu dibedakan dari
 * "menulis kosong" sebagai galat.
 */
export interface BarisPenjelasan {
  topik_slug: string;
  soal_indeks: number;
  isi: string;
  diperbarui: string | null;
}

/**
 * Catatan sebuah Topik dari backend.
 *
 * Bentuknya sejajar dengan `BarisPenjelasan`, kecuali tanpa `soal_indeks`: Catatan
 * disimpan per **Topik**, bukan per Soal (CONTEXT.md). `diperbarui` `null` berarti
 * Topik ini belum pernah ditulis.
 */
export interface BarisCatatan {
  topik_slug: string;
  isi: string;
  diperbarui: string | null;
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
 * Catat satu jawaban Soal, lalu kembalikan keadaan barisnya yang baru.
 *
 * `POST`, bukan `PUT`: setiap jawaban **menambah** `percobaan`, jadi mengirim dua kali
 * menghasilkan keadaan yang berbeda. Itu kebalikan dari Kotak Penjelasan dan Catatan,
 * yang mengganti seluruh isi alamat yang pasti dan karenanya memakai `PUT`.
 *
 * Balasannya adalah **baris itu saja**, bukan seluruh Progres — backend sengaja tidak
 * memaksa permintaan baca kedua. Pemanggil yang menyimpan daftarnya menempelkan baris
 * ini ke daftarnya sendiri (`lib/progres/baris.ts`).
 *
 * Galatnya sudah berupa pesan yang bisa ditampilkan langsung, sama seperti fungsi lain
 * di modul ini.
 */
export async function catatProgres(
  slugTopik: string,
  indeksSoal: number,
  benar: boolean,
  kamus: Kamus,
): Promise<BarisProgres> {
  const response = await fetch(
    `/api/progres/${encodeURIComponent(slugTopik)}/${String(indeksSoal)}`,
    {
      method: "POST",
      cache: "no-store",
      headers: { ...headerToken(), "Content-Type": "application/json" },
      body: JSON.stringify({ benar }),
    },
  );

  if (!response.ok) {
    throw new Error(pesanGalat(response.status, kamus));
  }

  return response.json() as Promise<BarisProgres>;
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

/**
 * Baca tulisan Kotak Penjelasan sebuah Soal.
 *
 * Soal yang belum pernah ditulis dibalas `200` dengan isi kosong oleh backend, jadi
 * fungsi ini tidak pernah melempar untuk "belum pernah menulis" — ia hanya melempar
 * untuk galat sungguhan (token salah, backend mati). Itu disengaja: "belum menulis"
 * adalah keadaan normal, dan memperlakukannya sebagai galat akan memaksa pemanggil
 * menampilkan pesan gagal kepada pemelajar yang hanya belum menulis apa-apa.
 */
export async function ambilPenjelasan(
  slugTopik: string,
  indeksSoal: number,
  kamus: Kamus,
): Promise<BarisPenjelasan> {
  const response = await fetch(
    `/api/penjelasan/${encodeURIComponent(slugTopik)}/${String(indeksSoal)}`,
    { cache: "no-store", headers: headerToken() },
  );

  if (!response.ok) {
    throw new Error(pesanGalat(response.status, kamus));
  }

  return response.json() as Promise<BarisPenjelasan>;
}

/**
 * Simpan tulisan Kotak Penjelasan sebuah Soal.
 *
 * `PUT`, bukan `POST` — sama dengan backend: permintaannya mengganti seluruh isi satu
 * kotak yang alamatnya pasti, jadi mengirim dua kali menghasilkan keadaan yang sama.
 *
 * Mengembalikan baris hasil simpan supaya bentuknya sejajar dengan endpoint tulis
 * Progres (`POST /api/progres/...` juga mengembalikan barisnya). Pemanggil saat ini
 * belum memakai nilai kembaliannya — `KotakPenjelasan` hanya menandai "Tersimpan" —
 * jadi ia sengaja tidak menampilkan waktu penyimpanan. Kalau nanti mau, waktunya sudah
 * ada di sini tanpa permintaan kedua.
 */
export async function simpanPenjelasan(
  slugTopik: string,
  indeksSoal: number,
  isi: string,
  kamus: Kamus,
): Promise<BarisPenjelasan> {
  const response = await fetch(
    `/api/penjelasan/${encodeURIComponent(slugTopik)}/${String(indeksSoal)}`,
    {
      method: "PUT",
      cache: "no-store",
      headers: { ...headerToken(), "Content-Type": "application/json" },
      body: JSON.stringify({ isi }),
    },
  );

  if (!response.ok) {
    throw new Error(pesanGalat(response.status, kamus));
  }

  return response.json() as Promise<BarisPenjelasan>;
}

/**
 * Baca Catatan sebuah Topik.
 *
 * Topik yang belum pernah ditulis dibalas `200` dengan isi kosong oleh backend, jadi
 * fungsi ini tidak pernah melempar untuk "belum pernah menulis" — ia hanya melempar
 * untuk galat sungguhan (token salah, backend mati). Sama dengan `ambilPenjelasan`.
 */
export async function ambilCatatan(slugTopik: string, kamus: Kamus): Promise<BarisCatatan> {
  const response = await fetch(`/api/catatan/${encodeURIComponent(slugTopik)}`, {
    cache: "no-store",
    headers: headerToken(),
  });

  if (!response.ok) {
    throw new Error(pesanGalat(response.status, kamus));
  }

  return response.json() as Promise<BarisCatatan>;
}

/**
 * Simpan Catatan sebuah Topik.
 *
 * `PUT`, bukan `POST` — sama dengan backend: permintaannya mengganti seluruh isi satu
 * Catatan yang alamatnya pasti, jadi mengirim dua kali menghasilkan keadaan yang sama.
 *
 * Mengembalikan baris hasil simpan. Pemanggil saat ini belum memakai nilai
 * kembaliannya — editor hanya menandai "Tersimpan" — jadi ia sengaja tidak menampilkan
 * waktu penyimpanan. Kalau nanti mau, waktunya sudah ada di sini tanpa permintaan
 * kedua.
 */
export async function simpanCatatan(
  slugTopik: string,
  isi: string,
  kamus: Kamus,
): Promise<BarisCatatan> {
  const response = await fetch(`/api/catatan/${encodeURIComponent(slugTopik)}`, {
    method: "PUT",
    cache: "no-store",
    headers: { ...headerToken(), "Content-Type": "application/json" },
    body: JSON.stringify({ isi }),
  });

  if (!response.ok) {
    throw new Error(pesanGalat(response.status, kamus));
  }

  return response.json() as Promise<BarisCatatan>;
}

/**
 * Jalankan kode Soal Kode dan kembalikan hasilnya per test case.
 *
 * Berbeda dari fungsi lain di modul ini, **galat pemelajar bukan lemparan**: kode yang
 * gagal sintaks atau lewat batas waktu tetap dibalas `200` oleh backend, dengan
 * `status` di dalam badan. Yang melempar hanya permintaan yang ditolak **sebelum**
 * dijalankan (kode kosong, terlalu panjang, batas laju) atau kegagalan layanan.
 *
 * Pemisahan itu penting bagi pemanggil: `catch` di sini berarti "permintaannya tidak
 * pernah sampai", sedangkan `status` di dalam hasil berarti "kodenya yang bermasalah".
 * Menggabungkan keduanya akan membuat pemelajar melihat "kodenya terlalu panjang"
 * sebagai kegagalan jaringan.
 *
 * Token wajib: endpoint eksekusi menjalankan kode, jadi ia di belakang token yang sama
 * dengan Progres dan Catatan.
 */
export async function jalankanKode(
  permintaan: PermintaanEksekusi,
  kamus: Kamus,
): Promise<HasilEksekusi> {
  const response = await fetch("/api/eksekusi", {
    method: "POST",
    cache: "no-store",
    headers: { ...headerToken(), "Content-Type": "application/json" },
    body: JSON.stringify(permintaan),
  });

  if (!response.ok) {
    throw new Error(await pesanPenolakan(response, kamus));
  }

  return response.json() as Promise<HasilEksekusi>;
}

/**
 * Pesan untuk permintaan yang ditolak, dalam bahasa yang sedang berlaku.
 *
 * Backend mengirim dua hal saat menolak: `galat` (kalimat Indonesia) dan `jenis`
 * (nama mesin-terbaca). Antarmuka memakai `jenis` untuk memilih kalimatnya sendiri
 * dari kamus, dan jatuh ke `galat` kalau jenisnya belum dikenal — sehingga penolakan
 * yang belum punya kalimat terjemahan tetap terbaca, bukan hilang.
 *
 * Badan galat dibaca sebagai JSON, tetapi kegagalan membacanya tidak dijadikan galat
 * baru: rewrite Next bisa membalas HTML saat backend mati, dan pada saat itu yang
 * berguna justru `pesanGalat` berdasarkan status.
 */
async function pesanPenolakan(response: Response, kamus: Kamus): Promise<string> {
  let isi: { galat?: string; jenis?: string } | null = null;
  try {
    isi = (await response.json()) as { galat?: string; jenis?: string };
  } catch {
    isi = null;
  }

  switch (isi?.jenis) {
    case "kode-kosong":
      return kamus.soalKodeKosong;
    case "ukuran-kode":
      return kamus.soalKodeTerlaluPanjang;
    case "batas-laju":
      return kamus.soalKodeTerlaluSering;
    case "jumlah-kasus":
      // Pemelajar tidak bisa memperbaiki ini — jumlah test case milik Soal, bukan
      // kodenya. Pesan backend dipakai apa adanya karena ia menyebut angkanya.
      return isi.galat ?? pesanGalat(response.status, kamus);
    default:
      return isi?.galat ?? pesanGalat(response.status, kamus);
  }
}

/** Nama berkas dari header `Content-Disposition`, atau `null` kalau tidak ada. */
function namaBerkas(response: Response): string | null {  const header = response.headers.get("content-disposition");
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
