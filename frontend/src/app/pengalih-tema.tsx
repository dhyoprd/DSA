"use client";

import { useEffect, useState } from "react";

import {
  PILIHAN_TEMA,
  ambilPilihanTema,
  pasangTema,
  simpanPilihanTema,
  type PilihanTema,
} from "@/lib/tema.ts";

/**
 * Pengalih tema: Sistem / Terang / Gelap.
 *
 * Tiga pilihan, bukan dua, karena `docs/design-tree.md` menetapkan tema awal
 * mengikuti pengaturan sistem. Dengan hanya Terang dan Gelap, sekali memilih berarti
 * pemakai kehilangan kemampuan kembali mengikuti sistem, kecuali dengan menghapus
 * data peramban.
 *
 * Komponen ini klien (`"use client"`) karena `localStorage` dan `<html>` hanya ada di
 * peramban. Halaman yang memuatnya tetap statis.
 *
 * **Tema halaman dipasang skrip sebaris di `layout.tsx`, bukan di sini.** Skrip itu
 * berjalan sebelum cat pertama, sehingga tidak ada kedipan saat halaman dibuka.
 * Komponen ini hanya menggambar pilihan yang sedang aktif, dan memasang tema saat
 * pemakai mengubahnya.
 */

/** Label tiap pilihan, dipakai sebagai teks tombol. */
const LABEL: Record<PilihanTema, string> = {
  sistem: "Sistem",
  terang: "Terang",
  gelap: "Gelap",
};

export function PengalihTema() {
  /*
   * `null` berarti "belum diketahui", dan itu keadaan yang benar untuk render
   * pertama: nilai sesungguhnya hanya ada di peramban. Menebaknya di sini — misalnya
   * dengan `"sistem"` — akan membuat tombol yang ditandai aktif berbeda antara HTML
   * statis dan hasil hidrasi, dan React akan mengeluh tentang ketidakcocokan.
   *
   * Selama `null`, tombolnya tetap tampil dan tetap bisa diklik; hanya penanda
   * aktifnya yang belum ada.
   */
  const [dipilih, setDipilih] = useState<PilihanTema | null>(null);
  const [gagalDiingat, setGagalDiingat] = useState(false);

  useEffect(() => {
    const tersimpan = ambilPilihanTema();
    setDipilih(tersimpan);

    /*
     * Pasang ulang atributnya.
     *
     * Di produksi ini tidak melakukan apa pun yang belum dikerjakan skrip sebaris.
     * Di pengembangan, Strict Mode me-remount komponen sekali, dan pada remount itu
     * React mengembalikan `<html>` ke atribut yang ia kelola sendiri — yaitu
     * menghapus `data-theme` yang dipasang skrip. Tanpa baris ini, tema yang dipilih
     * tampak hilang setiap kali halaman dimuat ulang di pengembangan.
     */
    pasangTema(tersimpan);
  }, []);

  function pilih(pilihan: PilihanTema) {
    // Urutannya penting: pasang dulu supaya warna berubah seketika, baru simpan.
    // Kalau menyimpan gagal, pemakai tetap mendapat tema yang ia minta untuk sesi
    // ini — hanya saja tidak diingat.
    pasangTema(pilihan);
    setDipilih(pilihan);
    setGagalDiingat(!simpanPilihanTema(pilihan));
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {/*
        Satu grup tombol, bukan `<select>`: hanya tiga pilihan, dan tombol membuat
        pilihan yang aktif terlihat tanpa membuka apa pun.
      */}
      <div
        role="group"
        aria-label="Tema"
        className="inline-flex rounded-md border p-0.5"
        style={{ borderColor: "var(--color-border)" }}
      >
        {PILIHAN_TEMA.map((pilihan) => {
          const aktif = dipilih === pilihan;

          return (
            <button
              key={pilihan}
              type="button"
              onClick={() => {
                pilih(pilihan);
              }}
              /*
               * `aria-pressed`, bukan `aria-current`: ini tombol yang menyatakan
               * keadaannya sendiri, bukan penanda posisi di dalam navigasi.
               */
              aria-pressed={aktif}
              className="rounded px-2.5 py-1 text-xs font-medium"
              style={{
                background: aktif ? "var(--color-accent)" : "transparent",
                color: aktif ? "var(--color-accent-fg)" : "var(--color-muted)",
                transitionProperty: "background-color, color",
                transitionDuration: "var(--dur-cepat)",
              }}
            >
              {LABEL[pilihan]}
            </button>
          );
        })}
      </div>

      {/*
        Kegagalan menyimpan jarang terjadi, tetapi diam saja berarti pemakai mengira
        pilihannya tersimpan padahal tidak, dan ia akan bingung keesokan harinya.
      */}
      {gagalDiingat && (
        <p role="status" className="text-xs" style={{ color: "var(--color-muted)" }}>
          Tema tidak bisa diingat di peramban ini.
        </p>
      )}
    </div>
  );
}
