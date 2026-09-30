# content/

Materi dan Soal hidup di sini sebagai berkas di dalam git — bukan di database.
Keputusan dan alasannya ada di `docs/adr/0003-materi-di-git-catatan-di-database.md`.

Dua macam berkas:

| Berkas | Isi |
|---|---|
| `jalur.yaml` | Daftar lengkap 12 Topik: `nomor`, `slug`, `judul{id,en}`, `prasyarat`. |
| `<slug>.yaml` | Satu Topik utuh: metadata + Materi (Markdown di dalam field) + array Soal. |

**`jalur.yaml` ada lebih dulu daripada berkas Topik.** Ia mendeklarasikan seluruh
Jalur, termasuk Topik yang belum ditulis, supaya `prasyarat` bisa diperiksa terhadap
daftar yang lengkap — Stack adalah Topik nomor 4 dengan `prasyarat: [3]`, padahal
Topik 3 bisa belum ada. Topik yang belum punya berkas tampil redup dan berlabel
"segera" di sidebar. Keputusan ini ada di `docs/adr/0008-jalur-manifest-di-content.md`.

`nomor`, `slug`, `judul`, dan `prasyarat` wajib sama antara `jalur.yaml` dan berkas
Topik. Build gagal kalau keduanya berbeda.

**Skema YAML-nya sudah ditetapkan, di issue #1** — bagian "Implementation Decisions
→ Bentuk data Materi dan Soal". Jangan mengarang skema baru; ikuti yang di sana,
supaya tidak lahir sumber kebenaran ketiga. Ringkasannya: `nomor`, `slug`,
`judul{id,en}`, `prasyarat`, `materi{id,en}` (Markdown di dalam field), dan `soal[]`
dengan `tipe: kuis | soal-kode`.

## Gerbang validasi

Build **gagal** kalau isinya tidak sah. Gerbangnya berjalan dari `next.config.ts`,
jadi ia aktif pada `next build` maupun `next dev` — tidak ada perintah terpisah yang
bisa terlupa. Yang diperiksa:

- Setiap Topik punya semua field wajib, terisi di kedua bahasa.
- Nomor Topik membentuk urutan tanpa lubang, dan `prasyarat` menunjuk nomor yang ada
  dan lebih kecil.
- Setiap Topik punya tepat 5 Kuis dan 1 Soal Kode.
- Setiap Kuis punya tepat satu opsi `benar: true`.
- `nomor`, `slug`, `judul`, dan `prasyarat` di berkas Topik sama dengan `jalur.yaml`.

Pesan kegagalan menyebut berkas dan lokasi masalahnya, dan **semua** masalah
dikumpulkan sekaligus — supaya beberapa kesalahan bisa diperbaiki dalam satu putaran.

Aturan yang **belum** ada: menjalankan `solusi_referensi` terhadap test case-nya
sendiri. Itu butuh mesin Eksekusi Kode yang baru dibangun di ticket #10, dan di sana
pula ia menjadi bagian gerbang ini.

Kode gerbangnya ada di `frontend/src/lib/konten/`. Aturan isi (`periksa.ts`) murni —
ia bekerja pada nilai JavaScript biasa, jadi bisa diuji tanpa membuat berkas contoh.

## Isi saat ini

`stack.yaml` masih **draf**. Tulisannya cukup untuk membuktikan rantai ujung ke ujung
(skema, gerbang, render), bukan Materi final. Ticket #4 (Halaman Topik), #6 (5 Kuis),
dan #10 (Soal Kode) menggantinya dengan isi sungguhan. Topik selain Stack belum punya
berkas.

Catatan yang ditulis dari situs **tidak** disimpan di sini. Catatan dan Progres
hidup di database backend, sesuai ADR-0003.
