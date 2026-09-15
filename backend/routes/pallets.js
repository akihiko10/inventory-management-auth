import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()

// 1. Mongoose Schema & Model untuk Item & Pallet
const itemSchema = new mongoose.Schema({
  id: String,
  sku: String,
  itemName: String,
  packaging: String,
  packageQty: Number,
  cartonQty: Number,
  sackQty: Number,
  weightKg: Number,
  barcode: String
}, { _id: false })

const palletSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  status: { type: String, default: 'empty' },
  items: [itemSchema]
}, { timestamps: true })

const Pallet = mongoose.models.Pallet || mongoose.model('Pallet', palletSchema, 'pallets')

// Variable dummy export untuk menjaga kompatibilitas server.js & transactions.js
export let pallets = []

// Helper functions bawaan Crisna
function generateItemId() {
  return `ITEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function calculateSummary(pallet) {
  const items = pallet.items || []

  return {
    totalWeight: items.reduce((sum, item) => sum + Number(item.weightKg || 0), 0),
    totalCartons: items.reduce((sum, item) => sum + Number(item.cartonQty || 0), 0),
    totalPackages: items.reduce((sum, item) => sum + Number(item.packageQty || 0), 0),
    totalSacks: items.reduce((sum, item) => sum + Number(item.sackQty || 0), 0),
    totalSku: new Set(items.map(item => item.sku)).size
  }
}

function formatPallet(pallet) {
  const plain = pallet.toObject ? pallet.toObject() : pallet
  return {
    ...plain,
    summary: calculateSummary(plain)
  }
}

// 1. GET ALL PALLETS
router.get('/', async (_req, res) => {
  try {
    const data = await Pallet.find()
    res.json(data.map(formatPallet))
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data pallet', error: err.message })
  }
})

// 2. GET SINGLE PALLET BY ID
router.get('/:palletId', async (req, res) => {
  try {
    const pallet = await Pallet.findOne({ id: new RegExp(`^${req.params.palletId}$`, 'i') })

    if (!pallet) {
      return res.status(404).json({ message: 'Pallet tidak ditemukan' })
    }

    res.json(formatPallet(pallet))
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil detail pallet', error: err.message })
  }
})

// 3. CREATE NEW PALLET
router.post('/', async (req, res) => {
  try {
    const { id, name } = req.body

    if (!id || !id.trim()) {
      return res.status(400).json({ message: 'Pallet ID wajib diisi' })
    }

    const existing = await Pallet.findOne({ id: id.trim() })
    if (existing) {
      return res.status(409).json({ message: 'Pallet ID sudah digunakan' })
    }

    const pallet = new Pallet({
      id: id.trim(),
                              name: name?.trim() || `Pallet ${id.trim()}`,
                              status: 'empty',
                              items: []
    })

    await pallet.save()
    res.status(201).json(formatPallet(pallet))
  } catch (err) {
    res.status(500).json({ message: 'Gagal membuat pallet', error: err.message })
  }
})

// 4. UPDATE PALLET (NAME/STATUS)
router.put('/:palletId', async (req, res) => {
  try {
    const pallet = await Pallet.findOne({ id: new RegExp(`^${req.params.palletId}$`, 'i') })

    if (!pallet) {
      return res.status(404).json({ message: 'Pallet tidak ditemukan' })
    }

    if (req.body.name !== undefined) {
      pallet.name = String(req.body.name).trim()
    }

    if (req.body.status !== undefined) {
      pallet.status = req.body.status
    }

    await pallet.save()
    res.json(formatPallet(pallet))
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengupdate pallet', error: err.message })
  }
})

// 5. ADD ITEM TO PALLET (INBOUND)
router.post('/:palletId/items', async (req, res) => {
  try {
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

    if (barcode?.trim() && pallet.items.some(item => item.barcode === barcode.trim())) {
      return res.status(409).json({ message: 'Barcode sudah digunakan dalam pallet ini' })
    }

    const item = {
      id: generateItemId(),
            sku: sku.trim(),
            itemName: itemName.trim(),
            packaging: packaging?.trim() || '-',
            packageQty: Number(packageQty || 0),
            cartonQty: Number(cartonQty || 0),
            sackQty: Number(sackQty || 0),
            weightKg: Number(weightKg || 0),
            barcode: barcode?.trim() || ''
    }

    pallet.items.push(item)
    pallet.status = 'occupied'

    await pallet.save()

    res.status(201).json({
      item,
      pallet: formatPallet(pallet)
    })
  } catch (err) {
    res.status(500).json({ message: 'Gagal menambah item ke pallet', error: err.message })
  }
})

// 6. UPDATE ITEM IN PALLET
router.put('/:palletId/items/:itemId', async (req, res) => {
  try {
    const pallet = await Pallet.findOne({ id: new RegExp(`^${req.params.palletId}$`, 'i') })

    if (!pallet) {
      return res.status(404).json({ message: 'Pallet tidak ditemukan' })
    }

    const item = pallet.items.find(item => item.id === req.params.itemId)

    if (!item) {
      return res.status(404).json({ message: 'Item tidak ditemukan' })
    }

    if (req.body.sku !== undefined) item.sku = String(req.body.sku).trim()
      if (req.body.itemName !== undefined) item.itemName = String(req.body.itemName).trim()
        if (req.body.packaging !== undefined) item.packaging = String(req.body.packaging).trim()
          if (req.body.packageQty !== undefined) item.packageQty = Number(req.body.packageQty)
            if (req.body.cartonQty !== undefined) item.cartonQty = Number(req.body.cartonQty)
              if (req.body.sackQty !== undefined) item.sackQty = Number(req.body.sackQty)
                if (req.body.weightKg !== undefined) item.weightKg = Number(req.body.weightKg)
                  if (req.body.barcode !== undefined) item.barcode = String(req.body.barcode).trim()

                    await pallet.save()

                    res.json({
                      item,
                      pallet: formatPallet(pallet)
                    })
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengupdate item', error: err.message })
  }
})

// 7. DELETE SINGLE ITEM FROM PALLET
router.delete('/:palletId/items/:itemId', async (req, res) => {
  try {
    const pallet = await Pallet.findOne({ id: new RegExp(`^${req.params.palletId}$`, 'i') })

    if (!pallet) {
      return res.status(404).json({ message: 'Pallet tidak ditemukan' })
    }

    const index = pallet.items.findIndex(item => item.id === req.params.itemId)

    if (index === -1) {
      return res.status(404).json({ message: 'Item tidak ditemukan' })
    }

    const [deletedItem] = pallet.items.splice(index, 1)

    if (pallet.items.length === 0) {
      pallet.status = 'empty'
    }

    await pallet.save()

    res.json({
      message: 'Item berhasil dihapus',
      item: deletedItem,
      pallet: formatPallet(pallet)
    })
  } catch (err) {
    res.status(500).json({ message: 'Gagal menghapus item', error: err.message })
  }
})

// 8. CLEAR ALL ITEMS FROM PALLET (EMPTY PALLET)
router.delete('/:palletId/items', async (req, res) => {
  try {
    const pallet = await Pallet.findOne({ id: new RegExp(`^${req.params.palletId}$`, 'i') })

    if (!pallet) {
      return res.status(404).json({ message: 'Pallet tidak ditemukan' })
    }

    pallet.items = []
    pallet.status = 'empty'

    await pallet.save()

    res.json({
      message: 'Semua barang dalam pallet berhasil dikosongkan',
      pallet: formatPallet(pallet)
    })
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengosongkan pallet', error: err.message })
  }
})

export default router
