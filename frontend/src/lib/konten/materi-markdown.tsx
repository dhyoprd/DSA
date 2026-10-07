/**
 * Merender Materi (Markdown) menjadi React.
 *
 * Dipisah dari halaman Topik supaya halaman itu mengurus navigasi dan tata letak,
 * sedangkan modul ini mengurus satu hal: bagaimana Markdown menjadi tampilan. Kalau
 * kelak blok kode butuh penyorotan sintaks, yang berubah hanya berkas ini.
 *
 * Ini komponen server — tidak ada `"use client"`. Markdown dirender saat build,
 * sesuai keputusan issue #1 bahwa Materi menjadi halaman statis. Karena itu
 * penanda bahasa pada blok kode dipakai sebagai label, tanpa penyorot sintaks
 * (yang akan menambah bundel sisi klien).
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { barisSimpul } from "./baris.ts";
import { sorotKode } from "./sorot-kode.ts";

/**
 * Ambil teks mentah dari isi sebuah blok kode.
 *
 * react-markdown menyerahkan `children` sebagai elemen React, bukan teks. Bentuknya
 * `<code>{teks}</code>`, dan teksnya bisa terpecah menjadi beberapa simpul kalau
 * memuat penanda. Karena itu seluruh isinya dikumpulkan rekursif, bukan dibaca
 * sebagai satu string.
 *
 * `null` berarti bentuknya tidak seperti yang diharapkan — pemanggil memakai fallback
 * daripada menebak.
 */
function teksDariAnak(anak: unknown): string | null {
  if (typeof anak === "string") return anak;
  if (typeof anak === "number") return String(anak);
  if (Array.isArray(anak)) {
    const bagian = anak.map(teksDariAnak);
    if (bagian.some((b) => b === null)) return null;
    return bagian.join("");
  }
  if (anak !== null && typeof anak === "object" && "props" in anak) {
    const props = (anak as { props?: { children?: unknown } }).props;
    return teksDariAnak(props?.children);
  }
  return null;
}

/** Nama bahasa dari `className` sebuah blok kode, mis. `language-python` -> `python`. */
function bahasaDariAnak(anak: unknown): string | undefined {
  if (anak !== null && typeof anak === "object" && "props" in anak) {
    const props = (anak as { props?: { className?: string } }).props;
    return /language-(\w+)/.exec(props?.className ?? "")?.[1];
  }
  return undefined;
}

interface Props {
  /** Isi Markdown, salah satu bahasa. */
  markdown: string;
  /**
   * `id` yang dipasang pada heading, dipetakan dari **nomor baris**.
   *
   * Nomor baris adalah kuncinya karena react-markdown meneruskan
   * `node.position.start.line` ke setiap komponen override, dan nomor itu berasal
   * dari pohon Markdown yang sama dengan yang dipakai `bagian.ts` untuk menyusun
   * daftar isi. Kesepadanannya sudah diverifikasi — termasuk saat Materi memuat
   * tabel, daftar tugas, dan coretan (GFM). Lihat `bagian.test.ts`.
   *
   * Sengaja diterima sebagai prop, bukan dihitung di sini: dengan begitu daftar isi
   * dan heading memakai satu perhitungan yang sama, dan modul ini tidak perlu tahu
   * apa pun tentang bagaimana bagian ditemukan.
   *
   * Kosong berarti tidak ada heading yang ditautkan — mis. saat daftar isi tidak
   * ditampilkan.
   */
  idJudul?: Map<number, string>;
}

export function MateriMarkdown({ markdown, idJudul }: Props) {
  /**
   * Heading yang sama dengan yang ditautkan daftar isi.
   *
   * `daftarBagian` mengumpulkan **setiap** judul apa pun tingkatnya, jadi seluruh
   * heading di sini punya `id`. Yang membuat `id` bisa kosong hanyalah heading yang
   * nomor barisnya tidak ada di peta — dan itu hanya terjadi kalau daftar isi tidak
   * ditampilkan sama sekali (`idJudul` kosong).
   */
  const heading = (Tingkat: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") =>
    function Heading(props: React.ComponentProps<"h1"> & { node?: unknown }) {
      const { children, node, ...sisa } = props;
      void node;
      const baris = barisSimpul(node);
      const id = baris === undefined ? undefined : idJudul?.get(baris);
      // `id` dipasang setelah `sisa`, bukan sebelumnya: kalau kelak react-markdown
      // ikut meneruskan `id` dari pohon Markdown, id dari daftar isi yang menang.
      // Dua id yang berbeda untuk satu heading adalah persis kesalahan yang membuat
      // tautan daftar isi meleset tanpa error.
      return (
        <Tingkat {...sisa} id={id}>
          {children}
        </Tingkat>
      );
    };

  return (
    <div className="materi">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: heading("h1"),
          h2: heading("h2"),
          h3: heading("h3"),
          h4: heading("h4"),
          h5: heading("h5"),
          h6: heading("h6"),
          // Blok kode: diberi label bahasa, dan digulir mendatar kalau panjang
          // daripada memaksa halaman melebar. Di HP ini yang membuat kode tetap
          // terbaca.
          code(props) {
            const { children, className, node, ...sisa } = props;
            const cocok = /language-(\w+)/.exec(className ?? "");
            void node;
            return (
              <code className={className} data-bahasa={cocok?.[1]} {...sisa}>
                {children}
              </code>
            );
          },
          /**
           * Blok kode disorot kalau bisa, dan ditampilkan apa adanya kalau tidak.
           *
           * **Kenapa `pre`, bukan `code`.** Yang perlu diganti adalah seluruh blok:
           * penyorotan menghasilkan baris-baris, dan baris itu perlu elemen sendiri
           * supaya tiap baris mulai di baris baru tanpa `<br>`. Menggantinya di
           * `code` akan menyisakan `<pre>` pembungkus yang tidak tahu soal baris.
           *
           * **Tidak ada HTML mentah di sini.** `sorotKode()` mengembalikan data
           * (baris dan potongan), bukan string HTML, dan komponen ini merendernya
           * sebagai JSX. Jadi tidak ada `dangerouslySetInnerHTML` di seluruh jalur
           * ini — markupnya terlihat di sini, bukan tersembunyi di dalam string.
           *
           * **Fallback wajib.** Kalau penyorotan tidak tersedia (`null`), blok
           * dirender seperti sebelumnya — teks polos dengan label bahasa. Kode yang
           * tidak terbaca jauh lebih buruk daripada kode tanpa warna, jadi kegagalan
           * penyorot tidak boleh membuat kode hilang.
           */
          pre(props) {
            const { children, node, ...sisa } = props;
            void node;
            const bahasa = bahasaDariAnak(children);
            const teks = teksDariAnak(children);
            const tersorot = teks === null ? null : sorotKode(teks, bahasa ?? "python");

            if (tersorot === null) {
              return <pre {...sisa}>{children}</pre>;
            }

            return (
              <pre {...sisa} className="shiki">
                <code data-bahasa={bahasa ?? "python"}>
                  {tersorot.baris.map((baris, i) => (
                    <span className="line" key={i}>
                      {baris.map((potongan, j) => (
                        <span key={j} style={potongan.warna === undefined ? undefined : { color: potongan.warna }}>
                          {potongan.teks}
                        </span>
                      ))}
                    </span>
                  ))}
                </code>
              </pre>
            );
          },
          // Tabel (dipakai untuk notasi kompleksitas) dibungkus wadah yang bisa
          // digulir mendatar, supaya tabel lebar tidak merusak tata letak di HP.
          table(props) {
            return (
              <div className="tabel-gulir">
                <table {...props} />
              </div>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
