import { useEffect, useMemo, useState } from 'react'
import { getTransactions } from '../services/api'

function formatDate(value) {
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('id-ID', {
    maximumFractionDigits: 2
  })
}

export default function TransactionHistory({ type }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')

  const isInbound = type === 'inbound'

  async function loadTransactions() {
    try {
      setLoading(true)
      const { data } = await getTransactions({ type })
      setTransactions(data || [])
    } catch (error) {
      console.error(error)
      alert(error?.response?.data?.message || 'Gagal mengambil riwayat transaksi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [type])

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    if (!keyword) return transactions

    return transactions.filter(transaction =>
      [
        transaction.id,
        transaction.palletId,
        transaction.driverName,
        transaction.nopol
      ].some(value =>
        String(value || '').toLowerCase().includes(keyword)
      )
    )
  }, [transactions, search])

  const totals = useMemo(() => ({
    transactions: filtered.length,
    pallets: new Set(filtered.map(item => item.palletId)).size,
    weight: filtered.reduce(
      (sum, transaction) =>
        sum + transaction.items.reduce(
          (itemSum, item) => itemSum + Number(item.weightKg || 0),
          0
        ),
      0
    )
  }), [filtered])

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">TRANSACTION HISTORY</span>
          <h2>{isInbound ? 'Riwayat Inbound' : 'Riwayat Outbound'}</h2>
          <p className="muted">
            {isInbound
              ? 'Daftar barang yang sudah dikonfirmasi masuk ke warehouse.'
              : 'Daftar barang yang sudah dikonfirmasi keluar dari warehouse.'}
          </p>
        </div>

        <div className="transaction-history-search">
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Cari ID, pallet, driver, nopol..."
          />
        </div>
      </div>

      <div className="pallet-master-grid">
        <div className="master-stat">
          <span>Total Transaksi</span>
          <strong>{totals.transactions}</strong>
        </div>
        <div className="master-stat">
          <span>Pallet Terlibat</span>
          <strong>{totals.pallets}</strong>
        </div>
        <div className="master-stat">
          <span>Total Berat</span>
          <strong>{formatNumber(totals.weight)} kg</strong>
        </div>
        <div className="master-stat">
          <span>Status</span>
          <strong className="history-status">CONFIRMED</strong>
        </div>
      </div>

      <div className="layout-card">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">{isInbound ? 'INBOUND' : 'OUTBOUND'}</span>
            <h3>Transaksi Terkonfirmasi</h3>
          </div>
        </div>

        {loading ? (
          <div className="loading-box">Memuat riwayat transaksi...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-page">
            <div className="empty-page-icon">—</div>
            <h3>Belum ada transaksi</h3>
            <p>
              Transaksi yang sudah dikonfirmasi dari detail pallet akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="master-table-wrap">
            <table className="detail-table">
              <thead>
                <tr>
                  <th>ID Transaksi</th>
                  <th>Waktu</th>
                  <th>Pallet</th>
                  <th>Driver</th>
                  <th>Nopol</th>
                  <th>Item</th>
                  <th>Berat</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(transaction => {
                  const weight = transaction.items.reduce(
                    (sum, item) => sum + Number(item.weightKg || 0),
                    0
                  )

                  return (
                    <tr key={transaction.id}>
                      <td><strong>{transaction.id}</strong></td>
                      <td>{formatDate(transaction.confirmedAt)}</td>
                      <td>{transaction.palletId}</td>
                      <td>{transaction.driverName}</td>
                      <td>{transaction.nopol}</td>
                      <td>{transaction.items.length} SKU</td>
                      <td>{formatNumber(weight)} kg</td>
                      <td>
                        <button
                          className="secondary small-button"
                          onClick={() => setSelected(transaction)}
                        >
                          Lihat Rekap
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="modal-backdrop">
          <div className="modal transaction-history-modal">
            <div className="modal-head">
              <div>
                <span className="eyebrow">{selected.id}</span>
                <h3>{isInbound ? 'Rekap Inbound' : 'Rekap Outbound'}</h3>
              </div>
              <button className="icon-button" onClick={() => setSelected(null)}>×</button>
            </div>

            <div className="recap-driver-grid">
              <div><span>PALLET</span><strong>{selected.palletId}</strong></div>
              <div><span>DRIVER</span><strong>{selected.driverName}</strong></div>
              <div><span>NOPOL</span><strong>{selected.nopol}</strong></div>
            </div>

            <div className="recap-table-wrap">
              <table className="detail-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Barang</th>
                    <th>Kemasan</th>
                    <th>Karton</th>
                    <th>Karung</th>
                    <th>Berat</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.items.map((item, index) => (
                    <tr key={`${selected.id}-${item.itemId || index}`}>
                      <td><strong>{item.sku}</strong></td>
                      <td>{item.itemName}</td>
                      <td>{formatNumber(item.packageQty)}</td>
                      <td>{formatNumber(item.cartonQty)}</td>
                      <td>{formatNumber(item.sackQty)}</td>
                      <td>{formatNumber(item.weightKg)} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-info">
              Dikonfirmasi pada {formatDate(selected.confirmedAt)}. Status transaksi: <strong>CONFIRMED</strong>.
            </div>

            <div className="modal-actions">
              <button className="primary" onClick={() => setSelected(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
