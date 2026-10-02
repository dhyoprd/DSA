"use client";

import { useEffect, useState } from "react";

import type { Kamus } from "@/lib/bahasa/kamus.ts";
import { ambilProgres, unduhProgres } from "@/lib/api";
import { ambilToken, hapusToken, normalkanToken, simpanToken } from "@/lib/token.ts";

/**
 * Formulir memasukkan token, dan tombol mengunduh Progres.
 *
 * Ini antarmuka yang memenuhi "token dimasukkan sekali" (user story 61). Bentuknya
 * sengaja sesederhana mungkin: tempel token, simpan, dan token itu dipakai untuk
 * semua permintaan berikutnya.
 *
 * Token **diverifikasi sebelum disimpan**, bukan sesudah. Kalau disimpan lebih dulu,
 * token yang salah akan tersimpan dan pemakai baru tahu saat membuka halaman lain —
 * dan tidak ada yang memberi tahu bahwa yang salah adalah tokennya. Dengan urutan
 * ini, pesan galat muncul tepat di tempat pemakai menempelkannya.
 *
 * Komponen ini klien (`"use client"`) karena `localStorage` hanya ada di browser.
 * Halaman yang memuatnya tetap statis; hanya bagian ini yang berjalan di browser.
 *
 * Teksnya diterima lewat `kamus` (ticket #12). Galat dari `api.ts` juga memakai kamus
 * ini, supaya pesan seperti "Token tidak diterima" ikut berganti bahasa.
 */

interface Props {
  /** Kamus bahasa yang sedang berlaku. */
  kamus: Kamus;
}

type Keadaan =
  | { kind: "memeriksa" }
  | { kind: "belum-diisi" }
  | { kind: "tersimpan" }
  | { kind: "menyimpan" }
  | { kind: "galat"; pesan: string };

export function TokenForm({ kamus }: Props) {
  const [keadaan, setKeadaan] = useState<Keadaan>({ kind: "memeriksa" });
  const [masukan, setMasukan] = useState("");

  // Token diperiksa saat komponen dipasang, bukan saat render: `localStorage` tidak
  // ada di server, jadi membacanya saat render akan berbeda antara server dan browser.
  useEffect(() => {
    setKeadaan(ambilToken() === null ? { kind: "belum-diisi" } : { kind: "tersimpan" });
  }, []);

  async function simpan(peristiwa: React.FormEvent) {
    peristiwa.preventDefault();
    setKeadaan({ kind: "menyimpan" });

    const kandidat = normalkanToken(masukan);
    if (kandidat === null) {
      setKeadaan({ kind: "galat", pesan: kamus.tokenKosong });
      return;
    }

    try {
      // Token diuji ke backend SEBELUM disimpan. Urutan ini penting: kalau disimpan
      // lebih dulu, token yang salah akan sempat tersimpan, dan halaman lain akan
      // memakainya sambil gagal tanpa menjelaskan kenapa.
      await ambilProgres(kandidat, kamus);
    } catch (galat) {
      // `ambilProgres` sudah menerjemahkan status HTTP menjadi pesan yang berguna.
      const pesan = galat instanceof Error ? galat.message : kamus.galatBackendMati;
      setKeadaan({ kind: "galat", pesan });
      return;
    }

    // Sampai di sini tokennya sudah terbukti diterima backend.
    if (!simpanToken(kandidat)) {
      setKeadaan({
        kind: "galat",
        pesan: kamus.tokenTidakBisaDisimpan,
      });
      return;
    }

    setKeadaan({ kind: "tersimpan" });
    setMasukan("");
  }

  function lupakan() {
    hapusToken();
    setMasukan("");
    setKeadaan({ kind: "belum-diisi" });
  }

  async function unduh() {
    try {
      await unduhProgres(kamus);
    } catch (galat) {
      const pesan = galat instanceof Error ? galat.message : kamus.galatBackendMati;
      setKeadaan({ kind: "galat", pesan });
    }
  }

  return (
    <section
      className="rounded-lg border p-4"
      style={{ borderColor: "var(--color-border)" }}
      aria-labelledby="judul-token"
    >
      <h2 id="judul-token" className="text-sm font-semibold">
        {kamus.token}
      </h2>

      <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
        {kamus.tokenRingkasan}
      </p>

      {keadaan.kind === "memeriksa" && (
        <p className="mt-3 text-sm" style={{ color: "var(--color-muted)" }}>
          {kamus.tokenMemeriksa}
        </p>
      )}

      {keadaan.kind === "tersimpan" && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm" style={{ color: "var(--color-accent)" }}>
            {kamus.tokenTersimpan}
          </p>
          <button
            type="button"
            onClick={lupakan}
            className="rounded border px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          >
            {kamus.tokenLupakan}
          </button>
          {/*
            Tombol, bukan <a href>. Unduhan ini butuh header `Authorization`, dan
            navigasi biasa tidak membawa header — tautan biasa akan berakhir `401`.
            Jadi berkasnya diambil lewat fetch lalu dijadikan blob, dan unduhannya
            dipicu dari sini.
          */}
          <button
            type="button"
            onClick={() => {
              void unduh();
            }}
            className="rounded border px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          >
            {kamus.tokenUnduh}
          </button>
        </div>
      )}

      {(keadaan.kind === "belum-diisi" ||
        keadaan.kind === "menyimpan" ||
        keadaan.kind === "galat") && (
        <form onSubmit={simpan} className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="token" className="sr-only">
            {kamus.tokenLabel}
          </label>
          <input
            id="token"
            type="password"
            value={masukan}
            onChange={(peristiwa) => {
              setMasukan(peristiwa.target.value);
            }}
            placeholder={kamus.tokenPlaceholder}
            autoComplete="off"
            className="min-w-0 flex-1 rounded border px-3 py-1.5 font-mono text-sm"
            style={{
              borderColor: "var(--color-border)",
              background: "transparent",
              color: "var(--color-fg)",
            }}
          />
          <button
            type="submit"
            disabled={keadaan.kind === "menyimpan"}
            className="rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            /*
             * `--color-accent-fg`, bukan `white`. Di tema gelap aksennya adalah merah
             * terang, dan teks putih di atasnya hanya mencapai kontras 2,8:1 —
             * di bawah ambang. Token ini yang tahu warna teks yang benar untuk
             * masing-masing tema.
             */
            style={{ background: "var(--color-accent)", color: "var(--color-accent-fg)" }}
          >
            {keadaan.kind === "menyimpan" ? kamus.tokenMemeriksa : kamus.tokenSimpan}
          </button>
        </form>
      )}

      {keadaan.kind === "galat" && (
        <p role="alert" className="mt-2 text-sm" style={{ color: "var(--color-accent)" }}>
          {keadaan.pesan}
        </p>
      )}
    </section>
  );
}
