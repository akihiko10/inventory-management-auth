import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'

import palletRoutes, { pallets } from './routes/pallets.js'
import layoutRoutes from './routes/layouts.js'
import { createTransactionRouter } from './routes/transactions.js'
import authRoutes, { requireAuth } from './routes/auth.js'

const app = express()

app.use(cors())
app.use(express.json())

// Connect ke DB pasata_db
mongoose.connect('mongodb://127.0.0.1:27017/pasata_db')
  .then(() => console.log('🟢 MongoDB Connected to pasata_db via Podman!'))
  .catch((err) => console.error('🔴 MongoDB Connection Error:', err.message))

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
app.use('/api/transactions', requireAuth, createTransactionRouter(pallets))

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

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`)
})
