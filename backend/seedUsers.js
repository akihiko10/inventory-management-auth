import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from './models/User.js'

dotenv.config()

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pasata_wms'

const dummyUsers = [
  { username: 'superadmin', password: 'password123', role: 'super_admin', name: 'Super Admin Pasata' },
  { username: 'admin', password: 'password123', role: 'admin', name: 'Admin Gudang' },
  { username: 'staf', password: 'password123', role: 'staf_gudang', name: 'Staf Lapangan' },
  { username: 'owner', password: 'password123', role: 'owner', name: 'Owner' },
  { username: 'investor', password: 'password123', role: 'investor', name: 'Investor Utama' }
]

const seedDB = async () => {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('MongoDB Connected...')

    await User.deleteMany({})

    for (const u of dummyUsers) {
      const user = new User(u)
      await user.save()
    }

    console.log('✅ 5 Akun Aktor Berhasil Dibuat!')
    process.exit()
  } catch (error) {
    console.error('❌ Gagal Seeding:', error)
    process.exit(1)
  }
}

seedDB()
