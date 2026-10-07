# Blok kode disorot, dengan palet satu keluarga merah

## Status

accepted

## Konteks

Pemilik proyek menyatakan bingung membaca blok kode di Materi: seluruhnya satu warna,
tanpa penanda apa pun yang membedakan kata kunci, string, dan komentar. Permintaannya
langsung: "syntax code itu bisa dibuat berwarna ngga".

**Keadaan sebelum keputusan ini**, terverifikasi dengan membaca kode:

- Blok kode dirender sebagai **teks polos satu warna**, dengan label bahasa ("PYTHON")
  di sudut. Tidak ada paket penyorot sama sekali di `package.json`.
- Materi dan Pembahasan dirender sebagai **komponen server saat build**; halaman Topik
  menjadi HTML statis (`generateStaticParams`). Tidak ada JavaScript sisi klien untuk
  Materi.
- Blok kode muncul di **tiga tempat**: Materi (`MateriMarkdown`), blok "Kode referensi"
  di Pembahasan (juga lewat `MateriMarkdown`), dan field `kode` Kuis (dirender manual
  di `kuis.tsx`, komponen **klien**).

**Tiga kendala yang membentuk keputusan:**

1. **`docs/design-tree.md` menetapkan merah `#e0342b` sebagai satu-satunya warna
   aksen**, dan ADR-0012 memperkuatnya: "yang mengikat adalah *satu warna aksen*".
   Syntax highlighting menuntut beberapa warna untuk berguna.

2. **Materi adalah halaman statis, dan itu sifat yang dijaga.** Menyorot di sisi klien
   akan menambah bundel peramban — bertentangan dengan keputusan yang sudah ada
   (`daftar-kuis.tsx` secara eksplisit merender Markdown di server supaya pengurainya
   tidak masuk bundel klien).

3. **Kontras tidak bisa dinilai dengan mata.** Kode dibaca berjam-jam, di laptop dan HP,
   pada dua tema. Tema editor bawaan (GitHub light) memakai biru, ungu, dan hijau —
   palet itu bagus, tetapi melanggar kendala 1.

## Keputusan

**Empat keputusan, semuanya jawaban pemilik dalam satu sesi.**

### 1. Disorot di sisi server, tanpa JavaScript ke peramban

Penyorot berjalan saat build, di dalam komponen server yang sudah ada. Hasilnya
menyeberang sebagai ReactNode — pola yang sudah dipakai `daftar-kuis.tsx` untuk
Markdown.

Diverifikasi: **nol berkas JavaScript shiki di bundel klien** setelah build
(`grep` atas `.next/static/chunks/*.js` untuk `oniguruma` dan `vscode-textmate`
menghasilkan nol). Yang cocok hanya nama kelas `.shiki` di CSS.

Konsekuensinya untuk `kuis.tsx`: berkas itu komponen **klien**, jadi ia **tidak boleh**
mengimpor penyorotnya. Penyorotan blok Kuis dikerjakan di `daftar-kuis.tsx` (server),
dan `kuis.tsx` menerima hasilnya sebagai ReactNode. Tipe `KuisSiap.kode` berubah dari
`string` menjadi `ReactNode` karena itu.

### 2. Penyorot: Shiki, dengan engine regex JavaScript — tanpa WASM

`shiki` 4.5.0, dibangun lewat **`createHighlighterCoreSync`** (API sinkron), sehingga
`MateriMarkdown` dan `TeksKaya` **tidak perlu** diubah menjadi komponen async.

Engine-nya **`createJavaScriptRegexEngine`**, bukan Oniguruma. Alasannya: Oniguruma
menuntut binary WASM 466 KB yang harus dimuat saat build, sedangkan engine JavaScript
murni punya antarmuka yang sama dan hasil yang setara untuk satu bahasa. Diukur: binary
`shiki/wasm` berukuran 466.610 byte.

Bahasa yang dimuat **hanya Python**, karena seluruh blok kode di situs adalah Python.
Menambah bahasa berarti menambah impornya di `sorot-kode.ts` beserta berat build-nya.

### 3. Palet satu keluarga merah, dengan angka yang diukur

Seluruh warna kode diambil dari keluarga **merah–oranye–cokelat**. Tidak ada
biru/hijau/ungu. Ini penyimpangan dari "satu warna aksen" yang dicatat di sini:
blok kode **memiliki beberapa warna**, tetapi seluruhnya berada dalam keluarga hue
aksennya, dan tidak ada warna kedua yang berdiri sendiri.

Nilainya diukur, bukan dipilih dengan mata. Dua syarat, keduanya diukur dengan skrip
di luar repo:

| Syarat | Terang | Gelap |
|---|---|---|
| Kontras tiap warna vs latar blok kode (WCAG AA: ≥ 4,5:1) | 4,68–9,77 | 4,96–12,76 |
| Jarak perseptual antar warna (CIE76 di ruang Lab) | **31,9** | **33,2** |

Acuannya adalah tema **GitHub light** yang dipakai jutaan orang: jarak perseptual
terkecilnya **28,4**. Palet ini melampauinya di kedua tema.

Nilainya:

| Peran | Terang | Gelap |
|---|---|---|
| Kata kunci | `#ca1616` | `#ec5151` |
| Angka, konstanta | `#a54d12` | `#ec9e51` |
| Nama fungsi, kelas | `#6f5b20` | `#df9090` |
| String, docstring | `#6f2020` | `#e8dab0` |
| Komentar | `#6b6b73` | `#9a9aa3` |
| Latar | `#f1f1f1` | `#181818` |

**Kesalahan yang sempat terjadi saat menyusun palet ini, dan pelajarannya.** Percobaan
pertama memakai **rasio kontras** untuk menilai apakah dua warna cukup berbeda. Itu
salah: rasio kontras mengukur beda **kecerahan**, sehingga dua warna beda hue dengan
kecerahan sama bernilai 1,0 — terlihat "identik" oleh ukuran itu padahal jelas berbeda
di layar. Palet pertamaku lolos semua pemeriksaan kontras tetapi jarak perseptualnya
1,02, yang berarti kata kunci dan string akan tampak sama. Diukur ulang dengan CIE76,
baru ketahuan.

### 4. Warna lewat token CSS, supaya ikut tema tanpa nilai ganda

Penyorot mengeluarkan `var(--kode-*)`, bukan nilai hex. Token itu didefinisikan sekali
di `globals.css` dengan `light-dark()`, pola yang sama dengan seluruh warna situs.

Dua hal yang harus ditangani karena Shiki tidak mengeluarkan `var()` untuk semuanya:

- **`colors` tema bawaan diwarisi.** Tema membawa latar dan warna dasar yang dipakai
  untuk `style` pada `<pre>`. Kalau dibiarkan, blok kode berlatar **putih** walaupun
  situs sedang gelap. Ditemukan dengan memeriksa keluaran dan menemukan `#fffffe` di
  dalamnya. Ditimpa di `TEMA.colors`.
- **Token tanpa scope memakai nilai hex.** Tanda kurung dan titik dua tidak punya scope,
  jadi warnanya hex. Diganti di `gantiWarna()`.

**`settings` di akar tema tidak boleh diisi.** Ia **menimpa seluruh `tokenColors`**,
sehingga setiap token menjadi satu warna dan penyorotannya hilang. Diverifikasi dengan
membandingkan keluaran tema yang punya `settings` dan yang tidak: yang punya
menghasilkan 2 warna (latar dan teks saja), yang tidak menghasilkan 5.

### 5. Fallback wajib

`sorotKode()` mengembalikan `null` kalau penyorotan tidak tersedia, dan pemanggil
merender teks polos seperti sebelumnya. Kegagalan penyorot **tidak boleh** membuat kode
hilang: kode yang tidak terbaca jauh lebih buruk daripada kode tanpa warna.

**Tidak ada HTML mentah di seluruh jalur ini.** `sorotKode()` mengembalikan **data**
(baris dan potongan), bukan string HTML, dan komponen merendernya sebagai JSX. Jadi
tidak ada `dangerouslySetInnerHTML`. Keputusan ini diambil setelah percobaan pertama
memakai `codeToHtml` dan menemukan bahwa hasilnya `<pre>` utuh — menaruhnya di dalam
`<pre>` React menghasilkan HTML tidak sah.

## Alasan

**Kenapa tidak memakai tema editor bawaan apa adanya.** Tema itu memakai biru, ungu, dan
hijau — palet yang bagus dan sudah teruji, tetapi melanggar aturan warna repo. Menyalin
temanya lalu mengganti warnanya, seperti yang dilakukan di sini, membuat pemetaan scope
TextMate tetap milik tema bawaan (yang sudah benar) sementara paletnya jadi milik kita.
Menulis tema dari nol berarti menuliskan sendiri setiap nama scope, dan nama yang salah
membuat token **diam-diam tidak berwarna** — kegagalan yang tidak melempar error.

**Kenapa engine JavaScript, bukan WASM.** Menambah binary 466 KB yang harus dimuat saat
build, untuk satu bahasa yang hasilnya sama, tidak sebanding. Engine JavaScript juga
menghilangkan satu ketergantungan pada `WebAssembly` di lingkungan build.

**Kenapa di server.** Materi sudah menjadi halaman statis, dan `daftar-kuis.tsx` sudah
menyatakan prinsipnya untuk Markdown: paket berat dirender di server supaya tidak masuk
bundel peramban. Menyorot di klien akan mengirim grammar Python ke setiap pembaca,
termasuk yang tidak membuka Topik ber-kode.

## Konsekuensi

**Yang diterima:**

- **`shiki` 4.5.0 menjadi dependensi permanen** (dipin eksak, mengikuti konvensi repo).
  Ukurannya tidak sampai ke peramban, tetapi menambah waktu build.
- **Paletnya lebih sempit daripada tema editor biasa.** Biru dan hijau memang lebih
  mudah dibedakan; keluarga merah membatasi jarak antar warna. Diukur: palet ini
  mencapai 31,9/33,2 melawan GitHub 28,4, jadi batasannya **tidak** membuatnya lebih
  buruk — tetapi ia tidak punya ruang sebanyak hue penuh kalau kelak ditambah peran
  warna baru.
- **Menambah bahasa baru menambah berat build.** Hanya Python yang dimuat; bahasa lain
  mengembalikan `null` dan memakai fallback.
- **`KuisSiap.kode` berubah tipe** dari `string` menjadi `ReactNode`.

**Yang harus dijaga:**

- **Angka palet harus diukur ulang kalau diubah**, dengan CIE76 — bukan rasio kontras.
  Alasan lengkapnya di atas.
- **`settings` di akar tema tidak boleh diisi.**
- **`kuis.tsx` tidak boleh mengimpor `sorot-kode.ts`** — ia komponen klien.
- **Setiap token `--kode-*` yang dipakai tema harus terdefinisi di `globals.css`.**
  Token yang salah ketik tidak melempar error; ia hanya membuat teks kembali ke warna
  warisan. `tokenWarnaYangDipakai()` ada untuk memeriksanya.

**Verifikasi yang menyertai:**

- **9 uji unit** (`sorot-kode.test.ts`), termasuk: penyorotan tersedia; setiap warna
  adalah token proyek; **kata kunci dan string dapat warna berbeda**; dan yang
  terpenting — **menggabungkan kembali potongan menghasilkan kode asli persis**, yang
  membuktikan penyorotan tidak menghilangkan atau mengubah teks.
- **21 pemeriksaan peramban** (`verifikasi-sorot.mjs`), termasuk: warna benar-benar
  berbeda **dihitung peramban** (5 warna, bukan dibaca dari HTML); warna **berubah**
  antar tema; latar **berubah** antar tema; blok Kuis dan versi English ikut tersorot.
- **Gerbang repo**: 314 uji lulus (naik dari 305), typecheck bersih, build hijau,
  verifikasi-soal 6/6, 89 uji backend, clippy bersih.
- **Nol JavaScript shiki di bundel klien**, diperiksa langsung atas `.next/static`.

## Alternatif yang ditolak

**1. Menyorot di sisi klien.** Ditolak: menambah grammar Python ke bundel peramban,
bertentangan dengan sifat halaman statis dan dengan prinsip yang sudah dinyatakan di
`daftar-kuis.tsx`.

**2. Memakai tema editor bawaan (GitHub light) apa adanya.** Ditolak: memakai biru,
ungu, dan hijau, melanggar aturan satu warna aksen di `design-tree.md` dan ADR-0012.

**3. Menulis tema dari nol.** Ditolak: menuntut menuliskan sendiri setiap nama scope
TextMate, dan nama yang salah membuat token tidak berwarna tanpa error. Mengganti warna
tema bawaan jauh lebih kecil risikonya.

**4. Memakai `codeToHtml` dan `dangerouslySetInnerHTML`.** Ditolak: hasilnya `<pre>`
utuh sehingga menaruhnya di dalam `<pre>` React menghasilkan HTML tidak sah, dan ia
menyalurkan HTML mentah ke React padahal data sudah cukup. `codeToTokens` +
render JSX lebih aman dan markupnya terlihat di komponen.

**5. Oniguruma/WASM.** Ditolak: binary 466 KB untuk satu bahasa, tanpa perbedaan hasil.

**6. Tanpa fallback.** Ditolak: kalau penyorotan gagal, kode harus tetap terbaca.
Kegagalan hiasan tidak boleh menjadi kegagalan isi.

**7. Hanya menyorot Materi, bukan Kuis.** Ditolak: justru blok Kuis yang dibaca untuk
menebak output. Membiarkannya polos sementara Materi berwarna membuat situs terasa
tidak konsisten di tempat yang paling membutuhkannya.

**8. Menyorot blok kode di `kuis.tsx`.** Ditolak: berkas itu komponen klien, jadi
impor penyorot akan masuk ke bundel peramban. Dikerjakan di `daftar-kuis.tsx` (server),
hasilnya menyeberang sebagai ReactNode.

## Sumber

- **Permintaan pemilik, 2026-10-07** — "syntax code itu bisa dibuat berwarna ngga aku
  agak bingung". Empat keputusan (palet, cakupan, sisi server, fallback) jawaban pemilik.
- **`docs/design-tree.md`** Cabang 4 — "Aksen: merah `#e0342b`".
- **ADR-0012** — aksen disetel per tema; "yang mengikat adalah satu warna aksen".
- **`frontend/src/app/[bahasa]/topik/daftar-kuis.tsx`** — prinsip "Markdown dirender di
  server supaya pengurainya tidak masuk bundel klien", yang diikuti keputusan ini.
- **`frontend/src/lib/konten/materi-markdown.tsx`** — komentarnya sudah mengantisipasi
  keputusan ini: "Kalau kelak blok kode butuh penyorotan sintaks, yang berubah hanya
  berkas ini."
- **Dokumentasi Shiki** (`shiki.style`) — `createHighlighterCoreSync`,
  `createJavaScriptRegexEngine`, `codeToTokens`. Diverifikasi dengan menjalankan, bukan
  dari ingatan: bentuk ekspor `@shikijs/langs/python` (array di `.default`),
  `@shikijs/themes/github-light` (objek di `.default`), dan `shiki/wasm`
  (`Uint8Array` 466.610 byte).
- **WCAG 2.1** ambang kontras AA 4,5:1 untuk teks normal.
- **CIE76** (jarak Euclidean di ruang warna CIELAB) untuk jarak perseptual, dengan tema
  GitHub light sebagai acuan praktik.
