import express from 'express'
import cors from 'cors'

import { connectDB } from './db.js'
import { seedInitialData } from './seed.js'

import palletRoutes from './routes/pallets.js'
import layoutRoutes from './routes/layouts.js'
import transactionRoutes from './routes/transactions.js'
import manifestRoutes from './routes/manifests.js'
import warehouseRoutes from './routes/warehouses.js'
import authRoutes, { requireAuth } from './routes/auth.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OK',
    service: 'inventory-backend',
    timestamp: new Date().toISOString()
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/pallets', requireAuth, palletRoutes)
app.use('/api/layouts', requireAuth, layoutRoutes)
app.use('/api/transactions', requireAuth, transactionRoutes)
app.use('/api/manifests', requireAuth, manifestRoutes)
app.use('/api/warehouses', requireAuth, warehouseRoutes)

app.use((req, res) => {
  res.status(404).json({
    message: 'Endpoint tidak ditemukan',
    path: req.originalUrl
  })
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({
    message: 'Terjadi kesalahan pada server'
  })
})

const PORT = 3000

async function start() {
  await connectDB()
  await seedInitialData()

  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`)
  })
}

start()
