/**
 * Uji kelengkapan kamus antarmuka.
 *
 * Tipe `Record<Bahasa, Kamus>` sudah menolak kamus yang kurang satu field saat
 * kompilasi. Yang **tidak** dilihat tipe adalah field yang ada tetapi kosong atau
 * hanya spasi — dan itu justru kegagalan yang paling mudah terjadi: menambahkan field
 * baru ke satu bahasa lalu lupa mengisi yang lain. Uji ini menutup celah itu.
 *
 * Bahasa yang kamusnya hilang sama sekali juga tidak akan lolos tipe, tetapi uji ini
 * memeriksanya lagi supaya kegagalannya jelas saat runtime, bukan hanya di editor.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { BAHASA, type Bahasa } from "./bahasa.ts";
import { KAMUS, kamusUntuk } from "./kamus.ts";

test("setiap bahasa punya kamus", () => {
  for (const bahasa of BAHASA) {
    assert.ok(KAMUS[bahasa], `kamus untuk "${bahasa}" tidak ada`);
  }
});

test("tidak ada teks kosong di kamus mana pun", () => {
  for (const bahasa of BAHASA) {
    const kamus = KAMUS[bahasa];
    for (const [kunci, nilai] of Object.entries(kamus)) {
      assert.equal(
        typeof nilai,
        "string",
        `${bahasa}.${kunci} harus teks, bukan ${typeof nilai}`,
      );
      assert.ok(
        (nilai as string).trim().length > 0,
        `${bahasa}.${kunci} kosong atau hanya spasi`,
      );
    }
  }
});

test("kedua bahasa punya field yang sama persis", () => {
  // Ini jaring pengaman untuk bentuk yang tidak terlihat tipe — mis. objek yang
  // dirakit dari sumber lain. Kuncinya harus sama, jadi tidak ada field yang hanya
  // ada di satu bahasa.
  const kunciId = Object.keys(KAMUS.id).sort();
  const kunciEn = Object.keys(KAMUS.en).sort();
  assert.deepEqual(kunciId, kunciEn);
});

test("kamusUntuk mengembalikan kamus bahasanya", () => {
  for (const bahasa of BAHASA) {
    assert.equal(kamusUntuk(bahasa), KAMUS[bahasa]);
  }
});

test("teks yang sama di kedua bahasa tetap ditulis di keduanya", () => {
  // Beberapa istilah memang sama (mis. "Token"), dan itu benar. Yang diuji di sini
  // bukan bahwa keduanya berbeda, melainkan bahwa yang **seharusnya** berbeda
  // memang berbeda — supaya tidak ada kamus English yang diam-diam salinan Indonesia.
  const id = KAMUS.id;
  const en = KAMUS.en;
  assert.notEqual(id.benar, en.benar);
  assert.notEqual(id.belumTepat, en.belumTepat);
  assert.notEqual(id.jalur, en.jalur);
  assert.notEqual(id.daftarIsi, en.daftarIsi);
  assert.notEqual(id.temaTerang, en.temaTerang);
});

/** Nama field kamus, supaya `bahasa` yang tidak lengkap terlihat saat menambah field. */
test("kamus Bahasa punya seluruh field yang dipakai komponen", () => {
  // Daftar ini sengaja tidak menyalin seluruh `Kamus`; ia menjaga field yang paling
  // mudah terlupa saat menambah fitur baru. Field yang hilang dari tipe tetap ditolak
  // TypeScript, jadi uji ini hanya memperjelas.
  const wajib: (keyof typeof KAMUS.id)[] = [
    "judulSitus",
    "jalur",
    "kuis",
    "pembahasan",
    "bahasa",
    "tema",
    "token",
  ];
  for (const bahasa of BAHASA) {
    for (const kunci of wajib) {
      assert.ok(
        KAMUS[bahasa as Bahasa][kunci].trim().length > 0,
        `${bahasa}.${kunci} harus terisi`,
      );
    }
  }
});
