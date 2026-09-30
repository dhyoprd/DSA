import type { StatusProgres } from "@/lib/konten/tipe.ts";

/**
 * Penanda Progres sebuah Topik: ○ belum, ◐ sedang, ● selesai.
 *
 * Bentuk simbolnya ditetapkan di `docs/design-tree.md`. Lambangnya sendiri tidak
 * terbaca mesin pembaca layar, jadi teksnya selalu disertakan sebagai
 * `aria-label` + `title`, dan lambangnya disembunyikan dari accessibility tree.
 * Tanpa itu, tiga status berbeda terdengar sama saja.
 *
 * Progres belum punya sumber data: endpoint-nya dibangun di ticket #7 dan disambung
 * ke tampilan di ticket #8. Sampai saat itu pemanggil memberi `"belum"`, dan
 * komponen ini tidak perlu berubah saat datanya tiba.
 */

/** Lambang untuk setiap status. Urutannya tetap: belum → sedang → selesai. */
const LAMBANG: Record<StatusProgres, string> = {
  belum: "○",
  sedang: "◐",
  selesai: "●",
};

/** Nama status dalam bahasa Indonesia, untuk `aria-label` dan `title`. */
const SEBUTAN: Record<StatusProgres, string> = {
  belum: "Belum dikerjakan",
  sedang: "Sedang dikerjakan",
  selesai: "Selesai",
};

interface Props {
  status: StatusProgres;
  /** Ukuran lambang dalam kelas Tailwind, mis. `"text-xs"`. */
  kelas?: string;
}

export function PenandaProgres({ status, kelas = "text-sm" }: Props) {
  return (
    <span
      className={`${kelas} leading-none`}
      style={{ color: status === "belum" ? "var(--color-muted)" : "var(--color-accent)" }}
      role="img"
      aria-label={`Progres: ${SEBUTAN[status]}`}
      title={SEBUTAN[status]}
    >
      {LAMBANG[status]}
    </span>
  );
}
