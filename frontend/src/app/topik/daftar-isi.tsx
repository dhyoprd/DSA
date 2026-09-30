import type { Bagian } from "@/lib/konten/bagian.ts";

/**
 * Daftar isi Materi: tautan ke setiap bagian, memakai `id` yang diberikan
 * `materi-markdown.tsx` pada heading yang bersesuaian.
 *
 * Bentuknya berbeda menurut lebar layar, dan itu disengaja:
 *
 * - **Layar lebar** — kolom yang menempel di sisi kanan, selalu terlihat, supaya
 *   pembaca bisa melompat saat membaca ulang tanpa menggulir ke atas.
 * - **Layar sempit** — daftar terlipat. Delapan tautan yang selalu terbuka di atas
 *   Materi akan mendorong Materi turun satu layar penuh di HP, dan itu justru
 *   mengubur hal yang ingin dibaca.
 *
 * Karena ini komponen server tanpa JavaScript, bentuk itu dipilih CSS: **dua
 * pembungkus dirender, dan `hidden`/`lg:hidden` memastikan tepat satu yang terlihat**.
 * Elemen yang tersembunyi `display:none`, jadi ia juga tidak masuk pohon aksesibilitas
 * dan tidak terbaca dua kali oleh pembaca layar. Isinya satu: `DaftarTautan` dan
 * `bagian` yang sama dipakai kedua pembungkus, sehingga tidak ada dua daftar yang
 * bisa menyimpang.
 *
 * Ini komponen server; tidak ada JavaScript di sisi klien. Lipatan memakai elemen
 * `<details>` bawaan browser.
 */

interface Props {
  bagian: Bagian[];
}

export function DaftarIsi({ bagian }: Props) {
  // Materi tanpa judul tidak punya bagian untuk ditautkan. Menampilkan kerangka
  // kosong lebih buruk daripada tidak menampilkan apa pun.
  if (bagian.length === 0) return null;

  return (
    <>
      <details className="mb-8 lg:hidden">
        <summary
          className="cursor-pointer font-mono text-xs tracking-widest uppercase"
          style={{ color: "var(--color-muted)" }}
        >
          Daftar isi
        </summary>
        <nav aria-label="Daftar isi Materi" className="mt-3">
          <DaftarTautan bagian={bagian} />
        </nav>
      </details>

      <nav
        aria-label="Daftar isi Materi"
        className="hidden lg:sticky lg:top-8 lg:block lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto"
      >
        <p
          className="font-mono text-xs tracking-widest uppercase"
          style={{ color: "var(--color-muted)" }}
        >
          Daftar isi
        </p>
        <div className="mt-3">
          <DaftarTautan bagian={bagian} />
        </div>
      </nav>
    </>
  );
}

/**
 * Daftar tautan itu sendiri.
 *
 * Tingkat judul dipetakan ke indentasi, jadi struktur Materi terlihat dari daftar
 * isi — bagian `###` menjorok di bawah `##` induknya. Selisihnya dihitung dari
 * tingkat terendah yang ada, bukan dari angka mutlak, supaya Materi yang hanya
 * memakai `###` tidak seluruhnya menjorok tanpa alasan.
 */
function DaftarTautan({ bagian }: Props) {
  const tingkatTerendah = Math.min(...bagian.map((b) => b.tingkat));

  return (
    <ul className="flex flex-col gap-1 text-sm">
      {bagian.map((item) => (
        <li
          key={item.id}
          style={{ paddingInlineStart: `${String((item.tingkat - tingkatTerendah) * 0.75)}rem` }}
        >
          <a
            href={`#${item.id}`}
            className="block rounded py-0.5 transition-colors hover:underline"
            style={{ color: "var(--color-muted)" }}
          >
            {item.teks}
          </a>
        </li>
      ))}
    </ul>
  );
}
