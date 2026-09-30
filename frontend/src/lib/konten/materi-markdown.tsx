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

interface Props {
  /** Isi Markdown, salah satu bahasa. */
  markdown: string;
}

export function MateriMarkdown({ markdown }: Props) {
  return (
    <div className="materi">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
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
