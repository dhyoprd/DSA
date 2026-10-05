/**
 * Menyusun indeks pencarian dari Materi seluruh Topik.
 *
 * **Apa yang diindeks.** Satu entri per **bagian** Materi (setiap judul `##`, `###`,
 * …), berisi teks badan bagian itu. Membagi per bagian — bukan per Topik — supaya
 * hasil pencarian bisa menunjuk *bagian mana* yang membahas sebuah istilah, bukan
 * hanya Topiknya. Itu yang diminta kriteria penerimaan #13: "Hasil menunjuk Topik dan
 * bagian Materi tempat istilah muncul".
 *
 * **Kenapa `daftarBagian`, bukan penguraian sendiri.** `bagianId` yang dihasilkan di
 * sini harus **sama persis** dengan `id` yang dipasang `materi-markdown.tsx` pada
 * heading, karena tautan hasil pencarian menunjuk ke `#id` itu. Kalau modul ini
 * menghitung anchor dengan caranya sendiri, tautannya menunjuk ke tempat yang salah
 * tanpa error apa pun — persis kelas kesalahan yang dijaga ADR-0009. Karena itu anchor
 * diambil dari `daftarBagian`, satu-satunya tempat aturan itu hidup.
 *
 * **Modul murni.** Masukannya nilai biasa, keluarannya nilai biasa. Tidak menyentuh
 * berkas, DOM, atau React, sehingga bisa diuji dengan `node --test` tanpa merender apa
 * pun. Pemanggilnya (halaman pencarian) yang membaca konten dari git dan menyerahkan
 * `Topik[]` ke sini.
 */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

import type { Bahasa } from "../bahasa/bahasa.ts";
import type { Topik } from "../konten/tipe.ts";
import { daftarBagian } from "../konten/bagian.ts";

/**
 * Satu bagian Materi yang bisa dicari.
 *
 * Bentuk ini adalah **antarmuka antara penyusun indeks dan pencari**: `indeks.ts`
 * yang menghasilkannya, `cari.ts` yang membacanya. Ia hidup di sini karena ia adalah
 * keluaran indeks — pencari tidak menghasilkan entri, hanya mencocokkannya.
 */
export interface EntriPencarian {
  /** Slug Topik, untuk menyusun tautan hasil. */
  topikSlug: string;
  /** Nomor Topik, untuk ditampilkan di hasil. */
  topikNomor: number;
  /** Judul Topik dalam bahasa yang berlaku. */
  topikJudul: string;
  /** `id` anchor bagian. Kosong kalau Materi tidak punya judul sama sekali. */
  bagianId: string;
  /** Teks judul bagian, tanpa penanda Markdown. */
  bagianJudul: string;
  /** Teks badan bagian, sebagai teks polos. Yang dicari dan dipotong jadi cuplikan. */
  teks: string;
}

/**
 * Ubah potongan Markdown menjadi teks polos.
 *
 * Dipakai untuk dua hal: membuang penanda format dari badan bagian (supaya cuplikan
 * hasil tidak membawa tanda bintang atau backtick), dan meratakan beberapa blok
 * menjadi satu teks yang bisa dicari.
 *
 * **Kenapa diurai, bukan diganti dengan regex.** Regex untuk Markdown selalu salah
 * pada satu kasus atau lain — `*` di dalam kode, `_` di dalam kata, tanda kurung di
 * dalam tautan. Mengurai dengan parser yang sama dengan yang merender Materi membuat
 * hasilnya konsisten dengan yang dibaca pemelajar.
 *
 * **Kenapa tidak memakai `toString` apa adanya.** `toString` hanya merangkai teks
 * daun tanpa pemisah, sehingga dua butir daftar menjadi `"push menaruh nilai.pop
 * mengambilnya."` dan sel tabel menjadi `"OperasiWaktuTambah elemenO(1)"`. Teks
 * seperti itu bukan hanya sulit dibaca sebagai cuplikan — ia juga **salah dicari**:
 * "pop mengambilnya" tidak akan ditemukan. Karena itu pemisah baris dipasang di sini,
 * di antara blok, sel, dan butir, sesuai struktur pohonnya.
 */
export function teksPolos(markdown: string): string {
  const pohon = unified().use(remarkParse).use(remarkGfm).parse(markdown);

  const blok: string[] = [];
  for (const simpul of pohon.children) {
    const teks = teksDariSimpul(simpul).trim();
    // Blok tanpa teks — garis pemisah `---`, blok kosong — dibuang, bukan
    // menyisakan baris kosong di tengah cuplikan.
    if (teks.length > 0) blok.push(teks);
  }
  return blok.join("\n");
}

/**
 * Teks sebuah simpul blok, dengan pemisah yang masuk akal di antara anak-anaknya.
 *
 * Hanya bentuk yang dipakai Materi yang ditangani secara khusus: daftar dan tabel.
 * Sisanya — paragraf, kutipan, blok kode — dirangkai dengan `teksDariDaun`, yang
 * sudah benar untuknya karena tidak ada batas antaranak yang perlu dijaga.
 */
function teksDariSimpul(simpul: unknown): string {
  const jenis = (simpul as { type?: string }).type;

  if (jenis === "list") {
    const anak = (simpul as { children?: unknown[] }).children ?? [];
    // Satu baris per butir, sehingga tiap butir bisa dicari sendiri.
    return anak.map((butir) => teksDariSimpul(butir)).join("\n");
  }

  if (jenis === "listItem") {
    const anak = (simpul as { children?: unknown[] }).children ?? [];
    return anak.map((isi) => teksDariSimpul(isi)).join(" ");
  }

  if (jenis === "table") {
    const baris = (simpul as { children?: unknown[] }).children ?? [];
    // Satu baris per baris tabel, satu sel dipisah " | " supaya batas kolom
    // terlihat di cuplikan.
    return baris
      .map((r) => {
        const sel = (r as { children?: unknown[] }).children ?? [];
        return sel.map((s) => teksDariDaun(s).trim()).join(" | ");
      })
      .join("\n");
  }

  return teksDariDaun(simpul);
}

/**
 * Rangkai seluruh teks daun di bawah sebuah simpul, tanpa pemisah.
 *
 * Ini yang benar untuk simpul sebaris (tebal, kode sebaris, tautan) dan untuk blok
 * yang anaknya memang mengalir sebagai satu kalimat (paragraf, judul).
 */
function teksDariDaun(simpul: unknown): string {
  const anak = (simpul as { children?: unknown[] }).children;

  if (!Array.isArray(anak)) {
    const nilai = (simpul as { value?: unknown }).value;
    return typeof nilai === "string" ? nilai : "";
  }

  return anak.map((a) => teksDariDaun(a)).join("");
}

/**
 * Susun indeks dari seluruh Topik, dalam bahasa yang berlaku.
 *
 * Urutan entri mengikuti urutan Topik masukannya lalu urutan bagian di dalam Materi,
 * sehingga pencari bisa mengandalkan urutan yang stabil untuk bobot yang sama.
 */
export function susunIndeks(topik: Topik[], bahasa: Bahasa): EntriPencarian[] {
  const entri: EntriPencarian[] = [];

  for (const t of topik) {
    entri.push(...indeksTopik(t, bahasa));
  }

  return entri;
}

/**
 * Indeks satu Topik.
 *
 * Badan tiap bagian diambil dari **rentang baris** antara judulnya dan judul
 * berikutnya. Nomor baris judul datang dari `daftarBagian`, jadi batas antarbagian di
 * sini tidak mungkin berbeda dari batas yang dilihat daftar isi.
 *
 * Materi tanpa judul sama sekali tetap menghasilkan satu entri: isinya bisa dicari,
 * dan tautannya menunjuk ke halaman Topik tanpa anchor. Tanpa ini, Materi yang lupa
 * diberi judul akan tak terlihat sama sekali di pencarian — kegagalan senyap.
 */
function indeksTopik(topik: Topik, bahasa: Bahasa): EntriPencarian[] {
  const markdown = topik.materi[bahasa];
  const judulTopik = topik.judul[bahasa];
  const bagian = daftarBagian(markdown);

  const dasar = {
    topikSlug: topik.slug,
    topikNomor: topik.nomor,
    topikJudul: judulTopik,
  };

  if (bagian.length === 0) {
    return [
      {
        ...dasar,
        bagianId: "",
        bagianJudul: judulTopik,
        teks: teksPolos(markdown),
      },
    ];
  }

  const baris = markdown.split("\n");

  return bagian.map((b, i) => {
    // Judul ada di baris `b.baris` (1-based). Badan mulai satu baris sesudahnya
    // (indeks `b.baris`), dan berakhir tepat sebelum judul berikutnya.
    const mulai = b.baris;
    const berikutnya = bagian[i + 1];
    const akhir = berikutnya === undefined ? baris.length : berikutnya.baris - 1;

    return {
      ...dasar,
      bagianId: b.id,
      bagianJudul: b.teks,
      teks: teksPolos(baris.slice(mulai, akhir).join("\n")),
    };
  });
}
