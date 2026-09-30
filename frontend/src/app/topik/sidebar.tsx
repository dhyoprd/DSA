import Link from "next/link";

import type { BarisNavigasi } from "@/lib/konten/navigasi.ts";
import { nomorDuaDigit } from "@/lib/konten/nomor.ts";
import type { StatusProgres } from "@/lib/konten/tipe.ts";

import { PenandaProgres } from "./penanda-progres.tsx";

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
 * Ini komponen server. Progres diterima sebagai prop, bukan dibaca sendiri, karena
 * datanya baru ada di ticket #7.
 */

interface Props {
  /** 12 baris Jalur, dari `susunNavigasi`. */
  baris: BarisNavigasi[];
  /** Slug Topik yang sedang dibuka, untuk menandai baris aktif. */
  slugAktif?: string;
  /**
   * Status Progres per slug. Slug yang tidak ada di sini dianggap `"belum"`.
   *
   * Kosong sampai ticket #8 menyambungkan endpoint Progres dari #7.
   */
  status?: Record<string, StatusProgres>;
}

export function Sidebar({ baris, slugAktif, status = {} }: Props) {
  return (
    <nav aria-label={`Jalur, ${String(baris.length)} Topik`} className="lg:sticky lg:top-8">
      <p
        className="font-mono text-xs tracking-widest uppercase"
        style={{ color: "var(--color-muted)" }}
      >
        Jalur · {baris.length} Topik
      </p>

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
              status={status[item.slug] ?? "belum"}
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
  status,
}: {
  item: BarisNavigasi;
  aktif: boolean;
  status: StatusProgres;
}) {
  const nomor = nomorDuaDigit(item.nomor);

  const isi = (
    <>
      <PenandaProgres status={status} kelas="text-xs" />
      <span
        className="font-mono text-xs tabular-nums"
        style={{ color: "var(--color-muted)" }}
      >
        {nomor}
      </span>
      <span className="truncate">{item.judul.id}</span>
      {!item.tersedia && (
        <span
          className="ml-auto font-mono text-[0.65rem] tracking-wider uppercase"
          style={{ color: "var(--color-muted)" }}
        >
          segera
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
      href={`/topik/${item.slug}`}
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
