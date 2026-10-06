/**
 * Gerbang: solusi referensi setiap Soal Kode harus lulus test case-nya sendiri.
 *
 * Dijalankan dengan `npm run verifikasi-soal`. Ia membaca `content/`, menjalankan
 * `solusi_referensi` tiap Soal Kode terhadap test case-nya **di kontainer yang sama
 * dengan yang dipakai situs**, lalu gagal kalau ada yang tidak lulus.
 *
 * **Kenapa perintah terpisah, bukan bagian `next build`.** Issue #1 menulis gerbang
 * ini "dijalankan di container yang sama dengan yang dipakai situs", dan
 * `content/README.md` menambahkan bahwa ia "menjadi bagian gerbang ini" (gerbang
 * konten di `next.config.ts`). Keputusan pemilik ticket ini memisahkannya, dengan
 * alasan yang nyata: gerbang konten berjalan pada **setiap** `next dev` dan
 * `next build`, dan menjalankan Docker di sana berarti setiap pengetikan ulang
 * berkas Materi menuntut Docker hidup dan menambah detik ke setiap start. Pemisahan
 * ini dicatat di ADR-0022.
 *
 * Konsekuensinya jujur: ini satu langkah yang bisa terlupa. Repo ini belum punya CI,
 * jadi pengingatnya ada di `content/README.md` dan di ADR — bukan ditegakkan mesin.
 *
 * **Argumen Docker tidak ditulis di sini.** Ia dibaca dari `runner/perintah-docker.json`,
 * sumber yang sama dengan backend Rust. Dua salinan batas keamanan bisa menyimpang
 * tanpa ketahuan, dan yang menyimpang adalah batas — jadi gejalanya bukan error,
 * melainkan batas yang diam-diam tidak berlaku.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { muatKonten } from "../src/lib/konten/muat.ts";
import type { TestCase } from "../src/lib/eksekusi/tipe.ts";
import {
  formatMasalah,
  periksaHasil,
  soalKodeSemua,
  type MasalahSoal,
} from "../src/lib/konten/gerbang-soal.ts";

/** Akar repo, dihitung dari berkas ini: `frontend/scripts/` → dua tingkat naik. */
const AKAR_REPO = path.resolve(import.meta.dirname, "..", "..");

/** Berkas template argumen Docker, dipakai bersama backend Rust. */
const BERKAS_PERINTAH = path.join(AKAR_REPO, "runner", "perintah-docker.json");

/** Image runner. Bisa diganti lewat environment, sama seperti backend. */
const IMAGE = process.env.RUNNER_IMAGE ?? "dsa-runner:lokal";

/** Badan pekerjaan yang dikirim ke runner lewat stdin. */
interface Pekerjaan {
  kode: string;
  fungsi: string;
  test_case: TestCase[];
}

/** Balasan runner, bentuknya sama dengan yang dibaca backend. */
interface BalasanRunner {
  status: string;
  kasus: { indeks: number; lulus: boolean; diharapkan: unknown; hasil: unknown; galat: string | null }[];
  keluaran: string;
  pesan: string | null;
}

/** Baca template argumen dan ganti placeholdernya. */
function argumenDocker(nama: string): string[] {
  const isi = JSON.parse(readFileSync(BERKAS_PERINTAH, "utf8")) as { args: string[] };
  return isi.args.map((arg) =>
    arg === "{nama}" ? nama : arg === "{image}" ? IMAGE : arg,
  );
}

/** Nama kontainer yang unik per pemanggilan. */
function namaKontainer(urut: number): string {
  return `dsa-gerbang-${String(process.pid)}-${String(urut)}`;
}

/**
 * Jalankan satu pekerjaan di kontainer, dan kembalikan balasan runner.
 *
 * Batas waktunya di sini lebih longgar daripada 5 detik milik situs: yang dijalankan
 * adalah solusi referensi yang sudah diketahui benar, dan gerbang ini berjalan sekali
 * saat build, bukan melayani permintaan. Batas 60 detik ada supaya gerbang yang
 * tersangkut tidak menggantung selamanya.
 */
function jalankanDiKontainer(pekerjaan: Pekerjaan, urut: number): BalasanRunner {
  const nama = namaKontainer(urut);
  const hasil = spawnSync("docker", argumenDocker(nama), {
    input: JSON.stringify(pekerjaan),
    encoding: "utf8",
    timeout: 60_000,
  });

  if (hasil.error) {
    throw new Error(
      `tidak bisa menjalankan Docker: ${hasil.error.message}\n` +
        `Gerbang ini butuh Docker hidup dan image "${IMAGE}" sudah dibangun ` +
        `(lihat runner/README.md).`,
    );
  }

  const keluaran = (hasil.stdout ?? "").trim();
  if (keluaran.length === 0) {
    throw new Error(
      `runner tidak mengeluarkan apa pun (kode keluar ${String(hasil.status)}).\n` +
        `Kemungkinan: image "${IMAGE}" belum dibangun, atau kodenya kehabisan memori.\n` +
        `stderr: ${(hasil.stderr ?? "").trim().slice(0, 500)}`,
    );
  }

  return JSON.parse(keluaran) as BalasanRunner;
}

/**
 * Jalankan gerbang. Mengembalikan daftar masalah; kosong berarti semuanya lulus.
 *
 * Dipisah dari `main` supaya bisa dipanggil uji tanpa memanggil `process.exit`.
 */
export function verifikasi(): MasalahSoal[] {
  const konten = muatKonten();
  const daftar = soalKodeSemua(konten.topik);

  if (daftar.length === 0) {
    console.log("Tidak ada Soal Kode di content/ — tidak ada yang diperiksa.");
    return [];
  }

  const masalah: MasalahSoal[] = [];

  daftar.forEach((item, urut) => {
    const lokasi = { topik: item.topik, indeksSoal: item.indeksSoal, fungsi: item.soal.fungsi };

    const balasan = jalankanDiKontainer(
      {
        kode: item.soal.solusi_referensi,
        fungsi: item.soal.fungsi,
        test_case: item.soal.test_case,
      },
      urut,
    );

    const masalahItem = periksaHasil(lokasi, {
      status: balasan.status as never,
      kasus: balasan.kasus as never,
      keluaran: balasan.keluaran,
      pesan: balasan.pesan,
    });

    if (masalahItem.length === 0) {
      console.log(
        `  ✓ ${item.topik} → soal[${String(item.indeksSoal)}]: ` +
          `solusi referensi lulus ${String(balasan.kasus.length)} test case`,
      );
    }
    masalah.push(...masalahItem);
  });

  return masalah;
}

function main(): void {
  console.log("Gerbang Soal Kode: menjalankan solusi referensi terhadap test case-nya…");
  console.log(`  image: ${IMAGE}`);

  let masalah: MasalahSoal[];
  try {
    masalah = verifikasi();
  } catch (galat) {
    console.error("");
    console.error(galat instanceof Error ? galat.message : String(galat));
    console.error("");
    process.exit(1);
  }

  if (masalah.length > 0) {
    console.error("");
    console.error(formatMasalah(masalah));
    console.error("");
    console.error(
      "Perbaiki test case atau solusi referensinya di content/ lalu jalankan ulang.",
    );
    console.error("");
    process.exit(1);
  }

  console.log("");
  console.log("Semua solusi referensi lulus test case-nya sendiri.");
}

// Hanya jalankan `main` kalau berkas ini dipanggil langsung, bukan diimpor uji.
if (process.argv[1] !== undefined && import.meta.filename === path.resolve(process.argv[1])) {
  main();
}
