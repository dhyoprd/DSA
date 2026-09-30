# Image pengembangan antarmuka.
#
# `node_modules` sengaja dipasang di dalam image supaya volume bernama di Compose
# punya isi awal. Kalau tidak, bind mount kode dari host akan menutupi folder itu
# dengan `node_modules` milik Windows, yang binary-nya tidak jalan di Linux.
FROM node:24-alpine

# Next.js membutuhkan kompatibilitas glibc di musl untuk sebagian binary-nya.
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# `dev:docker` memakai webpack, bukan Turbopack (bawaan Next 16).
# Alasannya empiris: watcher Turbopack tidak pernah membangun ulang berkas yang
# di-bind dari host Windows ke container Docker Desktop — halaman tetap menyajikan
# isi lama walaupun berkas di container sudah berubah. Watcher webpack bekerja
# tanpa setelan tambahan. `next dev` di host tetap memakai Turbopack.
CMD ["npm", "run", "dev:docker"]
