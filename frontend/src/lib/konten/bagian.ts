/**
 * Membaca daftar bagian (judul) dari sebuah Materi Markdown.
 *
 * Dipakai dua tempat yang harus sepakat: daftar isi di sisi kanan merender tautan ke
 * setiap bagian, dan `materi-markdown.tsx` memberi setiap heading `id` yang sama.
 * Kalau keduanya menghitung sendiri-sendiri, tautannya menunjuk ke tempat yang salah
 * tanpa error apa pun — jenis kesalahan yang tidak terlihat sampai pembaca mengklik.
 * Karena itu id dihitung **sekali** di sini, dan `materi-markdown.tsx` mencocokkan
 * heading berdasarkan nomor baris.
 *
 * Nomor baris adalah kuncinya. `node.position.start.line` yang diteruskan
 * react-markdown ke komponen override berasal dari pohon Markdown yang sama, dan
 * sudah diverifikasi sepadan dengan pohon yang di-parse di sini — termasuk saat ada
 * tabel, daftar tugas, dan coretan (GFM). Lihat `bagian.test.ts`.
 *
 * Keputusan ini beserta alternatif yang ditolak (plugin slug otomatis) dicatat di
 * `docs/adr/0009-anchor-daftar-isi-lewat-nomor-baris.md`. Jangan menggantinya dengan
 * `rehype-slug` tanpa membuka ADR itu lebih dulu — daftar isi tetap harus tahu `id`
 * yang dihasilkan plugin itu, sehingga aturan slug-nya harus ditiru di dua tempat.
 *
 * Modul ini murni: masukannya teks, keluarannya nilai biasa. Tidak menyentuh berkas,
 * DOM, atau React, sehingga bisa diuji dengan `node --test` tanpa merender apa pun.
 */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";

import { slugDasar } from "./slug.ts";
import { barisSimpul } from "./baris.ts";

/** Satu bagian Materi yang punya judul. */
export interface Bagian {
  /** `id` anchor, unik di dalam satu Materi. Dipakai tautan daftar isi. */
  id: string;
  /** Teks judul tanpa penanda format Markdown. */
  teks: string;
  /** Tingkat judul: 2 untuk `##`, 3 untuk `###`, dan seterusnya. */
  tingkat: number;
  /** Nomor baris judul di dalam Markdown, 1-based. Kunci sambungan ke renderer. */
  baris: number;
}

/**
 * Dipakai kalau judul tidak menyisakan satu pun huruf atau angka (mis. `## ---`).
 * Tanpa ini, bagian seperti itu tidak akan punya alamat.
 */
const SLUG_CADANGAN = "bagian";

/**
 * Kumpulkan seluruh bagian dari sebuah Materi, urut kemunculan.
 *
 * Judul di dalam blok kode tidak ikut: `remark-parse` sudah memperlakukannya sebagai
 * isi kode, bukan judul, jadi tidak perlu penyaringan tambahan di sini.
 */
export function daftarBagian(markdown: string): Bagian[] {
  const pohon = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  const bagian: Bagian[] = [];
  const idTerpakai = new Set<string>();

  visit(pohon, "heading", (simpul) => {
    // Memakai `barisSimpul` yang sama dengan `materi-markdown.tsx`, bukan membaca
    // `simpul.position` langsung. Keduanya harus menghasilkan nomor yang sama persis,
    // jadi pembacaannya sengaja hidup di satu tempat. Judul tanpa posisi tidak bisa
    // ditautkan ke heading yang dirender; pohon hasil `parse` selalu punya posisi,
    // jadi cabang itu hanya jaring pengaman.
    const baris = barisSimpul(simpul);
    if (baris === undefined) return;

    const teks = toString(simpul);
    bagian.push({
      id: idUnik(teks, idTerpakai),
      teks,
      tingkat: simpul.depth,
      baris,
    });
  });

  return bagian;
}

/**
 * Id yang belum terpakai untuk sebuah teks judul.
 *
 * Judul kembar adalah hal biasa di Materi (mis. "Kompleksitas" muncul di beberapa
 * Topik), dan di dalam satu dokumen judul yang sama boleh muncul lebih dari sekali.
 * Yang tidak boleh adalah dua `id` yang sama, karena tautan daftar isi akan selalu
 * menunjuk yang pertama. Karena itu kemunculan berikutnya diberi akhiran angka.
 */
function idUnik(teks: string, terpakai: Set<string>): string {
  const dasar = slugDasar(teks) || SLUG_CADANGAN;

  let id = dasar;
  let urutan = 1;
  while (terpakai.has(id)) {
    id = `${dasar}-${String(urutan)}`;
    urutan += 1;
  }

  terpakai.add(id);
  return id;
}
