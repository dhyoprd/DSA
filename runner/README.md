# runner/

Image yang menjalankan kode Python pemelajar. Satu kontainer sekali pakai per
Eksekusi Kode, tanpa jaringan, tanpa hak tulis ke filesystem, dan sebagai pengguna
bukan-root.

Keputusan dan alasannya ada di
[`docs/adr/0022-eksekusi-kode-lokal-lewat-docker.md`](../docs/adr/0022-eksekusi-kode-lokal-lewat-docker.md).

## Isi

| Berkas | Isi |
|---|---|
| `Dockerfile` | Image `python:3.13-slim` + `runner.py`, berjalan sebagai `pemelajar`. |
| `runner.py` | Protokol: pekerjaan JSON di stdin, balasan JSON di stdout. |
| `perintah-docker.json` | **Satu-satunya sumber** argumen `docker run` (batas keamanan). |

## Membangun image

```bash
docker build -t dsa-runner:lokal runner
```

Backend memakai nama image itu secara bawaan. Untuk menggantinya, setel
`RUNNER_IMAGE` di environment backend (dan di `.env` untuk Docker Compose).

**Image harus dibangun sebelum backend dipakai menjalankan kode.** Tanpa itu setiap
permintaan eksekusi gagal dengan pesan "tidak bisa menjalankan Docker", dan itu
memang pesan yang jujur — bukan kode pemelajar yang salah.

## Protokol

```jsonc
// stdin
{ "kode": "…", "fungsi": "proses", "test_case": [ { "argumen": [ … ], "diharapkan": … } ] }

// stdout (satu baris)
{
  "status": "ok",          // ok | galat-sintaks | galat-jalan | galat-runner | galat-protokol
  "kasus": [
    { "indeks": 0, "argumen": …, "diharapkan": …, "hasil": …,
      "lulus": true, "galat": null, "keluaran": "" }
  ],
  "keluaran": "",          // yang dicetak pemelajar di tingkat modul
  "pesan": null
}
```

`lewat-waktu` **tidak** dihasilkan runner. Batas waktu ditegakkan backend dengan
menghancurkan kontainernya, karena proses Python yang berputar tanpa henti tidak bisa
menghentikan dirinya sendiri dengan andal.

## Kenapa argumennya di `perintah-docker.json`

Dua pihak menyusun perintah `docker run`: backend Rust
(`backend/src/eksekusi/perintah.rs`) dan gerbang `npm run verifikasi-soal`
(`frontend/scripts/verifikasi-soal.ts`). Sebelumnya keduanya menulis daftar argumennya
sendiri, dan itu berarti batas keamanannya bisa menyimpang tanpa ketahuan — gejalanya
bukan error, melainkan batas yang diam-diam tidak berlaku.

Sekarang berkas itu satu-satunya sumbernya. Uji di `perintah.rs` menjaga **berkas
JSON**-nya, jadi menghapus satu flag akan menggagalkan uji, bukan diam-diam melemahkan
isolasi.

## Batas yang ditegakkan

| Flag | Batas |
|---|---|
| `--network none` | Tidak ada jaringan — mitigasi terpenting (ADR-0002). |
| `--memory 256m` + `--memory-swap 256m` | Memori dibatasi, tanpa jalan keluar lewat swap. |
| `--cpus 1` | Batas CPU. |
| `--pids-limit 64` | Mencegah fork bomb. |
| `--read-only` + `--tmpfs /tmp` | Filesystem tidak bisa ditulis; `/tmp` dibatasi dan `noexec`. |
| `--cap-drop ALL` | Tanpa capability. |
| `--security-opt no-new-privileges` | Tidak bisa menaikkan hak. |
| `--rm` | Kontainer dibuang; tidak ada keadaan yang diwariskan submission berikutnya. |
| `USER pemelajar` (di image) | Proses berjalan sebagai non-root. |

**Batas 5 detik tidak ada di sini** — ia ditegakkan backend dengan `docker kill`.
Membunuh proses `docker run` saja tidak cukup: kontainer tetap hidup dan terus memakai
CPU.

## Menguji runner

Uji perilakunya ada di `$TEMP` (di luar repo, sesuai aturan repo ini). Yang diperiksa:
solusi benar lulus, galat sintaks terdeteksi, `print` pemelajar tidak merusak protokol,
`bool` dibedakan dari `1`, `int` sama dengan `float`, galat satu kasus tidak
menghentikan kasus lain, dan keluaran panjang dipotong.

Gerbang `npm run verifikasi-soal` adalah uji integrasi runner yang sesungguhnya: ia
menjalankan solusi referensi Soal sungguhan lewat kontainer yang sama dengan situs.
