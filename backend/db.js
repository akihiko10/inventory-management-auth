import mongoose from 'mongoose'

// Windows: pastikan MongoDB Community Server jalan (lokal, default-nya
// otomatis nyala sebagai service di mongodb://127.0.0.1:27017), ATAU
// pakai MongoDB Atlas (cloud, gratis) dan set env var MONGO_URI.
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/logice_inventory'

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('MongoDB connected:', MONGO_URI)
  } catch (err) {
    console.error('Gagal konek ke MongoDB:', err.message)
    console.error('Pastikan MongoDB sudah jalan, atau cek MONGO_URI di environment variable.')
    process.exit(1)
  }
}
