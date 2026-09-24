# Modul 1-4 Inventory Management

Project ini mempertahankan fitur existing dan menambahkan Modul 1 sampai Modul 4.

## Modul 1 — Denah Gudang & Dynamic Racking
- Master denah warehouse, cold storage, area/aisle/road
- 4 level rack dengan slot adjustable
- Slotting map dan monitoring kapasitas
- Drag & drop / movement pallet dan audit movement
- Laporan distribusi slot dan FIFO

## Modul 2 — Manajemen Palet & Item
- Master pallet dengan validation status dan state
- Dynamic item fields melalui `customFields` JSON
- Barcode/SKU validation dan camera scanner jika browser mendukung BarcodeDetector
- Summary fisik: kemasan, karton, karung, box, berat, SKU
- Riwayat posisi pallet dan tracking user/waktu

## Modul 3 — Transaksi Inbound & Outbound
- Gateway inbound/outbound dengan checklist dan validasi
- Dispatch driver + nopol
- Draft/pending verification sebelum inventory berubah
- Verifikasi/penolakan draft
- Log aktivitas transaksi
- Transaksi confirmed disimpan di MongoDB

## Modul 4 — Grouping & Rekap Manifest
- Grouping transaksi confirmed berdasarkan nopol + nama driver
- Deferred reconciliation
- Summary dan sorting berdasarkan berat
- Breakdown karton/karung/box/kemasan
- Cetak nota melalui browser dan export CSV

## Backend
- MongoDB: `mongodb://127.0.0.1:27017/pasata_db`
- API port: `3000`

## Frontend
- Vite / React
- API base URL: `http://localhost:3000/api`
