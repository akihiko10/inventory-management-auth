import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()

const manifestSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  groupingKey: { type: String, index: true },
  nopol: String,
  driverName: String,
  transactionIds: [String],
  transactionsCount: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'reconciled'], default: 'draft' },
  totalWeight: { type: Number, default: 0 },
  totalCartons: { type: Number, default: 0 },
  totalSacks: { type: Number, default: 0 },
  totalBoxes: { type: Number, default: 0 },
  totalPackages: { type: Number, default: 0 },
  skuSummary: [{ sku: String, itemName: String, quantity: Number, weightKg: Number, cartons: Number, sacks: Number, boxes: Number, packages: Number }],
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  reconciledAt: Date,
  reconciliationNote: String
}, { timestamps: true })

const Manifest = mongoose.models.Manifest || mongoose.model('Manifest', manifestSchema, 'manifests')
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }), 'transactions')

function summarize(transactions) {
  const map = new Map()
  const summary = { totalWeight: 0, totalCartons: 0, totalSacks: 0, totalBoxes: 0, totalPackages: 0 }
  for (const trx of transactions) {
    for (const item of trx.items || []) {
      const key = item.sku || item.itemName || 'UNKNOWN'
      if (!map.has(key)) map.set(key, { sku: item.sku || '-', itemName: item.itemName || '-', quantity: 0, weightKg: 0, cartons: 0, sacks: 0, boxes: 0, packages: 0 })
      const row = map.get(key)
      row.quantity += Number(item.packageQty || 0) + Number(item.cartonQty || 0) + Number(item.sackQty || 0) + Number(item.boxQty || 0)
      row.weightKg += Number(item.weightKg || 0)
      row.cartons += Number(item.cartonQty || 0)
      row.sacks += Number(item.sackQty || 0)
      row.boxes += Number(item.boxQty || 0)
      row.packages += Number(item.packageQty || 0)
      summary.totalWeight += Number(item.weightKg || 0)
      summary.totalCartons += Number(item.cartonQty || 0)
      summary.totalSacks += Number(item.sackQty || 0)
      summary.totalBoxes += Number(item.boxQty || 0)
      summary.totalPackages += Number(item.packageQty || 0)
    }
  }
  return { ...summary, skuSummary: [...map.values()].sort((a, b) => b.weightKg - a.weightKg) }
}

async function nextManifestId() {
  const count = await Manifest.countDocuments()
  return `MNF-${String(count + 1).padStart(5, '0')}`
}

router.get('/', async (_req, res) => {
  try {
    const manifests = await Manifest.find().sort({ createdAt: -1 }).limit(300)
    res.json(manifests)
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil manifest', error: err.message })
  }
})

router.post('/generate', async (req, res) => {
  try {
    const type = req.body.type || null
    const filter = { status: 'confirmed' }
    if (type) filter.type = type
    const transactions = await Transaction.find(filter).sort({ confirmedAt: 1 })
    const groups = new Map()
    for (const trx of transactions) {
      const key = `${String(trx.nopol || '').toUpperCase()}|${String(trx.driverName || '').trim().toLowerCase()}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(trx)
    }

    const created = []
    for (const [groupingKey, rows] of groups) {
      const nopol = rows[0].nopol
      const driverName = rows[0].driverName
      const summary = summarize(rows)
      const existing = await Manifest.findOne({ groupingKey, status: 'draft' })
      const payload = {
        groupingKey, nopol, driverName,
        transactionIds: rows.map(row => row.id),
        transactionsCount: rows.length,
        ...summary,
        createdBy: req.user?.username
      }
      const manifest = existing ? Object.assign(existing, payload) : new Manifest({ id: await nextManifestId(), ...payload })
      await manifest.save()
      created.push(manifest)
    }
    res.status(201).json({ message: 'Manifest berhasil digenerate berdasarkan nopol dan driver', manifests: created })
  } catch (err) {
    res.status(500).json({ message: 'Gagal melakukan grouping manifest', error: err.message })
  }
})

router.put('/:manifestId/reconcile', async (req, res) => {
  try {
    const manifest = await Manifest.findOne({ id: req.params.manifestId })
    if (!manifest) return res.status(404).json({ message: 'Manifest tidak ditemukan' })
    manifest.status = 'reconciled'
    manifest.reconciledAt = new Date()
    manifest.reconciliationNote = String(req.body.note || 'Rekonsiliasi selesai').trim()
    await manifest.save()
    res.json(manifest)
  } catch (err) {
    res.status(500).json({ message: 'Gagal melakukan rekonsiliasi', error: err.message })
  }
})

router.get('/export/csv', async (_req, res) => {
  try {
    const manifests = await Manifest.find().sort({ createdAt: -1 })
    const rows = [['Manifest', 'Driver', 'Nopol', 'Status', 'Transaksi', 'Berat Kg', 'Karton', 'Karung', 'Box', 'Kemasan']]
    for (const item of manifests) rows.push([item.id, item.driverName, item.nopol, item.status, item.transactionsCount, item.totalWeight, item.totalCartons, item.totalSacks, item.totalBoxes, item.totalPackages])
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="manifest-export.csv"')
    res.send(csv)
  } catch (err) {
    res.status(500).json({ message: 'Gagal export manifest', error: err.message })
  }
})

router.get('/:manifestId', async (req, res) => {
  try {
    const manifest = await Manifest.findOne({ id: req.params.manifestId })
    if (!manifest) return res.status(404).json({ message: 'Manifest tidak ditemukan' })
    res.json(manifest)
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil detail manifest', error: err.message })
  }
})

export default router
