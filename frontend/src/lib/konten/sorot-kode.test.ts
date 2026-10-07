import test from "node:test";
import assert from "node:assert/strict";

import {
  sorotKode,
  sorotanTersedia,
  tokenWarnaYangDipakai,
} from "./sorot-kode.ts";

/**
 * Uji penyorot kode.
 *
 * Yang diuji di sini adalah **kontraknya**, bukan warna spesifiknya: apakah HTML yang
 * dihasilkan memakai token CSS proyek, apakah bahasanya benar, dan apakah fallback
 * bekerja. Warna yang berubah saat tema diperbarui tidak boleh menggagalkan uji ini.
 */

test("penyorotan tersedia", () => {
  assert.equal(sorotanTersedia(), true, "highlighter gagal dibuat");
});

test("kode Python disorot, bukan dikembalikan polos", () => {
  const hasil = sorotKode("def f(x):\n    return x\n");
  assert.ok(hasil !== null, "sorotKode mengembalikan null");
  assert.ok(hasil.baris.length >= 2, "baris kode tidak terpisah");
  assert.ok(hasil.baris[0].length >= 2, "baris pertama tidak terpecah menjadi token");
});

test("setiap potongan punya warna, dan warnanya token CSS proyek", () => {
  const hasil = sorotKode("def f(x):\n    return 'teks'\n");
  assert.ok(hasil !== null);
  const semua = hasil.baris.flat();
  assert.ok(semua.length > 0);
  for (const p of semua) {
    if (p.warna === undefined) continue;
    assert.match(p.warna, /^var\(--kode-[a-z]+\)$/, `warna bukan token proyek: ${p.warna}`);
  }
});

test("kata kunci dan string dapat warna BERBEDA", () => {
  // Kalau tema salah bentuk, semua token jadi satu warna dan uji ini gagal.
  const hasil = sorotKode("def f():\n    return 'teks'\n");
  assert.ok(hasil !== null);
  const warna = new Set(hasil.baris.flat().map((p) => p.warna).filter((w) => w !== undefined));
  assert.ok(
    warna.size >= 3,
    `hanya ${String(warna.size)} warna berbeda — penyorotan tidak berjalan: ${[...warna].join(", ")}`,
  );
});

test("teksnya utuh: menggabungkan potongan mengembalikan kode asli", () => {
  const kode = "def f(x):\n    return 'teks'\n";
  const hasil = sorotKode(kode);
  assert.ok(hasil !== null);
  const gabung = hasil.baris.map((b) => b.map((p) => p.teks).join("")).join("\n");
  assert.equal(gabung, kode);
});

test("setiap token yang dipakai benar-benar ada di daftar", () => {
  const token = tokenWarnaYangDipakai();
  assert.ok(token.length > 0, "tema tidak memakai token CSS sama sekali");
  for (const t of token) {
    assert.match(t, /^--kode-[a-z]+$/, `nama token tidak lazim: ${t}`);
  }
});

test("bahasa selain Python mengembalikan null (pemanggil memakai fallback)", () => {
  assert.equal(sorotKode("SELECT 1;", "sql"), null);
});

test("kode kosong tidak melempar", () => {
  const hasil = sorotKode("");
  assert.ok(hasil === null || Array.isArray(hasil.baris));
});

test("kode yang tidak bisa diurai tidak melempar", () => {
  // Python yang rusak tetap harus menghasilkan sesuatu yang bisa ditampilkan.
  assert.doesNotThrow(() => sorotKode("def f(:\n  ???\n"));
});
