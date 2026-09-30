/**
 * Aturan validasi konten.
 *
 * Modul ini murni: masukannya nilai JavaScript biasa (hasil `parse` YAML), keluarannya
 * daftar masalah. Tidak menyentuh berkas, tidak menyentuh jaringan. Itu yang membuatnya
 * bisa diuji tanpa membuat berkas contoh — cukup objek biasa.
 *
 * Kesalahan *sintaks* YAML tidak ditangani di sini; pustaka `yaml` sudah melaporkannya
 * lengkap dengan nomor baris di `baca.ts`. Pemisahan ini menjaga modul ini bebas dari
 * pohon AST.
 *
 * Setiap aturan mengumpulkan masalah dan terus berjalan, bukan berhenti di yang pertama:
 * penulis Materi perlu melihat semua kesalahan sekaligus, bukan satu per build.
 *
 * Aturan yang **belum** ada di sini: menjalankan `solusi_referensi` terhadap test case-nya
 * sendiri. Itu butuh mesin Eksekusi Kode yang baru dibangun di ticket #10, dan di sana
 * pula (bukan di sini) ia menjadi bagian gerbang build. Lihat issue #1, "Gerbang validasi".
 */

import type { Masalah, TeksDwibahasa, TopikJalur } from "./tipe.ts";

/** Komposisi yang ditetapkan issue #1: 5 Kuis + 1 Soal Kode per Topik. */
export const JUMLAH_KUIS = 5;
export const JUMLAH_SOAL_KODE = 1;

/** Yang dibutuhkan validator untuk memeriksa satu berkas Topik. */
export interface KonteksTopik {
  /** Berkas relatif terhadap akar repo, mis. `content/stack.yaml`. */
  berkas: string;
  /** Jalur lengkap dari `content/jalur.yaml`, untuk memeriksa `prasyarat`. */
  jalur: TopikJalur[];
}

type TambahMasalah = (lokasi: string, pesan: string) => void;

// --- Penjaga tipe -------------------------------------------------------------
// Nilai datang dari YAML, jadi bentuknya tidak bisa dipercaya sebelum diperiksa.

function adalahObjek(nilai: unknown): nilai is Record<string, unknown> {
  return typeof nilai === "object" && nilai !== null && !Array.isArray(nilai);
}

function adalahArray(nilai: unknown): nilai is unknown[] {
  return Array.isArray(nilai);
}

function teksTerisi(nilai: unknown): nilai is string {
  return typeof nilai === "string" && nilai.trim().length > 0;
}

/** Nama jenis nilai untuk pesan kesalahan, dalam istilah yang berguna bagi penulis. */
function jenis(nilai: unknown): string {
  if (nilai === null) return "null";
  if (Array.isArray(nilai)) return "array";
  if (typeof nilai === "string") return "teks";
  if (typeof nilai === "number") return "angka";
  return typeof nilai;
}

// --- Pemeriksa kecil yang dipakai berulang ------------------------------------

/** Memeriksa objek `{ id, en }`. Keduanya wajib terisi — itu inti keputusan skema. */
function periksaTeksDwibahasa(
  nilai: unknown,
  lokasi: string,
  tambah: TambahMasalah,
): void {
  if (!adalahObjek(nilai)) {
    tambah(lokasi, `harus objek { id, en }, bukan ${jenis(nilai)}`);
    return;
  }
  if (!teksTerisi(nilai.id)) {
    tambah(`${lokasi}.id`, "teks bahasa Indonesia kosong atau tidak ada");
  }
  if (!teksTerisi(nilai.en)) {
    tambah(`${lokasi}.en`, "teks bahasa English kosong atau tidak ada");
  }
}

// --- Satu Kuis -----------------------------------------------------------------

function periksaKuis(kuis: unknown, lokasi: string, tambah: TambahMasalah): void {
  if (!adalahObjek(kuis)) {
    tambah(lokasi, `harus objek, bukan ${jenis(kuis)}`);
    return;
  }

  periksaTeksDwibahasa(kuis.skenario, `${lokasi}.skenario`, tambah);
  periksaTeksDwibahasa(kuis.penjelasan, `${lokasi}.penjelasan`, tambah);

  // `kode` opsional — hanya sebagian Kuis menampilkan kode untuk ditebak outputnya.
  if (kuis.kode !== undefined && typeof kuis.kode !== "string") {
    tambah(`${lokasi}.kode`, `harus teks, bukan ${jenis(kuis.kode)}`);
  }

  if (!adalahArray(kuis.opsi) || kuis.opsi.length === 0) {
    tambah(`${lokasi}.opsi`, "harus daftar opsi yang tidak kosong");
    return;
  }

  let jumlahBenar = 0;
  kuis.opsi.forEach((opsi, indeks) => {
    const lokasiOpsi = `${lokasi}.opsi[${indeks}]`;
    if (!adalahObjek(opsi)) {
      tambah(lokasiOpsi, `harus objek, bukan ${jenis(opsi)}`);
      return;
    }
    periksaTeksDwibahasa(opsi.teks, `${lokasiOpsi}.teks`, tambah);

    if (typeof opsi.benar !== "boolean") {
      tambah(`${lokasiOpsi}.benar`, `harus true atau false, bukan ${jenis(opsi.benar)}`);
      return;
    }
    if (opsi.benar) jumlahBenar += 1;
  });

  // Dua jawaban benar menilai pemelajar dengan salah tanpa pesan apa pun. Ini justru
  // alasan gerbang ini ada — kesalahan yang tidak bisa dilihat saat belajar.
  if (jumlahBenar !== 1) {
    tambah(
      `${lokasi}.opsi`,
      `harus punya tepat satu opsi benar: true, ditemukan ${jumlahBenar}`,
    );
  }
}

// --- Satu Soal Kode ------------------------------------------------------------

function periksaSoalKode(
  soal: unknown,
  lokasi: string,
  tambah: TambahMasalah,
): void {
  if (!adalahObjek(soal)) {
    tambah(lokasi, `harus objek, bukan ${jenis(soal)}`);
    return;
  }

  periksaTeksDwibahasa(soal.skenario, `${lokasi}.skenario`, tambah);

  if (!teksTerisi(soal.fungsi)) {
    tambah(`${lokasi}.fungsi`, "nama fungsi yang dipanggil test case kosong atau tidak ada");
  }

  if (!teksTerisi(soal.solusi_referensi)) {
    tambah(`${lokasi}.solusi_referensi`, "solusi acuan kosong atau tidak ada");
  }

  if (!adalahArray(soal.test_case) || soal.test_case.length === 0) {
    tambah(`${lokasi}.test_case`, "harus daftar test case yang tidak kosong");
    return;
  }

  soal.test_case.forEach((kasus, indeks) => {
    const lokasiKasus = `${lokasi}.test_case[${indeks}]`;
    if (!adalahObjek(kasus)) {
      tambah(lokasiKasus, `harus objek, bukan ${jenis(kasus)}`);
      return;
    }
    if (!adalahArray(kasus.argumen)) {
      tambah(`${lokasiKasus}.argumen`, `harus daftar argumen, bukan ${jenis(kasus.argumen)}`);
    }
    // `diharapkan` boleh bernilai null, false, atau 0 — jadi yang diperiksa
    // keberadaan kuncinya, bukan "terisi".
    if (!("diharapkan" in kasus)) {
      tambah(`${lokasiKasus}.diharapkan`, "nilai yang diharapkan tidak ada");
    }
  });
}

/**
 * Periksa satu daftar `prasyarat` terhadap Jalur.
 *
 * Dua aturan: setiap nomor harus ada di Jalur, dan harus lebih awal daripada Topik
 * yang membutuhkannya. Dipakai oleh `periksaTopik` dan `periksaJalur` — aturannya
 * sama, hanya bentuk lokasi yang berbeda (`prasyarat[0]` versus
 * `topik[2].prasyarat[0]`), jadi lokasinya diserahkan lewat `lokasi()`.
 *
 * `nomorTopik` boleh `null` kalau nomor Topiknya sendiri belum sah; dalam hal itu
 * aturan "lebih awal" dilewati, karena tidak ada pembanding yang bisa dipercaya.
 */
function periksaPrasyarat(
  prasyarat: unknown[],
  nomorTopik: number | null,
  semuaNomor: Set<number>,
  lokasi: (indeks: number) => string,
  tambah: TambahMasalah,
): void {
  prasyarat.forEach((nomor, indeks) => {
    if (typeof nomor !== "number") return; // jenisnya sudah dilaporkan di tempat lain
    if (!semuaNomor.has(nomor)) {
      tambah(lokasi(indeks), `menunjuk Topik ${nomor} yang tidak ada di Jalur`);
    } else if (nomorTopik !== null && nomor >= nomorTopik) {
      tambah(
        lokasi(indeks),
        `menunjuk Topik ${nomor}, yang tidak lebih awal daripada Topik ${nomorTopik}`,
      );
    }
  });
}

// --- Satu berkas Topik ---------------------------------------------------------

/**
 * Periksa satu berkas Topik: bentuk, kelengkapan dua bahasa, komposisi Soal, dan
 * keselarasan dengan Jalur.
 */
export function periksaTopik(nilai: unknown, konteks: KonteksTopik): Masalah[] {
  const masalah: Masalah[] = [];
  const tambah: TambahMasalah = (lokasi, pesan) =>
    masalah.push({ berkas: konteks.berkas, lokasi, pesan });

  if (!adalahObjek(nilai)) {
    tambah("", `isi berkas harus objek, bukan ${jenis(nilai)}`);
    return masalah;
  }

  // Field wajib di akar. `prasyarat` boleh kosong (Topik pertama), tetapi harus ada.
  if (typeof nilai.nomor !== "number" || !Number.isInteger(nilai.nomor)) {
    tambah("nomor", `harus bilangan bulat, bukan ${jenis(nilai.nomor)}`);
  }
  if (!teksTerisi(nilai.slug)) {
    tambah("slug", "alamat halaman kosong atau tidak ada");
  }
  periksaTeksDwibahasa(nilai.judul, "judul", tambah);
  periksaTeksDwibahasa(nilai.materi, "materi", tambah);

  if (!adalahArray(nilai.prasyarat)) {
    tambah("prasyarat", `harus daftar nomor Topik, bukan ${jenis(nilai.prasyarat)}`);
  } else {
    nilai.prasyarat.forEach((nomor, indeks) => {
      if (typeof nomor !== "number" || !Number.isInteger(nomor)) {
        tambah(`prasyarat[${indeks}]`, `harus nomor Topik, bukan ${jenis(nomor)}`);
      }
    });
  }

  if (!adalahArray(nilai.soal)) {
    tambah("soal", `harus daftar Soal, bukan ${jenis(nilai.soal)}`);
    return masalah;
  }

  // Komposisi: tepat 5 Kuis dan 1 Soal Kode.
  const kuis: { nilai: unknown; indeks: number }[] = [];
  const soalKode: { nilai: unknown; indeks: number }[] = [];

  nilai.soal.forEach((soal, indeks) => {
    const lokasi = `soal[${indeks}]`;
    if (!adalahObjek(soal)) {
      tambah(lokasi, `harus objek, bukan ${jenis(soal)}`);
      return;
    }
    if (soal.tipe === "kuis") kuis.push({ nilai: soal, indeks });
    else if (soal.tipe === "soal-kode") soalKode.push({ nilai: soal, indeks });
    else tambah(`${lokasi}.tipe`, `harus "kuis" atau "soal-kode", bukan ${jenis(soal.tipe)}`);
  });

  if (kuis.length !== JUMLAH_KUIS) {
    tambah("soal", `harus punya ${JUMLAH_KUIS} Kuis, ditemukan ${kuis.length}`);
  }
  if (soalKode.length !== JUMLAH_SOAL_KODE) {
    tambah("soal", `harus punya ${JUMLAH_SOAL_KODE} Soal Kode, ditemukan ${soalKode.length}`);
  }

  kuis.forEach(({ nilai: soal, indeks }) =>
    periksaKuis(soal, `soal[${indeks}]`, tambah),
  );
  soalKode.forEach(({ nilai: soal, indeks }) =>
    periksaSoalKode(soal, `soal[${indeks}]`, tambah),
  );

  // Keselarasan dengan Jalur. Nomor, slug, judul, dan prasyarat juga hidup di
  // `jalur.yaml`; dua salinan itu tidak boleh berbeda, kalau tidak sidebar dan
  // halaman Topik akan menyebut hal yang berbeda. ADR-0008 menjanjikan keempatnya
  // dijaga, jadi keempatnya diperiksa.
  if (teksTerisi(nilai.slug)) {
    const baris = konteks.jalur.find((t) => t.slug === nilai.slug);
    if (baris === undefined) {
      tambah("slug", `slug "${nilai.slug}" tidak ada di content/jalur.yaml`);
    } else {
      if (nilai.nomor !== baris.nomor) {
        tambah(
          "nomor",
          `nomor ${String(nilai.nomor)} berbeda dengan ${String(baris.nomor)} di content/jalur.yaml`,
        );
      }
      if (adalahArray(nilai.prasyarat) && !daftarSama(nilai.prasyarat, baris.prasyarat)) {
        tambah(
          "prasyarat",
          `[${nilai.prasyarat.join(", ")}] berbeda dengan [${baris.prasyarat.join(", ")}] di content/jalur.yaml`,
        );
      }
      if (adalahObjek(nilai.judul) && !judulSama(nilai.judul, baris.judul)) {
        tambah(
          "judul",
          "berbeda dengan content/jalur.yaml — sidebar dan halaman Topik akan " +
            "menyebut judul yang berbeda",
        );
      }
    }
  }

  // `prasyarat` menunjuk nomor yang ada dan lebih kecil. Dipakai untuk menjaga Jalur
  // tetap konsisten kalau urutan Topik diubah.
  if (adalahArray(nilai.prasyarat)) {
    periksaPrasyarat(
      nilai.prasyarat,
      typeof nilai.nomor === "number" ? nilai.nomor : null,
      new Set(konteks.jalur.map((t) => t.nomor)),
      (indeks) => `prasyarat[${indeks}]`,
      tambah,
    );
  }

  return masalah;
}

// --- Berkas Jalur --------------------------------------------------------------

/** Periksa `content/jalur.yaml`: urutan tanpa lubang, tanpa duplikat, prasyarat sah. */
export function periksaJalur(nilai: unknown, berkas: string): Masalah[] {
  const masalah: Masalah[] = [];
  const tambah: TambahMasalah = (lokasi, pesan) =>
    masalah.push({ berkas, lokasi, pesan });

  if (!adalahObjek(nilai)) {
    tambah("", `isi berkas harus objek, bukan ${jenis(nilai)}`);
    return masalah;
  }
  if (!adalahArray(nilai.topik) || nilai.topik.length === 0) {
    tambah("topik", "harus daftar Topik yang tidak kosong");
    return masalah;
  }

  const nomorTerlihat = new Map<number, number>();
  const slugTerlihat = new Map<string, number>();

  nilai.topik.forEach((baris, indeks) => {
    const lokasi = `topik[${indeks}]`;
    if (!adalahObjek(baris)) {
      tambah(lokasi, `harus objek, bukan ${jenis(baris)}`);
      return;
    }

    if (typeof baris.nomor !== "number" || !Number.isInteger(baris.nomor)) {
      tambah(`${lokasi}.nomor`, `harus bilangan bulat, bukan ${jenis(baris.nomor)}`);
    } else if (nomorTerlihat.has(baris.nomor)) {
      tambah(
        `${lokasi}.nomor`,
        `nomor ${baris.nomor} dipakai dua kali (juga di topik[${String(nomorTerlihat.get(baris.nomor))}])`,
      );
    } else {
      nomorTerlihat.set(baris.nomor, indeks);
    }

    if (!teksTerisi(baris.slug)) {
      tambah(`${lokasi}.slug`, "alamat halaman kosong atau tidak ada");
    } else if (slugTerlihat.has(baris.slug)) {
      tambah(
        `${lokasi}.slug`,
        `slug "${baris.slug}" dipakai dua kali (juga di topik[${String(slugTerlihat.get(baris.slug))}])`,
      );
    } else {
      slugTerlihat.set(baris.slug, indeks);
    }

    periksaTeksDwibahasa(baris.judul, `${lokasi}.judul`, tambah);

    if (!adalahArray(baris.prasyarat)) {
      tambah(`${lokasi}.prasyarat`, `harus daftar nomor Topik, bukan ${jenis(baris.prasyarat)}`);
    }
  });

  // Urutan tanpa lubang: himpunan nomor harus persis 1..N.
  const nomor = [...nomorTerlihat.keys()].sort((a, b) => a - b);
  const diharapkan = nomor.map((_, indeks) => indeks + 1);
  if (nomor.length > 0 && !daftarSama(nomor, diharapkan)) {
    const hilang = diharapkan.filter((n) => !nomorTerlihat.has(n));
    tambah(
      "topik",
      hilang.length > 0
        ? `nomor Topik tidak berurutan tanpa lubang; nomor yang hilang: ${hilang.join(", ")}`
        : `nomor Topik harus mulai dari 1, ditemukan mulai dari ${String(nomor[0])}`,
    );
  }

  // Prasyarat harus menunjuk nomor yang ada di Jalur dan lebih kecil.
  const semuaNomor = new Set(nomor);
  nilai.topik.forEach((baris, indeks) => {
    if (!adalahObjek(baris) || !adalahArray(baris.prasyarat)) return;
    periksaPrasyarat(
      baris.prasyarat,
      typeof baris.nomor === "number" ? baris.nomor : null,
      semuaNomor,
      (posisi) => `topik[${indeks}].prasyarat[${posisi}]`,
      tambah,
    );
  });

  return masalah;
}

/** Bandingkan dua daftar angka tanpa mempedulikan urutan. */
function daftarSama(a: unknown[], b: number[]): boolean {
  const kiri = a.filter((x): x is number => typeof x === "number");
  if (kiri.length !== b.length) return false;
  const urutKiri = [...kiri].sort((x, y) => x - y);
  const urutKanan = [...b].sort((x, y) => x - y);
  return urutKiri.every((x, i) => x === urutKanan[i]);
}

/** Bandingkan dua judul dwibahasa. Keduanya harus sepakat di kedua bahasa. */
function judulSama(a: Record<string, unknown>, b: TeksDwibahasa): boolean {
  return a.id === b.id && a.en === b.en;
}
