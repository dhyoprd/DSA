/**
 * Uji penyusunan indeks pencarian dari Materi.
 *
 * Yang diuji adalah perilaku yang terlihat dari luar: diberikan sebuah Topik dan
 * bahasa, entri apa yang dihasilkan — judul bagian, anchor, dan teks badannya.
 *
 * Dua hal diuji dengan sengaja karena keduanya adalah **kunci sambungan**:
 *
 * 1. `bagianId` harus sama persis dengan `id` yang diberikan `daftarBagian` dan
 *    dipasang `materi-markdown.tsx` pada heading. Kalau berbeda, tautan hasil
 *    pencarian menunjuk ke tempat yang salah tanpa error apa pun.
 * 2. `teks` harus teks polos — tanpa penanda Markdown — karena ia yang dicari dan
 *    dipotong menjadi cuplikan. Membiarkan `**LIFO**` berarti cuplikannya ikut
 *    membawa tanda bintang.
 *
 * Modulnya murni, jadi cukup nilai biasa; tidak ada berkas, DOM, atau React.
 */

import test from "node:test";
import assert from "node:assert/strict";

import type { Topik } from "../konten/tipe.ts";
import { daftarBagian } from "../konten/bagian.ts";
import { susunIndeks, teksPolos } from "./indeks.ts";

/** Topik contoh dengan Materi yang bisa diganti. Field lain diisi agar tipe utuh. */
function topikContoh(materi: string, judul: string = "Stack & Queue"): Topik {
  return {
    nomor: 4,
    slug: "stack",
    judul: { id: judul, en: judul },
    prasyarat: [3],
    materi: { id: materi, en: materi },
    kompleksitas: [],
    istilah: [],
    soal: [],
  };
}

test("memecah Materi menjadi satu entri per judul", () => {
  const materi = [
    "Paragraf pembuka tanpa judul.", // 1
    "", // 2
    "## Bagian Satu", // 3
    "", // 4
    "Teks bagian satu.", // 5
    "", // 6
    "### Anak Bagian", // 7
    "", // 8
    "Teks anak bagian.", // 9
  ].join("\n");

  const entri = susunIndeks([topikContoh(materi)], "id");

  assert.deepEqual(
    entri.map((e) => [e.bagianJudul, e.bagianId]),
    [
      ["Bagian Satu", "bagian-satu"],
      ["Anak Bagian", "anak-bagian"],
    ],
  );
});

test("teks badan tidak memuat judulnya sendiri", () => {
  const materi = ["## Bagian Satu", "", "Teks bagian satu."].join("\n");

  const entri = susunIndeks([topikContoh(materi)], "id");

  assert.equal(entri.length, 1);
  assert.equal(entri[0].teks, "Teks bagian satu.");
  assert.ok(!entri[0].teks.includes("Bagian Satu"));
});

test("teks badan berhenti di judul berikutnya", () => {
  const materi = [
    "## Satu",
    "",
    "Isi satu.",
    "",
    "## Dua",
    "",
    "Isi dua.",
  ].join("\n");

  const entri = susunIndeks([topikContoh(materi)], "id");

  assert.equal(entri[0].teks, "Isi satu.");
  assert.equal(entri[1].teks, "Isi dua.");
});

test("penanda Markdown dibuang dari teks badan", () => {
  const materi = [
    "## Judul",
    "",
    "Stack memakai aturan **LIFO** — *Last In, First Out*.",
    "",
    "- `push` menaruh nilai.",
    "- `pop` mengambilnya.",
  ].join("\n");

  const entri = susunIndeks([topikContoh(materi)], "id");

  assert.ok(!entri[0].teks.includes("**"), "tanda tebal masih ada");
  assert.ok(!entri[0].teks.includes("`"), "tanda kode masih ada");
  assert.ok(entri[0].teks.includes("LIFO"));
  assert.ok(entri[0].teks.includes("push"));
});

test("teksPolos memisahkan butir daftar, bukan merangkainya", () => {
  // Tanpa pemisah, `toString` menghasilkan "push menaruh nilai.pop mengambilnya."
  // Butir kedua jadi tidak bisa dicari dan cuplikannya sulit dibaca.
  const teks = teksPolos(["- `push` menaruh nilai.", "- `pop` mengambilnya."].join("\n"));

  assert.ok(teks.includes("push menaruh nilai"), `teks: ${teks}`);
  assert.ok(teks.includes("pop mengambilnya"), `teks: ${teks}`);
  assert.ok(!teks.includes("nilai.pop"), `butir menempel: ${teks}`);
});

test("teksPolos memisahkan sel tabel", () => {
  const teks = teksPolos(
    [
      "| Operasi | Waktu |",
      "| --- | --- |",
      "| Tambah elemen | O(1) |",
      "| Cari nilai | O(n) |",
    ].join("\n"),
  );

  assert.ok(teks.includes("Tambah elemen"), `teks: ${teks}`);
  assert.ok(teks.includes("O(1)"), `teks: ${teks}`);
  // Sel tidak boleh menempel ke sel tetangganya.
  assert.ok(!teks.includes("elemenO(1)"), `sel menempel: ${teks}`);
});

test("teksPolos menggabungkan blok dengan baris baru", () => {
  const teks = teksPolos(["Paragraf satu.", "", "Paragraf dua."].join("\n"));

  assert.equal(teks, "Paragraf satu.\nParagraf dua.");
});

test("teksPolos membuang garis pemisah dan blok kosong", () => {
  const teks = teksPolos(["Paragraf.", "", "---", "", "Lagi."].join("\n"));

  assert.equal(teks, "Paragraf.\nLagi.");
});

test("memakai Materi bahasa yang diminta", () => {
  const topik: Topik = {
    ...topikContoh(""),
    materi: {
      id: "## Judul Indonesia\n\nIsi Indonesia.",
      en: "## English Title\n\nEnglish body.",
    },
  };

  const id = susunIndeks([topik], "id");
  const en = susunIndeks([topik], "en");

  assert.equal(id[0].bagianJudul, "Judul Indonesia");
  assert.equal(id[0].bagianId, "judul-indonesia");
  assert.equal(en[0].bagianJudul, "English Title");
  assert.equal(en[0].bagianId, "english-title");
});

test("entri membawa Topik asalnya, untuk menautkan hasil", () => {
  const materi = "## Bagian\n\nIsi.";
  const entri = susunIndeks([topikContoh(materi, "Stack & Queue")], "id");

  assert.equal(entri[0].topikSlug, "stack");
  assert.equal(entri[0].topikNomor, 4);
  assert.equal(entri[0].topikJudul, "Stack & Queue");
});

test("anchor cocok persis dengan id yang dipakai daftar isi", () => {
  // Judul kembar adalah kasus yang paling mudah membuat anchor menyimpang:
  // `daftarBagian` memberi akhiran angka pada kemunculan kedua.
  const materi = ["## Sama", "", "Satu.", "", "## Sama", "", "Dua."].join("\n");

  const dariDaftar = daftarBagian(materi).map((b) => b.id);
  const dariIndeks = susunIndeks([topikContoh(materi)], "id").map((e) => e.bagianId);

  assert.deepEqual(dariIndeks, dariDaftar);
  assert.deepEqual(dariIndeks, ["sama", "sama-1"]);
});

test("Materi tanpa judul tetap punya satu entri yang bisa ditautkan ke Topiknya", () => {
  // Tanpa judul tidak ada anchor bagian. Entri tetap dibuat supaya isinya bisa
  // ditemukan; tautannya nanti menunjuk ke halaman Topik tanpa `#`.
  const entri = susunIndeks([topikContoh("Hanya paragraf biasa tanpa judul.")], "id");

  assert.equal(entri.length, 1);
  assert.equal(entri[0].bagianId, "");
  assert.equal(entri[0].bagianJudul, "Stack & Queue");
  assert.equal(entri[0].teks, "Hanya paragraf biasa tanpa judul.");
});

test("beberapa Topik digabung urut seperti masukannya", () => {
  const a: Topik = { ...topikContoh("## A\n\nIsi A.", "A"), nomor: 1, slug: "a" };
  const b: Topik = { ...topikContoh("## B\n\nIsi B.", "B"), nomor: 2, slug: "b" };

  const entri = susunIndeks([a, b], "id");

  assert.deepEqual(
    entri.map((e) => e.topikSlug),
    ["a", "b"],
  );
});
