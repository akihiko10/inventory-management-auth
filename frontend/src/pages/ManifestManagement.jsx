import { useEffect, useMemo, useState } from 'react'
import { exportManifestCsv, generateManifest, getManifests, reconcileManifest } from '../services/api'

const TABS = [
  ['grouping', '1. Grouping Armada'],
  ['reconciliation', '2. Rekonsiliasi'],
  ['summary', '3. Master Summary & Weight'],
  ['packaging', '4. Breakdown Kemasan'],
  ['print', '5. Cetak & Export']
]
function n(v) { return Number(v || 0) }
function f(v) { return n(v).toLocaleString('id-ID', { maximumFractionDigits: 2 }) }

export default function ManifestManagement() {
  const [tab, setTab] = useState('grouping')
  const [manifests, setManifests] = useState([])
  const [sort, setSort] = useState('weight')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  async function load() { try { const { data } = await getManifests(); setManifests(data || []) } catch (err) { setError(err?.response?.data?.message || 'Gagal mengambil manifest') } }
  useEffect(() => { load() }, [])
  async function grouping() { try { const { data } = await generateManifest({}); setNotice(data.message); await load() } catch (err) { setError(err?.response?.data?.message || 'Gagal grouping manifest') } }
  async function exportCsv() {
    try {
      const { data } = await exportManifestCsv()
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = 'manifest-export.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) { setError(err?.response?.data?.message || 'Gagal export manifest') }
  }
  async function reconcile(id) { try { await reconcileManifest(id, { note: 'Rekonsiliasi deferred selesai' }); setNotice(`Manifest ${id} direkonsiliasi.`); await load() } catch (err) { setError(err?.response?.data?.message || 'Gagal rekonsiliasi') } }

  const sorted = useMemo(() => [...manifests].sort((a, b) => sort === 'weight' ? n(b.totalWeight) - n(a.totalWeight) : String(a.driverName).localeCompare(String(b.driverName))), [manifests, sort])
  const totals = useMemo(() => manifests.reduce((a, x) => ({ weight: a.weight + n(x.totalWeight), cartons: a.cartons + n(x.totalCartons), sacks: a.sacks + n(x.totalSacks), boxes: a.boxes + n(x.totalBoxes), packages: a.packages + n(x.totalPackages) }), { weight: 0, cartons: 0, sacks: 0, boxes: 0, packages: 0 }), [manifests])

  return <section className="page">
    <div className="page-head"><div><span className="eyebrow">MODUL 4 • MANIFESTS</span><h2>Grouping & Rekap Manifest</h2><p className="muted">Grouping armada berdasarkan nopol dan driver, rekonsiliasi, summary berat, breakdown kemasan, dan nota manifest.</p></div><div className="action-row"><button className="secondary" onClick={load}>Refresh</button><button className="primary" onClick={grouping}>Generate Grouping</button></div></div>
    <div className="module-tabs">{TABS.map(([key, label]) => <button key={key} className={tab === key ? 'module-tab active' : 'module-tab'} onClick={() => setTab(key)}>{label}</button>)}</div>
    {notice && <div className="success-banner">{notice}</div>}{error && <div className="transaction-error">{error}</div>}

    {tab === 'grouping' && <div className="layout-card"><div className="section-title-row"><div><span className="eyebrow">ENGINE GROUPING</span><h3>Manifest berdasarkan Nopol & Nama Driver</h3></div></div><div className="manifest-grid">{sorted.map(item => <div className="manifest-card" key={item.id}><div className="manifest-card-head"><strong>{item.id}</strong><span className={item.status === 'reconciled' ? 'status-pill success' : 'status-pill'}>{item.status}</span></div><div className="manifest-driver">{item.driverName}<small>{item.nopol}</small></div><div className="manifest-stats"><div><span>Transaksi</span><strong>{item.transactionsCount}</strong></div><div><span>Berat</span><strong>{f(item.totalWeight)} kg</strong></div><div><span>SKU</span><strong>{item.skuSummary?.length || 0}</strong></div></div></div>)}</div>{!sorted.length && <div className="empty-page"><h3>Belum ada manifest</h3><p>Klik Generate Grouping setelah ada transaksi confirmed.</p></div>}</div>}

    {tab === 'reconciliation' && <div className="layout-card"><div className="section-title-row"><div><span className="eyebrow">DEFERRED RECONCILIATION</span><h3>Rekonsiliasi Lanjutan</h3></div></div><div className="master-table-wrap"><table className="detail-table"><thead><tr><th>Manifest</th><th>Driver</th><th>Nopol</th><th>Transaksi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{sorted.map(item => <tr key={item.id}><td><strong>{item.id}</strong></td><td>{item.driverName}</td><td>{item.nopol}</td><td>{item.transactionsCount}</td><td>{item.status}</td><td>{item.status !== 'reconciled' && <button className="primary small-button" onClick={() => reconcile(item.id)}>Rekonsiliasi</button>}</td></tr>)}</tbody></table></div></div>}

    {tab === 'summary' && <div><div className="pallet-master-grid"><div className="master-stat"><span>Total Manifest</span><strong>{manifests.length}</strong></div><div className="master-stat"><span>Total Berat</span><strong>{f(totals.weight)} kg</strong></div><div className="master-stat"><span>Total Karton</span><strong>{f(totals.cartons)}</strong></div><div className="master-stat"><span>Total Kemasan</span><strong>{f(totals.packages)}</strong></div></div><div className="layout-card"><div className="section-title-row"><div><span className="eyebrow">WEIGHT SORTING</span><h3>Urutan Manifest Berdasarkan Berat</h3></div><select value={sort} onChange={e => setSort(e.target.value)}><option value="weight">Berat terbesar</option><option value="driver">Nama driver</option></select></div><div className="master-table-wrap"><table className="detail-table"><thead><tr><th>Urutan</th><th>Manifest</th><th>Driver</th><th>Nopol</th><th>Berat</th><th>Transaksi</th></tr></thead><tbody>{sorted.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td><strong>{item.id}</strong></td><td>{item.driverName}</td><td>{item.nopol}</td><td>{f(item.totalWeight)} kg</td><td>{item.transactionsCount}</td></tr>)}</tbody></table></div></div></div>}

    {tab === 'packaging' && <div className="layout-card"><div className="section-title-row"><div><span className="eyebrow">PACKAGING BREAKDOWN</span><h3>Karton vs Karung vs Box</h3></div></div><div className="pallet-master-grid"><div className="master-stat"><span>Karton</span><strong>{f(totals.cartons)}</strong></div><div className="master-stat"><span>Karung</span><strong>{f(totals.sacks)}</strong></div><div className="master-stat"><span>Box</span><strong>{f(totals.boxes)}</strong></div><div className="master-stat"><span>Kemasan/Unit</span><strong>{f(totals.packages)}</strong></div></div><div className="master-table-wrap"><table className="detail-table"><thead><tr><th>Manifest</th><th>Driver</th><th>Karton</th><th>Karung</th><th>Box</th><th>Berat</th></tr></thead><tbody>{sorted.map(item => <tr key={item.id}><td>{item.id}</td><td>{item.driverName}</td><td>{f(item.totalCartons)}</td><td>{f(item.totalSacks)}</td><td>{f(item.totalBoxes)}</td><td>{f(item.totalWeight)} kg</td></tr>)}</tbody></table></div></div>}

    {tab === 'print' && <div className="layout-card"><div className="section-title-row"><div><span className="eyebrow">NOTA TRANSAKSI</span><h3>Cetak & Export Manifest</h3></div><button className="primary manifest-export-link" onClick={exportCsv}>Export CSV</button></div><div className="manifest-print-list">{sorted.map(item => <div className="manifest-print-sheet" key={item.id}><div><strong>{item.id}</strong><span>{item.driverName} • {item.nopol}</span></div><div><span>Total berat</span><strong>{f(item.totalWeight)} kg</strong></div><div><span>Transaksi</span><strong>{item.transactionsCount}</strong></div><button className="secondary small-button" onClick={() => window.print()}>Cetak Nota</button></div>)}</div></div>}
  </section>
}
