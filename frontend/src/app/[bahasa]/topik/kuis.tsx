"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import { ambilPenjelasan } from "@/lib/api.ts";
import type { Kamus } from "@/lib/bahasa/kamus.ts";
import { benihOpsi, urutanTeracak } from "@/lib/kuis/acak.ts";
import {
  bukaPembahasan,
  keadaanAwal,
  keadaanDariTulisanTersimpan,
  kotakPenjelasanTampil,
  nilaiJawaban,
  pembahasanTerbuka,
  type KeadaanKuis,
} from "@/lib/kuis/penilaian.ts";
import { idSesiKlien, idSesiServer, langgananIdSesi } from "@/lib/kuis/sesi.ts";

import { KotakPenjelasan } from "./kotak-penjelasan.tsx";
import { useProgres } from "./progres-provider.tsx";

/**
 * Satu Kuis: skenario, opsi yang sudah diacak, Kotak Penjelasan, dan Pembahasan.
 *
 * Komponen ini klien karena tiga hal hanya ada di peramban: id sesi (untuk benih
 * pengacakan), keadaan jawaban, dan tulisan Kotak Penjelasan yang tersimpan di
 * backend. Halaman yang memuatnya tetap statis — yang dirender server hanyalah
 * kerangkanya.
 *
 * **Yang tidak dikerjakan di sini, dan itu disengaja.** Seluruh aturan penilaian dan
 * pengacakan hidup di `src/lib/kuis/` sebagai fungsi murni. Komponen ini hanya
 * memanggilnya dan menggambar hasilnya. Kalau aturannya ditulis di sini, ia hanya
 * bisa diuji dengan merender React — dan justru bug senyap di penilaian yang paling
 * perlu diuji tanpa render.
 *
 * **Urutan setelah jawaban benar** (ticket #8): Kotak Penjelasan muncul, pemelajar
 * menulis alasannya, lalu Pembahasan terbuka setelah tombolnya ditekan. Urutan itu
 * ditegakkan oleh `penilaian.ts` (`kotakPenjelasanTampil`, `pembahasanTerbuka`), bukan
 * oleh urutan JSX di sini.
 *
 * **Progres dicatat lewat `ProgresProvider`** (ticket #27). Setiap jawaban yang
 * dikirim — benar maupun salah — dicatat lewat `catat`, sehingga status Topik di
 * sidebar ikut berubah tanpa permintaan baca kedua. Pencatatannya ada di provider,
 * bukan di sini: Kuis hanya memberi tahu "Soal ini dijawab benar/salah", dan provider
 * yang tahu cara mencatatnya. Kegagalan pencatatan tidak ditampilkan di sini — lihat
 * catatan di provider. Jumlah percobaan yang ditampilkan tetap yang dihitung komponen
 * ini selama halaman terbuka, bukan angka dari backend.
 *
 * **Teks sudah jadi ReactNode, bukan teks Markdown.** Skenario, opsi, dan Pembahasan
 * ditulis Markdown (backtick untuk istilah teknis, bintang untuk penekanan), dan
 * `TeksKaya` di sisi server yang merendernya. Kalau komponen ini yang mengimpor
 * `react-markdown`, pengurai Markdown ikut masuk bundel sisi klien untuk tiga potong
 * teks pendek — jauh lebih mahal daripada menyerahkan hasilnya sebagai prop.
 *
 * **Bahasa tidak dikenal komponen ini** (ticket #12). Teks Soal sudah dipilih
 * bahasanya di `daftar-kuis.tsx` sebelum menyeberang, dan kalimat antarmuka seperti
 * "Belum tepat" datang lewat `kamus` yang juga sudah dipilih di sana. Yang dikerjakan
 * di sini hanya menggambar.
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
  /** Kamus bahasa yang sedang berlaku, untuk kalimat antarmuka Kuis. */
  kamus: Kamus;
}

export function Kuis({ kuis, indeksSoal, nomor, total, slugTopik, kamus }: Props) {
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

  /*
   * Tulisan Kotak Penjelasan yang tersimpan di backend: `null` selama belum selesai
   * dimuat, string (boleh kosong) setelahnya.
   *
   * Dimuat di sini, bukan di `KotakPenjelasan`, karena kotaknya hanya dirender
   * setelah jawaban benar — sedangkan tulisan tersimpan harus ketemu **sebelum** itu,
   * supaya setelah halaman dimuat ulang pemelajar bisa melihat bahwa jawabannya sudah
   * pernah benar dan tulisannya masih ada. Pemuatannya terjadi sekali per Kuis.
   */
  const [tulisanTersimpan, setTulisanTersimpan] = useState<string | null>(null);

  useEffect(() => {
    let masihDipakai = true;

    ambilPenjelasan(slugTopik, indeksSoal, kamus)
      .then((baris) => {
        if (!masihDipakai) return;
        setTulisanTersimpan(baris.isi);

        /*
         * Tulisan yang ada berarti Soal ini sudah pernah dijawab benar — Kotak
         * Penjelasan tidak mungkin terisi tanpanya. Itulah yang memulihkan keadaan
         * setelah muat ulang; `percobaan` sengaja tidak diarang.
         *
         * Sejak ticket #27 jumlah percobaan memang **tercatat** di Progres, tetapi
         * angka di layar tetap yang dihitung komponen ini selama halaman terbuka —
         * ia tidak dibaca ulang dari backend. Membacanya berarti satu permintaan
         * Progres per Kuis, dan itu justru yang dihindari penyambungan ini.
         */
        if (baris.diperbarui !== null) {
          setKeadaan((sebelumnya) =>
            sebelumnya.benar ? sebelumnya : keadaanDariTulisanTersimpan(),
          );
        }
      })
      .catch(() => {
        // Backend mati atau token belum diisi. Kuis tetap bisa dikerjakan — Materi
        // dan Soal memang tetap terbaca tanpa backend (user story 62) — tetapi
        // tulisan lama tidak bisa dimuat, dan itu tidak dijadikan galat di sini:
        // pemelajar yang belum mengisi token akan melihat galat itu di setiap Kuis,
        // padahal ia hanya belum mengisi token sekali.
        //
        // Ditandai sebagai string kosong, bukan dibiarkan `null`, supaya kotaknya
        // berhenti menampilkan "memuat" dan bisa dipakai menulis.
        if (masihDipakai) setTulisanTersimpan("");
      });

    return () => {
      masihDipakai = false;
    };
  }, [slugTopik, indeksSoal, kamus]);

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
  const kotakTampil = kotakPenjelasanTampil(keadaan);

  const { catat } = useProgres();

  function jawab(indeksAsli: number) {
    /*
     * Sudah benar berarti tidak ada lagi yang bisa dijawab: tombolnya dinonaktifkan,
     * dan `nilaiJawaban` mengabaikan kiriman berikutnya. Pencatatannya pun dilewati —
     * kalau tidak, klik ganda pada opsi benar akan menambah `percobaan` di backend
     * untuk jawaban yang sama, padahal di layar angkanya tidak bertambah.
     */
    if (keadaan.benar) return;

    /*
     * Keadaan berikutnya dihitung **sekali**, lalu dipakai dua tempat: menggambar
     * hasilnya, dan menentukan apa yang dicatat. `benar` diambil dari hasil
     * `nilaiJawaban`, bukan dihitung ulang dengan `indeksAsli === indeksBenar` —
     * aturan "jawaban ini benar" hidup di `penilaian.ts`, dan menghitungnya lagi di
     * sini berarti ada tempat kedua yang bisa menyimpang dari yang terlihat pemelajar.
     */
    const berikutnya = nilaiJawaban(keadaan, indeksAsli, indeksBenar);
    setKeadaan(berikutnya);

    /*
     * Dicatat tanpa `await`, dan hasilnya tidak ditunggu: pemelajar tidak boleh
     * menunggu jaringan untuk melihat hasil jawabannya. Pencatatannya sendiri tidak
     * melempar — provider menelan kegagalannya.
     */
    void catat(slugTopik, indeksSoal, berikutnya.benar);
  }

  function bandingkan() {
    setKeadaan(bukaPembahasan);
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
        {kamus.kuis} {nomor} {kamus.kuisDari} {total}
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
                //
                // Syaratnya `keadaan.benar`, **bukan** `terbuka`: sejak ticket #8
                // Pembahasan tidak lagi terbuka tepat saat jawaban benar, jadi memakai
                // `terbuka` akan membiarkan opsi tetap bisa diklik setelah dijawab
                // benar — dan `nilaiJawaban` mengabaikannya, sehingga tombolnya diam
                // tanpa penjelasan.
                disabled={!idSesiSiap || keadaan.benar}
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
                {salahTerakhir && <span className="sr-only">{kamus.jawabanSalah}</span>}
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
        {/*
          Syaratnya `!keadaan.benar`, **bukan** `!terbuka`. Sebelum ticket #8 keduanya
          sama, karena Pembahasan terbuka persis saat jawaban benar. Sekarang tidak:
          setelah jawaban benar Pembahasan masih tertutup sampai tombolnya ditekan, dan
          memakai `!terbuka` akan menampilkan "Belum tepat" kepada jawaban yang justru
          sudah benar — tepat setelah pemelajar melihat tombol "Bandingkan" muncul.
        */}
        {keadaan.percobaan > 0 && !keadaan.benar && (
          <p className="text-sm" style={{ color: "var(--color-accent)" }}>
            {kamus.belumTepat}
          </p>
        )}
        {keadaan.benar && (
          <p className="text-sm font-medium" style={{ color: "var(--color-accent)" }}>
            {kamus.benar}
          </p>
        )}
      </div>

      {/* Jumlah percobaan — user story 30, supaya terlihat Kuis mana yang perlu diulang. */}
      {keadaan.percobaan > 0 && (
        <p className="mt-1 font-mono text-xs" style={{ color: "var(--color-muted)" }}>
          {kamus.percobaan}: {keadaan.percobaan}
        </p>
      )}

      {/*
        Kotak Penjelasan — user story 26. Muncul tepat setelah jawaban benar, dan
        **sebelum** Pembahasan: pemelajar merumuskan alasannya dulu, baru membandingkan.
        Syaratnya dibaca dari `kotakPenjelasanTampil`, bukan ditulis ulang di sini.
      */}
      {kotakTampil && (
        <KotakPenjelasan
          slugTopik={slugTopik}
          indeksSoal={indeksSoal}
          kamus={kamus}
          tulisanAwal={tulisanTersimpan}
          onBandingkan={bandingkan}
        />
      )}

      {/*
        Pembahasan. User story 22 dan keputusan `design-tree.md`: tidak terbuka sebelum
        jawaban benar. User story 49 dan ticket #8 menambah syarat kedua: ia baru
        terbuka setelah tombol di Kotak Penjelasan ditekan. Kedua syaratnya dibaca dari
        `pembahasanTerbuka`, bukan ditulis ulang di sini, supaya tidak ada tempat kedua
        yang bisa lupa.
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
            {kamus.pembahasan}
          </p>
          <div className="mt-2 text-sm" style={{ color: "var(--color-fg)" }}>
            {kuis.penjelasan}
          </div>
        </div>
      )}
    </section>
  );
}
