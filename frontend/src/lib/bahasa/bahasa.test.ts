/**
 * Uji aturan bahasa.
 *
 * Yang paling penting di sini adalah dua fungsi yang menyusun URL: [`bahasaDariPathname`]
 * dan [`gantiBahasa`]. Keduanya harus menjadi kebalikan satu sama lain, dan
 * ketidakcocokannya tidak akan menghasilkan error — hanya pengalih bahasa yang
 * membawa pemakai ke halaman yang salah. Karena itu kebalikannya diuji langsung.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  BAHASA,
  BAHASA_BAWAAN,
  KUNCI_BAHASA,
  NAMA_BAHASA,
  adalahBahasa,
  bahasaDariPathname,
  bacaBahasa,
  gantiBahasa,
  simpanPilihanBahasa,
} from "./bahasa.ts";

test("bahasa bawaan adalah Indonesia", () => {
  // User story 66: antarmuka situs berbahasa Indonesia supaya terasa milik sendiri.
  assert.equal(BAHASA_BAWAAN, "id");
});

test("nilai yang tidak dikenal berarti bahasa bawaan", () => {
  // Cookie yang belum ada, kosong, atau rusak diperlakukan sama: belum memilih.
  assert.equal(bacaBahasa(null), BAHASA_BAWAAN);
  assert.equal(bacaBahasa(undefined), BAHASA_BAWAAN);
  assert.equal(bacaBahasa(""), BAHASA_BAWAAN);
  assert.equal(bacaBahasa("fr"), BAHASA_BAWAAN);
  // Nilai lama dari versi yang berbeda tidak boleh menjatuhkan halaman.
  assert.equal(bacaBahasa("EN"), BAHASA_BAWAAN);
});

test("setiap bahasa yang sah dikembalikan apa adanya", () => {
  for (const bahasa of BAHASA) {
    assert.equal(bacaBahasa(bahasa), bahasa);
    assert.ok(adalahBahasa(bahasa));
  }
});

test("adalahBahasa menolak yang bukan bahasa", () => {
  assert.equal(adalahBahasa(null), false);
  assert.equal(adalahBahasa(undefined), false);
  assert.equal(adalahBahasa(1), false);
  assert.equal(adalahBahasa("idn"), false);
});

test("bahasa dibaca dari segmen pertama pathname", () => {
  assert.equal(bahasaDariPathname("/id"), "id");
  assert.equal(bahasaDariPathname("/en/topik/stack"), "en");
  assert.equal(bahasaDariPathname("/id/topik/stack"), "id");
});

test("pathname tanpa bahasa menghasilkan null, bukan tebakan", () => {
  // `null` menandakan kesalahan (halaman seharusnya selalu di bawah /[bahasa]),
  // bukan nilai yang diam-diam ditebak menjadi bahasa bawaan.
  assert.equal(bahasaDariPathname("/"), null);
  assert.equal(bahasaDariPathname("/topik/stack"), null);
  assert.equal(bahasaDariPathname("/fr/topik/stack"), null);
});

test("gantiBahasa menukar bahasa dan mempertahankan halaman", () => {
  // Inti pengalih bahasa: pindah bahasa tidak memindahkan halaman.
  assert.equal(gantiBahasa("/id/topik/stack", "en"), "/en/topik/stack");
  assert.equal(gantiBahasa("/en/topik/stack", "id"), "/id/topik/stack");
  assert.equal(gantiBahasa("/id", "en"), "/en");
});

test("gantiBahasa adalah kebalikan dirinya sendiri", () => {
  // Menukar ke bahasa lain lalu kembali harus menghasilkan pathname semula.
  for (const pathname of ["/id/topik/stack", "/en/topik/stack", "/id", "/en"]) {
    const asal = bahasaDariPathname(pathname);
    assert.ok(asal, `${pathname} harus punya bahasa`);
    const lain = asal === "id" ? "en" : "id";
    assert.equal(gantiBahasa(gantiBahasa(pathname, lain), asal), pathname);
  }
});

test("gantiBahasa pada pathname tanpa bahasa memberi awalan", () => {
  // Jaring pengaman: halaman yang dirender selalu berbahasa, tetapi fungsi ini tetap
  // benar kalau dipanggil dari luar /[bahasa].
  assert.equal(gantiBahasa("/topik/stack", "en"), "/en/topik/stack");
  assert.equal(gantiBahasa("/", "en"), "/en");
});

test("setiap bahasa punya nama yang ditulis dalam bahasanya sendiri", () => {
  assert.equal(NAMA_BAHASA.id, "Indonesia");
  assert.equal(NAMA_BAHASA.en, "English");
});

test("kunci cookie bahasa adalah satu nilai yang tetap", () => {
  // Diuji supaya kunci ini tidak bisa berubah tanpa disadari: proxy.ts dan pengalih
  // bahasa harus memakai kunci yang sama, dan salah ketik di salah satunya senyap.
  assert.equal(KUNCI_BAHASA, "dsa-bahasa");
});

/**
 * `document` palsu yang hanya mencatat nilai `document.cookie`.
 *
 * `simpanPilihanBahasa` menulis lewat penyetel `document.cookie`, jadi objek biasa
 * dengan properti yang bisa ditulis sudah cukup — tidak perlu DOM sungguhan.
 */
function dokumenPalsu(): { document: { cookie: string } } {
  return { document: { cookie: "" } };
}

test("simpanPilihanBahasa menulis cookie dengan atribut yang benar", () => {
  // Kriteria penerimaan #4 ("pilihan bahasa diingat") bergantung pada cookie ini
  // ditulis dengan atribut yang membuatnya bertahan. Yang diuji bukan hanya nilainya,
  // tetapi juga `path=/` dan `max-age`, karena tanpa keduanya cookie hilang lebih
  // cepat daripada yang diinginkan, dan pilihan tidak terasa "diingat".
  const { document } = dokumenPalsu();
  const global = globalThis as unknown as { document?: unknown };
  global.document = document;
  try {
    assert.equal(simpanPilihanBahasa("en"), true);
    assert.match(document.cookie, /^dsa-bahasa=en/);
    assert.match(document.cookie, /path=\//);
    assert.match(document.cookie, /max-age=\d+/);
    // `secure` sengaja tidak dipasang: di pengembangan situs disajikan lewat http,
    // dan cookie `secure` akan diabaikan di sana.
    assert.doesNotMatch(document.cookie, /secure/);
  } finally {
    delete global.document;
  }
});

test("simpanPilihanBahasa tidak menjatuhkan server", () => {
  // Tanpa `document`, fungsi ini harus mengembalikan `false`, bukan melempar: ia
  // hidup di modul yang juga diimpor berkas sisi server.
  assert.equal(simpanPilihanBahasa("id"), false);
});
