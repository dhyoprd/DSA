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

**Dua field tambahan dari ticket #14**: `kompleksitas` dan `istilah`. Keduanya
sumber terstruktur untuk ekspor CSV yang bisa diimpor ke Anki. Bentuknya:

```yaml
kompleksitas:
  - struktur: { id: Stack (array), en: Stack (array) }
    ruang: O(n)
    operasi:
      - nama: { id: Tambah elemen (push), en: Add element (push) }
        waktu: O(1)
istilah:
  - istilah: { id: Tumpukan, en: Stack }
    definisi:
      id: Struktur yang menambah dan mengambil dari ujung yang sama…
      en: A structure that adds and removes from the same end…
```

Perubahan skema ini **tidak** ada di issue #1 (yang sudah dibekukan) dan karena itu
butuh keputusan tersendiri — lihat `docs/adr/0019-field-kompleksitas-istilah-dan-ekspor-csv.md`.
Alasannya: tabel kompleksitas sudah ada di dalam prosa Materi, tetapi bentuknya untuk
dibaca manusia; mengurainya saat build akan rapuh, dan definisi istilah tidak punya
sumber sama sekali. `waktu`/`ruang` memakai notasi O(...) apa adanya karena notasinya
sama di kedua bahasa.

`kompleksitas` dan `istilah` **wajib**. Membiarkannya opsional akan membuat CSV
kehilangan baris diam-diam begitu Topik kedua ditulis dengan bentuk yang berbeda.

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
- Setiap Topik punya `kompleksitas` (minimal satu struktur, tiap struktur minimal satu
  operasi, `ruang` dan `waktu` terisi) dan `istilah` (minimal satu, dwibahasa lengkap).

Pesan kegagalan menyebut berkas dan lokasi masalahnya, dan **semua** masalah
dikumpulkan sekaligus — supaya beberapa kesalahan bisa diperbaiki dalam satu putaran.

Aturan yang **belum** ada: menjalankan `solusi_referensi` terhadap test case-nya
sendiri. Itu butuh mesin Eksekusi Kode yang baru dibangun di ticket #10, dan di sana
pula ia menjadi bagian gerbang ini.

Kode gerbangnya ada di `frontend/src/lib/konten/`. Aturan isi (`periksa.ts`) murni —
ia bekerja pada nilai JavaScript biasa, jadi bisa diuji tanpa membuat berkas contoh.

## Isi saat ini

Materi dan kelima Kuis `stack.yaml` sudah tulisan sungguhan — ticket #4 menulis
Materinya, dan ticket #6 menambahkan komponen serta logika penilaian Kuis-nya. Yang
masih **draf** tinggal Soal Kodenya; ticket #10 menggantinya. Topik selain Stack
belum punya berkas.

Catatan yang ditulis dari situs **tidak** disimpan di sini. Catatan dan Progres
hidup di database backend, sesuai ADR-0003.

## Ekspor CSV (ticket #14)

`kompleksitas` dan `istilah` dibaca saat build dan disusun menjadi satu berkas CSV
yang bisa diimpor ke Anki apa adanya. Berkasnya disajikan statis di
`/[bahasa]/ekspor/anki` — tidak lewat backend, dan tetap bisa diunduh saat backend
mati. Penyusunnya ada di `frontend/src/lib/ekspor/`.
