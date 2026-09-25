import { useEffect, useState } from 'react'
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate
} from 'react-router-dom'

import Dashboard from './pages/Dashboard'
import PalletLayout from './pages/PalletLayout'
import PalletDetail from './pages/PalletDetail'
import Pallets from './pages/Pallets'
import TransactionHistory from './pages/TransactionHistory'
import Login from './pages/Login'
import Register from './pages/Register'
import WarehouseManagement from './pages/WarehouseManagement'
import TransactionsManagement from './pages/TransactionsManagement'
import ManifestManagement from './pages/ManifestManagement'

import {
  getCurrentUser,
  logoutUser
} from './services/api'

const TOKEN_KEY = 'warehouse_token'
const USER_KEY = 'warehouse_user'

const menus = [
  ['/', 'Dashboard'],
  ['/pallets', 'Pallet'],
  ['/layout', 'Pallet Layout'],
  ['/warehouse', 'Denah Gudang'],
  ['/inbound', 'Inbound'],
  ['/outbound', 'Outbound'],
  ['/transactions', 'Transaksi'],
  ['/manifests', 'Manifest']
]

function ProtectedApp({ user, onLogout }) {
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await logoutUser()
    } catch (error) {
      console.error(error)
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      onLogout()
      navigate('/login', { replace: true })
    }
  }

  async function handleSwitchAccount() {
    try {
      await logoutUser()
    } catch (error) {
      console.error(error)
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      onLogout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">W</span>
          <div>
            <strong>Warehouse</strong>
            <small>Management</small>
          </div>
        </div>

        <nav>
          {menus.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                isActive
                  ? 'nav-item active'
                  : 'nav-item'
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          Web • Desktop First
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">WAREHOUSE</span>
            <h1>Inventory Management</h1>
          </div>

          <div className="topbar-account">
            <div className="account-info">
              <strong>{user.name}</strong>
              <span>@{user.username}</span>
            </div>

            <button
              className="account-button"
              onClick={handleSwitchAccount}
              title="Ganti akun"
            >
              Ganti Akun
            </button>

            <button
              className="account-logout"
              onClick={handleLogout}
              title="Logout"
            >
              Logout
            </button>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pallets" element={<Pallets />} />
          <Route path="/layout" element={<PalletLayout />} />
          <Route path="/layout/:palletId" element={<PalletDetail />} />
          <Route path="/warehouse" element={<WarehouseManagement />} />
          <Route path="/inbound" element={<TransactionHistory type="inbound" />} />
          <Route path="/outbound" element={<TransactionHistory type="outbound" />} />
          <Route path="/transactions" element={<TransactionsManagement />} />
          <Route path="/manifests" element={<ManifestManagement />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const location = useLocation()

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(USER_KEY)

    if (!saved) return null

    try {
      return JSON.parse(saved)
    } catch {
      localStorage.removeItem(USER_KEY)
      return null
    }
  })

  const [checkingSession, setCheckingSession] = useState(
    Boolean(localStorage.getItem(TOKEN_KEY))
  )

  useEffect(() => {
    async function checkSession() {
      const token = localStorage.getItem(TOKEN_KEY)

      if (!token) {
        setCheckingSession(false)
        return
      }

      try {
        const { data } = await getCurrentUser()
        setUser(data.user)
        localStorage.setItem(
          USER_KEY,
          JSON.stringify(data.user)
        )
      } catch (error) {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setUser(null)
      } finally {
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [])

  if (checkingSession) {
    return (
      <main className="auth-page">
        <div className="auth-loading">
          Memeriksa sesi login...
        </div>
      </main>
    )
  }

  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/register'

  if (!user) {
    if (location.pathname === '/register') {
      return <Register />
    }

    return (
      <Login
        onLogin={setUser}
      />
    )
  }

  if (isAuthPage) {
    return (
      <Navigate
        to="/"
        replace
      />
    )
  }

  return (
    <ProtectedApp
      user={user}
      onLogout={() => setUser(null)}
    />
  )
}
