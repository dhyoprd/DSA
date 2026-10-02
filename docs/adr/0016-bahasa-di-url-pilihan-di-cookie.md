# Bahasa hidup di segmen URL, pilihan diingat lewat cookie

## Status

accepted

## Konteks

Issue #1 sudah menetapkan bahwa Materi ditulis dua bahasa dalam objek `{ id, en }`,
dan bahwa **"Pengalih bahasa menukar keduanya"** (user story 9), dengan **"pilihan
bahasa saya diingat"** (user story 10). `docs/design-tree.md` menambahkan bahwa
antarmuka juga punya pengalih bahasa, dan user story 66 meminta antarmuka berbahasa
Indonesia.

Yang **belum** diputuskan issue #1, dan karena itu harus diputuskan di ticket #12:

1. **Di mana bahasa yang berlaku disimpan.** Ia bisa hidup di cookie/localStorage saja
   (tanpa jejak di URL), atau menjadi bagian alamat halaman.
2. **Bagaimana halaman yang belum menyebut bahasa dialihkan** ke bahasa yang diingat.
3. **Apa yang terjadi pada halaman statis.** Issue #1 dan ADR-0003 menetapkan Materi
   dibaca saat build dan menjadi halaman statis. Bahasa yang datang dari penyimpanan
   peramban tidak bisa dibaca saat build, jadi pilihan mekanisme menentukan apakah
   sifat statis itu bertahan.

## Keputusan

**Bahasa yang berlaku datang dari segmen URL pertama**, `/[bahasa]/...` — `/id/topik/stack`
dan `/en/topik/stack` adalah dua halaman yang berbeda. Segmen bahasa berada di **atas
root layout** (`app/[bahasa]/layout.tsx`), sehingga `<html lang>` diisi bahasa yang
sebenarnya. Bahasa yang tidak sah dibalas `404` lewat `dynamicParams = false`.

**Pilihan pemakai diingat di cookie `dsa-bahasa`**, dan `src/proxy.ts` memakainya untuk
mengalihkan permintaan yang **belum** berbahasa (`/`, `/topik/stack`) ke
`/<bahasa>...` dengan status `307`. Bahasa bawaan adalah `id`.

**Cookie diselaraskan dengan bahasa yang sedang dilihat, bukan hanya yang dipilih lewat
tombol.** Pengalih bahasa menulisnya saat tautan ditekan; komponen itu juga
menuliskannya sekali saat dipasang, sehingga membuka alamat berbahasa secara langsung
(tautan yang disimpan atau dikirim ke perangkat lain) tetap memperbarui pilihan. Jadi
"pilihan diingat" berarti **bahasa yang terakhir dilihat**.

**Teks antarmuka hidup di `src/lib/bahasa/kamus.ts`** sebagai satu kamus per bahasa,
dengan tipe `Record<Bahasa, Kamus>` supaya TypeScript menolak kamus yang tidak lengkap.

## Alasan

**Kenapa bahasa di URL, bukan hanya di penyimpanan.** Tiga alasan, berurutan menurut
kepentingannya:

1. **Materi tetap halaman statis.** Keputusan issue #1 dan ADR-0003 adalah Materi
   dibaca saat build. Kalau bahasa hanya hidup di cookie, halaman harus dirender ulang
   per permintaan untuk memilih versi bahasanya — itu membatalkan sifat statis, satu
   dari sedikit jaminan yang sudah dipegang repo ini. Dengan bahasa di URL, build
   menghasilkan `/id/...` dan `/en/...` sekaligus, keduanya statis.
2. **Tautannya bisa dibagikan tanpa kehilangan bahasa.** Satu pengguna, tetapi ia
   belajar di laptop dan HP (user story 10 menyebut "diingat"). Alamat yang membawa
   bahasanya membuat satu perangkat bisa membuka tautan yang dikirim perangkat lain
   dan mendarat di bahasa yang sama.
3. **`<html lang>` yang benar.** Bahasa yang datang dari peramban tidak diketahui
   server saat merender HTML pertama, sehingga `lang` harus ditebak — dan pembaca layar
   serta mesin pencari membaca bahasa yang salah untuk separuh halaman.

**Kenapa cookie, bukan `Accept-Language`.** Header itu menyampaikan bahasa yang
**dipahami** peramban, bukan bahasa yang **dipilih** pemakai di situs ini. Pemakai
yang memilih English di HP berbahasa Indonesia harus tetap mendapat English.

**Kenapa `307`, bukan `308`.** Pilihan bahasa bisa berubah. Pengalihan permanen akan
di-cache peramban, sehingga memilih Indonesia lalu membuka `/` tetap membawa ke English.

**Kenapa root layout di dalam `[bahasa]`, bukan `app/layout.tsx`.** `<html>` hanya
boleh ditulis satu tempat, dan `lang`-nya butuh `params.bahasa`. Root layout di luar
segmen tidak melihat parameter itu.

## Konsekuensi

- **Setiap tautan internal harus menyebut bahasa.** `Sidebar` dan beranda menyusun
  `/${bahasa}/topik/...`, dan pengalih bahasa menyusun ulang pathname yang sama dengan
  bahasa lain. Tautan yang lupa menyebut bahasa akan dialihkan `proxy.ts` ke bahasa
  cookie — benar, tetapi lewat satu putaran ekstra.
- **`proxy.ts` berjalan pada setiap permintaan yang tidak cocok `_next`/`api`.** Ia
  hanya membaca satu cookie dan membandingkan segmen pertama; biayanya kecil, tetapi
  ia bukan nol, dan itulah harga sifat statis per bahasa.
- **Konten yang belum diterjemahkan menggagalkan build.** Kriteria penerimaan 5. Ini
  sudah berlaku sejak #3 untuk `judul`, `materi`, dan `skenario`; ticket #12 menambah
  uji untuk `opsi.teks` dan `penjelasan`, supaya tidak ada field dwibahasa yang lolos
  dengan satu bahasa.
- **`api.ts` menerima kamus sebagai argumen wajib.** Pesan galat di sana adalah kalimat
  yang dibaca pemakai, dan modul itu tidak tahu bahasa apa yang berlaku. Cadangan
  bahasa bawaan sengaja **tidak** diberikan: itu akan membuat halaman English
  diam-diam menampilkan galat Indonesia.
- **Menambah bahasa ketiga mengubah satu tempat.** `BAHASA` di `bahasa.ts`. Layout
  membaca daftar itu untuk `generateStaticParams`, dan `proxy.ts` membaca aturan
  "bahasa sah" dari fungsi yang sama.
- **Halaman 404 memakai `global-not-found.tsx`, dan bahasanya bahasa bawaan.** Ini
  konsekuensi langsung dari "root layout di dalam segmen dinamis", dan regresi yang
  harus dikembalikan: sebelum #12, root layout lama membungkus 404 sehingga ia
  bergaya dan ber-`lang="id"`. Setelah root layout pindah, 404 tampil sebagai `<html>`
  polos. Dua penempatan `not-found.tsx` dicoba dan keduanya gagal (terverifikasi
  dengan build produksi): di dalam `[bahasa]` ia menerima `params` `undefined` dan
  menggagalkan prerender, atau dirender di luar root layout sebagai
  `<html id="__next_error__">`; di akar `app/` ia tidak bisa ada karena root
  layout-nya di dalam segmen. `global-not-found.tsx` adalah konvensi yang dibuat
  Next.js untuk persis kasus ini. Bahasanya tetap bahasa bawaan — tidak lebih buruk
  daripada sebelum #12, dan mengejarnya akan menuntut root layout keluar dari segmen
  bahasa, yang membatalkan keputusan ini. Fiturnya eksperimental, jadi dinyalakan
  lewat `experimental.globalNotFound`.

## Alternatif yang ditolak

**Bahasa hanya di cookie, tanpa segmen URL.** Ditolak karena membatalkan halaman
statis (lihat alasan pertama). Ia juga membuat `lang` harus ditebak di server.

**Bahasa hanya di URL, tanpa cookie.** Ditolak karena membuka `/` akan selalu jatuh ke
bahasa bawaan, sehingga user story 10 ("pilihan bahasa diingat") tidak terpenuhi.

**Menebak bahasa dari `Accept-Language` sebagai cadangan.** Ditolak: menyampaikan
kemampuan peramban, bukan pilihan pemakai, dan hasilnya bisa berbeda dari yang
diminta. Bahasa bawaan yang tetap lebih jujur daripada tebakan.

**Menyimpan bahasa di `localStorage`.** Ditolak karena hanya cookie yang ikut terkirim
pada permintaan halaman, dan pengalihan `/` harus diputuskan **di server** sebelum
halaman dirender. `localStorage` hanya terbaca di peramban, jadi pengalihan akan
terjadi setelah halaman tampil — dengan kedipan bahasa.

**Menulis cookie lewat `Set-Cookie` di `proxy.ts`.** Sempat dicoba, lalu dibatalkan:
halaman Topik statis dan di-cache CDN, sehingga `Set-Cookie` pada responsnya berisiko
disimpan cache dan disajikan ke kunjungan yang tidak seharusnya menerimanya. Cookie
diselaraskan di peramban (komponen pengalih bahasa) sebagai gantinya — lihat
"Keputusan". Menulisnya di klien menghindari seluruh kelas masalah cache itu, dengan
harga satu `useEffect` yang tidak dapat diuji tanpa peramban (diverifikasi dengan
Playwright, bukan unit test).

**Menerjemahkan Materi di sisi klien saat pemakai menekan tombol.** Ditolak: itu
mengirim kedua bahasa ke setiap halaman, menggandakan bobot, dan tetap memaksa
`lang` ditebak.

## Sumber

- Issue #1 — "Materi dalam dua bahasa — Indonesia dan English — dengan istilah teknis
  tetap English. Pengalih bahasa menukar keduanya."; user story 8, 9, 10, 66.
- Issue #1 — "Materi dan Soal hidup di git, dibaca saat build, dan menjadi halaman
  statis. Tidak melalui backend."
- Issue #12 — kriteria penerimaan: Materi, Kuis, dan tampilan situs bisa dialihkan;
  pilihan bahasa diingat; Topik dengan terjemahan belum lengkap tidak lolos build.
- ADR-0003 — Materi di git, Catatan di database.
- Next.js, *Internationalization* — root layout di `app/[lang]`, `generateStaticParams`
  untuk rute berbahasa.
  https://nextjs.org/docs/app/guides/internationalization
- Next.js, *proxy.ts* — penggantian konvensi `middleware` di Next.js 16, membaca cookie
  lewat `request.cookies`, dan `NextResponse.redirect`.
  https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- MDN, `Document.cookie` dan atribut `SameSite`/`Max-Age`.
  https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie
