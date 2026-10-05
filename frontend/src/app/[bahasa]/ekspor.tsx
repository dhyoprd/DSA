"use client";

import { useState } from "react";

import { ambilCatatan } from "@/lib/api.ts";
import type { Kamus } from "@/lib/bahasa/kamus.ts";
import { markdownSemuaCatatan, type CatatanTopik } from "@/lib/catatan/markdown.ts";

/**
 * Bagian Ekspor di beranda (ticket #14).
 *
 * Dua unduhan, dengan dua sifat yang berbeda:
 *
 * - **Seluruh Catatan sebagai Markdown.** Catatan hidup di backend (ADR-0003), jadi
 *   fungsi ini mengambilnya lewat `ambilCatatan` untuk setiap Topik, lalu menyusun satu
 *   berkas. Judul Topik datang sebagai prop dari komponen server, karena judul hidup di
 *   git dan backend tidak membacanya.
 * - **CSV untuk Anki.** Ini berkas statis yang dibuat saat build di
 *   `/[bahasa]/ekspor/anki`; tautan biasa sudah cukup, tanpa token dan tanpa
 *   permintaan ke backend. Karena itu ia tetap bekerja saat backend mati.
 *
 * **Kenapa Progres tidak di sini.** Progres **hanya** ada di server, dan unduhannya
 * sudah ada di formulir token (`TokenForm`) sejak #7. Menaruhnya di sini juga akan
 * memisahkan "memasukkan token" dari "mengunduh Progres", padahal keduanya saling
 * membutuhkan. Keputusan "tetap terpisah" ada di `docs/adr/0019-...`.
 *
 * **Token.** Unduhan Catatan butuh token (datanya di backend), sedangkan unduhan CSV
 * **tidak** — berkasnya statis. Itu sebabnya keduanya diletakkan berdampingan tetapi
 * tidak digabung menjadi satu tombol: yang satu bisa gagal karena token, yang lain
 * tidak pernah.
 *
 * **Komponen klien** karena unduhan Catatan menyentuh backend dan peramban. Halaman
 * beranda yang memuatnya tetap statis.
 */

interface Props {
  /** Topik yang sudah punya berkas, urut Jalur, dengan judul dalam bahasa aktif. */
  topik: { slug: string; judul: string }[];
  /** Bahasa yang sedang berlaku, untuk tautan berkas CSV dan judul berkas gabungan. */
  bahasa: string;
  /** Kamus bahasa yang sedang berlaku. */
  kamus: Kamus;
}

type Keadaan =
  | { kind: "diam" }
  | { kind: "memuat" }
  | { kind: "galat"; pesan: string };

export function Ekspor({ topik, bahasa, kamus }: Props) {
  const [keadaan, setKeadaan] = useState<Keadaan>({ kind: "diam" });

  /**
   * Ambil Catatan setiap Topik, lalu unduh berkas gabungannya.
   *
   * **Gagal seluruhnya kalau ada satu yang gagal.** Menggantikan Catatan yang gagal
   * dengan teks kosong akan menghasilkan berkas yang tampak seperti Catatan kosong —
   * padahal isinya ada, hanya tidak terambil. Untuk sebuah salinan, itu jauh lebih
   * berbahaya daripada gagal: pemelajar akan mengira Catatannya hilang. Satu klik
   * ulang jauh lebih murah daripada keyakinan yang keliru bahwa salinannya lengkap.
   *
   * Catatan yang memang belum ditulis **bukan** kegagalan: backend membalas `200`
   * dengan isi kosong, jadi ia tidak melempar. Yang melempar selalu galat sungguhan
   * (token salah, backend mati), dan itu yang pesannya ditampilkan.
   */
  async function unduhCatatan() {
    setKeadaan({ kind: "memuat" });

    try {
      const isi = await Promise.all(
        topik.map(async (t): Promise<CatatanTopik> => {
          const baris = await ambilCatatan(t.slug, kamus);
          return { judul: t.judul, isi: baris.isi };
        }),
      );

      unduhBerkas(
        markdownSemuaCatatan(kamus.eksporJudulCatatan, isi),
        "text/markdown;charset=utf-8",
        "catatan.md",
      );
      setKeadaan({ kind: "diam" });
    } catch (galat) {
      // `ambilCatatan` sudah menerjemahkan status HTTP menjadi kalimat yang berguna.
      const pesan = galat instanceof Error ? galat.message : kamus.galatBackendMati;
      setKeadaan({ kind: "galat", pesan });
    }
  }

  const tautanAnki = `/${bahasa}/ekspor/anki`;

  return (
    <section
      className="rounded-lg border p-4"
      style={{ borderColor: "var(--color-border)" }}
      aria-labelledby="judul-ekspor"
    >
      <h2 id="judul-ekspor" className="text-sm font-semibold">
        {kamus.ekspor}
      </h2>

      <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
        {kamus.eksporRingkasan}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            void unduhCatatan();
          }}
          disabled={keadaan.kind === "memuat"}
          className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
          style={{ borderColor: "var(--color-border)" }}
        >
          {keadaan.kind === "memuat" ? kamus.eksporMemuat : kamus.eksporCatatan}
        </button>

        {/*
          Tautan biasa, bukan tombol dengan fetch: berkasnya statis dan tidak butuh
          header `Authorization`, jadi navigasi biasa sudah cukup. `download` membuat
          peramban menyimpannya dengan nama berkas dari server.
        */}
        <a
          href={tautanAnki}
          download
          className="rounded border px-3 py-1.5 text-sm"
          style={{ borderColor: "var(--color-border)" }}
        >
          {kamus.eksporAnki}
        </a>
      </div>

      <p className="mt-2 text-xs" style={{ color: "var(--color-muted)" }}>
        {kamus.eksporAnkiKeterangan}
      </p>

      {keadaan.kind === "galat" && (
        <p role="alert" className="mt-2 text-sm" style={{ color: "var(--color-accent)" }}>
          {keadaan.pesan}
        </p>
      )}
    </section>
  );
}

/**
 * Unduh teks sebagai berkas.
 *
 * Dipisah supaya `unduhCatatan` terbaca sebagai "susun lalu unduh", bukan sebagai
 * urusan DOM. Membuat blob dan menautkannya memang urusan peramban, dan itu satu-
 * satunya alasan fungsi ini ada.
 */
function unduhBerkas(isi: string, tipe: string, nama: string): void {
  const blob = new Blob([isi], { type: tipe });
  const url = URL.createObjectURL(blob);
  const tautan = document.createElement("a");
  tautan.href = url;
  tautan.download = nama;
  document.body.append(tautan);
  tautan.click();
  tautan.remove();
  // URL objek menahan blob di memori sampai dilepas; tanpa ini unduhan besar
  // meninggalkan memori yang tidak kembali sampai halaman ditutup.
  URL.revokeObjectURL(url);
}
