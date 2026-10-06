/**
 * Uji penerjemahan hasil Eksekusi Kode.
 *
 * Yang paling penting diuji di sini: pesan timeout **berbeda** dari pesan galat
 * sintaks (kriteria penerimaan #10), dan jumlah kasus yang dilaporkan cocok dengan
 * isinya. Salah di sini berarti pemelajar melihat pesan yang menyesatkan tanpa error
 * apa pun.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { ringkas, teksNilai, type KalimatEksekusi } from "./ringkasan.ts";
import type { HasilEksekusi, HasilKasus, StatusEksekusi } from "./tipe.ts";

/** Kalimat uji: nilainya sengaja unik supaya bisa dicocokkan di asersi. */
const KALIMAT: KalimatEksekusi = {
  ringkasan: "LULUS {lulus} DARI {total}",
  semuaLulus: "SEMUA-LULUS",
  galatSintaks: "KALIMAT-SINTAKS",
  galatJalan: "KALIMAT-JALAN",
  lewatWaktu: "KALIMAT-LEWAT-WAKTU",
  kontainerGagal: "KALIMAT-KONTAINER",
  galatLayanan: "KALIMAT-LAYANAN",
  nilaiTidakTersedia: "TIDAK-ADA",
  masukan: "Masukan",
  hasilDihasilkan: "Hasil",
  hasilDiharapkan: "Diharapkan",
  cetakan: "Cetakan",
  lulus: "Lulus",
  gagal: "Gagal",
};

function kasus(lulus: boolean, indeks = 0): HasilKasus {
  return {
    indeks,
    argumen: [indeks],
    diharapkan: indeks,
    hasil: lulus ? indeks : -1,
    lulus,
    galat: null,
    keluaran: "",
  };
}

function hasil(status: StatusEksekusi, kasusList: HasilKasus[], pesan: string | null = null): HasilEksekusi {
  return { status, kasus: kasusList, keluaran: "", pesan };
}

// --- Jalur selesai dinilai -----------------------------------------------------

test("semua kasus lulus memakai kalimat semua-lulus", () => {
  const r = ringkas(hasil("ok", [kasus(true, 0), kasus(true, 1)]), KALIMAT);

  assert.equal(r.dinilai, true);
  assert.equal(r.semuaLulus, true);
  assert.equal(r.jumlahLulus, 2);
  assert.equal(r.jumlahKasus, 2);
  assert.equal(r.pesan, KALIMAT.semuaLulus);
});

test("sebagian lulus menyebut jumlahnya", () => {
  const r = ringkas(hasil("ok", [kasus(true, 0), kasus(false, 1), kasus(false, 2)]), KALIMAT);

  assert.equal(r.dinilai, true);
  assert.equal(r.semuaLulus, false);
  assert.equal(r.jumlahLulus, 1);
  assert.equal(r.jumlahKasus, 3);
  assert.equal(r.pesan, "LULUS 1 DARI 3");
});

test("nol kasus tidak dianggap semua lulus", () => {
  // Kode yang berjalan tanpa error tetapi tidak punya test case bukan "lulus".
  // Menganggapnya lulus akan memberi tahu pemelajar bahwa kodenya benar padahal
  // tidak ada yang diuji.
  const r = ringkas(hasil("ok", []), KALIMAT);

  assert.equal(r.semuaLulus, false);
  assert.equal(r.pesan, "LULUS 0 DARI 0");
});

test("rincian backend tidak ditampilkan saat dinilai", () => {
  // Catatan internal runner bukan informasi yang berguna bagi pemelajar; yang
  // berguna adalah jumlah kasusnya.
  const r = ringkas(hasil("ok", [kasus(true)], "catatan internal"), KALIMAT);

  assert.equal(r.rincian, null);
});

// --- Pembeda pesan: inti kriteria #10 ------------------------------------------

test("pesan lewat-waktu berbeda dari pesan galat sintaks", () => {
  // Kriteria penerimaan #10: "Pesan timeout jelas berbeda dari pesan kesalahan
  // sintaks". Uji ini mengikat perbedaan itu supaya tidak bisa hilang tanpa sengaja.
  const lewatWaktu = ringkas(hasil("lewat-waktu", [], "berjalan > 5 detik"), KALIMAT);
  const sintaks = ringkas(hasil("galat-sintaks", [], "invalid syntax (baris 1)"), KALIMAT);

  assert.notEqual(lewatWaktu.pesan, sintaks.pesan);
  assert.equal(lewatWaktu.pesan, KALIMAT.lewatWaktu);
  assert.equal(sintaks.pesan, KALIMAT.galatSintaks);
});

test("rincian dari backend diteruskan supaya sebabnya terlihat", () => {
  const r = ringkas(hasil("galat-sintaks", [], "invalid syntax (baris 3)"), KALIMAT);

  assert.equal(r.dinilai, false);
  assert.equal(r.rincian, "invalid syntax (baris 3)");
});

test("setiap status galat punya kalimatnya sendiri", () => {
  // Status yang jatuh ke kalimat yang salah berarti pemelajar disarankan memperbaiki
  // hal yang tidak salah.
  const peta: [StatusEksekusi, string][] = [
    ["galat-sintaks", KALIMAT.galatSintaks],
    ["lewat-waktu", KALIMAT.lewatWaktu],
    ["galat-jalan", KALIMAT.galatJalan],
    ["kontainer-gagal", KALIMAT.kontainerGagal],
    ["galat-runner", KALIMAT.galatLayanan],
    ["galat-protokol", KALIMAT.galatLayanan],
    ["galat-docker", KALIMAT.galatLayanan],
  ];

  for (const [status, diharapkan] of peta) {
    const r = ringkas(hasil(status, []), KALIMAT);
    assert.equal(r.pesan, diharapkan, `status ${status}`);
    assert.equal(r.dinilai, false, `status ${status} tidak boleh dianggap dinilai`);
  }
});

test("status yang tidak dinilai tidak melaporkan kasus lulus", () => {
  // Walaupun backend mengirim kasus, status galat berarti kodenya tidak dinilai —
  // melaporkan "1 lulus" di sini akan menyesatkan.
  const r = ringkas(hasil("lewat-waktu", [kasus(true), kasus(true)]), KALIMAT);

  assert.equal(r.jumlahLulus, 0);
  assert.equal(r.semuaLulus, false);
});

// --- teksNilai -----------------------------------------------------------------

test("nilai ditampilkan sebagai JSON apa adanya", () => {
  // Pemelajar harus melihat apa yang sebenarnya dikembalikan kodenya.
  assert.equal(teksNilai([1, 2, 3], KALIMAT), "[1,2,3]");
  assert.equal(teksNilai(null, KALIMAT), "null");
  assert.equal(teksNilai(true, KALIMAT), "true");
  assert.equal(teksNilai("halo", KALIMAT), '"halo"');
  assert.equal(teksNilai({ a: 1 }, KALIMAT), '{"a":1}');
});

test("undefined ditampilkan sebagai label, bukan undefined", () => {
  // `JSON.stringify(undefined)` mengembalikan `undefined`, yang akan tampil sebagai
  // "undefined" di layar — teks yang membingungkan pemelajar.
  assert.equal(teksNilai(undefined, KALIMAT), KALIMAT.nilaiTidakTersedia);
});
