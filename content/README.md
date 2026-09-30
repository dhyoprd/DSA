# content/

Materi dan Soal hidup di sini sebagai berkas di dalam git — bukan di database.
Keputusan dan alasannya ada di `docs/adr/0003-materi-di-git-catatan-di-database.md`.

Satu Topik = satu berkas YAML, berisi metadata + Materi (Markdown di dalam field)
+ array Soal. Dibaca saat build, dan build **gagal** kalau isinya tidak sah.

Folder ini sengaja masih kosong. Bentuk skema YAML-nya, aturan validasinya, dan
Topik pertama (Stack) ditentukan di ticket **#3 — Skema Topik + gerbang validasi build**.
Jangan menebak bentuk berkasnya di sini; tunggu skema itu supaya tidak ada dua
sumber kebenaran.

Catatan yang ditulis dari situs **tidak** disimpan di sini. Catatan dan Progres
hidup di database backend, sesuai ADR-0003.
