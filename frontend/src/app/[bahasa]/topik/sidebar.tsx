import Link from "next/link";

import type { Bahasa } from "@/lib/bahasa/bahasa.ts";
import type { Kamus } from "@/lib/bahasa/kamus.ts";
import type { BarisNavigasi } from "@/lib/konten/navigasi.ts";
import { nomorDuaDigit } from "@/lib/konten/nomor.ts";

import { PenandaProgresTopik } from "./penanda-progres-topik.tsx";

/**
 * Sidebar Jalur: seluruh 12 Topik, urut nomor.
 *
 * Tiga keadaan yang dibedakan jelas, karena ketiganya mudah tertukar:
 *
 * - **Tersedia** — punya berkas Materi, bisa diklik.
 * - **Segera** — belum ditulis. Tampil redup, **bukan** tautan, dan berlabel
 *   "segera". Issue #1 meminta ini supaya cakupan penuh terlihat sejak hari pertama
 *   tanpa pembaca tersesat ke halaman kosong. Karena bukan tautan, ia juga tidak
 *   masuk urutan tab — pembaca keyboard tidak berhenti di sesuatu yang tidak bisa
 *   dibuka.
 * - **Aktif** — Topik yang sedang dibuka, ditandai `aria-current="page"`.
 *
 * Bentuknya menyesuaikan lebar layar tanpa JavaScript: kolom vertikal yang menempel
 * di sisi kiri pada layar lebar, dan pita mendatar yang bisa digulir di layar sempit.
 * Pita dipilih daripada daftar tegak karena 12 baris yang harus dilewati setiap kali
 * membuka halaman akan mengubur Materi di HP. Satu daftar, satu DOM — bukan dua
 * salinan yang harus dijaga sepakat.
 *
 * Ini komponen server. Status Progres **tidak** dibaca di sini, melainkan oleh
 * `PenandaProgresTopik` — komponen klien kecil per baris yang membacanya dari
 * `ProgresProvider` (ticket #27). Membacanya di sini berarti React context, dan
 * context tidak bisa dibaca dari komponen server. Memisahkannya begini menjaga
 * seluruh daftar Jalur tetap di luar bundel klien: yang menyeberang hanya enam
 * lambang. Bahasa dan kamus juga props (ticket #12).
 */

interface Props {
  /** 12 baris Jalur, dari `susunNavigasi`. */
  baris: BarisNavigasi[];
  /** Slug Topik yang sedang dibuka, untuk menandai baris aktif. */
  slugAktif?: string;
  /** Bahasa yang sedang berlaku, untuk judul dan tautan. */
  bahasa: Bahasa;
  /** Kamus bahasa yang sedang berlaku. */
  kamus: Kamus;
}

export function Sidebar({ baris, slugAktif, bahasa, kamus }: Props) {
  return (
    <nav
      aria-label={`${kamus.jalur}, ${String(baris.length)} ${kamus.topikJamak}`}
      className="lg:sticky lg:top-8"
    >
      <p
        className="font-mono text-xs tracking-widest uppercase"
        style={{ color: "var(--color-muted)" }}
      >
        {kamus.jalur} · {baris.length} {kamus.topikJamak}
      </p>

      {/*
        Tautan ke pencarian (ticket #13). Diletakkan di atas daftar Topik, bukan di
        bawahnya: saat sedang membaca Topik ke-8 dan lupa di mana suatu istilah
        dibahas, tautan ini yang dicari — dan ia harus terlihat sebelum 12 baris
        Jalur menggulirnya ke luar layar. Di HP ia berada **di luar** pita Jalur yang
        menggulir mendatar, jadi ia tidak ikut tergulir: selalu terlihat, apa pun
        posisi geser pita.
      */}
      <Link
        href={`/${bahasa}/pencarian`}
        className="mt-2 block text-sm font-medium underline underline-offset-4"
        style={{ color: "var(--color-accent)" }}
      >
        {kamus.pencarianBuka}
      </Link>

      <ul
        className="mt-3 flex gap-2 overflow-x-auto pb-2 lg:mt-4 lg:flex-col lg:gap-0.5 lg:overflow-x-visible lg:pb-0"
        // Pita mendatar di HP: gulir dengan gesek, tanpa memotong baris.
        style={{ scrollbarWidth: "thin" }}
      >
        {baris.map((item) => (
          <li key={item.slug} className="shrink-0 lg:shrink">
            <BarisJalur
              item={item}
              aktif={item.slug === slugAktif}
              bahasa={bahasa}
              kamus={kamus}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Satu baris: tautan kalau tersedia, teks redup berlabel "segera" kalau belum. */
function BarisJalur({
  item,
  aktif,
  bahasa,
  kamus,
}: {
  item: BarisNavigasi;
  aktif: boolean;
  bahasa: Bahasa;
  kamus: Kamus;
}) {
  const nomor = nomorDuaDigit(item.nomor);

  const isi = (
    <>
      <PenandaProgresTopik slug={item.slug} kamus={kamus} kelas="text-xs" />
      <span
        className="font-mono text-xs tabular-nums"
        style={{ color: "var(--color-muted)" }}
      >
        {nomor}
      </span>
      <span className="truncate">{item.judul[bahasa]}</span>
      {!item.tersedia && (
        <span
          className="ml-auto font-mono text-[0.65rem] tracking-wider uppercase"
          style={{ color: "var(--color-muted)" }}
        >
          {kamus.segera}
        </span>
      )}
    </>
  );

  const dasar =
    "flex items-center gap-2 rounded px-2 py-1.5 text-sm whitespace-nowrap transition-colors";

  // Topik yang belum ditulis: bukan tautan sama sekali, jadi tidak bisa diklik dan
  // tidak ikut urutan tab. `cursor-not-allowed` memberi petunjuk visual bahwa ini
  // memang sengaja, bukan tautan yang rusak.
  //
  // Sengaja **tanpa** `aria-disabled`: atribut itu diabaikan pada elemen tanpa role,
  // jadi ia hanya akan tampak seperti sedang memberi tahu sesuatu. Menambahkan
  // `role="link"` supaya atribut itu berlaku justru lebih buruk — ia mengumumkan
  // tautan yang tidak bisa diaktifkan. Yang menyampaikan keadaan ini ke pembaca layar
  // adalah kata "segera" yang memang ikut terbaca di dalam barisnya.
  if (!item.tersedia) {
    return (
      <span className={`${dasar} cursor-not-allowed opacity-45 lg:w-full`}>{isi}</span>
    );
  }

  return (
    <Link
      href={`/${bahasa}/topik/${item.slug}`}
      className={`${dasar} hover:bg-[color-mix(in_srgb,var(--color-fg)_6%,transparent)] lg:w-full`}
      style={{
        // Topik aktif ditandai latar tipis + aksen di nomor, bukan hanya warna teks,
        // supaya tetap terbaca oleh pembaca yang tidak membedakan warna.
        background: aktif
          ? "color-mix(in srgb, var(--color-fg) 8%, transparent)"
          : undefined,
        color: aktif ? "var(--color-fg)" : "var(--color-muted)",
      }}
      aria-current={aktif ? "page" : undefined}
    >
      {isi}
    </Link>
  );
}
