import mongoose from 'mongoose'

const transactionItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, default: null },
    sku: { type: String, required: true },
    itemName: { type: String, required: true },
    packaging: { type: String, default: '-' },
    packageQty: { type: Number, default: 0 },
    cartonQty: { type: Number, default: 0 },
    sackQty: { type: Number, default: 0 },
    weightKg: { type: Number, default: 0 },
    barcode: { type: String, default: '' }
  },
  { _id: false }
)

const transactionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // TRX-0001
    type: { type: String, enum: ['inbound', 'outbound'], required: true },
    pallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pallet',
      required: true
    }, // foreign key beneran ke collection Pallet
    palletId: { type: String, required: true }, // denormalized, dipakai frontend
    palletName: { type: String, required: true },
    driverName: { type: String, required: true },
    nopol: { type: String, required: true },
    items: { type: [transactionItemSchema], required: true },
    status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
    confirmedAt: { type: Date, default: Date.now },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    } // foreign key ke User yang bikin transaksi ini
  },
  { versionKey: false }
)

export default mongoose.model('Transaction', transactionSchema)
