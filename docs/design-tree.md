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
**Deploy**: frontend ke Vercel, backend ke Fly.io.
**Dev loop**: Docker Compose untuk Next.js dan backend Rust. Eksekusi kode di lokal tidak lewat Docker.
**Testing**: validasi konten saat build + integrasi API di batas backend. Tanpa unit test UI.

## Cabang 3 — Keamanan (risiko diterima sadar)

> **Dikoreksi setelah verifikasi 2026-09-30.** Versi pertama cabang ini menyebut gVisor sebagai runtime Docker di Fly.io. Itu **tidak bisa dijalankan** — lihat bagian Koreksi di bawah.

**Status**: situs publik + backend menjalankan kode arbitrary. Pengguna sudah diperingatkan dan memilih melanjutkan.
**Mekanisme**: satu Machine Firecracker sekali pakai per submission. Setiap submission mendapat kernel Linux sendiri, jadi batas isolasinya lebih kuat daripada Docker dengan gVisor.
**Wajib ada**: egress ditolak total lewat Network Policy, batas laju per IP, pencatatan setiap eksekusi, batas ukuran kode, batas waktu yang menghancurkan Machine, batas memori/CPU lewat `guest`, user non-root.
**Batas eksekusi**: 5 detik, 128 MB, 0,5 CPU core.
**Backend Rust dan runner wajib di Machine BERBEDA.** Kalau digabung, keduanya berbagi kernel dan batas microVM melindungi host, bukan backend.
**Konsekuensi yang diterima**: mesin ini tidak boleh menyimpan apa pun yang berharga. Backend yang dikompromikan bisa dipakai menyerang pihak ketiga.
**Risiko kebijakan yang tidak hilang**: Fly's AUP melarang cryptomining dan security testing, dan ToS-nya membatasi pemakaian untuk "internal use". Mitigasi mengurangi kemungkinan, bukan menghilangkan kemungkinan akun ditangguhkan.
**Blocker yang belum terselesaikan**: Fly Machines tidak punya endpoint exec terdokumentasi. Belum ada cara resmi menjalankan perintah di dalam Machine dan membaca stdout-nya. Ini risiko desain terbesar dan memblokir ticket Eksekusi Kode. Dua jalur: runner melapor balik ke backend lewat 6PN, atau tulis hasil ke volume.

## Koreksi setelah verifikasi (2026-09-30)

Verifikasi terhadap sumber primer membatalkan dua klaim di versi pertama dokumen ini:

| Klaim awal | Koreksi |
|---|---|
| gVisor dipasang sebagai runtime Docker di Fly (`docker run --runtime=runsc`) | **Salah.** Fly tidak punya host Docker daemon; field `runtime` tidak ada di skema MachineConfig; gVisor tidak muncul di dokumentasi Fly. Satu-satunya percobaan terdokumentasi gagal pada konfigurasi cgroup. |
| Firecracker adalah "proyek infrastruktur tersendiri" | **Salah.** Di Fly.io Firecracker adalah default platform — setiap Machine sudah berupa microVM. "Satu Machine per submission" memakai fitur bawaan. |
| Batas resource lewat flag Docker (`--cpus`, `--memory`) | **Salah di Fly.** Batas CPU terbukti gagal pada nested container karena ketidakcocokan cgroup v1/v2. Batas resource dipindah ke objek `guest`. |
| `--cap-drop=ALL`, `--security-opt no-new-privileges`, `--read-only` | **Tidak punya padanan langsung** di model konfigurasi Fly. Sebagian tercakup oleh batas microVM, tidak bisa dikonfigurasi terpisah. |

Keputusan yang **selamat tanpa perubahan**: backend Rust tetap ada (Progres dan Catatan memang butuh server), target deploy Fly.io tetap, dan penolakan Pyodide tetap berlaku sebagai preferensi.

## Cabang 4 — Antarmuka

**Gaya**: Swiss / International Typographic Style.
**Font**: Inter.
**Aksen**: merah `#e0342b`.
**Tema**: dua mode (terang + gelap) dengan pengalih, default mengikuti sistem.
**Layout**: sidebar kiri (12 Topik + penanda progres) + konten tengah + daftar isi kanan.
**Perangkat**: laptop dan HP sama penting. Semua komponen harus nyaman di keduanya.
**Progres visual**: ○ belum, ◐ sedang, ● selesai.

## Cabang 5 — Fitur

**Fase 1 (rantai Stack, urutan pengerjaan)**:
1. Rantai inti: Materi + 5 Kuis + 1 Soal Kode + Pembahasan + Progres + Kotak Penjelasan + token + pengalih bahasa.
2. Pencarian.
3. Export ke Anki.
4. Editor Catatan di situs.

**Menyusul setelah Fase 1**:
- Visualisasi, untuk 12 Topik (dijanjikan, belum dikerjakan).
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
