/**
 * Uji keterangan untuk pembaca layar.
 *
 * Yang diuji di sini bukan gaya bahasa, melainkan **isi informasi yang wajib ada**:
 * ujung mana yang dipakai, nilai apa yang keluar, dan apa isi strukturnya sekarang.
 * Kalau salah satu hilang, pemelajar yang memakai pembaca layar kehilangan bagian
 * mekanismenya — dan tidak ada error apa pun yang muncul, karena teksnya tetap
 * "terlihat" baik-baik saja.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { keterangan, type TeksKeterangan } from "./keterangan.ts";
import { LABEL } from "./label.ts";
import { keadaanAwal, keadaanPada, type Langkah } from "./struktur.ts";

const TEKS: TeksKeterangan = {
  push: "push",
  pop: "pop",
  awal: "Tekan maju untuk menjalankan langkah pertama.",
  langkah: "Langkah",
  isi: "Isi sekarang:",
  isiKosong: "Strukturnya kosong.",
  popKosong: "Tidak ada yang keluar — strukturnya kosong.",
};

const LANGKAH: Langkah[] = [
  { operasi: "push", nilai: 1 },
  { operasi: "push", nilai: 2 },
  { operasi: "pop" },
];

test("keadaan awal menyebut ajakan menjalankan langkah pertama", () => {
  const hasil = keterangan(keadaanAwal(), LABEL.id.stack, TEKS);

  assert.match(hasil, /Tekan maju/);
  assert.match(hasil, /Strukturnya kosong/);
});

test("push menyebut nilai dan ujung masuknya", () => {
  const keadaan = keadaanPada(LANGKAH, 1, "stack");
  const hasil = keterangan(keadaan, LABEL.id.stack, TEKS);

  assert.match(hasil, /push 1/);
  assert.match(hasil, /atas/, "harus menyebut ujung masuk Stack");
  assert.match(hasil, /1/, "harus menyebut isi strukturnya");
});

test("pop pada Stack menyebut ujung keluar yang benar", () => {
  const keadaan = keadaanPada(LANGKAH, 3, "stack");
  const hasil = keterangan(keadaan, LABEL.id.stack, TEKS);

  assert.match(hasil, /pop 2/, "yang keluar dari Stack adalah nilai terakhir");
  assert.match(hasil, /atas/);
});

test("pop pada Queue menyebut ujung keluar yang berbeda", () => {
  // Inilah satu-satunya kalimat yang membedakan kedua struktur bagi pembaca layar.
  // Kalau ujungnya tidak disebut, keterangannya benar untuk keduanya sekaligus —
  // dan itu berarti ia tidak menerangkan apa pun.
  const keadaan = keadaanPada(LANGKAH, 3, "queue");
  const hasil = keterangan(keadaan, LABEL.id.queue, TEKS);

  assert.match(hasil, /pop 1/, "yang keluar dari Queue adalah nilai pertama");
  assert.match(hasil, /depan/, "harus menyebut ujung keluar Queue");
  assert.doesNotMatch(hasil, /pop 2/);
});

test("pop pada struktur kosong tidak menyebut nilai yang tidak ada", () => {
  const langkah: Langkah[] = [{ operasi: "pop" }];
  const keadaan = keadaanPada(langkah, 1, "stack");
  const hasil = keterangan(keadaan, LABEL.id.stack, TEKS);

  assert.match(hasil, /Tidak ada yang keluar/);
  assert.doesNotMatch(hasil, /null/i, "jangan membacakan null ke pemakai");
  assert.doesNotMatch(hasil, /undefined/i);
});

test("isi struktur disebut setelah peristiwanya", () => {
  const keadaan = keadaanPada(LANGKAH, 2, "stack");
  const hasil = keterangan(keadaan, LABEL.id.stack, TEKS);

  const posisiPush = hasil.indexOf("push 2");
  const posisiIsi = hasil.indexOf("Isi sekarang:");

  assert.ok(posisiPush !== -1 && posisiIsi !== -1);
  assert.ok(
    posisiPush < posisiIsi,
    "peristiwanya harus disebut lebih dulu supaya isinya punya konteks",
  );
  assert.match(hasil, /1, 2/);
});

test("kedua bahasa menghasilkan keterangan yang terisi", () => {
  const keadaan = keadaanPada(LANGKAH, 3, "queue");

  for (const bahasa of ["id", "en"] as const) {
    const hasil = keterangan(keadaan, LABEL[bahasa].queue, TEKS);
    assert.ok(hasil.trim().length > 0, `${bahasa}: keterangan kosong`);
    assert.ok(
      hasil.includes(LABEL[bahasa].queue.ujungKeluar),
      `${bahasa}: ujung keluar tidak disebut`,
    );
  }
});
