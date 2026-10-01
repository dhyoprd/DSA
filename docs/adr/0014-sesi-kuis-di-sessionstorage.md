# Sesi Kuis hidup di `sessionStorage`, dan opsinya disembunyikan sampai sesi itu diketahui

## Status

accepted

## Konteks

Issue #1 sudah menetapkan bahwa pengacakan opsi Kuis harus **deterministik per (Soal,
sesi)** — "sehingga opsi tidak berpindah tempat saat pemelajar mencoba lagi" — dan
bahwa penilaian, pengacakan, pelacakan percobaan, serta aturan Pembahasan-terbuka
adalah **fungsi murni** tanpa React dan tanpa DOM. Ticket #6 membangunnya.

Yang **belum** diputuskan issue #1, dan karena itu harus diputuskan di sini:

1. **Apa itu "sesi".** Kalau sesi berarti "selama halaman ini terbuka", opsi akan
   diacak ulang setiap kali halaman dimuat ulang, dan pemelajar yang mengulang Kuis
   akan melihat opsinya berpindah — persis yang ingin dicegah. Kalau sesi berarti
   "selamanya", urutannya terpaku untuk seterusnya, dan kebiasaan menghafal posisi
   jawaban yang ingin dihilangkan user story 24 justru kembali.
2. **Dari mana benih pengacakan berasal**, karena `Math.random()` dilarang oleh
   syarat "deterministik".
3. **Kapan opsi boleh digambar.** Ini muncul saat implementasi, bukan saat desain.

## Keputusan

**Satu sesi = satu tab peramban**, disimpan di `sessionStorage` dengan kunci
`dsa-id-sesi`. Id dibuat `crypto.randomUUID()` pada kunjungan pertama dan bertahan
sampai tab ditutup. `sessionStorage` — bukan `localStorage` — karena hanya
`sessionStorage` yang hilang saat tab ditutup, dan itulah batas "sekali duduk".

**Benih pengacakan** adalah `slugTopik#indeksSoal#idSesi`, di-hash FNV-1a 32-bit, lalu
dipermutasi Fisher–Yates oleh pembangkit mulberry32. Fungsi murninya ada di
`frontend/src/lib/kuis/acak.ts`; id sesinya di `frontend/src/lib/kuis/sesi.ts`.

**Opsi tidak digambar sampai id sesi sungguhan diketahui.** Komponen merender kotak
opsi dengan tinggi yang sudah disediakan (`min-h-[3rem]`) tetapi tanpa teks, lalu
mengisinya setelah `useSyncExternalStore` menyerahkan id sesi dari peramban.

## Alasan

**Kenapa `sessionStorage`, bukan `localStorage`.** Persis di antara dua ekstrem di
atas. Sekali duduk, opsi tidak berpindah walau halaman dimuat ulang berkali-kali —
syarat yang berbunyi "stabil untuk satu sesi". Besok, saat tab baru dibuka, urutannya
boleh berbeda, sehingga posisi jawaban benar tidak bisa dihafal. `localStorage` akan
mengabadikan satu urutan, dan itu mengembalikan pola yang ingin dihapus.

**Kenapa benih dari identitas, bukan dari `Math.random()`.** `Math.random()`
menghasilkan urutan baru setiap kali dipanggil, sehingga opsi berpindah setiap kali
pemelajar menekan jawaban salah — dan Kuis yang sama akan terasa seperti Kuis berbeda
di setiap percobaan. Benih yang berasal dari (Topik, Soal, sesi) membuat urutan itu
milik Soal tersebut di sesi tersebut, dan tidak berubah selama sesi berlangsung.

**Kenapa opsinya disembunyikan, bukan langsung digambar.** `sessionStorage` hanya ada
di peramban, jadi HTML statis tidak bisa memuat urutan sungguhan. Menggambar urutan
apa adanya berarti urutan YAML sempat terlihat sebelum React hidup dan menggantinya
dengan urutan sesi — diukur pada build produksi, lompatan itu terlihat sekitar 50 ms.
Pemelajar melihat empat baris berpindah tempat persis saat halaman selesai dimuat.
Ini kelas cacat yang sama dengan kedipan tema yang dihindari `skripTema` di
`layout.tsx` (jebakan 24 di handoff). Syaratnya adalah opsi "tidak berpindah tempat",
dan berpindah sekali di awal tetap melanggarnya. Kotak opsinya tetap dirender supaya
tidak ada pergeseran tata letak — CLS terukur 0.

## Konsekuensi

- **"Pembahasan tertutup" adalah aturan tampilan, bukan rahasia.** Karena Materi dan
  Soal hidup di git dan menjadi halaman statis (issue #1, ADR-0003), teks Pembahasan
  dan penanda `benar: true` ikut terkirim di payload RSC halaman — terverifikasi:
  keduanya ada di dalam `<script>` HTML statis, sementara teks yang **terlihat**
  (`innerText`) tidak memuatnya (diperiksa dengan JavaScript diblokir; elemen
  Pembahasan memang tidak dirender selama jawabannya belum benar). Yang dijaga aturan
  ini adalah pemelajar tidak **sengaja** melihat jawaban sebelum mencoba; ia bukan
  perlindungan terhadap orang yang membuka DevTools. **Jangan "memperbaiki" ini dengan
  memindahkan Pembahasan ke backend** — itu memindahkan Soal keluar dari git, dan
  bertentangan dengan ADR-0003, untuk menutup kebocoran yang tidak mengancam siapa pun.
- **Jumlah percobaan hanya hidup selama halaman terbuka.** `percobaan` ada di keadaan
  komponen, jadi ia kembali 0 saat halaman dimuat ulang. Menyimpannya adalah lingkup
  ticket #8 (Progres di backend); di sini ia dihitung dan ditampilkan saja, sesuai
  pembatasan ticket #6.
- **Tanpa JavaScript, opsi tidak tampil.** Materi tetap terbaca (keputusan issue #1),
  skenario dan kerangka kelima Kuis tetap tampil, Pembahasan tetap tertutup, tetapi
  kotak opsinya kosong dan terkunci. Ini diterima: Kuis memang butuh JavaScript untuk
  dinilai, dan menampilkan urutan YAML tanpa bisa dinilai lebih buruk daripada
  menampilkan kotak kosong.
- **`getServerSnapshot` mengembalikan `null`, bukan id sesi.** `null` adalah penanda
  "belum tahu", dan komponen membedakannya dari "sudah tahu". Versi pertama memakai
  string `"sesi-server"`, dan itu cacat: string itu lolos bentuk id yang sah, jadi
  kalau pernah masuk `sessionStorage` ia akan diperlakukan sebagai id sungguhan dan
  seluruh opsi tampil kosong terkunci tanpa cara pulih. `null` tidak bisa bertabrakan
  dengan id mana pun. Kalau kelak ada yang "menyederhanakan" ini menjadi id sungguhan,
  hydration mismatch akan kembali.
- **Mengganti `sessionStorage` dengan `localStorage` adalah satu baris**, dan itu
  justru alasan keputusan ini dicatat: tanpa ADR ini, perubahan itu tampak seperti
  perbaikan kecil, padahal ia membatalkan syarat "stabil untuk satu sesi" dari dua
  arah sekaligus.
- **`subscribe` sengaja kosong.** Id sesi tidak berubah selama satu halaman hidup,
  jadi tidak ada perubahan yang perlu diberitahukan. `getSnapshot` meng-cache id-nya
  supaya `useSyncExternalStore` tidak merender tanpa henti.

## Alternatif yang ditolak

**`Math.random()` untuk mengacak opsi.** Ditolak karena dilarang eksplisit oleh issue
#1, dan karena opsi akan berpindah setiap kali mencoba lagi.

**`localStorage` untuk id sesi.** Ditolak karena mengabadikan satu urutan, sehingga
posisi jawaban benar bisa dihafal — kebalikan dari user story 24.

**Sesi baru setiap kali halaman dimuat.** Ditolak karena muat ulang akan mengacak
ulang, dan itu melanggar "stabil untuk satu sesi".

**Membaca id sesi di `useEffect` lalu menggambar urutan YAML lebih dulu.** Ditolak
karena justru itulah lompatan yang diukur ~50 ms di atas. Efek berjalan setelah cat
pertama, jadi urutan yang salah sempat terlihat.

**Menggambar opsi dengan urutan YAML lalu mengacaknya di klien tanpa menyembunyikan.**
Sama dengan di atas; ditolak dengan alasan yang sama.

**Memindahkan Pembahasan ke backend supaya tidak ikut di payload.** Ditolak: Materi
dan Soal sengaja hidup di git (ADR-0003), dan memindahkan sebagiannya ke database akan
memecah satu sumber kebenaran hanya untuk menutup kebocoran yang tidak mengancam apa
pun. Lihat "Pembahasan tertutup adalah aturan tampilan, bukan rahasia" di Konsekuensi.

## Sumber

- Issue #1 — bagian "Logika Kuis": "Penilaian, pengacakan opsi, pelacakan percobaan,
  dan aturan 'Pembahasan terbuka setelah benar' adalah **fungsi murni** — tanpa React,
  tanpa DOM." dan "Pengacakan opsi bersifat deterministik per (Soal, sesi), sehingga
  opsi tidak berpindah tempat saat pemelajar mencoba lagi."
- Issue #1 — user story 23, 24, 25 (opsi diacak; jawaban benar tidak selalu di posisi
  yang sama; pengacakan stabil untuk satu sesi).
- Issue #6 — kriteria penerimaan "Urutan opsi diacak, dan stabil untuk satu sesi".
- `docs/design-tree.md`, Cabang 1 — "Jawaban salah: boleh coba lagi sampai benar.
  Pembahasan hanya terbuka setelah benar."
- MDN, `Window.sessionStorage` — penyimpanan yang lingkupnya satu tab dan bertahan
  melewati muat ulang, hilang saat tab ditutup.
  https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
- React, `useSyncExternalStore` — pola `getServerSnapshot` untuk nilai yang hanya ada
  di peramban, supaya render server dan hidrasi sepakat.
  https://react.dev/reference/react/useSyncExternalStore
