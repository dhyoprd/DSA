/**
 * Uji aturan pemutaran Visualisasi.
 *
 * Yang diuji adalah **batas dan perpindahan keadaan** — maju di ujung, mundur di awal,
 * dan pemutaran otomatis yang harus berhenti sendiri. Semuanya bisa salah tanpa error
 * yang terlihat: tombol yang diam di ujung terasa seperti tombol rusak, dan timer yang
 * tidak berhenti membuat tombolnya bertuliskan "jeda" padahal tidak ada yang berjalan.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  jeda,
  keadaanPutarAwal,
  maju,
  majuOtomatis,
  mundur,
  putar,
  ulang,
  type KeadaanPutar,
} from "./putar.ts";
import type { Langkah } from "./struktur.ts";

/** Urutan pendek tiga langkah, cukup untuk menguji kedua ujungnya. */
const LANGKAH: Langkah[] = [
  { operasi: "push", nilai: 1 },
  { operasi: "push", nilai: 2 },
  { operasi: "pop" },
];

test("keadaan awal di posisi nol dan tidak berjalan", () => {
  assert.deepEqual(keadaanPutarAwal(), { indeks: 0, bermain: false });
});

test("maju menambah satu langkah dan menghentikan pemutaran", () => {
  const sedang: KeadaanPutar = { indeks: 0, bermain: true };
  const hasil = maju(sedang, LANGKAH);

  assert.equal(hasil.indeks, 1);
  assert.equal(hasil.bermain, false, "menekan maju berarti mengambil kendali");
});

test("maju berhenti di langkah terakhir, tidak melewatinya", () => {
  const diUjung: KeadaanPutar = { indeks: LANGKAH.length, bermain: false };
  assert.equal(maju(diUjung, LANGKAH).indeks, LANGKAH.length);

  // Ditekan berkali-kali pun tetap di ujung.
  const lagi = maju(maju(diUjung, LANGKAH), LANGKAH);
  assert.equal(lagi.indeks, LANGKAH.length);
});

test("mundur mengurangi satu langkah", () => {
  const hasil = mundur({ indeks: 2, bermain: false });
  assert.equal(hasil.indeks, 1);
});

test("mundur berhenti di nol, tidak menghasilkan indeks negatif", () => {
  const diAwal = mundur({ indeks: 0, bermain: false });

  assert.equal(diAwal.indeks, 0);
  assert.ok(diAwal.indeks >= 0, "indeks negatif akan membingungkan keadaanPada");
});

test("mundur menghentikan pemutaran", () => {
  const hasil = mundur({ indeks: 2, bermain: true });
  assert.equal(hasil.bermain, false);
});

test("ulang mengembalikan ke keadaan kosong dan berhenti", () => {
  const hasil = ulang();

  assert.deepEqual(hasil, { indeks: 0, bermain: false });
  assert.notEqual(hasil.bermain, true, "keadaan yang baru direset tidak boleh berlari");
});

test("putar menyalakan pemutaran tanpa mengubah posisi", () => {
  const hasil = putar({ indeks: 1, bermain: false }, LANGKAH);

  assert.deepEqual(hasil, { indeks: 1, bermain: true });
});

test("putar di ujung mengulang dari awal, bukan diam", () => {
  // Tombol putar yang diam di ujung akan terasa rusak: pemelajar tidak tahu ia harus
  // menekan "ulang" dulu.
  const hasil = putar({ indeks: LANGKAH.length, bermain: false }, LANGKAH);

  assert.deepEqual(hasil, { indeks: 0, bermain: true });
});

test("jeda berhenti tanpa mengubah posisi", () => {
  const hasil = jeda({ indeks: 2, bermain: true });

  assert.deepEqual(hasil, { indeks: 2, bermain: false });
});

test("majuOtomatis menambah satu langkah dan tetap berjalan di tengah", () => {
  const hasil = majuOtomatis({ indeks: 0, bermain: true }, LANGKAH);

  assert.equal(hasil.indeks, 1);
  assert.equal(hasil.bermain, true, "masih ada langkah berikutnya");
});

test("majuOtomatis berhenti sendiri begitu mencapai ujung", () => {
  // Tanpa ini, timer terus berdetak pada keadaan yang tidak berubah, dan tombolnya
  // tetap bertuliskan "jeda" padahal tidak ada lagi yang berjalan.
  const hasil = majuOtomatis({ indeks: LANGKAH.length - 1, bermain: true }, LANGKAH);

  assert.equal(hasil.indeks, LANGKAH.length);
  assert.equal(hasil.bermain, false, "pemutaran harus berhenti di langkah terakhir");
});

test("majuOtomatis tidak pernah melewati langkah terakhir", () => {
  let keadaan: KeadaanPutar = { indeks: 0, bermain: true };
  for (let i = 0; i < 20; i += 1) {
    keadaan = majuOtomatis(keadaan, LANGKAH);
  }

  assert.equal(keadaan.indeks, LANGKAH.length);
  assert.equal(keadaan.bermain, false);
});

test("maju lalu mundur mengembalikan posisi semula", () => {
  // Kriteria penerimaan: "bisa maju dan mundur langkah demi langkah". Kalau keduanya
  // tidak saling membalik, langkahnya akan melenceng setelah beberapa kali.
  const awal = keadaanPutarAwal();
  const bolakBalik = mundur(maju(maju(awal, LANGKAH), LANGKAH));

  assert.equal(bolakBalik.indeks, 1);
});
