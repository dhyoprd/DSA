/**
 * Pengalihan bahasa untuk permintaan yang belum menyebut bahasa.
 *
 * Seluruh halaman situs hidup di bawah `/[bahasa]` (lihat `app/[bahasa]/layout.tsx`).
 * Itu membuat setiap alamat menyebut bahasanya sendiri — `/id/topik/stack`,
 * `/en/topik/stack` — dan itulah yang membuat halaman bisa di-cache per bahasa dan
 * tautannya bisa dibagikan tanpa kehilangan pilihan bahasa. Tetapi pemakai tidak
 * pernah mengetik awalan itu; ia membuka `/` atau mengeklik tautan lama tanpa awalan.
 *
 * Berkas ini mengisi celah itu: permintaan yang **belum** berbahasa dialihkan ke
 * bahasa yang tersimpan di cookie, atau ke bahasa bawaan kalau belum ada.
 *
 * **Kenapa `proxy.ts`, bukan `middleware.ts`.** Next.js 16 mengganti nama konvensi
 * `middleware` menjadi `proxy` (runtime-nya `nodejs`, bukan `edge`). Nama lamanya
 * masih jalan tetapi sudah usang; berkas ini memakai nama baru.
 *
 * **Kenapa di sini, bukan di halaman.** Pengalihan harus terjadi sebelum halaman
 * mana pun dirender. Kalau ditangani di halaman, halaman harus tahu bahasa apa yang
 * belum dipilih — dan halaman yang sedang dirender justru belum punya bahasa.
 * `proxy.ts` berjalan di antara permintaan dan render, jadi ia satu-satunya tempat
 * yang bisa memutuskan tanpa sudah berada di dalam sebuah bahasa.
 *
 * **Kenapa cookie, bukan `Accept-Language`.** Header itu menyampaikan bahasa yang
 * dipahami peramban, bukan bahasa yang **dipilih** pemakai di situs ini. Pemakai yang
 * memilih English di HP-nya yang berbahasa Indonesia harus tetap mendapat English.
 * Cookie mengingat pilihannya; header tidak.
 */

import { NextResponse, type NextRequest } from "next/server";

import { KUNCI_BAHASA, bacaBahasa, bahasaDariPathname } from "@/lib/bahasa/bahasa.ts";

export function proxy(permintaan: NextRequest): NextResponse | undefined {
  const { pathname } = permintaan.nextUrl;

  // Sudah menyebut bahasa yang sah: tidak ada yang perlu dialihkan.
  if (bahasaDariPathname(pathname) !== null) return undefined;

  // Bahasa yang tersimpan, atau bahasa bawaan. `bacaBahasa` menutup cookie yang
  // rusak dengan cara yang sama seperti ia menutup cookie yang belum ada.
  const bahasa = bacaBahasa(permintaan.cookies.get(KUNCI_BAHASA)?.value);

  const tujuan = permintaan.nextUrl.clone();
  tujuan.pathname = `/${bahasa}${pathname === "/" ? "" : pathname}`;

  /*
   * `307` (peramban mengulang dengan metode yang sama) dipilih, bukan `308` yang
   * permanen: pilihan bahasa bisa berubah, jadi pengalihan ini tidak boleh di-cache
   * peramban untuk seterusnya. Kalau ia permanen, memilih English lalu membuka `/`
   * akan terus membawa ke English walaupun pemakainya sudah kembali memilih Indonesia.
   */
  return NextResponse.redirect(tujuan, 307);
}

export const config = {
  /*
   * Lewati berkas internal Next (`_next/static` dan `_next/image`), endpoint backend
   * (`api`), dan ikon situs — tidak satu pun punya bahasa, jadi tidak boleh
   * dialihkan. Pola ini diadaptasi dari contoh matcher di dokumentasi Next.js; yang
   * dikecualikan persis empat hal itu, bukan seluruh `_next`.
   *
   * `missing` melewatkan permintaan prefetch router Next. Efek sampingnya perlu
   * diketahui: prefetch yang tidak berbahasa **melewati** pengalihan ini, dan
   * `dynamicParams = false` di `app/[bahasa]/layout.tsx` yang menjaganya (menjadi
   * 404, bukan 500). Lihat komentar di sana.
   */
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
