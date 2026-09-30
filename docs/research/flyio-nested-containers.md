# Can a Fly.io Machine Run Docker Containers Inside Itself?

**Research question:** The Rust backend needs to spawn a container per code submission. But a Fly Machine is already a container (or microVM). Can it run Docker-in-Docker, or any nested container execution?

**Researched:** 2026-09-30
**Relevant ADRs:** `docs/adr/0002-eksekusi-kode-publik-risiko-diterima.md` (plans Docker + gVisor on Fly.io)

> **Status verifikasi per bagian.** Temuan di bagian 1-8 dan 10 sudah melewati verifikasi adversarial terhadap sumber primer, dan sudah mengoreksi ADR-0002 serta ADR-0007.
>
> **Bagian 9 (Sprites) BELUM diverifikasi** dan sengaja tidak dimasukkan ke keputusan mana pun. Agen penyintesis tidak menyebutnya sama sekali. Jangan perlakukan bagian 9 sebagai fakta sebelum verifikasi selesai — lihat catatan di bawah.

> **Catatan penulisan.** File ini ditulis oleh agen riset selama sesi grilling, bukan oleh pemilik proyek, dan ikut ter-commit otomatis. Isinya dipertahankan karena bersitasi primer dan berguna sebagai rujukan, tetapi ia **bukan dokumen keputusan**. Keputusan yang berlaku ada di `docs/adr/`.

---

## TL;DR

**Yes, you can run a Docker daemon inside a Fly Machine** — Fly staff say so directly, and community members report doing it in production. There is no `privileged` flag to set because *you are already root inside a real VM*; the Docker image is only a packaging format for the root filesystem.

**But this is probably the wrong architecture for this project.** A Fly Machine *is* the sandbox. Nesting runc containers inside it adds a **second, weaker** isolation boundary (shared kernel) inside the strong one (Firecracker microVM) — it does not make the isolation meaningfully stronger, and it introduces real operational problems: cgroup v1/v2 breakage on CPU limits, no systemd, and an undocumented setup Fly does not support.

**The first-party answer for "run untrusted user code" is one Machine per job** — which is the same "container per submission" shape, minus the inner Docker layer. For stronger per-request isolation, the backend should call the Machines API, not `docker run`.

**gVisor, as planned in ADR-0002, is unsupported on Fly and one documented attempt failed.** This is the most consequential finding for this project.

---

## 1. Fly Machines are Firecracker VMs, not containers

The Docker image is **packaging**, not the runtime. Fly converts it into a VM root filesystem.

From [Docker without Docker](https://fly.io/blog/docker-without-docker/):

> "we don't use Docker to run them" … "we transmogrify container images into Firecracker micro-VMs"

> "Docker's isolation isn't strong enough for that" — stated as the reason for the design, in a "high-density multitenant" setting

> "a container image is just a stack of tarballs and a blob of configuration"

> "create a file-backed loop device, and copy the directory tree into it"

The pipeline uses containerd on an LVM2 thin pool, a second block device carrying init/kernel, a TAP device with BPF, and a custom Rust `init` (not systemd).

Fly staff (lillian) in [Why are Fly Machines running as Firecracker MicroVMs configured with privileged=true?](https://community.fly.io/t/why-are-fly-machines-running-as-firecracker-microvms-configured-with-privileged-true/26380) (Nov 2025):

> "Fly Machines are full virtual machines each running an independent Linux kernel" … "in which you get root, yes"

The [shared responsibility model](https://docs.fly.io/security/shared-responsibility.md) confirms the boundary is virtualization: "the virtualization boundary between our worker (virtualization host) and the Fly Machine (virtualization guest)".

**Why this matters here:** there is no outer container to escape *from* in the Docker sense. You are root in a VM whose kernel is dedicated to you.

## 2. Yes — a Docker daemon runs inside a Machine

Fly staff, [Does fly.io support privileged containers?](https://community.fly.io/t/does-fly-io-support-privileged-containers/15848) (Oct 2023):

- **allison:** "apps don't run inside Docker proper - they run as individual Firecracker virtual machines" … "You should be able to do just about anything in your machines, including running docker itself!"
- **roadmr:** "docker images are used mainly as a packaging format for you to ship your rootfs around" … "these get unpacked into a real filesystem and run by an actual full virtual machine" … "stuff running in it has all the privileges and capabilities of running in a real hardware-emulated VM"

Fly staff, [On demand docker container spinup for safe user code execution](https://community.fly.io/t/on-demand-docker-container-spinup-for-safe-user-code-execution/11361) (Mar 2023) — **this thread is the same use case as this project**:

- **allison:** "Because we run Firecracker VMs, you should be able to do almost anything inside VMs, including running Docker if you wish"

## 3. There is no privileged mode to enable — and no docs page

Neither the [configuration reference](https://docs.fly.io/reference/configuration/) nor the [runtime environment page](https://docs.fly.io/machines/runtime-environment/) contains `privileged`, `cap_add`, or capabilities keys. The only `[experimental]` options are `cmd`, `entrypoint`, `exec`. Kernel-adjacent keys that do exist: `kernel_args`, `persist_rootfs`, `host_dedication_id`.

**This is the documented answer by omission:** you don't grant capabilities, because inside the VM you have all of them already. Correspondingly, **there is no official Fly.io docs page about running Docker inside a Machine.** The topic appears only in community threads.

A search of the community forum for `dockerd` surfaces Fly's own remote-builder images among the hits, and these threads:

| Thread | Note |
|---|---|
| [On demand docker container spinup](https://community.fly.io/t/on-demand-docker-container-spinup-for-safe-user-code-execution/11361) | allison: works, but see caveats |
| [Fly can't find nginx](https://community.fly.io/t/fly-cant-find-nginx/17506) | rubys: "no reason why you can't run dockerd on that VM (they call it docker-in-docker or dind, but it equally works here)" |
| [Deploy docker in docker](https://community.fly.io/t/deploy-docker-in-docker/11147) | Silent failure; resolved by staff disabling an abuse check |
| [Docker in "Docker" on Fly](https://community.fly.io/t/docker-in-docker-on-fly/3674) | rugwiro: "running my docker engine on fly for at least 4 months now" |
| [How to get Docker running on Sprites?](https://community.fly.io/t/how-to-get-docker-running-on-sprites/27168) | Working recipe: `sudo dockerd &` |

## 4. What actually happens when you try — the real caveats

### 4a. No systemd — you must start the daemon yourself

allison, thread 11361:

> "We use our own init process instead of systemd, so you have to manually run `dockerd &`"

Confirmed repeatedly: "Systemd has this built in but fly machines don't run systemd" ([25014](https://community.fly.io/t/run-a-command-or-script-on-machine-resume-after-suspend/25014)), "There's no systemd running in these VMs" ([8944](https://community.fly.io/t/difference-between-fly-vm-and-an-app-deployed-with-docker-container/8944)), and on Sprites, `systemctl start docker` fails until `sudo dockerd &` is run ([27168](https://community.fly.io/t/how-to-get-docker-running-on-sprites/27168)).

### 4b. nftables may need disabling

allison, thread 11361, adds that you may need to "disable nftables" — Docker's iptables/nftables manipulation conflicts with the VM's network setup.

### 4c. Abuse-prevention checks can silently kill it

In [Deploy docker in docker](https://community.fly.io/t/deploy-docker-in-docker/11147), the user saw no logs at all, only "Error" state. kurt replied: "I think you're hitting an abuse prevention check" and "I just disabled the check." **A dinD workload may be silently blocked, and only staff can unblock it.** This is a fragility signal for a public-facing code-execution service.

### 4d. cgroup v1/v2 breakage — this breaks the CPU/memory/PID limits

This is the most important practical failure, and it directly hits ADR-0002's mandatory hardening requirements.

From [Podman and gVisor](https://community.fly.io/t/podman-and-gvisor/26529) (Nov 2025):

- Plain `podman run -it alpine ash` **worked**.
- Adding a CPU limit **failed**: `--cpus 0.01` produced a cgroup error under `/sys/fs/cgroup/cpu/libpod_parent/...` plus "OCI runtime attempted to invoke a command that was not found".
- `runsc` directly failed: "configuring cgroup: stat /sys/fs/cgroup/cpu: no such file or directory".
- Fly staff (lillian) clarified: "it does still run in Firecracker with runc managing each container in a machine", and that the newer Pilot runtime is only active for Machines created specifically with `containers`. She reproduced a CPU limit using `cgcreate`/`cgset` and suggested a cgroups v1 vs v2 difference.
- The user found cgroup v1 at `/sys/fs/cgroup/cpu,cpuacct/` and v2 at `/sys/fs/cgroup/unified`. Podman and gVisor both wanted v1 at `/sys/fs/cgroup/cpu`.
- Forcing v2 via `kernel_args = ["cgroup_no_v1=all"]` **crashed the machine immediately** — cgroup mount error for `net_cls,net_prio` (EINVAL), then "machine has reached its max restart count of 10".

**Outcome: nothing in that thread shows resource-limited nested containers working on a Fly Machine.** The only recommendation given was to stop nesting and use separate Machines via the Machines API.

### 4e. The official example repo is stale and carries no privileged config

[`fly-apps/docker-daemon`](https://github.com/fly-apps/docker-daemon) ("A Docker daemon to run in Fly and access via a WireGuard peer"):

- `fly.toml` contains **only** `app`, `kill_signal = "SIGINT"`, `kill_timeout = 5`, and one `[[mounts]]` (`destination = "/data"`, `source = "data"`). Generated 2021-06-23 for app `docker-for-kurt`. **No privileged setting, no capabilities, no kernel config.**
- `Dockerfile` uses `FROM docker:24-dind`, adds `bash pigz sysstat procps lsof`, and starts via `CMD ["dockerd", "-p", "/var/run/docker.pid"]`.
- The `entrypoint` is a generic wrapper (`run-parts docker-entrypoint.d`, then `exec "$@"`) — it does **not** start dockerd or touch iptables.
- README suggests `fly scale vm dedicated-cpu-2x`, and its final step is joking advice to delete your local Docker Engine.

It is a **remote builder**, not a per-request sandbox: it exposes dockerd over a WireGuard peer and you set `DOCKER_HOST=tcp://[fdaa:...]:2375`. **Plaintext, unauthenticated TCP on 2375 is root-equivalent for anything that can reach it.** Not a model to copy for this project.

## 5. Fly *does* have a first-party nested-container feature — but not for this

[Multi-container Machines](https://docs.fly.io/machines/guides-examples/multi-container-machines.md):

> "Fly Machines support running multiple containers per virtual machine using the `containers` array."

> "This feature is currently available through the Machines API and requires using Pilot as the init system."

`flyd` is "our in-house orchestrator"; Pilot is "the init system responsible for running the containers and managing their lifecycle", building a dependency graph from `depends_on` startup conditions.

**Isolation, verbatim:**

> "While containers share the same kernel and VM, they are isolated at the process and filesystem level."

> "both containers share the same network namespace inside the Machine"

> "they don't provide the same level of isolation as across VMs"

This is Docker-Compose-shaped: a **static, declared set** of cooperating containers (app + Redis + LiteFS) with health checks and startup ordering. It is not a per-request spawn primitive, and it explicitly does **not** give VM-grade isolation between containers.

**Critical for ADR-0002:** the inner containers are managed by **runc**, sharing one kernel. That is exactly the "Docker shares the kernel, container escape is a real vulnerability class" concern the ADR already names — except now it is nested inside a VM, so you inherit the weaker boundary's risk without gaining anything over using the VM boundary alone.

## 6. The first-party pattern for untrusted code: one Machine per job

[Run User Code on Fly Machines](https://docs.fly.io/machines/guides-examples/functions-with-machines.md):

> "Fly Machines are Firecracker VMs"

> "package up users' code, define a runtime environment, launch the code in a VM" … "turn the VM off when it idles to save on compute bills"

> "Fly Machines run it safely - even the most awful, buggy, and downright hostile user code."

> "It is safe to share machines between users, as long as you stop them before they get reassigned."

> "User code is fraught with peril."

> "Packaging user code as a Docker image is mostly up to you."

Note the isolation unit is the **VM**, and reuse is permitted only with a stop between assignments. Related first-party blueprints: [Warm pools of user Machines](https://docs.fly.io/blueprints/warm-pool-user-machines.md), [Connecting to User Machines](https://docs.fly.io/blueprints/connecting-to-user-machines.md), [One App Per Customer - Why?](https://docs.fly.io/machines/guides-examples/one-app-per-user-why.md).

This is the recommendation Fly staff gave to the closest-matching thread (PeterCxy, in [Podman and gVisor](https://community.fly.io/t/podman-and-gvisor/26529)): run untrusted code in **separate Fly Machines via the Machines API**, with an orchestrator app, rather than nesting containers.

Fly staff (allison) also gave this project's exact shape as a "perfect example" in thread 11361 — pointing at the fastify-functions repo — while warning to configure the runner VM so "it can't access your internal private network", e.g. by running user code inside a "tightly-controlled docker container".

## 7. gVisor: unsupported, and one documented attempt failed

**gVisor appears nowhere in Fly's documentation index** ([`llms.txt`](https://docs.fly.io/llms.txt)). The only forum result for gVisor is [Podman and gVisor](https://community.fly.io/t/podman-and-gvisor/26529), where `runsc` failed outright:

> "configuring cgroup: stat /sys/fs/cgroup/cpu: no such file or directory"

The user never got gVisor working. The thread ends unresolved with the user still asking "Is there a way to only use cgroupv2?" and whether Fly requires cgroupv1.

**This directly undermines ADR-0002's reasoning** that gVisor is cheap because it is "installed as a Docker runtime (`docker run --runtime=runsc`), not a system built from scratch." On Fly, gVisor must sit *inside* a Firecracker VM whose cgroup layout it does not match, and it is neither documented nor supported. ADR-0002's Firecracker alternative — rejected as "an infrastructure project of its own" — is, on Fly, **the platform default you get for free**.

## 8. Network isolation: use Network Policies, not `--network none`

[Network Policies](https://docs.fly.io/machines/guides-examples/network-policies.md):

> "Network policies let you control traffic to and from your Machines"

> "Once you create a rule for a direction (ingress or egress), the default for that direction becomes 'deny all.'"

> "Only explicitly allowed traffic will be permitted." … "Only `allow` is supported."

> "After creating or updating a policy, restart or redeploy the Machines for changes to take effect"

**Caveat:** "Network policies only apply to traffic directly to and from Machines." … "They do not affect traffic routed through the Fly Proxy." … "If traffic is still allowed unexpectedly, check if it's going through the Fly Proxy."

Private-network exposure is a named risk. allison (11361) warned to ensure the runner "can't access your internal private network". rubys, on [untrusted Dockerfiles](https://community.fly.io/t/is-fly-launch-dockerfile-safe-to-use-with-untrusted-dockerfiles-repost/24126), warned: "if you launch an app in the same org as your machine, it will be in the same private network. If your machine has ports open, it can access them." Same thread flags access-token exposure as the other main risk.

For this project, `--network none` on the inner container is still worth keeping (defense in depth), but the VM-level policy is the boundary that matters.

## 9. Sprites — Fly's purpose-built product for this use case

> ⚠️ **BELUM DIVERIFIKASI.** Bagian ini tidak melewati pemeriksaan adversarial dan tidak dipertimbangkan oleh agen penyintesis. Ia ditulis dari pembacaan dokumentasi sekilas dan belum dikonfirmasi terhadap sumber primer mana pun. Verifikasi sedang berjalan; jangan bangun apa pun di atas bagian ini sampai hasilnya keluar.

[Sprites](https://docs.fly.io/sprites/index.md) are "persistent, hardware-isolated Linux environments for running arbitrary code", explicitly listing "Isolating and executing user-submitted code safely without risking the rest of your system" as a use case. Isolation is rated "Hardware-level ✓ — dedicated microVM", contrasted with "container-level isolation in serverless functions". Billing is per-second with "compute free when idle".

They expose policy APIs directly relevant to ADR-0002's hardening list:
- [Set Privileges Policy](https://docs.fly.io/sprites/api/network-policy/set-privileges-policy.md) — "Update the privileges policy configuration to restrict capabilities or devices."
- [Set Resources Policy](https://docs.fly.io/sprites/api/network-policy/set-resources-policy.md)
- [Set Network Policy](https://docs.fly.io/sprites/api/network-policy/set-network-policy.md)

Docker can run inside a Sprite via manual `sudo dockerd &` ([thread 27168](https://community.fly.io/t/how-to-get-docker-running-on-sprites/27168)), with no systemd. The Sprites docs do not mention nested Docker or containers.

**This is likely a better fit than raw Fly Machines for a hobby project**, since privileges/resources/network policies are first-party rather than hand-rolled, and persistence suits a study site. Worth evaluating before committing to the ADR-0002 design.

## 10. "Runs a Docker daemon" vs "spawns isolated containers per request"

The task asked for precision on this distinction. Both are possible, but they are not equally good:

| | Runs a Docker daemon | Spawns isolated containers per request |
|---|---|---|
| **Feasible on Fly?** | Yes — confirmed by staff and users | Yes, technically — but see caveats |
| **Isolation added** | A long-lived root daemon on port 2375 | runc containers sharing one kernel |
| **Vs. the VM boundary** | N/A | **Weaker.** Nested inside the strong boundary, adds no meaningful strength |
| **Resource limits** | — | **Broken in practice** (cgroup v1/v2) |
| **Support** | Undocumented; may trip abuse checks | Undocumented; Fly recommends against it |
| **Right tool** | Remote builder / CI | One Machine or Sprite per job |

The important asymmetry: **the Fly Machine already provides the isolation you are trying to build with Docker.** Nesting containers inside it means maintaining a second isolation layer that is weaker than the one you already have, on an undocumented path, while the resource-limit enforcement you actually need (memory/CPU/PID) is the exact thing that breaks.

If the goal is "one clean sandbox per submission", the correct Fly primitive is **a fresh Machine (or Sprite) per submission**, with a warm pool to hide boot latency — not `docker run` inside a Machine.

---

## Implications for this project

1. **ADR-0002's gVisor plan should be revisited.** gVisor is unsupported on Fly, absent from the docs index, and the one documented attempt failed on cgroups. The ADR's rejected Firecracker alternative is the platform default on Fly.
2. **The mandatory-hardening list maps better onto a per-Machine model than onto inner Docker containers.** Memory/CPU/PID limits via inner `docker run` are the specific thing observed to break.
3. **A Fly Machine is itself the sandbox.** "Container per submission" is achievable as "Machine per submission" without any nested Docker.
4. **Keep the timeout.** Unchanged by any of this — an infinite loop still hangs the backend, and ADR-0002 already mandates it.
5. **Do not expose dockerd on port 2375** the way `fly-apps/docker-daemon` does.

---

## Unverified

- Whether the abuse-prevention check that blocked dinD in 2023 ([thread 11147](https://community.fly.io/t/deploy-docker-in-docker/11147)) still exists, or whether it would trip on a code-execution workload.
- Whether gVisor can be made to work on a Fly Machine at all with a different cgroup configuration — no success case was found in any primary source.
- The complete, current `dockerd` flag set needed inside a Fly Machine (beyond "disable nftables" and manual start). No full working config appears in any source read.
- Whether Fly Network Policies cover private-network (6PN) traffic. The docs state only the Fly Proxy carve-out; no page confirms 6PN behaviour either way.
- Whether Sprites officially support nested Docker. Community reports say it works; the docs never mention containers.
- The current maintenance status of `fly-apps/docker-daemon` (last touched 2021, `docker:24-dind`, no privileged config).
- Whether `cgroup_no_v1=all` remains fatal, or whether the cgroup v1/v2 situation has changed since Nov 2025.
- Fly Machine cold-start latency and cost for a per-submission model, which determines whether a warm pool is required for a 5-second timeout budget.

---

## Sources

**Primary (Fly.io docs):**
- [Docker without Docker](https://fly.io/blog/docker-without-docker/)
- [Multi-container Machines](https://docs.fly.io/machines/guides-examples/multi-container-machines.md)
- [Run User Code on Fly Machines](https://docs.fly.io/machines/guides-examples/functions-with-machines.md)
- [Network Policies](https://docs.fly.io/machines/guides-examples/network-policies.md)
- [Shared responsibility model](https://docs.fly.io/security/shared-responsibility.md)
- [Configuration reference](https://docs.fly.io/reference/configuration/)
- [Machine Runtime Environment](https://docs.fly.io/machines/runtime-environment/)
- [Sprites Overview](https://docs.fly.io/sprites/index.md)
- [Warm pools of user Machines](https://docs.fly.io/blueprints/warm-pool-user-machines.md)
- [One App Per Customer - Why?](https://docs.fly.io/machines/guides-examples/one-app-per-user-why.md)
- [`fly-apps/docker-daemon`](https://github.com/fly-apps/docker-daemon)

**Community threads (Fly staff replies noted):**
- [On demand docker container spinup for safe user code execution](https://community.fly.io/t/on-demand-docker-container-spinup-for-safe-user-code-execution/11361) — allison (staff)
- [Podman and gVisor](https://community.fly.io/t/podman-and-gvisor/26529) — lillian (staff)
- [Does fly.io support privileged containers?](https://community.fly.io/t/does-fly-io-support-privileged-containers/15848) — allison (staff), roadmr
- [Why are Fly Machines running as Firecracker MicroVMs configured with privileged=true?](https://community.fly.io/t/why-are-fly-machines-running-as-firecracker-microvms-configured-with-privileged-true/26380) — lillian (staff)
- [Deploy docker in docker](https://community.fly.io/t/deploy-docker-in-docker/11147) — kurt (staff)
- [Docker in "Docker" on Fly](https://community.fly.io/t/docker-in-docker-on-fly/3674)
- [Fly can't find nginx](https://community.fly.io/t/fly-cant-find-nginx/17506) — rubys
- [Is "fly launch --dockerfile" safe to use with untrusted Dockerfiles? [REPOST]](https://community.fly.io/t/is-fly-launch-dockerfile-safe-to-use-with-untrusted-dockerfiles-repost/24126) — rubys
- [Controlling egress and ingress traffic on untrusted Fly Machines](https://community.fly.io/t/controlling-egress-and-ingress-traffic-on-untrusted-fly-machines/21637)
- [How to get Docker running on Sprites?](https://community.fly.io/t/how-to-get-docker-running-on-sprites/27168)
