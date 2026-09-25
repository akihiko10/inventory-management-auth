# Warehouse Management Mobile

Mobile client untuk sistem Inventory Management. Fitur dan API dibuat 1:1 dengan web: dashboard, pallet, pallet layout, denah gudang, inbound, outbound, transaksi, dan manifest.

## Menjalankan

1. Pastikan backend web berjalan di komputer pada port 3000.
2. Masuk ke folder `mobile`.
3. `npm install`
4. Salin `.env.example` menjadi `.env` dan sesuaikan `EXPO_PUBLIC_API_URL`.
5. `npm start`
6. Scan QR dengan Expo Go atau jalankan emulator Android.

### Catatan koneksi
- Android Emulator: `10.0.2.2` menunjuk ke komputer host.
- iOS Simulator: `localhost`.
- HP fisik: komputer dan HP harus berada di Wi-Fi/LAN yang sama, lalu gunakan IP komputer, misalnya `http://192.168.1.10:3000/api`.
- Windows Firewall harus mengizinkan Node.js/port 3000 bila HP fisik tidak bisa terhubung.

## Prinsip UI

Mobile mempertahankan semua fungsi web, tetapi interaksi disesuaikan dengan layar sentuh. Drag & drop desktop untuk movement pallet di mobile menggunakan pola `Pilih pallet -> pilih tujuan -> konfirmasi`, sehingga fungsi tetap sama tanpa membuat target slot terlalu kecil.


## Expo SDK 54 compatibility

Dependencies are pinned to Expo SDK 54 compatible versions. Do not use caret (`^`) ranges for Expo/RN native packages in this project.
