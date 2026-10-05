"use client";

import { useEffect, useRef, useState } from "react";

import { ambilCatatan, simpanCatatan } from "@/lib/api.ts";
import type { Kamus } from "@/lib/bahasa/kamus.ts";
import { markdownCatatan, namaBerkasCatatan } from "@/lib/catatan/markdown.ts";

/**
 * Editor Catatan sebuah Topik.
 *
 * Catatan adalah tulisan pemelajar sendiri tentang sebuah Topik (CONTEXT.md),
 * tersimpan di backend sehingga ikut berpindah antara laptop dan HP dan tidak hilang
 * saat data peramban dibersihkan (issue #1 user story 55–59). **Tidak dinilai
 * otomatis** — tidak ada di sini yang menilai atau menyatakan tulisan benar/salah.
 *
 * **Kenapa komponen ini memuat sendiri, berbeda dari `KotakPenjelasan`.** Kotak
 * Penjelasan menerima tulisannya sebagai prop karena ia hanya dirender **setelah
 * jawaban benar** — pemuatannya harus terjadi sebelum itu, di `kuis.tsx` yang memang
 * pemilik keadaan Kuis. Catatan tidak punya syarat kemunculan seperti itu: editornya
 * selalu ada, jadi ia bisa memuat sendiri saat dipasang. Halaman Topik tetap
 * komponen server yang statis; hanya editor ini yang hidup di peramban.
 *
 * **Yang tidak dikerjakan di sini: menyusun berkas Markdown unduhan.** Bentuk
 * berkasnya ada di `lib/catatan/markdown.ts` sebagai fungsi murni, supaya bisa diuji
 * sebagai teks tanpa merender React. Yang dikerjakan di sini hanya memicunya —
 * membuat blob dan menautkan unduhan, yang memang urusan peramban.
 */

interface Props {
  /** Slug Topik, bagian dari alamat Catatan di backend. */
  slugTopik: string;
  /** Judul Topik dalam bahasa aktif, untuk heading berkas unduhan. */
  judulTopik: string;
  /** Kamus bahasa yang sedang berlaku. */
  kamus: Kamus;
}

type StatusSimpan =
  | { kind: "diam" }
  | { kind: "menyimpan" }
  | { kind: "tersimpan" }
  | { kind: "galat"; pesan: string };

export function Catatan({ slugTopik, judulTopik, kamus }: Props) {
  const [isi, setIsi] = useState("");
  const [status, setStatus] = useState<StatusSimpan>({ kind: "diam" });

  /*
   * `null` berarti "sedang dimuat", bukan "kosong": editor yang belum tahu isinya
   * tidak boleh tampak kosong, karena pemelajar akan mengira Catatannya hilang dan
   * mulai menulis ulang — lalu penyimpanan menimpanya. Sama dengan Kotak Penjelasan.
   */
  const [tulisanAwal, setTulisanAwal] = useState<string | null>(null);

  /*
   * Tulisan tersimpan disalin ke keadaan lokal **sekali**, saat ia tiba. `useRef`
   * dipakai sebagai penanda "sudah pernah disalin", bukan `useState`: kalau penandanya
   * ikut memicu render, efek ini bisa berjalan lagi setelah pemelajar menyunting, dan
   * suntingannya ditimpa tulisan lama.
   */
  const sudahDisalin = useRef(false);

  useEffect(() => {
    let masihDipakai = true;

    ambilCatatan(slugTopik, kamus)
      .then((baris) => {
        if (!masihDipakai) return;
        setTulisanAwal(baris.isi);
        if (!sudahDisalin.current) {
          sudahDisalin.current = true;
          setIsi(baris.isi);
        }
      })
      .catch(() => {
        // Backend mati atau token belum diisi. Materi tetap terbaca tanpa backend
        // (user story 62), jadi editor ini tetap bisa dipakai menulis — tulisan lama
        // saja yang tidak bisa dimuat, dan itu tidak dijadikan galat di sini: pemelajar
        // yang belum mengisi token akan melihat galat itu di setiap Topik, padahal ia
        // hanya belum mengisi token sekali.
        //
        // Ditandai sebagai string kosong, bukan dibiarkan `null`, supaya editornya
        // berhenti menampilkan "memuat" dan bisa dipakai menulis.
        if (masihDipakai) setTulisanAwal("");
      });

    return () => {
      masihDipakai = false;
    };
  }, [slugTopik, kamus]);

  async function simpan() {
    setStatus({ kind: "menyimpan" });

    try {
      await simpanCatatan(slugTopik, isi, kamus);
      setStatus({ kind: "tersimpan" });
    } catch (galat) {
      // `api.ts` sudah menerjemahkan status HTTP menjadi kalimat yang bisa dibaca.
      const pesan = galat instanceof Error ? galat.message : kamus.galatBackendMati;
      setStatus({ kind: "galat", pesan });
    }
  }

  /*
   * Unduh Catatan sebagai Markdown (kriteria penerimaan #11).
   *
   * Memakai blob dan `<a download>`, bukan tautan ke endpoint backend: berkasnya
   * disusun dari tulisan yang **sedang ada di editor**, bukan dari salinan terakhir di
   * server — sehingga yang terunduh adalah apa yang benar-benar dilihat pemelajar,
   * termasuk suntingan yang belum sempat disimpan. Backend juga tidak bisa menyusunnya
   * sendiri: judul Topik hidup di git, bukan di database (ADR-0003).
   */
  function unduh() {
    const isiBerkas = markdownCatatan(judulTopik, isi);
    const blob = new Blob([isiBerkas], { type: "text/markdown;charset=utf-8" });

    const url = URL.createObjectURL(blob);
    const tautan = document.createElement("a");
    tautan.href = url;
    tautan.download = namaBerkasCatatan(slugTopik);
    document.body.append(tautan);
    tautan.click();
    tautan.remove();
    // URL objek menahan blob di memori sampai dilepas; tanpa ini unduhan besar
    // meninggalkan memori yang tidak kembali sampai halaman ditutup.
    URL.revokeObjectURL(url);
  }

  const sedangMemuat = tulisanAwal === null;

  return (
    <section
      className="mt-16"
      aria-labelledby="catatan-judul"
    >
      <h2 id="catatan-judul" className="text-xl font-semibold tracking-tight">
        {kamus.catatan}
      </h2>

      <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
        {kamus.catatanRingkasan}
      </p>

      <label
        htmlFor="catatan-isi"
        className="mt-5 block text-sm font-medium"
      >
        {kamus.catatanLabel}
      </label>

      {/*
        `text-base`, bukan `text-sm`: iOS memperbesar halaman saat kotak isian yang
        difokuskan berhuruf di bawah 16px. Karena menulis Catatan dari HP sama
        pentingnya (user story 56), editor ini memakai ukuran yang tidak memicu zoom.

        Tingginya minimum enam baris — Catatan lebih panjang daripada satu Kotak
        Penjelasan — dan `resize-y` membiarkan pemelajar memperpanjangnya sendiri.
      */}
      <textarea
        id="catatan-isi"
        value={isi}
        onChange={(peristiwa) => {
          setIsi(peristiwa.target.value);
          // Status "tersimpan" dibersihkan begitu tulisan berubah: membiarkannya
          // berarti memberi tahu pemelajar bahwa suntingan barunya sudah tersimpan,
          // padahal belum.
          if (status.kind !== "diam") setStatus({ kind: "diam" });
        }}
        disabled={sedangMemuat}
        rows={6}
        placeholder={kamus.catatanPlaceholder}
        className="mt-1 w-full resize-y rounded border px-3 py-2 text-base disabled:opacity-50"
        style={{
          borderColor: "var(--color-border)",
          background: "transparent",
          color: "var(--color-fg)",
        }}
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            void simpan();
          }}
          disabled={sedangMemuat || status.kind === "menyimpan"}
          className="rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--color-accent)", color: "var(--color-accent-fg)" }}
        >
          {status.kind === "menyimpan" ? kamus.catatanMenyimpan : kamus.catatanSimpan}
        </button>

        {/*
          Unduhan tetap tersedia walau backend mati: berkasnya disusun dari isi editor
          di peramban, tidak butuh permintaan apa pun. Justru saat backend bermasalah
          itulah salinan sendiri paling berguna.
        */}
        <button
          type="button"
          onClick={unduh}
          className="rounded border px-3 py-1.5 text-sm"
          style={{ borderColor: "var(--color-border)" }}
        >
          {kamus.catatanUnduh}
        </button>
      </div>

      {/*
        Status penyimpanan. `role="status"` (live region yang sopan), sama seperti
        umpan balik Kuis dan Kotak Penjelasan — bukan `role="alert"`, karena ini hasil
        tindakan pemakai sendiri. Wadahnya selalu ada supaya live region sudah di DOM
        saat isinya berubah.
      */}
      <div role="status" className="mt-2 min-h-5 text-sm">
        {sedangMemuat && (
          <span style={{ color: "var(--color-muted)" }}>{kamus.catatanMemuat}</span>
        )}
        {status.kind === "tersimpan" && (
          <span style={{ color: "var(--color-accent)" }}>{kamus.catatanTersimpan}</span>
        )}
        {status.kind === "galat" && (
          <span style={{ color: "var(--color-accent)" }}>{status.pesan}</span>
        )}
      </div>
    </section>
  );
}
