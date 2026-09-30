import { BackendStatus } from "./backend-status";

/**
 * Halaman awal — kerangka statis.
 *
 * Isinya sengaja kosong dari Materi: Fase 1 membangun satu Topik (Stack) utuh
 * lewat ticket Skema Topik dan Halaman Topik. Yang ada di sini hanya bukti
 * bahwa tiga bagian repo bisa dinyalakan bersama.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <p
        className="font-mono text-xs tracking-widest uppercase"
        style={{ color: "var(--color-muted)" }}
      >
        Situs belajar DSA
      </p>

      <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
        Kerangka tiga bagian sudah menyala.
      </h1>

      <p className="text-base leading-relaxed" style={{ color: "var(--color-muted)" }}>
        Antarmuka Next.js, backend Rust, dan folder konten berjalan bersama. Materi,
        Kuis, dan Soal Kode menyusul di ticket berikutnya.
      </p>

      <BackendStatus />
    </main>
  );
}
