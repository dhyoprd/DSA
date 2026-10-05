-- JANGAN menyunting berkas ini setelah ia pernah dijalankan. SQLx menyimpan
-- checksum-nya dan menolak startup kalau isinya berubah, bahkan untuk komentar.
-- Perubahan skema berikutnya ditulis sebagai berkas migrasi BARU di folder ini.
--
-- Kotak Penjelasan per (Topik, Soal).
--
-- Isinya tulisan pemelajar sendiri — alasan jawabannya, dengan kata sendiri — dan
-- **tidak dinilai otomatis** (CONTEXT.md, issue #1 user story 28). Karena itu tidak
-- ada kolom "benar", "skor", atau apa pun yang menyatakan mutu tulisan: menambahkan
-- satu saja akan mengubah sifat fitur ini dari "merumuskan pemahaman" menjadi
-- "mengerjakan ujian", dan itu kebalikan dari tujuannya.
--
-- Kuncinya (topik_slug, soal_indeks), sama dengan `progres`, supaya satu Soal
-- dikenali dengan cara yang sama di seluruh backend. Seperti di sana, sengaja tanpa
-- foreign key ke daftar Topik: daftar itu hidup di git (content/jalur.yaml), bukan di
-- database, dan backend tidak membacanya (ADR-0003).
CREATE TABLE penjelasan (
    -- Slug Topik, mis. "stack".
    topik_slug      TEXT    NOT NULL,

    -- Indeks Soal di dalam `soal[]` pada berkas Topik, mulai dari 0. Soal tidak
    -- punya `id` di skema YAML (issue #1), jadi (slug, indeks) adalah kuncinya.
    soal_indeks     INTEGER NOT NULL,

    -- Tulisan pemelajar, apa adanya. Boleh kosong: mengosongkan kotak adalah cara
    -- sah untuk membatalkan tulisan, dan barisnya tetap ada sebagai penanda bahwa
    -- Kotak Penjelasan Soal ini sudah pernah dibuka.
    isi             TEXT    NOT NULL DEFAULT '',

    -- Waktu tulisan terakhir diperbarui, ISO-8601 UTC. Diisi oleh SQLite sendiri
    -- lewat strftime('now'), sehingga tidak perlu pustaka waktu di sisi Rust —
    -- pola yang sama dengan `progres.benar_terakhir`.
    diperbarui      TEXT    NOT NULL,

    PRIMARY KEY (topik_slug, soal_indeks)
);
