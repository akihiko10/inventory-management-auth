import mongoose from 'mongoose'

const palletSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // P01, P02, ...
    name: { type: String, required: true },
    status: { type: String, enum: ['empty', 'occupied'], default: 'empty' }
  },
  { versionKey: false }
)

export default mongoose.model('Pallet', palletSchema)
