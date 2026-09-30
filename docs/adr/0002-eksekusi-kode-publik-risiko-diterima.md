# Eksekusi kode diterima sebagai risiko sadar, dengan isolasi satu Machine per submission

## Status

accepted

## Konteks

Situs ini akan dipublikasikan, dan backend-nya menjalankan kode Python yang dikirim dari internet. Isolasi yang benar-benar aman untuk kode asing menuntut pemisahan yang kuat antara kode itu dan segala hal lain.

## Keputusan

Situs dipublikasikan. Kode yang dikirim dijalankan di dalam **satu Machine Firecracker sekali pakai per submission**, dengan egress ditolak total, batas laju per IP, dan pencatatan setiap eksekusi.

## Alasan

Setiap Machine di Fly.io sudah berupa microVM Firecracker dengan kernel Linux-nya sendiri. Batas isolasinya karena itu berada **di antara** kode yang dikirim dan seluruh sistem lain — bukan di dalam kernel yang sama. Ini lebih kuat daripada gVisor, yang menyadap syscall di dalam satu kernel bersama, dan lebih kuat daripada Docker biasa, yang berbagi kernel dengan host.

Biaya marginalnya mendekati nol (~$0,000004 per eksekusi 5 detik), dan tidak ada Docker bersarang yang perlu dibangun.

## Mitigasi wajib

Tanpa semua ini, keputusan ini tidak boleh dianggap berlaku:

- **Egress ditolak total** lewat Network Policy. Ini mitigasi terpenting: tanpa jaringan, kode yang dijalankan tidak bisa menambang kripto, mengirim spam, atau menyerang pihak ketiga.
- **Batas laju per IP** pada endpoint eksekusi.
- **Pencatatan setiap eksekusi** — waktu, IP, ukuran kode, hasil. Diperlukan sebagai bukti kalau ada penyalahgunaan, dan untuk mendeteksi pola aneh lebih awal.
- **Batas ukuran kode dan jumlah test case** per submission.
- **Batas waktu yang mematikan Machine**, bukan sekadar menghentikan proses.
- **Batas resource lewat `guest`** — memori dan CPU.
- **User non-root** lewat field `user` pada MachineProcess.
- **Backend Rust dan kode yang dijalankan wajib berada di Machine yang BERBEDA.** Kalau keduanya berbagi satu Machine, keduanya berbagi kernel, dan batas microVM melindungi host, bukan backend yang ada di sebelahnya.

## Konsekuensi

- Cold start 300ms-2s per eksekusi, dan batas laju API Fly 1 permintaan/detik (burst 3). Tidak masalah untuk satu pengguna, menjadi masalah kalau situs ini pernah multi-pengguna.
- `--cap-drop=ALL`, `--security-opt no-new-privileges`, dan `--read-only` **tidak punya padanan langsung** di model konfigurasi Fly. Sebagian sudah tercakup oleh batas microVM, tetapi tidak bisa dikonfigurasi terpisah.
- Mesin ini tidak boleh dipakai menyimpan apa pun yang berharga.
- **Risiko kebijakan tidak hilang.** Fly's Acceptable Use Policy melarang cryptomining dan security testing, dan menyimpan hak menangguhkan akun "in its sole discretion". ToS-nya membatasi pemakaian untuk "internal use". Layanan eksekusi kode publik duduk canggung di antara keduanya. Tidak ada arsitektur yang memperbaiki ini; mitigasi di atas mengurangi kemungkinan, bukan menghilangkan kemungkinan akun ditangguhkan.

## Alternatif yang ditolak

**gVisor sebagai runtime Docker.** Ini yang tertulis di versi pertama ADR ini, dan **terbukti tidak bisa dijalankan.** Fly tidak punya host Docker daemon, sehingga `docker run --runtime=runsc` tidak punya apa pun untuk disandari; field `runtime` tidak ada di skema MachineConfig; dan satu-satunya percobaan terdokumentasi gagal pada konfigurasi cgroup. Selain itu, batas resource yang menjadi andalan rencana itu justru rusak pada nested container di Fly karena ketidakcocokan cgroup v1/v2.

**Docker-in-Docker.** Bisa dijalankan di dalam Machine, tetapi batas CPU/memori/PID rusak karena ketidakcocokan cgroup, ada konflik nftables, dan isolasinya tetap berbagi kernel — lebih lemah daripada satu Machine per submission di platform yang sama.

**VPS + Docker + gVisor.** Satu-satunya bentuk di mana gVisor benar-benar tersedia. Ditolak karena membatalkan alasan memilih Fly: pemilik proyek harus menanggung penambalan kernel, konfigurasi cgroup, dan risiko container escape.

**Pyodide di browser.** Menghapus seluruh kelas masalah ini alih-alih memitigasinya. Ditolak karena preferensi pemilik proyek memiliki backend Rust — lihat ADR-0001. Alternatif ini akan disarankan lagi oleh siapa pun yang membaca kode ini, dan penolakannya dicatat agar tidak terlihat seperti kelalaian.

**Tanpa eksekusi jarak jauh.** Versi pertama ADR ini sendiri merekomendasikan ini. Ditolak karena menghilangkan penilaian otomatis Soal Kode, yang merupakan salah satu dari tiga kriteria sukses proyek.
