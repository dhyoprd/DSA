# Image runner Eksekusi Kode.
#
# Kontainer ini menjalankan kode Python yang ditulis pemelajar, jadi ia adalah
# bagian sistem yang paling tidak boleh dipercaya. Bentuknya karena itu sengaja
# minimal: hanya Python, tanpa paket tambahan, tanpa alat jaringan, dan berjalan
# sebagai pengguna bukan-root.
#
# **Kenapa `python:3.13-slim` dan bukan `-alpine`.** Varian Alpine memakai musl,
# dan sebagian kode Python yang wajar berperilaku berbeda di sana (mis. perbedaan
# pembulatan float, dan pesan galat yang berbeda). Pesan galat yang berbeda berarti
# pemelajar melihat pesan yang tidak cocok dengan apa yang ia baca di Materi.
# Debian slim menghindari perbedaan itu dengan biaya ~50 MB.
#
# **Kenapa tidak ada `pip install` sama sekali.** Kode pemelajar hanya memakai
# pustaka standar (Soal Kode berbentuk "implementasikan struktur dari nol", bukan
# pemakaian pustaka). Menambah paket akan memperbesar permukaan serangan dan
# memperlambat boot, tanpa ada Soal yang membutuhkannya. Kalau suatu saat ada Soal
# yang memang butuh pustaka, itu keputusan tersendiri.
FROM python:3.13-slim

# Pengguna bukan-root. Kontainer sekali pakai dengan `--network none` sudah cukup
# terisolasi untuk mesin satu pengguna, tetapi menjalankan sebagai non-root adalah
# pertahanan berlapis yang nyaris gratis — dan ia yang dijanjikan ADR-0002.
#
# `--create-home` tidak dipakai: tidak ada yang perlu ditulis ke home. `-s` memberi
# shell `/bin/false` supaya akun ini tidak bisa dipakai login.
RUN useradd --system --no-create-home --shell /usr/sbin/nologin pemelajar

# Diletakkan di direktori yang tidak bisa ditulis pengguna, supaya kode pemelajar
# tidak bisa menimpa runner yang menjalankannya. Ini penting: kalau runner bisa
# ditimpa, kode satu submission bisa mengubah perilaku submission berikutnya —
# persis keadaan yang ADR-0015 tolak ketika menolak volume bersama.
COPY runner.py /usr/local/lib/runner.py

# Tanpa `chmod`: berkas di atas sudah terbaca semua pengguna. Yang dijaga bukan
# kerahasiaan runner, melainkan agar ia tidak bisa **ditulis**.
USER pemelajar

# `-I` menjalankan Python dalam mode terisolasi: `sys.path` tidak menyertakan
# direktori kerja, dan variabel `PYTHON*` dari lingkungan diabaikan. Tanpa itu,
# berkas yang kebetulan bernama sama dengan modul standar (mis. `json.py`) yang
# ditulis pemelajar bisa membajak impor.
#
# `-u` membuat stdout tidak disangga blok. Tanpa itu, balasan JSON bisa tertahan di
# penyangga saat kontainer dimatikan paksa karena lewat batas waktu, dan backend
# melihat kontainer yang mati padahal runner sudah selesai.
ENTRYPOINT ["python", "-I", "-u", "/usr/local/lib/runner.py"]
