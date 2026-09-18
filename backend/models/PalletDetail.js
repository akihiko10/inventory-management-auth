import mongoose from 'mongoose'

// Collection terpisah untuk detail/isi barang tiap pallet.
// `pallet` adalah foreign key beneran (ObjectId -> collection Pallet),
// bukan cuma string kode kayak sebelumnya.
const palletDetailSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // ITEM-...
    pallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pallet',
      required: true
    },
    palletCode: { type: String, required: true }, // denormalized, buat display cepat
    sku: { type: String, required: true },
    itemName: { type: String, required: true },
    packaging: { type: String, default: '-' },
    packageQty: { type: Number, default: 0 },
    cartonQty: { type: Number, default: 0 },
    sackQty: { type: Number, default: 0 },
    weightKg: { type: Number, default: 0 },
    barcode: { type: String, default: '' }
  },
  { versionKey: false }
)

palletDetailSchema.index({ pallet: 1 })

export default mongoose.model('PalletDetail', palletDetailSchema)
