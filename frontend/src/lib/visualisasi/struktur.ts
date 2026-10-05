/**
 * Model Visualisasi: langkah-langkah, dan isi struktur setelah tiap langkah.
 *
 * **Apa yang dihitung di sini.** Sebuah Visualisasi adalah daftar `Langkah` (mis.
 * `push 1`, `pop`). Modul ini menjawab satu pertanyaan: **setelah `n` langkah
 * dijalankan, apa isi strukturnya?** Itu satu-satunya aturan yang membuat animasinya
 * benar atau salah — kalau `pop` mengambil dari ujung yang keliru, Stack terlihat
 * seperti Queue, dan pemelajar menghafal aturan yang salah tanpa satu pun error
 * muncul. Karena itu aturannya hidup di sini, di luar React, tempat ia bisa diuji
 * langsung dengan `node --test`.
 *
 * **Modul murni.** Masukannya nilai biasa, keluarannya nilai biasa. Tidak menyentuh
 * DOM, React, maupun pustaka animasi. Komponen yang memakainya hanya menggambar
 * hasilnya.
 *
 * **Istilah.** `jenis` memakai nama teknis strukturnya (`"stack"`, `"queue"`),
 * sama dengan `slug` Topik di `content/` dan dengan istilah English di `CONTEXT.md`.
 * Kata Indonesia-nya — Tumpukan, Antrean — adalah urusan tampilan, dan itu ada di
 * kamus, bukan di sini.
 */

/** Struktur yang bisa divisualisasikan. */
export type JenisStruktur = "stack" | "queue";

/**
 * Satu langkah yang bisa dijalankan pada struktur.
 *
 * `nilai` hanya ada pada `push`, dan bertipe `number` karena Visualisasi Stack
 * memakai angka sebagai penanda urutan. Nilai berjenis lain (teks, objek) tidak
 * menambah pemahaman tentang mekanismenya, dan angka lebih mudah dibaca sekilas di
 * kotak yang kecil.
 */
export type Langkah = { operasi: "push"; nilai: number } | { operasi: "pop" };

/**
 * Satu kotak di dalam struktur.
 *
 * `id` adalah **nomor urut penyisipan**, dan ia sengaja bukan indeks posisi. React
 * memakai `id` sebagai `key`, dan pustaka animasi memakai perubahan posisi antar
 * render untuk menggeser kotak. Kalau `key`-nya indeks posisi, `pop` di ujung depan
 * Queue akan membuat React menganggap seluruh kotak **diganti** — animasinya jadi
 * pudar-muncul semua, bukan bergeser satu langkah, dan justru pergeseran itulah yang
 * menerangkan cara kerja Queue. Nomor urut penyisipan tidak pernah dipakai ulang,
 * jadi identitas sebuah kotak tetap sama sejak ia masuk sampai ia keluar.
 */
export interface Sel {
  id: number;
  nilai: number;
}

/** Isi struktur pada satu titik waktu. */
export interface Keadaan {
  /** Kotak yang sedang ada, urut dari ujung masuk ke ujung keluar. */
  sel: Sel[];
  /** Langkah yang baru saja dijalankan, atau `null` kalau belum ada langkah. */
  terakhir: Langkah | null;
  /**
   * Nilai yang keluar pada langkah terakhir, atau `null`.
   *
   * Terpisah dari `terakhir` karena "pop" saja tidak menyebut **nilai apa** yang
   * keluar — dan nilai itulah yang menerangkan aturan LIFO/FIFO. Untuk `push`,
   * nilainya sudah ada di `terakhir.nilai`.
   */
  keluar: number | null;
}

/** Keadaan sebelum langkah pertama: kosong, belum ada apa pun. */
export function keadaanAwal(): Keadaan {
  return { sel: [], terakhir: null, keluar: null };
}

/**
 * Isi struktur setelah `indeks` langkah pertama dijalankan.
 *
 * `indeks` adalah **jumlah langkah yang sudah dijalankan**, bukan posisi langkah yang
 * sedang disorot: `0` berarti belum ada yang dijalankan (struktur kosong), dan
 * `langkah.length` berarti semuanya sudah. Nilai di luar rentang dijepit ke rentang
 * yang sah, sehingga komponen pemanggil tidak perlu menjaganya sendiri — dan tombol
 * "maju" yang tertekan sekali terlalu banyak tidak bisa menghasilkan keadaan yang
 * tidak terdefinisi.
 *
 * **Ujung yang diambil `pop`** adalah satu-satunya tempat `jenis` berpengaruh: Stack
 * mengambil dari ujung **akhir** (yang terakhir masuk), Queue dari ujung **depan**
 * (yang pertama masuk). Itulah LIFO dan FIFO, dan itu sebabnya kedua struktur ini
 * digambar berbeda walaupun isinya sama.
 *
 * `push` selalu menambah di ujung akhir untuk keduanya. Pada Queue ujung akhir itu
 * berarti **belakang**, dan pada Stack berarti **atas** — perbedaan penamaannya
 * adalah urusan tampilan, bukan urusan model.
 */
export function keadaanPada(
  langkah: Langkah[],
  indeks: number,
  jenis: JenisStruktur,
): Keadaan {
  const batas = Math.max(0, Math.min(indeks, langkah.length));

  let sel: Sel[] = [];
  let berikutId = 0;
  let terakhir: Langkah | null = null;
  let keluar: number | null = null;

  for (let i = 0; i < batas; i += 1) {
    const satu = langkah[i];
    // `i < batas <= langkah.length`, jadi `satu` selalu ada; penjagaan ini hanya
    // untuk memuaskan pemeriksa tipe tanpa menambahkan percabangan yang tidak
    // mungkin dijalankan.
    if (satu === undefined) break;

    terakhir = satu;
    keluar = null;

    if (satu.operasi === "push") {
      sel = [...sel, { id: berikutId, nilai: satu.nilai }];
      berikutId += 1;
      continue;
    }

    // `pop` pada struktur kosong tidak mengeluarkan apa pun. Data Visualisasi yang
    // dikirim tidak pernah melakukannya — ada uji yang menjaganya — tetapi fungsi
    // ini tetap tidak boleh melempar: halaman harus tetap bisa dibuka.
    if (sel.length === 0) continue;

    const posisi = jenis === "stack" ? sel.length - 1 : 0;
    const diambil = sel[posisi];
    if (diambil === undefined) continue;

    keluar = diambil.nilai;
    sel = sel.filter((_, urutan) => urutan !== posisi);
  }

  return { sel, terakhir, keluar };
}

/**
 * Apakah seluruh langkah sudah dijalankan.
 *
 * Dipakai tombol "maju" dan pemutar otomatis untuk tahu kapan harus berhenti, dan
 * `putar` untuk tahu kapan harus mengulang dari awal. Ia hidup di sini, bukan ditulis
 * ulang di komponen, supaya "kapan selesai" hanya punya satu definisi.
 */
export function diUjung(langkah: Langkah[], indeks: number): boolean {
  return indeks >= langkah.length;
}

/**
 * Jumlah kotak terbanyak yang pernah ada sekaligus.
 *
 * Dipakai komponen untuk **menyediakan ruang** bagi kotak sebanyak itu sejak awal.
 * Tanpa itu, wadahnya tumbuh setiap kali `push` dan menyusut setiap kali `pop`, dan
 * seluruh isi halaman di bawahnya ikut bergeser naik-turun — persis pergeseran tata
 * letak yang dihindari di tempat lain di repo ini. Mengukur ruang dari data, bukan
 * dari angka yang ditulis tangan, supaya menambah langkah tidak diam-diam membuat
 * wadahnya terlalu pendek.
 *
 * Ia menjawab pertanyaan tentang **urutan langkah**, bukan tentang tampilan, jadi
 * tempatnya di sini — dan bisa diuji tanpa merender apa pun.
 */
export function puncakSel(langkah: Langkah[]): number {
  let isi = 0;
  let puncak = 0;

  for (const satu of langkah) {
    if (satu.operasi === "push") {
      isi += 1;
      puncak = Math.max(puncak, isi);
    } else {
      // `pop` pada struktur kosong tidak mengurangi apa pun; itu menjaga fungsi ini
      // tetap benar walau data langkahnya belum tentu sah.
      isi = Math.max(0, isi - 1);
    }
  }

  return puncak;
}

