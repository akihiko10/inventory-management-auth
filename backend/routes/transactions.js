import { Router } from 'express'
import mongoose from 'mongoose'
import { Pallet } from './pallets.js'

const router = Router()

const transactionItemSchema = new mongoose.Schema({
  itemId: String,
  sku: String,
  itemName: String,
  itemType: String,
  packaging: String,
  packageQty: { type: Number, default: 0 },
  cartonQty: { type: Number, default: 0 },
  sackQty: { type: Number, default: 0 },
  boxQty: { type: Number, default: 0 },
  weightKg: { type: Number, default: 0 },
  barcode: String,
  selected: Boolean
}, { _id: false })

const transactionSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  type: { type: String, enum: ['inbound', 'outbound'], required: true },
  palletId: String,
  palletName: String,
  driverName: String,
  nopol: String,
  items: [transactionItemSchema],
  status: { type: String, enum: ['draft', 'pending', 'confirmed', 'rejected'], default: 'confirmed' },
  createdBy: String,
  createdByName: String,
  confirmedBy: String,
  confirmedByName: String,
  confirmedAt: Date,
  verifiedAt: Date,
  verificationNote: String,
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true })

const activityLogSchema = new mongoose.Schema({
  transactionId: String,
  action: String,
  type: String,
  status: String,
  userId: String,
  username: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true })

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema, 'transactions')
const TransactionActivity = mongoose.models.TransactionActivity || mongoose.model('TransactionActivity', activityLogSchema, 'transaction_activity_logs')

function number(value) {
  const result = Number(value)
  return Number.isFinite(result) && result >= 0 ? result : 0
}

async function generateTransactionId() {
  const count = await Transaction.countDocuments()
  return `TRX-${String(count + 1).padStart(5, '0')}-${Date.now().toString().slice(-4)}`
}

function normalizeItems(items) {
  return (Array.isArray(items) ? items : []).filter(item => item.selected !== false).map(item => ({
    itemId: item.itemId || null,
    sku: String(item.sku || '').trim(),
    itemName: String(item.itemName || '').trim(),
    itemType: String(item.itemType || '').trim(),
    packaging: String(item.packaging || '-').trim(),
    packageQty: number(item.packageQty),
    cartonQty: number(item.cartonQty),
    sackQty: number(item.sackQty),
    boxQty: number(item.boxQty),
    weightKg: number(item.weightKg),
    barcode: String(item.barcode || '').trim(),
    selected: true
  }))
}

function validateHeader({ type, palletId, driverName, nopol, items }) {
  if (!['inbound', 'outbound'].includes(type)) return 'Jenis transaksi harus inbound atau outbound'
  if (!String(palletId || '').trim()) return 'Pallet wajib dipilih'
  if (!String(driverName || '').trim()) return 'Nama driver wajib diisi'
  if (!String(nopol || '').trim()) return 'Nomor polisi wajib diisi'
  if (!Array.isArray(items) || items.length === 0) return 'Minimal satu barang harus dipilih'
  return null
}

async function validateTransactionInput(payload) {
  const error = validateHeader(payload)
  if (error) return { error }

  const pallet = await Pallet.findOne({ id: String(payload.palletId).trim() })
  if (!pallet) return { error: 'Pallet tidak ditemukan' }
  if (pallet.validationStatus === 'invalid') return { error: 'Pallet berstatus invalid dan tidak dapat diproses' }

  const items = normalizeItems(payload.items)
  if (!items.length) return { error: 'Pilih minimal satu item' }

  for (const item of items) {
    if (!item.sku) return { error: 'SKU wajib diisi untuk semua item' }
    if (!item.itemName && payload.type === 'inbound') return { error: `Nama barang untuk ${item.sku} wajib diisi` }
    const total = item.packageQty + item.cartonQty + item.sackQty + item.boxQty + item.weightKg
    if (total <= 0) return { error: `Jumlah transaksi untuk ${item.sku} harus lebih dari 0` }

    if (payload.type === 'outbound') {
      const existing = pallet.items.find(existingItem => existingItem.id === item.itemId || (existingItem.sku === item.sku && item.barcode && existingItem.barcode === item.barcode))
      if (!existing) return { error: `Item ${item.sku} tidak ditemukan di pallet` }
      if (item.packageQty > number(existing.packageQty) || item.cartonQty > number(existing.cartonQty) || item.sackQty > number(existing.sackQty) || item.boxQty > number(existing.boxQty) || item.weightKg > number(existing.weightKg)) {
        return { error: `Jumlah outbound ${item.sku} melebihi stok pallet` }
      }
      item.itemId = existing.id
      item.itemName = existing.itemName
      item.itemType = existing.itemType || item.itemType
      item.packaging = existing.packaging
      item.barcode = existing.barcode
    }
  }

  return { pallet, items }
}

async function applyInventory(transaction) {
  const pallet = await Pallet.findOne({ id: transaction.palletId })
  if (!pallet) throw new Error('Pallet tidak ditemukan saat verifikasi')

  if (transaction.type === 'inbound') {
    for (const input of transaction.items) {
      let item = input.itemId ? pallet.items.find(existing => existing.id === input.itemId) : null
      if (!item) item = pallet.items.find(existing => existing.sku?.toLowerCase() === input.sku.toLowerCase() && (!input.barcode || existing.barcode === input.barcode))
      if (!item) {
        item = {
          id: `ITEM-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          sku: input.sku, itemName: input.itemName, itemType: input.itemType, packaging: input.packaging,
          packageQty: 0, cartonQty: 0, sackQty: 0, boxQty: 0, weightKg: 0, barcode: input.barcode, receivedAt: new Date(), customFields: {}
        }
        pallet.items.push(item)
      }
      item.packageQty = number(item.packageQty) + number(input.packageQty)
      item.cartonQty = number(item.cartonQty) + number(input.cartonQty)
      item.sackQty = number(item.sackQty) + number(input.sackQty)
      item.boxQty = number(item.boxQty) + number(input.boxQty)
      item.weightKg = number(item.weightKg) + number(input.weightKg)
      if (!item.receivedAt) item.receivedAt = new Date()
    }
  } else {
    for (const output of transaction.items) {
      const item = pallet.items.find(existing => existing.id === output.itemId)
      if (!item) throw new Error(`Item ${output.sku} tidak ditemukan`) 
      item.packageQty = number(item.packageQty) - number(output.packageQty)
      item.cartonQty = number(item.cartonQty) - number(output.cartonQty)
      item.sackQty = number(item.sackQty) - number(output.sackQty)
      item.boxQty = number(item.boxQty) - number(output.boxQty)
      item.weightKg = number(item.weightKg) - number(output.weightKg)
    }
    pallet.items = pallet.items.filter(item => number(item.packageQty) > 0 || number(item.cartonQty) > 0 || number(item.sackQty) > 0 || number(item.boxQty) > 0 || number(item.weightKg) > 0)
  }

  pallet.state = pallet.items.length ? 'occupied' : 'empty'
  pallet.status = pallet.items.length ? 'occupied' : 'empty'
  await pallet.save()
  return pallet
}

async function logActivity(transaction, action, req, message) {
  await TransactionActivity.create({
    transactionId: transaction.id,
    action,
    type: transaction.type,
    status: transaction.status,
    userId: req.user?.id,
    username: req.user?.username,
    message
  })
}

router.get('/', async (req, res) => {
  try {
    const filter = {}
    if (req.query.type) filter.type = req.query.type
    if (req.query.status) filter.status = req.query.status
    if (req.query.palletId) filter.palletId = req.query.palletId
    const result = await Transaction.find(filter).sort({ createdAt: -1 }).limit(500)
    res.json(result)
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil transaksi', error: err.message })
  }
})

router.get('/drafts', async (_req, res) => {
  try {
    res.json(await Transaction.find({ status: { $in: ['draft', 'pending'] } }).sort({ createdAt: -1 }))
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil transaksi draft', error: err.message })
  }
})

router.get('/logs', async (_req, res) => {
  try {
    res.json(await TransactionActivity.find().sort({ createdAt: -1 }).limit(500))
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil log aktivitas transaksi', error: err.message })
  }
})

router.post('/validate', async (req, res) => {
  try {
    const result = await validateTransactionInput(req.body)
    if (result.error) return res.status(400).json({ valid: false, message: result.error })
    res.json({ valid: true, pallet: result.pallet, items: result.items, message: 'Checklist transaksi valid' })
  } catch (err) {
    res.status(500).json({ valid: false, message: err.message })
  }
})

router.post('/drafts', async (req, res) => {
  try {
    const result = await validateTransactionInput(req.body)
    if (result.error) return res.status(400).json({ message: result.error })
    const transaction = await Transaction.create({
      id: await generateTransactionId(), type: req.body.type, palletId: result.pallet.id, palletName: result.pallet.name,
      driverName: String(req.body.driverName).trim(), nopol: String(req.body.nopol).trim().toUpperCase(), items: result.items,
      status: 'pending', createdBy: req.user?.id, createdByName: req.user?.username
    })
    await logActivity(transaction, 'CREATE_DRAFT', req, 'Transaksi dibuat dan menunggu verifikasi')
    res.status(201).json(transaction)
  } catch (err) {
    res.status(500).json({ message: 'Gagal membuat transaksi draft', error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const result = await validateTransactionInput(req.body)
    if (result.error) return res.status(400).json({ message: result.error })
    const transaction = new Transaction({
      id: await generateTransactionId(), type: req.body.type, palletId: result.pallet.id, palletName: result.pallet.name,
      driverName: String(req.body.driverName).trim(), nopol: String(req.body.nopol).trim().toUpperCase(), items: result.items,
      status: 'confirmed', createdBy: req.user?.id, createdByName: req.user?.username,
      confirmedBy: req.user?.id, confirmedByName: req.user?.username, confirmedAt: new Date(), verifiedAt: new Date()
    })
    const pallet = await applyInventory(transaction)
    await transaction.save()
    await logActivity(transaction, 'CONFIRM', req, `Transaksi ${transaction.type} dikonfirmasi`)
    res.status(201).json({ message: transaction.type === 'inbound' ? 'Barang berhasil di-inbound' : 'Barang berhasil di-outbound', transaction, pallet })
  } catch (err) {
    res.status(500).json({ message: 'Gagal menyimpan transaksi', error: err.message })
  }
})

router.put('/drafts/:transactionId/verify', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ id: req.params.transactionId })
    if (!transaction) return res.status(404).json({ message: 'Draft transaksi tidak ditemukan' })
    if (!['draft', 'pending'].includes(transaction.status)) return res.status(409).json({ message: 'Draft sudah diproses' })
    const pallet = await applyInventory(transaction)
    transaction.status = 'confirmed'
    transaction.confirmedBy = req.user?.id
    transaction.confirmedByName = req.user?.username
    transaction.confirmedAt = new Date()
    transaction.verifiedAt = new Date()
    transaction.verificationNote = String(req.body.note || '').trim()
    await transaction.save()
    await logActivity(transaction, 'VERIFY', req, 'Draft diverifikasi dan inventory diperbarui')
    res.json({ message: 'Draft berhasil diverifikasi', transaction, pallet })
  } catch (err) {
    res.status(500).json({ message: 'Gagal memverifikasi draft', error: err.message })
  }
})

router.put('/drafts/:transactionId/reject', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ id: req.params.transactionId })
    if (!transaction) return res.status(404).json({ message: 'Draft transaksi tidak ditemukan' })
    if (!['draft', 'pending'].includes(transaction.status)) return res.status(409).json({ message: 'Draft sudah diproses' })
    transaction.status = 'rejected'
    transaction.verificationNote = String(req.body.note || 'Draft ditolak').trim()
    await transaction.save()
    await logActivity(transaction, 'REJECT', req, transaction.verificationNote)
    res.json({ message: 'Draft ditolak', transaction })
  } catch (err) {
    res.status(500).json({ message: 'Gagal menolak draft', error: err.message })
  }
})

router.get('/:transactionId', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ id: req.params.transactionId })
    if (!transaction) return res.status(404).json({ message: 'Transaksi tidak ditemukan' })
    res.json(transaction)
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil transaksi', error: err.message })
  }
})

export function createTransactionRouter() { return router }
export default router
