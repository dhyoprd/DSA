/**
 * Uji penyandi CSV.
 *
 * Aturannya mengikuti RFC 4180, yang juga disebut manual Anki. Yang diuji: kapan
 * sebuah sel dikutip, dan bagaimana tanda kutip di dalamnya di-escape. Ini penting
 * karena sel yang salah dikutip akan memecah kolom di Anki — kartunya masuk dengan
 * jumlah kolom yang salah, dan itu baru ketahuan setelah impor.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { barisCsv, selCsv } from "./csv.ts";

test("sel biasa tidak dikutip", () => {
  assert.equal(selCsv("O(1)"), "O(1)");
  assert.equal(selCsv("Stack (array)"), "Stack (array)");
});

test("sel dengan koma dikutip", () => {
  assert.equal(selCsv("Last In, First Out"), '"Last In, First Out"');
});

test("sel dengan tanda kutip di-escape dengan menggandakan", () => {
  assert.equal(selCsv('katanya "ini"'), '"katanya ""ini"""');
});

test("sel dengan baris baru dikutip", () => {
  assert.equal(selCsv("baris satu\nbaris dua"), '"baris satu\nbaris dua"');
});

test("sel dengan CR dikutip", () => {
  // Berkas yang disusun di Windows bisa memuat CRLF; sel yang memuatnya harus dikutip.
  assert.equal(selCsv("a\r\nb"), '"a\r\nb"');
});

test("sel kosong tetap kosong", () => {
  assert.equal(selCsv(""), "");
});

test("baris menggabungkan sel dengan koma", () => {
  assert.equal(barisCsv(["Kompleksitas waktu — Stack", "O(1)", "kompleksitas stack"]),
    "Kompleksitas waktu — Stack,O(1),kompleksitas stack");
});

test("baris mengutip hanya sel yang perlu", () => {
  assert.equal(
    barisCsv(["Definisi — LIFO", "Last In, First Out", "istilah stack"]),
    'Definisi — LIFO,"Last In, First Out",istilah stack',
  );
});
