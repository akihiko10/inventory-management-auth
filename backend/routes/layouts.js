import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()

// Mongoose Schema & Model buat Layout
const slotSchema = new mongoose.Schema({
  position: Number,
  palletId: { type: String, default: null },
  color: { type: String, default: null }
}, { _id: false })

const levelSchema = new mongoose.Schema({
  id: String,
  name: String,
  slots: [slotSchema]
}, { _id: false })

const layoutSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  orientation: { type: String, enum: ['horizontal', 'vertical'], default: 'horizontal' },
  fifoDirection: { type: String, enum: ['right', 'left', 'down', 'up'], default: 'right' },
  levels: [levelSchema]
}, { timestamps: true })

const Layout = mongoose.models.Layout || mongoose.model('Layout', layoutSchema, 'layouts')

// Helper untuk generate struktur level & slot
function createLevels(levelCount, slotCount) {
  return Array.from({ length: levelCount }, (_, levelIndex) => ({
    id: `L${levelIndex + 1}`,
    name: `Level ${levelIndex + 1}`,
    slots: Array.from({ length: slotCount }, (_, positionIndex) => ({
      position: positionIndex + 1,
      palletId: null,
      color: null
    }))
  })).reverse()
}

// Helper pencari slot
function findSlot(layout, levelId, position) {
  const level = layout.levels.find(item => item.id === levelId)
  if (!level) return { level: null, slot: null }

  return {
    level,
    slot: level.slots.find(item => item.position === Number(position)) || null
  }
}

// 1. GET ALL LAYOUTS
router.get('/', async (_req, res) => {
  try {
    const layouts = await Layout.find()
    res.json(layouts)
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data layout', error: err.message })
  }
})

// 2. GET SINGLE LAYOUT BY ID
router.get('/:layoutId', async (req, res) => {
  try {
    const layout = await Layout.findOne({ id: req.params.layoutId })
    if (!layout) {
      return res.status(404).json({ message: 'Layout tidak ditemukan' })
    }
    res.json(layout)
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil layout', error: err.message })
  }
})

// 3. CREATE NEW LAYOUT
router.post('/', async (req, res) => {
  try {
    const {
      name,
      orientation = 'horizontal',
      fifoDirection = 'right',
      levelCount = 3,
      slotCount = 4
    } = req.body

    const parsedLevels = Number(levelCount)
    const parsedSlots = Number(slotCount)

    if (!String(name || '').trim()) {
      return res.status(400).json({ message: 'Nama layout wajib diisi' })
    }

    if (!['horizontal', 'vertical'].includes(orientation)) {
      return res.status(400).json({ message: 'Orientasi tidak valid' })
    }

    if (!['right', 'left', 'down', 'up'].includes(fifoDirection)) {
      return res.status(400).json({ message: 'Arah FIFO tidak valid' })
    }

    if (
      !Number.isInteger(parsedLevels) ||
      parsedLevels < 1 ||
      parsedLevels > 10 ||
      !Number.isInteger(parsedSlots) ||
      parsedSlots < 1 ||
      parsedSlots > 30
    ) {
      return res.status(400).json({ message: 'Jumlah level atau slot tidak valid' })
    }

    // Auto-generate ID customLAY-xxx berdasarkan count DB
    const count = await Layout.countDocuments()
    const customId = `LAY-${String(count + 1).padStart(3, '0')}`

    const layout = new Layout({
      id: customId,
      name: String(name).trim(),
                              orientation,
                              fifoDirection,
                              levels: createLevels(parsedLevels, parsedSlots)
    })

    const savedLayout = await layout.save()
    res.status(201).json(savedLayout)
  } catch (err) {
    res.status(500).json({ message: 'Gagal membuat layout', error: err.message })
  }
})

// 4. UPDATE LAYOUT INFO (Name, Orientation, FIFO)
router.put('/:id', async (req, res) => {
  try {
    const layout = await Layout.findOne({ id: req.params.id })
    if (!layout) {
      return res.status(404).json({ message: 'Layout tidak ditemukan' })
    }

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim()
      if (!name) {
        return res.status(400).json({ message: 'Nama layout tidak boleh kosong' })
      }
      layout.name = name
    }

    if (req.body.orientation !== undefined) {
      if (!['horizontal', 'vertical'].includes(req.body.orientation)) {
        return res.status(400).json({ message: 'Orientasi tidak valid' })
      }
      layout.orientation = req.body.orientation
    }

    if (req.body.fifoDirection !== undefined) {
      if (!['right', 'left', 'down', 'up'].includes(req.body.fifoDirection)) {
        return res.status(400).json({ message: 'Arah FIFO tidak valid' })
      }
      layout.fifoDirection = req.body.fifoDirection
    }

    await layout.save()
    res.json(layout)
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengupdate layout', error: err.message })
  }
})

// 5. DELETE LAYOUT
router.delete('/:id', async (req, res) => {
  try {
    const removed = await Layout.findOneAndDelete({ id: req.params.id })
    if (!removed) {
      return res.status(404).json({ message: 'Layout tidak ditemukan' })
    }
    res.json(removed)
  } catch (err) {
    res.status(500).json({ message: 'Gagal menghapus layout', error: err.message })
  }
})

// 6. PLACE PALLET IN SLOT
router.put('/:id/place', async (req, res) => {
  try {
    const { palletId, levelId, position, color } = req.body
    const layout = await Layout.findOne({ id: req.params.id })

    if (!layout) {
      return res.status(404).json({ message: 'Layout tidak ditemukan' })
    }

    if (!palletId) {
      return res.status(400).json({ message: 'Pallet ID wajib diisi' })
    }

    const { slot } = findSlot(layout, levelId, position)

    if (!slot) {
      return res.status(400).json({ message: 'Slot tujuan tidak valid' })
    }

    if (slot.palletId) {
      return res.status(409).json({ message: `Slot ${position} sudah ditempati ${slot.palletId}` })
    }

    // Pastikan pallet belum ada di layout ini
    for (const level of layout.levels) {
      for (const currentSlot of level.slots) {
        if (currentSlot.palletId === palletId) {
          return res.status(409).json({ message: `${palletId} sudah berada di layout ini` })
        }
      }
    }

    slot.palletId = palletId
    slot.color = color || '#4f7cff'

    await layout.save()
    res.json(layout)
  } catch (err) {
    res.status(500).json({ message: 'Gagal menempatkan pallet', error: err.message })
  }
})

// 7. MOVE / SWAP PALLET BETWEEN SLOTS
router.put('/:id/move', async (req, res) => {
  try {
    const { fromLevelId, fromPosition, toLevelId, toPosition } = req.body
    const layout = await Layout.findOne({ id: req.params.id })

    if (!layout) {
      return res.status(404).json({ message: 'Layout tidak ditemukan' })
    }

    const source = findSlot(layout, fromLevelId, fromPosition)
    const target = findSlot(layout, toLevelId, toPosition)

    if (!source.slot || !target.slot) {
      return res.status(400).json({ message: 'Posisi pallet tidak valid' })
    }

    if (!source.slot.palletId) {
      return res.status(400).json({ message: 'Slot asal tidak memiliki pallet' })
    }

    if (
      source.level.id === target.level.id &&
      source.slot.position === target.slot.position
    ) {
      return res.json(layout)
    }

    // Swap palletId & color
    ;[source.slot.palletId, target.slot.palletId] = [
      target.slot.palletId,
      source.slot.palletId
    ]

    ;[source.slot.color, target.slot.color] = [
      target.slot.color,
      source.slot.color
    ]

    await layout.save()
    res.json(layout)
  } catch (err) {
    res.status(500).json({ message: 'Gagal memindahkan pallet', error: err.message })
  }
})

// 8. LEGACY POSITION ENDPOINT (COMPATIBILITY)
router.put('/:id/position', async (req, res) => {
  try {
    const { levelId, fromPosition, toPosition } = req.body
    const layout = await Layout.findOne({ id: req.params.id })

    if (!layout) {
      return res.status(404).json({ message: 'Layout tidak ditemukan' })
    }

    const source = findSlot(layout, levelId, fromPosition)
    const target = findSlot(layout, levelId, toPosition)

    if (!source.slot || !target.slot) {
      return res.status(400).json({ message: 'Posisi pallet tidak valid' })
    }

    if (!source.slot.palletId) {
      return res.status(400).json({ message: 'Slot asal tidak memiliki pallet' })
    }

    ;[source.slot.palletId, target.slot.palletId] = [
      target.slot.palletId,
      source.slot.palletId
    ]

    ;[source.slot.color, target.slot.color] = [
      target.slot.color,
      source.slot.color
    ]

    await layout.save()
    res.json(layout)
  } catch (err) {
    res.status(500).json({ message: 'Gagal menggeser posisi pallet', error: err.message })
  }
})

export default router
