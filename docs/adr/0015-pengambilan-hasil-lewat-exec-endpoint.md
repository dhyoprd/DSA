# Hasil Eksekusi Kode diambil lewat exec endpoint, bukan lewat 6PN atau volume

## Status

accepted — **keputusan dokumenter; verifikasi empiris BELUM dijalankan.**

## Konteks

Ticket #9 adalah spike untuk menutup blocker terbesar di `docs/design-tree.md`
Cabang 3. Bunyinya: **Fly Machines tidak punya endpoint exec terdokumentasi**, jadi
tidak ada cara resmi menjalankan perintah di dalam Machine dan membaca stdout-nya.
ADR-0007 mencatat blocker yang sama dan menawarkan dua jalur: runner melapor balik ke
backend lewat 6PN, atau menulis hasil ke volume.

Sesi ini memeriksa ulang klaim itu terhadap sumber primer, dan **klaimnya salah.**
Lihat "Koreksi" di bawah. Karena premisnya gugur, pertanyaan yang harus dijawab bukan
lagi "jalur mana dari dua itu", melainkan "apakah ada jalur ketiga yang lebih
sederhana".

## Keputusan

**Backend memanggil `POST /v1/apps/{app_name}/machines/{machine_id}/exec` untuk
menjalankan runner di dalam Machine sekali pakai, dan membaca `stdout`, `stderr`,
`exit_code`, `exit_signal` langsung dari balasannya.** Runner tidak melapor balik ke
siapa pun dan tidak menulis hasil ke mana pun.

Batas resource dikoreksi mengikuti minimum yang benar-benar dapat dinyatakan Fly:
**VM diberi 256 MB dan 1 shared CPU** (minimum Fly). Batas lama — 128 MB dan 0,5 CPU
core — **dibatalkan**, karena keduanya tidak dapat dinyatakan di Fly. Lihat "Batas
resource" di Konsekuensi.

## Alasan

**Exec menghapus kebutuhan jaringan dari runner sama sekali.** Ini alasan terkuatnya,
dan ia menutup persis risiko yang ADR-0002 tandai sebagai mitigasi terpenting. Di
jalur 6PN, runner harus diizinkan menghubungi backend — artinya egress **tidak** boleh
deny-all, dan keberhasilannya bergantung pada pertanyaan yang belum terverifikasi:
apakah Network Policy benar mencakup lalu lintas 6PN (lihat "Yang belum terverifikasi").
Di jalur exec, runner tidak perlu jaringan sama sekali, sehingga egress bisa ditolak
total tanpa syarat. Backend yang menghubungi Machine, bukan sebaliknya.

**Exec tidak menuntut volume, dan volume justru berbahaya di sini.** ADR-0007 sudah
mencatat bahwa volume tidak bisa dibagi antar Machine, sehingga jalur itu canggung.
Yang lebih penting: volume adalah keadaan yang bertahan, sedangkan grader yang
mewarisi filesystem dari submission sebelumnya bukanlah grader. ADR-0007 menolak
Sprites sebagian karena alasan itu. Menulis hasil ke volume mengembalikan masalah yang
sama lewat pintu belakang.

**Exec sinkron dan sederhana alurnya.** Satu permintaan HTTP mengembalikan hasilnya.
Tidak ada protokol callback yang harus dibangun, tidak ada Machine kedua yang harus
menunggu, tidak ada berkas yang harus diparsing ulang. Ini mengurangi jumlah kode yang
bisa salah di #10.

**Ini jalur yang Fly sendiri pakai untuk beban kerja berbentuk sama.** Blueprint
first-party [Warm pools of user Machines](https://docs.fly.io/blueprints/warm-pool-user-machines)
memakai endpoint yang sama dengan `curl` untuk memeriksa Machine dan menulis berkas ke
dalamnya. Ini bukan pemakaian yang dipaksakan pada API yang dirancang untuk hal lain.

## Koreksi

Dua hal yang sebelumnya dianggap benar, dan ternyata tidak:

| Klaim sebelumnya | Koreksi |
|---|---|
| "Fly Machines tidak punya endpoint exec terdokumentasi." — `design-tree.md` Cabang 3, dan ADR-0007 bagian "Masalah terbuka yang belum terselesaikan". | **Salah.** `POST /v1/apps/{app_name}/machines/{machine_id}/exec` ada di OpenAPI spec resmi Fly, mengembalikan `stdout`/`stderr`/`exit_code`/`exit_signal`. `flyctl` membawa perintah `machine exec` sejak Januari 2023 (`superfly/flyctl` commit `b607e923` "Add exec command"). Fly juga punya tipe token khusus, `fly tokens create machine-exec`, yang "can execute a restricted set of commands on a machine". |
| "**Batas eksekusi**: 5 detik, 128 MB, 0,5 CPU core." — `design-tree.md` Cabang 3, ditulis sebagai batas yang sudah ditetapkan. | **128 MB dan 0,5 CPU core tidak dapat dinyatakan di Fly.** Minimum memori adalah 256 MB, dan `cpus` hanya menerima `1`, `2`, `4`, `8`, `16`. Batasnya diganti 256 MB / 1 shared CPU. Yang tetap tidak dapat dinyatakan di platform: batas 5 detik (lihat Konsekuensi). |

**Satu hal yang dikonfirmasi, bukan dikoreksi.** `design-tree.md` sudah menulis dengan
tepat bahwa batas CPU yang rusak adalah batas pada **nested container** ("Batas CPU
terbukti gagal pada nested container"), dan bahwa `guest` "adalah mekanisme berbeda".
Sesi ini menguatkan posisi itu dengan sumber primer: pada level VM, Fly **memang**
menegakkan batas CPU lewat cgroup CFS quota. Jadi keraguan itu tidak perlu dibuka lagi —
ia sudah dijawab, dan jawabannya sesuai dugaan semula.

**Mengapa pemeriksaan sebelumnya melewatkan endpoint exec.** Ini bagian yang berguna
untuk diingat. Halaman panduan [Machines resource](https://docs.fly.io/machines/api/machines-resource)
— halaman yang paling wajar dibaca untuk mencari tahu endpoint apa saja yang ada —
mendaftar 17 entri endpoint di daftar navigasinya (list, create, wait, get, update,
stop, suspend, start, delete, tiga operasi lease, cordon/uncordon, dan tiga operasi
metadata), dan **tidak memuat exec sama sekali** (diperiksa: 17 entri navigasi, nol
anchor `exec`). Di halaman itu kata "exec" hanya muncul sebagai field konfigurasi
(`init.exec` dan `processes[].exec`), bukan sebagai endpoint. Endpoint exec
hanya muncul di OpenAPI spec yang di-generate, `docs.fly.io/api/machines/openapi.json`.
Membaca panduan naratifnya karena itu menghasilkan kesimpulan "tidak ada endpoint exec"
dengan sangat meyakinkan. **Pelajaran: panduan naratif bukan daftar lengkap permukaan
API; spec yang di-generate adalah sumber kebenarannya.**

## Konsekuensi

**Batas resource.** VM dijalankan dengan `guest: {cpu_kind: "shared", cpus: 1,
memory_mb: 256}`. Yang perlu dipahami tentang bentuk ini:

- **CPU benar-benar dibatasi, tetapi bukan dengan cara yang mungkin diharapkan.** Fly
  memberi `shared` vCPU kuota dasar **5ms per periode 80ms (6,25%)** di cgroup, dan
  proses yang melewatinya akan di-*throttle*. Tetapi Fly juga memberi **burst balance**
  (awalnya 5 detik, maksimum 500 detik), dan saat burst vCPU boleh berjalan sampai
  100%. Untuk pekerjaan 5 detik, artinya VM **dapat** memakai hampir satu core penuh
  selama durasi itu. Jadi batas CPU ini lebih ketat dari 0,5 core pada jangka panjang,
  tetapi lebih longgar pada ledakan singkat.
- **Batas memori 128 MB hilang, dan penggantinya belum terverifikasi.** `memory_mb`
  minimum adalah 256. Apakah Fly menegakkan 256 MB itu sebagai plafon yang keras belum
  terverifikasi — yang terdokumentasi adalah batas microVM, bukan plafon cgroup.
- **Tidak ada field platform yang mematikan Machine setelah N detik.** `auto_destroy`
  hanya bekerja setelah proses selesai; `kill_timeout` mengatur masa tenggang saat
  penghentian, bukan umur maksimum. Batas 5 detik harus ditegakkan runner sendiri, dan
  backend perlu menghentikan Machine secara eksplisit kalau runner gagal melakukannya.

**Backend membutuhkan token Fly API, dan itu rahasia baru dengan daya rusak baru.**
Token ini bisa membuat dan menghancurkan Machine. Blueprint warm-pool menyarankan
token berlingkup org (`fly tokens create org`) karena control plane membuat app terus
menerus. Token ini **wajib hidup di sisi server saja** dan tidak boleh pernah sampai ke
Machine runner. #10 akan menambahkannya ke `.env.example` bersama kredensial lain —
**belum dikerjakan di sini**, karena #9 adalah spike dan keluarannya keputusan, bukan
kode. Yang perlu dicatat sekarang: ini satu alasan lagi backend tidak boleh dikompromikan.

**Field `timeout` pada exec ada, tetapi semantiknya tidak terdokumentasi.** Spec
menyebut field `timeout` bertipe integer tanpa satuan dan tanpa penjelasan perilaku.
Jangan andalkan ia untuk batas 5 detik sampai diuji.

**Blocker desainnya hilang, tetapi #9 belum selesai.** Pertanyaan "lewat jalur mana
hasil diambil" sudah terjawab, dan jawabannya tidak lagi bergantung pada apa pun yang
belum diketahui. Yang belum ada adalah **buktinya** — lima butir di bawah. #9 tetap
terbuka sampai kelimanya diuji terhadap akun Fly yang sungguhan. #10 tidak boleh
dianggap "bebas dimulai" hanya karena keputusan ini ada; ia boleh dimulai dengan
kesadaran bahwa kelima asumsi itu masih harus dibuktikan saat runner-nya dibangun.

## Yang belum terverifikasi

Ticket #9 menuntut empat bukti empiris ("Bukti bahwa...") dan satu jawaban dokumenter
(apakah policy jaringan mencakup jaringan privat). **Tidak satu pun dapat dijalankan di
sesi ini**: mesin ini tidak punya akun Fly, tidak punya `flyctl`, dan tidak punya
`FLY_API_TOKEN` di environment, direktori config, maupun registry. Kelima butir itu
tetap **terbuka**, dan tidak boleh dianggap selesai:

1. **Bukti bahwa hasil dari Machine sekali pakai benar-benar kembali ke backend.**
2. **Bukti bahwa pembatas memori dan CPU benar-benar bekerja.** Untuk CPU ada dasar
   dokumenter yang kuat (cgroup CFS quota). Untuk memori **tidak ada** — yang ada
   hanya batas microVM.
3. **Bukti bahwa proses berjalan sebagai non-root.** Field `user` ada di
   `MachineProcess` dan didokumentasikan sebagai "an optional user that the process
   runs under", tetapi tidak ada kalimat primer yang menyatakan hasilnya non-root.
   Yang pasti: VM tetap memberi root di dalamnya; `user` menurunkan hak **proses**,
   bukan menghapus root dari VM.
4. **Bukti bahwa policy jaringan benar memblokir internet.**
5. **Apakah Network Policy mencakup jaringan privat (6PN).** Dokumentasi Fly **tidak
   pernah menyebut** 6PN, `.internal`, atau WireGuard di halaman Network Policy. Satu-
   satunya pernyataan lingkup adalah pengecualian Fly Proxy: "They do not affect
   traffic routed through the Fly Proxy." Tidak ada pernyataan primer yang memastikan
   atau menyangkal cakupan 6PN.

Karena keputusan ini memakai exec, **poin 5 menjadi jauh kurang penting**: runner tidak
perlu jaringan, jadi egress dapat ditolak total tanpa bergantung pada jawabannya. Tetap
dicatat karena ia masih menentukan apakah egress deny-all juga memblokir jalur privat.

**Ada satu mekanisme pengganti yang terdokumentasi baik untuk isolasi jaringan**, kalau
poin 5 ternyata tidak menguntungkan: membuat app runner dengan `--network` sendiri
memberi 6PN terpisah, dan dokumentasi menyatakan app pada 6PN terpisah "can never
communicate unless explicitly configured to do so". Ini yang Fly sendiri rekomendasikan
untuk kode asing. Itu mitigasi tambahan di luar Network Policy, bukan penggantinya.

## Alternatif yang ditolak

**Runner melapor balik ke backend lewat 6PN.** Ini jalur pertama di ADR-0007. Ditolak
karena ia menuntut egress dibuka **sebagian** — justru melemahkan mitigasi terpenting
ADR-0002 — dan karena keberhasilannya bergantung pada pertanyaan yang belum
terverifikasi (apakah Network Policy mencakup 6PN). Exec mencapai tujuan yang sama
tanpa membuka jaringan sama sekali.

**Menulis hasil ke volume lalu membacanya kembali.** Ini jalur kedua di ADR-0007.
Ditolak karena volume tidak bisa dibagi antar Machine, dan karena keadaan yang
bertahan adalah kebalikan dari yang dibutuhkan grader sekali pakai.

**Menggabungkan backend dan runner dalam satu Machine.** Sudah ditolak ADR-0007 dan
tetap ditolak; exec tidak mengubah alasan kernel bersama.

**Mempertahankan batas 128 MB dan 0,5 CPU dengan menegakkannya di runner lewat
`ulimit`/`rlimit`.** Dipertimbangkan, dan ditolak untuk sekarang. Bentuk itu menambah
lapisan kedua yang harus diuji dan dipelihara, dan ia menutupi kenyataan bahwa batas
VM-nya sendiri lebih longgar. Kalau nanti terukur bahwa 256 MB terlalu besar untuk
kebutuhan, keputusan itu dibuka lagi sebagai ADR baru — bukan diselipkan diam-diam.

## Sumber

- <https://docs.fly.io/api/machines/machines/execute-command> — `POST
  /v1/apps/{app_name}/machines/{machine_id}/exec`; body `MachineExecRequest`
  (`command[]`, `container`, `machine`, `stdin`, `timeout`; `cmd` deprecated);
  balasan `flydv1.ExecResponse` (`stdout`, `stderr`, `exit_code`, `exit_signal`).
- <https://docs.fly.io/api/machines/openapi.json> — spec yang di-generate; di sinilah
  endpoint exec benar-benar terdaftar (operationId `Machines_exec`).
- <https://docs.fly.io/blueprints/warm-pool-user-machines> — pemakaian exec
  first-party: "Poll your app's health endpoint through the [exec endpoint]"; "The exec
  call returns HTTP 200 even when the command inside failed, so check the response
  body's `exit_code`, not the API status." Juga asal saran token berlingkup org:
  "This control plane creates and destroys apps continuously, so it needs an
  org-scoped API token (`fly tokens create org`), not an app-scoped deploy token. Keep
  it server-side and never expose it to a user Machine."
- <https://docs.fly.io/security/tokens> dan
  <https://docs.fly.io/flyctl/cmd/fly_tokens_create_machine-exec> — "A machine-exec
  token can execute a restricted set of commands on an app's Machines."
- <https://docs.fly.io/machines/guides-examples/machine-sizing> — "Minimum memory is
  `256m * shared CPU size` or `2048m * performance CPU size`"; "Memory must be a
  multiple of 256 for shared sizes, and 2048 for performance sizes."
- <https://docs.fly.io/reference/configuration> — "The number of vCPUs to request.
  Valid values are `1`, `2`, `4`, `8`, or `16`, but depends on `cpu_kind`."
- <https://docs.fly.io/machines/cpu-performance> — "We enforce limits through the
  Linux scheduler's CPU bandwidth control"; "For each 80ms period of time, we set a
  quota of 5ms for each `shared` vCPU"; tabel burst balance (awal 5s, maksimum 500s).
- <https://docs.fly.io/machines/api/machines-resource> — `user`: "An optional user
  that the process runs under."; `auto_destroy`: "If true, the Machine destroys itself
  once it's complete."; `guest`: `cpu_kind`, `cpus`, `memory_mb`. **Catatan: halaman
  ini tidak memuat endpoint exec di daftar endpoint-nya** — lihat "Koreksi".
- <https://docs.fly.io/machines/guides-examples/network-policies> — "Once you create a
  rule for a direction (ingress or egress), the default for that direction becomes
  'deny all.'"; "Only `allow` is supported."; "Network policies only apply to traffic
  directly to and from Machines."; "They do not affect traffic routed through the Fly
  Proxy."
- <https://docs.fly.io/networking/custom-private-networks> — "Apps on separate 6PNs can
  never communicate unless explicitly configured to do so."
- `superfly/flyctl` — `internal/command/machine/exec.go`, commit `b607e923`
  (2023-01-18, "Add exec command"); `superfly/fly-go` — `flaps/flaps_machines.go`
  (`func (f *Client) Exec`), `MachineExecRequest`/`MachineExecResponse`.
