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
- Go 1.25.6 (sesuai `go.mod`)

### Frontend
- Node.js 18+ (disarankan LTS terbaru)
- npm (biasanya sudah termasuk dengan Node.js)

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
npm install
```

## Menjalankan Program (Development)

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

## Author

| No | Nama | NIM | GitHub |
| --- | --- | --- | --- |
| 1 | Surya Suharna | 18223075 | suryasuharna23 |
| 2 | Muhamad Hasbullah Faris | 18223014 | hsbu |
| 3 | Matthew Sebastian Kurniawan | 18223096 | Matthew12-t |

Proyek: Tugas Besar 2 Strategi Algoritma

