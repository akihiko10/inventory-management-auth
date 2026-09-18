import { Router } from 'express'
import Pallet from '../models/Pallet.js'
import PalletDetail from '../models/PalletDetail.js'

const router = Router()

function generateItemId() {
  return `ITEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function calculateSummary(items) {
  return {
    totalWeight: items.reduce((sum, item) => sum + Number(item.weightKg || 0), 0),
    totalCartons: items.reduce((sum, item) => sum + Number(item.cartonQty || 0), 0),
    totalPackages: items.reduce((sum, item) => sum + Number(item.packageQty || 0), 0),
    totalSacks: items.reduce((sum, item) => sum + Number(item.sackQty || 0), 0),
    totalSku: new Set(items.map(item => item.sku)).size
  }
}

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
  }

  res.json(await formatPallet(pallet))
})

router.post('/', async (req, res) => {
  const { id, name } = req.body

  if (!id || !id.trim()) {
    return res.status(400).json({ message: 'Pallet ID wajib diisi' })
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

router.put('/:palletId', async (req, res) => {
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
  res.json(await formatPallet(pallet))
})

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
  const pallet = await Pallet.findOne({ id: new RegExp(`^${req.params.palletId}$`, 'i') })

  if (!pallet) {
    return res.status(404).json({ message: 'Pallet tidak ditemukan' })
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
  const pallet = await Pallet.findOne({ id: new RegExp(`^${req.params.palletId}$`, 'i') })

  if (!pallet) {
    return res.status(404).json({ message: 'Pallet tidak ditemukan' })
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
  const pallet = await Pallet.findOne({ id: new RegExp(`^${req.params.palletId}$`, 'i') })

  if (!pallet) {
    return res.status(404).json({ message: 'Pallet tidak ditemukan' })
  }

  await PalletDetail.deleteMany({ pallet: pallet._id })
  pallet.status = 'empty'
  await pallet.save()

  res.json({
    message: 'Semua barang dalam pallet berhasil dikosongkan',
    pallet: await formatPallet(pallet)
  })
})

export default router
