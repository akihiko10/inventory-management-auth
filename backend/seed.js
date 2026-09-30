import crypto from 'node:crypto'
import User from './models/User.js'
import Pallet from './models/Pallet.js'
import PalletDetail from './models/PalletDetail.js'
import Layout from './models/Layout.js'

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

// Dipanggil sekali tiap server nyala. Kalau koleksinya udah ada isinya,
// gak akan nimpa apa-apa -- aman dipanggil berkali-kali.
export async function seedInitialData() {
  const userCount = await User.countDocuments()

  if (userCount === 0) {
    await User.create({
      id: 'USR-0001',
      name: 'Administrator',
      username: 'admin',
      passwordHash: hashPassword('admin123')
    })
    console.log('Seed: akun admin dibuat (admin / admin123)')
  }

  const palletCount = await Pallet.countDocuments()

  if (palletCount === 0) {
    const p01 = await Pallet.create({ id: 'P01', name: 'Pallet P01', status: 'occupied' })
    const p02 = await Pallet.create({ id: 'P02', name: 'Pallet P02', status: 'occupied' })

    await Pallet.create(
      Array.from({ length: 6 }, (_, index) => ({
        id: `P0${index + 3}`,
        name: `Pallet P0${index + 3}`,
        status: 'empty'
      }))
    )

    await PalletDetail.create([
      {
        id: 'ITEM-001',
        pallet: p01._id,
        palletCode: p01.id,
        sku: 'SKU-001',
        itemName: 'Produk A',
        packaging: 'Box',
        packageQty: 20,
        cartonQty: 5,
        sackQty: 0,
        weightKg: 125,
        barcode: '899000000001'
      },
      {
        id: 'ITEM-002',
        pallet: p02._id,
        palletCode: p02.id,
        sku: 'SKU-002',
        itemName: 'Produk B',
        packaging: 'Bag',
        packageQty: 30,
        cartonQty: 6,
        sackQty: 10,
        weightKg: 150,
        barcode: '899000000002'
      },
      {
        id: 'ITEM-003',
        pallet: p02._id,
        palletCode: p02.id,
        sku: 'SKU-003',
        itemName: 'Produk C',
        packaging: 'Box',
        packageQty: 10,
        cartonQty: 2,
        sackQty: 0,
        weightKg: 50,
        barcode: '899000000003'
      }
    ])

    console.log('Seed: 8 pallet + detail barang awal dibuat (P01-P08)')
  }

  // Migrasi data lama: detail barang yang sebelumnya disimpan di koleksi
  // PalletDetail dipindahkan ke items embedded pada Pallet.
  const existingPallets = await Pallet.find()
  for (const pallet of existingPallets) {
    if (!Array.isArray(pallet.items)) pallet.items = []
    if (!pallet.validationStatus) pallet.validationStatus = 'pending'
    if (!pallet.locationStatus) pallet.locationStatus = 'unplaced'
    if (!pallet.color) pallet.color = '#4f7cff'

    const legacyItems = await PalletDetail.find({ pallet: pallet._id })
    if (pallet.items.length === 0 && legacyItems.length > 0) {
      pallet.items = legacyItems.map(item => ({
        id: item.id,
        sku: item.sku,
        itemName: item.itemName,
        itemType: item.itemType || '',
        packaging: item.packaging || '-',
        packageQty: Number(item.packageQty || 0),
        cartonQty: Number(item.cartonQty || 0),
        sackQty: Number(item.sackQty || 0),
        boxQty: Number(item.boxQty || 0),
        weightKg: Number(item.weightKg || 0),
        barcode: item.barcode || '',
        receivedAt: item.createdAt || new Date(),
        customFields: {}
      }))
      console.log(`Migration: ${legacyItems.length} item dari ${pallet.id} dipindahkan ke embedded items`)
    }

    const hasPositive = pallet.items.some(item =>
      Number(item.packageQty || 0) + Number(item.cartonQty || 0) +
      Number(item.sackQty || 0) + Number(item.boxQty || 0) + Number(item.weightKg || 0) > 0
    )
    pallet.state = pallet.items.length && hasPositive ? 'occupied' : 'empty'
    pallet.status = pallet.state === 'empty' ? 'empty' : 'occupied'
    await pallet.save()
  }

  const layoutCount = await Layout.countDocuments()

  if (layoutCount === 0) {
    const pallets = await Pallet.find()
    const byId = Object.fromEntries(pallets.map(p => [p.id, p._id]))

    await Layout.create({
      id: 'LAY-001',
      name: 'Warehouse A',
      orientation: 'horizontal',
      fifoDirection: 'right',
      levels: [
        {
          id: 'L3',
          name: 'Level 3',
          slots: [
            { position: 1, palletId: 'P08', pallet: byId.P08, color: '#7c5cff' },
            { position: 2, palletId: null, pallet: null, color: null },
            { position: 3, palletId: null, pallet: null, color: null },
            { position: 4, palletId: null, pallet: null, color: null }
          ]
        },
        {
          id: 'L2',
          name: 'Level 2',
          slots: [
            { position: 1, palletId: 'P05', pallet: byId.P05, color: '#e66a6a' },
            { position: 2, palletId: 'P06', pallet: byId.P06, color: '#4f7cff' },
            { position: 3, palletId: 'P07', pallet: byId.P07, color: '#55b978' },
            { position: 4, palletId: null, pallet: null, color: null }
          ]
        },
        {
          id: 'L1',
          name: 'Level 1',
          slots: [
            { position: 1, palletId: 'P01', pallet: byId.P01, color: '#4f7cff' },
            { position: 2, palletId: 'P02', pallet: byId.P02, color: '#f2b84b' },
            { position: 3, palletId: 'P03', pallet: byId.P03, color: '#55b978' },
            { position: 4, palletId: 'P04', pallet: byId.P04, color: '#e66a6a' }
          ]
        }
      ]
    })
    console.log('Seed: layout awal LAY-001 dibuat')
  }
}
