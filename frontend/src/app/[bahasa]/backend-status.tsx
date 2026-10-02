"use client";

import { useEffect, useState } from "react";

import type { Kamus } from "@/lib/bahasa/kamus.ts";
import { getHealth, type HealthResponse } from "@/lib/api";

type Status =
  | { kind: "memuat" }
  | { kind: "hidup"; data: HealthResponse }
  | { kind: "mati"; pesan: string };

/**
 * Komponen kecil yang membuktikan antarmuka dan backend bisa saling bicara.
 *
 * Sengaja terpisah dari halaman: halaman tetap statis dan bisa dibaca walaupun
 * backend mati, sedangkan status backend dimuat dari browser setelah halaman tampil.
 *
 * Teksnya diterima lewat `kamus` (ticket #12), bukan ditulis di sini, supaya kalimat
 * yang sama punya satu tempat di kedua bahasa.
 */

interface Props {
  /** Kamus bahasa yang sedang berlaku. */
  kamus: Kamus;
}

export function BackendStatus({ kamus }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "memuat" });

  useEffect(() => {
    let masihDipakai = true;

    getHealth(kamus)
      .then((data) => {
        if (masihDipakai) setStatus({ kind: "hidup", data });
      })
      .catch((error: unknown) => {
        if (!masihDipakai) return;
        const pesan = error instanceof Error ? error.message : kamus.galatBackendMati;
        setStatus({ kind: "mati", pesan });
      });

    return () => {
      masihDipakai = false;
    };
  }, [kamus]);

  return (
    <div
      className="rounded-lg border px-4 py-3 font-mono text-sm"
      style={{ borderColor: "var(--color-border)" }}
      aria-live="polite"
    >
      <span style={{ color: "var(--color-muted)" }}>{kamus.backend}: </span>
      {status.kind === "memuat" && <span>{kamus.backendBekerja}</span>}
      {status.kind === "hidup" && (
        <span style={{ color: "var(--color-accent)" }}>
          {status.data.status} · {status.data.service}
        </span>
      )}
      {status.kind === "mati" && (
        <span style={{ color: "var(--color-accent)" }}>
          {kamus.backendMati} ({status.pesan})
        </span>
      )}
    </div>
  );
}
