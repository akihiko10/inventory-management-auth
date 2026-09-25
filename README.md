# Inventory Management - Authentication Update

Versi ini menambahkan autentikasi ke project Inventory Management yang sudah memiliki Pallet Layout, Pallet Detail, Inbound, dan Outbound.

## Fitur baru

- Login user
- Daftar user
- Logout
- Ganti akun
- Sesi login disimpan di localStorage frontend
- Password di backend tidak disimpan sebagai plaintext; backend menggunakan `crypto.scryptSync`
- Endpoint data pallet/layout/transaksi membutuhkan sesi login
- Akun demo:
  - Username: `admin`
  - Password: `admin123`

## Menjalankan

### Backend

```bash
cd backend
npm install
npm run dev
```

Backend berjalan di `http://localhost:3000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend berjalan di `http://localhost:5173`.

## Catatan

Data user masih in-memory untuk tahap development. Jika backend direstart, user hasil register akan kembali ke kondisi awal. Saat MongoDB diintegrasikan, data user dapat dipindahkan ke collection `users`.

## Web + Mobile parity

Folder `mobile/` adalah client kedua untuk backend yang sama. Semua menu utama Web dipetakan ke Mobile. Fitur yang secara visual membutuhkan drag & drop memakai touch-friendly selection/confirmation di HP, tetapi menghasilkan operasi backend yang sama.

### Menu parity
- Dashboard
- Pallet / Item / Barcode / Summary / Position Tracking
- Pallet Layout
- Denah Gudang / Rack / Slotting / Movement / FIFO
- Inbound / Outbound / Driver / Nopol / Draft / History
- Manifest / Grouping / Reconciliation / Weight & Packaging Summary
