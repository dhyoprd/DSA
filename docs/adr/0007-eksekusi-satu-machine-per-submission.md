# Eksekusi kode memakai satu Machine sekali pakai per submission

## Status

accepted

## Konteks

Backend Rust menerima kode Python dari situs publik dan harus menjalankannya terhadap test case. Isolasi wajib kuat, karena kode itu datang dari internet. Rencana awal memakai Docker dengan gVisor di dalam Machine Fly, dan rencana itu terbukti tidak bisa dijalankan — lihat ADR-0002.

## Keputusan

Backend Rust di Fly bertindak sebagai koordinator dan tidak pernah menjalankan kode yang dikirim. Untuk setiap submission, backend membuat satu Machine Firecracker sekali pakai dari image runner yang minimal, menjalankannya, membaca hasilnya, lalu menghancurkannya.

## Alasan

Ini perubahan paling kecil yang membuat rencana berjalan di host yang sudah dipilih. Firecracker adalah default platform Fly, bukan sesuatu yang dibangun — jadi "satu Machine per submission" memakai fitur bawaan, bukan proyek infrastruktur. Isolasinya lebih kuat daripada Docker dengan gVisor, karena setiap submission mendapat kernel Linux sendiri, dan biaya marginalnya mendekati nol.

Backend Rust tetap ada, karena Progres dan Catatan memang butuh server. Yang berubah hanya siapa yang menjalankan Python.

## Konsekuensi

- Runner harus di-package sebagai image terpisah dan dijaga tetap kecil, supaya boot-nya cepat.
- Batas waktu ditegakkan dengan menghancurkan Machine, bukan dengan menghentikan proses di dalamnya.
- Batas laju API Fly 1 permintaan/detik (burst 3) membatasi laju eksekusi. Cukup untuk satu pengguna.
- Machine hangat bisa disiapkan untuk menyembunyikan cold start 300ms-2s, tetapi itu optimisasi, bukan kebutuhan Fase 1.

## Masalah terbuka yang belum terselesaikan: pengambilan hasil

> **DIBATALKAN 2026-10-01 — lihat ADR-0015.** Bagian di bawah ini bertumpu pada klaim
> yang ternyata **salah**: Fly Machines **punya** endpoint exec yang terdokumentasi,
> `POST /v1/apps/{app_name}/machines/{machine_id}/exec`. `flyctl` membawa perintah
> `machine exec` sejak Januari 2023, dan endpoint-nya terdaftar di OpenAPI spec resmi
> Fly. ADR-0015 memutuskan memakai endpoint itu. Isi di bawah dipertahankan sebagai
> catatan sejarah — jangan dipakai sebagai dasar keputusan.

**Ini risiko desain terbesar proyek ini, dan ia memblokir pembangunan ticket Eksekusi Kode.**

Fly Machines **tidak punya endpoint exec yang terdokumentasi.** API resource-nya hanya mencakup lifecycle, lease, routing, dan metadata — tidak ada cara resmi untuk menjalankan perintah di dalam Machine dan membaca stdout-nya. Diverifikasi independen terhadap dokumentasi Fly.

Dua jalur yang layak:

1. **Runner melapor balik ke backend Rust** lewat jaringan privat 6PN. Ini menuntut policy egress yang mengizinkan **hanya** backend. Catatan penting: apakah Network Policies mencakup traffic 6PN **belum terverifikasi** — dokumentasi hanya menyebut pengecualian Fly Proxy.
2. **Tulis hasil ke volume lalu baca kembali.** Lebih canggung, karena volume tidak bisa dibagi antar Machine.

Pilih salah satu sebelum membangun apa pun. Jangan mulai dari asumsi bahwa ini akan mudah.

## Hal yang harus diverifikasi secara empiris sebelum diandalkan

> **Masih terbuka per 2026-10-01.** ADR-0015 memindahkan daftar ini ke sana,
> menambahkan satu butir (bukti bahwa hasil kembali ke backend), dan memecah butir
> egress menjadi dua. Ketiga butir di bawah **belum diuji**.

- Apakah field `guest` benar-benar membatasi CPU dan memori seperti yang diasumsikan. Riset proyek menemukan batas resource pada nested container rusak karena tata letak cgroup Fly; `guest` adalah mekanisme berbeda, tapi belum diuji. **Sebagian terjawab secara dokumenter sejak itu:** batas CPU memang ditegakkan lewat cgroup CFS quota (`docs.fly.io/machines/cpu-performance`); batas memori belum.
- Apakah field `user` pada MachineProcess benar-benar menghasilkan proses non-root, dan apakah runner berfungsi tanpa root.
- Apakah policy egress benar-benar memblokir 6PN dan internet sebagaimana dimaksud, mengingat pengecualian Fly Proxy.

## Mekanisme egress (terkonfirmasi)

Egress ditolak lewat `POST /v1/apps/<app>/network_policies`. Aturannya deny-by-default begitu ada satu rule untuk arah tersebut, dan hanya mendukung aksi allow.

Dua catatan: rule baru berlaku setelah restart/redeploy, dan policy tidak mencakup traffic Fly Proxy. Bentuk yang koheren adalah deny-all-kecuali-backend.


## Alternatif yang ditolak

**Docker-in-Docker per submission.** Berjalan di dalam Machine, tetapi batas resource rusak dan isolasinya berbagi kernel. Lebih lemah daripada satu Machine, di platform yang sama.

**Menggabungkan backend Rust dan runner dalam satu Machine.** Lebih sederhana dan menghilangkan cold start. Ditolak karena keduanya akan berbagi kernel: batas microVM melindungi host, tetapi tidak melindungi backend yang ada di Machine yang sama dengan kode asing.

**Judge0 atau Piston self-hosted.** Bobot operasionalnya tidak sebanding untuk proyek hobi satu orang: Judge0 butuh empat peran container dan sunting GRUB, dan kedua sistem itu mensyaratkan versi cgroup yang saling bertentangan.

**Modal Sandboxes.** Menyediakan gVisor atau VM sebagai layanan terkelola, tanpa kernel yang harus dipelihara. Ditolak karena menambah satu penyedia eksternal dan tidak punya tier gratis khusus, padahal solusi satu-Machine sudah memakai host yang ada.

**Fly Sprites.** Produk Fly yang memang dibuat untuk menjalankan kode asing — nyata, dan terverifikasi terhadap sumber primer. Ditolak karena gagal pada **dua persyaratan wajib** ADR-0002: CPU tidak bisa dibatasi (Sprites hanya mengatur memori; CPU tetap 8 vCPU dan tidak bisa diubah), dan tidak ada non-root (Sprites memberi root secara default, API privileges-nya tidak terdokumentasi). Selain itu usianya baru ~8 bulan, image environment-nya masih `v0.0.1-rc48`, dan tesis desainnya — persistence — justru kebalikan dari kebutuhan grader yang bersih per submission.

Satu hal dari Sprites yang tetap berharga dan tidak boleh dilupakan: **endpoint exec-nya menunjukkan bahwa masalah pengambilan hasil itu nyata dan bisa dipecahkan.** ~~Mesin Fly tidak punya padanannya.~~ **Dikoreksi 2026-10-01:** Mesin Fly **punya** padanannya — `POST /v1/apps/{app}/machines/{id}/exec`, sejak Januari 2023. Lihat ADR-0015. Sprites tetap ditolak dengan alasan di atas, tetapi bukan karena alasan ini. Dicatat di sini supaya Sprites tidak diusulkan ulang tanpa alasan baru.

