# Backend Updated - Inventory Management

Perbaikan utama:
- Model Pallet sekarang benar-benar memakai schema lengkap: validationStatus, items, location, state, dll.
- Menghilangkan konflik model Mongoose lama yang menyebabkan field items/validation diabaikan.
- Endpoint validasi pallet menyimpan pending/valid/invalid dengan benar.
- POST/PUT item pallet menyimpan item embedded ke collection pallets.
- Error API mengembalikan alasan detail.
- Validasi barcode duplikat lebih aman.
- Migrasi otomatis dari collection PalletDetail lama ke `pallet.items` saat server start jika pallet belum memiliki embedded items.

Jalankan:
1. npm install
2. npm start

Pastikan MongoDB aktif.
