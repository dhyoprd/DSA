/**
 * Uji penyusunan kartu hafalan.
 *
 * Yang diuji: fakta mana yang menghasilkan kartu, apa isi depannya, dan tag apa yang
 * menempel. Aturan yang paling mudah salah dan paling mahal adalah **keunikan sisi
 * depan**: Anki menentukan keunikan catatan dari kolom pertama, jadi dua kartu dengan
 * depan sama akan ditolak sebagai duplikat saat impor.
 */

import test from "node:test";
import assert from "node:assert/strict";

import type { Topik } from "../konten/tipe.ts";
import { kamusUntuk } from "../bahasa/kamus.ts";
import {
  TAG_ISTILAH,
  TAG_ISTILAH_ID_EN,
  TAG_KOMPLEKSITAS,
  kartuDariTopik,
  kartuIstilah,
  kartuKompleksitas,
  kartuSemua,
} from "./kartu.ts";

/** Topik minimal yang punya satu struktur (dua operasi) dan dua istilah. */
function topikUji(): Topik {
  return {
    nomor: 4,
    slug: "stack",
    judul: { id: "Stack & Queue", en: "Stack & Queue" },
    prasyarat: [3],
    materi: { id: "Materi", en: "Material" },
    kompleksitas: [
      {
        struktur: { id: "Stack (array)", en: "Stack (array)" },
        ruang: "O(n)",
        operasi: [
          { nama: { id: "Tambah elemen (push)", en: "Add element (push)" }, waktu: "O(1)" },
          { nama: { id: "Cari satu nilai", en: "Find one value" }, waktu: "O(n)" },
        ],
      },
    ],
    istilah: [
      {
        istilah: { id: "Tumpukan", en: "Stack" },
        definisi: { id: "Struktur LIFO.", en: "A LIFO structure." },
      },
      {
        // Tanpa padanan Indonesia: kedua sisinya sama.
        istilah: { id: "LIFO", en: "LIFO" },
        definisi: { id: "Last In, First Out.", en: "Last In, First Out." },
      },
    ],
    soal: [],
  };
}

// --- Kompleksitas --------------------------------------------------------------

test("kompleksitas menghasilkan satu kartu ruang per struktur", () => {
  const kartu = kartuKompleksitas(topikUji(), "id");
  const kamus = kamusUntuk("id");
  const ruang = kartu.find((k) => k.depan.startsWith(kamus.eksporKompleksitasRuang));

  assert.ok(ruang, "kartu kompleksitas ruang harus ada");
  assert.equal(ruang.belakang, "O(n)");
  assert.deepEqual(ruang.tag, [TAG_KOMPLEKSITAS, "stack"]);
});

test("kompleksitas menghasilkan satu kartu waktu per operasi", () => {
  const kartu = kartuKompleksitas(topikUji(), "id");
  const kamus = kamusUntuk("id");
  const waktu = kartu.filter((k) => k.depan.startsWith(kamus.eksporKompleksitasWaktu));

  assert.equal(waktu.length, 2, "dua operasi berarti dua kartu waktu");
  assert.deepEqual(
    waktu.map((k) => k.belakang).sort(),
    ["O(1)", "O(n)"],
  );
});

test("sisi depan kartu waktu menyebut struktur dan operasinya", () => {
  const kartu = kartuKompleksitas(topikUji(), "en");
  const kamus = kamusUntuk("en");
  const cari = kartu.find((k) => k.depan.includes("Find one value"));

  assert.ok(cari);
  assert.ok(cari.depan.includes("Stack (array)"), "struktur ikut di depan");
  assert.ok(cari.depan.startsWith(kamus.eksporKompleksitasWaktu));
});

// --- Istilah -------------------------------------------------------------------

test("istilah menghasilkan kartu definisi dan kartu pasangan", () => {
  const kartu = kartuIstilah(topikUji(), "id");
  const kamus = kamusUntuk("id");

  const definisi = kartu.filter((k) => k.depan.startsWith(kamus.eksporDefinisi));
  const pasangan = kartu.filter((k) => k.depan.startsWith(kamus.eksporPasanganIstilah));

  // Dua istilah, keduanya dapat kartu definisi.
  assert.equal(definisi.length, 2);
  // Hanya "Tumpukan/Stack" yang berbeda kedua sisinya, jadi hanya satu kartu pasangan.
  assert.equal(pasangan.length, 1);
  assert.equal(pasangan[0].belakang, "Stack");
  assert.deepEqual(pasangan[0].tag, [TAG_ISTILAH_ID_EN, "stack"]);
});

test("istilah tanpa padanan tidak menghasilkan kartu pasangan", () => {
  // "LIFO" sama di kedua bahasa. Kartu "LIFO → LIFO" tidak menguji apa pun, jadi
  // tidak boleh dibuat — tetapi definisinya tetap dibuat.
  const kartu = kartuIstilah(topikUji(), "id");
  const kamus = kamusUntuk("id");
  const pasangan = kartu.filter((k) => k.depan.startsWith(kamus.eksporPasanganIstilah));

  assert.equal(pasangan.length, 1, "hanya satu pasangan yang berbeda kedua sisinya");
  assert.ok(!pasangan.some((k) => k.belakang === k.depan.split(" — ")[1]));
});

test("kartu pasangan dibalik mengikuti bahasa", () => {
  const id = kartuIstilah(topikUji(), "id").find((k) => k.tag.includes(TAG_ISTILAH_ID_EN));
  const en = kartuIstilah(topikUji(), "en").find((k) => k.tag.includes(TAG_ISTILAH_ID_EN));

  assert.ok(id && en);
  assert.ok(id.depan.endsWith("Tumpukan"), "di Indonesia, depan istilah Indonesia");
  assert.equal(id.belakang, "Stack");
  assert.ok(en.depan.endsWith("Stack"), "di English, depan istilah English");
  assert.equal(en.belakang, "Tumpukan");
});

test("kartu definisi memakai definisi bahasa yang berlaku", () => {
  const kartu = kartuIstilah(topikUji(), "en");
  const kamus = kamusUntuk("en");
  const definisi = kartu.find((k) => k.depan.endsWith("Stack") && k.depan.startsWith(kamus.eksporDefinisi));

  assert.ok(definisi);
  assert.equal(definisi.belakang, "A LIFO structure.");
  assert.deepEqual(definisi.tag, [TAG_ISTILAH, "stack"]);
});

// --- Keunikan sisi depan -------------------------------------------------------

test("tidak ada dua kartu dengan sisi depan sama", () => {
  // Anki memakai kolom pertama untuk menentukan keunikan. Dua kartu berdepan sama
  // akan ditolak sebagai duplikat — dan itu berarti "impor tanpa penyuntingan" gagal.
  // Awalan jenis kartu yang membuat ini tidak terjadi: tanpa itu, kartu definisi dan
  // kartu pasangan sebuah istilah sama-sama berdepan "Tumpukan".
  const kartu = kartuDariTopik(topikUji(), "id");
  const depan = kartu.map((k) => k.depan);

  assert.equal(new Set(depan).size, depan.length, "ada sisi depan yang kembar");
});

// --- Seluruh Topik -------------------------------------------------------------

test("kartuSemua menggabungkan kartu setiap Topik", () => {
  const kartu = kartuSemua([topikUji(), topikUji()], "id");
  assert.equal(kartu.length, kartuDariTopik(topikUji(), "id").length * 2);
});

test("setiap kartu punya tag jenis dan slug Topik", () => {
  for (const kartu of kartuDariTopik(topikUji(), "id")) {
    assert.equal(kartu.tag.length, 2, "tag jenis + slug Topik");
    assert.equal(kartu.tag[1], "stack");
    for (const tag of kartu.tag) {
      assert.ok(!tag.includes(" "), `tag memuat spasi: ${tag}`);
    }
  }
});
