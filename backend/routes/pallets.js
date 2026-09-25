import { Router } from 'express'
import Pallet from '../models/Pallet.js'
import PalletDetail from '../models/PalletDetail.js'

const router = Router()

<<<<<<< HEAD
=======
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

>>>>>>> update-inventory-system
function generateItemId() {
  return `ITEM-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

<<<<<<< HEAD
function calculateSummary(items) {
=======
function calculateSummary(pallet) {
  const items = pallet.items || []
>>>>>>> update-inventory-system
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

<<<<<<< HEAD
function formatItem(detail) {
  const plain = detail.toObject ? detail.toObject() : detail
  return {
    id: plain.id,
    sku: plain.sku,
    itemName: plain.itemName,
    packaging: plain.packaging,
    packageQty: plain.packageQty,
    cartonQty: plain.cartonQty,
    sackQty: plain.sackQty,
    weightKg: plain.weightKg,
    barcode: plain.barcode
  }
}

// Gabungin dokumen Pallet + PalletDetail-nya jadi satu bentuk response,
// persis kayak dulu waktu items masih embedded di dalam Pallet.
async function formatPallet(pallet) {
  const plain = pallet.toObject ? pallet.toObject() : pallet
  const details = await PalletDetail.find({ pallet: plain._id })
  const items = details.map(formatItem)

  return {
    id: plain.id,
    name: plain.name,
    status: plain.status,
    items,
    summary: calculateSummary(items)
  }
}

router.get('/', async (_req, res) => {
  const pallets = await Pallet.find()
  res.json(await Promise.all(pallets.map(formatPallet)))
})

router.get('/:palletId', async (req, res) => {
  const pallet = await Pallet.findOne({ id: new RegExp(`^${req.params.palletId}$`, 'i') })

  if (!pallet) {
    return res.status(404).json({ message: 'Pallet tidak ditemukan' })
=======
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
>>>>>>> update-inventory-system
  }

  res.json(await formatPallet(pallet))
})

router.post('/', async (req, res) => {
<<<<<<< HEAD
  const { id, name } = req.body

  if (!id || !id.trim()) {
    return res.status(400).json({ message: 'Pallet ID wajib diisi' })
=======
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
>>>>>>> update-inventory-system
  }

  const existing = await Pallet.findOne({ id: new RegExp(`^${id.trim()}$`, 'i') })

  if (existing) {
    return res.status(409).json({ message: 'Pallet ID sudah digunakan' })
  }

  const pallet = await Pallet.create({
    id: id.trim(),
    name: name?.trim() || `Pallet ${id.trim()}`,
    status: 'empty'
  })

  res.status(201).json(await formatPallet(pallet))
})

<<<<<<< HEAD
router.put('/:palletId', async (req, res) => {
  const pallet = await Pallet.findOne({ id: new RegExp(`^${req.params.palletId}$`, 'i') })

  if (!pallet) {
    return res.status(404).json({ message: 'Pallet tidak ditemukan' })
=======
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
>>>>>>> update-inventory-system
  }

  if (req.body.name !== undefined) {
    pallet.name = String(req.body.name).trim()
  }

  if (req.body.status !== undefined) {
    pallet.status = req.body.status
  }

  await pallet.save()
  res.json(await formatPallet(pallet))
})

<<<<<<< HEAD
router.post('/:palletId/items', async (req, res) => {
  const pallet = await Pallet.findOne({ id: new RegExp(`^${req.params.palletId}$`, 'i') })

  if (!pallet) {
    return res.status(404).json({ message: 'Pallet tidak ditemukan' })
  }

  const {
    sku,
    itemName,
    packaging,
    packageQty,
    cartonQty,
    sackQty,
    weightKg,
    barcode
  } = req.body

  if (!sku?.trim()) {
    return res.status(400).json({ message: 'SKU wajib diisi' })
  }

  if (!itemName?.trim()) {
    return res.status(400).json({ message: 'Nama barang wajib diisi' })
  }

  if (barcode?.trim()) {
    const barcodeUsed = await PalletDetail.findOne({ pallet: pallet._id, barcode: barcode.trim() })
    if (barcodeUsed) {
      return res.status(409).json({ message: 'Barcode sudah digunakan dalam pallet ini' })
    }
=======
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
>>>>>>> update-inventory-system
  }

  const detail = await PalletDetail.create({
    id: generateItemId(),
    pallet: pallet._id,
    palletCode: pallet.id,
    sku: sku.trim(),
    itemName: itemName.trim(),
    packaging: packaging?.trim() || '-',
    packageQty: Number(packageQty || 0),
    cartonQty: Number(cartonQty || 0),
    sackQty: Number(sackQty || 0),
    weightKg: Number(weightKg || 0),
    barcode: barcode?.trim() || ''
  })

  pallet.status = 'occupied'
  await pallet.save()

  res.status(201).json({
    item: formatItem(detail),
    pallet: await formatPallet(pallet)
  })
})

router.put('/:palletId/items/:itemId', async (req, res) => {
<<<<<<< HEAD
  const pallet = await Pallet.findOne({ id: new RegExp(`^${req.params.palletId}$`, 'i') })

  if (!pallet) {
    return res.status(404).json({ message: 'Pallet tidak ditemukan' })
=======
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
>>>>>>> update-inventory-system
  }

  const detail = await PalletDetail.findOne({ id: req.params.itemId, pallet: pallet._id })

  if (!detail) {
    return res.status(404).json({ message: 'Item tidak ditemukan' })
  }

  if (req.body.sku !== undefined) detail.sku = String(req.body.sku).trim()
  if (req.body.itemName !== undefined) detail.itemName = String(req.body.itemName).trim()
  if (req.body.packaging !== undefined) detail.packaging = String(req.body.packaging).trim()
  if (req.body.packageQty !== undefined) detail.packageQty = Number(req.body.packageQty)
  if (req.body.cartonQty !== undefined) detail.cartonQty = Number(req.body.cartonQty)
  if (req.body.sackQty !== undefined) detail.sackQty = Number(req.body.sackQty)
  if (req.body.weightKg !== undefined) detail.weightKg = Number(req.body.weightKg)
  if (req.body.barcode !== undefined) detail.barcode = String(req.body.barcode).trim()

  await detail.save()

  res.json({
    item: formatItem(detail),
    pallet: await formatPallet(pallet)
  })
})

router.delete('/:palletId/items/:itemId', async (req, res) => {
<<<<<<< HEAD
  const pallet = await Pallet.findOne({ id: new RegExp(`^${req.params.palletId}$`, 'i') })

  if (!pallet) {
    return res.status(404).json({ message: 'Pallet tidak ditemukan' })
=======
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
>>>>>>> update-inventory-system
  }

  const detail = await PalletDetail.findOneAndDelete({ id: req.params.itemId, pallet: pallet._id })

  if (!detail) {
    return res.status(404).json({ message: 'Item tidak ditemukan' })
  }

  const remaining = await PalletDetail.countDocuments({ pallet: pallet._id })
  pallet.status = remaining > 0 ? 'occupied' : 'empty'
  await pallet.save()

  res.json({
    message: 'Item berhasil dihapus',
    item: formatItem(detail),
    pallet: await formatPallet(pallet)
  })
})

router.delete('/:palletId/items', async (req, res) => {
<<<<<<< HEAD
  const pallet = await Pallet.findOne({ id: new RegExp(`^${req.params.palletId}$`, 'i') })

  if (!pallet) {
    return res.status(404).json({ message: 'Pallet tidak ditemukan' })
=======
  try {
    const pallet = await findPalletById(req.params.palletId)
    if (!pallet) return res.status(404).json({ message: 'Pallet tidak ditemukan' })
    pallet.items = []
    syncState(pallet)
    await pallet.save()
    res.json({ message: 'Semua barang dalam pallet berhasil dikosongkan', pallet: formatPallet(pallet) })
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengosongkan pallet', error: err.message })
>>>>>>> update-inventory-system
  }

  await PalletDetail.deleteMany({ pallet: pallet._id })
  pallet.status = 'empty'
  await pallet.save()

  res.json({
    message: 'Semua barang dalam pallet berhasil dikosongkan',
    pallet: await formatPallet(pallet)
  })
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
