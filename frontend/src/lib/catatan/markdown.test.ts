/**
 * Uji penyusunan Markdown unduhan Catatan.
 *
 * Yang diuji bentuk teksnya, bukan unduhannya: memicu `<a download>` adalah urusan
 * peramban dan tidak bisa diuji di `node --test`. Yang bisa salah dan perlu dijaga
 * adalah isi berkasnya — judul ada, badan utuh, tidak ada baris kosong menggantung.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { markdownCatatan, markdownSemuaCatatan, namaBerkasCatatan } from "./markdown.ts";

test("judul ditulis sebagai heading dan badan menyusul", () => {
  assert.equal(
    markdownCatatan("Stack", "LIFO: yang terakhir masuk keluar dulu."),
    "# Stack\n\nLIFO: yang terakhir masuk keluar dulu.\n",
  );
});

test("badan kosong menghasilkan berkas berisi judul saja", () => {
  // Tanpa cabang ini, berkasnya akan berakhir dengan baris kosong menggantung.
  assert.equal(markdownCatatan("Stack", ""), "# Stack\n");
});

test("badan yang hanya spasi diperlakukan seperti kosong", () => {
  assert.equal(markdownCatatan("Stack", "   \n\n  "), "# Stack\n");
});

test("badan ditulis apa adanya, tidak di-escape", () => {
  // Tulisan pemelajar sudah Markdown. Menyuntingnya akan mengubah tulisannya, dan itu
  // justru merusak gunanya sebagai salinan.
  const badan = "## Bagian\n\n- satu\n- dua\n\n`kode` dan **tebal**";
  assert.equal(markdownCatatan("Queue", badan), `# Queue\n\n${badan}\n`);
});

test("baris baru berlebih di ujung badan dirapikan", () => {
  assert.equal(markdownCatatan("Stack", "isi\n\n\n"), "# Stack\n\nisi\n");
});

test("nama berkas memakai slug dengan akhiran .md", () => {
  assert.equal(namaBerkasCatatan("stack"), "stack.md");
});

// --- Gabungan seluruh Catatan (ticket #14) -------------------------------------

test("berkas gabungan memberi heading # dan satu ## per Topik", () => {
  const isi = markdownSemuaCatatan("Seluruh Catatan", [
    { judul: "Stack & Queue", isi: "LIFO: terakhir masuk keluar dulu." },
    { judul: "Array", isi: "Indeks mulai dari nol." },
  ]);
  assert.equal(
    isi,
    "# Seluruh Catatan\n\n" +
      "## Stack & Queue\n\nLIFO: terakhir masuk keluar dulu.\n\n" +
      "## Array\n\nIndeks mulai dari nol.\n",
  );
});

test("Topik tanpa Catatan tetap ditulis dengan headingnya", () => {
  // Kalau Topik kosong dilewati, berkasnya tidak bisa dibedakan dari berkas yang
  // Topiknya belum pernah dibuat. Bagi pemelajar keduanya berbeda.
  const isi = markdownSemuaCatatan("Seluruh Catatan", [
    { judul: "Stack & Queue", isi: "" },
  ]);
  assert.equal(isi, "# Seluruh Catatan\n\n## Stack & Queue\n");
});

test("berkas gabungan tanpa Topik hanya berisi judul", () => {
  assert.equal(markdownSemuaCatatan("Seluruh Catatan", []), "# Seluruh Catatan\n");
});

test("Catatan dengan baris baru berlebih di ujung dirapikan", () => {
  const isi = markdownSemuaCatatan("Catatan", [{ judul: "Stack", isi: "isi\n\n\n" }]);
  assert.equal(isi, "# Catatan\n\n## Stack\n\nisi\n");
});
