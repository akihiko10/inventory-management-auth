# Inventory Management System

Sistem manajemen inventory warehouse/cold storage yang terdiri dari **Web**, **Mobile**, **Backend REST API**, dan **MongoDB**.

Project saat ini berada pada tahap **implementasi dan integrasi sistem**. Fitur utama sudah tersedia pada sisi web dan backend, sedangkan beberapa alur masih dalam tahap penyempurnaan dan pengujian integrasi.

---

## Status Project

### Web

Frontend web menggunakan:

- **React.js**
- **JavaScript**
- **JSX**
- **CSS**
- **React Router**

Fitur web yang sudah diimplementasikan:

- Authentication
  - Login
  - Register
  - Logout
  - Ganti akun
  - Proteksi halaman berdasarkan sesi login
- Dashboard
  - Ringkasan data inventory
  - Statistik pallet
  - Visualisasi pallet
  - Aktivitas/transaksi
- Pallet
  - Master Data Pallet
  - Validasi pallet: `Pending`, `Valid`, `Invalid`
  - Manajemen barang dalam pallet
  - Tambah barang
  - Edit barang
  - Hapus barang
  - Barcode & SKU
  - Summary fisik
  - Riwayat posisi
- Pallet Layout
  - Layout pallet
  - Penempatan pallet
  - Perpindahan posisi pallet
  - Pengelolaan item pada pallet
- Denah Gudang
  - Warehouse
  - Cold storage
  - Rack
  - Level
  - Slot
  - Monitoring kapasitas
  - Movement pallet
- Inbound
  - Data transaksi inbound
  - Pemilihan pallet dan barang
  - Driver dan nopol
  - Draft transaksi
- Outbound
  - Data transaksi outbound
  - Pemilihan pallet dan barang
  - Validasi quantity/stok
  - Driver dan nopol
  - Draft transaksi
- Transaksi
  - Draft
  - Validasi
  - Konfirmasi
  - Log dan riwayat transaksi
- Manifest
  - Grouping armada
  - Rekonsiliasi
  - Summary berat
  - Summary kemasan
  - Cetak nota
  - Export

### Mobile

Folder `mobile/` merupakan client kedua yang menggunakan **backend REST API yang sama**.

Teknologi:

- **Flutter**
- **Dart**
- `mobile_scanner` untuk kebutuhan scanning barcode

Fokus mobile adalah **operasional lapangan**, bukan seluruh administrasi web.

Fitur yang sedang/akan digunakan pada mobile:

- Dashboard
- Pallet
  - Cari pallet
  - Scan barcode
  - Detail pallet
  - Barang dalam pallet
  - Summary fisik
  - Update posisi
  - Riwayat posisi
- Scan pallet/SKU
- Inbound
- Outbound
- Dispatch driver dan nopol
- Transaksi draft
- Log dan riwayat
- Manifest

Fitur administrasi yang kompleks seperti konfigurasi layout, drag & drop desktop, grouping/reconciliation mendalam, serta cetak/export tetap lebih sesuai dilakukan melalui Web.

---

## Backend

Backend menggunakan:

- **Node.js**
- **Express.js**
- **JavaScript**
- **Mongoose**
- **MongoDB**

Backend berfungsi sebagai REST API yang digunakan oleh Web dan Mobile.

Arsitektur:

```text
Web React.js ─────┐
                  │
Mobile Flutter ───┼──> REST API ──> Express.js ──> Mongoose ──> MongoDB
                  │
                  └──────────────────────────────────────────────
```

Frontend Web dan Mobile **tidak mengakses MongoDB secara langsung**. Semua proses data melewati backend.

---

## Alur Sistem

### Authentication

```text
User
 ↓
Login / Register
 ↓
Frontend
 ↓
POST /api/auth/login
 ↓
Backend
 ↓
Validasi akun
 ↓
Session / token
 ↓
Frontend menyimpan sesi
 ↓
User dapat mengakses halaman yang dilindungi
```

Halaman yang membutuhkan autentikasi akan diarahkan ke:

```text
/login
```

Jika user belum login, URL login tetap menggunakan `/login`, bukan route halaman yang sebelumnya dibuka.

---

### Pallet

```text
User
 ↓
Pallet
 ↓
GET /api/pallets
 ↓
Backend
 ↓
MongoDB
 ↓
Data pallet
 ↓
Frontend
```

Validasi pallet:

```text
Pending
   ↓
Valid / Invalid
   ↓
PUT /api/pallets/:palletId/validation
   ↓
MongoDB
   ↓
Frontend reload data
```

---

### Tambah Barang ke Pallet

```text
Pilih Pallet
 ↓
Tambah Barang
 ↓
SKU + Nama + Barcode + Kemasan + Quantity + Berat
 ↓
POST /api/pallets/:palletId/items
 ↓
Backend validation
 ↓
MongoDB
 ↓
Pallet diperbarui
 ↓
Frontend reload
```

---

### Update Posisi

```text
Pallet
 ↓
Warehouse
 ↓
Cold Storage
 ↓
Rack
 ↓
Level
 ↓
Slot
 ↓
Movement API
 ↓
MongoDB
 ↓
Posisi pallet diperbarui
 ↓
Riwayat posisi tercatat
```

---

### Inbound

```text
Barang datang
 ↓
Pilih / Scan Pallet
 ↓
Pilih Barang
 ↓
Quantity
 ↓
Driver + Nopol
 ↓
Validasi
 ↓
Draft / Transaksi
 ↓
Konfirmasi
 ↓
Inventory diperbarui
```

### Outbound

```text
Permintaan barang keluar
 ↓
Pilih / Scan Pallet
 ↓
Pilih Barang
 ↓
Quantity
 ↓
Validasi stok
 ↓
Driver + Nopol
 ↓
Draft / Transaksi
 ↓
Konfirmasi
 ↓
Inventory diperbarui
```

### Manifest

```text
Transaksi / Muatan
 ↓
Grouping Armada
 ↓
Manifest
 ↓
Rekonsiliasi
 ↓
Summary Berat & Kemasan
 ↓
Cetak Nota / Export
```

---

## Struktur Project

```text
inventory-management-auth/
│
├── backend/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── layouts/
│   │   └── App.jsx
│   └── package.json
│
└── mobile/
    ├── lib/
    │   ├── screens/
    │   ├── services/
    │   └── main.dart
    └── pubspec.yaml
```

---

## Menjalankan Project

### Backend

```bash
cd backend
npm install
npm run dev
```

Backend:

```text
http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

### Mobile

Pastikan Flutter dan Android device sudah tersedia.

```bash
cd mobile
flutter pub get
flutter run
```

Jika menggunakan device Android melalui USB, pastikan device terdeteksi:

```bash
flutter devices
```

---

## Teknologi

| Bagian | Teknologi |
|---|---|
| Web Frontend | React.js |
| Web Language | JavaScript / JSX |
| Styling | CSS |
| Mobile | Flutter |
| Mobile Language | Dart |
| Backend | Node.js |
| Backend Framework | Express.js |
| Backend Language | JavaScript |
| Database | MongoDB |
| ODM | Mongoose |
| API | REST API |
| Barcode Mobile | mobile_scanner |

---

## Status Pengembangan

### Sudah tersedia

- [x] Authentication dasar
- [x] Web frontend
- [x] Backend REST API
- [x] MongoDB integration
- [x] Master pallet
- [x] Manajemen item pallet
- [x] Validasi pallet
- [x] Barcode/SKU
- [x] Summary fisik
- [x] Riwayat posisi
- [x] Pallet layout
- [x] Warehouse/slot monitoring
- [x] Inbound
- [x] Outbound
- [x] Draft transaksi
- [x] Log transaksi
- [x] Manifest
- [x] Cetak nota manifest
- [x] Web-mobile menggunakan backend yang sama

### Dalam tahap penyempurnaan/testing

- [ ] Penyempurnaan seluruh alur mobile
- [ ] Pemisahan fungsi setiap submenu mobile agar tidak terjadi duplikasi
- [ ] Pengujian end-to-end Web → API → MongoDB
- [ ] Pengujian end-to-end Mobile → API → MongoDB
- [ ] Penyempurnaan UI/UX
- [ ] Validasi seluruh edge case transaksi
- [ ] Finalisasi dokumentasi project

---

## Catatan Development

Authentication saat ini masih memiliki komponen development/in-memory sesuai implementasi project sebelumnya. Password backend tidak disimpan sebagai plaintext dan menggunakan hashing.

Akun demo:

```text
Username: admin
Password: admin123
```

Untuk deployment production, authentication dan session management perlu dipindahkan ke konfigurasi production yang lebih permanen.

---

## Tujuan Sistem

Sistem digunakan untuk membantu pengelolaan inventory warehouse/cold storage, terutama:

1. Pengelolaan pallet.
2. Pengelolaan barang dalam pallet.
3. Pelacakan posisi pallet.
4. Pengelolaan inbound dan outbound.
5. Validasi driver dan kendaraan.
6. Pencatatan transaksi.
7. Grouping dan manifest.
8. Monitoring inventory.
9. Mendukung operasional melalui Web dan Mobile.
