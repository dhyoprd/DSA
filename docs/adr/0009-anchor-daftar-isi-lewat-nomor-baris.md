# Daftar isi dan heading disambungkan lewat nomor baris, bukan lewat plugin slug

## Status

accepted

## Konteks

Ticket #4 menambahkan daftar isi di sisi kanan halaman Topik. Daftar itu berisi tautan
ke setiap judul di dalam Materi, jadi setiap heading harus punya `id` yang sama persis
dengan tautannya. Kalau keduanya berbeda, tidak ada yang gagal: tautannya hanya
melompat ke tempat yang salah, diam-diam, dan baru ketahuan saat pembaca mengkliknya.

Dua hal harus diputuskan: dari mana daftar judul diambil, dan bagaimana `id` itu
dipasang pada heading yang dirender.

Materi ditulis sebagai Markdown di dalam YAML (issue #1), lalu dirender
`react-markdown`. `react-markdown` meneruskan simpul hast asli sebagai prop `node` ke
setiap komponen override, dan `node.position.start.line` berisi nomor baris judul di
dalam Markdown. Fakta ini diverifikasi dengan menjalankan kode, bukan dibaca dari
dokumentasi saja.

## Keputusan

Judul diekstrak oleh modul murni `frontend/src/lib/konten/bagian.ts`, yang mem-parse
Markdown dengan `remark-parse` + `remark-gfm` dan mengumpulkan setiap `heading` beserta
`tingkat`, `teks`, `baris`, dan `id` yang sudah dibuat unik.

`id` dipasang pada heading oleh `materi-markdown.tsx` dengan mencocokkan
`node.position.start.line` ke peta `baris → id` yang dihitung sekali di halaman.

Halaman adalah satu-satunya tempat yang menghitung peta itu, dan menyerahkannya ke
**dua** pemakai: daftar isi (untuk membuat tautan) dan renderer (untuk memasang `id`).
Dengan begitu keduanya tidak mungkin memakai perhitungan yang berbeda.

## Alasan

**Nomor baris adalah kunci yang tersedia tanpa menambah ketergantungan.** Karena
`react-markdown` sudah memberi posisi, pencocokan bisa dilakukan tanpa plugin slug
tambahan dan tanpa mengubah pohon Markdown.

**Kesepadanannya bisa diuji, dan diuji.** `kesepakatan-anchor.test.ts` mem-parse Materi
yang sama dengan dua cara — `daftarBagian` dan komponen override react-markdown — lalu
membandingkan himpunan nomor barisnya. Uji itu berlaku untuk seluruh tingkat judul
(h1–h6), bukan hanya yang kebetulan dipakai Materi saat ini. Jadi asumsi yang menopang
seluruh daftar isi dijaga mesin, bukan disiplin.

**Id dibuat unik di satu tempat.** Judul kembar adalah hal biasa, dan dua `id` yang sama
membuat tautan selalu menunjuk yang pertama. Karena id dihitung sekali di `bagian.ts`,
keunikannya dijamin di sana alih-alih bergantung pada perilaku pustaka.

## Konsekuensi

- **Kesepakatan ini rapuh menurut rancangannya, dan itu disadari.** Ia bergantung pada
  perilaku `react-markdown` yang tidak dijanjikan sebagai API publik: bahwa `node`
  berisi posisi dari pohon yang sama dengan yang di-parse sendiri. Uji
  `kesepakatan-anchor.test.ts` ada persis untuk menangkap perubahan itu saat versi
  `react-markdown` naik. Kalau uji itu gagal setelah peningkatan versi, jangan
  melonggarkan ujinya — perbaiki cara `id` dipasang.
- Pembacaan `node.position.start.line` hidup di **satu** berkas, `baris.ts`, dan dipakai
  oleh `bagian.ts`, `materi-markdown.tsx`, dan ujinya. Sebelumnya bentuk itu diperiksa
  di tiga tempat, sehingga ketiganya bisa menyimpang tanpa ketahuan.
- Materi yang judulnya tidak punya posisi (seharusnya tidak terjadi pada hasil `parse`)
  dilewati, bukan diberi `id` tebakan.
- Menambah penyorot sintaks atau plugin Markdown lain tidak mengubah kesepakatan ini,
  selama plugin itu tidak menggeser posisi judul di pohon.

## Alternatif yang ditolak

**Plugin `rehype-slug` (atau `github-slugger`) untuk memasang `id` otomatis.** Ini
pilihan yang paling lazim, dan justru itu alasannya ditolak di sini: daftar isi tetap
harus tahu `id` apa yang akan dihasilkan plugin itu, sehingga aturan pembuatan slug
harus **ditiru** di sisi daftar isi. Dua implementasi dari satu aturan adalah persis
sumber penyimpangan yang ingin dihindari — dan penyimpangannya senyap, karena tidak ada
yang gagal, hanya tautan yang meleset. Menghitung `id` sendiri di `bagian.ts` membuat
hanya ada **satu** implementasi, yang dipakai kedua sisi.

**Mem-parse Markdown dua kali dengan cara berbeda** (sekali untuk daftar isi, sekali
lagi di dalam renderer). Ditolak karena dua pohon bisa berbeda, dan tidak ada yang
menjaga keduanya tetap sepakat.

**Membaca daftar isi dari HTML hasil render.** Ditolak karena memaksa render selesai
lebih dulu sebelum navigasi bisa disusun, dan mengikat daftar isi pada bentuk keluaran
`react-markdown` alih-alih pada isi Markdown.
