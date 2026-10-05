import type { Kamus } from "@/lib/bahasa/kamus.ts";
import type { StatusProgres } from "@/lib/konten/tipe.ts";

/**
 * Penanda Progres sebuah Topik: ○ belum, ◐ sedang, ● selesai.
 *
 * Bentuk simbolnya ditetapkan di `docs/design-tree.md`. Lambangnya sendiri tidak
 * terbaca mesin pembaca layar, jadi teksnya selalu disertakan sebagai
 * `aria-label` + `title`, dan lambangnya disembunyikan dari accessibility tree.
 * Tanpa itu, tiga status berbeda terdengar sama saja.
 *
 * Nama statusnya datang dari kamus (ticket #12), bukan dari peta di berkas ini:
 * "Belum dikerjakan" dan "Not started" adalah kalimat antarmuka, dan kalimat
 * antarmuka hidup di satu tempat. Yang tetap di sini hanyalah lambangnya, karena
 * lambang tidak diterjemahkan.
 *
 * Progres belum punya sumber data di tampilan: endpoint-nya dibangun di ticket #7,
 * tetapi **menyambungkannya ke sidebar belum dikerjakan**. Ticket #8 sempat disangka
 * yang mengerjakannya, dan itu keliru — #8 mengerjakan Kotak Penjelasan. Sampai ada
 * ticket yang menyambungkan Progres, pemanggil memberi `"belum"`, dan komponen ini
 * tidak perlu berubah saat datanya tiba.
 */

/** Lambang untuk setiap status. Urutannya tetap: belum → sedang → selesai. */
const LAMBANG: Record<StatusProgres, string> = {
  belum: "○",
  sedang: "◐",
  selesai: "●",
};

interface Props {
  status: StatusProgres;
  /** Kamus bahasa yang sedang berlaku, untuk nama statusnya. */
  kamus: Kamus;
  /** Ukuran lambang dalam kelas Tailwind, mis. `"text-xs"`. */
  kelas?: string;
}

export function PenandaProgres({ status, kamus, kelas = "text-sm" }: Props) {
  const sebutan = kamus[`progres${namaStatus(status)}`];

  return (
    <span
      className={`${kelas} leading-none`}
      style={{ color: status === "belum" ? "var(--color-muted)" : "var(--color-accent)" }}
      role="img"
      aria-label={`${kamus.progres}: ${sebutan}`}
      title={sebutan}
    >
      {LAMBANG[status]}
    </span>
  );
}

/**
 * Nama field kamus untuk sebuah status, dalam bentuk Kapital.
 *
 * `"belum"` → `"Belum"`, sehingga kuncinya menjadi `progresBelum`. Pemetaan ini
 * menjaga hubungan antara tiga nilai `StatusProgres` dan tiga field kamusnya tetap
 * eksplisit dan diperiksa tipe: `keyof Kamus` menolak nama yang tidak ada.
 */
function namaStatus(status: StatusProgres): "Belum" | "Sedang" | "Selesai" {
  switch (status) {
    case "belum":
      return "Belum";
    case "sedang":
      return "Sedang";
    case "selesai":
      return "Selesai";
  }
}
