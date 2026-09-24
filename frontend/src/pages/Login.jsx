import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { loginUser } from '../services/api'

const TOKEN_KEY = 'warehouse_token'
const USER_KEY = 'warehouse_user'

export default function Login({ onLogin }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({
    username: '',
    password: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await loginUser(form)

      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))

      onLogin(data.user)

      const destination = location.state?.from || '/'
      navigate(destination, { replace: true })
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        'Login gagal. Periksa koneksi backend.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">W</span>
          <div>
            <strong>Warehouse</strong>
            <small>Management</small>
          </div>
        </div>

        <div className="auth-heading">
          <span className="eyebrow">WELCOME BACK</span>
          <h1>Login</h1>
          <p>Masuk untuk mengelola inventory warehouse.</p>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Username
            <input
              autoFocus
              value={form.username}
              onChange={event =>
                setForm({
                  ...form,
                  username: event.target.value
                })
              }
              placeholder="admin"
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
              placeholder="Masukkan password"
              autoComplete="current-password"
              required
            />
          </label>

          <button
            className="primary auth-submit"
            disabled={loading}
          >
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </form>

        <div className="auth-divider">
          Belum punya akun?
        </div>

        <Link
          to="/register"
          className="secondary auth-register-link"
        >
          Daftarkan User
        </Link>

        <div className="auth-demo">
          <strong>Akun demo</strong>
          <span>Username: admin</span>
          <span>Password: admin123</span>
        </div>
      </div>
    </main>
  )
}
