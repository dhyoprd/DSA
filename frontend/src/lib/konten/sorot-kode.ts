/**
 * Menyorot blok kode Python, di sisi server, tanpa JavaScript ke peramban.
 *
 * **Kenapa sisi server.** Materi dan Pembahasan dirender saat build (`MateriMarkdown`
 * dan `TeksKaya` tidak punya `"use client"`), dan halaman Topik menjadi HTML statis.
 * Menyorot di sini menjaga sifat itu: tidak ada bundel sisi klien yang bertambah, dan
 * halaman tetap bekerja saat backend mati. Itu juga sebabnya `MateriMarkdown` tidak
 * perlu diubah menjadi komponen async — Shiki punya API **sinkron**
 * (`createHighlighterCoreSync`).
 *
 * **Kenapa engine regex JavaScript, bukan Oniguruma/WASM.** `createOnigurumaEngine`
 * menuntut binary WASM 466 KB yang harus dimuat saat build; `createJavaScriptRegexEngine`
 * adalah engine murni JavaScript dengan antarmuka yang sama. Untuk satu bahasa (Python)
 * hasilnya sama, dan tidak ada binary yang perlu disertakan. Diverifikasi dengan
 * membandingkan keluaran token keduanya.
 *
 * **Kenapa temanya ditulis dengan mengganti warna tema bawaan, bukan dari nol.**
 * Menulis tema dari nol menuntut menuliskan sendiri setiap nama scope TextMate
 * (`keyword.control`, `entity.name.function`, …), dan nama yang salah membuat token
 * itu **diam-diam tidak berwarna** — kegagalan yang tidak melempar error dan tidak
 * terlihat kecuali dengan memeriksa keluaran. Tema `github-light` sudah memetakan
 * scope dengan benar, jadi yang dilakukan di sini hanya **mengganti setiap nilai
 * warnanya** dengan token CSS proyek. Pemetaan scope-nya tetap milik tema bawaan;
 * yang jadi milik kita hanya paletnya.
 *
 * **Kenapa warnanya `var(--kode-*)`, bukan nilai hex.** Blok kode harus mengikuti
 * tema terang/gelap seperti bagian lain situs. Kalau temanya memuat warna literal,
 * nilainya harus ditulis dua kali (terang dan gelap) dan bisa menyimpang. Dengan
 * mengeluarkan `var(--kode-*)`, peralihan tema ditangani token CSS yang sudah ada di
 * `globals.css` — satu nilai per token, dengan `light-dark()` yang memilih.
 *
 * **Paletnya sengaja satu keluarga dengan aksen.** `docs/design-tree.md` menetapkan
 * merah sebagai satu-satunya warna aksen. Blok kode butuh beberapa warna untuk berguna,
 * jadi warnanya diambil dari keluarga merah/oranye/cokelat, bukan biru-hijau-ungu
 * seperti tema editor biasa. Penyimpangan ini dicatat di `docs/adr/0029`.
 *
 * **Fungsi murni.** Masukannya teks, keluarannya HTML. Tidak menyentuh berkas, DOM,
 * atau React, sehingga bisa diuji dengan `node --test` tanpa merender apa pun.
 */

import { createHighlighterCoreSync, createJavaScriptRegexEngine } from "shiki";
import python from "@shikijs/langs/python";
import dasar from "@shikijs/themes/github-light";

/**
 * Peta warna tema bawaan ke token CSS proyek.
 *
 * Kuncinya adalah warna `foreground` yang dipakai `github-light` (huruf kecil).
 * Warna yang tidak ada di peta dibiarkan apa adanya — itu disengaja: kalau tema
 * bawaan menambahkan warna baru di versi berikutnya, token itu tetap tampil (dengan
 * warna lamanya) alih-alih hilang. Yang perlu dirawat adalah daftar ini, dan
 * `periksaWarnaTema()` di bawah memastikan setiap token CSS yang dipakai benar-benar
 * terdefinisi.
 */
const PETA_WARNA: Record<string, string> = {
  "#d73a49": "var(--kode-kunci)", // kata kunci: def, return, if, class
  "#005cc5": "var(--kode-angka)", // angka dan konstanta: 42, True, None
  "#032f62": "var(--kode-teks)", // string dan docstring
  "#6f42c1": "var(--kode-fungsi)", // nama fungsi dan kelas
  "#6a737d": "var(--kode-komentar)", // komentar
  "#586069": "var(--kode-komentar)",
  "#24292e": "var(--kode-fg)", // identifier biasa
  "#22863a": "var(--kode-teks)", // tag (dipakai bahasa lain, tidak ada di Python)
  "#b31d28": "var(--kode-kunci)",
  "#e36209": "var(--kode-angka)",
  "#f6f8fa": "var(--kode-fg)",
  "#fafbfc": "var(--kode-fg)",
};

/**
 * Warna yang dipakai tema bawaan untuk teks yang tidak punya scope khusus —
 * tanda kurung, titik dua, koma.
 *
 * Ini **bukan** nilai hex, karena hex apa pun akan salah di salah satu tema. Token
 * yang sama dengan identifier biasa dipakai, karena secara bahasa keduanya memang
 * sama-sama bukan kata kunci.
 */
const WARNA_DASAR = "var(--kode-fg)";

/**
 * Warna yang dipakai tema bawaan untuk latar dan teks dasar `<pre>`.
 *
 * Dipisah karena keduanya bukan `tokenColors` melainkan `colors`, dan `colors`
 * diwarisi dari tema bawaan kalau tidak ditimpa — itulah yang membuat blok kode
 * berlatar putih saat situs sedang gelap.
 */
const WARNA_LATAR = "var(--kode-bg)";

/**
 * Tema proyek: tema bawaan dengan warnanya diganti token CSS.
 *
 * **Tidak ada `settings` di akar tema.** Itu bukan kelalaian: `settings` di akar
 * **menimpa seluruh `tokenColors`**, sehingga setiap token menjadi satu warna dan
 * penyorotannya hilang. Diverifikasi dengan membandingkan keluaran tema yang punya
 * `settings` dan yang tidak.
 *
 * **`colors` ditimpa, bukan diwarisi.** Tema bawaan membawa `colors` yang dipakai
 * Shiki untuk `style` pada `<pre>` — latar dan warna dasar. Kalau diwarisi, blok kode
 * akan berlatar putih terang **walaupun tema situs sedang gelap**. Keduanya diganti
 * token CSS yang sama dengan sisa blok kode.
 */
const TEMA = {
  name: "dsa-kode",
  type: "light" as const,
  colors: {
    "editor.background": WARNA_LATAR,
    "editor.foreground": WARNA_DASAR,
  },
  tokenColors: (dasar.tokenColors ?? []).map((aturan) => {
    const fg = (aturan.settings as { foreground?: string } | undefined)?.foreground?.toLowerCase();
    const ganti = fg === undefined ? undefined : PETA_WARNA[fg];
    return ganti === undefined ? aturan : { ...aturan, settings: { ...aturan.settings, foreground: ganti } };
  }),
};

/**
 * Bahasa yang disorot.
 *
 * Hanya Python: seluruh blok kode di Materi, Pembahasan, dan Soal Kode adalah Python.
 * Menambahkan bahasa berarti menambahkan impornya di sini — dan itu menambah berat
 * build, jadi hanya ditambahkan kalau memang ada bloknya.
 */
const BAHASA = [python];

let highlighter: ReturnType<typeof createHighlighterCoreSync> | null = null;
let gagalMuat = false;

/**
 * Penyorot, dibuat sekali dan dipakai ulang.
 *
 * Membuatnya berulang kali mahal: ia memuat grammar TextMate. Karena itu hasilnya
 * disimpan. `gagalMuat` juga disimpan supaya kegagalan tidak dicoba ulang untuk setiap
 * blok kode — kalau penyorotan memang tidak bisa jalan, setiap blok langsung memakai
 * fallback.
 */
function ambilHighlighter(): ReturnType<typeof createHighlighterCoreSync> | null {
  if (gagalMuat) return null;
  if (highlighter !== null) return highlighter;
  try {
    highlighter = createHighlighterCoreSync({
      themes: [TEMA],
      langs: BAHASA,
      engine: createJavaScriptRegexEngine(),
    });
    return highlighter;
  } catch {
    // Sengaja menelan galat: yang terpenting kode tetap terbaca. Lihat `sorotKode`.
    gagalMuat = true;
    return null;
  }
}

/**
 * Satu potongan kode beserta warnanya.
 *
 * Warnanya adalah **token CSS** (`var(--kode-kunci)`), bukan nilai hex, supaya blok
 * kode ikut tema terang/gelap tanpa nilai yang ditulis dua kali.
 */
export interface PotonganKode {
  teks: string;
  warna: string | undefined;
}

/** Hasil penyorotan: baris demi baris, tiap baris berisi potongan berwarna. */
export interface KodeTersorot {
  baris: PotonganKode[][];
}

/**
 * Sorot kode Python, atau kembalikan `null` kalau penyorotan tidak bisa dipakai.
 *
 * Mengembalikan **data**, bukan HTML: pemanggil merendernya sebagai JSX, sehingga
 * tidak ada `dangerouslySetInnerHTML` di seluruh jalur ini. Teks Materi berasal dari
 * berkas git dan bukan masukan pengguna, tetapi tidak menyalurkan HTML mentah ke React
 * tetap lebih aman dan lebih mudah ditinjau — markupnya terlihat di komponen, bukan
 * tersembunyi di dalam string.
 *
 * `null` berarti pemanggil merender teksnya apa adanya. React meng-escape teks yang
 * dirender sebagai anak elemen, jadi fallback tidak perlu melepas penanda HTML sendiri.
 * Bahasa selain Python, dan kode yang gagal disorot, juga menghasilkan `null`. Kode
 * yang salah warna masih berguna; kode yang hilang tidak.
 */
export function sorotKode(kode: string, bahasa = "python"): KodeTersorot | null {
  if (bahasa !== "python") return null;
  const h = ambilHighlighter();
  if (h === null) return null;
  try {
    const hasil = h.codeToTokens(kode, { lang: "python", theme: TEMA.name });
    return {
      baris: hasil.tokens.map((baris) =>
        baris.map((t) => ({ teks: t.content, warna: gantiWarna(t.color) })),
      ),
    };
  } catch {
    return null;
  }
}

/**
 * Ganti satu warna keluaran Shiki dengan token CSS.
 *
 * Shiki memakai `var(--kode-*)` untuk token yang punya scope (karena tema kita
 * menggantinya), tetapi nilai hex untuk yang tidak — latar `<pre>`, warna dasar, dan
 * tanda baca. Fungsi ini menyatukan keduanya.
 *
 * Tanpa langkah ini, blok kode membawa warna terang bawaan tema, dan pada tema gelap
 * latar putih itu membuat kode **tidak terbaca**. Ditemukan dengan memeriksa keluaran
 * dan menemukan `#fffffe` di dalamnya.
 */
function gantiWarna(warna: string | undefined): string | undefined {
  if (warna === undefined) return undefined;
  if (warna.startsWith("var(--")) return warna;
  const cocok = PETA_WARNA[warna.toLowerCase()];
  if (cocok !== undefined) return cocok;
  // Warna yang tidak dikenal: perlakukan sebagai teks biasa alih-alih membiarkan
  // nilai hex dari tema bawaan — nilai itu salah di salah satu tema.
  return WARNA_DASAR;
}

/**
 * Apakah penyorotan benar-benar tersedia.
 *
 * Dipakai uji, dan dipakai untuk memutuskan apakah kegagalan perlu dilaporkan saat
 * build. Tanpa ini, "penyorotan gagal" dan "tidak ada blok kode" terlihat sama.
 */
export function sorotanTersedia(): boolean {
  return ambilHighlighter() !== null;
}

/**
 * Daftar token CSS yang dipakai tema, untuk diperiksa terhadap `globals.css`.
 *
 * Tanpa pemeriksaan ini, salah ketik nama token (`--kode-kunci` menjadi `--kode-key`)
 * menghasilkan warna yang tidak terdefinisi — dan CSS yang tidak sah **tidak
 * melempar error**, ia hanya membuat teks kembali ke warna warisan. Itu jenis
 * kegagalan yang tidak terlihat kecuali dibandingkan.
 */
export function tokenWarnaYangDipakai(): string[] {
  const token = new Set<string>();
  for (const aturan of TEMA.tokenColors) {
    const fg = (aturan.settings as { foreground?: string } | undefined)?.foreground;
    if (fg?.startsWith("var(--")) token.add(fg.slice(4, -1));
  }
  return [...token].sort();
}
