/**
 * Mengacak urutan opsi Kuis, secara **deterministik**.
 *
 * Kenapa bukan `Math.random()`. Issue #1 menetapkan pengacakan "deterministik per
 * (Soal, sesi)": urutan opsi harus **sama** setiap kali pemelajar mencoba Kuis yang
 * sama di sesi yang sama. Dengan `Math.random()`, opsi berpindah tempat setiap kali
 * ia menekan jawaban salah — dan Kuis yang sama akan terasa seperti Kuis berbeda di
 * setiap percobaan. Benih (seed) karena itu berasal dari identitas Soal dan id sesi,
 * bukan dari keacakan mesin.
 *
 * Dua hal yang dihasilkan modul ini, dan keduanya harus sepakat:
 *
 * - [`benihOpsi`] — apa yang membuat sebuah urutan "milik Soal ini di sesi ini".
 * - [`urutanTeracak`] — permutasi indeks untuk benih apa pun.
 *
 * Modul ini murni: masukannya teks dan angka, keluarannya daftar angka. Tidak
 * menyentuh DOM, React, maupun `Math.random`, sehingga hasilnya bisa diuji dengan
 * membandingkan dua pemanggilan — bukan dengan mengasumsikan.
 *
 * ADR-0004 mencatat bahwa mesin Kuis dibangun sendiri. Berkas ini adalah bagian
 * "pengacakan" dari mesin itu.
 */

/**
 * Benih untuk opsi sebuah Soal.
 *
 * Ketiga bagian dipisah `#`. Pemisah itu perlu karena tanpa pemisah, (`stack`, `1`,
 * `23`) dan (`stack`, `12`, `3`) akan menghasilkan benih yang sama. Aman dipakai di
 * sini: `slug` hanya berisi huruf, angka, dan tanda hubung, sementara id sesi dibuat
 * dari UUID — tidak ada yang bisa memuat `#`.
 *
 * `indeksSoal` adalah posisi Soal di dalam `topik.soal` (0–5), bukan posisi di
 * antara Kuis saja. Dengan begitu setiap Soal punya benih sendiri, termasuk Soal
 * Kode di indeks 5 kalau kelak ia ikut diacak.
 */
export function benihOpsi(slugTopik: string, indeksSoal: number, idSesi: string): string {
  return `${slugTopik}#${String(indeksSoal)}#${idSesi}`;
}

/**
 * Hash FNV-1a 32-bit.
 *
 * Tugasnya satu: mengubah benih teks menjadi satu angka, supaya benih yang mirip
 * ("stack#0#abc" dan "stack#1#abc") menghasilkan urutan yang tidak mirip. Tanpa
 * langkah ini, seluruh Kuis pada satu Topik akan teracak dengan cara yang sama — dan
 * jawaban benar mendarat di posisi yang sama di kelima Kuis, persis pola posisi yang
 * ingin dihilangkan user story 24.
 */
function hash32(teks: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < teks.length; i += 1) {
    h ^= teks.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Pembangkit bilangan acak mulberry32.
 *
 * Dipilih karena pendek, tidak butuh pustaka, dan sebarannya lebih dari cukup untuk
 * mengacak empat opsi. Ini **bukan** pembangkit kriptografis, dan memang tidak
 * perlu: yang diacak adalah urutan pilihan jawaban, bukan rahasia.
 */
function pembangkitAcak(benih: number): () => number {
  let a = benih >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Permutasi `0..jumlah-1` untuk sebuah benih, dengan algoritma Fisher–Yates.
 *
 * Mengembalikan **indeks asli** dalam urutan tampil, bukan nilai opsinya. Pemisahan
 * itu disengaja: pemanggil yang menerjemahkan urutan ini ke teks opsi, sehingga modul
 * ini tidak perlu tahu bentuk `OpsiKuis`.
 *
 * Benih yang sama selalu menghasilkan urutan yang sama. Itulah kontraknya, dan itu
 * yang diuji `acak.test.ts`.
 */
export function urutanTeracak(jumlah: number, benih: string): number[] {
  const urut = Array.from({ length: jumlah }, (_, i) => i);
  const acak = pembangkitAcak(hash32(benih));

  for (let i = urut.length - 1; i > 0; i -= 1) {
    const j = Math.floor(acak() * (i + 1));
    const sementara = urut[i];
    urut[i] = urut[j];
    urut[j] = sementara;
  }

  return urut;
}
