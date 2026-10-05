/**
 * Uji kelengkapan kosakata Visualisasi.
 *
 * Tipe `Record<Bahasa, Record<JenisStruktur, LabelStruktur>>` sudah menolak label yang
 * kurang saat kompilasi. Yang tidak dilihat tipe adalah teks **kosong** — dan itu
 * kegagalan yang paling mudah terjadi: menambah struktur baru lalu lupa mengisi salah
 * satu bahasanya. Uji ini menutup celah itu.
 *
 * Satu hal lagi yang diuji di sini dan bukan di komponen: **Stack dan Queue harus
 * berbeda pada ujung keluarnya.** Kalau keduanya sama, Visualisasi kehilangan gunanya —
 * pemelajar melihat dua animasi yang identik dan tidak belajar apa pun tentang LIFO
 * dan FIFO. Ujung **masuk** keduanya boleh sama di mata pemelajar (keduanya menambah
 * di ujung yang sama), jadi yang diperiksa hanya ujung keluarnya.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { BAHASA } from "../bahasa/bahasa.ts";
import { LABEL, labelUntuk } from "./label.ts";
import type { JenisStruktur } from "./struktur.ts";

const STRUKTUR: JenisStruktur[] = ["stack", "queue"];

test("setiap bahasa punya label untuk setiap struktur", () => {
  for (const bahasa of BAHASA) {
    for (const jenis of STRUKTUR) {
      assert.ok(LABEL[bahasa][jenis], `${bahasa}.${jenis} tidak ada`);
    }
  }
});

test("tidak ada label kosong", () => {
  for (const bahasa of BAHASA) {
    for (const jenis of STRUKTUR) {
      const label = LABEL[bahasa][jenis];
      for (const [kunci, nilai] of Object.entries(label)) {
        assert.equal(
          typeof nilai,
          "string",
          `${bahasa}.${jenis}.${kunci} harus teks`,
        );
        assert.ok(
          nilai.trim().length > 0,
          `${bahasa}.${jenis}.${kunci} kosong atau hanya spasi`,
        );
      }
    }
  }
});

test("ujung keluar Stack berbeda dari ujung keluar Queue", () => {
  // Inilah satu-satunya hal yang membedakan kedua Visualisasi. Kalau sama, animasinya
  // tidak menerangkan LIFO/FIFO sama sekali.
  for (const bahasa of BAHASA) {
    assert.notEqual(
      LABEL[bahasa].stack.ujungKeluar,
      LABEL[bahasa].queue.ujungKeluar,
      `${bahasa}: ujung keluar kedua struktur sama`,
    );
  }
});

test("labelUntuk mengembalikan label struktur yang diminta", () => {
  for (const bahasa of BAHASA) {
    for (const jenis of STRUKTUR) {
      assert.equal(labelUntuk(bahasa, jenis), LABEL[bahasa][jenis]);
    }
  }
});

test("kalimat aturan Stack dan Queue tidak tertukar", () => {
  // Kalimat aturan Stack menyebut "sama", Queue menyebut "belakang"/"back" atau
  // "depan"/"front". Uji ini menangkap salin-tempel yang lupa disunting.
  assert.notEqual(LABEL.id.stack.aturan, LABEL.id.queue.aturan);
  assert.notEqual(LABEL.en.stack.aturan, LABEL.en.queue.aturan);
  assert.match(LABEL.id.queue.aturan, /belakang/);
  assert.match(LABEL.en.queue.aturan, /back/);
});
