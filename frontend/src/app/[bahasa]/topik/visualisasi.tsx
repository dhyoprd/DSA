"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

import type { Kamus } from "@/lib/bahasa/kamus.ts";
import { keterangan } from "@/lib/visualisasi/keterangan.ts";
import type { LabelStruktur } from "@/lib/visualisasi/label.ts";
import {
  JEDA_OTOMATIS_MS,
  jeda,
  keadaanPutarAwal,
  maju,
  majuOtomatis,
  mundur,
  putar,
  ulang,
} from "@/lib/visualisasi/putar.ts";
import {
  keadaanPada,
  diUjung,
  type JenisStruktur,
  type Langkah,
} from "@/lib/visualisasi/struktur.ts";

/**
 * Satu Visualisasi: gambar struktur, dan kendali langkahnya.
 *
 * **Kenapa komponen klien.** Kriteria penerimaan #15 meminta langkahnya bisa dijalankan
 * satu per satu, dimundurkan, diputar ulang, dan diputar sendiri. Semuanya keadaan yang
 * hanya ada di peramban. Halaman yang memuatnya tetap statis — yang dirender server
 * hanyalah kerangkanya.
 *
 * **Yang tidak dikerjakan di sini, dan itu disengaja.** Seluruh aturan hidup di
 * `src/lib/visualisasi/` sebagai fungsi murni: apa isi struktur setelah sekian langkah
 * (`struktur.ts`), apa yang dilakukan tiap tombol (`putar.ts`), dan kalimat untuk
 * pembaca layar (`keterangan.ts`). Komponen ini hanya memanggilnya, menggambar, dan
 * memasang timer. Kalau aturannya ditulis di sini, ia hanya bisa diuji dengan merender
 * React — dan justru bug senyap di aturan itulah yang paling perlu diuji tanpa render.
 *
 * **Kenapa Stack dan Queue tidak berbagi komponen gambar.** Bentuknya memang berbeda —
 * Stack menumpuk tegak, Queue berjajar mendatar — dan perbedaan itu bukan hiasan: ia
 * yang membuat "ujung yang sama" dan "dua ujung" terlihat. Satu komponen yang
 * bercabang di banyak tempat akan lebih sulit dibaca daripada dua cabang yang jelas
 * pada sumbu dan ujungnya.
 *
 * **Bahasa tidak dikenal komponen ini** (pola yang sama dengan `kuis.tsx`): teks sudah
 * dipilih bahasanya di `daftar-visualisasi.tsx` sebelum menyeberang, dan datang lewat
 * `siap`. Komponen ini hanya menggambar.
 *
 * **Keadaan awalnya deterministik, jadi tidak ada masalah hidrasi.** Nilainya selalu
 * "belum ada langkah, tidak sedang berputar" pada render server maupun render pertama
 * di klien — dan pada keadaan itu memang tidak ada kotak yang digambar, sehingga tidak
 * ada elemen beranimasi yang bisa berbeda antara server dan peramban.
 */

/** Seluruh teks antarmuka satu Visualisasi, sudah dalam bahasa yang berlaku. */
export interface TeksVisualisasi {
  push: string;
  pop: string;
  awal: string;
  kosong: string;
  langkah: string;
  keluar: string;
  isi: string;
  isiKosong: string;
  popKosong: string;
  penghitung: string;
  mundur: string;
  maju: string;
  ulang: string;
  putar: string;
  jeda: string;
}

/** Satu Visualisasi yang sudah siap dirender. Semua nilainya bisa diserialkan. */
export interface VisualisasiSiap {
  jenis: JenisStruktur;
  label: LabelStruktur;
  langkah: Langkah[];
  /** Jumlah kotak terbanyak, untuk menyediakan ruang sejak awal. */
  puncak: number;
  teks: TeksVisualisasi;
}

interface Props {
  siap: VisualisasiSiap;
}

export function Visualisasi({ siap }: Props) {
  const { jenis, label, langkah, puncak, teks } = siap;
  const [keadaan, setKeadaan] = useState(keadaanPutarAwal);

  /*
   * Pemutaran otomatis. Timer hidup hanya selama `bermain` benar, dan `majuOtomatis`
   * yang memutuskan kapan berhenti — begitu langkah terakhir tercapai, `bermain`
   * menjadi `false`, efek ini membersihkan timer, dan tombolnya kembali ke "Putar".
   *
   * `setKeadaan` memakai bentuk fungsional supaya ia selalu membaca keadaan terbaru,
   * bukan nilai yang tertangkap saat efek dipasang. Tanpa itu, setiap detak akan
   * dihitung dari indeks yang sama dan animasinya berhenti di langkah pertama.
   */
  useEffect(() => {
    if (!keadaan.bermain) return;

    const timer = setInterval(() => {
      setKeadaan((sebelumnya) => majuOtomatis(sebelumnya, langkah));
    }, JEDA_OTOMATIS_MS);

    return () => {
      clearInterval(timer);
    };
  }, [keadaan.bermain, langkah]);

  const isi = keadaanPada(langkah, keadaan.indeks, jenis);
  const akhir = diUjung(langkah, keadaan.indeks);

  const tinggiKotak = 3.25;
  const jarak = 0.5;
  // Ruang untuk seluruh puncak, bukan untuk isi sekarang. Tanpa ini wadahnya tumbuh
  // dan menyusut setiap langkah, dan seluruh halaman di bawahnya ikut bergeser.
  const tinggiArena =
    jenis === "stack" ? puncak * tinggiKotak + Math.max(0, puncak - 1) * jarak : tinggiKotak;

  return (
    <div
      className="rounded-md border p-4"
      style={{ borderColor: "var(--color-border)" }}
      aria-labelledby={`visualisasi-${jenis}-judul`}
    >
      <h3
        id={`visualisasi-${jenis}-judul`}
        className="font-mono text-sm tracking-widest uppercase"
        style={{ color: "var(--color-accent)" }}
      >
        {label.nama}
      </h3>
      <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
        {label.aturan}
      </p>

      {/*
        Penanda ujung. Inilah yang membuat "satu ujung" dan "dua ujung" terlihat
        sebelum satu langkah pun dijalankan: pada Stack kedua penanda menunjuk tempat
        yang sama, pada Queue menunjuk tempat yang berbeda.

        Panahnya mengikuti arah gambarannya, bukan selalu ke atas: Stack ditumpuk
        tegak, jadi kedua ujungnya di atas; Queue berjajar mendatar dengan ujung depan
        di kiri, jadi masuk dari kanan dan keluar ke kiri. Panah yang seragam akan
        bertentangan dengan gambarnya sendiri.
      */}
      <div
        className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs"
        style={{ color: "var(--color-muted)" }}
      >
        <span>
          {teks.push} {jenis === "stack" ? "↑" : "→"} {label.ujungMasuk}
        </span>
        <span>
          {teks.pop} {jenis === "stack" ? "↑" : "←"} {label.ujungKeluar}
        </span>
      </div>

      {/*
        Arena gambar.

        `aria-hidden` karena isinya adalah gambar yang tidak bisa dibaca: angka di
        dalam kotak hanya berguna kalau posisinya terlihat. Yang menyampaikan maknanya
        ke pembaca layar adalah keterangan di bawah, dan membiarkan kotaknya ikut
        terbaca hanya akan menghasilkan angka-angka lepas tanpa konteks.

        Arena ini **tidak** memusatkan isinya. Kalau ia memusatkan, satu kotak Stack
        akan melayang di tengah arena alih-alih duduk di dasarnya, dan barisan Queue
        akan bergeser ke kiri setiap kali bertambah — dua gambar yang bertentangan
        dengan mekanisme yang sedang diterangkan. Isinya direntangkan (`stretch`
        bawaan flex) lalu **ditambatkan** ke ujung asalnya oleh pembungkus di dalam:
        Stack ke dasar, Queue ke kiri.
      */}
      <div
        className="mt-4 flex rounded border border-dashed"
        style={{ borderColor: "var(--color-border)", minHeight: `${String(tinggiArena)}rem` }}
        aria-hidden="true"
      >
        {/*
          `MotionConfig reducedMotion="user"` adalah cara pustaka animasinya sendiri
          untuk menghormati `prefers-reduced-motion`: gerak transformasi dan tata letak
          dimatikan, sedangkan perubahan `opacity` tetap berjalan. Jadi pemelajar yang
          memintanya tetap melihat kotaknya muncul dan hilang, tanpa pergeseran.
        */}
        <MotionConfig reducedMotion="user">
          {/*
            Stack ditambatkan ke **dasar** arena, Queue ke **kiri**. `flex-col-reverse`
            pada Stack menaruh kotak pertama di paling bawah dan kotak berikutnya di
            atasnya — jadi `1` tetap di dasar saat `2` dan `3` ditumpuk, persis cara
            menumpuk piring. Barisnya direntangkan penuh (`w-full`) supaya dasar itu
            benar-benar dasar arena, bukan dasar kotak sekecil isinya.
          */}
          <div
            className={
              jenis === "stack"
                ? "relative flex w-full flex-col-reverse items-center justify-start gap-2"
                : "relative flex h-full flex-row items-center justify-start gap-2"
            }
            style={{
              minHeight: `${String(tinggiKotak)}rem`,
              minWidth: `${String(puncak * 3.5)}rem`,
            }}
          >
            {/*
              `AnimatePresence` dengan `mode="popLayout"`: kotak yang keluar dilepas
              dari tata letak lebih dulu, sehingga kotak sisanya bisa langsung bergeser
              ke posisi barunya — dan `layout` yang menganimasikan pergeseran itu.
              Itulah yang menerangkan cara kerja Queue: saat yang paling depan keluar,
              yang di belakangnya maju satu langkah.

              `key={sel.id}` adalah identitas kotaknya, bukan posisinya. Memakai indeks
              posisi akan membuat React menganggap semua kotak berganti begitu yang
              depan keluar, dan animasinya jadi pudar-muncul semua — bukan bergeser.
            */}
            <AnimatePresence mode="popLayout">
              {isi.sel.map((sel) => (
                <motion.div
                  key={sel.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="flex w-14 shrink-0 items-center justify-center rounded border font-mono text-base tabular-nums"
                  style={{
                    // Tinggi kotak memakai konstanta yang sama dengan perhitungan
                    // `tinggiArena` di atas, supaya ruang yang disediakan dan ukuran
                    // kotak yang benar-benar digambar tidak bisa menyimpang.
                    height: `${String(tinggiKotak)}rem`,
                    borderColor: "var(--color-border)",
                    background: "color-mix(in srgb, var(--color-fg) 8%, transparent)",
                    color: "var(--color-fg)",
                  }}
                >
                  {sel.nilai}
                </motion.div>
              ))}
            </AnimatePresence>

            {/*
              Keadaan kosong dinyatakan di dalam arena, bukan dibiarkan kosong begitu
              saja: arena yang benar-benar kosong sulit dibedakan dari gambar yang gagal
              dimuat. Posisinya `absolute inset-0` supaya ia di tengah arena apa pun
              arah tumpukannya, dan tidak ikut menentukan tinggi arena.
            */}
            {isi.sel.length === 0 && (
              <span
                className="absolute inset-0 flex items-center justify-center font-mono text-xs"
                style={{ color: "var(--color-muted)" }}
              >
                {teks.kosong}
              </span>
            )}
          </div>
        </MotionConfig>
      </div>

      {/*
        Langkah terakhir, terlihat. Nilai yang keluar ditampilkan menonjol karena
        itulah inti Visualisasi ini: Stack dan Queue menerima urutan yang sama dan
        mengeluarkan nilai yang berbeda.
      */}
      <p className="mt-3 font-mono text-sm" style={{ color: "var(--color-muted)" }}>
        {isi.terakhir === null
          ? teks.awal
          : isi.terakhir.operasi === "push"
            ? `${teks.push} ${String(isi.terakhir.nilai)}`
            : isi.keluar === null
              ? `${teks.pop} — ${teks.popKosong}`
              : `${teks.pop} — ${teks.keluar} ${String(isi.keluar)}`}
      </p>

      {/*
        Keterangan untuk pembaca layar. `role="status"` — bukan `alert` — karena ini
        hasil tindakan pemakai sendiri, bukan kejadian yang perlu merebut perhatian.
        Wadahnya selalu ada supaya live region sudah di DOM saat isinya berubah.

        Isinya **lebih lengkap** daripada baris yang terlihat di atas: ia juga menyebut
        ujung yang dipakai dan seluruh isi struktur sekarang. Dua hal itu memang tidak
        bisa disampaikan gambar kepada pembaca layar, dan justru keduanya yang
        membedakan Stack dari Queue.
      */}
      <p role="status" className="sr-only">
        {keterangan(isi, label, teks)}
      </p>

      {/*
        Kendali. Tombolnya `type="button"` supaya tidak mengirim formulir mana pun,
        dan `disabled` di ujung rentangnya — bukan dibiarkan bisa diklik tanpa
        berpengaruh, karena tombol yang diam terasa seperti tombol rusak.
      */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Tombol
          onClick={() => {
            setKeadaan((s) => mundur(s));
          }}
          disabled={keadaan.indeks === 0}
        >
          ← {teks.mundur}
        </Tombol>

        <Tombol
          onClick={() => {
            setKeadaan((s) => maju(s, langkah));
          }}
          disabled={akhir}
        >
          {teks.maju} →
        </Tombol>

        <Tombol
          onClick={() => {
            setKeadaan(ulang());
          }}
          disabled={keadaan.indeks === 0 && !keadaan.bermain}
        >
          ⟲ {teks.ulang}
        </Tombol>

        <Tombol
          onClick={() => {
            setKeadaan((s) => (s.bermain ? jeda(s) : putar(s, langkah)));
          }}
          utama
        >
          {keadaan.bermain ? `❙❙ ${teks.jeda}` : `▶ ${teks.putar}`}
        </Tombol>

        {/* Penghitung posisi, supaya pemelajar tahu di mana ia berada. */}
        <span
          className="ms-auto font-mono text-xs tabular-nums"
          style={{ color: "var(--color-muted)" }}
        >
          {keadaan.indeks} / {langkah.length} {teks.penghitung}
        </span>
      </div>
    </div>
  );
}

/** Tombol kendali, dengan gaya yang sama untuk semuanya. */
function Tombol({
  children,
  onClick,
  disabled = false,
  utama = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  utama?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded px-3 py-1.5 text-sm font-medium disabled:opacity-40"
      style={
        utama
          ? { background: "var(--color-accent)", color: "var(--color-accent-fg)" }
          : { border: "1px solid var(--color-border)", color: "var(--color-fg)" }
      }
    >
      {children}
    </button>
  );
}
