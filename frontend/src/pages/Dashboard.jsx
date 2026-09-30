import { useEffect, useMemo, useState } from 'react'
import { getPallets, getTransactions, getApiErrorMessage } from '../services/api'

function fmt(v) {
  return Number(v || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })
}

function palletTone(p) {
  if (p.validationStatus === 'invalid') return 'invalid'
  if (p.validationStatus === 'valid') return 'valid'
  return 'pending'
}

export default function Dashboard() {
  const [pallets, setPallets] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    try {
      setLoading(true)
      setError('')
      const [palletResponse, transactionResponse] = await Promise.all([
        getPallets(),
        getTransactions()
      ])
      setPallets(palletResponse.data || [])
      const tx = transactionResponse.data
      setTransactions(Array.isArray(tx) ? tx : tx?.transactions || [])
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal mengambil data dashboard'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const stats = useMemo(() => ({
    pallet: pallets.length,
    weight: pallets.reduce((n, p) => n + Number(p.summary?.totalWeight || 0), 0),
    cartons: pallets.reduce((n, p) => n + Number(p.summary?.totalCartons || 0), 0),
    sku: pallets.reduce((n, p) => n + Number(p.summary?.totalSku || 0), 0),
    valid: pallets.filter(p => p.validationStatus === 'valid').length,
    pending: pallets.filter(p => !p.validationStatus || p.validationStatus === 'pending').length,
    invalid: pallets.filter(p => p.validationStatus === 'invalid').length
  }), [pallets])

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">WAREHOUSE OVERVIEW</span>
          <h2>Dashboard</h2>
          <p className="muted">Ringkasan kondisi pallet dan aktivitas warehouse.</p>
        </div>
        <button className="secondary" onClick={load} disabled={loading}>
          {loading ? 'Memuat...' : '↻ Refresh'}
        </button>
      </div>

      {error && <div className="transaction-error">{error}</div>}

      <div className="stats">
        <Stat title="Total Pallet" value={fmt(stats.pallet)} />
        <Stat title="Total Weight" value={`${fmt(stats.weight)} kg`} />
        <Stat title="Total Carton" value={fmt(stats.cartons)} />
        <Stat title="Total SKU" value={fmt(stats.sku)} />
      </div>

      <div className="layout-card">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">PALLET MAP</span>
            <h3>Visual Pallet</h3>
          </div>
          <div className="muted">
            Valid {stats.valid} • Pending {stats.pending} • Invalid {stats.invalid}
          </div>
        </div>

        {loading ? (
          <div className="loading-box">Memuat pallet...</div>
        ) : pallets.length === 0 ? (
          <div className="empty-page detail-empty">
            <div className="empty-page-icon">□</div>
            <h3>Belum ada pallet</h3>
            <p>Data pallet dari database akan tampil di sini.</p>
          </div>
        ) : (
          <div className="dashboard-pallet-grid">
            {pallets.map(p => (
              <div key={p.id} className={`dashboard-pallet-card ${palletTone(p)}`}>
                <div className="dashboard-pallet-top">
                  <strong>{p.id}</strong>
                  <span>{p.validationStatus || 'pending'}</span>
                </div>
                <div className="dashboard-pallet-shape">
                  <div className="pallet-board">PALLET</div>
                  <div className="pallet-boxes">
                    <i /><i /><i /><i />
                  </div>
                </div>
                <div className="dashboard-pallet-info">
                  <strong>{p.name}</strong>
                  <span>{p.items?.length || 0} item • {fmt(p.summary?.totalWeight)} kg</span>
                  <span>{p.location?.slotCode || 'Belum ditempatkan'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="layout-card">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">RECENT ACTIVITY</span>
            <h3>Transaksi Terbaru</h3>
          </div>
        </div>
        {transactions.length === 0 ? (
          <p className="muted">Belum ada transaksi.</p>
        ) : (
          <div className="dashboard-activity-list">
            {transactions.slice(0, 8).map((t, index) => (
              <div className="dashboard-activity" key={t._id || t.id || index}>
                <strong>{String(t.type || 'transaction').toUpperCase()}</strong>
                <span>{t.palletName || t.palletId || '-'} • {t.driverName || '-'} • {t.nopol || '-'}</span>
                <b>{t.status || 'draft'}</b>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function Stat({ title, value }) {
  return <div className="stat"><span>{title}</span><strong>{value}</strong></div>
}
