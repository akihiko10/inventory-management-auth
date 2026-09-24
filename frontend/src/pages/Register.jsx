import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../services/api'

export default function Register() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (form.password !== form.confirmPassword) {
      setError('Konfirmasi password tidak sama')
      return
    }

    setLoading(true)

    try {
      await registerUser({
        name: form.name,
        username: form.username,
        password: form.password
      })

      setSuccess(
        'User berhasil didaftarkan. Silakan login dengan akun tersebut.'
      )

      setForm({
        name: '',
        username: '',
        password: '',
        confirmPassword: ''
      })
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        'Pendaftaran gagal. Periksa koneksi backend.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card register-card">
        <div className="auth-brand">
          <span className="brand-mark">W</span>
          <div>
            <strong>Warehouse</strong>
            <small>Management</small>
          </div>
        </div>

        <div className="auth-heading">
          <span className="eyebrow">NEW ACCOUNT</span>
          <h1>Daftarkan User</h1>
          <p>Buat akun baru untuk mengakses sistem warehouse.</p>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {success && (
          <div className="auth-success">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Nama Lengkap
            <input
              value={form.name}
              onChange={event =>
                setForm({
                  ...form,
                  name: event.target.value
                })
              }
              placeholder="Nama user"
              autoComplete="name"
              required
            />
          </label>

          <label>
            Username
            <input
              value={form.username}
              onChange={event =>
                setForm({
                  ...form,
                  username: event.target.value
                })
              }
              placeholder="username"
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={event =>
                setForm({
                  ...form,
                  password: event.target.value
                })
              }
              placeholder="Minimal 6 karakter"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          <label>
            Konfirmasi Password
            <input
              type="password"
              value={form.confirmPassword}
              onChange={event =>
                setForm({
                  ...form,
                  confirmPassword:
                    event.target.value
                })
              }
              placeholder="Ulangi password"
              autoComplete="new-password"
              required
            />
          </label>

          <button
            className="primary auth-submit"
            disabled={loading}
          >
            {loading ? 'Mendaftarkan...' : 'Daftarkan User'}
          </button>
        </form>

        <div className="auth-divider">
          Sudah punya akun?
        </div>

        <Link
          to="/login"
          className="secondary auth-register-link"
        >
          Kembali ke Login
        </Link>

        <button
          type="button"
          className="auth-text-link"
          onClick={() => navigate('/login')}
        >
          ← Kembali
        </button>
      </div>
    </main>
  )
}
