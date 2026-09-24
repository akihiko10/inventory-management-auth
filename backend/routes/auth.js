import { Router } from 'express'
import crypto from 'node:crypto'

const router = Router()

// ======================================================
// AUTH STORE
// ======================================================
// Untuk tahap sekarang data user masih disimpan di memory.
// Nanti saat MongoDB masuk, bagian ini dapat dipindahkan
// ke collection users tanpa mengubah alur frontend.

const users = [
  {
    id: 'USR-0001',
    name: 'Administrator',
    username: 'admin',
    passwordHash: hashPassword('admin123')
  }
]

const sessions = new Map()

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, storedHash) {
  const [salt, originalHash] = String(storedHash).split(':')

  if (!salt || !originalHash) return false

  const hash = crypto.scryptSync(password, salt, 64).toString('hex')

  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(originalHash, 'hex')
  )
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username
  }
}

function generateUserId() {
  return `USR-${String(users.length + 1).padStart(4, '0')}`
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function getUserFromRequest(req) {
  const header = req.headers.authorization || ''

  if (!header.startsWith('Bearer ')) {
    return null
  }

  const token = header.slice(7)
  const userId = sessions.get(token)

  if (!userId) return null

  return users.find(user => user.id === userId) || null
}

export function requireAuth(req, res, next) {
  const user = getUserFromRequest(req)

  if (!user) {
    return res.status(401).json({
      message: 'Sesi login tidak valid atau sudah berakhir'
    })
  }

  req.user = user
  next()
}

// ======================================================
// REGISTER
// ======================================================

router.post('/register', (req, res) => {
  const {
    name,
    username,
    password
  } = req.body

  const cleanName = String(name || '').trim()
  const cleanUsername = String(username || '').trim().toLowerCase()
  const cleanPassword = String(password || '')

  if (!cleanName) {
    return res.status(400).json({
      message: 'Nama wajib diisi'
    })
  }

  if (!cleanUsername) {
    return res.status(400).json({
      message: 'Username wajib diisi'
    })
  }

  if (!/^[a-z0-9._-]{3,30}$/.test(cleanUsername)) {
    return res.status(400).json({
      message: 'Username minimal 3 karakter dan hanya boleh berisi huruf, angka, titik, underscore, atau tanda minus'
    })
  }

  if (cleanPassword.length < 6) {
    return res.status(400).json({
      message: 'Password minimal 6 karakter'
    })
  }

  const existingUser = users.find(
    user => user.username === cleanUsername
  )

  if (existingUser) {
    return res.status(409).json({
      message: 'Username sudah digunakan'
    })
  }

  const user = {
    id: generateUserId(),
    name: cleanName,
    username: cleanUsername,
    passwordHash: hashPassword(cleanPassword)
  }

  users.push(user)

  res.status(201).json({
    message: 'User berhasil didaftarkan',
    user: publicUser(user)
  })
})

// ======================================================
// LOGIN
// ======================================================

router.post('/login', (req, res) => {
  const {
    username,
    password
  } = req.body

  const cleanUsername = String(username || '').trim().toLowerCase()
  const cleanPassword = String(password || '')

  const user = users.find(
    item => item.username === cleanUsername
  )

  if (!user || !verifyPassword(cleanPassword, user.passwordHash)) {
    return res.status(401).json({
      message: 'Username atau password salah'
    })
  }

  const token = generateToken()

  sessions.set(token, user.id)

  res.json({
    message: 'Login berhasil',
    token,
    user: publicUser(user)
  })
})

// ======================================================
// CURRENT USER
// ======================================================

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: publicUser(req.user)
  })
})

// ======================================================
// LOGOUT
// ======================================================

router.post('/logout', (req, res) => {
  const header = req.headers.authorization || ''

  if (header.startsWith('Bearer ')) {
    const token = header.slice(7)
    sessions.delete(token)
  }

  res.json({
    message: 'Logout berhasil'
  })
})

export default router
