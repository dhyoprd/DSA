/**
 * Uji aturan validasi konten.
 *
 * Yang diuji adalah perilaku yang terlihat dari luar: diberikan sebuah nilai,
 * masalah apa yang dilaporkan. Tidak ada berkas, tidak ada YAML — validator memang
 * murni, jadi cukup objek biasa.
 *
 * Setiap kriteria penerimaan di ticket #3 punya satu uji "harus gagal" di sini.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { periksaJalur, periksaTopik } from "./periksa.ts";
import type { Kuis, SoalKode, TopikJalur } from "./tipe.ts";

// --- Bahan uji -----------------------------------------------------------------

const jalur: TopikJalur[] = [
  { nomor: 1, slug: "big-o", judul: { id: "Big-O", en: "Big-O" }, prasyarat: [] },
  { nomor: 2, slug: "array-string", judul: { id: "Array", en: "Array" }, prasyarat: [1] },
  { nomor: 3, slug: "linked-list", judul: { id: "Linked List", en: "Linked List" }, prasyarat: [2] },
  { nomor: 4, slug: "stack", judul: { id: "Stack", en: "Stack" }, prasyarat: [3] },
];

/** Satu Kuis yang sah, dengan indeks opsi yang benar bisa dipilih. */
function kuisSah(indeksBenar = 0): Kuis {
  return {
    tipe: "kuis",
    skenario: { id: "Skenario", en: "Scenario" },
    opsi: [0, 1, 2, 3].map((i) => ({
      teks: { id: `Opsi ${i}`, en: `Option ${i}` },
      benar: i === indeksBenar,
    })),
    penjelasan: { id: "Penjelasan", en: "Explanation" },
  };
}

function soalKodeSah(): SoalKode {
  return {
    tipe: "soal-kode",
    skenario: { id: "Skenario", en: "Scenario" },
    fungsi: "solve",
    test_case: [{ argumen: [[1, 2]], diharapkan: 3 }],
    solusi_referensi: "def solve(xs): return sum(xs)",
  };
}

/** Topik yang lolos semua aturan. Uji lain merusaknya satu per satu. */
function topikSah(): Record<string, unknown> {
  return {
    nomor: 4,
    slug: "stack",
    judul: { id: "Stack", en: "Stack" },
    prasyarat: [3],
    materi: { id: "Materi Indonesia", en: "English material" },
    kompleksitas: [
      {
        struktur: { id: "Stack (array)", en: "Stack (array)" },
        ruang: "O(n)",
        operasi: [
          { nama: { id: "Tambah elemen", en: "Add element" }, waktu: "O(1)" },
        ],
      },
    ],
    istilah: [
      {
        istilah: { id: "Tumpukan", en: "Stack" },
        definisi: { id: "Struktur LIFO.", en: "A LIFO structure." },
      },
    ],
    soal: [kuisSah(0), kuisSah(1), kuisSah(2), kuisSah(3), kuisSah(0), soalKodeSah()],
  };
}

function periksa(nilai: unknown) {
  return periksaTopik(nilai, { berkas: "content/stack.yaml", jalur });
}

/**
 * Apakah ada masalah yang lokasinya menunjuk `awalan` (baik `awalan` itu sendiri,
 * `awalan.field`, maupun `awalan[0]`) dan pesannya memuat `cuplikan`.
 */
function adaMasalah(
  masalah: ReturnType<typeof periksa>,
  awalan: string,
  cuplikan: string,
): boolean {
  return masalah.some(
    (m) =>
      (m.lokasi === awalan ||
        m.lokasi.startsWith(`${awalan}.`) ||
        m.lokasi.startsWith(`${awalan}[`)) &&
      m.pesan.toLowerCase().includes(cuplikan.toLowerCase()),
  );
}

// --- Jalur bahagia -------------------------------------------------------------

test("Topik yang sah tidak menghasilkan masalah", () => {
  assert.deepEqual(periksa(topikSah()), []);
});

test("materi boleh berisi Markdown panjang", () => {
  const topik = topikSah();
  (topik.materi as { id: string }).id = "## Judul\n\n```python\nx = 1\n```\n";
  assert.deepEqual(periksa(topik), []);
});

// --- Field wajib hilang --------------------------------------------------------

test("field wajib yang hilang dilaporkan", () => {
  const topik = topikSah();
  delete topik.nomor;
  delete topik.slug;
  const masalah = periksa(topik);
  assert.ok(adaMasalah(masalah, "nomor", "bilangan bulat"), "nomor harus dilaporkan");
  assert.ok(adaMasalah(masalah, "slug", "kosong"), "slug harus dilaporkan");
});

test("isi berkas yang bukan objek dilaporkan sekali", () => {
  const masalah = periksa("bukan objek");
  assert.equal(masalah.length, 1);
  assert.match(masalah[0].pesan, /harus objek/);
});

// --- Kelengkapan dua bahasa ----------------------------------------------------

test("Materi yang hanya punya satu bahasa ditolak", () => {
  const topik = topikSah();
  topik.materi = { id: "Hanya Indonesia" };
  assert.ok(
    adaMasalah(periksa(topik), "materi", "English"),
    "materi tanpa versi English harus dilaporkan",
  );
});

test("Materi dengan bahasa English kosong ditolak", () => {
  const topik = topikSah();
  topik.materi = { id: "Terisi", en: "   " };
  assert.ok(adaMasalah(periksa(topik), "materi", "English"));
});

test("judul yang tidak lengkap dua bahasa ditolak", () => {
  const topik = topikSah();
  topik.judul = { id: "Stack" };
  assert.ok(adaMasalah(periksa(topik), "judul", "English"));
});

test("Kuis dengan skenario satu bahasa ditolak", () => {
  const topik = topikSah();
  const soal = topik.soal as Kuis[];
  soal[0].skenario = { id: "Hanya Indonesia" } as Kuis["skenario"];
  assert.ok(adaMasalah(periksa(topik), "soal[0].skenario", "English"));
});

test("Kuis dengan opsi yang belum diterjemahkan ditolak", () => {
  // Ticket #12, kriteria penerimaan 5: Topik yang terjemahannya belum lengkap tidak
  // lolos gerbang build. Opsi jawaban ikut diperiksa, bukan hanya Materi — opsi
  // yang setengah diterjemahkan akan tampil sebagai teks kosong bagi pembaca bahasa
  // itu, dan itu justru kesalahan yang tidak terlihat saat membaca bahasa Indonesia.
  const topik = topikSah();
  const soal = topik.soal as Kuis[];
  soal[0].opsi[2].teks = { id: "Hanya Indonesia" } as Kuis["opsi"][number]["teks"];
  assert.ok(adaMasalah(periksa(topik), "soal[0].opsi[2].teks", "English"));
});

test("Kuis dengan Pembahasan satu bahasa ditolak", () => {
  const topik = topikSah();
  const soal = topik.soal as Kuis[];
  soal[0].penjelasan = { id: "Hanya Indonesia" } as Kuis["penjelasan"];
  assert.ok(adaMasalah(periksa(topik), "soal[0].penjelasan", "English"));
});

test("Soal Kode dengan skenario satu bahasa ditolak", () => {
  const topik = topikSah();
  const soal = topik.soal as SoalKode[];
  const kode = soal.find((s) => s.tipe === "soal-kode") as SoalKode;
  kode.skenario = { id: "Hanya Indonesia" } as SoalKode["skenario"];
  assert.ok(adaMasalah(periksa(topik), "soal[5].skenario", "English"));
});

test("seluruh field dwibahasa Topik diperiksa, bukan hanya Materi", () => {
  // Ringkasan kriteria penerimaan 5: tidak ada satu field dwibahasa pun yang boleh
  // lolos tanpa versi English-nya. Uji ini mengumpulkan lokasi masalah untuk satu
  // Topik yang **setiap** teks dwibahasanya tinggal Indonesia, lalu memastikan
  // setiap field dilaporkan — supaya menambah field dwibahasa baru tanpa menambah
  // pemeriksaannya ketahuan di sini.
  const topik = topikSah();
  topik.judul = { id: "Judul" } as { id: string; en: string };
  topik.materi = { id: "Materi" } as { id: string; en: string };
  // Hanya Kuis yang punya `skenario`, `opsi`, dan `penjelasan`; Soal Kode punya
  // `skenario` sendiri dan diperiksa uji terpisah di atas.
  const daftarKuis = (topik.soal as Kuis[]).filter((s) => s.tipe === "kuis");
  for (const kuis of daftarKuis) {
    kuis.skenario = { id: "S" } as Kuis["skenario"];
    kuis.penjelasan = { id: "P" } as Kuis["penjelasan"];
    for (const opsi of kuis.opsi) {
      opsi.teks = { id: "O" } as Kuis["opsi"][number]["teks"];
    }
  }

  const masalah = periksa(topik);
  const lokasi = new Set(masalah.map((m) => m.lokasi));

  for (const wajib of [
    "judul.en",
    "materi.en",
    "soal[0].skenario.en",
    "soal[0].penjelasan.en",
    "soal[0].opsi[0].teks.en",
    "soal[4].opsi[3].teks.en",
  ]) {
    assert.ok(lokasi.has(wajib), `field "${wajib}" tidak dilaporkan`);
  }
});

// --- Komposisi Soal ------------------------------------------------------------

test("Kuis kurang dari 5 ditolak", () => {
  const topik = topikSah();
  const soal = topik.soal as unknown[];
  topik.soal = soal.filter((s) => (s as Kuis).tipe !== "kuis").concat([kuisSah(), kuisSah(), kuisSah(), kuisSah()]);
  assert.ok(adaMasalah(periksa(topik), "soal", "5 Kuis"));
});

test("Kuis lebih dari 5 ditolak", () => {
  const topik = topikSah();
  (topik.soal as unknown[]).push(kuisSah(0));
  assert.ok(adaMasalah(periksa(topik), "soal", "5 Kuis"));
});

test("Soal Kode lebih dari 1 ditolak", () => {
  const topik = topikSah();
  (topik.soal as unknown[]).push(soalKodeSah());
  assert.ok(adaMasalah(periksa(topik), "soal", "1 Soal Kode"));
});

test("Topik tanpa Soal Kode ditolak", () => {
  const topik = topikSah();
  topik.soal = [kuisSah(0), kuisSah(1), kuisSah(2), kuisSah(3), kuisSah(0)];
  assert.ok(adaMasalah(periksa(topik), "soal", "1 Soal Kode"));
});

test("tipe Soal yang tidak dikenal ditolak", () => {
  const topik = topikSah();
  (topik.soal as unknown[]).push({ tipe: "esai" });
  assert.ok(adaMasalah(periksa(topik), "soal[6].tipe", "kuis"));
});

// --- Jawaban benar -------------------------------------------------------------

test("Kuis dengan dua jawaban benar ditolak", () => {
  const topik = topikSah();
  const soal = topik.soal as Kuis[];
  soal[0].opsi[1].benar = true;
  assert.ok(
    adaMasalah(periksa(topik), "soal[0].opsi", "tepat satu"),
    "dua jawaban benar harus ditolak",
  );
});

test("Kuis tanpa jawaban benar ditolak", () => {
  const topik = topikSah();
  const soal = topik.soal as Kuis[];
  soal[0].opsi.forEach((o) => (o.benar = false));
  assert.ok(adaMasalah(periksa(topik), "soal[0].opsi", "tepat satu"));
});

test("Kuis tanpa opsi ditolak", () => {
  const topik = topikSah();
  const soal = topik.soal as Kuis[];
  soal[0].opsi = [];
  assert.ok(adaMasalah(periksa(topik), "soal[0].opsi", "tidak kosong"));
});

test("opsi dengan benar bukan boolean ditolak", () => {
  const topik = topikSah();
  const soal = topik.soal as Kuis[];
  (soal[0].opsi[0] as { benar: unknown }).benar = "ya";
  assert.ok(adaMasalah(periksa(topik), "soal[0].opsi[0].benar", "true atau false"));
});

// --- Soal Kode -----------------------------------------------------------------

test("Soal Kode tanpa solusi referensi ditolak", () => {
  const topik = topikSah();
  const soal = topik.soal as SoalKode[];
  const kode = soal.find((s) => s.tipe === "soal-kode") as SoalKode;
  delete (kode as { solusi_referensi?: string }).solusi_referensi;
  assert.ok(adaMasalah(periksa(topik), "soal[5].solusi_referensi", "kosong"));
});

test("Soal Kode tanpa nama fungsi ditolak", () => {
  const topik = topikSah();
  const soal = topik.soal as SoalKode[];
  const kode = soal.find((s) => s.tipe === "soal-kode") as SoalKode;
  (kode as { fungsi: unknown }).fungsi = "";
  assert.ok(adaMasalah(periksa(topik), "soal[5].fungsi", "fungsi"));
});

test("Soal Kode tanpa test case ditolak", () => {
  const topik = topikSah();
  const soal = topik.soal as SoalKode[];
  const kode = soal.find((s) => s.tipe === "soal-kode") as SoalKode;
  kode.test_case = [];
  assert.ok(adaMasalah(periksa(topik), "soal[5].test_case", "tidak kosong"));
});

test("test case yang diharapkan bernilai false tetap sah", () => {
  const topik = topikSah();
  const soal = topik.soal as SoalKode[];
  const kode = soal.find((s) => s.tipe === "soal-kode") as SoalKode;
  kode.test_case = [{ argumen: [[1]], diharapkan: false }];
  assert.deepEqual(periksa(topik), []);
});

test("test case tanpa kunci diharapkan ditolak", () => {
  const topik = topikSah();
  const soal = topik.soal as SoalKode[];
  const kode = soal.find((s) => s.tipe === "soal-kode") as SoalKode;
  kode.test_case = [{ argumen: [[1]] } as unknown as SoalKode["test_case"][number]];
  assert.ok(adaMasalah(periksa(topik), "soal[5].test_case[0]", "diharapkan"));
});

// --- Kompleksitas & Istilah (ticket #14) ---------------------------------------

test("kompleksitas yang hilang ditolak", () => {
  const topik = topikSah();
  delete topik.kompleksitas;
  assert.ok(adaMasalah(periksa(topik), "kompleksitas", "tidak kosong"));
});

test("kompleksitas dengan daftar operasi kosong ditolak", () => {
  const topik = topikSah();
  (topik.kompleksitas as { operasi: unknown[] }[])[0].operasi = [];
  assert.ok(adaMasalah(periksa(topik), "kompleksitas[0].operasi", "tidak kosong"));
});

test("operasi tanpa kompleksitas waktu ditolak", () => {
  const topik = topikSah();
  (topik.kompleksitas as { operasi: { waktu?: string }[] }[])[0].operasi[0].waktu = "";
  assert.ok(adaMasalah(periksa(topik), "kompleksitas[0].operasi[0].waktu", "waktu"));
});

test("struktur tanpa kompleksitas ruang ditolak", () => {
  const topik = topikSah();
  (topik.kompleksitas as { ruang?: string }[])[0].ruang = "";
  assert.ok(adaMasalah(periksa(topik), "kompleksitas[0].ruang", "ruang"));
});

test("istilah yang hilang ditolak", () => {
  const topik = topikSah();
  delete topik.istilah;
  assert.ok(adaMasalah(periksa(topik), "istilah", "tidak kosong"));
});

test("istilah dengan definisi satu bahasa ditolak", () => {
  const topik = topikSah();
  (topik.istilah as { definisi: { id: string } }[])[0].definisi = { id: "Hanya Indonesia" };
  assert.ok(adaMasalah(periksa(topik), "istilah[0].definisi", "English"));
});

test("istilah dengan pasangan istilah satu bahasa ditolak", () => {
  const topik = topikSah();
  (topik.istilah as { istilah: { id: string } }[])[0].istilah = { id: "Hanya Indonesia" };
  assert.ok(adaMasalah(periksa(topik), "istilah[0].istilah", "English"));
});

// --- Prasyarat -----------------------------------------------------------------

test("prasyarat yang menunjuk nomor tidak ada ditolak", () => {
  const topik = topikSah();
  topik.prasyarat = [99];
  assert.ok(adaMasalah(periksa(topik), "prasyarat", "tidak ada"));
});

test("prasyarat yang menunjuk nomor lebih besar ditolak", () => {
  const topik = topikSah();
  // Nomor 4 ada di Jalur, tetapi tidak lebih awal daripada Topik 4 sendiri.
  topik.prasyarat = [1, 4];
  assert.ok(adaMasalah(periksa(topik), "prasyarat", "lebih awal"));
});

test("prasyarat yang tidak sejalan dengan Jalur ditolak", () => {
  const topik = topikSah();
  topik.prasyarat = [2];
  assert.ok(adaMasalah(periksa(topik), "prasyarat", "jalur.yaml"));
});

test("Topik pertama boleh tanpa prasyarat", () => {
  const topik = topikSah();
  topik.nomor = 1;
  topik.slug = "big-o";
  // Judul wajib ikut menyesuaikan, karena validator memeriksa keselarasan judul
  // dengan content/jalur.yaml.
  topik.judul = { id: "Big-O", en: "Big-O" };
  topik.prasyarat = [];
  assert.deepEqual(periksa(topik), []);
});

// --- Keselarasan dengan Jalur --------------------------------------------------

test("slug yang tidak ada di Jalur ditolak", () => {
  const topik = topikSah();
  topik.slug = "topik-hantu";
  assert.ok(adaMasalah(periksa(topik), "slug", "jalur.yaml"));
});

test("nomor yang berbeda dengan Jalur ditolak", () => {
  const topik = topikSah();
  topik.nomor = 7;
  assert.ok(adaMasalah(periksa(topik), "nomor", "berbeda"));
});

test("judul yang berbeda dengan Jalur ditolak", () => {
  const topik = topikSah();
  topik.judul = { id: "Judul Lain", en: "Another Title" };
  assert.ok(
    adaMasalah(periksa(topik), "judul", "berbeda"),
    "judul yang menyimpang dari Jalur harus ditolak",
  );
});

test("judul yang berbeda hanya di satu bahasa ditolak", () => {
  const topik = topikSah();
  topik.judul = { id: "Stack", en: "Stack (beda)" };
  assert.ok(adaMasalah(periksa(topik), "judul", "berbeda"));
});

// --- Validasi Jalur ------------------------------------------------------------

test("Jalur yang sah tidak menghasilkan masalah", () => {
  assert.deepEqual(periksaJalur({ topik: jalur }, "content/jalur.yaml"), []);
});

test("Jalur dengan nomor berlubang ditolak", () => {
  const berlubang = jalur.filter((t) => t.nomor !== 2);
  const masalah = periksaJalur({ topik: berlubang }, "content/jalur.yaml");
  assert.ok(masalah.some((m) => m.pesan.includes("hilang")), "lubang harus dilaporkan");
});

test("Jalur dengan nomor ganda ditolak", () => {
  const ganda = [...jalur, { ...jalur[3], slug: "stack-lain" }];
  const masalah = periksaJalur({ topik: ganda }, "content/jalur.yaml");
  assert.ok(masalah.some((m) => m.pesan.includes("dua kali")));
});

test("Jalur dengan slug ganda ditolak", () => {
  const ganda = [...jalur, { ...jalur[3], nomor: 5 }];
  const masalah = periksaJalur({ topik: ganda }, "content/jalur.yaml");
  assert.ok(masalah.some((m) => m.pesan.includes("dua kali")));
});

test("Jalur yang tidak mulai dari 1 ditolak", () => {
  const mulaiDua = jalur.map((t) => ({ ...t, nomor: t.nomor + 1 }));
  const masalah = periksaJalur({ topik: mulaiDua }, "content/jalur.yaml");
  assert.ok(masalah.some((m) => m.pesan.includes("hilang") || m.pesan.includes("mulai dari 1")));
});

test("Jalur kosong ditolak", () => {
  const masalah = periksaJalur({ topik: [] }, "content/jalur.yaml");
  assert.equal(masalah.length, 1);
  assert.match(masalah[0].pesan, /tidak kosong/);
});

test("Jalur dengan prasyarat maju ditolak", () => {
  const salah = jalur.map((t) =>
    t.nomor === 2 ? { ...t, prasyarat: [3] } : t,
  );
  const masalah = periksaJalur({ topik: salah }, "content/jalur.yaml");
  assert.ok(masalah.some((m) => m.pesan.includes("lebih awal")));
});
