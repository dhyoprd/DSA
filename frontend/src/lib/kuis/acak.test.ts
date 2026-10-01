/**
 * Uji pengacakan opsi Kuis.
 *
 * Yang diuji di sini adalah **kontrak**, bukan urutan tertentu: hasilnya harus
 * permutasi yang sah, dan harus sama untuk benih yang sama. Urutan persisnya sengaja
 * tidak dituliskan sebagai angka — menuliskannya berarti setiap perubahan kecil pada
 * hash atau pembangkit akan memecahkan uji ini tanpa ada perilaku yang benar-benar
 * rusak.
 *
 * Bug yang dicegah: pengacakan yang memakai `Math.random()` lulus uji "permutasi
 * sah" tetapi gagal uji "stabil untuk benih yang sama" — dan itulah bentuk bug yang
 * membuat opsi berpindah tempat saat pemelajar mencoba lagi.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { benihOpsi, urutanTeracak } from "./acak.ts";

test("hasilnya permutasi lengkap 0..n-1 tanpa kehilangan atau pengulangan", () => {
  const urut = urutanTeracak(4, "stack#0#sesi-a");

  assert.equal(urut.length, 4);
  assert.deepEqual([...urut].sort((a, b) => a - b), [0, 1, 2, 3]);
});

test("benih yang sama menghasilkan urutan yang sama", () => {
  const benih = benihOpsi("stack", 2, "sesi-tetap");
  const pertama = urutanTeracak(4, benih);
  const kedua = urutanTeracak(4, benih);

  assert.deepEqual(pertama, kedua, "opsi akan berpindah tempat saat mencoba lagi");
});

test("benih berbeda boleh menghasilkan urutan berbeda", () => {
  // Bukan jaminan bahwa setiap pasangan berbeda, tetapi dua benih yang sengaja
  // dipilih harus berbeda — kalau tidak, hash-nya mengabaikan sebagian benih.
  const a = urutanTeracak(4, benihOpsi("stack", 0, "sesi-a"));
  const b = urutanTeracak(4, benihOpsi("stack", 1, "sesi-a"));

  assert.notDeepEqual(a, b);
});

test("id sesi berbeda menghasilkan urutan berbeda", () => {
  const a = urutanTeracak(4, benihOpsi("stack", 0, "sesi-a"));
  const b = urutanTeracak(4, benihOpsi("stack", 0, "sesi-b"));

  assert.notDeepEqual(a, b);
});

test("benih tidak bertabrakan saat batas bagian bergeser", () => {
  // Tanpa pemisah `#`, ("stack", 1, "23") dan ("stack", 12, "3") akan menjadi teks
  // yang sama. Benihnya harus berbeda, jadi urutannya boleh berbeda.
  const a = urutanTeracak(4, benihOpsi("stack", 1, "23"));
  const b = urutanTeracak(4, benihOpsi("stack", 12, "3"));

  assert.notDeepEqual(a, b);
});

test("lima Kuis satu Topik tidak selalu menaruh jawaban di posisi yang sama", () => {
  // User story 24: posisi jawaban benar tidak boleh bisa ditebak dari Kuis lain.
  // Diuji pada Kuis dengan 4 opsi, seperti isi stack.yaml.
  const posisiBenar = new Set<number>();

  for (let indeks = 0; indeks < 5; indeks += 1) {
    const urut = urutanTeracak(4, benihOpsi("stack", indeks, "sesi-satu"));
    posisiBenar.add(urut.indexOf(0));
  }

  assert.ok(
    posisiBenar.size > 1,
    "seluruh Kuis menaruh opsi indeks 0 di posisi yang sama",
  );
});

test("jumlah nol dan satu menghasilkan daftar yang benar", () => {
  assert.deepEqual(urutanTeracak(0, "apa pun"), []);
  assert.deepEqual(urutanTeracak(1, "apa pun"), [0]);
});
