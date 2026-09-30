/**
 * Uji penomoran Topik dua digit.
 *
 * Sederhana, tetapi salahnya senyap: nomor yang lebarnya tidak seragam membuat daftar
 * 01–12 tidak rata, dan tidak ada yang gagal — hanya terlihat sedikit berantakan.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { nomorDuaDigit } from "./nomor.ts";

test("nomor satu digit diberi awalan nol", () => {
  assert.equal(nomorDuaDigit(4), "04");
  assert.equal(nomorDuaDigit(1), "01");
});

test("nomor dua digit dibiarkan apa adanya", () => {
  assert.equal(nomorDuaDigit(12), "12");
  assert.equal(nomorDuaDigit(10), "10");
});

test("seluruh Jalur 1..12 menghasilkan lebar yang seragam", () => {
  const nomor = Array.from({ length: 12 }, (_, i) => nomorDuaDigit(i + 1));

  assert.deepEqual(nomor[0], "01");
  assert.deepEqual(nomor[11], "12");
  assert.equal(
    nomor.every((n) => n.length === 2),
    true,
  );
});

test("nomor yang lebih panjang dari lebar tidak dipotong", () => {
  // Kalau Jalur bertambah panjang, nomor tiga digit harus tetap utuh — bukan
  // dipangkas menjadi dua digit yang menyesatkan.
  assert.equal(nomorDuaDigit(100), "100");
});
