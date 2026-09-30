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
# `npm ci` memasang persis versi di package-lock.json, bukan versi yang mungkin
# bergeser sejak lockfile ditulis.
RUN npm ci

COPY . .

# `dev:docker` memakai webpack, bukan Turbopack (bawaan Next 16).
# Alasan lengkapnya di README, bagian "Hot reload".
CMD ["npm", "run", "dev:docker"]
