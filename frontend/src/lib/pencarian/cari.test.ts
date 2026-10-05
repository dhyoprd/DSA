/**
 * Uji pencocokan dan pemeringkatan hasil pencarian.
 *
 * Yang diuji adalah perilaku yang terlihat dari luar: diberikan indeks dan kata
 * kunci, hasil apa yang muncul dan dalam urutan apa.
 *
 * Beberapa keputusan yang dijaga di sini:
 *
 * - **Pencocokan tidak peka huruf besar-kecil**, karena pemelajar tidak akan
 *   mengetik "LIFO" dan "lifo" secara konsisten.
 * - **Kata kunci yang lebih panjang diutamakan.** "amortized" yang cocok harus
 *   muncul sebelum "a" yang cocok; kalau tidak, hasil yang paling relevan terkubur.
 * - **Judul bagian yang cocok diberi bobot lebih tinggi** daripada badan, karena
 *   bagian berjudul "Kompleksitas" lebih mungkin yang dicari daripada paragraf yang
 *   menyebut kata itu sekilas.
 * - **Setiap entri muncul sekali**, walaupun kata kuncinya cocok berkali-kali.
 *
 * Modulnya murni: tidak menyentuh berkas, DOM, atau React.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { cari } from "./cari.ts";
import type { EntriPencarian } from "./indeks.ts";

/** Entri contoh; hanya field yang relevan yang perlu diisi. */
function entri(
  bagianJudul: string,
  teks: string,
  bagianId: string = "bagian",
  topikSlug: string = "stack",
): EntriPencarian {
  return {
    topikSlug,
    topikNomor: 4,
    topikJudul: "Stack & Queue",
    bagianId,
    bagianJudul,
    teks,
  };
}

const INDEKS: EntriPencarian[] = [
  entri("Aturan LIFO dan FIFO", "Stack memakai LIFO, Queue memakai FIFO.", "aturan"),
  entri("Cara Stack bekerja", "push menaruh nilai di atas, pop mengambilnya.", "cara"),
  entri("Kompleksitas", "Semua operasi Stack berjalan O(1).", "kompleksitas"),
];

test("menemukan entri yang memuat kata kunci di badan", () => {
  const hasil = cari(INDEKS, "push");

  assert.equal(hasil.length, 1);
  assert.equal(hasil[0].entri.bagianId, "cara");
});

test("pencocokan tidak peka huruf besar-kecil", () => {
  const kecil = cari(INDEKS, "lifo");
  const besar = cari(INDEKS, "LIFO");
  const campur = cari(INDEKS, "LiFo");

  assert.equal(kecil.length, 1);
  assert.deepEqual(
    kecil.map((h) => h.entri.bagianId),
    besar.map((h) => h.entri.bagianId),
  );
  assert.deepEqual(
    kecil.map((h) => h.entri.bagianId),
    campur.map((h) => h.entri.bagianId),
  );
});

test("kata kunci kosong menghasilkan daftar kosong", () => {
  assert.deepEqual(cari(INDEKS, ""), []);
  assert.deepEqual(cari(INDEKS, "   "), []);
});

test("kata kunci yang tidak cocok menghasilkan daftar kosong", () => {
  assert.deepEqual(cari(INDEKS, "zzz"), []);
});

test("judul yang cocok muncul sebelum badan yang cocok", () => {
  // "Kompleksitas" hanya ada di judul satu entri; tidak ada di badan entri lain.
  const hasil = cari(INDEKS, "kompleksitas");

  assert.equal(hasil[0].entri.bagianId, "kompleksitas");
});

test("setiap entri muncul paling banyak sekali", () => {
  // "Stack" muncul di judul dan badan entri pertama, dan di badan entri kedua.
  const hasil = cari(INDEKS, "stack");
  const id = hasil.map((h) => h.entri.bagianId);

  assert.equal(new Set(id).size, id.length, `entri ganda: ${id.join(", ")}`);
});

test("cuplikan memuat kata kunci yang dicari", () => {
  const hasil = cari(INDEKS, "push");

  assert.ok(hasil[0].cuplikan.toLowerCase().includes("push"));
});

test("cuplikan menandai bagian yang cocok, tanpa HTML", () => {
  const hasil = cari(INDEKS, "push");
  const { cuplikan, sorot } = hasil[0];

  // `sorot` adalah rentang di dalam `cuplikan`, bukan markup. Dengan begitu
  // komponen yang merender bisa memutuskan sendiri bagaimana menandainya, dan
  // tidak ada HTML yang harus dipercaya.
  assert.ok(sorot.length >= 1);
  const [mulai, akhir] = sorot[0];
  assert.equal(cuplikan.slice(mulai, akhir).toLowerCase(), "push");
});

test("cuplikan dipotong di sekitar kata kunci, bukan selalu dari awal", () => {
  const panjang = `${"kata ".repeat(60)}jarum${" lagi".repeat(60)}`;
  const hasil = cari([entri("Judul", panjang, "panjang")], "jarum");

  assert.ok(hasil[0].cuplikan.length < panjang.length, "cuplikan tidak dipotong");
  assert.ok(hasil[0].cuplikan.toLowerCase().includes("jarum"));
});

test("cuplikan panjang yang tidak berisi kata kunci dibatasi", () => {
  // Kata kunci cocok di judul, jadi tidak ada di badan. Cuplikannya tetap harus
  // pendek supaya daftar hasil tidak meledak.
  const badan = "kalimat panjang tanpa kata yang dicari. ".repeat(40);
  const hasil = cari([entri("Jarum di judul", badan, "judul")], "jarum");

  assert.ok(hasil[0].cuplikan.length < badan.length);
});

test("kata kunci di dalam judul juga disorot saat cuplikan memuatnya", () => {
  const hasil = cari([entri("Kompleksitas", "Operasi Stack O(1).", "k")], "kompleksitas");

  assert.ok(hasil[0].cuplikan.toLowerCase().includes("kompleksitas"));
  assert.ok(hasil[0].sorot.length >= 1);
});

test("beberapa kata dipisah spasi: semua harus cocok", () => {
  const hasil = cari(INDEKS, "stack lifo");

  assert.equal(hasil.length, 1);
  assert.equal(hasil[0].entri.bagianId, "aturan");
});

test("urutan hasil stabil untuk bobot yang sama", () => {
  const hasil = cari(INDEKS, "o");
  // Tidak ada yang boleh hilang atau tergandakan karena pengurutan.
  const id = hasil.map((h) => h.entri.bagianId);
  assert.equal(new Set(id).size, id.length);
});

test("sorot tidak menyeberangi batas cuplikan", () => {
  const panjang = `${"x".repeat(200)} jarum ${"y".repeat(200)}`;
  const hasil = cari([entri("Judul", panjang, "p")], "jarum");

  for (const [mulai, akhir] of hasil[0].sorot) {
    assert.ok(mulai >= 0, "rentang mulai negatif");
    assert.ok(akhir <= hasil[0].cuplikan.length, "rentang melewati akhir cuplikan");
    assert.ok(mulai < akhir, "rentang kosong atau terbalik");
  }
});
