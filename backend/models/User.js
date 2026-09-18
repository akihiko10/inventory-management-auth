import mongoose from 'mongoose'

// Field 'id' sengaja dipertahankan (bukan pakai _id Mongo langsung)
// supaya bentuk response API persis sama seperti versi in-memory lama,
// jadi frontend React gak perlu diubah sama sekali.
const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // USR-0001
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true }
  },
  { versionKey: false }
)

export default mongoose.model('User', userSchema)
