/**
 * Keterangan teks untuk pembaca layar.
 *
 * **Kenapa ini ada, dan bukan sekadar `aria-label` di komponen.** Visualisasi adalah
 * gambar: kotak yang bergeser dan pudar. Pembaca layar tidak melihat satu pun dari
 * itu. Yang membuatnya tetap bisa dipakai adalah **kalimat** yang menerangkan keadaan
 * struktur saat ini — apa isinya, apa yang baru terjadi, dan nilai apa yang keluar.
 *
 * Kalimat itu adalah aturan, bukan hiasan: kalau ia salah menyebut ujungnya, pemelajar
 * yang memakai pembaca layar menghafal aturan yang salah, dan tidak ada error apa pun
 * yang muncul. Karena itu ia disusun di sini, di luar React, tempat ia bisa diuji
 * langsung — sama seperti aturan Kuis dan aturan pencarian.
 *
 * **Yang tidak dikerjakan di sini:** menyebutkan posisi kotak secara visual (mis.
 * "kotak ketiga dari atas"). Itu urusan menggambar, dan keterangan yang menyebut
 * posisi piksel justru membingungkan saat didengar. Yang disebut adalah **isi** dan
 * **peristiwa** — hal yang memang punya arti tanpa melihat.
 */

import type { Keadaan } from "./struktur.ts";
import type { LabelStruktur } from "./label.ts";

/**
 * Kata-kata untuk menyusun keterangan, sudah dalam bahasa yang berlaku.
 *
 * Kalimat yang utuh — seperti "Strukturnya kosong." — dibawa apa adanya, bukan
 * dirakit dari kata sifat. Merangkai kalimat dengan menyambung potongan berarti
 * tata bahasanya ditentukan di sini, dan itu berarti ia harus benar untuk kedua
 * bahasa sekaligus. Menyerahkan kalimat utuh ke kamus membuat penulisnya yang
 * menanggung tata bahasanya, di tempat ia memang bisa dilihat dan diperiksa.
 */
export interface TeksKeterangan {
  push: string;
  pop: string;
  awal: string;
  langkah: string;
  isi: string;
  isiKosong: string;
  popKosong: string;
}

/**
 * Susun keterangan satu keadaan.
 *
 * Bentuknya sengaja satu paragraf pendek, bukan daftar: ia dibacakan sebagai satu
 * pengumuman setiap kali langkah berubah, dan daftar yang panjang akan memotong
 * langkah berikutnya. Urutannya: apa yang baru terjadi, lalu isi strukturnya sekarang.
 * Mendengar peristiwanya lebih dulu membuat isi barunya punya konteks.
 */
export function keterangan(
  keadaan: Keadaan,
  label: LabelStruktur,
  teks: TeksKeterangan,
): string {
  const bagian: string[] = [];

  if (keadaan.terakhir === null) {
    bagian.push(teks.awal);
  } else if (keadaan.terakhir.operasi === "push") {
    bagian.push(
      `${teks.langkah} ${teks.push} ${String(keadaan.terakhir.nilai)} ` +
        `— ${teks.push} ${label.ujungMasuk}.`,
    );
  } else if (keadaan.keluar === null) {
    bagian.push(`${teks.langkah} ${teks.pop} — ${teks.popKosong}`);
  } else {
    bagian.push(
      `${teks.langkah} ${teks.pop} ${String(keadaan.keluar)} ` +
        `— ${teks.pop} ${label.ujungKeluar}.`,
    );
  }

  bagian.push(
    keadaan.sel.length === 0
      ? teks.isiKosong
      : `${teks.isi} ${keadaan.sel.map((s) => String(s.nilai)).join(", ")}.`,
  );

  return bagian.join(" ");
}
