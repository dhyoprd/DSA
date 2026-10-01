# Aksen merah disetel per tema agar lulus kontras, menyimpang dari design-tree.md

## Status

accepted

## Konteks
`docs/design-tree.md`, Cabang 4, menetapkan aksen **merah `#e0342b`** sebagai satu-satunya
warna aksen situs. Ticket #5 meminta aksen itu dipakai sebagai bagian dari sistem desain,
dengan syarat tambahan "merah adalah satu-satunya warna aksen".

Saat token #5 disusun, kontras `#e0342b` diukur terhadap latar kedua tema:

| Latar | Rasio kontras | Ambang WCAG AA teks normal |
|---|---|---|
| `#ffffff` (terang) | 4,47:1 | 4,50:1 — **gagal** |
| `#0a0a0a` (gelap) | 4,43:1 | 4,50:1 — **gagal** |

Aksen ini bukan hiasan: ia mewarnai **tautan di dalam Materi**, **tombol utama** (Simpan
token), dan **penanda Progres** (◐ ●). Ketiganya adalah teks atau kontrol yang harus
terbaca, bukan elemen dekoratif. Materi adalah hal yang dibaca berjam-jam, dan tautan di
dalamnya adalah satu-satunya cara berpindah di antara Topik.

Jadi keputusan yang dihadapi: pertahankan nilai persis dari `design-tree.md` dan terima
kegagalan kontras, atau setel nilainya dan tandai penyimpangannya.

## Keputusan

Hue merah dipertahankan, tetapi **nilainya berbeda antara tema terang dan gelap**:

- Terang — `#c9302a` (kontras 5,33:1 di atas `#ffffff`)
- Gelap — `#ff5f52` (kontras 6,61:1 di atas `#0a0a0a`)

Keduanya tetap **satu warna aksen**, bukan dua aksen yang berbeda: yang berubah hanya
gelap-terangnya, mengikuti latar tema. Ini pola yang sama dengan token lain di
`globals.css` — `--color-fg`, `--color-muted`, dan `--color-border` juga bernilai
berbeda per tema.

Token ini hidup di `frontend/src/app/globals.css` sebagai `--color-accent`, dengan
`light-dark()` yang memilih nilainya.

## Alasan

**Aksesibilitas mengalahkan ketetapan nilai.** `design-tree.md` menetapkan *warna*
(merah), bukan angka yang tidak boleh berubah. Yang mengikat adalah "satu warna aksen",
dan itu tetap dipatuhi. Sebaliknya, angka `#e0342b` yang dipertahankan akan membuat
tautan Materi gagal ambang AA di kedua tema — dan kegagalannya tidak terlihat: tidak ada
yang error, hanya teks yang lebih sulit dibaca, terutama di layar HP dengan cahaya sekitar.

**Ambang AA adalah lantai, bukan target.** 4,47:1 dan 4,43:1 hanya meleset tipis. Itu
justru alasan untuk memperbaikinya sekarang: perbaikan kecil, dan setelah itu seluruh
sistem desain berdiri di atas lantai yang benar. Membiarkannya berarti setiap token baru
yang dibangun di atas aksen ini mewarisi masalah yang sama.

**Hue-nya nyaris tidak berubah.** `#c9302a` dan `#ff5f52` adalah merah yang sama;
`#c9302a` adalah versi lebih gelap untuk latar putih, `#ff5f52` versi lebih terang untuk
latar hitam. Pada tema gelap, `#e0342b` tampak kusam — menaikkannya ke `#ff5f52` justru
membuatnya lebih hidup, bukan lebih pucat.

## Konsekuensi

- **`docs/design-tree.md` Cabang 4 tidak lagi akurat apa adanya** untuk nilai aksen.
  Dokumen itu menyebut `#e0342b`; nilai yang berlaku sekarang ada di ADR ini dan di
  `globals.css`. Cabang 4 sengaja **tidak** disunting, supaya keputusan aslinya tetap
  terlihat dan penyimpangannya bisa ditelusuri. Ini mengikuti aturan `CLAUDE.md`: kalau
  menyimpang dari keputusan yang sudah dicatat, tandai eksplisit — jangan diam-diam.
- **Token baru `--color-accent-fg`.** Karena aksennya berbalik antara gelap dan terang,
  warna teks di atasnya juga harus berbalik: putih di tema terang, hampir hitam di tema
  gelap. `token-form.tsx` yang sebelumnya menulis `color: "white"` sekarang memakai token
  ini. Tanpa itu, teks putih di atas `#ff5f52` hanya mencapai 2,8:1.
- **Kontras aksen TIDAK dijaga uji otomatis.** `tema.test.ts` menguji pemetaan pilihan
  ke atribut, bukan warnanya — tidak ada uji yang membaca `#c9302a` dari CSS dan
  menghitung rasionya. Rasio di tabel atas diverifikasi sekali terhadap peramban
  sungguhan (Chromium, lewat `getComputedStyle`) saat ticket ini dikerjakan, dan
  setelah itu tidak ada yang menjaganya. **Kalau aksennya diubah lagi, kedua rasio itu
  harus dihitung ulang dengan tangan** — tidak ada yang akan gagal untuk mengingatkan.
  Menambahkan uji kontras otomatis sengaja tidak dilakukan sekarang: ia menuntut
  pem-parse CSS atau peramban di dalam suite Node, dan itu beban yang belum sebanding
  untuk dua nilai yang jarang berubah.
- **`--color-muted` di tema terang juga disetel**, dari `#6b7280` (4,83:1) ke `#5c6370`
  (6,05:1). Ini bukan kegagalan ambang seperti aksen — 4,83:1 sudah lulus — tetapi teks
  sekunder yang dipakai untuk meta dan label pantas punya margin lebih dari 0,33 di atas
  ambang. Nilai tema gelap tidak berubah.

## Alternatif yang ditolak

**Pertahankan `#e0342b` persis.** Ditolak karena gagal AA di kedua tema pada teks normal.
Lolos untuk teks besar (≥18,66px bold), tetapi tautan Materi dan tombol bukan teks besar.

**Satu nilai yang lulus di kedua tema** (mis. `#c9302a` untuk keduanya). Ditolak karena
`#c9302a` di atas `#0a0a0a` hanya mencapai 3,44:1 — merah gelap tenggelam di latar gelap.
Satu nilai memaksa memilih tema mana yang dikorbankan.

**Mengganti merah dengan warna lain yang kontrasnya lebih mudah.** Ditolak: merah sudah
ditetapkan `design-tree.md`, dan masalahnya bukan pilihan warna melainkan nilainya.

## Sumber

- `docs/design-tree.md`, Cabang 4 — "Aksen: merah `#e0342b`" dan "Tema: dua mode (terang
  + gelap) dengan pengalih, default mengikuti sistem".
- Issue #5, kriteria penerimaan — "Merah adalah satu-satunya warna aksen", "Halaman Topik
  tampil benar di kedua tema".
- WCAG 2.2, Success Criterion 1.4.3 (Contrast Minimum) — ambang 4,5:1 untuk teks normal,
  3:1 untuk teks besar. https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- Rasio kontras dihitung dengan rumus luminansi relatif WCAG 2.2, dan diverifikasi ulang
  terhadap peramban sungguhan (Chromium) dengan nilai `getComputedStyle` — bukan dari
  nilai yang ditulis di CSS.
