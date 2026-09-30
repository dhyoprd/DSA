"use client";

import { useEffect, useState } from "react";

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
 */
export function BackendStatus() {
  const [status, setStatus] = useState<Status>({ kind: "memuat" });

  useEffect(() => {
    let masihDipakai = true;

    getHealth()
      .then((data) => {
        if (masihDipakai) setStatus({ kind: "hidup", data });
      })
      .catch((error: unknown) => {
        if (!masihDipakai) return;
        const pesan = error instanceof Error ? error.message : "tidak diketahui";
        setStatus({ kind: "mati", pesan });
      });

    return () => {
      masihDipakai = false;
    };
  }, []);

  return (
    <div
      className="rounded-lg border px-4 py-3 font-mono text-sm"
      style={{ borderColor: "var(--color-border)" }}
      aria-live="polite"
    >
      <span style={{ color: "var(--color-muted)" }}>backend: </span>
      {status.kind === "memuat" && <span>bekerja…</span>}
      {status.kind === "hidup" && (
        <span style={{ color: "var(--color-accent)" }}>
          {status.data.status} · {status.data.service}
        </span>
      )}
      {status.kind === "mati" && (
        <span style={{ color: "var(--color-accent)" }}>mati ({status.pesan})</span>
      )}
    </div>
  );
}
