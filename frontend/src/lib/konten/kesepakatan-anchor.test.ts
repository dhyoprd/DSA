/**
 * Uji kesepakatan antara `daftarBagian` dan react-markdown.
 *
 * Ini penjaga asumsi yang menopang seluruh daftar isi: `daftarBagian` menghitung
 * nomor baris judul, dan `materi-markdown.tsx` memasang `id` pada heading dengan
 * mencocokkan nomor baris yang **react-markdown** berikan. Kalau kedua nomor itu
 * berbeda, tidak ada yang gagal — tautan daftar isi hanya melompat ke tempat yang
 * salah, diam-diam. Karena itu kesepadannya diuji, bukan diasumsikan.
 *
 * Ujinya sengaja **tidak** merender `MateriMarkdown` (berkas itu JSX, dan test runner
 * Node tidak menerjemahkan JSX). Yang diuji adalah kontraknya: untuk Materi yang
 * sama, himpunan nomor baris judul dari `daftarBagian` sama dengan himpunan nomor
 * baris yang react-markdown teruskan ke komponen override heading.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { daftarBagian } from "./bagian.ts";
import { barisSimpul } from "./baris.ts";

/** Props yang react-markdown berikan ke komponen override heading. */
interface PropsHeading {
  children?: ReactNode;
  node?: unknown;
}

/**
 * Nomor baris yang react-markdown berikan ke komponen override heading.
 *
 * Memakai `barisSimpul` yang sama dengan `materi-markdown.tsx`, bukan menyalin
 * pembacaan bentuknya. Kalau tidak, uji ini bisa lulus terhadap pembacaan yang
 * berbeda dari yang dipakai produksi — dan justru itu yang ingin dicegah.
 */
function barisDariReactMarkdown(markdown: string): number[] {
  const baris: number[] = [];
  /** Komponen override yang mencatat nomor baris lalu meneruskan children-nya. */
  const heading = (tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") => (props: PropsHeading) => {
    const line = barisSimpul(props.node);
    if (line !== undefined) baris.push(line);
    return createElement(tag, null, props.children);
  };
  renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      {
        remarkPlugins: [remarkGfm],
        // Seluruh tingkat yang di-override `materi-markdown.tsx`, bukan hanya h1–h4:
        // kalau Materi memakai `#####`, keduanya harus tetap sepakat.
        components: {
          h1: heading("h1"),
          h2: heading("h2"),
          h3: heading("h3"),
          h4: heading("h4"),
          h5: heading("h5"),
          h6: heading("h6"),
        },
      },
      markdown,
    ),
  );
  return baris;
}

/** Materi yang memakai seluruh bentuk yang muncul di berkas Topik sungguhan. */
const MATERI = [
  "## Bagian Pertama", // 1
  "", // 2
  "Paragraf dengan `kode` dan **tebal**.", // 3
  "", // 4
  "| Operasi | Biaya |", // 5
  "|---|---|", // 6
  "| push | O(1) |", // 7
  "", // 8
  "- [ ] tugas belum", // 9
  "- [x] tugas selesai", // 10
  "", // 11
  "```python", // 12
  "## ini komentar, bukan judul", // 13
  "```", // 14
  "", // 15
  "### Anak Bagian", // 16
  "", // 17
  "## Bagian Pertama", // 18
].join("\n");

test("nomor baris judul sepadan dengan yang dilihat react-markdown", () => {
  const punyaKita = daftarBagian(MATERI).map((b) => b.baris);
  const punyaMereka = barisDariReactMarkdown(MATERI);

  assert.deepEqual(
    punyaKita,
    punyaMereka,
    "nomor baris judul berbeda — id daftar isi tidak akan menunjuk heading yang benar",
  );
});

test("kesepadan tetap berlaku pada judul bertingkat dalam (h5 dan h6)", () => {
  // Materi yang memakai seluruh tingkat 1–6. `materi-markdown.tsx` meng-override
  // keenamnya, jadi kesepadanannya harus berlaku untuk keenamnya juga — bukan hanya
  // untuk h2/h3 yang kebetulan dipakai Materi saat ini.
  const dalam = [
    "# Satu",
    "## Dua",
    "### Tiga",
    "#### Empat",
    "##### Lima",
    "###### Enam",
  ].join("\n\n");

  assert.deepEqual(
    daftarBagian(dalam).map((b) => b.baris),
    barisDariReactMarkdown(dalam),
  );
  assert.deepEqual(
    daftarBagian(dalam).map((b) => b.tingkat),
    [1, 2, 3, 4, 5, 6],
  );
});

test("judul di dalam blok kode tidak dihitung kedua belah pihak", () => {
  // Baris 13 memuat "## ini komentar, bukan judul" di dalam blok kode. Ia tidak
  // boleh muncul di daftar nomor baris mana pun.
  const punyaKita = daftarBagian(MATERI).map((b) => b.baris);

  assert.equal(punyaKita.includes(13), false);
  assert.equal(barisDariReactMarkdown(MATERI).includes(13), false);
});

test("setiap judul menghasilkan tepat satu id unik pada Materi yang sah", () => {
  const bagian = daftarBagian(MATERI);
  const id = bagian.map((b) => b.id);

  assert.equal(bagian.length, 3);
  assert.equal(new Set(id).size, id.length);
  assert.equal(
    id.every((s) => s.length > 0),
    true,
  );
});
