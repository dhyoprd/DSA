/**
 * Endpoint unduhan CSV Anki, satu per bahasa.
 *
 * **Kenapa di antarmuka, bukan di backend.** Datanya hidup di `content/*.yaml` (git),
 * bukan di database — backend tidak membacanya (ADR-0003). Menyusunnya di sini berarti
 * berkasnya bisa dibuat **saat build** dan disajikan sebagai berkas statis: tidak butuh
 * backend hidup, tidak butuh token, dan unduhannya tetap bekerja saat backend mati.
 * Itu juga menjawab "ekspor mencakup Topik yang sudah diselesaikan" tanpa bergantung
 * pada Progres sama sekali.
 *
 * **Kenapa route handler, bukan halaman.** Berkasnya bukan halaman yang dibaca; ia
 * diunduh. `Content-Disposition: attachment` membuat peramban menyimpannya alih-alih
 * menampilkannya, dan route handler adalah tempat yang tepat untuk respons non-UI.
 *
 * **Kenapa per bahasa.** Kartu memakai istilah dan definisi dalam bahasa yang berlaku
 * (`content/*.yaml` menyimpan keduanya). Dua berkas terpisah lebih berguna daripada
 * satu berkas campuran: pemelajar bisa mengimpor bahasa yang sedang ia pelajari.
 *
 * `dynamic = "force-static"` membuat responsnya diprerender saat build, dan
 * `generateStaticParams` menyebut kedua bahasa yang harus dibuat. Keduanya diverifikasi
 * lewat dokumentasi Next.js yang dibundel (`node_modules/next/dist/docs/`,
 * `01-app/03-api-reference/03-file-conventions/route.md`).
 */

import { BAHASA, adalahBahasa } from "@/lib/bahasa/bahasa.ts";
import { konten } from "@/lib/konten/muat.ts";
import { berkasAnki, namaBerkasAnki } from "@/lib/ekspor/anki.ts";
import { kartuSemua } from "@/lib/ekspor/kartu.ts";

/** Prerender saat build: isinya hanya bergantung pada konten di git. */
export const dynamic = "force-static";

/** Kedua bahasa menghasilkan berkas sendiri. */
export function generateStaticParams(): { bahasa: string }[] {
  return BAHASA.map((bahasa) => ({ bahasa }));
}

export async function GET(
  _permintaan: Request,
  { params }: { params: Promise<{ bahasa: string }> },
): Promise<Response> {
  const { bahasa } = await params;

  // Segmen bahasa yang tidak sah tidak boleh menghasilkan berkas. Layout di atasnya
  // sudah menolaknya untuk halaman; route handler tidak melewati layout, jadi ia
  // memeriksa sendiri.
  if (!adalahBahasa(bahasa)) {
    return new Response(null, { status: 404 });
  }

  const { topik } = konten();
  const isi = berkasAnki(kartuSemua(topik, bahasa));
  const nama = namaBerkasAnki(bahasa);

  return new Response(isi, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nama}"`,
    },
  });
}
