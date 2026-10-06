/**
 * Uji aturan status Topik.
 *
 * Ini aturan yang menggambar ○ ◐ ● di sidebar. Salah di sini tidak memunculkan error
 * apa pun — sidebar hanya menampilkan status yang keliru, dan pemelajar mengira
 * Progresnya memang begitu. Karena itu setiap cabang aturannya diuji langsung, tanpa
 * merender React.
 */

import test from "node:test";
import assert from "node:assert/strict";

import type { BarisProgres } from "../api.ts";
import { petaStatus, statusTopik } from "./status.ts";

/** Satu baris Progres, dengan nilai bawaan yang bisa ditimpa. */
function baris(
  soal_indeks: number,
  status: BarisProgres["status"],
  percobaan: number,
): BarisProgres {
  return {
    topik_slug: "stack",
    soal_indeks,
    percobaan,
    benar_terakhir: status === "selesai" ? "2026-10-06T00:00:00Z" : null,
    status,
  };
}

test("tanpa baris dan belum ada Soal berarti belum", () => {
  assert.equal(statusTopik([], 0), "belum");
});

test("tanpa baris tetapi Topik punya Soal berarti belum", () => {
  assert.equal(statusTopik([], 6), "belum");
});

test("satu percobaan salah berarti sedang", () => {
  assert.equal(statusTopik([baris(0, "sedang", 1)], 6), "sedang");
});

test("sebagian Soal benar tetapi belum semua berarti sedang", () => {
  const barisnya = [baris(0, "selesai", 1), baris(1, "sedang", 2)];
  assert.equal(statusTopik(barisnya, 6), "sedang");
});

test("seluruh Soal benar berarti selesai", () => {
  const barisnya = Array.from({ length: 6 }, (_, i) => baris(i, "selesai", 1));
  assert.equal(statusTopik(barisnya, 6), "selesai");
});

test("satu Soal benar dari enam TIDAK berarti selesai", () => {
  // Inilah cacat yang dicegah `jumlahSoal`: baris hanya ada untuk Soal yang pernah
  // disentuh, jadi panjangnya tidak boleh dipakai sebagai "jumlah Soal".
  assert.equal(statusTopik([baris(0, "selesai", 1)], 6), "sedang");
});

test("selesai menang atas percobaan salah yang menyusul", () => {
  // Backend tidak pernah mengosongkan `benar_terakhir`, tetapi barisnya bisa punya
  // `percobaan` besar dengan status tetap selesai.
  const barisnya = [
    baris(0, "selesai", 9),
    baris(1, "selesai", 1),
    baris(2, "selesai", 1),
    baris(3, "selesai", 1),
    baris(4, "selesai", 1),
    baris(5, "selesai", 1),
  ];
  assert.equal(statusTopik(barisnya, 6), "selesai");
});

test("baris berlebih tidak menghalangi selesai", () => {
  // Baris yang tertinggal dari berkas lama (Soal dihapus) tidak boleh membuat Topik
  // mustahil selesai.
  const barisnya = Array.from({ length: 8 }, (_, i) => baris(i, "selesai", 1));
  assert.equal(statusTopik(barisnya, 6), "selesai");
});

test("baris dengan percobaan nol dan status belum tidak menghitung sedang", () => {
  assert.equal(statusTopik([baris(0, "belum", 0)], 6), "belum");
});

test("petaStatus memakai jumlah Soal per Topik, bukan panjang barisnya", () => {
  const peta = petaStatus(
    [baris(0, "selesai", 1), { ...baris(0, "selesai", 1), topik_slug: "big-o" }],
    { stack: 6, "big-o": 6, queue: 6 },
  );

  assert.deepEqual(peta, { stack: "sedang", "big-o": "sedang", queue: "belum" });
});

test("petaStatus mengabaikan baris slug yang tidak dikenal", () => {
  const peta = petaStatus([{ ...baris(0, "selesai", 1), topik_slug: "entah" }], {
    stack: 6,
  });

  assert.deepEqual(peta, { stack: "belum" });
});

test("petaStatus menghitung selesai untuk Topik yang semua Soalnya benar", () => {
  const barisnya = Array.from({ length: 6 }, (_, i) => baris(i, "selesai", 1));
  const peta = petaStatus(barisnya, { stack: 6 });

  assert.deepEqual(peta, { stack: "selesai" });
});
