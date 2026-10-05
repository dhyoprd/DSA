/**
 * Uji penilaian Kuis dan aturan Pembahasan.
 *
 * Ini bagian yang paling senyap kalau salah: jawaban benar yang ditandai salah tidak
 * memunculkan error apa pun, dan pemelajar akan mengira dirinya yang keliru. Karena
 * itu setiap aturan di `penilaian.ts` diuji langsung, tanpa merender komponen.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  bukaPembahasan,
  keadaanAwal,
  keadaanDariTulisanTersimpan,
  kotakPenjelasanTampil,
  nilaiJawaban,
  pembahasanTerbuka,
  type KeadaanKuis,
} from "./penilaian.ts";

test("keadaan awal belum dicoba dan belum benar", () => {
  const keadaan = keadaanAwal();

  assert.equal(keadaan.percobaan, 0);
  assert.equal(keadaan.benar, false);
  assert.equal(keadaan.indeksSalahTerakhir, null);
  assert.equal(keadaan.pembahasanDibuka, false);
});

test("jawaban benar menandai benar dan menghitung satu percobaan", () => {
  const keadaan = nilaiJawaban(keadaanAwal(), 2, 2);

  assert.equal(keadaan.benar, true);
  assert.equal(keadaan.percobaan, 1);
});

test("jawaban salah tidak menandai benar dan menyimpan pilihan salah", () => {
  const keadaan = nilaiJawaban(keadaanAwal(), 0, 2);

  assert.equal(keadaan.benar, false);
  assert.equal(keadaan.percobaan, 1);
  assert.equal(keadaan.indeksSalahTerakhir, 0);
});

test("percobaan bertambah setiap kali, sampai jawaban benar", () => {
  let keadaan = keadaanAwal();

  keadaan = nilaiJawaban(keadaan, 0, 3);
  assert.equal(keadaan.percobaan, 1);
  assert.equal(keadaan.indeksSalahTerakhir, 0);

  keadaan = nilaiJawaban(keadaan, 1, 3);
  assert.equal(keadaan.percobaan, 2);
  // Pilihan salah terakhir yang disorot adalah yang baru, bukan yang lama.
  assert.equal(keadaan.indeksSalahTerakhir, 1);

  keadaan = nilaiJawaban(keadaan, 3, 3);
  assert.equal(keadaan.percobaan, 3);
  assert.equal(keadaan.benar, true);
});

test("jawaban salah boleh dicoba lagi tanpa batas", () => {
  let keadaan = keadaanAwal();
  for (let i = 0; i < 10; i += 1) {
    keadaan = nilaiJawaban(keadaan, 0, 2);
  }

  assert.equal(keadaan.percobaan, 10);
  assert.equal(keadaan.benar, false);
});

test("setelah benar, pengiriman berikutnya tidak mengubah apa pun", () => {
  const benar = nilaiJawaban(keadaanAwal(), 2, 2);
  const lagi = nilaiJawaban(benar, 2, 2);

  assert.deepEqual(lagi, benar, "klik ganda menghitung percobaan dua kali");
  assert.equal(lagi.percobaan, 1);
});

test("indeks salah terakhir dibersihkan setelah benar", () => {
  let keadaan = nilaiJawaban(keadaanAwal(), 0, 2);
  assert.equal(keadaan.indeksSalahTerakhir, 0);

  keadaan = nilaiJawaban(keadaan, 2, 2);
  assert.equal(keadaan.indeksSalahTerakhir, null);
});

test("Pembahasan tertutup sebelum benar dan terbuka setelah tombol ditekan", () => {
  const awal = keadaanAwal();
  assert.equal(pembahasanTerbuka(awal), false);

  const salah = nilaiJawaban(awal, 0, 2);
  assert.equal(pembahasanTerbuka(salah), false, "Pembahasan bocor sebelum benar");

  const benar = nilaiJawaban(salah, 2, 2);
  assert.equal(pembahasanTerbuka(benar), false, "Pembahasan bocor sebelum tombol ditekan");

  assert.equal(pembahasanTerbuka(bukaPembahasan(benar)), true);
});

test("Pembahasan tetap tertutup berapa kali pun salah", () => {
  let keadaan: KeadaanKuis = keadaanAwal();
  for (let i = 0; i < 5; i += 1) {
    keadaan = nilaiJawaban(keadaan, 0, 3);
    assert.equal(pembahasanTerbuka(keadaan), false);
  }
});

// --- Pembahasan di balik tombol, dan Kotak Penjelasan (ticket #8) --------------

test("jawaban benar belum membuka Pembahasan", () => {
  // Ini inti perubahan ticket #8. Sebelumnya jawaban benar langsung membuka
  // Pembahasan; sekarang ada satu langkah di antaranya — menulis alasan dulu.
  const benar = nilaiJawaban(keadaanAwal(), 2, 2);

  assert.equal(benar.benar, true);
  assert.equal(pembahasanTerbuka(benar), false, "Pembahasan bocor begitu jawaban benar");
});

test("menekan tombol membuka Pembahasan setelah benar", () => {
  const benar = nilaiJawaban(keadaanAwal(), 2, 2);
  const dibuka = bukaPembahasan(benar);

  assert.equal(dibuka.pembahasanDibuka, true);
  assert.equal(pembahasanTerbuka(dibuka), true);
});

test("menekan tombol sebelum benar tidak membuka apa pun", () => {
  // Tombolnya memang belum ada di antarmuka sebelum benar, tetapi aturannya tetap
  // ditegakkan di sini: satu tempat yang lupa memasang tombolnya tidak boleh cukup
  // untuk membocorkan jawaban.
  const salah = nilaiJawaban(keadaanAwal(), 0, 2);

  assert.equal(pembahasanTerbuka(bukaPembahasan(salah)), false);
});

test("menekan tombol dua kali tidak mengubah apa pun", () => {
  const benar = nilaiJawaban(keadaanAwal(), 2, 2);
  const sekali = bukaPembahasan(benar);

  assert.deepEqual(bukaPembahasan(sekali), sekali);
});

test("menjawab lagi setelah benar tidak menutup Pembahasan yang sudah dibuka", () => {
  // `nilaiJawaban` mengembalikan keadaan apa adanya kalau sudah benar, sehingga
  // status Pembahasan tidak bisa berubah karena klik tambahan.
  const dibuka = bukaPembahasan(nilaiJawaban(keadaanAwal(), 2, 2));

  assert.deepEqual(nilaiJawaban(dibuka, 0, 2), dibuka);
  assert.equal(pembahasanTerbuka(nilaiJawaban(dibuka, 0, 2)), true);
});

test("Kotak Penjelasan muncul setelah benar, tanpa menunggu Pembahasan dibuka", () => {
  const awal = keadaanAwal();
  assert.equal(kotakPenjelasanTampil(awal), false);

  const salah = nilaiJawaban(awal, 0, 2);
  assert.equal(kotakPenjelasanTampil(salah), false, "kotak muncul sebelum benar");

  const benar = nilaiJawaban(salah, 2, 2);
  assert.equal(kotakPenjelasanTampil(benar), true);
  // Dan memang muncul sebelum Pembahasan: itu urutan yang diminta user story 26–27.
  assert.equal(pembahasanTerbuka(benar), false);
});

test("keadaan dari tulisan tersimpan dianggap sudah benar", () => {
  // Kriteria penerimaan #8: "Tulisan muncul kembali saat Kuis itu dibuka lagi".
  // Setelah muat ulang, `benar` hilang dari memori; tulisan yang tersimpan itulah
  // buktinya bahwa jawabannya sudah pernah benar.
  const dipulihkan = keadaanDariTulisanTersimpan();

  assert.equal(dipulihkan.benar, true);
  assert.equal(kotakPenjelasanTampil(dipulihkan), true);
});

test("pemulihan tidak ikut membuka Pembahasan", () => {
  // Pemelajar memulihkan tulisannya, bukan otomatis membaca Pembahasan. Ia tetap
  // harus menekan tombolnya, sama seperti setelah menjawab benar.
  assert.equal(pembahasanTerbuka(keadaanDariTulisanTersimpan()), false);
});

test("pemulihan tidak mengarang jumlah percobaan", () => {
  // Jumlah percobaan hidup di Progres, dan itu belum tersambung ke tampilan. Angka
  // karangan akan menampilkan hitungan yang salah, jadi dibiarkan 0.
  assert.equal(keadaanDariTulisanTersimpan().percobaan, 0);
});
