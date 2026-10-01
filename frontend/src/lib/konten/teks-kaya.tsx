/**
 * Merender potongan teks pendek ber-Markdown menjadi React, tanpa pembungkus blok.
 *
 * **Kenapa ini ada, terpisah dari `materi-markdown.tsx`.** Materi adalah dokumen
 * panjang: ia punya judul, daftar, tabel, dan blok kode, dan dirender sebagai blok
 * dengan jarak antar bagian. Skenario Kuis, teks opsi, dan Pembahasan adalah potongan
 * satu paragraf yang duduk di dalam heading atau tombol. Keduanya sama-sama Markdown,
 * tetapi kebutuhan tampilannya berbeda, dan itu dua alasan berbeda untuk berubah.
 *
 * **Kenapa Markdown sama sekali.** Isi `content/*.yaml` menulis istilah teknis dengan
 * backtick (`` `pop(0)` ``) dan penekanan dengan bintang (`**O(n²)**`). Kalau teks ini
 * dirender sebagai teks biasa, penandanya muncul apa adanya — dan pemelajar membaca
 * backtick yang tidak ia mengerti. `MateriMarkdown` menghadapi masalah yang sama dan
 * sudah menyelesaikannya; modul ini memakai aturan yang sama untuk bentuk yang lebih
 * pendek.
 *
 * **Paragraf dipetakan ke `<span>`, bukan `<p>`.** Teks opsi dirender di dalam
 * `<button>`, dan `<button>` hanya boleh memuat elemen *phrasing* — `<p>` di dalamnya
 * HTML yang tidak sah. Karena `<span>` berurutan tanpa pemisah akan menempel
 * ("kalimat satu" + "kalimat dua" menjadi "kalimat satukalimat dua"), setiap paragraf
 * diberi satu spasi di belakangnya. Isi Kuis saat ini selalu satu paragraf, jadi
 * spasi itu tidak terlihat; ia ada supaya paragraf kedua tidak bergabung diam-diam
 * kalau kelak ditambahkan.
 *
 * Kelas `materi` dipakai apa adanya, sehingga gaya kode sebaris, tebal, dan tautan
 * berasal dari `globals.css` — tidak ada gaya kedua yang perlu dirawat. Jarak antar
 * paragraf tidak ikut terbawa karena `<p>` tidak pernah dihasilkan.
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  /** Potongan Markdown pendek, salah satu bahasa. */
  markdown: string;
}

export function TeksKaya({ markdown }: Props) {
  return (
    <span className="materi">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p(props) {
            const { children, node, ...sisa } = props;
            void node;
            return (
              <span {...sisa}>
                {children}
                {/* Pemisah antar paragraf. Lihat penjelasan di atas. */}
                {" "}
              </span>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </span>
  );
}
