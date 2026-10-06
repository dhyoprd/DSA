"use client";

import { useEffect, useRef, useState } from "react";

import { jalankanKode } from "@/lib/api.ts";
import type { Kamus } from "@/lib/bahasa/kamus.ts";
import { ambilDraf, hapusDraf, kunciDraf, simpanDraf } from "@/lib/eksekusi/draf.ts";
import { kerangkaAwal } from "@/lib/eksekusi/kerangka.ts";
import {
  punyaCetakan,
  ringkas,
  teksNilai,
  type KalimatEksekusi,
  type RingkasanHasil,
} from "@/lib/eksekusi/ringkasan.ts";
import type { HasilEksekusi, TestCase } from "@/lib/eksekusi/tipe.ts";

/**
 * Editor dan penjalan satu Soal Kode.
 *
 * Komponen klien karena tiga hal hanya ada di peramban: kode yang sedang ditulis,
 * draf yang tersimpan, dan permintaan eksekusi. Halaman Topik yang memuatnya tetap
 * statis — yang dirender server hanyalah kerangkanya.
 *
 * **Yang tidak dikerjakan di sini.** Seluruh aturan penerjemahan hasil hidup di
 * `src/lib/eksekusi/ringkasan.ts` sebagai fungsi murni, dan aturan penyimpanan draf di
 * `draf.ts`. Komponen ini hanya memanggilnya dan menggambar hasilnya. Kalau aturannya
 * ditulis di sini, ia hanya bisa diuji dengan merender React — dan justru pemetaan
 * status ke pesan (timeout vs galat sintaks) yang paling perlu diuji tanpa render.
 *
 * **Kode awal diisi ke editor, bukan disembunyikan di balik tombol.** Versi pertama
 * memakai tombol "mulai dari kode awal", dan itu menambah satu langkah yang tidak
 * memberi pilihan apa pun: kode awalnya sama untuk semua orang, dan editor kosong
 * tidak berguna bagi pemelajar yang belum pernah menulis Python. Mengisinya langsung
 * membuat pemelajar bisa mulai bekerja tanpa menebak.
 *
 * **Draf tidak menimpa tulisan yang sudah ada.** Draf dibaca sekali saat komponen
 * dipasang; kalau ada, ia yang dipakai; kalau tidak, kode awal. Urutan itu penting —
 * kode awal tidak boleh menimpa draf pemelajar, dan draf tidak boleh ditimpa kode awal
 * setiap kali komponen dirender ulang.
 */

interface Props {
  /** Slug Topik, bagian dari kunci draf dan alamat permintaan. */
  slugTopik: string;
  /** Bahasa yang sedang berlaku. Bagian dari kunci draf. */
  bahasa: string;
  /** Posisi Soal di dalam `topik.soal`. Bagian dari kunci draf. */
  indeksSoal: number;
  /** Nama fungsi yang dipanggil test case. */
  fungsi: string;
  /** Test case Soal ini, dari halaman. */
  testCase: TestCase[];
  /** Kamus bahasa yang sedang berlaku. */
  kamus: Kamus;
}

/** Keadaan tombol jalankan. */
type StatusJalan = "diam" | "menjalan";

export function SoalKode({ slugTopik, bahasa, indeksSoal, fungsi, testCase, kamus }: Props) {
  const kunci = kunciDraf(bahasa as never, slugTopik, indeksSoal);
  const kodeAwal = kerangkaAwal(fungsi);

  const [kode, setKode] = useState(kodeAwal);
  const [status, setStatus] = useState<StatusJalan>("diam");
  const [hasil, setHasil] = useState<HasilEksekusi | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  /*
   * Draf dibaca sekali, saat komponen dipasang.
   *
   * `useRef` dipakai sebagai penanda "sudah pernah dibaca", bukan `useState`: kalau
   * penandanya ikut memicu render, efek ini bisa berjalan lagi setelah pemelajar
   * menyunting, dan draf lama menimpa suntingannya. Sama dengan editor Catatan.
   */
  const sudahDibaca = useRef(false);

  useEffect(() => {
    if (sudahDibaca.current) return;
    sudahDibaca.current = true;

    const draf = ambilDraf(kunci);
    // Hanya draf yang **ada** yang menggantikan kode awal. Draf kosong sengaja tidak
    // menggantikannya: pemelajar yang mengosongkan kotaknya lalu berpindah halaman
    // akan menemukan kode awalnya lagi, dan itu lebih berguna daripada kotak kosong.
    if (draf !== null && draf.length > 0) setKode(draf);
  }, [kunci]);

  /*
   * Simpan draf setiap kali kode berubah (kriteria penerimaan #10: "Draft kode tidak
   * hilang saat berpindah halaman"). Kegagalan menyimpan diabaikan — penyimpanan draf
   * adalah kenyamanan, bukan fitur yang kegagalannya perlu mengganggu pemelajar yang
   * sedang menulis kode.
   */
  function ubahKode(baru: string) {
    setKode(baru);
    simpanDraf(kunci, baru);
    // Hasil lama dibersihkan begitu kodenya berubah: membiarkannya berarti
    // menampilkan hasil untuk kode yang sudah tidak ada lagi di editor.
    if (hasil !== null) setHasil(null);
    if (galat !== null) setGalat(null);
  }

  /** Kembalikan editor ke kode awal, dan buang drafnya. */
  function kembalikan() {
    setKode(kodeAwal);
    hapusDraf(kunci);
    setHasil(null);
    setGalat(null);
  }

  async function jalankan() {
    setStatus("menjalan");
    setGalat(null);

    try {
      const balasan = await jalankanKode(
        {
          topik_slug: slugTopik,
          soal_indeks: indeksSoal,
          kode,
          fungsi,
          test_case: testCase,
        },
        kamus,
      );
      setHasil(balasan);
    } catch (kesalahan) {
      // Sampai di sini berarti permintaannya tidak pernah dijalankan (token salah,
      // backend mati, kode terlalu panjang). `api.ts` sudah menerjemahkannya.
      setHasil(null);
      setGalat(kesalahan instanceof Error ? kesalahan.message : kamus.galatBackendMati);
    } finally {
      setStatus("diam");
    }
  }

  const sedangJalan = status === "menjalan";
  const kalimat = kalimatDari(kamus);

  return (
    <section className="mt-10" aria-labelledby="soal-kode-judul">
      <h3 id="soal-kode-judul" className="text-lg font-semibold tracking-tight">
        {kamus.soalKode}
      </h3>

      {/*
        Skenario Soal sudah dirender di atas editor oleh `daftar-soal-kode.tsx` —
        di situ ia bisa memakai `TeksKaya` di server. Yang tersisa di sini hanya
        keterangan teknis: nama fungsi yang dipanggil test case.
      */}
      <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
        {kamus.soalKodeFungsi} <code className="font-mono">{fungsi}</code>
      </p>

      <label htmlFor="soal-kode-editor" className="mt-5 block text-sm font-medium">
        {kamus.soalKodeLabel}
      </label>

      {/*
        `font-mono` karena isinya kode, dan `text-base` supaya iOS tidak memperbesar
        halaman saat kotak ini difokuskan (sama dengan editor Catatan). `spellCheck`
        dimatikan: pemeriksa ejaan peramban menandai hampir setiap kata Python.
      */}
      <textarea
        id="soal-kode-editor"
        value={kode}
        onChange={(peristiwa) => ubahKode(peristiwa.target.value)}
        rows={12}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className="mt-1 w-full resize-y rounded border px-3 py-2 font-mono text-base"
        style={{
          borderColor: "var(--color-border)",
          background: "transparent",
          color: "var(--color-fg)",
          tabSize: 4,
        }}
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            void jalankan();
          }}
          disabled={sedangJalan}
          className="rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--color-accent)", color: "var(--color-accent-fg)" }}
        >
          {sedangJalan ? kamus.soalKodeMenjalankan : kamus.soalKodeJalankan}
        </button>

        <button
          type="button"
          onClick={kembalikan}
          disabled={sedangJalan}
          className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
          style={{ borderColor: "var(--color-border)" }}
        >
          {kamus.soalKodeKembalikan}
        </button>
      </div>

      {/*
        Umpan balik. `role="status"` (live region yang sopan), sama seperti Kuis dan
        Catatan — bukan `role="alert"`, karena ini hasil tindakan pemakai sendiri.
        Wadahnya selalu ada supaya live region sudah di DOM saat isinya berubah.
      */}
      <div role="status" className="mt-4">
        {galat !== null && (
          <p className="text-sm" style={{ color: "var(--color-accent)" }}>
            {galat}
          </p>
        )}

        {hasil !== null && (
          <TampilanHasil hasil={hasil} kalimat={kalimat} kamus={kamus} />
        )}
      </div>
    </section>
  );
}

/**
 * Hasil eksekusi: ringkasan, lalu rincian per test case.
 *
 * Dipisah sebagai komponen sendiri supaya `SoalKode` tetap terbaca sebagai alur
 * (editor → tombol → hasil), dan supaya bagian yang menggambar hasil tidak bercampur
 * dengan bagian yang mengurus keadaan editor.
 */
function TampilanHasil({
  hasil,
  kalimat,
  kamus,
}: {
  hasil: HasilEksekusi;
  kalimat: KalimatEksekusi;
  kamus: Kamus;
}) {
  const ringkasan = ringkas(hasil, kalimat);

  return (
    <div>
      <p
        className="text-sm font-medium"
        style={{ color: ringkasan.semuaLulus ? "var(--color-accent)" : "var(--color-fg)" }}
      >
        {ringkasan.pesan}
      </p>

      {/*
        Rincian dari backend (mis. "invalid syntax (baris 3)") — inilah yang memberi
        tahu pemelajar **di mana** kesalahannya, jadi ia ditampilkan sebagai kode.
      */}
      {ringkasan.rincian !== null && (
        <pre
          className="mt-2 overflow-x-auto rounded border px-3 py-2 font-mono text-xs"
          style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
        >
          {ringkasan.rincian}
        </pre>
      )}

      {ringkasan.jumlahKasus > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {hasil.kasus.map((kasus) => (
            <li
              key={kasus.indeks}
              className="rounded border px-3 py-2"
              style={{ borderColor: "var(--color-border)" }}
            >
              <p className="text-sm font-medium">
                {kamus.soalKodeKasus} {kasus.indeks + 1}{" "}
                <span style={{ color: kasus.lulus ? "var(--color-accent)" : "var(--color-muted)" }}>
                  {kasus.lulus ? kamus.soalKodeLulus : kamus.soalKodeGagal}
                </span>
              </p>

              {/*
                Kriteria penerimaan #10: "Terlihat input, output yang dihasilkan, dan
                output yang diharapkan". Ketiganya ditampilkan sebagai kode apa adanya
                — nilai yang dikembalikan kode harus terlihat persis, termasuk bentuk
                `null` dan daftarnya.
              */}
              <dl className="mt-1 flex flex-col gap-0.5 font-mono text-xs" style={{ color: "var(--color-muted)" }}>
                <Baris label={kamus.soalKodeMasukan} nilai={teksNilai(kasus.argumen, kalimat)} />
                <Baris label={kamus.soalKodeHasilDihasilkan} nilai={teksNilai(kasus.hasil, kalimat)} />
                <Baris label={kamus.soalKodeHasilDiharapkan} nilai={teksNilai(kasus.diharapkan, kalimat)} />
              </dl>

              {/*
                Pesan galat kasus ini — mis. `IndexError` karena `pop` pada Stack
                kosong. Ditampilkan terpisah dari "hasil", karena "tidak ada hasil"
                berbeda dari "hasilnya salah".
              */}
              {kasus.galat !== null && (
                <pre
                  className="mt-1 overflow-x-auto font-mono text-xs"
                  style={{ color: "var(--color-accent)" }}
                >
                  {kasus.galat}
                </pre>
              )}

              {/*
                Yang dicetak pemelajar. Hanya muncul kalau ada isinya — sebagian besar
                kode tidak mencetak apa pun, dan baris "Cetakan: " yang kosong di setiap
                kasus hanya menambah kebisingan.
              */}
              {punyaCetakan(kasus) && (
                <pre
                  className="mt-1 overflow-x-auto rounded border px-2 py-1 font-mono text-xs"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  {kamus.soalKodeCetakan}: {kasus.keluaran}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Satu baris label–nilai di dalam rincian kasus. */
function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0">{label}:</dt>
      <dd className="min-w-0 break-all">{nilai}</dd>
    </div>
  );
}

/**
 * Kumpulkan kalimat dari kamus menjadi bentuk yang dipakai `ringkasan.ts`.
 *
 * Dipisah sebagai fungsi supaya pemetaan kamus → kalimat ada di satu tempat: menambah
 * kalimat di kamus lalu lupa memetakannya di sini akan menghasilkan teks kosong di
 * layar, dan itu kegagalan yang tidak dilihat tipe.
 */
function kalimatDari(kamus: Kamus): KalimatEksekusi {
  return {
    ringkasan: kamus.soalKodeJumlahLulus,
    semuaLulus: kamus.soalKodeSemuaLulus,
    galatSintaks: kamus.soalKodeGalatSintaks,
    galatJalan: kamus.soalKodeGalatJalan,
    lewatWaktu: kamus.soalKodeLewatWaktu,
    kontainerGagal: kamus.soalKodeKontainerGagal,
    galatLayanan: kamus.soalKodeGalatLayanan,
    nilaiTidakTersedia: kamus.soalKodeNilaiTidakAda,
    masukan: kamus.soalKodeMasukan,
    hasilDihasilkan: kamus.soalKodeHasilDihasilkan,
    hasilDiharapkan: kamus.soalKodeHasilDiharapkan,
    cetakan: kamus.soalKodeCetakan,
    lulus: kamus.soalKodeLulus,
    gagal: kamus.soalKodeGagal,
  };
}
