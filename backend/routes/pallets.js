import { Router } from 'express'
import { Pallet, PositionHistory } from '../models/Pallet.js'

const router = Router()

function generateItemId() {
  return `ITEM-${Date.now()}-${Math.floor(Math.random() * 100000)}`
}

function numberField(value, field) {
  if (value === undefined || value === null || value === '') return 0
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) {
    const error = new Error(`${field} harus berupa angka >= 0`)
    error.statusCode = 400
    throw error
  }
  return n
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return []
  return items.map(item => ({
    id: String(item.id || generateItemId()),
    sku: String(item.sku || '').trim(),
    itemName: String(item.itemName || '').trim(),
    itemType: String(item.itemType || '').trim(),
    packaging: String(item.packaging || '-').trim(),
    packageQty: Number(item.packageQty || 0),
    cartonQty: Number(item.cartonQty || 0),
    sackQty: Number(item.sackQty || 0),
    boxQty: Number(item.boxQty || 0),
    weightKg: Number(item.weightKg || 0),
    barcode: String(item.barcode || '').trim(),
    receivedAt: item.receivedAt ? new Date(item.receivedAt) : new Date(),
    customFields: item.customFields && typeof item.customFields === 'object' ? item.customFields : {}
  }))
}

function calculateSummary(pallet) {
  const items = Array.isArray(pallet.items) ? pallet.items : []
  return {
    totalWeight: items.reduce((sum, item) => sum + Number(item.weightKg || 0), 0),
    totalCartons: items.reduce((sum, item) => sum + Number(item.cartonQty || 0), 0),
    totalPackages: items.reduce((sum, item) => sum + Number(item.packageQty || 0), 0),
    totalSacks: items.reduce((sum, item) => sum + Number(item.sackQty || 0), 0),
    totalBoxes: items.reduce((sum, item) => sum + Number(item.boxQty || 0), 0),
    totalSku: new Set(items.map(item => String(item.sku || '').trim()).filter(Boolean)).size,
    itemCount: items.length
  }
}

function deriveState(items) {
  if (!items.length) return 'empty'
  const positive = item =>
    Number(item.packageQty || 0) +
    Number(item.cartonQty || 0) +
    Number(item.sackQty || 0) +
    Number(item.boxQty || 0) +
    Number(item.weightKg || 0) > 0

  if (!items.some(positive)) return 'empty'
  return items.every(positive) ? 'occupied' : 'partial'
}

function syncState(pallet) {
  pallet.state = deriveState(Array.isArray(pallet.items) ? pallet.items : [])
  pallet.status = pallet.state === 'empty' ? 'empty' : 'occupied'
}

function formatPallet(pallet) {
  const plain = pallet?.toObject ? pallet.toObject() : { ...pallet }
  plain.items = normalizeItems(plain.items)
  plain.summary = calculateSummary(plain)
  return plain
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findPalletById(id) {
  return Pallet.findOne({ id: new RegExp(`^${escapeRegex(id)}$`, 'i') })
}

function sendError(res, err, fallback) {
  console.error(fallback, err)
  const status = err?.statusCode || (err?.name === 'ValidationError' ? 400 : 500)
  res.status(status).json({
    message: err?.message || fallback,
    error: err?.message || fallback
  })
}

router.get('/', async (_req, res) => {
  try {
    const data = await Pallet.find().sort({ createdAt: -1 })
    res.json(data.map(formatPallet))
  } catch (err) {
    sendError(res, err, 'Gagal mengambil data pallet')
  }
})

router.get('/:palletId', async (req, res) => {
  try {
    const pallet = await findPalletById(req.params.palletId)
    if (!pallet) return res.status(404).json({ message: 'Pallet tidak ditemukan' })
    res.json(formatPallet(pallet))
  } catch (err) {
    sendError(res, err, 'Gagal mengambil detail pallet')
  }
})

router.post('/', async (req, res) => {
  try {
    const id = String(req.body.id || '').trim()
    if (!id) return res.status(400).json({ message: 'Pallet ID wajib diisi' })

    if (await findPalletById(id)) {
      return res.status(409).json({ message: `Pallet ${id} sudah digunakan` })
    }

    const pallet = await Pallet.create({
      id,
      name: String(req.body.name || `Pallet ${id}`).trim(),
      color: String(req.body.color || '#4f7cff'),
      status: 'empty',
      state: 'empty',
      validationStatus: 'pending',
      validationNote: '',
      locationStatus: 'unplaced',
      location: null,
      items: []
    })

    res.status(201).json(formatPallet(pallet))
  } catch (err) {
    sendError(res, err, 'Gagal membuat pallet')
  }
})

router.put('/:palletId/validation', async (req, res) => {
  try {
    const pallet = await findPalletById(req.params.palletId)
    if (!pallet) return res.status(404).json({ message: 'Pallet tidak ditemukan' })

    const status = String(req.body.validationStatus || '').trim().toLowerCase()
    if (!['pending', 'valid', 'invalid'].includes(status)) {
      return res.status(400).json({ message: 'Status validasi harus pending, valid, atau invalid' })
    }

    pallet.validationStatus = status
    pallet.validationNote = String(req.body.validationNote || '').trim()
    await pallet.save()

    res.json({ message: `Validasi pallet ${pallet.id} menjadi ${status}`, pallet: formatPallet(pallet) })
  } catch (err) {
    sendError(res, err, 'Gagal memperbarui validasi pallet')
  }
})

router.put('/:palletId', async (req, res) => {
  try {
    const pallet = await findPalletById(req.params.palletId)
    if (!pallet) return res.status(404).json({ message: 'Pallet tidak ditemukan' })

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim()
      if (!name) return res.status(400).json({ message: 'Nama pallet tidak boleh kosong' })
      pallet.name = name
    }
    if (req.body.color !== undefined) pallet.color = String(req.body.color)

    syncState(pallet)
    await pallet.save()
    res.json(formatPallet(pallet))
  } catch (err) {
    sendError(res, err, 'Gagal mengupdate pallet')
  }
})

router.post('/:palletId/items', async (req, res) => {
  try {
    const pallet = await findPalletById(req.params.palletId)
    if (!pallet) return res.status(404).json({ message: `Pallet ${req.params.palletId} tidak ditemukan` })

    if (!Array.isArray(pallet.items)) pallet.items = []

    const sku = String(req.body.sku || '').trim()
    const itemName = String(req.body.itemName || '').trim()
    const barcode = String(req.body.barcode || '').trim()

    if (!sku) return res.status(400).json({ message: 'SKU wajib diisi' })
    if (!itemName) return res.status(400).json({ message: 'Nama barang wajib diisi' })

    if (barcode) {
      const duplicate = pallet.items.find(item => String(item.barcode || '').trim().toLowerCase() === barcode.toLowerCase())
      if (duplicate) {
        return res.status(409).json({ message: `Barcode ${barcode} sudah digunakan oleh SKU ${duplicate.sku}` })
      }
    }

    const item = {
      id: generateItemId(),
      sku,
      itemName,
      itemType: String(req.body.itemType || '').trim(),
      packaging: String(req.body.packaging || '-').trim(),
      packageQty: numberField(req.body.packageQty, 'Jumlah kemasan'),
      cartonQty: numberField(req.body.cartonQty, 'Jumlah karton'),
      sackQty: numberField(req.body.sackQty, 'Jumlah karung'),
      boxQty: numberField(req.body.boxQty, 'Jumlah box'),
      weightKg: numberField(req.body.weightKg, 'Berat'),
      barcode,
      receivedAt: req.body.receivedAt ? new Date(req.body.receivedAt) : new Date(),
      customFields: req.body.customFields && typeof req.body.customFields === 'object' ? req.body.customFields : {}
    }

    pallet.items.push(item)
    syncState(pallet)
    await pallet.save()

    res.status(201).json({
      message: `Item ${sku} berhasil ditambahkan ke ${pallet.id}`,
      item,
      pallet: formatPallet(pallet)
    })
  } catch (err) {
    sendError(res, err, 'Gagal menambah item ke pallet')
  }
})

router.put('/:palletId/items/:itemId', async (req, res) => {
  try {
    const pallet = await findPalletById(req.params.palletId)
    if (!pallet) return res.status(404).json({ message: 'Pallet tidak ditemukan' })

    const item = pallet.items.find(item => item.id === req.params.itemId)
    if (!item) return res.status(404).json({ message: 'Item tidak ditemukan' })

    const nextBarcode = req.body.barcode !== undefined ? String(req.body.barcode).trim() : item.barcode
    if (nextBarcode) {
      const duplicate = pallet.items.find(other => other.id !== item.id && String(other.barcode || '').toLowerCase() === nextBarcode.toLowerCase())
      if (duplicate) return res.status(409).json({ message: `Barcode ${nextBarcode} sudah digunakan oleh SKU ${duplicate.sku}` })
    }

    for (const field of ['sku', 'itemName', 'itemType', 'packaging', 'barcode']) {
      if (req.body[field] !== undefined) item[field] = String(req.body[field]).trim()
    }
    for (const field of ['packageQty', 'cartonQty', 'sackQty', 'boxQty', 'weightKg']) {
      if (req.body[field] !== undefined) item[field] = numberField(req.body[field], field)
    }
    if (req.body.receivedAt !== undefined) item.receivedAt = new Date(req.body.receivedAt)
    if (req.body.customFields !== undefined) item.customFields = req.body.customFields && typeof req.body.customFields === 'object' ? req.body.customFields : {}

    if (!item.sku) return res.status(400).json({ message: 'SKU wajib diisi' })
    if (!item.itemName) return res.status(400).json({ message: 'Nama barang wajib diisi' })

    syncState(pallet)
    await pallet.save()
    res.json({ message: `Item ${item.sku} berhasil diperbarui`, item, pallet: formatPallet(pallet) })
  } catch (err) {
    sendError(res, err, 'Gagal mengupdate item')
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

    res.json({ message: `Item ${deletedItem.sku} berhasil dihapus`, item: deletedItem, pallet: formatPallet(pallet) })
  } catch (err) {
    sendError(res, err, 'Gagal menghapus item')
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
    sendError(res, err, 'Gagal mengosongkan pallet')
  }
})

router.post('/validate-barcode', async (req, res) => {
  try {
    const barcode = String(req.body.barcode || '').trim()
    const sku = String(req.body.sku || '').trim()
    if (!barcode && !sku) return res.status(400).json({ message: 'Barcode atau SKU wajib diisi' })

    const pallets = await Pallet.find()
    const matches = []
    for (const pallet of pallets) {
      for (const item of pallet.items || []) {
        const barcodeMatch = barcode && String(item.barcode || '').toLowerCase() === barcode.toLowerCase()
        const skuMatch = sku && String(item.sku || '').toLowerCase() === sku.toLowerCase()
        if (barcodeMatch || skuMatch) matches.push({ palletId: pallet.id, palletName: pallet.name, item })
      }
    }

    res.json({ valid: matches.length > 0, barcode, sku, matches })
  } catch (err) {
    sendError(res, err, 'Gagal memvalidasi barcode/SKU')
  }
})

router.get('/:palletId/position-history', async (req, res) => {
  try {
    const history = await PositionHistory.find({ palletId: req.params.palletId }).sort({ movedAt: -1 }).limit(300)
    res.json(history)
  } catch (err) {
    sendError(res, err, 'Gagal mengambil riwayat posisi pallet')
  }
})

export default router
