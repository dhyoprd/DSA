/**
 * Menyusun kartu hafalan dari sebuah Topik.
 *
 * Modul ini memutuskan **fakta mana yang layak jadi kartu**, bukan bagaimana kartunya
 * ditulis ke berkas. Pemisahan itu disengaja: "fakta apa yang perlu dihafal" dan
 * "bagaimana format berkas Anki" adalah dua hal yang berubah karena alasan berbeda.
 * Yang pertama berubah kalau kita memutuskan jenis fakta baru layak dihafal; yang
 * kedua berubah kalau format Anki berubah. Bentuk berkasnya ada di `anki.ts`.
 *
 * Tiga jenis kartu dihasilkan, sesuai kriteria penerimaan #14:
 *
 * 1. **Kompleksitas waktu** — satu kartu per operasi tiap struktur.
 * 2. **Kompleksitas ruang** — satu kartu per struktur.
 * 3. **Istilah** — dua kartu per istilah: definisinya, dan pasangan
 *    Indonesia–English-nya.
 *
 * **Kenapa depan kartu diberi awalan** ("Kompleksitas waktu", "Definisi", "Istilah").
 * Anki menentukan keunikan sebuah catatan dari **kolom pertamanya**. Tanpa awalan,
 * kartu definisi dan kartu pasangan untuk istilah yang sama akan berdepan sama
 * ("Tumpukan"), dan Anki menandainya sebagai duplikat. Awalan itu juga membuat kartu
 * bisa dibaca tanpa konteks saat diulang.
 *
 * **Fungsi murni.** Tidak ada berkas, tidak ada jaringan, tidak ada React. Semua yang
 * dibutuhkan datang sebagai argumen, termasuk bahasa — sehingga kartunya bisa diuji
 * sebagai teks biasa.
 */

import type { Bahasa } from "../bahasa/bahasa.ts";
import { kamusUntuk } from "../bahasa/kamus.ts";
import type { Istilah, Topik } from "../konten/tipe.ts";

/**
 * Tag yang menandai jenis fakta, plus slug Topiknya.
 *
 * Nilainya persis yang diputuskan pemilik proyek: `kompleksitas`, `istilah`,
 * `istilah-id-en`. Tag Anki tidak boleh memuat spasi, dan ketiganya sudah aman. Tag
 * **tidak** diterjemahkan — kalau diterjemahkan, berkas untuk dua bahasa tidak bisa
 * disaring dengan penyaring yang sama. Slug Topik ikut ditambahkan supaya 12 Topik
 * bisa disaring di Anki; tanpa itu deknya bercampur dan tidak bisa dipelajari per Topik.
 */
export const TAG_KOMPLEKSITAS = "kompleksitas";
export const TAG_ISTILAH = "istilah";
export const TAG_ISTILAH_ID_EN = "istilah-id-en";

/** Satu kartu hafalan, sebelum ditulis ke berkas. */
export interface Kartu {
  /** Sisi depan: pertanyaannya. */
  depan: string;
  /** Sisi belakang: jawabannya. */
  belakang: string;
  /** Tag yang menempel di kartu ini, tanpa spasi. */
  tag: string[];
}

/** Tag jenis fakta plus slug Topik, urut supaya keluarannya bisa dibandingkan di uji. */
function tag(jenis: string, slug: string): string[] {
  return [jenis, slug];
}

/**
 * Kartu kompleksitas sebuah Topik: waktu per operasi, ruang per struktur.
 *
 * Ruang dipisah dari waktu karena keduanya menjawab pertanyaan berbeda dan dihafal
 * terpisah: "operasi ini butuh berapa waktu" dijawab per operasi, "struktur ini
 * memakan berapa memori" dijawab sekali per struktur.
 */
export function kartuKompleksitas(topik: Topik, bahasa: Bahasa): Kartu[] {
  const kamus = kamusUntuk(bahasa);
  const kartu: Kartu[] = [];

  for (const struktur of topik.kompleksitas) {
    const nama = struktur.struktur[bahasa];

    kartu.push({
      depan: `${kamus.eksporKompleksitasRuang} — ${nama}`,
      belakang: struktur.ruang,
      tag: tag(TAG_KOMPLEKSITAS, topik.slug),
    });

    for (const operasi of struktur.operasi) {
      kartu.push({
        depan: `${kamus.eksporKompleksitasWaktu} — ${nama} — ${operasi.nama[bahasa]}`,
        belakang: operasi.waktu,
        tag: tag(TAG_KOMPLEKSITAS, topik.slug),
      });
    }
  }

  return kartu;
}

/**
 * Kartu istilah sebuah Topik: definisi, dan pasangan Indonesia–English.
 *
 * Pasangan yang kedua sisinya sama (mis. "LIFO") tidak menghasilkan kartu pasangan —
 * kartu "LIFO → LIFO" tidak menguji apa pun. Definisinya tetap dibuat, karena justru
 * itulah yang perlu diketahui tentang istilah seperti itu.
 *
 * Arah kartu pasangan mengikuti bahasa yang berlaku: di antarmuka Indonesia, depan
 * adalah istilah Indonesia dan belakang istilah English — pemelajar mengingat istilah
 * English-nya. Di antarmuka English arahnya dibalik. Itu satu aturan yang sama:
 * **ingat istilah dalam bahasa yang lain**.
 */
export function kartuIstilah(topik: Topik, bahasa: Bahasa): Kartu[] {
  const kamus = kamusUntuk(bahasa);
  const kartu: Kartu[] = [];

  for (const istilah of topik.istilah) {
    kartu.push({
      depan: `${kamus.eksporDefinisi} — ${istilah.istilah[bahasa]}`,
      belakang: istilah.definisi[bahasa],
      tag: tag(TAG_ISTILAH, topik.slug),
    });

    const pasangan = pasanganIstilah(istilah, bahasa);
    if (pasangan !== null) {
      kartu.push({
        depan: `${kamus.eksporPasanganIstilah} — ${pasangan.depan}`,
        belakang: pasangan.belakang,
        tag: tag(TAG_ISTILAH_ID_EN, topik.slug),
      });
    }
  }

  return kartu;
}

/**
 * Pasangan Indonesia–English sebuah istilah, atau `null` kalau kedua sisinya sama.
 *
 * `bahasa` menentukan arahnya, bukan isinya: di Indonesia, depan Indonesia dan
 * belakang English; di English dibalik.
 */
function pasanganIstilah(
  istilah: Istilah,
  bahasa: Bahasa,
): { depan: string; belakang: string } | null {
  const { id, en } = istilah.istilah;
  if (id === en) return null;

  return bahasa === "id" ? { depan: id, belakang: en } : { depan: en, belakang: id };
}

/** Seluruh kartu satu Topik: kompleksitas lalu istilah. */
export function kartuDariTopik(topik: Topik, bahasa: Bahasa): Kartu[] {
  return [...kartuKompleksitas(topik, bahasa), ...kartuIstilah(topik, bahasa)];
}

/**
 * Seluruh kartu dari seluruh Topik.
 *
 * Topik yang sudah diselesaikan maupun belum ikut — ekspor ini tidak bergantung pada
 * Progres, karena sumbernya Materi di git, bukan database (ADR-0003). Kriteria
 * penerimaan "ekspor mencakup Topik yang sudah diselesaikan" terpenuhi dengan
 * sendirinya: yang menentukan bukan Progres, melainkan Topik mana yang punya berkas.
 */
export function kartuSemua(topik: Topik[], bahasa: Bahasa): Kartu[] {
  return topik.flatMap((t) => kartuDariTopik(t, bahasa));
}
