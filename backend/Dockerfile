# Image pengembangan backend.
#
# Sengaja `-slim`, bukan `-alpine`: image ini butuh gcc untuk menautkan binary Rust,
# dan varian Debian sudah membawanya sehingga tidak ada paket tambahan yang perlu dipasang.
# `target/` di-mount sebagai volume bernama oleh Docker Compose, jadi hasil kompilasi
# bertahan antar restart dan tidak tercampur artefak Windows dari host.
FROM rust:1.96-slim

# Klien Docker, untuk memanggil kontainer runner dari dalam Compose (ADR-0022).
#
# Yang dibutuhkan hanya **klien**-nya (`docker run`, `docker kill`), bukan daemon.
# Daemonnya milik host, dijangkau lewat `/var/run/docker.sock` yang dipasang Compose.
# Tanpa baris ini, backend di dalam container tidak punya perintah `docker` sama sekali,
# dan setiap Eksekusi Kode gagal dengan "tidak bisa menjalankan Docker".
#
# Diletakkan sebelum `WORKDIR` supaya lapisannya jarang berubah dan cache build tidak
# ikut batal setiap kali kode berubah.
RUN apt-get update \
    && apt-get install -y --no-install-recommends docker.io \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Kompilasi dijalankan saat container menyala (`cargo run`), bukan saat build image.
# Dengan begitu perubahan kode langsung terpakai setelah container di-restart.
CMD ["cargo", "run"]
