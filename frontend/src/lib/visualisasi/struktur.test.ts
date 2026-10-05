/**
 * Uji model Visualisasi: isi struktur setelah sekian langkah.
 *
 * Yang diuji di sini adalah **aturan yang menerangkan cara kerja kedua struktur** —
 * ujung mana yang diambil `pop` — karena kesalahan di situ tidak menimbulkan error
 * apa pun: animasinya tetap berjalan mulus, hanya mengajarkan aturan yang salah.
 * Itu kelas bug yang paling mahal di situs belajar, dan satu-satunya cara mencegahnya
 * adalah menguji hasilnya langsung.
 *
 * Beberapa uji memakai `LANGKAH_CONTOH` yang sungguhan (bukan data buatan uji),
 * karena data itulah yang benar-benar digambar — kalau ada salah ketik di sana, uji
 * ini yang menangkapnya.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { LANGKAH_CONTOH } from "./langkah.ts";
import {
  diUjung,
  keadaanAwal,
  keadaanPada,
  puncakSel,
  type Langkah,
} from "./struktur.ts";

test("keadaan awal kosong dan tidak menyebut langkah apa pun", () => {
  const keadaan = keadaanAwal();

  assert.deepEqual(keadaan.sel, []);
  assert.equal(keadaan.terakhir, null);
  assert.equal(keadaan.keluar, null);
});

test("indeks 0 berarti belum ada langkah yang dijalankan", () => {
  const keadaan = keadaanPada(LANGKAH_CONTOH, 0, "stack");

  assert.deepEqual(keadaan.sel, []);
  assert.equal(keadaan.terakhir, null);
});

test("setelah dua push, isinya dua nilai urut masuk", () => {
  const keadaan = keadaanPada(LANGKAH_CONTOH, 2, "stack");

  assert.deepEqual(
    keadaan.sel.map((s) => s.nilai),
    [1, 2],
  );
  assert.deepEqual(keadaan.terakhir, { operasi: "push", nilai: 2 });
  assert.equal(keadaan.keluar, null);
});

test("Stack mengeluarkan yang TERAKHIR masuk (LIFO)", () => {
  // Empat langkah: push 1, push 2, push 3, pop. Yang keluar harus 3.
  const keadaan = keadaanPada(LANGKAH_CONTOH, 4, "stack");

  assert.equal(keadaan.keluar, 3, "Stack harus mengambil dari ujung akhir");
  assert.deepEqual(
    keadaan.sel.map((s) => s.nilai),
    [1, 2],
  );
});

test("Queue mengeluarkan yang PERTAMA masuk (FIFO)", () => {
  // Langkah yang sama persis, struktur berbeda. Yang keluar harus 1.
  const keadaan = keadaanPada(LANGKAH_CONTOH, 4, "queue");

  assert.equal(keadaan.keluar, 1, "Queue harus mengambil dari ujung depan");
  assert.deepEqual(
    keadaan.sel.map((s) => s.nilai),
    [2, 3],
  );
});

test("urutan yang sama menghasilkan sisa yang terbalik antara Stack dan Queue", () => {
  // Inilah klaim yang ditulis Materi: "tiga nilai yang sama... keluar dengan urutan
  // terbalik dari Stack, dan dengan urutan yang sama dari Queue". Kalau uji ini
  // gagal, Visualisasi bertentangan dengan Materi di atasnya.
  const stack = keadaanPada(LANGKAH_CONTOH, 5, "stack");
  const queue = keadaanPada(LANGKAH_CONTOH, 5, "queue");

  assert.deepEqual(
    stack.sel.map((s) => s.nilai),
    [1],
    "Stack menyisakan yang paling awal masuk",
  );
  assert.deepEqual(
    queue.sel.map((s) => s.nilai),
    [3],
    "Queue menyisakan yang paling akhir masuk",
  );
  assert.notDeepEqual(stack.sel, queue.sel);
});

test("pop pada struktur kosong tidak mengeluarkan apa pun dan tidak melempar", () => {
  const langkah: Langkah[] = [{ operasi: "pop" }, { operasi: "pop" }];
  const keadaan = keadaanPada(langkah, 2, "stack");

  assert.deepEqual(keadaan.sel, []);
  assert.equal(keadaan.keluar, null);
});

test("indeks di luar rentang dijepit, bukan menghasilkan keadaan aneh", () => {
  const negatif = keadaanPada(LANGKAH_CONTOH, -3, "stack");
  const kelebihan = keadaanPada(LANGKAH_CONTOH, 99, "stack");

  assert.deepEqual(negatif.sel, [], "indeks negatif berarti belum ada langkah");
  assert.equal(negatif.terakhir, null);

  // Kelebihan dijepit ke seluruh langkah: sama dengan menjalankannya semua.
  const semua = keadaanPada(LANGKAH_CONTOH, LANGKAH_CONTOH.length, "stack");
  assert.deepEqual(kelebihan, semua);
});

test("id sel unik, dan tidak dipakai ulang setelah sebuah sel keluar", () => {
  // `id` adalah identitas kotak untuk React. Kalau ia dipakai ulang, React
  // menganggap kotak baru sebagai kotak lama yang berpindah, dan animasinya salah.
  const langkah: Langkah[] = [
    { operasi: "push", nilai: 1 },
    { operasi: "push", nilai: 2 },
    { operasi: "pop" },
    { operasi: "push", nilai: 3 },
  ];
  const keadaan = keadaanPada(langkah, 4, "stack");

  const id = keadaan.sel.map((s) => s.id);
  assert.equal(new Set(id).size, id.length, "id harus unik");
  assert.deepEqual(
    keadaan.sel.map((s) => s.nilai),
    [1, 3],
  );
  // Kotak ketiga (nilai 3) harus punya id yang belum pernah dipakai, bukan id
  // milik nilai 2 yang sudah keluar.
  assert.equal(keadaan.sel[1]?.id, 2, "id mengikuti urutan penyisipan");
});

test("diUjung benar hanya setelah langkah terakhir dijalankan", () => {
  assert.equal(diUjung(LANGKAH_CONTOH, 0), false);
  assert.equal(diUjung(LANGKAH_CONTOH, LANGKAH_CONTOH.length - 1), false);
  assert.equal(diUjung(LANGKAH_CONTOH, LANGKAH_CONTOH.length), true);
  assert.equal(diUjung(LANGKAH_CONTOH, LANGKAH_CONTOH.length + 5), true);
  assert.equal(diUjung([], 0), true, "tanpa langkah, sudah di ujung sejak awal");
});

test("puncakSel melaporkan jumlah kotak terbanyak yang pernah ada", () => {
  // Wadah memakai angka ini untuk menyediakan ruang sejak awal, supaya halaman di
  // bawahnya tidak bergeser naik-turun setiap push dan pop.
  assert.equal(puncakSel(LANGKAH_CONTOH), 3, "contoh mencapai tiga kotak");
  assert.equal(puncakSel([]), 0);
  assert.equal(puncakSel([{ operasi: "pop" }]), 0, "pop pada kosong tidak negatif");
});

test("puncakSel lebih besar daripada isi akhir kalau ada yang keluar", () => {
  const isiAkhir = keadaanPada(LANGKAH_CONTOH, LANGKAH_CONTOH.length, "stack").sel.length;

  assert.ok(
    puncakSel(LANGKAH_CONTOH) > isiAkhir,
    "ruang disediakan untuk puncaknya, bukan untuk isi akhirnya",
  );
});

test("data LANGKAH_CONTOH sendiri sah: tidak pernah pop pada struktur kosong", () => {
  // Uji atas data, bukan atas fungsi. Salah ketik satu langkah di `langkah.ts` akan
  // menghasilkan animasi yang tampak wajar tetapi tidak menerangkan apa pun.
  let isi = 0;
  for (const [i, satu] of LANGKAH_CONTOH.entries()) {
    if (satu.operasi === "push") {
      isi += 1;
    } else {
      assert.ok(isi > 0, `langkah ${i}: pop pada struktur kosong`);
      isi -= 1;
    }
  }

  assert.equal(isi, 1, "contoh harus menyisakan tepat satu nilai di akhir");
  assert.ok(
    LANGKAH_CONTOH.some((l) => l.operasi === "push"),
    "harus ada push",
  );
  assert.ok(
    LANGKAH_CONTOH.some((l) => l.operasi === "pop"),
    "harus ada pop",
  );
});
