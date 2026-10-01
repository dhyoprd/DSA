/**
 * Uji penilaian Kuis dan aturan Pembahasan.
 *
 * Ini bagian yang paling senyap kalau salah: jawaban benar yang ditandai salah tidak
 * memunculkan error apa pun, dan pemelajar akan mengira dirinya yang keliru. Karena
 * itu setiap aturan di `penilaian.ts` diuji langsung, tanpa merender komponen.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  keadaanAwal,
  nilaiJawaban,
  pembahasanTerbuka,
  type KeadaanKuis,
} from "./penilaian.ts";

test("keadaan awal belum dicoba dan belum benar", () => {
  const keadaan = keadaanAwal();

  assert.equal(keadaan.percobaan, 0);
  assert.equal(keadaan.benar, false);
  assert.equal(keadaan.indeksSalahTerakhir, null);
});

test("jawaban benar menandai benar dan menghitung satu percobaan", () => {
  const keadaan = nilaiJawaban(keadaanAwal(), 2, 2);

  assert.equal(keadaan.benar, true);
  assert.equal(keadaan.percobaan, 1);
});

test("jawaban salah tidak menandai benar dan menyimpan pilihan salah", () => {
  const keadaan = nilaiJawaban(keadaanAwal(), 0, 2);

  assert.equal(keadaan.benar, false);
  assert.equal(keadaan.percobaan, 1);
  assert.equal(keadaan.indeksSalahTerakhir, 0);
});

test("percobaan bertambah setiap kali, sampai jawaban benar", () => {
  let keadaan = keadaanAwal();

  keadaan = nilaiJawaban(keadaan, 0, 3);
  assert.equal(keadaan.percobaan, 1);
  assert.equal(keadaan.indeksSalahTerakhir, 0);

  keadaan = nilaiJawaban(keadaan, 1, 3);
  assert.equal(keadaan.percobaan, 2);
  // Pilihan salah terakhir yang disorot adalah yang baru, bukan yang lama.
  assert.equal(keadaan.indeksSalahTerakhir, 1);

  keadaan = nilaiJawaban(keadaan, 3, 3);
  assert.equal(keadaan.percobaan, 3);
  assert.equal(keadaan.benar, true);
});

test("jawaban salah boleh dicoba lagi tanpa batas", () => {
  let keadaan = keadaanAwal();
  for (let i = 0; i < 10; i += 1) {
    keadaan = nilaiJawaban(keadaan, 0, 2);
  }

  assert.equal(keadaan.percobaan, 10);
  assert.equal(keadaan.benar, false);
});

test("setelah benar, pengiriman berikutnya tidak mengubah apa pun", () => {
  const benar = nilaiJawaban(keadaanAwal(), 2, 2);
  const lagi = nilaiJawaban(benar, 2, 2);

  assert.deepEqual(lagi, benar, "klik ganda menghitung percobaan dua kali");
  assert.equal(lagi.percobaan, 1);
});

test("indeks salah terakhir dibersihkan setelah benar", () => {
  let keadaan = nilaiJawaban(keadaanAwal(), 0, 2);
  assert.equal(keadaan.indeksSalahTerakhir, 0);

  keadaan = nilaiJawaban(keadaan, 2, 2);
  assert.equal(keadaan.indeksSalahTerakhir, null);
});

test("Pembahasan tertutup sebelum benar dan terbuka sesudahnya", () => {
  const awal = keadaanAwal();
  assert.equal(pembahasanTerbuka(awal), false);

  const salah = nilaiJawaban(awal, 0, 2);
  assert.equal(pembahasanTerbuka(salah), false, "Pembahasan bocor sebelum benar");

  const benar = nilaiJawaban(salah, 2, 2);
  assert.equal(pembahasanTerbuka(benar), true);
});

test("Pembahasan tetap tertutup berapa kali pun salah", () => {
  let keadaan: KeadaanKuis = keadaanAwal();
  for (let i = 0; i < 5; i += 1) {
    keadaan = nilaiJawaban(keadaan, 0, 3);
    assert.equal(pembahasanTerbuka(keadaan), false);
  }
});
