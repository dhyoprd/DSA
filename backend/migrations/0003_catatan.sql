-- JANGAN menyunting berkas ini setelah ia pernah dijalankan. SQLx menyimpan
-- checksum-nya dan menolak startup kalau isinya berubah, bahkan untuk komentar.
-- Perubahan skema berikutnya ditulis sebagai berkas migrasi BARU di folder ini.
--
-- Catatan per Topik.
--
-- Satu baris per **Topik**, bukan per Soal seperti `penjelasan`. CONTEXT.md
-- mendefinisikan Catatan sebagai "tulisanmu sendiri tentang sebuah Topik", jadi
-- kuncinya slug Topik saja — tidak ada pasangan (slug, indeks) di sini.
--
-- Isinya Markdown, apa adanya. Tidak ada kolom skor, dan tidak ada aturan turunan
-- apa pun: Catatan ditulis pemelajar untuk dirinya sendiri (issue #1 user story 55),
-- bukan sesuatu yang dinilai. `diperbarui` hanya menandai kapan terakhir disimpan.
--
-- Sengaja tanpa foreign key ke daftar Topik: daftar itu hidup di git
-- (content/jalur.yaml), bukan di database, dan backend tidak membacanya (ADR-0003).
-- Karena itu backend tidak bisa tahu apakah sebuah slug itu Topik yang sah, dan
-- Catatan untuk slug yang belum ditulis pun tersimpan apa adanya.
CREATE TABLE catatan (
    -- Slug Topik, mis. "stack". Satu baris per slug.
    topik_slug  TEXT    NOT NULL,

    -- Tulisan pemelajar, Markdown, apa adanya. Boleh kosong: mengosongkan editor
    -- adalah cara sah membatalkan tulisan, dan barisnya tetap ada sebagai penanda
    -- bahwa Catatan Topik ini sudah pernah dibuka.
    isi         TEXT    NOT NULL DEFAULT '',

    -- Waktu tulisan terakhir diperbarui, ISO-8601 UTC. Diisi oleh SQLite sendiri
    -- lewat strftime('now'), sehingga tidak perlu pustaka waktu di sisi Rust —
    -- pola yang sama dengan `progres` dan `penjelasan`.
    diperbarui  TEXT    NOT NULL,

    PRIMARY KEY (topik_slug)
);
