# Design Tree — DSA Study Site

Hasil sesi grilling. Setiap keputusan di bawah sudah dipilih sadar, bukan diasumsikan. Format: keputusan → alasan singkat.

## Akar

**Apa yang dibangun**: Situs belajar DSA pribadi berisi Materi dan Soal, dipublikasikan, dengan backend yang menjalankan kode.
**Kriteria sukses, berurutan**: (1) paham konsep & bisa jelaskan, (2) catatan enak dibaca ulang, (3) bisa kerjakan soal sendiri.
**Titik awal**: pernah dikit / vibe coding — belum paham kode yang dihasilkan.
**Bahasa**: Materi dua bahasa lengkap (Indonesia + English). UI dengan pengalih bahasa. Istilah teknis tetap English.

## Cabang 1 — Isi

**Cakupan**: 12 Topik, sampai Tree/Graph/DP.
**Urutan belajar (Jalur)**: Big-O → Array & String → Linked List → Stack & Queue → Hash Table → Rekursi → Sorting → Binary Search → Tree & BST → Heap → Graph → DP.
**Urutan membangun**: Stack lebih dulu (posisi 4), sebagai pembuktian teknis. Dua urutan ini sengaja berbeda.
**Topik kosong di sidebar**: ditampilkan redup dan tidak bisa diklik, label "segera".
**Komposisi per Topik**: 5 Kuis + 1 Soal Kode.
**Bentuk Kuis**: skenario nyata, sebagian menampilkan kode untuk ditebak outputnya.
**Bentuk Soal Kode**: implementasi struktur data dari nol, diuji test case otomatis.
> **DIKOREKSI ticket #16 (2026-10-06).** Untuk Topik **Big-O** — yang bukan struktur
> data — bentuk ini tidak bisa dipakai apa adanya. Soal Kodenya menjadi **menulis dua
> pencarian dari nol dan mengembalikan jumlah langkah**, sehingga perbedaan O(n) dan
> O(log n) terasa sebagai angka. Bentuk "implementasi struktur data dari nol" tetap
> berlaku untuk Topik yang memang punya struktur. Lihat
> [ADR-0023](adr/0023-bentuk-soal-kode-big-o-dan-kompleksitas-algoritma.md).
**Batas keras**: tidak ada soal bergaya LeetCode. Semua Soal dan Pembahasan ditulis original. Soal LeetCode boleh ditautkan, tidak boleh disalin.
**Pembahasan**: penuh, tersembunyi, terbuka setelah jawaban benar. Berisi pendekatan, kompleksitas, kode referensi, jebakan umum.
**Kotak Penjelasan**: ada. Kamu menulis alasan dengan kata sendiri, tidak dinilai otomatis, lalu membandingkan dengan penjelasan referensi.
**Jawaban salah**: boleh coba lagi sampai benar. Pembahasan hanya terbuka setelah benar.
**Sumber konten**: adaptasi konten open-license (Open Data Structures CC BY 2.5 Canada, pythonds/CS50/CPH/CSES CC BY-NC-SA 4.0, kode Python CLRS MIT) + catatan sendiri.
**Pembagian kerja**: AI menulis Materi, Soal, dan Pembahasan. Kamu menulis Catatan.
**Alur produksi**: satu Topik tuntas → kamu review → baru lanjut Topik berikutnya.

## Cabang 2 — Arsitektur

**Repo**: satu repo, tiga folder — `frontend/`, `backend/`, `content/`.
**Frontend**: Next.js.
**Backend**: Rust.
**Styling**: Tailwind + CSS custom properties.
**Penyimpanan konten**: satu file YAML per Topik, berisi metadata + Materi (Markdown dalam field) + array Soal. Dibaca saat build.
**Penyimpanan Catatan**: database backend, bukan YAML. Tombol export ke Markdown wajib ada.
**Penyimpanan Progres**: database backend.
**Penyimpanan Kotak Penjelasan**: database backend.
**Autentikasi**: satu token rahasia di environment. Tanpa akun, tanpa halaman login.
**Eksekusi Kode**: backend Rust membuat satu Machine Firecracker sekali pakai per submission (di produksi). Di lokal, runner dijalankan langsung sebagai proses Python dengan batas waktu — tanpa sandbox, karena kode yang dijalankan adalah kode sendiri.
> **DIKOREKSI ticket #10 (2026-10-06).** Kalimat di atas **diganti**: di lokal, runner
> sekarang dijalankan di **kontainer sekali pakai**, bukan proses Python langsung —
> dan endpoint eksekusi diletakkan di belakang token, bukan publik. Alasan lamanya
> ("kode sendiri") tidak lagi berlaku begitu situs dipublikasikan (ADR-0002). Bentuk
> produksinya tetap Machine Firecracker. Lihat
> [ADR-0022](adr/0022-eksekusi-kode-lokal-lewat-docker.md).
**Deploy**: frontend ke Vercel, backend ke Fly.io.
**Dev loop**: Docker Compose untuk Next.js dan backend Rust. Eksekusi kode di lokal tidak lewat Docker.
> **DIKOREKSI ticket #10 (2026-10-06).** Kalimat terakhir **diganti**: eksekusi kode di
> lokal **justru lewat Docker**. Lihat
> [ADR-0022](adr/0022-eksekusi-kode-lokal-lewat-docker.md).
**Testing**: validasi konten saat build + integrasi API di batas backend. Tanpa unit test UI.

## Cabang 3 — Keamanan (risiko diterima sadar)

> **Dikoreksi setelah verifikasi 2026-09-30.** Versi pertama cabang ini menyebut gVisor sebagai runtime Docker di Fly.io. Itu **tidak bisa dijalankan** — lihat bagian Koreksi di bawah.

**Status**: situs publik + backend menjalankan kode arbitrary. Pengguna sudah diperingatkan dan memilih melanjutkan.
**Mekanisme**: satu Machine Firecracker sekali pakai per submission. Setiap submission mendapat kernel Linux sendiri, jadi batas isolasinya lebih kuat daripada Docker dengan gVisor.
**Wajib ada**: egress ditolak total lewat Network Policy, batas laju per IP, pencatatan setiap eksekusi, batas ukuran kode, batas waktu yang menghancurkan Machine, batas memori/CPU lewat `guest`, user non-root.
**Batas eksekusi**: 5 detik, **256 MB, 1 shared CPU** (minimum yang dapat dinyatakan Fly; batas lama 128 MB / 0,5 CPU core tidak dapat dinyatakan — lihat ADR-0015). Ini angka yang **dikonfigurasi**, bukan angka yang sudah terverifikasi ditegakkan: batas 5 detik tidak punya field di platform, dan penegakan memori belum diuji.
**Backend Rust dan runner wajib di Machine BERBEDA.** Kalau digabung, keduanya berbagi kernel dan batas microVM melindungi host, bukan backend.
**Konsekuensi yang diterima**: mesin ini tidak boleh menyimpan apa pun yang berharga. Backend yang dikompromikan bisa dipakai menyerang pihak ketiga.
**Risiko kebijakan yang tidak hilang**: Fly's AUP melarang cryptomining dan security testing, dan ToS-nya membatasi pemakaian untuk "internal use". Mitigasi mengurangi kemungkinan, bukan menghilangkan kemungkinan akun ditangguhkan.
**Pengambilan hasil**: **keputusannya sudah diambil** — lewat `POST /v1/apps/{app}/machines/{id}/exec`. Lihat ADR-0015. Blocker lama ("tidak ada endpoint exec terdokumentasi") **dibatalkan**. Yang **BELUM**: verifikasi empirisnya (hasil benar-benar kembali, batas resource, non-root, blokir jaringan). Ticket #9 tetap terbuka sampai itu diuji — lihat "Yang belum terverifikasi" di ADR-0015.

## Koreksi setelah verifikasi (2026-09-30)

Verifikasi terhadap sumber primer membatalkan dua klaim di versi pertama dokumen ini:

| Klaim awal | Koreksi |
|---|---|
| gVisor dipasang sebagai runtime Docker di Fly (`docker run --runtime=runsc`) | **Salah.** Fly tidak punya host Docker daemon; field `runtime` tidak ada di skema MachineConfig; gVisor tidak muncul di dokumentasi Fly. Satu-satunya percobaan terdokumentasi gagal pada konfigurasi cgroup. |
| Firecracker adalah "proyek infrastruktur tersendiri" | **Salah.** Di Fly.io Firecracker adalah default platform — setiap Machine sudah berupa microVM. "Satu Machine per submission" memakai fitur bawaan. |
| Batas resource lewat flag Docker (`--cpus`, `--memory`) | **Salah di Fly.** Batas CPU terbukti gagal pada nested container karena ketidakcocokan cgroup v1/v2. Batas resource dipindah ke objek `guest`. |
| `--cap-drop=ALL`, `--security-opt no-new-privileges`, `--read-only` | **Tidak punya padanan langsung** di model konfigurasi Fly. Sebagian tercakup oleh batas microVM, tidak bisa dikonfigurasi terpisah. |

Keputusan yang **selamat tanpa perubahan**: backend Rust tetap ada (Progres dan Catatan memang butuh server), target deploy Fly.io tetap, dan penolakan Pyodide tetap berlaku sebagai preferensi.

## Koreksi setelah verifikasi (2026-10-01)

Ticket #9 memeriksa ulang sisa blocker di Cabang 3 dan membatalkan dua klaim lagi.
**Tabel koreksinya ada di [ADR-0015](adr/0015-pengambilan-hasil-lewat-exec-endpoint.md),
bukan di sini** — supaya tidak ada dua salinan yang bisa saling menyimpang. Ringkasnya:
klaim "tidak ada endpoint exec" salah (endpoint-nya ada, sejak Januari 2023), dan batas
128 MB / 0,5 CPU tidak dapat dinyatakan di Fly (diganti 256 MB / 1 shared CPU).

Yang **dikonfirmasi** (bukan dikoreksi): keraguan atas batas CPU sudah dijawab dengan
benar oleh dokumen ini sejak awal — yang rusak adalah batas pada **nested container**,
dan pada level VM Fly memang menegakkan batas CPU lewat cgroup CFS quota.

**Catatan yang tetap berlaku**: batas 5 detik **tidak** punya padanan field di platform; `auto_destroy` bekerja setelah proses selesai, bukan sebagai umur maksimum. Batas waktu harus ditegakkan runner sendiri, dengan penghentian Machine oleh backend sebagai jaring pengaman.

## Cabang 4 — Antarmuka

**Gaya**: Swiss / International Typographic Style.
**Font**: Inter.
**Aksen**: merah `#e0342b`.
**Tema**: dua mode (terang + gelap) dengan pengalih, default mengikuti sistem.
**Layout**: sidebar kiri (12 Topik + penanda progres) + konten tengah + daftar isi kanan.
**Perangkat**: laptop dan HP sama penting. Semua komponen harus nyaman di keduanya.
**Progres visual**: ○ belum, ◐ sedang, ● selesai.
**Bahasa**: segmen pertama URL (`/[bahasa]/...`), pilihan diingat lewat cookie, permintaan
tanpa bahasa dialihkan `proxy.ts`. Materi tetap halaman statis per bahasa. Lihat
[ADR-0016](adr/0016-bahasa-di-url-pilihan-di-cookie.md).

## Cabang 5 — Fitur

**Fase 1 (rantai Stack, urutan pengerjaan)**:
1. Rantai inti: Materi + 5 Kuis + 1 Soal Kode + Pembahasan + Progres + Kotak Penjelasan + token + pengalih bahasa.
2. Pencarian.
3. Export ke Anki.
4. Editor Catatan di situs.

**Status rantai inti per 2026-10-06** (ticket #10): Materi (#4), Kuis (#6), Progres
(#7, backend saja), token (#7), Kotak Penjelasan (#8), Catatan (#11), pengalih bahasa
(#12), **Eksekusi Kode + 1 Soal Kode Stack (#10)**, dan ekspor gabungan Progres +
Catatan (#14) sudah ada. **Rantai Stack kini lengkap ujung ke ujung.** **Catatan
penting**: Progres sudah punya endpoint tetapi **belum tersambung ke tampilan** —
status ○◐● di sidebar masih selalu ○. Beberapa komentar di kode menyebut #8 sebagai
yang menyambungkannya; itu keliru, dan sudah dikoreksi. **Pekerjaan itu kini punya
ticketnya sendiri: #27** (dibuat ticket #16). Lihat
[ADR-0017](adr/0017-kotak-penjelasan-dan-pembahasan-di-balik-tombol.md).

**Eksekusi Kode (#10) selesai.** Soal Kode Stack tampil di halaman Topik **setelah
Kuis**: pemelajar menulis Python dari nol di editor, menjalankannya, dan melihat hasil
**per test case** — input, hasil yang dihasilkan, hasil yang diharapkan, dan mana yang
lulus. Kode dijalankan di **kontainer sekali pakai** (image `runner/`), dengan batas
waktu 5 detik, memori 256 MB, 1 CPU, 32 test case, ukuran kode 16 KB, jaringan ditolak,
filesystem read-only, dan proses non-root. Pesan lewat-waktu dibedakan dari pesan galat
sintaks. Endpoint `POST /api/eksekusi` ada **di belakang token**. Gerbang "solusi
referensi lulus test case-nya sendiri" (issue #1) dijalankan lewat perintah terpisah
`npm run verifikasi-soal`. Lihat
[ADR-0022](adr/0022-eksekusi-kode-lokal-lewat-docker.md).

**Catatan (#11) selesai sebagian rantai Fase 1.** Editor Catatan per Topik ada di
bawah Materi, tersimpan di backend, dan bisa diunduh sebagai Markdown **per Topik**.
Ekspor gabungan seluruh Progres + Catatan tetap milik #14. Lihat
[ADR-0018](adr/0018-catatan-per-topik-dan-unduhan-markdown.md).

**Ekspor (#14) selesai.** Skema Topik bertambah `kompleksitas` dan `istilah`; dari
keduanya disusun CSV berformat Anki **saat build**, disajikan statis di
`/[bahasa]/ekspor/anki` (tanpa backend, tanpa token). Unduhan gabungan seluruh Catatan
ditambahkan di antarmuka (beranda), mengikuti pola ADR-0018. `GET /api/ekspor/progres`
**tetap terpisah** — keputusan pemilik, karena Progres hanya ada di server sedangkan
CSV dan Catatan tidak. Lihat [ADR-0019](adr/0019-field-kompleksitas-istilah-dan-ekspor-csv.md).
**Catatan**: `stack` dan `big-o` sudah punya berkas, jadi CSV berisi kedua Topik itu;
kriteria "ekspor mencakup Topik yang sudah diselesaikan" tetap belum bisa diuji penuh
sampai ada Topik yang **diselesaikan** lewat Progres — dan Progres belum tersambung ke
tampilan (lihat ticket #27).

**Pencarian (#13) selesai.** Fase 1 nomor 2 kini ada: halaman `/[bahasa]/pencarian`
dengan kotak yang menampilkan hasil **saat mengetik**. Indeks disusun dari Materi
**saat build** (satu entri per bagian, memakai anchor dari `daftarBagian`), lalu
pencocokannya berjalan di peramban — tanpa backend, tanpa token, dan tetap bekerja
saat backend mati. Tautan ke halaman ini ada di beranda dan di sidebar setiap Topik.
Istilah **Pencarian** ditambahkan ke `CONTEXT.md` oleh ticket ini. Lihat
[ADR-0020](adr/0020-pencarian-halaman-indeks-dan-pencocokan-di-peramban.md).
**Catatan**: `stack` dan `big-o` sudah punya berkas, jadi bagian Materi kedua Topik itu
yang bisa ditemukan; keduanya bertambah sendiri saat Topik berikutnya ditulis.

**Visualisasi Stack (#15) selesai sebagian.** Visualisasi pertama ada: bagian di
halaman Topik, tepat di bawah Materi, menampilkan **Stack dan Queue** dengan urutan
langkah yang sama — sehingga yang terlihat berbeda hanya ujung tempat `pop` mengambil
(LIFO 3 lalu 2; FIFO 1 lalu 2). Langkahnya bisa dimajukan, **dimundurkan**, diulang,
dan diputar sendiri; `prefers-reduced-motion` dihormati lewat `MotionConfig
reducedMotion="user"`. Geraknya memakai pustaka **`motion`** (Framer Motion, ~45 KB
gzip, hanya di rute Topik). Urutan langkahnya ada di dalam kode, **bukan** di
`content/stack.yaml` — skema konten dan validator tidak tersentuh. Istilah
**Visualisasi** di `CONTEXT.md` dipakai kode untuk pertama kalinya. Lihat
[ADR-0021](adr/0021-visualisasi-stack-di-halaman-topik-lewat-motion.md).
**Catatan**: ini baru 1 dari 12 Visualisasi yang dijanjikan; 11 Topik lain belum punya,
dan `VISUALISASI_PER_TOPIK` di `daftar-visualisasi.tsx` masih berisi satu baris.

**Topik Big-O (#16) selesai — Topik kedua yang punya berkas.** Materi dua bahasa,
5 Kuis skenario, 1 Soal Kode, dan 6 Pembahasan, semuanya tulisan asli. Big-O adalah
Topik pertama di Jalur (`prasyarat: []`) dan **bukan struktur data**, sehingga bentuk
Soal Kode yang ditetapkan dokumen ini tidak bisa dipakai apa adanya: Soalnya menjadi
**menulis dua pencarian dari nol dan mengembalikan jumlah langkah**, supaya perbedaan
O(n) dan O(log n) terasa sebagai angka. Field `kompleksitas` juga diisi **algoritma
yang dianalisis**, bukan struktur data. Kedua penyimpangan itu dicatat di
[ADR-0023](adr/0023-bentuk-soal-kode-big-o-dan-kompleksitas-algoritma.md).
**Kriteria "Progres Topik ini terlacak" BELUM terpenuhi** — Progres masih belum
tersambung ke tampilan; pekerjaannya dipisahkan ke ticket #27.

**Urutan setelah jawaban benar** (diputuskan di #8, ADR-0017): Kotak Penjelasan muncul
→ pemelajar menulis alasannya → Pembahasan baru terbuka setelah tombolnya ditekan. Ini
memenuhi user story 49 ("Pembahasan tersembunyi di balik tombol") yang sebelumnya
bertabrakan dengan perilaku #6 (Pembahasan terbuka otomatis).

**Menyusul setelah Fase 1**:
- Visualisasi, untuk 12 Topik (dijanjikan, belum dikerjakan). **Diperbarui #15**: satu
  sudah ada (Stack & Queue, di halaman Topik); 11 Topik lain belum. Lihat ADR-0021.
- Dry-run tabel dan cari bug sebagai format Kuis.
- SRS di dalam situs (saat ini: export ke Anki, Anki yang menjadwalkan).

## Kontradiksi yang diselesaikan selama sesi

| Kontradiksi | Penyelesaian |
|---|---|
| Backend Rust vs localStorage (tanpa pekerjaan server) | Backend tetap, untuk eksekusi kode. Alasan sebenarnya preferensi, dicatat di ADR-0001 |
| Pilih keempat opsi backend sekaligus | Dipaksa memilih satu: backend Rust sebagai eksekusi kode |
| Pilih keempat format interaktif sekaligus | Diurutkan: tebak output dulu, visualisasi menyusul |
| "Tidak ada kuis pure leetcode" | Ditafsirkan: skenario nyata + implementasi dari nol. ADR-0005 |
| Catatan di YAML (R7) vs editor Catatan di situs (R14) | Catatan pindah ke database + tombol export. ADR-0003 |
| Editor Materi di situs vs Materi dibaca dari git | Editor hanya untuk Catatan; Materi diedit lewat git |
| localStorage per perangkat vs belajar di dua perangkat | Progres pindah ke backend |
| Progres di backend publik tanpa pembatas | Token rahasia. ADR-0006 |

## Angka scope

| Item | Jumlah |
|---|---|
| Topik | 12 |
| Materi (2 bahasa) | 24 |
| Kuis | 60 |
| Soal Kode | 12 |
| Pembahasan | 72 |
| Visualisasi | 12 |
| Test case Soal Kode | 12 × beberapa kasus |

## Risiko yang sudah ditandai

1. **Scope terbesar**: 24 Materi + 72 Soal + 72 Pembahasan + 12 Visualisasi, tanpa target waktu. Mitigasi: Fase 1 dibatasi satu Topik, dan urutan pengerjaan ditetapkan.
2. **Over-engineering**: riset menemukan pola ini dan menamainya. Situs bisa menghabiskan lebih banyak waktu membangun mesin daripada belajar DSA.
3. **Docker Compose memperlambat loop pengembangan** (rebuild Rust 1-3 menit, hot-reload Next.js tersendat). Dipilih sadar.
4. **Test case yang salah** membuat kamu stuck karena kodemu sebenarnya benar. Mitigasi: solusi referensi wajib lulus semua test case saat build.
5. **Risiko keamanan**: diterima sadar. Lihat ADR-0002.
6. **Materi dua bahasa berlipat dua secara permanen**: setiap perbaikan paragraf dikerjakan dua kali.
