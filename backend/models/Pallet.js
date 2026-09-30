import mongoose from 'mongoose'

const itemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  sku: { type: String, required: true, trim: true },
  itemName: { type: String, required: true, trim: true },
  itemType: { type: String, default: '', trim: true },
  packaging: { type: String, default: '-', trim: true },
  packageQty: { type: Number, default: 0, min: 0 },
  cartonQty: { type: Number, default: 0, min: 0 },
  sackQty: { type: Number, default: 0, min: 0 },
  boxQty: { type: Number, default: 0, min: 0 },
  weightKg: { type: Number, default: 0, min: 0 },
  barcode: { type: String, default: '', trim: true },
  receivedAt: { type: Date, default: Date.now },
  customFields: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false })

const palletSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  status: { type: String, enum: ['empty', 'occupied'], default: 'empty' },
  state: { type: String, enum: ['empty', 'occupied', 'partial', 'blocked', 'moving'], default: 'empty' },
  validationStatus: { type: String, enum: ['pending', 'valid', 'invalid'], default: 'pending' },
  validationNote: { type: String, default: '' },
  color: { type: String, default: '#4f7cff' },
  locationStatus: { type: String, enum: ['placed', 'unplaced', 'moving'], default: 'unplaced' },
  location: { type: mongoose.Schema.Types.Mixed, default: null },
  items: { type: [itemSchema], default: [] }
}, { timestamps: true })

const positionHistorySchema = new mongoose.Schema({
  palletId: { type: String, required: true },
  movedAt: { type: Date, default: Date.now },
  userId: String,
  username: String,
  from: { type: mongoose.Schema.Types.Mixed, default: null },
  to: { type: mongoose.Schema.Types.Mixed, default: null },
  source: { type: String, default: 'pallet' },
  note: { type: String, default: '' }
}, { timestamps: true })

const Pallet = mongoose.models.Pallet || mongoose.model('Pallet', palletSchema, 'pallets')
const PositionHistory = mongoose.models.PositionHistory || mongoose.model('PositionHistory', positionHistorySchema, 'pallet_position_history')

export { Pallet, PositionHistory }
export default Pallet
