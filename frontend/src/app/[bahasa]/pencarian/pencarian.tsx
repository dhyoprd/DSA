"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";

import type { Kamus } from "@/lib/bahasa/kamus.ts";
import { cari, type HasilPencarian, type RentangSorot } from "@/lib/pencarian/cari.ts";
import type { EntriPencarian } from "@/lib/pencarian/indeks.ts";

/**
 * Kotak pencarian Materi (ticket #13).
 *
 * **Kenapa komponen klien.** Kriteria penerimaan meminta hasil muncul saat mengetik,
 * tanpa memuat ulang halaman. Itu berarti pencocokan berjalan di peramban, di atas
 * indeks yang dikirim server sebagai prop. Halaman yang memuatnya tetap statis.
 *
 * **Indeks dikirim, bukan dihitung di sini.** Penyusunan indeks (`susunIndeks`)
 * menyentuh Materi di git dan hanya boleh berjalan di server. Komponen ini menerima
 * hasilnya sebagai nilai biasa — `EntriPencarian[]` seluruhnya bisa diserialkan, jadi
 * ia menyeberang batas server/klien tanpa masalah.
 *
 * **`useDeferredValue` menjaga ketikan tetap mulus.** Pencarian dijalankan ulang pada
 * setiap ketukan. Dengan satu Topik ini tidak terasa, tetapi mengetik di HP sambil
 * daftar hasil besar dirender ulang bisa membuat huruf terasa tertinggal.
 * `useDeferredValue` membiarkan kotak isian menampilkan huruf terbaru lebih dulu,
 * sementara daftar hasil menyusul — tanpa perlu men-debounce sendiri dengan timer,
 * dan tanpa keadaan "sedang memuat" yang harus dijelaskan.
 *
 * **Bahasa mengikuti prop, bukan dibaca di sini.** Sama seperti komponen lain:
 * bahasa datang dari URL, dan kamus diserahkan sebagai prop.
 */

interface Props {
  /** Seluruh bagian Materi yang bisa dicari, dalam bahasa yang berlaku. */
  indeks: EntriPencarian[];
  /** Bahasa yang sedang berlaku, untuk menyusun tautan hasil. */
  bahasa: string;
  /** Kamus bahasa yang sedang berlaku. */
  kamus: Kamus;
}

export function Pencarian({ indeks, bahasa, kamus }: Props) {
  const [kataKunci, setKataKunci] = useState("");
  const kataTertunda = useDeferredValue(kataKunci);

  const hasil = cari(indeks, kataTertunda);

  /*
   * Seluruh daerah hasil — jumlah, ajakan, pesan kosong, dan daftarnya — membaca
   * `kataTertunda`, bukan `kataKunci`. Kalau sebagian membaca nilai langsung dan
   * sebagian nilai tertunda, keduanya bisa berbeda satu render: mengosongkan kotak
   * akan sempat menampilkan "ketik untuk mencari" **bersamaan dengan** hasil lama
   * yang belum hilang. Satu sumber untuk seluruh daerah hasil membuat keadaannya
   * tidak mungkin bertentangan.
   *
   * Kotak isiannya sendiri tetap memakai `kataKunci` langsung — justru itu gunanya
   * menunda: huruf yang baru diketik muncul seketika, daftar hasilnya menyusul.
   */
  const adaKata = kataTertunda.trim().length > 0;

  return (
    <div>
      <label htmlFor="kotak-pencarian" className="text-sm font-medium">
        {kamus.pencarianLabel}
      </label>

      {/*
        `type="search"` memberi tombol bersihkan bawaan di peramban, dan
        `autoComplete="off"` mencegah saran isian menutupi daftar hasil.
        `autoFocus` tidak dipakai: memindahkan fokus otomatis membingungkan
        pembaca layar, dan di HP memunculkan papan tik sebelum pemakai siap.
      */}
      <input
        id="kotak-pencarian"
        type="search"
        value={kataKunci}
        onChange={(e) => {
          setKataKunci(e.target.value);
        }}
        placeholder={kamus.pencarianPlaceholder}
        autoComplete="off"
        className="mt-2 w-full rounded border px-3 py-2 text-base"
        style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
      />

      <p className="mt-2 text-xs" style={{ color: "var(--color-muted)" }}>
        {kamus.pencarianTanpaKirim}
      </p>

      {/*
        Umpan balik memakai `role="status"`, bukan `role="alert"`: jumlah hasil
        berubah pada setiap ketukan, dan pembaca layar yang mengumumkan tiap
        perubahan sebagai peringatan akan mengganggu. `status` diumumkan dengan
        sopan — selesai ucapan sebelumnya, bukan memotongnya. (Route-announcer
        Next juga memakai `role="alert"`, dan itu akan membuat selektor uji
        ambigu — lihat catatan yang sama di Kuis.)
      */}
      {adaKata && (
        <p
          role="status"
          className="mt-4 font-mono text-xs tracking-widest uppercase"
          style={{ color: "var(--color-muted)" }}
        >
          {hasil.length} {kamus.pencarianJumlah}
        </p>
      )}

      {!adaKata && (
        <p className="mt-4 text-sm" style={{ color: "var(--color-muted)" }}>
          {kamus.pencarianMulai}
        </p>
      )}

      {adaKata && hasil.length === 0 && (
        <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
          {kamus.pencarianKosong}
        </p>
      )}

      {hasil.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {hasil.map((h) => (
            <Hasil
              key={`${h.entri.topikSlug}#${h.entri.bagianId}`}
              hasil={h}
              bahasa={bahasa}
              kamus={kamus}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Satu hasil: tautan ke bagian Materi, plus cuplikan dengan kata kunci ditandai.
 *
 * Kuncinya gabungan slug dan anchor, bukan salah satunya: satu Topik punya banyak
 * bagian, dan bagian tanpa judul memakai anchor kosong. Gabungan keduanya unik.
 */
function Hasil({
  hasil,
  bahasa,
  kamus,
}: {
  hasil: HasilPencarian;
  bahasa: string;
  kamus: Kamus;
}) {
  const { entri, cuplikan, sorot } = hasil;

  // Tanpa anchor, tautan menunjuk ke halaman Topik dari atas — Materi tanpa judul
  // tidak punya bagian yang bisa dituju.
  const tautan =
    entri.bagianId.length > 0
      ? `/${bahasa}/topik/${entri.topikSlug}#${entri.bagianId}`
      : `/${bahasa}/topik/${entri.topikSlug}`;

  return (
    <li
      className="rounded-lg border p-3"
      style={{ borderColor: "var(--color-border)" }}
    >
      <Link href={tautan} className="block">
        <span
          className="font-mono text-xs tracking-widest uppercase"
          style={{ color: "var(--color-muted)" }}
        >
          {kamus.pencarianBagian}
        </span>
        <span className="mt-1 block font-medium" style={{ color: "var(--color-accent)" }}>
          {entri.bagianJudul}
        </span>
        <span className="mt-0.5 block text-xs" style={{ color: "var(--color-muted)" }}>
          {entri.topikJudul}
        </span>
        <span className="mt-2 block text-sm" style={{ color: "var(--color-fg)" }}>
          <TeksTersorot teks={cuplikan} sorot={sorot} />
        </span>
      </Link>
    </li>
  );
}

/**
 * Cuplikan dengan bagian yang cocok ditandai.
 *
 * `sorot` adalah rentang, bukan markup, jadi penandanya dipasang di sini dengan
 * memecah teks — tidak ada HTML yang perlu dipercaya atau `dangerouslySetInnerHTML`.
 * Sorotan memakai warna aksen teks, bukan latar penuh: cuplikan adalah kalimat yang
 * sedang dibaca, dan latar penuh di tengah kalimat mengganggu.
 */
function TeksTersorot({ teks, sorot }: { teks: string; sorot: RentangSorot[] }) {
  if (sorot.length === 0) return <>{teks}</>;

  const potongan: React.ReactNode[] = [];
  let posisi = 0;

  sorot.forEach(([mulai, akhir], i) => {
    if (mulai > posisi) potongan.push(teks.slice(posisi, mulai));
    potongan.push(
      <mark
        key={i}
        style={{ background: "transparent", color: "var(--color-accent)", fontWeight: 600 }}
      >
        {teks.slice(mulai, akhir)}
      </mark>,
    );
    posisi = akhir;
  });

  if (posisi < teks.length) potongan.push(teks.slice(posisi));

  return <>{potongan}</>;
}
