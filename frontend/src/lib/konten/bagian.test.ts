/**
 * Uji ekstraksi bagian Materi.
 *
 * Yang diuji adalah perilaku yang terlihat dari luar: diberikan Markdown, bagian
 * apa yang ditemukan — tingkat, teks, nomor baris, dan id anchor-nya. Modulnya murni
 * (tidak menyentuh berkas, DOM, atau React), jadi cukup teks biasa.
 *
 * Nomor baris diuji karena ia adalah **kunci sambungan** antara daftar isi dan
 * heading yang dirender: `materi-markdown.tsx` mencocokkan heading berdasarkan
 * `node.position.start.line`. Kalau nomor baris di sini meleset satu saja, tautan
 * daftar isi menunjuk ke tempat yang salah tanpa error apa pun.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { daftarBagian } from "./bagian.ts";

test("mengambil judul berurutan beserta tingkat dan nomor baris", () => {
  const markdown = [
    "Paragraf pembuka.", // 1
    "", // 2
    "## Bagian Satu", // 3
    "", // 4
    "Teks isi.", // 5
    "", // 6
    "### Anak Bagian", // 7
    "", // 8
    "## Bagian Dua", // 9
  ].join("\n");

  const bagian = daftarBagian(markdown);

  assert.deepEqual(
    bagian.map((b) => [b.tingkat, b.teks, b.baris]),
    [
      [2, "Bagian Satu", 3],
      [3, "Anak Bagian", 7],
      [2, "Bagian Dua", 9],
    ],
  );
});

test("id adalah slug huruf kecil yang dipisah tanda hubung", () => {
  const bagian = daftarBagian("## Kenapa Queue tidak sesederhana itu\n");

  assert.equal(bagian.length, 1);
  assert.equal(bagian[0].id, "kenapa-queue-tidak-sesederhana-itu");
});

test("judul kembar diberi id yang berbeda dan tetap stabil", () => {
  const bagian = daftarBagian(
    ["## Bagian Satu", "", "## Bagian Satu", "", "## Bagian Satu"].join("\n"),
  );

  assert.deepEqual(
    bagian.map((b) => b.id),
    ["bagian-satu", "bagian-satu-1", "bagian-satu-2"],
  );
});

test("judul di dalam blok kode tidak dianggap bagian", () => {
  const markdown = [
    "## Bagian Nyata", // 1
    "", // 2
    "```python", // 3
    "## ini komentar, bukan judul", // 4
    "```", // 5
    "", // 6
    "## Bagian Lain", // 7
  ].join("\n");

  const bagian = daftarBagian(markdown);

  assert.deepEqual(
    bagian.map((b) => b.teks),
    ["Bagian Nyata", "Bagian Lain"],
  );
});

test("penanda format di dalam judul dibersihkan dari teks", () => {
  const bagian = daftarBagian("## Kompleksitas `O(1)` dan **O(n)**\n");

  assert.equal(bagian[0].teks, "Kompleksitas O(1) dan O(n)");
  assert.equal(bagian[0].id, "kompleksitas-o-1-dan-o-n");
});

test("karakter non-ASCII diturunkan menjadi ASCII yang bisa dipakai di URL", () => {
  const bagian = daftarBagian("## Analisis O(n²) dan café\n");

  assert.equal(bagian[0].id, "analisis-o-n2-dan-cafe");
});

test("judul yang seluruhnya tanda baca tetap mendapat id yang sah", () => {
  const bagian = daftarBagian("## ---\n");

  assert.equal(bagian.length, 1);
  assert.equal(bagian[0].id, "bagian");
  assert.equal(bagian[0].teks, "---");
});

test("Markdown tanpa judul menghasilkan daftar kosong", () => {
  assert.deepEqual(daftarBagian("Hanya paragraf biasa.\n\nDan satu lagi.\n"), []);
});

test("setiap id dalam satu Materi unik", () => {
  const markdown = [
    "## Sama",
    "### Sama",
    "## Sama",
    "## sama",
    "## Sama-1",
  ].join("\n\n");

  const id = daftarBagian(markdown).map((b) => b.id);

  assert.equal(new Set(id).size, id.length, `id tidak unik: ${id.join(", ")}`);
});

test("judul berisi kode sebaris tidak membawa kembali tanda backtick", () => {
  const bagian = daftarBagian("### Cara `push` dan `pop` bekerja\n");

  assert.equal(bagian[0].teks, "Cara push dan pop bekerja");
  assert.equal(bagian[0].tingkat, 3);
});
