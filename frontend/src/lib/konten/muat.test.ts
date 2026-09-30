/**
 * Uji pemuatan konten sungguhan dari `content/`.
 *
 * Berbeda dari `periksa.test.ts` yang menguji aturan dengan objek buatan, uji ini
 * membaca berkas YAML yang benar-benar ada di repo. Gunanya dua:
 *
 * 1. Membuktikan rantai ujung ke ujung bekerja — YAML di git bisa dibaca, divalidasi,
 *    dan menjadi objek yang siap dirender.
 * 2. Menjaga konten sungguhan tetap sah. Kalau seseorang menambah Kuis lalu salah
 *    menghitung, uji ini gagal sebelum build sempat berjalan.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { GalatKonten, muatKonten } from "./muat.ts";

const AKAR_REPO = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const DIREKTORI_KONTEN = path.join(AKAR_REPO, "content");

// --- Konten sungguhan ----------------------------------------------------------

test("konten di content/ lolos gerbang validasi", () => {
  const konten = muatKonten(DIREKTORI_KONTEN);
  assert.ok(konten.jalur.length > 0, "Jalur harus punya Topik");
  assert.ok(konten.topik.length > 0, "harus ada Topik yang sudah ditulis");
});

test("Jalur berisi 12 Topik bernomor 1 sampai 12 tanpa lubang", () => {
  const { jalur } = muatKonten(DIREKTORI_KONTEN);
  assert.equal(jalur.length, 12);
  assert.deepEqual(
    jalur.map((t) => t.nomor).sort((a, b) => a - b),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  );
});

test("Topik Stack adalah nomor 4 dengan prasyarat [3]", () => {
  const { topik } = muatKonten(DIREKTORI_KONTEN);
  const stack = topik.find((t) => t.slug === "stack");
  assert.ok(stack, "Topik Stack harus ada");
  assert.equal(stack.nomor, 4);
  assert.deepEqual(stack.prasyarat, [3]);
});

test("Topik Stack punya 5 Kuis dan 1 Soal Kode", () => {
  const { topik } = muatKonten(DIREKTORI_KONTEN);
  const stack = topik.find((t) => t.slug === "stack");
  assert.ok(stack);
  assert.equal(stack.soal.filter((s) => s.tipe === "kuis").length, 5);
  assert.equal(stack.soal.filter((s) => s.tipe === "soal-kode").length, 1);
});

test("setiap Kuis punya tepat satu jawaban benar", () => {
  const { topik } = muatKonten(DIREKTORI_KONTEN);
  for (const t of topik) {
    for (const soal of t.soal) {
      if (soal.tipe !== "kuis") continue;
      const jumlah = soal.opsi.filter((o) => o.benar).length;
      assert.equal(jumlah, 1, `${t.slug}: Kuis punya ${jumlah} jawaban benar`);
    }
  }
});

test("Materi Stack terisi di kedua bahasa", () => {
  const { topik } = muatKonten(DIREKTORI_KONTEN);
  const stack = topik.find((t) => t.slug === "stack");
  assert.ok(stack);
  assert.ok(stack.materi.id.length > 100, "Materi Indonesia terlalu pendek");
  assert.ok(stack.materi.en.length > 100, "Materi English terlalu pendek");
});

test("Topik yang punya berkas muncul di daftar topik", () => {
  const konten = muatKonten(DIREKTORI_KONTEN);
  assert.ok(konten.topik.some((t) => t.slug === "stack"));
});

// --- Konten rusak: gerbang harus menolak ---------------------------------------

/** Tulis berkas Topik ke direktori sementara bersama salinan Jalur yang sah. */
function denganKontenSementara(
  berkasTopik: Record<string, string>,
  jalankan: (direktori: string) => void,
): void {
  const direktori = mkdtempSync(path.join(tmpdir(), "dsa-konten-"));
  try {
    const jalurSah = `topik:
  - { nomor: 1, slug: big-o, judul: { id: "Big-O", en: "Big-O" }, prasyarat: [] }
  - { nomor: 4, slug: stack, judul: { id: "Stack", en: "Stack" }, prasyarat: [1] }
`;
    writeFileSync(path.join(direktori, "jalur.yaml"), jalurSah, "utf8");
    for (const [nama, isi] of Object.entries(berkasTopik)) {
      writeFileSync(path.join(direktori, nama), isi, "utf8");
    }
    jalankan(direktori);
  } finally {
    rmSync(direktori, { recursive: true, force: true });
  }
}

test("build gagal kalau YAML tidak bisa diurai", () => {
  denganKontenSementara({ "stack.yaml": "nomor: 4\nsoal: [1, 2\n" }, (direktori) => {
    assert.throws(
      () => muatKonten(direktori),
      (galat: unknown) => {
        assert.ok(galat instanceof GalatKonten);
        assert.match(galat.message, /stack\.yaml/);
        assert.match(galat.message, /baris/);
        return true;
      },
    );
  });
});

test("build gagal kalau Kuis bukan 5", () => {
  const topik = `nomor: 4
slug: stack
judul: { id: "Stack", en: "Stack" }
prasyarat: [1]
materi: { id: "Materi", en: "Material" }
soal:
  - tipe: soal-kode
    skenario: { id: "S", en: "S" }
    fungsi: solve
    test_case:
      - argumen: [[1]]
        diharapkan: 1
    solusi_referensi: "def solve(x): return x"
`;
  denganKontenSementara({ "stack.yaml": topik }, (direktori) => {
    assert.throws(
      () => muatKonten(direktori),
      (galat: unknown) => {
        assert.ok(galat instanceof GalatKonten);
        assert.match(galat.message, /5 Kuis/);
        return true;
      },
    );
  });
});

test("build gagal kalau ada Kuis dengan dua jawaban benar", () => {
  const opsi = (benar: boolean) => `      - teks: { id: "a", en: "a" }\n        benar: ${String(benar)}\n`;
  const kuis = (duaBenar: boolean) => `  - tipe: kuis
    skenario: { id: "S", en: "S" }
    opsi:
${opsi(duaBenar)}${opsi(duaBenar)}${opsi(false)}${opsi(false)}    penjelasan: { id: "P", en: "P" }
`;
  const topik = `nomor: 4
slug: stack
judul: { id: "Stack", en: "Stack" }
prasyarat: [1]
materi: { id: "Materi", en: "Material" }
soal:
${kuis(true)}${kuis(false)}${kuis(false)}${kuis(false)}${kuis(false)}  - tipe: soal-kode
    skenario: { id: "S", en: "S" }
    fungsi: solve
    test_case:
      - argumen: [[1]]
        diharapkan: 1
    solusi_referensi: "def solve(x): return x"
`;
  denganKontenSementara({ "stack.yaml": topik }, (direktori) => {
    assert.throws(
      () => muatKonten(direktori),
      (galat: unknown) => {
        assert.ok(galat instanceof GalatKonten);
        assert.match(galat.message, /tepat satu/);
        return true;
      },
    );
  });
});

test("build gagal kalau Materi tidak lengkap dua bahasa", () => {
  const topik = `nomor: 4
slug: stack
judul: { id: "Stack", en: "Stack" }
prasyarat: [1]
materi: { id: "Hanya Indonesia" }
soal: []
`;
  denganKontenSementara({ "stack.yaml": topik }, (direktori) => {
    assert.throws(
      () => muatKonten(direktori),
      (galat: unknown) => {
        assert.ok(galat instanceof GalatKonten);
        assert.match(galat.message, /materi\.en/);
        return true;
      },
    );
  });
});

test("build gagal kalau prasyarat menunjuk Topik yang tidak ada", () => {
  const topik = `nomor: 4
slug: stack
judul: { id: "Stack", en: "Stack" }
prasyarat: [99]
materi: { id: "Materi", en: "Material" }
soal: []
`;
  denganKontenSementara({ "stack.yaml": topik }, (direktori) => {
    assert.throws(
      () => muatKonten(direktori),
      (galat: unknown) => {
        assert.ok(galat instanceof GalatKonten);
        assert.match(galat.message, /tidak ada/);
        return true;
      },
    );
  });
});

test("pesan kegagalan menyebut berkas dan masalahnya", () => {
  const topik = `nomor: 4
slug: stack
judul: { id: "Stack", en: "Stack" }
prasyarat: [1]
materi: { id: "Hanya Indonesia" }
soal: []
`;
  denganKontenSementara({ "stack.yaml": topik }, (direktori) => {
    try {
      muatKonten(direktori);
      assert.fail("seharusnya melempar");
    } catch (galat) {
      assert.ok(galat instanceof GalatKonten);
      assert.match(galat.message, /stack\.yaml/);
      assert.match(galat.message, /materi\.en/);
    }
  });
});

test("semua masalah dikumpulkan sekaligus, bukan satu per build", () => {
  const topik = `nomor: 4
slug: stack
judul: { id: "Stack" }
prasyarat: [99]
materi: { id: "Hanya Indonesia" }
soal: []
`;
  denganKontenSementara({ "stack.yaml": topik }, (direktori) => {
    try {
      muatKonten(direktori);
      assert.fail("seharusnya melempar");
    } catch (galat) {
      assert.ok(galat instanceof GalatKonten);
      // judul.en, materi.en, prasyarat[0], dan komposisi soal — sekaligus.
      assert.ok(galat.masalah.length >= 4, `hanya ${galat.masalah.length} masalah terkumpul`);
    }
  });
});
