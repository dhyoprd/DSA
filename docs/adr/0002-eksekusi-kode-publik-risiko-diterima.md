# Eksekusi kode diterima sebagai risiko sadar, dengan hardening wajib

## Status

accepted

## Konteks

Situs ini akan dipublikasikan, dan backend-nya menjalankan kode Python yang dikirim dari internet. Docker berbagi kernel dengan host, sehingga container escape adalah kelas kerentanan yang nyata. Isolasi yang benar-benar aman untuk kode asing adalah microVM (Firecracker) atau sandbox kernel (gVisor).

## Keputusan

Situs dipublikasikan. Eksekusi kode memakai Docker dengan hardening wajib, dan gVisor dipakai sebagai runtime tambahan.

## Alasan

Pengguna menerima risiko ini secara sadar setelah diperingatkan bahwa Docker saja tidak cukup untuk publik. gVisor dipilih karena biayanya jauh lebih kecil daripada yang diperkirakan: ia dipasang sebagai runtime Docker (`docker run --runtime=runsc`), bukan sebagai sistem yang dibangun dari nol. Ini menutup sebagian besar risiko container escape dengan biaya konfigurasi.

## Hardening yang wajib ada

Tanpa semua ini, keputusan ini tidak boleh dianggap berlaku:

- `--network none` — kode tidak boleh punya akses jaringan sama sekali
- `--read-only` — filesystem tidak bisa ditulis
- `--cap-drop=ALL` — semua Linux capability dicabut
- `--security-opt no-new-privileges` — tidak bisa menaikkan hak akses
- user non-root di dalam container
- batas memori, CPU, dan jumlah PID
- timeout wajib dengan proses dimatikan paksa — tanpa ini satu infinite loop menggantung backend
- batas ukuran kode yang dikirim

Nilai default yang disepakati: timeout 5 detik, memori 128 MB, CPU 0,5 core, tanpa jaringan, filesystem read-only, user non-root.

## Konsekuensi

- Mesin ini tidak boleh dipakai untuk menyimpan apa pun yang berharga. Kalau backend ini pernah dikompromikan, seluruh mesin harus dianggap tercemar.
- Backend yang dikompromikan bisa dipakai menyerang pihak ketiga (botnet, spam, DDoS, penambangan kripto). Risiko ini tidak berhenti di pemilik situs.
- Setiap kali menambah bahasa atau pustaka ke image eksekusi, permukaan serangan bertambah dan hardening harus ditinjau ulang.

## Alternatif yang ditolak

**Eksekusi lokal saja, versi publik tanpa tombol Jalankan.** Ini yang direkomendasikan: nol permukaan serangan, dan orang lain memang tidak perlu bisa menjalankan kode di situs ini. Ditolak karena pengguna ingin versi publik lengkap.

**Firecracker.** Isolasi terkuat, tetapi merupakan proyek infrastruktur tersendiri dan tidak sebanding dengan manfaatnya di sini.
