import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { KAMUS } from "@/lib/bahasa/kamus.ts";
import { BAHASA_BAWAAN } from "@/lib/bahasa/bahasa.ts";

import "./globals.css";

/**
 * Halaman 404 situs.
 *
 * **Kenapa berkas ini ada, bukan `not-found.tsx` biasa.** Restrukturisasi ticket #12
 * memindahkan root layout ke `app/[bahasa]/layout.tsx`; tidak ada `app/layout.tsx`.
 * Akibatnya halaman 404 tidak lagi dibungkus layout itu, dan tampil sebagai `<html>`
 * polos tanpa `lang` dan tanpa token warna situs. Sebelum #12, root layout lama
 * membungkusnya — jadi ini regresi yang dikembalikan di sini.
 *
 * Dua penempatan `not-found.tsx` sudah dicoba dan **keduanya gagal**, terverifikasi
 * dengan menjalankan build produksi:
 *
 * - `not-found.tsx` di dalam `[bahasa]` menerima `params` sebagai `undefined`,
 *   sehingga prerender gagal (`Cannot destructure property 'bahasa' of undefined`).
 *   Dengan `dynamicParams = true` ia dirender sebagai `<html id="__next_error__">` —
 *   di luar root layout, jadi tanpa `lang` dan tanpa gaya.
 * - `not-found.tsx` di akar `app/` tidak bisa ada, karena `app/layout.tsx` juga tidak
 *   ada; root layout berada di dalam segmen dinamis.
 *
 * `global-not-found` adalah konvensi Next.js yang memang dibuat untuk kasus ini.
 * Dokumentasinya menyebut dua pemicunya, dan salah satunya persis "root layout
 * didefinisikan memakai segmen dinamis tingkat atas (mis. `app/[country]/layout.tsx`)".
 * Ia melewati render normal, jadi berkas ini harus mengembalikan dokumen HTML utuh
 * (`<html>` dan `<body>`) dan mengimpor sendiri gaya global serta hurufnya.
 *
 * **Yang ditanganinya lebih luas daripada namanya.** Karena `dynamicParams = false`
 * di `app/[bahasa]/layout.tsx`, slug Topik yang tidak dikenal (`/en/topik/salah`)
 * tidak pernah sampai ke `notFound()` di halaman Topik — ia sudah menjadi kelewatan
 * rute, dan berakhir di berkas ini juga. Diverifikasi dengan menjalankan build
 * produksi: `/en/topik/salah` dan `/id/ngawur` sama-sama dirender oleh berkas ini.
 *
 * **Bahasanya bahasa bawaan, bukan bahasa URL.** Berkas ini berjalan sebelum rute
 * mana pun dicocokkan, jadi ia tidak punya cara tahu bahasa yang diminta. Untuk
 * alamat yang tidak menunjuk halaman mana pun, tidak ada bahasa yang benar untuk
 * dipilih, dan bahasa bawaan adalah pilihan yang jujur. Ini juga **tidak lebih
 * buruk** daripada sebelum #12, yang memang selalu berbahasa Indonesia. Mengalihkan
 * 404 per bahasa bukan kriteria penerimaan #12, dan mengejarnya akan menuntut
 * root layout keluar dari segmen bahasa — yang justru membatalkan keputusan
 * ADR-0016. Lihat "Konsekuensi" di ADR itu.
 *
 * Fitur ini masih eksperimental di Next.js, jadi ia dinyalakan lewat
 * `experimental.globalNotFound` di `next.config.ts`.
 */

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const kamus = KAMUS[BAHASA_BAWAAN];

export const metadata: Metadata = {
  title: `${kamus.tidakDitemukanJudul} — ${kamus.judulSitus}`,
  description: kamus.tidakDitemukanRingkasan,
};

export default function GlobalNotFound() {
  return (
    <html lang={BAHASA_BAWAAN} className={inter.variable}>
      <body className="font-sans antialiased">
        <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-6 py-16">
          <p
            className="font-mono text-xs tracking-widest uppercase"
            style={{ color: "var(--color-muted)" }}
          >
            404
          </p>
          <h1 className="text-3xl leading-tight font-semibold tracking-tight">
            {kamus.tidakDitemukanJudul}
          </h1>
          <p
            className="text-base leading-relaxed"
            style={{ color: "var(--color-muted)" }}
          >
            {kamus.tidakDitemukanRingkasan}
          </p>
          <a
            href={`/${BAHASA_BAWAAN}`}
            className="font-medium underline underline-offset-4"
            style={{ color: "var(--color-accent)" }}
          >
            {kamus.tidakDitemukanKembali}
          </a>
        </main>
      </body>
    </html>
  );
}
