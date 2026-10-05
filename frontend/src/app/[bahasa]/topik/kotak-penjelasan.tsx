"use client";

import { useEffect, useRef, useState } from "react";

import { simpanPenjelasan } from "@/lib/api.ts";
import type { Kamus } from "@/lib/bahasa/kamus.ts";

/**
 * Kotak Penjelasan: tempat pemelajar menulis alasan jawabannya dengan kata sendiri,
 * lalu membandingkannya dengan Pembahasan.
 *
 * Muncul setelah jawaban benar (aturan itu ada di `lib/kuis/penilaian.ts`), dan
 * **tidak dinilai otomatis** (CONTEXT.md, user story 28). Karena itu tidak ada di sini
 * yang menilai, membandingkan, atau menyatakan tulisan benar/salah — yang ada hanya
 * kotak, tombol simpan, dan tombol membuka Pembahasan.
 *
 * **Yang dikerjakan komponen ini: satu kotak, milik satu Soal.** Memuat tulisannya,
 * menyimpannya, dan menampilkan keadaannya. Yang **tidak** dikerjakan di sini:
 * kapan kotaknya muncul, dan apakah Pembahasan boleh terbuka — keduanya aturan
 * `penilaian.ts` yang dipanggil `kuis.tsx`. Pemisahan itu menjaga aturan Kuis tetap
 * bisa diuji tanpa merender React, sesuai keputusan issue #1.
 *
 * **Tulisan awal datang sebagai prop, bukan dibaca di sini.** Kalau komponen ini yang
 * memuat, ia hanya dirender setelah jawaban benar — sehingga setelah halaman dimuat
 * ulang kotaknya tidak pernah dirender, dan tulisan tersimpan tidak pernah ketemu.
 * Pemuatannya ada di `kuis.tsx`, yang memang pemilik keadaan Kuis.
 */

interface Props {
  /** Slug Topik, bagian dari alamat tulisan di backend. */
  slugTopik: string;
  /** Indeks Soal di dalam `topik.soal`. */
  indeksSoal: number;
  /** Kamus bahasa yang sedang berlaku. */
  kamus: Kamus;
  /**
   * Tulisan yang sudah dimuat dari backend, atau `null` selagi belum selesai dimuat.
   *
   * `null` berarti "sedang dimuat", bukan "kosong": kotak yang belum tahu isinya
   * tidak boleh menampilkan kotak kosong, karena pemelajar akan mengira tulisannya
   * hilang dan mulai menulis ulang — lalu penyimpanan menimpanya.
   */
  tulisanAwal: string | null;
  /** Dipanggil saat tombol "Bandingkan dengan Pembahasan" ditekan. */
  onBandingkan: () => void;
}

type StatusSimpan =
  | { kind: "diam" }
  | { kind: "menyimpan" }
  | { kind: "tersimpan" }
  | { kind: "galat"; pesan: string };

export function KotakPenjelasan({
  slugTopik,
  indeksSoal,
  kamus,
  tulisanAwal,
  onBandingkan,
}: Props) {
  const [isi, setIsi] = useState("");
  const [status, setStatus] = useState<StatusSimpan>({ kind: "diam" });

  /*
   * Tulisan awal disalin ke keadaan lokal **sekali**, saat ia tiba.
   *
   * `useRef` dipakai sebagai penanda "sudah pernah disalin", bukan `useState`: kalau
   * penandanya ikut memicu render, efek ini bisa berjalan lagi setelah pemelajar
   * menyunting, dan suntingannya ditimpa tulisan lama. Yang diinginkan adalah
   * sekali-tiba-salin, lalu kotaknya milik pemelajar.
   */
  const sudahDisalin = useRef(false);

  useEffect(() => {
    if (tulisanAwal === null || sudahDisalin.current) return;
    sudahDisalin.current = true;
    setIsi(tulisanAwal);
  }, [tulisanAwal]);

  async function simpan() {
    setStatus({ kind: "menyimpan" });

    try {
      await simpanPenjelasan(slugTopik, indeksSoal, isi, kamus);
      setStatus({ kind: "tersimpan" });
    } catch (galat) {
      // `api.ts` sudah menerjemahkan status HTTP menjadi kalimat yang bisa dibaca.
      const pesan = galat instanceof Error ? galat.message : kamus.galatBackendMati;
      setStatus({ kind: "galat", pesan });
    }
  }

  const sedangMemuat = tulisanAwal === null;

  return (
    <div
      className="mt-5 rounded-md border p-4"
      style={{ borderColor: "var(--color-border)" }}
      aria-labelledby={`kotak-penjelasan-${String(indeksSoal)}`}
    >
      <h4
        id={`kotak-penjelasan-${String(indeksSoal)}`}
        className="font-mono text-xs tracking-widest uppercase"
        style={{ color: "var(--color-muted)" }}
      >
        {kamus.kotakPenjelasan}
      </h4>

      <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
        {kamus.kotakPenjelasanRingkasan}
      </p>

      <label
        htmlFor={`kotak-penjelasan-isi-${String(indeksSoal)}`}
        className="mt-3 block text-sm font-medium"
      >
        {kamus.kotakPenjelasanLabel}
      </label>

      {/*
        `text-base`, bukan `text-sm`: iOS memperbesar halaman saat kotak isian yang
        difokuskan berhuruf di bawah 16px. Karena belajar di HP sama pentingnya
        (design-tree.md), kotak ini memakai ukuran yang tidak memicu zoom itu.

        Tingginya minimum tiga baris supaya ada tempat yang jelas untuk menulis, dan
        `resize-y` membiarkan pemelajar memperpanjangnya sendiri.
      */}
      <textarea
        id={`kotak-penjelasan-isi-${String(indeksSoal)}`}
        value={isi}
        onChange={(peristiwa) => {
          setIsi(peristiwa.target.value);
          // Status "tersimpan" dibersihkan begitu tulisan berubah: membiarkannya
          // berarti memberi tahu pemelajar bahwa suntingan barunya sudah tersimpan,
          // padahal belum.
          if (status.kind !== "diam") setStatus({ kind: "diam" });
        }}
        disabled={sedangMemuat}
        rows={3}
        placeholder={kamus.kotakPenjelasanPlaceholder}
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
          {status.kind === "menyimpan" ? kamus.kotakPenjelasanMenyimpan : kamus.kotakPenjelasanSimpan}
        </button>

        {/*
          Tombol ini yang membuka Pembahasan (user story 27, 49). Ia ada di dalam
          kotak, bukan di luar, karena urutannya bagian dari alasan kotak ini ada:
          tulis dulu, baru bandingkan.
        */}
        <button
          type="button"
          onClick={onBandingkan}
          className="rounded border px-3 py-1.5 text-sm"
          style={{ borderColor: "var(--color-border)" }}
        >
          {kamus.kotakPenjelasanBandingkan}
        </button>
      </div>

      {/*
        Status penyimpanan. `role="status"` (live region yang sopan), sama seperti
        umpan balik Kuis — bukan `role="alert"`, karena ini hasil tindakan pemakai
        sendiri, bukan kejadian yang perlu merebut perhatian. Wadahnya selalu ada
        supaya live region sudah di DOM saat isinya berubah.
      */}
      <div role="status" className="mt-2 min-h-5 text-sm">
        {sedangMemuat && (
          <span style={{ color: "var(--color-muted)" }}>{kamus.kotakPenjelasanMemuat}</span>
        )}
        {status.kind === "tersimpan" && (
          <span style={{ color: "var(--color-accent)" }}>{kamus.kotakPenjelasanTersimpan}</span>
        )}
        {status.kind === "galat" && (
          <span style={{ color: "var(--color-accent)" }}>{status.pesan}</span>
        )}
      </div>

      {/* Dinyatakan terang-terangan supaya pemelajar tidak takut menulis tidak lengkap. */}
      <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
        {kamus.kotakPenjelasanTanpaNilai}
      </p>
    </div>
  );
}
