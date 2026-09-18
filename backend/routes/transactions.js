import { Router } from 'express'
import Pallet from '../models/Pallet.js'
import PalletDetail from '../models/PalletDetail.js'
import Transaction from '../models/Transaction.js'

const router = Router()

function number(value) {
  const result = Number(value)
  return Number.isFinite(result) && result >= 0 ? result : 0
}

async function generateTransactionId() {
  const count = await Transaction.countDocuments()
  return `TRX-${String(count + 1).padStart(4, '0')}`
}

function formatTransaction(transaction) {
  const plain = transaction.toObject ? transaction.toObject() : transaction
  return {
    id: plain.id,
    type: plain.type,
    palletId: plain.palletId,
    palletName: plain.palletName,
    driverName: plain.driverName,
    nopol: plain.nopol,
    items: plain.items,
    status: plain.status,
    confirmedAt: plain.confirmedAt
  }
}

router.get('/', async (req, res) => {
  const { type, palletId } = req.query
  const filter = {}

  if (type) filter.type = type
  if (palletId) filter.palletId = palletId

  const transactions = await Transaction.find(filter).sort({ confirmedAt: -1 })
  res.json(transactions.map(formatTransaction))
})

router.get('/:transactionId', async (req, res) => {
  const transaction = await Transaction.findOne({ id: req.params.transactionId })

  if (!transaction) {
    return res.status(404).json({ message: 'Transaksi tidak ditemukan' })
  }

  res.json(formatTransaction(transaction))
})

router.post('/', async (req, res) => {
  const {
    type,
    palletId,
    driverName,
    nopol,
    items = []
  } = req.body

  if (!['inbound', 'outbound'].includes(type)) {
    return res.status(400).json({ message: 'Jenis transaksi harus inbound atau outbound' })
  }

  const pallet = await Pallet.findOne({ id: new RegExp(`^${palletId}$`, 'i') })

  if (!pallet) {
    return res.status(404).json({ message: 'Pallet tidak ditemukan' })
  }

  if (!String(driverName || '').trim()) {
    return res.status(400).json({ message: 'Nama driver wajib diisi' })
  }

  if (!String(nopol || '').trim()) {
    return res.status(400).json({ message: 'Nomor polisi wajib diisi' })
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Minimal satu barang harus dipilih' })
  }

  const existingDetails = await PalletDetail.find({ pallet: pallet._id })
  const transactionItems = []

  if (type === 'inbound') {
    for (const input of items) {
      if (!input.selected) continue

      const packageQty = number(input.packageQty)
      const cartonQty = number(input.cartonQty)
      const sackQty = number(input.sackQty)
      const weightKg = number(input.weightKg)

      if (packageQty === 0 && cartonQty === 0 && sackQty === 0 && weightKg === 0) {
        return res.status(400).json({
          message: `Jumlah inbound untuk ${input.sku || 'barang'} harus lebih dari 0`
        })
      }

      const matchedExisting = input.itemId
        ? existingDetails.find(item => item.id === input.itemId)
        : null

      transactionItems.push({
        itemId: matchedExisting?.id || null,
        sku: String(input.sku || matchedExisting?.sku || '').trim(),
        itemName: String(input.itemName || matchedExisting?.itemName || '').trim(),
        packaging: String(input.packaging || matchedExisting?.packaging || '-').trim(),
        packageQty,
        cartonQty,
        sackQty,
        weightKg,
        barcode: String(input.barcode || matchedExisting?.barcode || '').trim()
      })
    }

    if (transactionItems.length === 0) {
      return res.status(400).json({ message: 'Pilih minimal satu barang untuk inbound' })
    }

    for (const input of transactionItems) {
      if (!input.sku) {
        return res.status(400).json({ message: 'SKU wajib diisi untuk barang inbound' })
      }

      if (!input.itemName) {
        return res.status(400).json({ message: `Nama barang untuk ${input.sku} wajib diisi` })
      }

      let detail = input.itemId
        ? existingDetails.find(item => item.id === input.itemId)
        : null

      if (!detail) {
        detail = existingDetails.find(item =>
          item.sku.toLowerCase() === input.sku.toLowerCase() &&
          input.barcode &&
          item.barcode === input.barcode
        )
      }

      if (!detail) {
        detail = await PalletDetail.create({
          id: `ITEM-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          pallet: pallet._id,
          palletCode: pallet.id,
          sku: input.sku,
          itemName: input.itemName,
          packaging: input.packaging,
          packageQty: 0,
          cartonQty: 0,
          sackQty: 0,
          weightKg: 0,
          barcode: input.barcode
        })
        existingDetails.push(detail)
      }

      detail.packageQty = number(detail.packageQty) + input.packageQty
      detail.cartonQty = number(detail.cartonQty) + input.cartonQty
      detail.sackQty = number(detail.sackQty) + input.sackQty
      detail.weightKg = number(detail.weightKg) + input.weightKg
      await detail.save()

      input.itemId = detail.id
    }

    const remaining = await PalletDetail.countDocuments({ pallet: pallet._id })
    pallet.status = remaining > 0 ? 'occupied' : 'empty'
  } else {
    for (const input of items) {
      if (!input.selected) continue

      const detail = existingDetails.find(item => item.id === input.itemId)

      if (!detail) {
        return res.status(400).json({ message: 'Item outbound tidak ditemukan di pallet' })
      }

      const packageQty = number(input.packageQty)
      const cartonQty = number(input.cartonQty)
      const sackQty = number(input.sackQty)
      const weightKg = number(input.weightKg)

      if (packageQty === 0 && cartonQty === 0 && sackQty === 0 && weightKg === 0) {
        return res.status(400).json({
          message: `Jumlah outbound untuk ${detail.sku} harus lebih dari 0`
        })
      }

      if (
        packageQty > number(detail.packageQty) ||
        cartonQty > number(detail.cartonQty) ||
        sackQty > number(detail.sackQty) ||
        weightKg > number(detail.weightKg)
      ) {
        return res.status(400).json({ message: `Jumlah outbound ${detail.sku} melebihi stok pallet` })
      }

      transactionItems.push({
        itemId: detail.id,
        sku: detail.sku,
        itemName: detail.itemName,
        packaging: detail.packaging,
        packageQty,
        cartonQty,
        sackQty,
        weightKg,
        barcode: detail.barcode
      })
    }

    if (transactionItems.length === 0) {
      return res.status(400).json({ message: 'Pilih minimal satu barang untuk outbound' })
    }

    for (const output of transactionItems) {
      const detail = existingDetails.find(item => item.id === output.itemId)

      detail.packageQty = number(detail.packageQty) - output.packageQty
      detail.cartonQty = number(detail.cartonQty) - output.cartonQty
      detail.sackQty = number(detail.sackQty) - output.sackQty
      detail.weightKg = number(detail.weightKg) - output.weightKg

      const isEmpty =
        number(detail.packageQty) <= 0 &&
        number(detail.cartonQty) <= 0 &&
        number(detail.sackQty) <= 0 &&
        number(detail.weightKg) <= 0

      if (isEmpty) {
        await PalletDetail.deleteOne({ _id: detail._id })
      } else {
        await detail.save()
      }
    }

    const remaining = await PalletDetail.countDocuments({ pallet: pallet._id })
    pallet.status = remaining > 0 ? 'occupied' : 'empty'
  }

  await pallet.save()

  const transaction = await Transaction.create({
    id: await generateTransactionId(),
    type,
    pallet: pallet._id,
    palletId: pallet.id,
    palletName: pallet.name,
    driverName: String(driverName).trim(),
    nopol: String(nopol).trim().toUpperCase(),
    items: transactionItems,
    status: 'confirmed',
    confirmedAt: new Date(),
    createdBy: req.user._id
  })

  res.status(201).json({
    message: type === 'inbound' ? 'Barang berhasil di-inbound' : 'Barang berhasil di-outbound',
    transaction: formatTransaction(transaction)
  })
})

export default router
