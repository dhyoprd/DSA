/**
 * Uji kerangka kode awal Soal Kode.
 *
 * Yang paling penting diuji di sini: kerangka **tidak** memuat logika jawaban. Kalau
 * ia memuatnya, latihannya hilang — dan itu cacat yang tidak terlihat dari uji mana
 * pun, karena kodenya tetap "berjalan".
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { kerangkaAwal } from "./kerangka.ts";

test("kerangka memuat nama fungsi yang diberikan", () => {
  const kode = kerangkaAwal("proses");

  assert.ok(kode.includes("def proses("), kode);
});

test("kerangka memakai nama fungsi apa adanya", () => {
  // Gerbang konten yang bertanggung jawab menolak nama yang tidak sah; fungsi ini
  // tidak menambah pemeriksaan sendiri, supaya masalah konten tidak tersembunyi.
  assert.ok(kerangkaAwal("hitung_total").includes("def hitung_total("));
});

test("kerangka menerima argumen posisional apa pun", () => {
  // Test case memanggil dengan argumen posisional. `*args` selalu benar untuk bentuk
  // Soal apa pun; nama parameter yang dikarang akan salah untuk Soal berikutnya.
  assert.ok(kerangkaAwal("proses").includes("*args"));
});

test("kerangka TIDAK memuat logika jawaban", () => {
  // Ini uji yang paling penting. `solusi_referensi` Stack memakai `append`, `pop`,
  // dan `_data`; tidak satu pun boleh muncul di kerangka.
  const kode = kerangkaAwal("proses");

  for (const terlarang of ["append", "pop", "_data", "class Stack", "len("]) {
    assert.ok(
      !kode.includes(terlarang),
      `kerangka tidak boleh memuat "${terlarang}":\n${kode}`,
    );
  }
});

test("kerangka adalah Python yang sah", () => {
  // Kerangka yang tidak bisa dikompilasi akan membuat setiap eksekusi berakhir
  // sebagai galat sintaks sebelum pemelajar menulis apa pun.
  const kode = kerangkaAwal("proses");

  assert.ok(kode.endsWith("\n"), "berkas Python yang baik diakhiri baris baru");
  // Baris `def` diikuti blok yang menjorok.
  const baris = kode.split("\n");
  assert.ok(baris[0].startsWith("def "));
  assert.ok(baris[1].startsWith("    "), "badan fungsi harus menjorok");
});
