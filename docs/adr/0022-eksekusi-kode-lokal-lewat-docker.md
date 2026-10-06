# Eksekusi Kode di lokal lewat kontainer sekali pakai, bukan proses Python langsung

## Status

accepted — **menyimpang sadar dari `docs/design-tree.md` Cabang 2.** Bagian
"Koreksi" di bawah mencatat apa yang berubah dan mengapa.

## Konteks

Ticket #10 membangun Eksekusi Kode dan satu Soal Kode Stack. Dua dokumen yang sudah
ada saling bertentangan tentang cara menjalankannya:

1. `docs/design-tree.md:40` dan `:42` menetapkan: **"Di lokal, runner dijalankan
   langsung sebagai proses Python dengan batas waktu — tanpa sandbox, karena kode
   yang dijalankan adalah kode sendiri"**, dan **"Eksekusi kode di lokal tidak lewat
   Docker."** Alasan yang tertulis di sana: kode yang dijalankan adalah kode sendiri.
2. Issue #1, bagian "Gerbang validasi", menetapkan hal lain untuk **gerbang build**:
   setiap Soal Kode punya `solusi_referensi` yang "lulus semua test case-nya sendiri,
   **dijalankan di container yang sama dengan yang dipakai situs**". `content/README.md`
   mengulang hal yang sama.

Poin 2 menunjukkan bahwa penulis issue #1 sudah membayangkan ada **container** yang
dipakai situs. Itu bertentangan dengan poin 1 — dan pertentangan ini tidak pernah
diselesaikan di dokumen mana pun sebelum ticket ini.

Ticket #10 sendiri, di kriteria penerimaannya, menulis: "Di lokal, runner dijalankan
tanpa sandbox; di produksi, lewat Machine sekali pakai." Kalimat itu **tidak**
menyebut Docker, jadi ia tidak menyelesaikan pertentangan di atas — ia hanya
mengulang poin 1.

## Keputusan

**Eksekusi Kode di lokal menjalankan runner di dalam kontainer sekali pakai**,
memakai image `runner/` yang dibangun dari `python:3.13-slim`, dengan batas-batas yang
dinyatakan lewat argumen `docker run`.

Yang **tidak** berubah dari `design-tree.md`: di produksi, runner tetap dijalankan
sebagai **Machine Firecracker sekali pakai** per submission (ADR-0007), bukan sebagai
kontainer. Kontainer ini jalur **lokal**, dan ia menempati posisi yang sama dengan
Machine itu: satu eksekusi, satu lingkungan sekali pakai, dibuang sesudahnya.

Batas yang ditegakkan di lokal:

| Batas | Angka | Cara |
|---|---|---|
| Waktu | 5 detik | Backend menghancurkan kontainer (`docker kill`). |
| Memori | 256 MB | `--memory` dan `--memory-swap` sama besar. |
| CPU | 1 | `--cpus 1`. |
| Ukuran kode | 16 KB | Diperiksa backend **sebelum** kontainer dibuat. |
| Jumlah test case | 32 | Diperiksa backend sebelum kontainer dibuat. |
| Jaringan | ditolak total | `--network none`. |
| Filesystem | hanya `/tmp` | `--read-only` + `--tmpfs /tmp:noexec`. |
| Hak proses | non-root, tanpa capability | `USER pemelajar`, `--cap-drop ALL`, `no-new-privileges`. |
| Jumlah proses | 64 | `--pids-limit 64`. |
| Laju | 30 per 60 detik | Dihitung backend, per proses. |

Pencatatan setiap eksekusi (ADR-0002) dilakukan backend: status, jumlah kasus lulus,
dan lama eksekusi. **Kode pemelajar tidak dicatat** — ia tulisan pribadi, dan
menyalinnya ke log berarti menyimpan bahan yang tidak dibutuhkan.

## Alasan

**Pemilik proyek memilihnya, setelah ditanya.** Bentuk dan teknologi ditanyakan lebih
dulu karena ticket hanya menetapkan perilaku, bukan bentuk — pola yang sama dengan
ticket #15. Jawabannya: kontainer, dan semua batas tambahan (memori, jumlah test case,
pencatatan, batas laju) ditegakkan, dengan batas waktu 5 detik.

**Issue #1 sudah mengandaikan container yang sama dipakai situs dan gerbang.** Kalau
lokal memakai proses Python langsung sedangkan gerbang memakai container, keduanya
akan menilai test case dengan lingkungan yang berbeda — dan perbedaan yang paling
berbahaya ada di versi Python serta perilaku pustaka standarnya. Gerbang yang hijau di
satu lingkungan lalu merah di lingkungan lain adalah gerbang yang tidak dipercaya.

**Satu jalur eksekusi berarti satu tempat batasnya dinyatakan.** Kalau lokal dan
gerbang memakai dua mekanisme berbeda, batasnya juga dua daftar yang bisa menyimpang.
Dengan satu image, ada satu daftar argumen — dan daftar itu sekarang hidup di
`runner/perintah-docker.json`, dipakai bersama backend Rust dan skrip gerbang.

**Batas waktu ditegakkan dengan menghancurkan kontainer, bukan oleh runner.** Ini
sekaligus menyamakan bentuk lokal dengan produksi, yang memang begitu: `design-tree.md`
mencatat bahwa batas 5 detik tidak punya field di platform Fly, dan "batas waktu harus
ditegakkan runner sendiri, dengan penghentian Machine oleh backend sebagai jaring
pengaman". Di lokal, "Machine" itu kontainernya.

## Koreksi terhadap dokumen sebelumnya

| Klaim sebelumnya | Koreksi |
|---|---|
| "Di lokal, runner dijalankan langsung sebagai proses Python dengan batas waktu — tanpa sandbox, karena kode yang dijalankan adalah kode sendiri." — `design-tree.md:40` | **Diganti.** Runner dijalankan di kontainer sekali pakai. Alasan lamanya ("kode sendiri") tidak lagi berlaku begitu situs **dipublikasikan** — dan situs ini memang dipublikasikan (ADR-0002). Endpoint eksekusi karena itu juga diletakkan **di belakang token**, bukan publik. |
| "Eksekusi kode di lokal tidak lewat Docker." — `design-tree.md:42` | **Diganti.** Justru lewat Docker. |
| "Di lokal, runner dijalankan tanpa sandbox; di produksi, lewat Machine sekali pakai." — kriteria penerimaan #10 | **Ditafsirkan ulang, bukan dibatalkan.** "Tanpa sandbox" dibaca sebagai "tanpa Machine Firecracker" — batas microVM-nya memang tidak ada di lokal. Yang menggantikannya adalah batas kontainer di tabel di atas, yang menegakkan hal serupa dengan cara yang tersedia di mesin lokal. |

`docs/design-tree.md` **tidak dihapus**; ia diperbarui dengan penunjuk ke ADR ini, dan
kalimat lamanya dibiarkan terlihat sebagai catatan sejarah — pola yang sama dengan
koreksi-koreksi sebelumnya di berkas itu.

## Konsekuensi

**Backend membutuhkan Docker hidup.** Kalau daemon Docker mati, Eksekusi Kode gagal
dengan pesan yang jelas ("tidak bisa menjalankan Docker"), sementara seluruh fitur lain
— Materi, Kuis, Catatan, Pencarian, Ekspor — tetap bekerja. Materi tetap terbaca
walaupun backend mati (ADR-0003).

**Image runner harus dibangun sebelum dipakai.** `docker build -t dsa-runner:lokal
runner`. Tanpa itu, setiap permintaan eksekusi gagal. Ini langkah manual yang dicatat
di `runner/README.md`, `.env.example`, dan di sini.

**Di Docker Compose, backend memerlukan socket Docker dan klien `docker`.** Socket
`/var/run/docker.sock` dipasang, dan `backend/Dockerfile` memasang `docker.io` (klien
saja, bukan daemon). Ini memberi backend hak yang besar di mesin host — konsekuensi
yang **diterima sadar untuk pengembangan lokal**, dan tidak berlaku di produksi (di
sana runner adalah Machine, bukan kontainer lokal).

**Menjalankan Docker dari dalam container adalah pemakaian yang canggung**, dan itu
diakui. Alternatifnya — menjalankan backend langsung di host saat pengembangan — tidak
memakai socket sama sekali, dan itu jalur yang dipakai saat memverifikasi ticket ini.

**Gerbang "solusi referensi lulus" adalah perintah terpisah**, bukan bagian
`next build`. Gerbang konten berjalan pada setiap `next dev` dan `next build`
(`next.config.ts`), dan menjalankan Docker di sana berarti setiap pengetikan ulang
berkas Materi menuntut Docker hidup dan menambah detik ke setiap start. Perintahnya:
`cd frontend && npm run verifikasi-soal`.

Konsekuensinya jujur: **ini satu langkah yang bisa terlupa.** Repo ini belum punya CI,
jadi pengingatnya hanya ada di `content/README.md` dan di sini — tidak ditegakkan
mesin. Itu diterima untuk sekarang; kalau nanti ada CI, perintah ini yang dijalankan
di sana.

**Kode pemelajar ikut terkirim di payload halaman.** `test_case` — termasuk
`solusi_referensi` — sudah ada di HTML statis setiap Topik (ADR-0003), dan permintaan
eksekusi membawa `test_case` itu kembali ke backend. Itu **disengaja**: menyembunyikan
test case dari backend tidak menambah kerahasiaan apa pun yang belum hilang di halaman,
dengan alasan yang sama seperti ADR-0014 untuk Pembahasan. Yang dijaga backend bukan
rahasia test case-nya, melainkan bahwa kode pemelajar tidak keluar dari kotaknya.

## Alternatif yang ditolak

**Proses Python langsung di host (jalur yang tertulis di `design-tree.md`).** Ini yang
paling sederhana dan paling cepat: tidak ada image, tidak ada socket, tidak ada build.
Ditolak karena tiga hal. Pertama, pemilik memilih kontainer setelah ditanya. Kedua, ia
tidak bisa memberi batas memori dan CPU yang andal tanpa sandbox — dan pemilik meminta
keduanya ditegakkan. Ketiga, ia membuat lingkungan lokal berbeda dari lingkungan
gerbang, sehingga gerbang yang hijau tidak membuktikan apa pun tentang situs.

**Menjalankan gerbang solusi referensi di dalam `next build`.** Paling setia pada
`content/README.md` yang bilang pemeriksaan itu "menjadi bagian gerbang ini". Ditolak
karena `next.config.ts` berjalan pada **setiap** `next dev`, dan menuntut Docker hidup
di sana akan memperlambat setiap start sekaligus membuat pengembangan Materi bergantung
pada daemon Docker. Keputusan pemilik: perintah terpisah.

**Menyimpan hasil eksekusi ke database sebagai riwayat.** Dipertimbangkan, dan
ditolak: tidak ada ticket yang memintanya, dan Progres untuk Soal Kode sudah punya
tempatnya sendiri (`POST /api/progres/:slug/:indeks`). Menambah tabel riwayat eksekusi
akan menjadi sumber kebenaran kedua untuk hal yang mirip.

**Batas memori lewat `ulimit` di dalam runner, bukan `--memory`.** Ditolak karena
`--memory` sudah ditegakkan kernel dan terverifikasi bekerja saat membangun ticket ini
(alokasi 600 MB di bawah batas 256 MB membuat kontainer mati dengan kode keluar 137).
Menambahkan lapisan kedua hanya menambah yang harus diuji.

## Sumber

- `docs/design-tree.md` Cabang 2 — "Di lokal, runner dijalankan langsung sebagai proses
  Python dengan batas waktu — tanpa sandbox" dan "Eksekusi kode di lokal tidak lewat
  Docker" (keduanya dikoreksi di sini).
- Issue #1, "Gerbang validasi Materi saat build" — "Setiap Soal Kode punya
  `solusi_referensi` yang lulus semua test case-nya sendiri, dijalankan di container
  yang sama dengan yang dipakai situs."
- Issue #10, "Acceptance criteria" — "Di lokal, runner dijalankan tanpa sandbox; di
  produksi, lewat Machine sekali pakai"; "Kode yang berjalan terlalu lama dihentikan,
  dan backend tetap melayani permintaan berikutnya"; "Pesan timeout jelas berbeda dari
  pesan kesalahan sintaks"; "Kode yang melebihi batas ukuran ditolak".
- `docs/adr/0002-eksekusi-kode-publik-risiko-diterima.md` — mitigasi wajib: egress
  ditolak, batas laju, pencatatan, batas ukuran, batas waktu, batas resource, non-root.
- `docs/adr/0007-eksekusi-satu-machine-per-submission.md` dan
  `docs/adr/0015-pengambilan-hasil-lewat-exec-endpoint.md` — bentuk produksi, yang
  tetap berlaku.
- Docker CLI reference, `docker run` — `--network`, `--memory`, `--memory-swap`,
  `--cpus`, `--pids-limit`, `--read-only`, `--tmpfs`, `--cap-drop`,
  `--security-opt`, `--rm`, `--name`.
  <https://docs.docker.com/reference/cli/docker/container/run/>
- Dokumentasi Tokio, `tokio::process::Command` dan `tokio::time::timeout` — menjalankan
  proses anak, membaca pipa stdout/stderr, dan batas waktunya.
  <https://docs.rs/tokio/latest/tokio/process/struct.Command.html>
  <https://docs.rs/tokio/latest/tokio/time/fn.timeout.html>
- **Verifikasi empiris sesi ini** (Docker 29.7.2 di Windows, `python:3.13-slim`):
  proses berjalan sebagai uid 999 (non-root); `socket.create_connection` ke 1.1.1.1:53
  gagal `OSError` (`--network none` bekerja); menulis di luar `/tmp` gagal
  (`--read-only` bekerja); alokasi 600 MB mati dengan kode keluar 137 (batas memori
  bekerja); kode yang berputar selamanya berhenti setelah 5 detik, kontainernya hilang
  dari `docker ps -a`, dan permintaan berikutnya berhasil.
