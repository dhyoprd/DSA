/**
 * Uji aturan gerbang "solusi referensi lulus test case-nya sendiri".
 *
 * Yang diuji di sini adalah **aturan penilaiannya**, bukan Docker-nya. Kalau aturan ini
 * salah, gerbangnya bisa meloloskan Soal yang rusak — dan itu berarti pemelajar stuck
 * pada Soal yang tidak punya jawaban benar, risiko nomor 4 di `docs/design-tree.md`.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatMasalah,
  periksaHasil,
  soalKodeSemua,
} from "./gerbang-soal.ts";
import type { SoalKode, Topik } from "./tipe.ts";
import type { HasilEksekusi, HasilKasus } from "../eksekusi/tipe.ts";

const LOKASI = { topik: "stack", indeksSoal: 5, fungsi: "proses" };

function kasus(lulus: boolean, indeks = 0): HasilKasus {
  return {
    indeks,
    argumen: [indeks],
    diharapkan: indeks,
    hasil: lulus ? indeks : -1,
    lulus,
    galat: null,
    keluaran: "",
  };
}

function hasil(status: HasilEksekusi["status"], kasusList: HasilKasus[], pesan: string | null = null): HasilEksekusi {
  return { status, kasus: kasusList, keluaran: "", pesan };
}

function soalKode(nama: string, indeks: number): SoalKode {
  return {
    tipe: "soal-kode",
    skenario: { id: nama, en: nama },
    fungsi: "proses",
    test_case: [{ argumen: [1], diharapkan: 1 }],
    solusi_referensi: "def proses(x):\n    return x",
  };
}

function topik(slug: string, soal: Topik["soal"]): Topik {
  return {
    nomor: 4,
    slug,
    judul: { id: slug, en: slug },
    prasyarat: [],
    materi: { id: "", en: "" },
    kompleksitas: [],
    istilah: [],
    soal,
  };
}

// --- soalKodeSemua -------------------------------------------------------------

test("hanya mengambil Soal bertipe soal-kode", () => {
  const daftar = soalKodeSemua([
    topik("stack", [
      {
        tipe: "kuis",
        skenario: { id: "k", en: "k" },
        opsi: [{ teks: { id: "a", en: "a" }, benar: true }],
        penjelasan: { id: "p", en: "p" },
      },
      soalKode("s", 1),
    ]),
  ]);

  assert.equal(daftar.length, 1);
  assert.equal(daftar[0].indeksSoal, 1, "indeks harus posisi aslinya, bukan urutan hasil filter");
});

test("indeks yang dilaporkan adalah posisi di dalam topik.soal", () => {
  // Indeks yang salah akan membuat pesan gerbang menunjuk Soal yang tidak bersalah.
  const daftar = soalKodeSemua([
    topik("stack", [
      { tipe: "kuis", skenario: { id: "k", en: "k" }, opsi: [{ teks: { id: "a", en: "a" }, benar: true }], penjelasan: { id: "p", en: "p" } },
      { tipe: "kuis", skenario: { id: "k", en: "k" }, opsi: [{ teks: { id: "a", en: "a" }, benar: true }], penjelasan: { id: "p", en: "p" } },
      soalKode("s", 2),
    ]),
  ]);

  assert.equal(daftar[0].indeksSoal, 2);
});

test("mengumpulkan dari beberapa Topik", () => {
  const daftar = soalKodeSemua([
    topik("stack", [soalKode("a", 0)]),
    topik("queue", [soalKode("b", 0)]),
  ]);

  assert.equal(daftar.length, 2);
  assert.deepEqual(
    daftar.map((d) => d.topik),
    ["stack", "queue"],
  );
});

// --- periksaHasil --------------------------------------------------------------

test("solusi yang lulus semua tidak menghasilkan masalah", () => {
  const masalah = periksaHasil(LOKASI, hasil("ok", [kasus(true, 0), kasus(true, 1)]));

  assert.deepEqual(masalah, []);
});

test("kasus yang gagal dilaporkan dengan nilai yang diharapkan dan dihasilkan", () => {
  // "Solusi referensi gagal" saja tidak cukup untuk memperbaiki Soalnya — penulis
  // Materi perlu tahu kasus mana, dan apa yang dihasilkan.
  const masalah = periksaHasil(LOKASI, hasil("ok", [kasus(true, 0), kasus(false, 1)]));

  assert.equal(masalah.length, 1);
  assert.ok(masalah[0].pesan.includes("test case 2"), masalah[0].pesan);
  assert.ok(masalah[0].pesan.includes("diharapkan"), masalah[0].pesan);
  assert.ok(masalah[0].pesan.includes("dihasilkan"), masalah[0].pesan);
});

test("status selain ok berarti solusi referensi tidak bisa dijalankan", () => {
  // Ini cacat Soal yang paling parah: tidak ada kode yang bisa lulus.
  const masalah = periksaHasil(LOKASI, hasil("galat-sintaks", [], "invalid syntax"));

  assert.equal(masalah.length, 1);
  assert.ok(masalah[0].pesan.includes("tidak bisa dijalankan"), masalah[0].pesan);
  assert.ok(masalah[0].pesan.includes("invalid syntax"), masalah[0].pesan);
});

test("lewat waktu juga dianggap tidak bisa dijalankan", () => {
  const masalah = periksaHasil(LOKASI, hasil("lewat-waktu", [], "lebih dari 5 detik"));

  assert.equal(masalah.length, 1);
  assert.ok(masalah[0].pesan.includes("lewat-waktu"), masalah[0].pesan);
});

test("test case kosong dianggap masalah", () => {
  // Soal tanpa test case tidak menguji apa pun, tetapi statusnya `ok` — jadi ia
  // harus ditangkap di sini, bukan lolos sebagai "tidak ada yang gagal".
  const masalah = periksaHasil(LOKASI, hasil("ok", []));

  assert.equal(masalah.length, 1);
  assert.ok(masalah[0].pesan.includes("test case kosong"), masalah[0].pesan);
});

test("beberapa kasus gagal dilaporkan semuanya", () => {
  // Penulis Materi perlu melihat semua kasus yang bermasalah sekaligus, bukan satu
  // per menjalankan gerbang.
  const masalah = periksaHasil(LOKASI, hasil("ok", [kasus(false, 0), kasus(false, 1), kasus(true, 2)]));

  assert.equal(masalah.length, 2);
});

test("lokasi masalah menyebut Topik dan indeks Soal", () => {
  const masalah = periksaHasil(LOKASI, hasil("ok", [kasus(false)]));

  assert.equal(masalah[0].topik, "stack");
  assert.equal(masalah[0].indeksSoal, 5);
  assert.equal(masalah[0].fungsi, "proses");
});

test("galat pada kasus ikut dilaporkan", () => {
  const denganGalat: HasilKasus = { ...kasus(false), galat: "IndexError: pop from empty list" };
  const masalah = periksaHasil(LOKASI, hasil("ok", [denganGalat]));

  assert.ok(masalah[0].pesan.includes("IndexError"), masalah[0].pesan);
});

// --- formatMasalah -------------------------------------------------------------

test("format menyebut Topik, indeks, dan fungsi", () => {
  const pesan = formatMasalah([
    { topik: "stack", indeksSoal: 5, fungsi: "proses", pesan: "sesuatu salah" },
  ]);

  assert.ok(pesan.includes("stack"), pesan);
  assert.ok(pesan.includes("soal[5]"), pesan);
  assert.ok(pesan.includes("proses"), pesan);
  assert.ok(pesan.includes("sesuatu salah"), pesan);
});
