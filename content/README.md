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

### Gerbang solusi referensi (ticket #10)

Aturan yang **sudah ada**: menjalankan `solusi_referensi` terhadap test case-nya
sendiri, di kontainer yang sama dengan yang dipakai situs. Aturan ini dari issue #1,
dan ia yang menangkap test case yang salah tulis — kesalahan yang tidak bisa dilihat
test HTTP mana pun, dan yang membuat pemelajar stuck pada Soal yang tidak punya
jawaban benar (risiko nomor 4 di `docs/design-tree.md`).

**Jalankan dengan perintah terpisah, sebelum commit:**

```bash
cd frontend && npm run verifikasi-soal
```

Ia **tidak** berjalan di `next dev`/`next build`: gerbang konten di `next.config.ts`
dijalankan setiap kali, dan menuntut Docker hidup di sana akan memperlambat setiap
start sekaligus membuat pengembangan Materi bergantung pada daemon Docker. Konsekuensi
yang diterima: **ini satu langkah yang bisa terlupa**, dan repo ini belum punya CI.

Perintahnya butuh image runner sudah dibangun (`docker build -t dsa-runner:lokal
runner`). Alasannya di
[`docs/adr/0022`](../docs/adr/0022-eksekusi-kode-lokal-lewat-docker.md); bentuk
runner-nya di [`runner/README.md`](../runner/README.md).

Kode gerbangnya ada di `frontend/src/lib/konten/` (`gerbang-soal.ts`, murni dan diuji)
dan `frontend/scripts/verifikasi-soal.ts` (yang memanggil Docker).

Kode gerbangnya ada di `frontend/src/lib/konten/`. Aturan isi (`periksa.ts`) murni —
ia bekerja pada nilai JavaScript biasa, jadi bisa diuji tanpa membuat berkas contoh.

## Isi saat ini

Tiga Topik sudah punya berkas, semuanya tulisan sungguhan:

| Berkas | Isi | Ticket |
|---|---|---|
| `stack.yaml` | Materi, 5 Kuis, 1 Soal Kode | #4, #6, #10 |
| `big-o.yaml` | Materi, 5 Kuis, 1 Soal Kode | #16 |
| `array-string.yaml` | Materi, 5 Kuis, 1 Soal Kode | #17 |

`stack.yaml` ditulis lebih dulu sebagai pembuktian teknis: #4 menulis Materinya, #6
menambahkan komponen serta logika penilaian Kuis-nya, dan **#10 mengganti draf Soal
Kodenya dengan Soal sungguhan** sekaligus membangun mesin Eksekusi Kode yang
menjalankannya. `big-o.yaml` (#16) adalah Topik pertama di Jalur, dan Soal Kodenya
menyimpang dari bentuk "implementasi struktur data dari nol" karena Big-O bukan
struktur data — lihat ADR-0023. `array-string.yaml` (#17) kembali memenuhi bentuk itu
apa adanya, karena array memang struktur data.

**Sembilan Topik lain belum punya berkas.** Materi dan Soal untuk kesembilan Topik itu
belum ditulis; `content/jalur.yaml` sudah mendeklarasikannya lebih dulu, sehingga
Topik yang belum punya berkas tampil redup dan berlabel "segera" di sidebar.

**Soal Kode tidak punya Pembahasan.** Skema di issue #1 tidak memberi field `penjelasan`
pada `SoalKode`, jadi tiap Topik berisi **5 Pembahasan** (satu per Kuis), bukan 6 seperti
tertulis di beberapa ticket. Itu keputusan pemilik (2026-10-06), dan berlaku untuk
ketiga berkas di atas.

Catatan yang ditulis dari situs **tidak** disimpan di sini. Catatan dan Progres
hidup di database backend, sesuai ADR-0003.

## Ekspor CSV (ticket #14)

`kompleksitas` dan `istilah` dibaca saat build dan disusun menjadi satu berkas CSV
yang bisa diimpor ke Anki apa adanya. Berkasnya disajikan statis di
`/[bahasa]/ekspor/anki` — tidak lewat backend, dan tetap bisa diunduh saat backend
mati. Penyusunnya ada di `frontend/src/lib/ekspor/`.
