import mongoose from 'mongoose'

const slotSchema = new mongoose.Schema(
  {
    position: { type: Number, required: true },
    pallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pallet',
      default: null
    }, // foreign key beneran ke collection Pallet
    palletId: { type: String, default: null }, // denormalized, dipakai frontend
    color: { type: String, default: null }
  },
  { _id: false }
)

const levelSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // L1, L2, ...
    name: { type: String, required: true },
    slots: { type: [slotSchema], default: [] }
  },
  { _id: false }
)

const layoutSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // LAY-001
    name: { type: String, required: true },
    orientation: { type: String, enum: ['horizontal', 'vertical'], default: 'horizontal' },
    fifoDirection: { type: String, enum: ['right', 'left', 'down', 'up'], default: 'right' },
    levels: { type: [levelSchema], default: [] }
  },
  { versionKey: false }
)

export default mongoose.model('Layout', layoutSchema)
