/**
 * Uji pembacaan id sesi.
 *
 * Yang diuji hanya bagian murninya: bentuk id yang diterima dan yang ditolak. Bagian
 * yang menyentuh `sessionStorage` tidak diuji di sini — test runner Node tidak
 * punya `sessionStorage`, dan menirunya berarti menguji tiruannya, bukan perilakunya.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { bacaIdSesi, idSesiBaru, idSesiServer } from "./sesi.ts";

test("belum ada id berarti null, bukan galat", () => {
  assert.equal(bacaIdSesi(null), null);
});

test("nilai server bukan id sesi, dan tidak bisa diterima sebagai id", () => {
  // Penanda "belum diketahui" tidak boleh lolos `bacaIdSesi`. Kalau ia lolos dan
  // pernah masuk `sessionStorage`, komponen akan mengira sesinya sudah siap dan
  // seluruh opsi tampil kosong terkunci tanpa cara pulih.
  const penanda = idSesiServer();
  assert.equal(penanda, null);
  assert.equal(bacaIdSesi(penanda), null);
  assert.equal(bacaIdSesi(String(penanda)), null);
});

test("id yang sah dibaca apa adanya", () => {
  const id = "3f2a9c1e-77bd-4a1f-9f0e-1c2d3e4f5a6b";
  assert.equal(bacaIdSesi(id), id);
});

test("id kosong atau terlalu pendek ditolak", () => {
  assert.equal(bacaIdSesi(""), null);
  assert.equal(bacaIdSesi("abc"), null);
});

test("id dengan karakter di luar bentuk ditolak", () => {
  assert.equal(bacaIdSesi("sesi dengan spasi"), null);
  assert.equal(bacaIdSesi("sesi/dengan/garis"), null);
  assert.equal(bacaIdSesi("sesi#dengan#pagar"), null);
});

test("id yang terlalu panjang ditolak", () => {
  assert.equal(bacaIdSesi("a".repeat(65)), null);
});

test("id baru selalu lolos pembacaan kembali", () => {
  // Kontraknya penting: id yang dibuat fungsi ini harus diterima `bacaIdSesi`, kalau
  // tidak sesi baru akan terus dibuat ulang dan pengacakan tidak pernah stabil.
  for (let i = 0; i < 20; i += 1) {
    const id = idSesiBaru();
    assert.equal(bacaIdSesi(id), id);
  }
});

test("id baru berbeda setiap kali", () => {
  const terlihat = new Set(Array.from({ length: 50 }, () => idSesiBaru()));
  assert.equal(terlihat.size, 50);
});
