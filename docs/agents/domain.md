# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the project glossary. Single-context repo, so this is the only one.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.
- **`docs/design-tree.md`** — the full decision tree from the design session: every settled decision, the contradictions that were resolved, the scope numbers, and the flagged risks. Read this before proposing structural changes; a "missing" feature is often a deliberate decision recorded here.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo:

```
/
├── CONTEXT.md
├── docs/
│   ├── design-tree.md
│   └── adr/
│       ├── 0001-backend-rust-untuk-eksekusi-kode.md
│       └── ...
├── frontend/     (Next.js)
├── backend/      (Rust)
└── content/      (one YAML file per Topik)
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

Terms this project depends on: **Topik**, **Jalur**, **Materi**, **Soal**, **Kuis**, **Soal Kode**, **Pembahasan**, **Kotak Penjelasan**, **Visualisasi**, **Catatan**, **Progres**, **Eksekusi Kode**. Note that **Kuis** (auto-graded multiple choice) and **Soal Kode** (write-and-run Python) are distinct and not interchangeable.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_

This matters more than usual here. ADR-0001 and ADR-0004 record decisions whose reasons are **preference, not technical superiority** — notably choosing a Rust backend over Pyodide. A future reader will be tempted to "fix" this. Don't, without reading the ADR first and reopening it explicitly.
