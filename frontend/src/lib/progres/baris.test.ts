/**
 * Uji penggabungan baris Progres.
 *
 * Kecil, tetapi salah di sini berarti satu Soal terhitung dua kali saat status Topik
 * diturunkan — dan gejalanya hanya sidebar yang tampak "lebih selesai" tanpa error.
 */

import test from "node:test";
import assert from "node:assert/strict";

import type { BarisProgres } from "../api.ts";
import { gabungBaris } from "./baris.ts";

function baris(
  soal_indeks: number,
  status: BarisProgres["status"],
  percobaan: number,
  topik_slug = "stack",
): BarisProgres {
  return { topik_slug, soal_indeks, percobaan, benar_terakhir: null, status };
}

test("baris baru ditambahkan ke daftar kosong", () => {
  const hasil = gabungBaris([], baris(0, "sedang", 1));

  assert.deepEqual(hasil, [baris(0, "sedang", 1)]);
});

test("baris dengan kunci baru ditambahkan di belakang", () => {
  const hasil = gabungBaris([baris(0, "sedang", 1)], baris(1, "sedang", 1));

  assert.equal(hasil.length, 2);
  assert.deepEqual(hasil[1], baris(1, "sedang", 1));
});

test("baris dengan kunci sama diganti, bukan diduplikasi", () => {
  const hasil = gabungBaris([baris(0, "sedang", 1)], baris(0, "selesai", 2));

  assert.equal(hasil.length, 1);
  assert.deepEqual(hasil[0], baris(0, "selesai", 2));
});

test("kunci sama pada Topik berbeda tidak saling menimpa", () => {
  const hasil = gabungBaris([baris(0, "sedang", 1, "stack")], baris(0, "sedang", 1, "big-o"));

  assert.equal(hasil.length, 2);
});

test("daftar masukan tidak diubah", () => {
  const awal = [baris(0, "sedang", 1)];
  const salinan = [...awal];

  gabungBaris(awal, baris(0, "selesai", 2));

  assert.deepEqual(awal, salinan);
});

test("baris lain dibiarkan apa adanya saat satu diganti", () => {
  const hasil = gabungBaris(
    [baris(0, "sedang", 1), baris(1, "selesai", 1)],
    baris(0, "selesai", 2),
  );

  assert.deepEqual(hasil, [baris(0, "selesai", 2), baris(1, "selesai", 1)]);
});
