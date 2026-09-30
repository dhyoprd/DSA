# DSA Study Site

## Project

Situs belajar Data Structures & Algorithms pribadi. Satu pengguna, dipublikasikan, dengan backend yang menjalankan kode.

- **12 Topik**, dari Big-O sampai Graph dan DP
- **Materi dua bahasa** (Indonesia + English), istilah teknis tetap English
- **5 Kuis + 1 Soal Kode per Topik.** Kuis berbentuk skenario nyata; Soal Kode berbentuk implementasi struktur dari nol
- **Tidak ada soal bergaya LeetCode** — semua Soal dan Pembahasan ditulis original
- **Stack**: Next.js (frontend) + Rust (backend) + Tailwind, satu repo tiga folder
- **Fase 1**: satu Topik (Stack) utuh dari ujung ke ujung

Rencana lengkap, seluruh keputusan, dan risiko yang sudah ditandai ada di `docs/design-tree.md`. Baca itu sebelum mengusulkan perubahan struktural.

Kosakata proyek ada di `CONTEXT.md`. Keputusan arsitektur ada di `docs/adr/`.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues in this repo, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles using the default label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
