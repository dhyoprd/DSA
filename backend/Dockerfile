# Image pengembangan backend.
#
# Sengaja `-slim`, bukan `-alpine`: image ini butuh gcc untuk menautkan binary Rust,
# dan varian Debian sudah membawanya sehingga tidak ada paket tambahan yang perlu dipasang.
# `target/` di-mount sebagai volume bernama oleh Docker Compose, jadi hasil kompilasi
# bertahan antar restart dan tidak tercampur artefak Windows dari host.
FROM rust:1.96-slim

WORKDIR /app

# Kompilasi dijalankan saat container menyala (`cargo run`), bukan saat build image.
# Dengan begitu perubahan kode langsung terpakai setelah container di-restart.
CMD ["cargo", "run"]
