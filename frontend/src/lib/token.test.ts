/**
 * Uji normalisasi token.
 *
 * Yang diuji adalah bagian murni saja — aturan "tempelan dibersihkan dari spasi".
 * Bagian yang menyentuh `localStorage` tidak diuji di sini karena test runner di repo
 * ini adalah `node --test`, yang tidak punya DOM.
 *
 * Salahnya senyap: token yang benar tetapi punya spasi di ujung akan ditolak `401`,
 * dan pemakai tidak bisa melihat perbedaannya di layar.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { normalkanToken } from "./token.ts";

test("spasi di ujung dibuang", () => {
  assert.equal(normalkanToken("  rahasia  "), "rahasia");
});

test("baris baru dan tab di ujung dibuang", () => {
  // Tempelan dari terminal hampir selalu membawa baris baru.
  assert.equal(normalkanToken("rahasia\n"), "rahasia");
  assert.equal(normalkanToken("\trahasia\t"), "rahasia");
  assert.equal(normalkanToken("\n  rahasia  \n"), "rahasia");
});

test("spasi di tengah dibiarkan", () => {
  // Token bisa saja memang punya spasi di tengah; yang dibersihkan hanya ujungnya.
  assert.equal(normalkanToken("  dua kata  "), "dua kata");
});

test("teks kosong atau hanya spasi berarti belum diisi", () => {
  assert.equal(normalkanToken(""), null);
  assert.equal(normalkanToken("   "), null);
  assert.equal(normalkanToken("\n\t "), null);
});

test("token tanpa spasi dikembalikan apa adanya", () => {
  assert.equal(normalkanToken("a1b2c3"), "a1b2c3");
});
