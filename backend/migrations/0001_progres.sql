-- JANGAN menyunting berkas ini setelah ia pernah dijalankan. SQLx menyimpan
-- checksum-nya dan menolak startup kalau isinya berubah, bahkan untuk komentar.
-- Perubahan skema berikutnya ditulis sebagai berkas migrasi BARU di folder ini.
--
-- Progres per (Topik, Soal).
--
-- `status` (belum / sedang / selesai) sengaja TIDAK disimpan sebagai kolom. Ia
-- sepenuhnya ditentukan oleh `percobaan` dan `benar_terakhir` di bawah, dan
-- menyimpannya berarti menyimpan dua salinan satu fakta yang bisa saling
-- menyimpang — persis yang dihindari ADR-0009 untuk daftar isi. Aturan turunannya
-- hidup di satu tempat, `store::progres::status_dari`.
--
-- Menyimpannya juga menimbulkan pertanyaan yang tidak perlu: apa yang terjadi kalau
-- Soal yang sudah benar dijawab salah lagi? Dengan bentuk ini jawabannya jelas dan
-- tidak bisa dilanggar — `benar_terakhir` tidak pernah dikosongkan kembali.
CREATE TABLE progres (
    -- Slug Topik, mis. "stack".
    --
    -- Sengaja tanpa foreign key ke daftar Topik: daftar itu hidup di git
    -- (content/jalur.yaml), bukan di database, dan backend tidak membacanya
    -- (ADR-0003). Karena itu backend tidak bisa menolak slug yang tidak dikenal —
    -- penjaganya adalah gerbang validasi Materi saat build, bukan database ini.
    topik_slug      TEXT    NOT NULL,

    -- Indeks Soal di dalam `soal[]` pada berkas Topik, mulai dari 0. Soal tidak
    -- punya `id` di skema YAML (issue #1), jadi (slug, indeks) adalah kuncinya.
    soal_indeks     INTEGER NOT NULL,

    -- Berapa kali Soal ini dijawab, benar maupun salah.
    percobaan       INTEGER NOT NULL DEFAULT 0,

    -- Waktu jawaban BENAR yang paling akhir, ISO-8601 UTC. NULL selama belum pernah
    -- benar. Diisi oleh SQLite sendiri lewat strftime('now'), sehingga tidak perlu
    -- pustaka waktu di sisi Rust.
    benar_terakhir  TEXT,

    PRIMARY KEY (topik_slug, soal_indeks)
);
