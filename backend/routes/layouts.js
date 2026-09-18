import { Router } from 'express'
import Layout from '../models/Layout.js'
import Pallet from '../models/Pallet.js'

const router = Router()

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

async function generateLayoutId() {
  const count = await Layout.countDocuments()
  return `LAY-${String(count + 1).padStart(3, '0')}`
}

function findSlot(layout, levelId, position) {
  const level = layout.levels.find(item => item.id === levelId)
  if (!level) return { level: null, slot: null }

  return {
    level,
    slot: level.slots.find(item => item.position === Number(position)) || null
  }
}

function formatLayout(layout) {
  const plain = layout.toObject ? layout.toObject() : layout
  delete plain._id
  plain.levels = (plain.levels || []).map(level => {
    const clone = { ...level }
    delete clone._id
    clone.slots = (clone.slots || []).map(slot => {
      const slotClone = { ...slot }
      delete slotClone._id
      return slotClone
    })
    return clone
  })
  return plain
}

router.get('/', async (_req, res) => {
  const layouts = await Layout.find()
  res.json(layouts.map(formatLayout))
})

router.get('/:layoutId', async (req, res) => {
  const layout = await Layout.findOne({ id: req.params.layoutId })

  if (!layout) {
    return res.status(404).json({ message: 'Layout tidak ditemukan' })
  }

  res.json(formatLayout(layout))
})

router.post('/', async (req, res) => {
  const {
    name,
    orientation = 'horizontal',
    fifoDirection = 'right',
    levelCount = 3,
    slotCount = 4
  } = req.body

  const parsedLevels = Number(levelCount)
  const parsedSlots = Number(slotCount)

  const layoutId = await generateLayoutId()
  const finalName = name !== undefined ? name : `Layout ${layoutId}`

  if (!String(finalName).trim()) {
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

  const layout = await Layout.create({
    id: layoutId,
    name: String(finalName).trim(),
    orientation,
    fifoDirection,
    levels: createLevels(parsedLevels, parsedSlots)
  })

  res.status(201).json(formatLayout(layout))
})

router.put('/:id', async (req, res) => {
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
  res.json(formatLayout(layout))
})

router.delete('/:id', async (req, res) => {
  const layout = await Layout.findOneAndDelete({ id: req.params.id })

  if (!layout) {
    return res.status(404).json({ message: 'Layout tidak ditemukan' })
  }

  res.json(formatLayout(layout))
})

// Tempatkan pallet yang sebelumnya belum memiliki posisi.
router.put('/:id/place', async (req, res) => {
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

  for (const level of layout.levels) {
    for (const currentSlot of level.slots) {
      if (currentSlot.palletId === palletId) {
        return res.status(409).json({ message: `${palletId} sudah berada di layout ini` })
      }
    }
  }

  const palletDoc = await Pallet.findOne({ id: palletId })

  slot.palletId = palletId
  slot.pallet = palletDoc?._id || null
  slot.color = color || '#4f7cff'

  layout.markModified('levels')
  await layout.save()

  res.json(formatLayout(layout))
})

// Pindahkan pallet dalam layout, termasuk pindah level dan swap.
router.put('/:id/move', async (req, res) => {
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
    return res.json(formatLayout(layout))
  }

  ;[source.slot.palletId, target.slot.palletId] = [target.slot.palletId, source.slot.palletId]
  ;[source.slot.pallet, target.slot.pallet] = [target.slot.pallet, source.slot.pallet]
  ;[source.slot.color, target.slot.color] = [target.slot.color, source.slot.color]

  layout.markModified('levels')
  await layout.save()

  res.json(formatLayout(layout))
})

// Kompatibilitas dengan endpoint versi sebelumnya.
router.put('/:id/position', async (req, res) => {
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

  ;[source.slot.palletId, target.slot.palletId] = [target.slot.palletId, source.slot.palletId]
  ;[source.slot.pallet, target.slot.pallet] = [target.slot.pallet, source.slot.pallet]
  ;[source.slot.color, target.slot.color] = [target.slot.color, source.slot.color]

  layout.markModified('levels')
  await layout.save()

  res.json(formatLayout(layout))
})

export default router
