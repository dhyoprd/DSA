# content/

Materi dan Soal hidup di sini sebagai berkas di dalam git — bukan di database.
Keputusan dan alasannya ada di `docs/adr/0003-materi-di-git-catatan-di-database.md`.

Satu Topik = satu berkas YAML, berisi metadata + Materi (Markdown di dalam field)
+ array Soal. Dibaca saat build, dan build **akan** gagal kalau isinya tidak sah —
gerbang validasi itu belum ada, dan dibuat di ticket #3.

**Skema YAML-nya sudah ditetapkan, di issue #1** — bagian "Implementation Decisions
→ Bentuk data Materi dan Soal". Jangan mengarang skema baru; ikuti yang di sana,
supaya tidak lahir sumber kebenaran ketiga. Ringkasannya: `nomor`, `slug`,
`judul{id,en}`, `prasyarat`, `materi{id,en}` (Markdown di dalam field), dan `soal[]`
dengan `tipe: kuis | soal-kode`.

Folder ini sengaja masih kosong sampai ticket **#3 — Skema Topik + gerbang validasi
build** mengisinya.

Catatan yang ditulis dari situs **tidak** disimpan di sini. Catatan dan Progres
hidup di database backend, sesuai ADR-0003.
