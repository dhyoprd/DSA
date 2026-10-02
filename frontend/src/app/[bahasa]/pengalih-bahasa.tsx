"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  BAHASA,
  NAMA_BAHASA,
  gantiBahasa,
  simpanPilihanBahasa,
  type Bahasa,
} from "@/lib/bahasa/bahasa.ts";
import type { Kamus } from "@/lib/bahasa/kamus.ts";

/**
 * Pengalih bahasa: satu tautan untuk tiap bahasa yang tersedia.
 *
 * **Tautan, bukan tombol.** Menukar bahasa berarti pindah ke halaman lain —
 * `/id/topik/stack` dan `/en/topik/stack` adalah dua dokumen berbeda. Tautan adalah
 * elemen yang benar untuk itu: ia bisa dibuka di tab baru, disalin, dan dibagikan,
 * dan peramban menampilkan alamat tujuannya. Tombol dengan `router.push` akan
 * menyembunyikan ketiga hal itu tanpa memberi apa pun sebagai gantinya.
 *
 * **Kenapa komponen klien.** Tautan tujuan disusun dari `usePathname()`, dan itu
 * hanya ada di peramban. Halaman yang memuatnya tetap statis — yang dirender server
 * adalah kerangka tautannya, dan yang hidup di klien hanya penyusunan alamat.
 *
 * **Cookie disimpan di dua saat, dan keduanya perlu.**
 *
 * - **Saat tautan ditekan** — pilihan berubah tepat ketika pemakai memintanya.
 * - **Saat komponen dipasang** — menyelaraskan cookie dengan bahasa yang sedang
 *   dilihat. Ini menutup alur kedua yang tidak melewati tombol: pemakai membuka
 *   alamat berbahasa secara langsung (tautan yang disimpan, atau dikirim ke
 *   perangkat lain). Tanpa penyelarasan ini, cookie tetap menunjuk bahasa lama, dan
 *   membuka `/` berikutnya membawa pemakai ke bahasa yang bukan yang sedang ia baca.
 *
 * Jadi arti "pilihan diingat" (kriteria penerimaan #4) adalah **bahasa yang terakhir
 * dilihat**, bukan "bahasa yang terakhir dipilih lewat tombol". Bagi situs satu
 * pemakai keduanya seharusnya sama, dan yang pertama lebih tahan terhadap alur yang
 * tidak lewat tombol.
 *
 * **Penyelarasan ada di sini, bukan di `proxy.ts`.** Cookie bisa juga ditulis server
 * lewat `Set-Cookie` saat mengalihkan, tetapi halaman-halaman ini statis dan
 * di-cache CDN; menambahkan `Set-Cookie` ke responsnya berisiko membuat cache
 * menyimpan header itu dan menyajikannya ke kunjungan yang tidak seharusnya
 * menerimanya. Menulisnya di peramban menghindari seluruh kelas masalah itu.
 */

interface Props {
  /** Bahasa halaman yang sedang dibuka, dari URL. */
  aktif: Bahasa;
  /** Kamus bahasa yang sedang berlaku, untuk `aria-label` grupnya. */
  kamus: Kamus;
}

export function PengalihBahasa({ aktif, kamus }: Props) {
  const pathname = usePathname();

  /*
   * Selaraskan cookie dengan bahasa halaman ini sekali saat dipasang. Aman dijalankan
   * berkali-kali: menulis cookie dengan nilai yang sama tidak mengubah apa pun.
   */
  useEffect(() => {
    simpanPilihanBahasa(aktif);
  }, [aktif]);

  return (
    <div
      role="group"
      aria-label={kamus.bahasa}
      className="inline-flex rounded-md border p-0.5"
      style={{ borderColor: "var(--color-border)" }}
    >
      {BAHASA.map((bahasa) => {
        const iniAktif = bahasa === aktif;

        return (
          <Link
            key={bahasa}
            href={gantiBahasa(pathname, bahasa)}
            onClick={() => {
              simpanPilihanBahasa(bahasa);
            }}
            /*
             * `aria-current="page"` untuk bahasa aktif, bukan `aria-pressed`: ini
             * navigasi, dan bahasa aktif adalah halaman yang sedang dibuka. Itu
             * persis arti `aria-current`, dan berbeda dari tombol sakelar.
             *
             * Nama bahasanya ditulis dalam bahasa itu sendiri ("Indonesia",
             * "English"), jadi pemakai yang tersesat di antarmuka English tetap
             * mengenali tautan kembali ke bahasanya.
             */
            aria-current={iniAktif ? "page" : undefined}
            className="rounded px-2.5 py-1 text-xs font-medium"
            style={{
              background: iniAktif ? "var(--color-accent)" : "transparent",
              color: iniAktif ? "var(--color-accent-fg)" : "var(--color-muted)",
              transitionProperty: "background-color, color",
              transitionDuration: "var(--dur-cepat)",
            }}
          >
            {NAMA_BAHASA[bahasa]}
          </Link>
        );
      })}
    </div>
  );
}
