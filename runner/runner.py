#!/usr/bin/env python3
"""Runner Eksekusi Kode.

Menerima satu pekerjaan sebagai JSON di stdin, menjalankan kode pemelajar terhadap
test case-nya, lalu menulis **satu baris JSON** ke stdout. Protokolnya sengaja
sempit: satu berkas masuk, satu berkas keluar, tanpa jaringan dan tanpa berkas
perantara — sehingga kontainer ini bisa dipanggil dari mana saja, termasuk dari
gerbang build yang memeriksa solusi referensi.

    stdin  : {"kode": str, "fungsi": str, "test_case": [{"argumen": [...],
              "diharapkan": ...}, ...]}
    stdout : {"status": str, "kasus": [...], "keluaran": str, "pesan": str|null}

**Kenapa `keluaran` (stdout pemelajar) ditangkap, bukan dibiarkan lewat.**
stdout dipakai untuk protokol: kalau `print` pemelajar ikut mengalir ke sana, JSON
balasannya rusak dan backend tidak bisa membacanya. Karena itu seluruh stdout
pemelajar dialihkan ke penyangga, lalu dikembalikan sebagai field `keluaran` supaya
pemelajar tetap bisa melihat apa yang ia cetak.

**Batas waktu TIDAK ditegakkan di sini.** Proses Python yang berputar tanpa henti
tidak bisa menghentikan dirinya sendiri dengan andal, dan penghentian dari dalam
(detik/thread) mudah dilewati kode yang memblokir di level C. Yang mematikan adalah
pihak luar: backend menghancurkan kontainer setelah batas waktu. Itu juga yang
dijanjikan `docs/design-tree.md` untuk produksi ("batas waktu yang menghancurkan
Machine"), jadi bentuk lokal dan produksi menegakkan batas dengan cara yang sama.

Status yang mungkin:
  - "ok"            : pekerjaan selesai dinilai (lihat `lulus` per kasus).
  - "galat-sintaks" : kode tidak bisa dikompilasi. Dibedakan dari "lewat-waktu"
                      supaya pesannya jelas berbeda (kriteria penerimaan #10).
  - "galat-jalan"   : kode gagal saat dijalankan di tingkat teratas, atau fungsi
                      yang diminta tidak ada.
"""

import io
import json
import sys
import traceback

# Batas panjang nilai yang dikembalikan per kasus dan untuk keluaran pemelajar.
# Tanpa ini, satu `print` raksasa atau nilai balik yang sangat panjang membuat
# balasan membengkak sampai backend kehabisan memori — persis kelas kegagalan yang
# batas ukuran kode dimaksudkan untuk mencegah, hanya lewat pintu lain.
BATAS_TEKS = 4000


def potong(teks: str) -> str:
    """Potong teks yang terlalu panjang, dan tandai bahwa ia dipotong."""
    if len(teks) <= BATAS_TEKS:
        return teks
    sisa = len(teks) - BATAS_TEKS
    return teks[:BATAS_TEKS] + f"… (dipotong {sisa} karakter)"


def sama(a, b) -> bool:
    """Bandingkan nilai hasil dengan nilai yang diharapkan.

    Aturannya mengikuti cara JSON memandang tipe, bukan `==` Python:

    - `bool` dibedakan dari angka. Di Python `True == 1`, tetapi jawaban yang
      mengembalikan `1` untuk pertanyaan "apakah kosong?" jelas salah. Menyamakan
      keduanya membuat test case lolos tanpa kode yang benar.
    - `int` dan `float` dianggap sama. JSON tidak membedakan keduanya, dan YAML `1`
      bisa datang sebagai `1.0` di sisi Python tanpa ada yang salah.
    - `list` dan `dict` dibandingkan isinya, bukan identitasnya.
    """
    if isinstance(a, bool) or isinstance(b, bool):
        return isinstance(a, bool) and isinstance(b, bool) and a == b

    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return a == b

    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(sama(x, y) for x, y in zip(a, b))

    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(sama(a[k], b[k]) for k in a)

    return a == b


def tampilkan(nilai):
    """Ubah nilai apa pun menjadi sesuatu yang bisa diserialkan JSON.

    Nilai balik pemelajar bisa berupa apa saja — `set`, objek kelasnya sendiri,
    iterator. Yang dibutuhkan di sini hanya **tampilan**-nya; perbandingan sudah
    selesai sebelum ini. Karena itu nilai yang tidak dikenal dikembalikan sebagai
    `repr`-nya, bukan membuat seluruh balasan gagal diserialkan.

    Teks dipotong di sini, bukan setelahnya: `hasil` bisa berupa string sepanjang
    apa pun, dan string itulah yang paling mudah membuat balasan membengkak. Memotong
    di titik ini menjangkau teks bersarang di dalam list/dict sekaligus.
    """
    if nilai is None or isinstance(nilai, (bool, int, float)):
        return nilai
    if isinstance(nilai, str):
        return potong(nilai)
    if isinstance(nilai, (list, tuple)):
        return [tampilkan(x) for x in nilai]
    if isinstance(nilai, dict):
        return {str(k): tampilkan(v) for k, v in nilai.items()}
    return potong(repr(nilai))


def jawab(balasan: dict) -> None:
    """Tulis balasan sebagai satu baris JSON ke stdout sungguhan.

    Dipisah sebagai fungsi supaya tidak ada jalur yang menulis ke stdout selain
    lewat sini — begitu satu `print` lolos, protokolnya rusak.
    """
    sys.stdout.write(json.dumps(balasan, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def jalankan(pekerjaan: dict) -> dict:
    kode = pekerjaan["kode"]
    nama_fungsi = pekerjaan["fungsi"]
    test_case = pekerjaan["test_case"]

    # Kompilasi lebih dulu, terpisah dari eksekusi. `SyntaxError` adalah kesalahan
    # yang paling sering dilakukan pemelajar, dan ia harus terbaca sebagai kesalahan
    # sintaks — bukan sebagai kode yang "gagal berjalan".
    try:
        kode_terkompilasi = compile(kode, "<kode pemelajar>", "exec")
    except SyntaxError as galat:
        baris = f" (baris {galat.lineno})" if galat.lineno else ""
        return {
            "status": "galat-sintaks",
            "kasus": [],
            "keluaran": "",
            "pesan": f"{galat.msg}{baris}",
        }

    # Seluruh stdout dan stderr pemelajar dialihkan ke penyangga, dan pengalihan itu
    # **mencakup pemanggilan fungsi**, bukan hanya `exec`. Versi pertama memulihkan
    # stdout sebelum `fungsi(*argumen)` dipanggil, dan akibatnya `print` di dalam
    # fungsi bocor ke stdout sungguhan — merusak JSON balasan. Pengalihan harus
    # membungkus seluruh bagian yang menjalankan kode pemelajar.
    #
    # stderr juga dialihkan: pesan galat yang tidak tertangkap akan mengalir ke sana
    # dan, walau tidak merusak protokol, lebih berguna dikembalikan bersama hasilnya.
    keluaran = io.StringIO()
    keluaran_galat = io.StringIO()
    asli_out, asli_err = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = keluaran, keluaran_galat

    try:
        ruang_nama: dict = {}
        try:
            exec(kode_terkompilasi, ruang_nama)
        except BaseException as galat:  # noqa: BLE001 — semua galat pemelajar dilaporkan
            return {
                "status": "galat-jalan",
                "kasus": [],
                "keluaran": potong(keluaran.getvalue()),
                "pesan": potong(f"{type(galat).__name__}: {galat}"),
            }

        # Keluaran saat `exec` (kode di level modul) disimpan lebih dulu. Penyangga
        # yang sama dipakai ulang per kasus di bawah, jadi tanpa disimpan ia akan
        # terhapus oleh kasus pertama — dan `print` yang ditulis pemelajar di luar
        # fungsi hilang tanpa jejak.
        keluaran_modul = keluaran.getvalue()

        fungsi = ruang_nama.get(nama_fungsi)
        if not callable(fungsi):
            return {
                "status": "galat-jalan",
                "kasus": [],
                "keluaran": potong(keluaran_modul),
                "pesan": f"fungsi `{nama_fungsi}` tidak ditemukan di kode",
            }

        kasus_hasil = []
        for indeks, kasus in enumerate(test_case):
            argumen = kasus.get("argumen", [])
            diharapkan = kasus.get("diharapkan")

            # stdout tiap kasus dikosongkan supaya `keluaran` yang ditampilkan per
            # kasus benar-benar milik kasus itu, bukan gabungan seluruh proses.
            keluaran.seek(0)
            keluaran.truncate(0)

            try:
                hasil = fungsi(*argumen)
            except BaseException as galat:  # noqa: BLE001 — galat satu kasus tidak
                # menghentikan kasus lain; pemelajar perlu melihat semuanya sekaligus.
                kasus_hasil.append(
                    {
                        "indeks": indeks,
                        "argumen": tampilkan(argumen),
                        "diharapkan": tampilkan(diharapkan),
                        "hasil": None,
                        "lulus": False,
                        "galat": potong(f"{type(galat).__name__}: {galat}"),
                        "keluaran": potong(keluaran.getvalue()),
                    }
                )
                continue

            kasus_hasil.append(
                {
                    "indeks": indeks,
                    "argumen": tampilkan(argumen),
                    "diharapkan": tampilkan(diharapkan),
                    "hasil": tampilkan(hasil),
                    "lulus": sama(hasil, diharapkan),
                    "galat": None,
                    "keluaran": potong(keluaran.getvalue()),
                }
            )

        return {
            "status": "ok",
            "kasus": kasus_hasil,
            "keluaran": potong(keluaran_modul),
            "pesan": None,
        }
    finally:
        # Satu tempat pemulihan, apa pun jalur keluarnya. Tanpa `finally`, jalur
        # `return` yang belum terpikirkan akan meninggalkan stdout teralihkan dan
        # balasan protokolnya hilang ke penyangga.
        sys.stdout, sys.stderr = asli_out, asli_err


def main() -> None:
    mentah = sys.stdin.read()

    try:
        pekerjaan = json.loads(mentah)
    except json.JSONDecodeError as galat:
        # Ini kesalahan backend, bukan pemelajar: bentuk pekerjaannya ditetapkan
        # protokol. Tetap dibalas JSON yang sah supaya backend bisa membedakannya
        # dari kontainer yang mati.
        jawab(
            {
                "status": "galat-protokol",
                "kasus": [],
                "keluaran": "",
                "pesan": f"pekerjaan bukan JSON yang sah: {galat}",
            }
        )
        return

    try:
        jawab(jalankan(pekerjaan))
    except Exception:  # noqa: BLE001 — kegagalan tak terduga di runner sendiri
        # Jaring terakhir: apa pun yang lolos dari `jalankan` tetap harus menghasilkan
        # JSON yang sah, supaya backend tidak melihatnya sebagai kontainer yang mati.
        jawab(
            {
                "status": "galat-runner",
                "kasus": [],
                "keluaran": "",
                "pesan": potong(traceback.format_exc()),
            }
        )


if __name__ == "__main__":
    main()
