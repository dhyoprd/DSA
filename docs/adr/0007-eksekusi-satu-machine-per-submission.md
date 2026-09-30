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
- Mekanisme mengembalikan hasil dari Machine yang bersifat sementara **belum ada di permukaan API publik yang terdokumentasi** (tidak ada endpoint exec publik). Ini keputusan desain yang masih terbuka: menangkap stdout, atau memakai volume.
- Batas laju API Fly 1 permintaan/detik (burst 3) membatasi laju eksekusi. Cukup untuk satu pengguna.
- Machine hangat bisa disiapkan untuk menyembunyikan cold start 300ms-2s, tetapi itu optimisasi, bukan kebutuhan Fase 1.

## Alternatif yang ditolak

**Docker-in-Docker per submission.** Berjalan di dalam Machine, tetapi batas resource rusak dan isolasinya berbagi kernel. Lebih lemah daripada satu Machine, di platform yang sama.

**Menggabungkan backend Rust dan runner dalam satu Machine.** Lebih sederhana dan menghilangkan cold start. Ditolak karena keduanya akan berbagi kernel: batas microVM melindungi host, tetapi tidak melindungi backend yang ada di Machine yang sama dengan kode asing.

**Judge0 atau Piston self-hosted.** Bobot operasionalnya tidak sebanding untuk proyek hobi satu orang: Judge0 butuh empat peran container dan sunting GRUB, dan kedua sistem itu mensyaratkan versi cgroup yang saling bertentangan.

**Modal Sandboxes.** Menyediakan gVisor atau VM sebagai layanan terkelola, tanpa kernel yang harus dipelihara. Ditolak karena menambah satu penyedia eksternal dan tidak punya tier gratis khusus, padahal solusi satu-Machine sudah memakai host yang ada.
