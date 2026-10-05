/**
 * Uji penyusunan navigasi Jalur.
 *
 * Yang diuji adalah perilaku yang terlihat dari luar: diberikan daftar Jalur dan
 * daftar Topik yang sudah punya berkas, baris navigasi apa yang dihasilkan. Modulnya
 * murni, jadi cukup nilai biasa.
 *
 * Aturan yang paling mudah salah dan paling mahal: Topik yang belum punya berkas
 * harus tampil **redup dan tidak bisa diklik**. Kalau ia salah ditandai tersedia,
 * pembaca tersesat ke halaman kosong; kalau Topik yang sudah ada salah ditandai
 * belum tersedia, Materi yang sudah ditulis tidak bisa dibuka. Keduanya tanpa error.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { susunNavigasi } from "./navigasi.ts";
import type { Topik, TopikJalur } from "./tipe.ts";

const jalur: TopikJalur[] = [
  { nomor: 1, slug: "big-o", judul: { id: "Big-O", en: "Big-O" }, prasyarat: [] },
  { nomor: 2, slug: "array-string", judul: { id: "Array", en: "Array" }, prasyarat: [1] },
  { nomor: 3, slug: "linked-list", judul: { id: "Linked List", en: "Linked List" }, prasyarat: [2] },
  { nomor: 4, slug: "stack", judul: { id: "Stack", en: "Stack" }, prasyarat: [3] },
];

/** Topik yang sudah punya berkas. Isi Soalnya tidak relevan bagi navigasi. */
function topikTersedia(slug: string, nomor: number): Topik {
  return {
    nomor,
    slug,
    judul: { id: "Apa saja", en: "Whatever" },
    prasyarat: [],
    materi: { id: "Materi", en: "Material" },
    kompleksitas: [],
    istilah: [],
    soal: [],
  };
}

test("seluruh baris Jalur muncul, urut nomor", () => {
  const baris = susunNavigasi(jalur, []);

  assert.deepEqual(
    baris.map((b) => b.nomor),
    [1, 2, 3, 4],
  );
});

test("Topik tanpa berkas ditandai belum tersedia", () => {
  const baris = susunNavigasi(jalur, [topikTersedia("stack", 4)]);

  const stack = baris.find((b) => b.slug === "stack");
  const bigO = baris.find((b) => b.slug === "big-o");

  assert.equal(stack?.tersedia, true);
  assert.equal(bigO?.tersedia, false);
});

test("Topik yang tersedia tetap membawa nomor dan slug dari Jalur", () => {
  const baris = susunNavigasi(jalur, [topikTersedia("stack", 4)]);
  const stack = baris.find((b) => b.slug === "stack");

  assert.equal(stack?.nomor, 4);
  assert.equal(stack?.slug, "stack");
});

test("judul diambil dari Jalur, bukan dari berkas Topik", () => {
  // Berkas Topik sengaja diberi judul berbeda. Sidebar harus memakai judul Jalur,
  // karena itu daftar yang berlaku untuk seluruh situs.
  const baris = susunNavigasi(jalur, [topikTersedia("stack", 4)]);
  const stack = baris.find((b) => b.slug === "stack");

  assert.equal(stack?.judul.id, "Stack");
});

test("urutan masukan tidak menentukan urutan keluaran", () => {
  const terbalik = [...jalur].reverse();
  const baris = susunNavigasi(terbalik, []);

  assert.deepEqual(
    baris.map((b) => b.nomor),
    [1, 2, 3, 4],
  );
});

test("berkas Topik yang tidak ada di Jalur tidak menambah baris", () => {
  const baris = susunNavigasi(jalur, [topikTersedia("entah", 99)]);

  assert.equal(baris.length, 4);
  assert.equal(
    baris.some((b) => b.slug === "entah"),
    false,
  );
});
