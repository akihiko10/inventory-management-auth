import { useState } from 'react'
import API from './api/axios'
import { LogIn, Package, ShieldCheck, LogOut } from 'lucide-react'

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await API.post('/auth/login', { username, password })
      localStorage.setItem('token', res.data.token)
      setUser(res.data.user)
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal! Pastikan server backend running di port 5000.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '500px', margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
        <Package size={32} color="#0284c7" />
        <h2 style={{ margin: 0 }}>PASATA WMS Frontend</h2>
      </header>

      {!user ? (
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LogIn size={20} /> Login Aktor System
          </h3>

          {error && <p style={{ color: '#ef4444', margin: 0, fontSize: '14px' }}>{error}</p>}

          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>

          <button type="submit" style={{ padding: '10px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Masuk
          </button>
        </form>
      ) : (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1.5rem', borderRadius: '8px' }}>
          <h3 style={{ margin: 0, color: '#15803d', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={24} /> Authenticated!
          </h3>
          <p style={{ margin: '12px 0 4px 0' }}>User: <strong>{user.username}</strong></p>
          <p style={{ margin: '0 0 16px 0' }}>Role: <span style={{ background: '#dcfce7', padding: '2px 8px', borderRadius: '4px', fontSize: '14px' }}>{user.role}</span></p>

          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default App
