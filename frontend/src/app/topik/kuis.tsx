"use client";

import { useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import { benihOpsi, urutanTeracak } from "@/lib/kuis/acak.ts";
import {
  keadaanAwal,
  nilaiJawaban,
  pembahasanTerbuka,
  type KeadaanKuis,
} from "@/lib/kuis/penilaian.ts";
import { idSesiKlien, idSesiServer, langgananIdSesi } from "@/lib/kuis/sesi.ts";

/**
 * Satu Kuis: skenario, opsi yang sudah diacak, dan Pembahasan yang terkunci.
 *
 * Komponen ini klien karena dua hal hanya ada di peramban: id sesi (untuk benih
 * pengacakan) dan keadaan jawaban. Halaman yang memuatnya tetap statis — yang
 * dirender server hanyalah kerangkanya.
 *
 * **Yang tidak dikerjakan di sini, dan itu disengaja.** Seluruh aturan penilaian dan
 * pengacakan hidup di `src/lib/kuis/` sebagai fungsi murni. Komponen ini hanya
 * memanggilnya dan menggambar hasilnya. Kalau aturannya ditulis di sini, ia hanya
 * bisa diuji dengan merender React — dan justru bug senyap di penilaian yang paling
 * perlu diuji tanpa render.
 *
 * **Progres tidak dikirim ke backend.** Ticket #8 yang menyambungkannya. Di sini
 * jumlah percobaan hanya dihitung dan ditampilkan.
 *
 * **Teks sudah jadi ReactNode, bukan teks Markdown.** Skenario, opsi, dan Pembahasan
 * ditulis Markdown (backtick untuk istilah teknis, bintang untuk penekanan), dan
 * `TeksKaya` di sisi server yang merendernya. Kalau komponen ini yang mengimpor
 * `react-markdown`, pengurai Markdown ikut masuk bundel sisi klien untuk tiga potong
 * teks pendek — jauh lebih mahal daripada menyerahkan hasilnya sebagai prop.
 *
 * Teks memakai versi Indonesia; pengalih bahasa adalah lingkup ticket #12.
 */

/** Satu opsi yang sudah dirender, siap ditampilkan. */
export interface OpsiSiap {
  /** Teks opsi sebagai ReactNode. Indeksnya sama dengan indeks di YAML. */
  teks: ReactNode;
  /** Apakah ini jawaban benar. Ditentukan data, bukan komponen. */
  benar: boolean;
}

/** Satu Kuis yang sudah siap dirender: teks sudah jadi ReactNode. */
export interface KuisSiap {
  skenario: ReactNode;
  /** Potongan kode mentah untuk ditebak outputnya, atau `undefined`. */
  kode?: string;
  opsi: OpsiSiap[];
  penjelasan: ReactNode;
}

interface Props {
  kuis: KuisSiap;
  /** Posisi Soal di dalam `topik.soal` (0–5). Bagian dari benih pengacakan. */
  indeksSoal: number;
  /** Nomor urut Kuis untuk ditampilkan, mulai 1. */
  nomor: number;
  /** Jumlah Kuis di Topik ini, untuk "Kuis 1 dari 5". */
  total: number;
  slugTopik: string;
}

export function Kuis({ kuis, indeksSoal, nomor, total, slugTopik }: Props) {
  /*
   * Id sesi dibaca lewat `useSyncExternalStore`, bukan langsung saat merender.
   *
   * `sessionStorage` tidak ada di server, jadi memanggilnya langsung akan membuat
   * HTML statis dan render pertama di peramban memakai urutan opsi yang berbeda —
   * hydration mismatch. Hook ini memakai `getServerSnapshot` selama server dan
   * hidrasi, lalu `getSnapshot` sesudahnya, sehingga React tidak pernah melihat
   * ketidakcocokan.
   */
  const idSesi = useSyncExternalStore(langgananIdSesi, idSesiKlien, idSesiServer);

  /*
   * Selama id sesi belum sungguhan (`null`), urutan opsi yang kita punya **bukan**
   * urutan yang akan dilihat pemelajar — jadi opsi tidak digambar sama sekali.
   *
   * Kenapa tidak digambar apa adanya. Menggambarnya berarti urutan YAML tampil
   * lebih dulu, lalu melompat ke urutan sesi begitu React hidup. Pemelajar melihat
   * empat baris berpindah tempat persis saat halaman selesai dimuat — kelas cacat
   * yang sama dengan kedipan tema yang dihindari `skripTema` di `layout.tsx`.
   * Syarat issue #1 adalah opsi "tidak berpindah tempat saat mencoba lagi", dan
   * berpindah sekali di awal tetap melanggarnya.
   *
   * Lompatan itu sudah diukur pada build produksi (Chromium, mesin pengembangan ini):
   * urutan YAML sempat terlihat sekitar 50 ms sebelum tergantikan. Angkanya
   * bergantung mesin, tetapi urutannya tidak: selalu ada satu cat dengan urutan yang
   * salah sebelum React hidup. Karena itu opsinya disembunyikan, bukan sekadar
   * dipercepat.
   *
   * Kotak tempatnya tetap dirender, dengan tinggi yang disediakan lewat `min-h`, jadi
   * tidak ada tata letak yang bergeser (CLS terukur 0) saat teksnya muncul.
   */
  const idSesiSiap = idSesi !== null;

  const [keadaan, setKeadaan] = useState<KeadaanKuis>(keadaanAwal);

  const indeksBenar = kuis.opsi.findIndex((opsi) => opsi.benar);

  /*
   * Selagi `idSesi` masih `null`, urutan ini belum berarti apa-apa: teksnya tidak
   * digambar (lihat `idSesiSiap`). Nilai cadangan dipakai supaya `benihOpsi` tetap
   * menerima teks dan urutannya tetap deterministik — bukan supaya urutan itu
   * ditampilkan. `key` tiap baris adalah indeks asli, jadi React tidak menganggap
   * barisnya berpindah saat urutan sungguhan tiba.
   */
  const urutan = urutanTeracak(
    kuis.opsi.length,
    benihOpsi(slugTopik, indeksSoal, idSesi ?? "belum-diketahui"),
  );
  const terbuka = pembahasanTerbuka(keadaan);

  function jawab(indeksAsli: number) {
    setKeadaan((sebelumnya) => nilaiJawaban(sebelumnya, indeksAsli, indeksBenar));
  }

  return (
    <section
      aria-labelledby={`kuis-${String(nomor)}-judul`}
      className="border-t pt-8"
      style={{ borderColor: "var(--color-border)" }}
    >
      <p
        className="font-mono text-xs tracking-widest uppercase"
        style={{ color: "var(--color-muted)" }}
      >
        Kuis {nomor} dari {total}
      </p>

      {/* Skenario nyata — user story 16: Kuis dibuka dengan *kenapa*, bukan soal. */}
      <h3 id={`kuis-${String(nomor)}-judul`} className="mt-2 text-lg font-semibold">
        {kuis.skenario}
      </h3>

      {/*
        Potongan kode, hanya pada Kuis yang punya (user story 17). Dibungkus `.materi`
        supaya gaya blok kode yang sudah ada di `globals.css` berlaku — tidak ada blok
        kode kedua yang perlu dirawat terpisah. `data-bahasa` memunculkan label
        "PYTHON" di sudut blok, lewat aturan yang sama dengan Materi.
      */}
      {kuis.kode !== undefined && (
        <div className="materi mt-4 text-sm">
          <pre>
            <code data-bahasa="python">{kuis.kode}</code>
          </pre>
        </div>
      )}

      <ul className="mt-5 flex list-none flex-col gap-2">
        {urutan.map((indeksAsli) => {
          const opsi = kuis.opsi[indeksAsli];
          const salahTerakhir = keadaan.indeksSalahTerakhir === indeksAsli;

          return (
            <li key={indeksAsli}>
              <button
                type="button"
                onClick={() => {
                  jawab(indeksAsli);
                }}
                // Terkunci sebelum urutan sungguhan diketahui: menekan opsi yang
                // belum tentu di posisi itu akan menilai pilihan yang salah.
                // Setelah benar juga terkunci — tidak ada lagi yang bisa dijawab.
                disabled={!idSesiSiap || terbuka}
                /*
                 * Opsi salah terakhir ditandai supaya pemelajar melihat *pilihan mana*
                 * yang salah, bukan sekadar bahwa ada yang salah.
                 *
                 * Penandanya dua bagian, dan keduanya perlu:
                 * - **Batas berwarna aksen** untuk mata.
                 * - **Teks `sr-only`** untuk pembaca layar. Tanpa itu, pemelajar yang
                 *   memakai pembaca layar hanya mendengar "Belum tepat" tanpa tahu
                 *   pilihan mana yang dimaksud. Sengaja **bukan** `aria-pressed`:
                 *   itu menyatakan tombol sakelar yang bisa dinyalakan-matikan,
                 *   sedangkan opsi ini tidak bisa.
                 *
                 * Setelah jawaban benar, tidak ada yang disorot — semuanya selesai.
                 *
                 * `min-h-[3rem]` menyediakan tinggi satu baris opsi (padding + satu
                 * baris `text-sm`) selagi teksnya belum ada, sehingga tata letak tidak
                 * bergeser saat teks muncul.
                 */
                className="flex min-h-[3rem] w-full items-center rounded-md border px-4 py-3 text-start text-sm transition-colors disabled:cursor-default"
                style={{
                  borderColor: salahTerakhir ? "var(--color-accent)" : "var(--color-border)",
                  background: salahTerakhir
                    ? "color-mix(in srgb, var(--color-accent) 8%, transparent)"
                    : "transparent",
                  color: "var(--color-fg)",
                  transitionDuration: "var(--dur-cepat)",
                }}
              >
                {idSesiSiap ? opsi.teks : null}
                {salahTerakhir && <span className="sr-only"> — jawaban salah</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {/*
        Umpan balik. `role="status"` — bukan `role="alert"` — karena ini hasil dari
        tindakan pemakai sendiri, bukan kejadian yang perlu merebut perhatian.
        `role="status"` sudah berarti live region yang sopan, jadi `aria-live` tidak
        perlu ditulis lagi.

        Wadahnya **selalu ada** (dengan `min-h-6`), bukan muncul bersamaan dengan
        teksnya: live region hanya mengumumkan perubahan pada isi elemen yang sudah
        ada di DOM. Kalau wadahnya baru dibuat saat jawaban salah, tidak ada yang
        dibacakan.

        Dipilih `status`, bukan `alert`, juga karena Next.js memasang route-announcer
        ber-`role="alert"` di setiap halaman — memakai `alert` di sini akan membuat
        dua live region bersaing.
      */}
      <div role="status" className="mt-4 min-h-6">
        {keadaan.percobaan > 0 && !terbuka && (
          <p className="text-sm" style={{ color: "var(--color-accent)" }}>
            Belum tepat. Coba lagi.
          </p>
        )}
        {terbuka && (
          <p className="text-sm font-medium" style={{ color: "var(--color-accent)" }}>
            Benar.
          </p>
        )}
      </div>

      {/* Jumlah percobaan — user story 30, supaya terlihat Kuis mana yang perlu diulang. */}
      {keadaan.percobaan > 0 && (
        <p className="mt-1 font-mono text-xs" style={{ color: "var(--color-muted)" }}>
          Percobaan: {keadaan.percobaan}
        </p>
      )}

      {/*
        Pembahasan. User story 22 dan keputusan `design-tree.md`: baru terbuka setelah
        jawaban benar. Syaratnya dibaca dari `pembahasanTerbuka`, bukan ditulis ulang
        di sini, supaya tidak ada tempat kedua yang bisa lupa.
      */}
      {terbuka && (
        <div
          className="mt-5 rounded-md border-s-2 ps-4"
          style={{ borderColor: "var(--color-accent)" }}
        >
          <p
            className="font-mono text-xs tracking-widest uppercase"
            style={{ color: "var(--color-muted)" }}
          >
            Pembahasan
          </p>
          <div className="mt-2 text-sm" style={{ color: "var(--color-fg)" }}>
            {kuis.penjelasan}
          </div>
        </div>
      )}
    </section>
  );
}
