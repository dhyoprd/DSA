"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { ambilProgres, catatProgres, type BarisProgres } from "@/lib/api.ts";
import type { Kamus } from "@/lib/bahasa/kamus.ts";
import type { StatusProgres } from "@/lib/konten/tipe.ts";
import { gabungBaris } from "@/lib/progres/baris.ts";
import { petaStatus } from "@/lib/progres/status.ts";
import { ambilToken } from "@/lib/token.ts";

/**
 * Sumber tunggal Progres untuk satu halaman Topik.
 *
 * **Kenapa satu provider di tingkat halaman, bukan pembacaan per komponen.** Ticket
 * #27 mencatat bahwa halaman Topik **sudah** memunculkan 12 galat konsol `401` saat
 * dibuka tanpa token, dari Catatan (#11) dan Kuis (#8). Kalau Sidebar, setiap Kuis,
 * dan Soal Kode masing-masing membaca Progres, jumlahnya berlipat setiap kali halaman
 * dibuka. Di sini Progres dibaca **sekali**, dan seluruh komponen memakai hasil yang
 * sama.
 *
 * **Kenapa tidak membaca tanpa token sama sekali.** Token hidup di `localStorage`,
 * yang hanya ada di peramban — jadi pembacaan ini memang harus terjadi di klien, dan
 * itu tidak merusak halaman statis (yang dirender server adalah kerangka yang sama,
 * lalu provider hidup setelah React mengambil alih). Tetapi kalau tokennya belum
 * diisi, permintaannya pasti `401` dan tidak memberi apa pun. Jadi provider memeriksa
 * token lebih dulu dan **tidak mengirim** permintaan kalau tokennya belum ada — baik
 * untuk membaca maupun menulis. Kriteria "tanpa token tidak ada permintaan tulis yang
 * dikirim" dipenuhi di sini, dan galat konsolnya tidak bertambah.
 *
 * **Kegagalan tidak pernah merusak halaman.** Backend mati berarti Progres tidak bisa
 * dibaca; statusnya dibiarkan kosong, dan seluruh Topik tampil ○. Belajar tetap
 * berjalan — Materi dan Soal memang terbaca tanpa backend (user story 62), dan
 * pencatatan Progres yang gagal tidak boleh menghentikan Kuis atau Soal Kode.
 *
 * **Status per Topik dihitung dari status per Soal.** Backend menyimpan per Soal;
 * aturan penggabungannya ada di `lib/progres/status.ts` (ADR-0024), bukan di sini.
 */

/** Nilai yang dibagikan provider ke seluruh komponen di bawahnya. */
export interface NilaiProgres {
  /** Status tiap Topik, siap dipakai sidebar. Topik yang tidak ada berarti `belum`. */
  status: Record<string, StatusProgres>;
  /**
   * Catat satu jawaban. Tidak melakukan apa pun kalau token belum diisi, dan tidak
   * melempar kalau pencatatannya gagal — lihat catatan modul.
   */
  catat: (slugTopik: string, indeksSoal: number, benar: boolean) => Promise<void>;
}

/**
 * Nilai bawaan saat provider tidak ada.
 *
 * Sengaja tidak melempar: komponen seperti Kuis hanya tahu cara menggambar dirinya,
 * dan membuatnya gagal karena Progres tidak tersedia akan mengubah "Progres tidak
 * dilacak di sini" menjadi halaman yang rusak. Nilai bawaan ini berarti persis itu —
 * tidak ada yang dilacak, dan tidak ada yang rusak.
 */
const BAWAAN: NilaiProgres = {
  status: {},
  catat: () => Promise.resolve(),
};

const KonteksProgres = createContext<NilaiProgres>(BAWAAN);

/** Progres halaman ini. Lihat `BAWAAN` untuk perilaku saat provider tidak ada. */
export function useProgres(): NilaiProgres {
  return useContext(KonteksProgres);
}

interface Props {
  /**
   * Jumlah Soal setiap Topik yang **punya berkas**, dipetakan per slug.
   *
   * Dihitung di server dari konten, karena hanya di sana jumlah Soal diketahui.
   * Wajib: `statusTopik` tidak boleh menyimpulkan "semua Soal benar" dari panjang
   * baris Progres, sebab baris hanya ada untuk Soal yang pernah disentuh.
   */
  jumlahSoal: Record<string, number>;
  /** Kamus bahasa yang sedang berlaku, untuk pesan galat dari `api.ts`. */
  kamus: Kamus;
  children: ReactNode;
}

export function ProgresProvider({ jumlahSoal, kamus, children }: Props) {
  const [daftar, setDaftar] = useState<BarisProgres[]>([]);

  /*
   * Baca Progres sekali, saat provider dipasang.
   *
   * Tanpa token, pembacaan dilewati sepenuhnya — bukan dicoba lalu gagal. Itu yang
   * mencegah galat `401` bertambah setiap halaman Topik dibuka.
   *
   * `masihDipakai` mencegah pembaruan keadaan setelah provider dilepas, sama seperti
   * pola di `kuis.tsx`. Kegagalan dibiarkan: `daftar` tetap kosong, dan itu berarti
   * seluruh Topik tampil ○ — keadaan yang benar ketika Progres tidak bisa dibaca.
   */
  useEffect(() => {
    let masihDipakai = true;

    if (ambilToken() === null) return undefined;

    ambilProgres(undefined, kamus)
      .then((baris) => {
        if (masihDipakai) setDaftar(baris);
      })
      .catch(() => {
        // Backend mati atau token ditolak. Status tetap kosong.
      });

    return () => {
      masihDipakai = false;
    };
  }, [kamus]);

  /*
   * Pencatatan satu jawaban.
   *
   * Tanpa token: tidak ada permintaan yang dikirim. Kegagalan pencatatan ditelan
   * dengan sengaja — Progres adalah catatan kemajuan, bukan syarat untuk belajar, dan
   * menampilkan galat di tengah Kuis atau Eksekusi Kode akan mengalihkan perhatian
   * dari hal yang sedang dikerjakan. Pola yang sama dipakai `kuis.tsx` saat memuat
   * Kotak Penjelasan.
   *
   * Baris yang dibalas backend ditempelkan ke daftar yang sudah ada, sehingga status
   * Topik di sidebar ikut berubah tanpa permintaan baca kedua.
   */
  const catat = useCallback(
    async (slugTopik: string, indeksSoal: number, benar: boolean) => {
      if (ambilToken() === null) return;

      try {
        const baris = await catatProgres(slugTopik, indeksSoal, benar, kamus);
        setDaftar((lama) => gabungBaris(lama, baris));
      } catch {
        // Lihat catatan di atas.
      }
    },
    [kamus],
  );

  const nilai = useMemo<NilaiProgres>(
    () => ({ status: petaStatus(daftar, jumlahSoal), catat }),
    [daftar, jumlahSoal, catat],
  );

  return <KonteksProgres.Provider value={nilai}>{children}</KonteksProgres.Provider>;
}
