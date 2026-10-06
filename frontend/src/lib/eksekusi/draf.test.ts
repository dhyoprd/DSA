/**
 * Uji kunci dan pembacaan draf Soal Kode.
 *
 * Yang diuji di sini hanya bagian murninya: bentuk kunci dan pemeriksaan nilai
 * mentah. Bagian yang menyentuh `sessionStorage` tidak diuji di sini — test runner
 * repo ini `node --test`, yang tidak punya `sessionStorage`.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { bacaDraf, kunciDraf } from "./draf.ts";

test("kunci memuat bahasa, slug, dan indeks", () => {
  const kunci = kunciDraf("id", "stack", 5);

  assert.ok(kunci.includes("id"), kunci);
  assert.ok(kunci.includes("stack"), kunci);
  assert.ok(kunci.includes("5"), kunci);
});

test("bahasa berbeda menghasilkan kunci berbeda", () => {
  // Draf kode untuk Materi Indonesia dan English adalah dua percobaan yang berbeda:
  // Soalnya punya skenario berbeda di tiap bahasa. Menyatukan kuncinya berarti
  // suntingan di satu bahasa menimpa draf di bahasa yang lain.
  assert.notEqual(kunciDraf("id", "stack", 5), kunciDraf("en", "stack", 5));
});

test("topik berbeda menghasilkan kunci berbeda", () => {
  assert.notEqual(kunciDraf("id", "stack", 5), kunciDraf("id", "queue", 5));
});

test("indeks berbeda menghasilkan kunci berbeda", () => {
  // Bentuk kunci menyertakan indeks supaya tidak ada asumsi "satu Soal Kode per
  // Topik" yang tertanam di sini.
  assert.notEqual(kunciDraf("id", "stack", 5), kunciDraf("id", "stack", 6));
});

test("kunci tidak bertabrakan antar kombinasi", () => {
  // Pemisah `:` membuat kombinasi yang berbeda tidak bisa menghasilkan kunci yang
  // sama walaupun bagian-bagiannya digabung berbeda.
  const kumpulan = new Set<string>();
  for (const bahasa of ["id", "en"] as const) {
    for (const slug of ["stack", "queue", "stack:5"]) {
      for (const indeks of [0, 5]) {
        kumpulan.add(kunciDraf(bahasa, slug, indeks));
      }
    }
  }
  // 2 bahasa × 3 slug × 2 indeks = 12 kunci unik.
  assert.equal(kumpulan.size, 12);
});

test("draf yang belum ada berarti null", () => {
  assert.equal(bacaDraf(null), null);
});

test("draf berupa teks dikembalikan apa adanya", () => {
  assert.equal(bacaDraf("def proses(x):\n    return x"), "def proses(x):\n    return x");
});

test("draf kosong tetap dianggap draf", () => {
  // String kosong adalah tulisan pemelajar yang mengosongkan kotaknya. Menganggapnya
  // "belum ada draf" akan memunculkan kembali kode awal dan menimpa pilihannya.
  assert.equal(bacaDraf(""), "");
});

test("nilai yang bukan teks diabaikan", () => {
  // Versi lama mungkin menyimpan objek; memaksakannya menjadi teks akan menampilkan
  // "[object Object]" di editor.
  assert.equal(bacaDraf("{}"), "{}");
  // `bacaDraf` hanya menerima `string | null`; nilai lain tidak mungkin sampai ke
  // sini lewat tipe, tetapi pemeriksaan runtime-nya tetap ada.
  assert.equal(bacaDraf(undefined as unknown as string | null), null);
});
