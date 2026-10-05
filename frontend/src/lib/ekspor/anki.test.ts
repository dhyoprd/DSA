/**
 * Uji penyusunan berkas Anki.
 *
 * Format berkasnya adalah **API pihak ketiga** — Anki yang menentukannya. Uji ini
 * menjaga bentuk yang diverifikasi ke `docs.ankiweb.net/importing/text-files.html`:
 * header `#kunci:nilai` di awal, satu kartu per baris, tiga kolom Front/Back/Tags,
 * dan tidak ada baris judul kolom tambahan (baris tak berkomentar pertama dibaca
 * Anki sebagai data).
 */

import test from "node:test";
import assert from "node:assert/strict";

import type { Kartu } from "./kartu.ts";
import { NAMA_DEK, NAMA_TIPE_CATATAN, berkasAnki, namaBerkasAnki } from "./anki.ts";

function kartu(depan: string, belakang: string, tag: string[] = ["kompleksitas", "stack"]): Kartu {
  return { depan, belakang, tag };
}

test("berkas diawali header Anki yang sah", () => {
  const baris = berkasAnki([]).split("\n");
  assert.equal(baris[0], "#separator:Comma");
  assert.ok(baris.includes("#html:false"));
  assert.ok(baris.includes(`#notetype:${NAMA_TIPE_CATATAN}`));
  assert.ok(baris.includes(`#deck:${NAMA_DEK}`));
  assert.ok(baris.includes("#columns:Front,Back,Tags"));
  assert.ok(baris.includes("#tags column:3"));
});

test("setiap kartu menjadi satu baris Front,Back,Tags", () => {
  const isi = berkasAnki([kartu("Kompleksitas waktu — Stack", "O(1)")]);
  const baris = isi.split("\n");
  const data = baris[baris.length - 2]; // baris terakhir kosong karena diakhiri \n

  assert.equal(data, "Kompleksitas waktu — Stack,O(1),kompleksitas stack");
});

test("tidak ada baris judul kolom tambahan", () => {
  // Baris tak berkomentar pertama dibaca Anki sebagai data. Menambahkan baris
  // "Front,Back,Tags" akan membuatnya menjadi kartu pertama yang kosong.
  const isi = berkasAnki([kartu("Depan", "Belakang")]);
  assert.ok(!isi.includes("Front,Back,Tags\nDepan"), "baris judul tidak boleh ada");
  assert.equal(isi.split("\n")[6], "Depan,Belakang,kompleksitas stack");
});

test("sel yang memuat koma dikutip", () => {
  const isi = berkasAnki([kartu("Definisi — LIFO", "Last In, First Out")]);
  assert.ok(isi.includes('"Last In, First Out"'));
});

test("beberapa tag digabung dengan spasi", () => {
  const isi = berkasAnki([kartu("D", "B", ["istilah-id-en", "stack"])]);
  assert.ok(isi.endsWith("D,B,istilah-id-en stack\n"));
});

test("berkas diakhiri satu baris baru", () => {
  const isi = berkasAnki([kartu("D", "B")]);
  assert.ok(isi.endsWith("\n"));
  assert.ok(!isi.endsWith("\n\n"), "hanya satu baris baru di ujung");
});

test("nama berkas menyebut bahasa", () => {
  assert.equal(namaBerkasAnki("id"), "dsa-anki-id.csv");
  assert.equal(namaBerkasAnki("en"), "dsa-anki-en.csv");
});
