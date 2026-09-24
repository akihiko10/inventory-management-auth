import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()

const itemSchema = new mongoose.Schema({
  id: String,
  sku: String,
  itemName: String,
  itemType: { type: String, default: '' },
  packaging: String,
  packageQty: { type: Number, default: 0 },
  cartonQty: { type: Number, default: 0 },
  sackQty: { type: Number, default: 0 },
  boxQty: { type: Number, default: 0 },
  weightKg: { type: Number, default: 0 },
  barcode: { type: String, default: '' },
  receivedAt: { type: Date, default: Date.now },
  customFields: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false })

const positionHistorySchema = new mongoose.Schema({
  palletId: String,
  movedAt: { type: Date, default: Date.now },
  userId: String,
  username: String,
  from: { type: mongoose.Schema.Types.Mixed, default: null },
  to: { type: mongoose.Schema.Types.Mixed, default: null },
  source: { type: String, default: 'pallet' },
  note: { type: String, default: '' }
}, { timestamps: true })

const palletSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  status: { type: String, default: 'empty' },
  state: { type: String, enum: ['empty', 'occupied', 'partial', 'blocked', 'moving'], default: 'empty' },
  validationStatus: { type: String, enum: ['pending', 'valid', 'invalid'], default: 'pending' },
  validationNote: { type: String, default: '' },
  color: { type: String, default: '#4f7cff' },
  locationStatus: { type: String, enum: ['placed', 'unplaced', 'moving'], default: 'unplaced' },
  location: { type: mongoose.Schema.Types.Mixed, default: null },
  items: [itemSchema]
}, { timestamps: true })

const Pallet = mongoose.models.Pallet || mongoose.model('Pallet', palletSchema, 'pallets')
const PositionHistory = mongoose.models.PositionHistory || mongoose.model('PositionHistory', positionHistorySchema, 'pallet_position_history')

export { Pallet, PositionHistory }

function generateItemId() {
  return `ITEM-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

function calculateSummary(pallet) {
  const items = pallet.items || []
  return {
    totalWeight: items.reduce((sum, item) => sum + Number(item.weightKg || 0), 0),
    totalCartons: items.reduce((sum, item) => sum + Number(item.cartonQty || 0), 0),
    totalPackages: items.reduce((sum, item) => sum + Number(item.packageQty || 0), 0),
    totalSacks: items.reduce((sum, item) => sum + Number(item.sackQty || 0), 0),
    totalBoxes: items.reduce((sum, item) => sum + Number(item.boxQty || 0), 0),
    totalSku: new Set(items.map(item => item.sku).filter(Boolean)).size,
    itemCount: items.length
  }
}

function deriveState(items) {
  if (!items?.length) return 'empty'
  const hasPositive = items.some(item => Number(item.packageQty || 0) + Number(item.cartonQty || 0) + Number(item.sackQty || 0) + Number(item.boxQty || 0) + Number(item.weightKg || 0) > 0)
  if (!hasPositive) return 'empty'
  const allPositive = items.every(item => Number(item.packageQty || 0) > 0 || Number(item.cartonQty || 0) > 0 || Number(item.sackQty || 0) > 0 || Number(item.boxQty || 0) > 0 || Number(item.weightKg || 0) > 0)
  return allPositive ? 'occupied' : 'partial'
}

function syncState(pallet) {
  pallet.state = deriveState(pallet.items)
  pallet.status = pallet.state === 'empty' ? 'empty' : 'occupied'
}

function formatPallet(pallet) {
  const plain = pallet.toObject ? pallet.toObject() : pallet
  return { ...plain, summary: calculateSummary(plain) }
}

function findPalletById(id) {
  return Pallet.findOne({ id: new RegExp(`^${String(id).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$`, 'i') })
}

// ======================================================
// MASTER PALLET + VALIDATION
// ======================================================
router.get('/', async (_req, res) => {
  try {
    const data = await Pallet.find().sort({ createdAt: -1 })
    res.json(data.map(formatPallet))
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data pallet', error: err.message })
  }
})

router.post('/validate-barcode', async (req, res) => {
  try {
    const barcode = String(req.body.barcode || '').trim()
    const sku = String(req.body.sku || '').trim()
    if (!barcode && !sku) return res.status(400).json({ message: 'Barcode atau SKU wajib diisi' })

    const filter = barcode ? { 'items.barcode': barcode } : { 'items.sku': new RegExp(`^${sku}$`, 'i') }
    const pallets = await Pallet.find(filter)
    const matches = []
    for (const pallet of pallets) {
      for (const item of pallet.items || []) {
        if ((barcode && item.barcode === barcode) || (sku && item.sku?.toLowerCase() === sku.toLowerCase())) {
          matches.push({ palletId: pallet.id, palletName: pallet.name, item })
        }
      }
    }
    res.json({ valid: matches.length > 0, barcode, sku, matches })
  } catch (err) {
    res.status(500).json({ message: 'Gagal memvalidasi barcode/SKU', error: err.message })
  }
})

router.get('/:palletId', async (req, res) => {
  try {
    const pallet = await findPalletById(req.params.palletId)
    if (!pallet) return res.status(404).json({ message: 'Pallet tidak ditemukan' })
    res.json(formatPallet(pallet))
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil detail pallet', error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const id = String(req.body.id || '').trim()
    if (!id) return res.status(400).json({ message: 'Pallet ID wajib diisi' })
    if (await Pallet.findOne({ id })) return res.status(409).json({ message: 'Pallet ID sudah digunakan' })

    const pallet = new Pallet({
      id,
      name: String(req.body.name || `Pallet ${id}`).trim(),
      status: 'empty',
      state: 'empty',
      validationStatus: 'pending',
      locationStatus: 'unplaced',
      color: req.body.color || '#4f7cff',
      items: []
    })
    await pallet.save()
    res.status(201).json(formatPallet(pallet))
  } catch (err) {
    res.status(500).json({ message: 'Gagal membuat pallet', error: err.message })
  }
})

router.put('/:palletId/validation', async (req, res) => {
  try {
    const pallet = await findPalletById(req.params.palletId)
    if (!pallet) return res.status(404).json({ message: 'Pallet tidak ditemukan' })
    const status = ['pending', 'valid', 'invalid'].includes(req.body.validationStatus) ? req.body.validationStatus : null
    if (!status) return res.status(400).json({ message: 'Status validasi tidak valid' })
    pallet.validationStatus = status
    pallet.validationNote = String(req.body.validationNote || '').trim()
    await pallet.save()
    res.json(formatPallet(pallet))
  } catch (err) {
    res.status(500).json({ message: 'Gagal memperbarui validasi pallet', error: err.message })
  }
})

router.put('/:palletId', async (req, res) => {
  try {
    const pallet = await findPalletById(req.params.palletId)
    if (!pallet) return res.status(404).json({ message: 'Pallet tidak ditemukan' })
    if (req.body.name !== undefined) pallet.name = String(req.body.name).trim()
    if (req.body.color !== undefined) pallet.color = String(req.body.color)
    if (req.body.status !== undefined) pallet.status = String(req.body.status)
    if (req.body.state !== undefined && ['empty', 'occupied', 'partial', 'blocked', 'moving'].includes(req.body.state)) pallet.state = req.body.state
    syncState(pallet)
    await pallet.save()
    res.json(formatPallet(pallet))
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengupdate pallet', error: err.message })
  }
})

// ======================================================
// DYNAMIC ITEM MANAGER
// ======================================================
router.post('/:palletId/items', async (req, res) => {
  try {
    const pallet = await findPalletById(req.params.palletId)
    if (!pallet) return res.status(404).json({ message: 'Pallet tidak ditemukan' })
    const sku = String(req.body.sku || '').trim()
    const itemName = String(req.body.itemName || '').trim()
    const barcode = String(req.body.barcode || '').trim()
    if (!sku) return res.status(400).json({ message: 'SKU wajib diisi' })
    if (!itemName) return res.status(400).json({ message: 'Nama barang wajib diisi' })
    if (barcode && pallet.items.some(item => item.barcode === barcode)) return res.status(409).json({ message: 'Barcode sudah digunakan dalam pallet ini' })

    const item = {
      id: generateItemId(), sku, itemName,
      itemType: String(req.body.itemType || '').trim(),
      packaging: String(req.body.packaging || '-').trim(),
      packageQty: Number(req.body.packageQty || 0), cartonQty: Number(req.body.cartonQty || 0),
      sackQty: Number(req.body.sackQty || 0), boxQty: Number(req.body.boxQty || 0), weightKg: Number(req.body.weightKg || 0),
      barcode, receivedAt: req.body.receivedAt ? new Date(req.body.receivedAt) : new Date(),
      customFields: req.body.customFields && typeof req.body.customFields === 'object' ? req.body.customFields : {}
    }
    pallet.items.push(item)
    syncState(pallet)
    await pallet.save()
    res.status(201).json({ item, pallet: formatPallet(pallet) })
  } catch (err) {
    res.status(500).json({ message: 'Gagal menambah item ke pallet', error: err.message })
  }
})

router.put('/:palletId/items/:itemId', async (req, res) => {
  try {
    const pallet = await findPalletById(req.params.palletId)
    if (!pallet) return res.status(404).json({ message: 'Pallet tidak ditemukan' })
    const item = pallet.items.find(item => item.id === req.params.itemId)
    if (!item) return res.status(404).json({ message: 'Item tidak ditemukan' })
    const fields = ['sku', 'itemName', 'itemType', 'packaging', 'barcode']
    for (const field of fields) if (req.body[field] !== undefined) item[field] = String(req.body[field]).trim()
    for (const field of ['packageQty', 'cartonQty', 'sackQty', 'boxQty', 'weightKg']) if (req.body[field] !== undefined) item[field] = Number(req.body[field])
    if (req.body.receivedAt !== undefined) item.receivedAt = new Date(req.body.receivedAt)
    if (req.body.customFields !== undefined && typeof req.body.customFields === 'object') item.customFields = req.body.customFields
    syncState(pallet)
    await pallet.save()
    res.json({ item, pallet: formatPallet(pallet) })
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengupdate item', error: err.message })
  }
})

router.delete('/:palletId/items/:itemId', async (req, res) => {
  try {
    const pallet = await findPalletById(req.params.palletId)
    if (!pallet) return res.status(404).json({ message: 'Pallet tidak ditemukan' })
    const index = pallet.items.findIndex(item => item.id === req.params.itemId)
    if (index === -1) return res.status(404).json({ message: 'Item tidak ditemukan' })
    const [deletedItem] = pallet.items.splice(index, 1)
    syncState(pallet)
    await pallet.save()
    res.json({ message: 'Item berhasil dihapus', item: deletedItem, pallet: formatPallet(pallet) })
  } catch (err) {
    res.status(500).json({ message: 'Gagal menghapus item', error: err.message })
  }
})

router.delete('/:palletId/items', async (req, res) => {
  try {
    const pallet = await findPalletById(req.params.palletId)
    if (!pallet) return res.status(404).json({ message: 'Pallet tidak ditemukan' })
    pallet.items = []
    syncState(pallet)
    await pallet.save()
    res.json({ message: 'Semua barang dalam pallet berhasil dikosongkan', pallet: formatPallet(pallet) })
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengosongkan pallet', error: err.message })
  }
})

router.get('/:palletId/position-history', async (req, res) => {
  try {
    const history = await PositionHistory.find({ palletId: req.params.palletId }).sort({ movedAt: -1 }).limit(300)
    res.json(history)
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil riwayat posisi pallet', error: err.message })
  }
})

export default router
