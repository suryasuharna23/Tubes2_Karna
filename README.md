# Tubes2 Karna - DOM Traversal & CSS Selector Engine

Tugas ini adalah aplikasi fullstack untuk melakukan traversal DOM HTML menggunakan algoritma BFS atau DFS, lalu mencocokkan node terhadap CSS selector.

## Penjelasan Singkat Algoritma

### BFS (Breadth-First Search)
- BFS menelusuri tree per level (melebar dulu).
- Implementasi menggunakan queue.
- Cocok ketika ingin menemukan node yang lebih dekat dari root lebih dulu.

### DFS (Depth-First Search)
- DFS menelusuri tree sampai kedalaman tertentu dulu, baru kembali (backtrack).
- Implementasi menggunakan rekursi.
- Cocok ketika ingin eksplorasi mendalam pada subtree.

Pada proyek ini, kedua algoritma mencatat:
- jumlah node yang dikunjungi (`nodes_visited`)
- urutan traversal (`traversal_log`)
- node yang match selector (`matched_nodes`)

## Requirement

### Backend
- Go 1.25.6 (sesuai `backend/go.mod`)

### Frontend
- Node.js `^20.19.0` atau `>=22.12.0` 
- npm

## Instalasi

1. Clone repository ini.
2. Install dependency backend:

```bash
cd backend
go mod tidy
```

3. Install dependency frontend:

```bash
cd ../frontend
npm ci
```

## Run Program (Development)

Jalankan backend dan frontend di terminal terpisah.

### 1) Jalankan Backend

```bash
cd backend
go run cmd/server/main.go
```

Backend default berjalan di `http://localhost:8080` dengan endpoint utama:
- `POST /api/traverse`

### 2) Jalankan Frontend

```bash
cd frontend
npm run dev
```

Frontend Vite biasanya berjalan di:
- `http://localhost:5173`

## Run Program (Docker)

### Dependency Tambahan untuk Docker
- Docker Desktop (Windows/macOS) atau Docker Engine + Docker Compose plugin (Linux)

### 1) (Opsional) Atur Port

Copy file contoh env Docker:

```bash
cp .env.docker.example .env
```

Atau di PowerShell:

```powershell
Copy-Item .env.docker.example .env
```

Default:
- `BACKEND_PORT=8080`
- `FRONTEND_PORT=5173`

### 2) Build dan Run Semua Service

```bash
docker compose up --build
```

Untuk background mode:

```bash
docker compose up --build -d
```

### 3) Verifikasi

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
```

Akses:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`

### 4) Stop Service

```bash
docker compose down
```

Jika ingin hapus image lokal hasil build:

```bash
docker compose down --rmi local
```

## Compile / Build

### Build Backend

```bash
cd backend
go build ./...
```

### Build Frontend

```bash
cd frontend
npm run build
```

Output build frontend akan berada di folder `frontend/dist`.

## Struktur Folder Singkat

- `backend/` : server Go, parser HTML, traversal BFS/DFS
- `frontend/` : UI React + Vite
- `docs/` : dokumentasi tambahan

## Tabel Spesifikasi 

| No | Poin | Ya | Tidak |
| :--- | :--- | :---: | :---: |
| 1 | Aplikasi berhasil di kompilasi tanpa kesalahan | ✓ | |
| 2 | Aplikasi berhasil dijalankan | ✓ | |
| 3 | Aplikasi dapat menerima input URL web, pilihan algoritma, CSS selector, dan jumlah hasil | ✓ | |
| 4 | Aplikasi dapat melakukan scraping terhadap web pada input | ✓ | |
| 5 | Aplikasi dapat menampilkan visualisasi pohon DOM | ✓ | |
| 6 | Aplikasi dapat menelusuri pohon DOM dan menampilkan hasil penelusuran | ✓ | |
| 7 | Aplikasi dapat menandai jalur tempuh oleh algoritma | ✓ | |
| 8 | Aplikasi dapat menyimpan jalur yang ditempuh algoritma dalam traversal log | ✓ | |
| 9 | [Bonus] Membuat video | ✓ | |
| 10 | [Bonus] Deploy aplikasi | | ✓ |
| 11 | [Bonus] Implementasi animasi pada penelusuran pohon | ✓ | |
| 12 | [Bonus] Implementasi multithreading | ✓ | |
| 13 | [Bonus] Implementasi LCA Binary Lifting | ✓ | |
| 14 | [Bonus] Implementasi docker | ✓ | |

## Author

| No | Nama | NIM | GitHub |
| --- | --- | --- | --- |
| 1 | Surya Suharna | 18223075 | suryasuharna23 |
| 2 | Muhamad Hasbullah Faris | 18223014 | hsbu |
| 3 | Matthew Sebastian Kurniawan | 18223096 | Matthew12-t |

Proyek: Tugas Besar 2 Strategi Algoritma

