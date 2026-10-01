/**
 * Uji aturan tema.
 *
 * Yang paling penting di sini bukan `bacaPilihanTema` — itu pencarian di daftar
 * pendek. Yang penting adalah **`skripTema`**: ia adalah teks yang berjalan sebelum
 * React hidup, dan teks tidak bisa memanggil fungsi. Jadi `layout.tsx` memakai
 * `skripTema`, sedangkan komponen memakai `atributTema`, dan keduanya harus
 * menghasilkan atribut yang sama untuk pilihan yang sama.
 *
 * Kalau keduanya menyimpang, gejalanya senyap dan hanya muncul sesaat: halaman
 * berkedip dari terang ke gelap saat dibuka, lalu benar setelah React hidup. Uji di
 * bawah menjalankan teks skripnya sungguhan dan membandingkannya dengan
 * `atributTema`, sehingga penyimpangan itu ketahuan di sini, bukan di mata pemakai.
 */

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

import {
  ATRIBUT_TEMA,
  KUNCI_TEMA,
  PILIHAN_TEMA,
  atributTema,
  bacaPilihanTema,
  skripTema,
} from "./tema.ts";

/**
 * `document` palsu yang mencatat atribut yang dipasang skrip.
 *
 * Dikembalikan bersama `atribut`-nya supaya uji bisa memeriksa hasil akhirnya —
 * terutama membedakan "atribut dihapus" dari "atribut tidak pernah disentuh".
 */
function dokumenPalsu() {
  const atribut: Record<string, string> = {};

  return {
    atribut,
    document: {
      documentElement: {
        setAttribute: (nama: string, nilai: string) => {
          atribut[nama] = nilai;
        },
        removeAttribute: (nama: string) => {
          delete atribut[nama];
        },
      },
    },
  };
}

/**
 * `localStorage` palsu yang **hanya** mengenal [`KUNCI_TEMA`].
 *
 * Membatasi diri pada satu kunci itu disengaja: dengan begitu uji yang lulus juga
 * membuktikan skripnya membaca kunci yang benar. Skrip yang menulis kunci lain akan
 * mendapat `null` di sini, dan pilihannya tidak akan terpasang.
 */
function penyimpananPalsu(tersimpan: string | null) {
  return {
    getItem: (kunci: string) => (kunci === KUNCI_TEMA ? tersimpan : null),
  };
}

/** Jalankan `skripTema` seperti peramban menjalankannya, lalu kembalikan atributnya. */
function jalankanSkrip(tersimpan: string | null): string | null {
  const { atribut, document } = dokumenPalsu();
  vm.runInNewContext(skripTema(), { document, localStorage: penyimpananPalsu(tersimpan), JSON });
  return atribut["data-theme"] ?? null;
}

test("pilihan yang tidak dikenal berarti ikut sistem", () => {
  // Belum pernah memilih: menghormati pengaturan sistem, bukan menimpanya.
  assert.equal(bacaPilihanTema(null), "sistem");
  assert.equal(bacaPilihanTema(""), "sistem");
  assert.equal(bacaPilihanTema("biru"), "sistem");
  // Nilai lama dari versi yang berbeda tidak boleh membuat halaman tanpa tema.
  assert.equal(bacaPilihanTema("dark"), "sistem");
});

test("setiap pilihan yang sah dikembalikan apa adanya", () => {
  for (const pilihan of PILIHAN_TEMA) {
    assert.equal(bacaPilihanTema(pilihan), pilihan);
  }
});

test("skrip sebaris menghasilkan atribut yang sama dengan atributTema", () => {
  // Inti berkas ini: teks skrip dan fungsi murni tidak boleh menyimpang.
  for (const pilihan of PILIHAN_TEMA) {
    assert.equal(
      jalankanSkrip(pilihan),
      atributTema(pilihan),
      `pilihan "${pilihan}" berbeda antara skrip sebaris dan atributTema`,
    );
  }
});

test("sistem menghapus atribut, bukan menulis nilai khusus", () => {
  // Atribut yang dihapus membuat CSS kembali ke `prefers-color-scheme`. Menulis
  // "sistem" sebagai nilai atribut hanya akan menyamarkan bahwa tidak ada yang dipilih.
  assert.equal(jalankanSkrip("sistem"), null);
  assert.equal(ATRIBUT_TEMA.sistem, null);
});

test("terang dan gelap menulis atribut yang dibaca CSS", () => {
  assert.equal(jalankanSkrip("terang"), "light");
  assert.equal(jalankanSkrip("gelap"), "dark");
});

test("belum pernah memilih sama dengan memilih sistem", () => {
  // Kunjungan pertama tidak boleh berkedip ke tema yang tidak diminta.
  assert.equal(jalankanSkrip(null), jalankanSkrip("sistem"));
});

test("localStorage yang melempar tidak menjatuhkan halaman", () => {
  // Mode privat dan data situs yang diblokir membuat `localStorage` melempar.
  // Halaman harus tetap tampil, memakai tema sistem.
  const { document } = dokumenPalsu();
  const localStorage = {
    getItem: () => {
      throw new Error("localStorage diblokir");
    },
  };

  assert.doesNotThrow(() => {
    vm.runInNewContext(skripTema(), { document, localStorage, JSON });
  });
});
