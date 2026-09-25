import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()

const slotSchema = new mongoose.Schema({
  code: { type: String, required: true },
  position: { type: Number, required: true },
  status: {
    type: String,
    enum: ['empty', 'occupied', 'inactive', 'moving'],
    default: 'empty'
  },
  palletId: { type: String, default: null },
  maxWeightKg: { type: Number, default: 1000 },
  maxCartons: { type: Number, default: 100 },
  maxPackages: { type: Number, default: 1000 }
}, { _id: false })

const levelSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  slots: { type: [slotSchema], default: [] }
}, { _id: false })

const rackSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  slotCount: { type: Number, default: 4 },
  levels: { type: [levelSchema], default: [] }
}, { _id: false })

const coldStorageSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  racks: { type: [rackSchema], default: [] }
}, { _id: false })

const areaSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['road', 'aisle', 'storage-area'],
    default: 'aisle'
  }
}, { _id: false })

const warehouseSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  coldStorageCount: { type: Number, default: 0 },
  coldStorages: { type: [coldStorageSchema], default: [] },
  areas: { type: [areaSchema], default: [] }
}, { timestamps: true })

const movementSchema = new mongoose.Schema({
  palletId: { type: String, required: true },
  userId: String,
  username: String,
  movedAt: { type: Date, default: Date.now },
  from: { type: Object, default: null },
  to: { type: Object, required: true },
  reason: { type: String, default: 'warehouse movement' }
}, { timestamps: true })

const Warehouse = mongoose.models.Warehouse || mongoose.model('Warehouse', warehouseSchema, 'warehouses')
const WarehouseMovement = mongoose.models.WarehouseMovement || mongoose.model('WarehouseMovement', movementSchema, 'warehouse_movements')
const Pallet = mongoose.models.Pallet || mongoose.model('Pallet', new mongoose.Schema({}, { strict: false }), 'pallets')

function clean(value) {
  return String(value || '').trim()
}

function generateCode(prefix, count) {
  return `${prefix}${String(count + 1).padStart(2, '0')}`
}

function createLevels(slotCount = 4) {
  const count = Math.max(1, Math.min(100, Number(slotCount) || 4))
  return [1, 2, 3, 4].map(levelNumber => ({
    code: `L${levelNumber}`,
    name: `Level ${levelNumber}`,
    slots: Array.from({ length: count }, (_, index) => ({
      code: `L${levelNumber}-S${String(index + 1).padStart(2, '0')}`,
      position: index + 1,
      status: 'empty',
      palletId: null,
      maxWeightKg: 1000,
      maxCartons: 100,
      maxPackages: 1000
    }))
  }))
}

function getRack(warehouse, coldStorageId, rackId) {
  const coldStorage = warehouse.coldStorages.id(coldStorageId)
  if (!coldStorage) return { coldStorage: null, rack: null }
  const rack = coldStorage.racks.id(rackId)
  return { coldStorage, rack }
}

function getSlot(warehouse, { coldStorageId, rackId, levelCode, slotCode }) {
  const { coldStorage, rack } = getRack(warehouse, coldStorageId, rackId)
  if (!coldStorage || !rack) return { coldStorage, rack, level: null, slot: null }
  const level = rack.levels.find(item => item.code === levelCode)
  const slot = level?.slots.find(item => item.code === slotCode) || null
  return { coldStorage, rack, level, slot }
}

function palletSummary(pallet) {
  const items = pallet?.items || []
  return {
    totalWeight: items.reduce((sum, item) => sum + Number(item.weightKg || 0), 0),
    totalCartons: items.reduce((sum, item) => sum + Number(item.cartonQty || 0), 0),
    totalPackages: items.reduce((sum, item) => sum + Number(item.packageQty || 0), 0),
    totalSacks: items.reduce((sum, item) => sum + Number(item.sackQty || 0), 0),
    skuCount: new Set(items.map(item => item.sku).filter(Boolean)).size
  }
}

function slotRecord(warehouse, coldStorage, rack, level, slot, palletMap) {
  const pallet = slot.palletId ? palletMap.get(slot.palletId) : null
  const summary = palletSummary(pallet)
  return {
    warehouseId: warehouse._id,
    warehouseCode: warehouse.code,
    warehouseName: warehouse.name,
    coldStorageId: coldStorage._id,
    coldStorageCode: coldStorage.code,
    coldStorageName: coldStorage.name,
    rackId: rack._id,
    rackCode: rack.code,
    rackName: rack.name,
    levelCode: level.code,
    levelName: level.name,
    slotCode: slot.code,
    slotStatus: slot.status,
    palletId: slot.palletId,
    palletName: pallet?.name || null,
    palletStatus: pallet?.status || null,
    locationStatus: pallet?.locationStatus || (slot.palletId ? 'placed' : 'unplaced'),
    itemNames: (pallet?.items || []).map(item => item.itemName).filter(Boolean),
    skus: (pallet?.items || []).map(item => item.sku).filter(Boolean),
    itemTypes: (pallet?.items || []).map(item => item.itemType).filter(Boolean),
    weights: (pallet?.items || []).map(item => Number(item.weightKg || 0)),
    color: pallet?.color || '#4f7cff',
    capacity: {
      maxWeightKg: slot.maxWeightKg,
      maxCartons: slot.maxCartons,
      maxPackages: slot.maxPackages,
      usedWeightKg: summary.totalWeight,
      usedCartons: summary.totalCartons,
      usedPackages: summary.totalPackages
    },
    utilizationWeight: slot.maxWeightKg > 0 ? Math.min(100, Math.round(summary.totalWeight / slot.maxWeightKg * 100)) : 0
  }
}

function buildSlotSummary(records) {
  const total = records.length
  const occupied = records.filter(item => item.slotStatus === 'occupied').length
  const inactive = records.filter(item => item.slotStatus === 'inactive').length
  const moving = records.filter(item => item.slotStatus === 'moving').length
  const empty = records.filter(item => item.slotStatus === 'empty').length
  const usedWeight = records.reduce((sum, item) => sum + item.capacity.usedWeightKg, 0)
  const maxWeight = records.reduce((sum, item) => sum + item.capacity.maxWeightKg, 0)
  return {
    total,
    occupied,
    empty,
    inactive,
    moving,
    unplaced: records.filter(item => item.locationStatus === 'unplaced').length,
    usedWeight,
    maxWeight,
    availableWeight: Math.max(0, maxWeight - usedWeight),
    utilization: maxWeight > 0 ? Math.round(usedWeight / maxWeight * 100) : 0
  }
}

// ======================================================
// MASTER DENAH GUDANG
// ======================================================
router.get('/', async (_req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ code: 1 })
    res.json(warehouses)
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil master gudang', error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const code = clean(req.body.code).toUpperCase()
    const name = clean(req.body.name)
    const coldStorageCount = Math.max(0, Math.min(50, Number(req.body.coldStorageCount || 0)))

    if (!code || !name) {
      return res.status(400).json({ message: 'Kode dan nama gudang wajib diisi' })
    }

    const exists = await Warehouse.findOne({ code })
    if (exists) return res.status(409).json({ message: 'Kode gudang sudah digunakan' })

    const coldStorages = Array.from({ length: coldStorageCount }, (_, index) => ({
      code: `CS${String(index + 1).padStart(2, '0')}`,
      name: `Cold Storage ${index + 1}`,
      racks: []
    }))

    const warehouse = await Warehouse.create({
      code,
      name,
      coldStorageCount,
      coldStorages,
      areas: []
    })

    res.status(201).json(warehouse)
  } catch (err) {
    res.status(500).json({ message: 'Gagal membuat gudang', error: err.message })
  }
})

router.put('/:warehouseId', async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.warehouseId)
    if (!warehouse) return res.status(404).json({ message: 'Gudang tidak ditemukan' })

    if (req.body.name !== undefined) warehouse.name = clean(req.body.name)
    if (req.body.code !== undefined) warehouse.code = clean(req.body.code).toUpperCase()
    warehouse.coldStorageCount = warehouse.coldStorages.length

    await warehouse.save()
    res.json(warehouse)
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengubah gudang', error: err.message })
  }
})

router.delete('/:warehouseId', async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.warehouseId)
    if (!warehouse) return res.status(404).json({ message: 'Gudang tidak ditemukan' })

    const occupied = warehouse.coldStorages.some(cs => cs.racks.some(rack => rack.levels.some(level => level.slots.some(slot => slot.palletId))))
    if (occupied) return res.status(409).json({ message: 'Gudang masih memiliki pallet pada slot. Pindahkan pallet terlebih dahulu.' })

    await Warehouse.findByIdAndDelete(req.params.warehouseId)
    res.json({ message: 'Gudang berhasil dihapus' })
  } catch (err) {
    res.status(500).json({ message: 'Gagal menghapus gudang', error: err.message })
  }
})

router.post('/:warehouseId/cold-storages', async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.warehouseId)
    if (!warehouse) return res.status(404).json({ message: 'Gudang tidak ditemukan' })

    const code = clean(req.body.code).toUpperCase() || generateCode('CS', warehouse.coldStorages.length)
    const name = clean(req.body.name) || `Cold Storage ${warehouse.coldStorages.length + 1}`
    if (warehouse.coldStorages.some(item => item.code === code)) {
      return res.status(409).json({ message: 'Kode cold storage sudah digunakan' })
    }

    warehouse.coldStorages.push({ code, name, racks: [] })
    warehouse.coldStorageCount = warehouse.coldStorages.length
    await warehouse.save()
    res.status(201).json(warehouse)
  } catch (err) {
    res.status(500).json({ message: 'Gagal menambah cold storage', error: err.message })
  }
})

router.post('/:warehouseId/areas', async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.warehouseId)
    if (!warehouse) return res.status(404).json({ message: 'Gudang tidak ditemukan' })

    const code = clean(req.body.code).toUpperCase() || generateCode('A', warehouse.areas.length)
    const name = clean(req.body.name) || `Area ${warehouse.areas.length + 1}`
    const type = ['road', 'aisle', 'storage-area'].includes(req.body.type) ? req.body.type : 'aisle'

    warehouse.areas.push({ code, name, type })
    await warehouse.save()
    res.status(201).json(warehouse)
  } catch (err) {
    res.status(500).json({ message: 'Gagal menambah area', error: err.message })
  }
})

router.post('/:warehouseId/cold-storages/:coldStorageId/racks', async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.warehouseId)
    if (!warehouse) return res.status(404).json({ message: 'Gudang tidak ditemukan' })

    const coldStorage = warehouse.coldStorages.id(req.params.coldStorageId)
    if (!coldStorage) return res.status(404).json({ message: 'Cold storage tidak ditemukan' })

    const code = clean(req.body.code).toUpperCase() || generateCode('R', coldStorage.racks.length)
    const name = clean(req.body.name) || `Rack ${coldStorage.racks.length + 1}`
    const slotCount = Math.max(1, Math.min(100, Number(req.body.slotCount || 4)))

    if (coldStorage.racks.some(item => item.code === code)) {
      return res.status(409).json({ message: 'Kode rak sudah digunakan' })
    }

    coldStorage.racks.push({
      code,
      name,
      slotCount,
      levels: createLevels(slotCount)
    })

    await warehouse.save()
    res.status(201).json(warehouse)
  } catch (err) {
    res.status(500).json({ message: 'Gagal menambah rak', error: err.message })
  }
})

router.put('/:warehouseId/cold-storages/:coldStorageId/racks/:rackId/config', async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.warehouseId)
    if (!warehouse) return res.status(404).json({ message: 'Gudang tidak ditemukan' })

    const { rack } = getRack(warehouse, req.params.coldStorageId, req.params.rackId)
    if (!rack) return res.status(404).json({ message: 'Rak tidak ditemukan' })

    if (req.body.name !== undefined) rack.name = clean(req.body.name)

    if (req.body.slotCount !== undefined) {
      const slotCount = Math.max(1, Math.min(100, Number(req.body.slotCount)))
      for (const level of rack.levels) {
        if (slotCount < level.slots.length && level.slots.slice(slotCount).some(slot => slot.palletId)) {
          return res.status(409).json({ message: `Tidak dapat mengurangi slot karena masih ada pallet pada slot yang akan dihapus (${level.code})` })
        }
        level.slots = Array.from({ length: slotCount }, (_, index) => {
          const old = level.slots[index]
          return old || {
            code: `${level.code}-S${String(index + 1).padStart(2, '0')}`,
            position: index + 1,
            status: 'empty',
            palletId: null,
            maxWeightKg: 1000,
            maxCartons: 100,
            maxPackages: 1000
          }
        })
      }
      rack.slotCount = slotCount
    }

    if (Array.isArray(req.body.slotConfigs)) {
      for (const config of req.body.slotConfigs) {
        const slot = rack.levels.flatMap(level => level.slots).find(item => item.code === config.code)
        if (!slot) continue
        if (config.maxWeightKg !== undefined) slot.maxWeightKg = Math.max(0, Number(config.maxWeightKg))
        if (config.maxCartons !== undefined) slot.maxCartons = Math.max(0, Number(config.maxCartons))
        if (config.maxPackages !== undefined) slot.maxPackages = Math.max(0, Number(config.maxPackages))
        if (config.status !== undefined && ['empty', 'occupied', 'inactive', 'moving'].includes(config.status)) {
          if (config.status !== 'occupied' && slot.palletId) {
            return res.status(409).json({ message: `${slot.code} masih berisi pallet dan tidak dapat dibuat ${config.status}` })
          }
          slot.status = config.status
        }
      }
    }

    await warehouse.save()
    res.json(warehouse)
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengatur level dan slot', error: err.message })
  }
})

// ======================================================
// MONITORING SLOT & KAPASITAS
// ======================================================
router.get('/monitoring/slots', async (req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ code: 1 })
    const pallets = await Pallet.find()
    const palletMap = new Map(pallets.map(pallet => [pallet.id, pallet]))
    const records = []

    for (const warehouse of warehouses) {
      for (const coldStorage of warehouse.coldStorages) {
        for (const rack of coldStorage.racks) {
          for (const level of rack.levels) {
            for (const slot of level.slots) {
              records.push(slotRecord(warehouse, coldStorage, rack, level, slot, palletMap))
            }
          }
        }
      }
    }

    const q = clean(req.query.q).toLowerCase()
    const filtered = q
      ? records.filter(item => [
        item.warehouseCode,
        item.warehouseName,
        item.coldStorageCode,
        item.coldStorageName,
        item.rackCode,
        item.rackName,
        item.levelCode,
        item.slotCode,
        item.palletId,
        item.palletName,
        item.palletStatus,
        ...(item.itemNames || []),
        ...(item.skus || []),
        ...(item.itemTypes || []),
        ...(item.weights || []).map(value => `${value} kg`)
      ].some(value => String(value || '').toLowerCase().includes(q)))
      : records

    res.json({ summary: buildSlotSummary(records), slots: filtered })
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil monitoring slot', error: err.message })
  }
})

router.get('/monitoring/fifo', async (_req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ code: 1 })
    const pallets = await Pallet.find()
    const palletMap = new Map(pallets.map(pallet => [pallet.id, pallet]))
    const locations = []

    for (const warehouse of warehouses) {
      for (const coldStorage of warehouse.coldStorages) {
        for (const rack of coldStorage.racks) {
          for (const level of rack.levels) {
            for (const slot of level.slots) {
              if (!slot.palletId) continue
              const pallet = palletMap.get(slot.palletId)
              locations.push({
                palletId: slot.palletId,
                palletName: pallet?.name || slot.palletId,
                receivedAt: pallet?.items?.reduce((oldest, item) => {
                  const date = item.receivedAt ? new Date(item.receivedAt) : null
                  if (!date || Number.isNaN(date.getTime())) return oldest
                  return !oldest || date < oldest ? date : oldest
                }, null) || pallet?.createdAt || null,
                warehouseCode: warehouse.code,
                coldStorageCode: coldStorage.code,
                rackCode: rack.code,
                levelCode: level.code,
                slotCode: slot.code,
                position: slot.position
              })
            }
          }
        }
      }
    }

    locations.sort((a, b) => new Date(a.receivedAt || 0) - new Date(b.receivedAt || 0))

    const warnings = []
    const byRackLevel = new Map()
    for (const item of locations) {
      const key = `${item.warehouseCode}/${item.coldStorageCode}/${item.rackCode}/${item.levelCode}`
      if (!byRackLevel.has(key)) byRackLevel.set(key, [])
      byRackLevel.get(key).push(item)
    }

    for (const [key, items] of byRackLevel) {
      items.sort((a, b) => a.position - b.position)
      for (let index = 1; index < items.length; index += 1) {
        const previous = items[index - 1]
        const current = items[index]
        if (new Date(previous.receivedAt || 0) > new Date(current.receivedAt || 0)) {
          warnings.push({
            type: 'fifo-order',
            message: `Urutan FIFO berpotensi terbalik pada ${key}: ${previous.palletId} lebih baru berada di depan ${current.palletId}.`
          })
        }
      }
    }

    const rackDistribution = [...byRackLevel.entries()].map(([key, items]) => ({
      location: key,
      palletCount: items.length
    })).sort((a, b) => b.palletCount - a.palletCount)

    const unplaced = pallets.filter(pallet => pallet.locationStatus === 'unplaced' || !pallet.location).map(pallet => ({
      palletId: pallet.id,
      palletName: pallet.name,
      receivedAt: pallet.createdAt
    })).sort((a, b) => new Date(a.receivedAt || 0) - new Date(b.receivedAt || 0))

    res.json({
      priority: locations,
      warnings,
      rackDistribution,
      unplaced,
      direction: 'FIFO berdasarkan tanggal penerimaan barang; posisi slot mengikuti urutan fisik rack.'
    })
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil laporan FIFO', error: err.message })
  }
})

// ======================================================
// MOVEMENT PALLET
// ======================================================
router.post('/movement', async (req, res) => {
  try {
    const palletId = clean(req.body.palletId)
    const { warehouseId, coldStorageId, rackId, levelCode, slotCode } = req.body.to || {}

    if (!palletId || !warehouseId || !coldStorageId || !rackId || !levelCode || !slotCode) {
      return res.status(400).json({ message: 'Data pallet dan tujuan movement wajib lengkap' })
    }

    const pallet = await Pallet.findOne({ id: palletId })
    if (!pallet) return res.status(404).json({ message: 'Pallet tidak ditemukan' })

    const allWarehouses = await Warehouse.find()
    const warehouse = allWarehouses.find(item => String(item._id) === String(warehouseId))
    if (!warehouse) return res.status(404).json({ message: 'Gudang tujuan tidak ditemukan' })

    const target = getSlot(warehouse, { coldStorageId, rackId, levelCode, slotCode })
    if (!target.slot) return res.status(404).json({ message: 'Slot tujuan tidak ditemukan' })
    if (target.slot.status === 'inactive') return res.status(409).json({ message: 'Slot tujuan sedang inactive' })
    if (target.slot.palletId && target.slot.palletId !== palletId) return res.status(409).json({ message: 'Slot tujuan sudah ditempati pallet lain' })

    const from = pallet.location || null

    for (const sourceWarehouse of allWarehouses) {
      for (const coldStorage of sourceWarehouse.coldStorages) {
        for (const rack of coldStorage.racks) {
          for (const level of rack.levels) {
            for (const slot of level.slots) {
              if (slot.palletId === palletId) {
                slot.palletId = null
                slot.status = 'empty'
              }
            }
          }
        }
      }
    }

    const freshTarget = getSlot(warehouse, { coldStorageId, rackId, levelCode, slotCode })
    freshTarget.slot.palletId = palletId
    freshTarget.slot.status = 'occupied'

    for (const sourceWarehouse of allWarehouses) {
      await sourceWarehouse.save()
    }

    pallet.locationStatus = 'placed'
    pallet.location = {
      warehouseId: String(warehouse._id),
      warehouseCode: warehouse.code,
      coldStorageId: String(freshTarget.coldStorage._id),
      coldStorageCode: freshTarget.coldStorage.code,
      rackId: String(freshTarget.rack._id),
      rackCode: freshTarget.rack.code,
      levelCode: freshTarget.level.code,
      slotCode: freshTarget.slot.code
    }
    await pallet.save()

    const movement = await WarehouseMovement.create({
      palletId,
      userId: req.user?.id,
      username: req.user?.username,
      from,
      to: pallet.location,
      reason: clean(req.body.reason) || 'warehouse movement'
    })

    res.json({ message: 'Pallet berhasil dipindahkan', pallet, movement })
  } catch (err) {
    res.status(500).json({ message: 'Gagal memindahkan pallet', error: err.message })
  }
})

router.get('/movement/history', async (_req, res) => {
  try {
    const history = await WarehouseMovement.find().sort({ movedAt: -1 }).limit(200)
    res.json(history)
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil riwayat movement', error: err.message })
  }
})

export default router
