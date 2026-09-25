import { useEffect, useMemo, useState } from 'react'
import {
  createTransaction,
  createTransactionDraft,
  getPallets,
  getTransactionLogs,
  getTransactionDrafts,
  verifyTransactionDraft,
  rejectTransactionDraft,
  validateTransaction
} from '../services/api'

const TABS = [
  ['inbound', '1. Gateway Inbound'],
  ['outbound', '2. Gateway Outbound'],
  ['dispatch', '3. Dispatch Driver & Nopol'],
  ['draft', '4. Transaksi Draf'],
  ['logs', '5. Log & Riwayat']
]

const blank = { type: 'inbound', palletId: '', driverName: '', nopol: '', sku: '', itemName: '', itemType: '', barcode: '', packaging: 'Karton', packageQty: 0, cartonQty: 0, sackQty: 0, boxQty: 0, weightKg: 0, itemId: '' }

function num(v) { return Number(v || 0) }
function fmt(v) { return num(v).toLocaleString('id-ID', { maximumFractionDigits: 2 }) }

export default function TransactionsManagement() {
  const [tab, setTab] = useState('inbound')
  const [pallets, setPallets] = useState([])
  const [drafts, setDrafts] = useState([])
  const [logs, setLogs] = useState([])
  const [form, setForm] = useState(blank)
  const [selectedPallet, setSelectedPallet] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadAll() {
    try {
      const [palletRes, draftRes, logRes] = await Promise.all([getPallets(), getTransactionDrafts(), getTransactionLogs()])
      setPallets(palletRes.data || [])
      setDrafts(draftRes.data || [])
      setLogs(logRes.data || [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Gagal mengambil data transaksi')
    }
  }

  useEffect(() => { loadAll() }, [])

  const outboundItems = selectedPallet?.items || []
  const activeItems = form.type === 'outbound' ? outboundItems : []

  function choosePallet(id) {
    const pallet = pallets.find(item => item.id === id) || null
    setSelectedPallet(pallet)
    setForm(prev => ({ ...prev, palletId: id, itemId: '', sku: '', itemName: '', itemType: '', barcode: '', packageQty: 0, cartonQty: 0, sackQty: 0, boxQty: 0, weightKg: 0 }))
  }

  function chooseOutboundItem(id) {
    const item = outboundItems.find(row => row.id === id)
    if (!item) return
    setForm(prev => ({ ...prev, itemId: item.id, sku: item.sku, itemName: item.itemName, itemType: item.itemType || '', barcode: item.barcode || '', packaging: item.packaging || '-', packageQty: 0, cartonQty: 0, sackQty: 0, boxQty: 0, weightKg: 0 }))
  }

  function reset(type = form.type) {
    setForm({ ...blank, type })
    setSelectedPallet(null)
    setNotice('')
    setError('')
  }

  const payload = useMemo(() => ({
    type: form.type, palletId: form.palletId, driverName: form.driverName, nopol: form.nopol,
    items: [{ selected: true, itemId: form.itemId || null, sku: form.sku, itemName: form.itemName, itemType: form.itemType, barcode: form.barcode, packaging: form.packaging, packageQty: num(form.packageQty), cartonQty: num(form.cartonQty), sackQty: num(form.sackQty), boxQty: num(form.boxQty), weightKg: num(form.weightKg) }]
  }), [form])

  async function submit(mode) {
    setSaving(true); setError(''); setNotice('')
    try {
      const validation = await validateTransaction(payload)
      if (!validation.data?.valid) throw new Error(validation.data?.message || 'Checklist transaksi tidak valid')
      const result = mode === 'draft' ? await createTransactionDraft(payload) : await createTransaction(payload)
      setNotice(result.data?.message || (mode === 'draft' ? 'Transaksi masuk ke pending verification.' : 'Transaksi berhasil dikonfirmasi.'))
      await loadAll()
      reset(form.type)
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Gagal memproses transaksi')
    } finally { setSaving(false) }
  }

  async function verify(id) {
    try { await verifyTransactionDraft(id, { note: 'Diverifikasi dari gateway' }); setNotice('Draft berhasil diverifikasi.'); await loadAll() }
    catch (err) { setError(err?.response?.data?.message || 'Gagal verifikasi draft') }
  }

  async function reject(id) {
    const note = window.prompt('Alasan penolakan:', 'Data checklist belum sesuai')
    if (note === null) return
    try { await rejectTransactionDraft(id, { note }); setNotice('Draft ditolak.'); await loadAll() }
    catch (err) { setError(err?.response?.data?.message || 'Gagal menolak draft') }
  }

  function setField(field, value) { setForm(prev => ({ ...prev, [field]: value })) }

  return (
    <section className="page">
      <div className="page-head">
        <div><span className="eyebrow">MODUL 3 • TRANSACTIONS</span><h2>Transaksi Inbound & Outbound</h2><p className="muted">Gateway validasi, checklist item, dispatch kendaraan, draft verification, dan log aktivitas.</p></div>
      </div>

      <div className="module-tabs">
        {TABS.map(([key, label]) => <button key={key} className={tab === key ? 'module-tab active' : 'module-tab'} onClick={() => setTab(key)}>{label}</button>)}
      </div>

      {notice && <div className="success-banner">{notice}</div>}
      {error && <div className="transaction-error">{error}</div>}

      {(tab === 'inbound' || tab === 'outbound' || tab === 'dispatch') && (
        <div className="operations-grid">
          <div className="layout-card operation-form-card">
            <div className="section-title-row"><div><span className="eyebrow">GATEWAY</span><h3>{form.type === 'inbound' ? 'Validasi Inbound' : 'Validasi Outbound'}</h3></div></div>
            <div className="form-grid">
              <label>Jenis Transaksi<select value={form.type} onChange={e => { setField('type', e.target.value); reset(e.target.value) }}><option value="inbound">Inbound</option><option value="outbound">Outbound</option></select></label>
              <label>Pallet<select value={form.palletId} onChange={e => choosePallet(e.target.value)}><option value="">Pilih pallet</option>{pallets.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}</select></label>
              <label>Nama Driver<input value={form.driverName} onChange={e => setField('driverName', e.target.value)} /></label>
              <label>Nopol Armada<input value={form.nopol} onChange={e => setField('nopol', e.target.value.toUpperCase())} placeholder="B 1234 ABC" /></label>
            </div>
            <div className="gateway-checklist">
              <div className="section-title-row"><div><span className="eyebrow">ITEM CHECKLIST</span><h3>{form.type === 'outbound' ? 'Pilih stok pallet' : 'Data barang masuk'}</h3></div></div>
              {form.type === 'outbound' ? (
                <label>Item<select value={form.itemId} onChange={e => chooseOutboundItem(e.target.value)}><option value="">Pilih item</option>{activeItems.map(item => <option key={item.id} value={item.id}>{item.sku} — {item.itemName}</option>)}</select></label>
              ) : null}
              <div className="form-grid">
                <label>SKU<input value={form.sku} onChange={e => setField('sku', e.target.value)} /></label>
                <label>Nama Barang<input value={form.itemName} onChange={e => setField('itemName', e.target.value)} /></label>
                <label>Jenis Barang<input value={form.itemType} onChange={e => setField('itemType', e.target.value)} /></label>
                <label>Barcode<input value={form.barcode} onChange={e => setField('barcode', e.target.value)} /></label>
                <label>Kemasan<input value={form.packaging} onChange={e => setField('packaging', e.target.value)} /></label>
                <label>Kemasan/Unit<input type="number" min="0" value={form.packageQty} onChange={e => setField('packageQty', e.target.value)} /></label>
                <label>Karton<input type="number" min="0" value={form.cartonQty} onChange={e => setField('cartonQty', e.target.value)} /></label>
                <label>Karung<input type="number" min="0" value={form.sackQty} onChange={e => setField('sackQty', e.target.value)} /></label>
                <label>Box<input type="number" min="0" value={form.boxQty} onChange={e => setField('boxQty', e.target.value)} /></label>
                <label>Weight (kg)<input type="number" min="0" step="0.01" value={form.weightKg} onChange={e => setField('weightKg', e.target.value)} /></label>
              </div>
            </div>
            <div className="transaction-total-bar"><span>Summary fisik transaksi</span><strong>{fmt(form.packageQty)} kemasan · {fmt(form.cartonQty)} karton · {fmt(form.sackQty)} karung · {fmt(form.boxQty)} box · {fmt(form.weightKg)} kg</strong></div>
            <div className="modal-actions"><button className="secondary" onClick={() => reset(form.type)}>Reset</button><button className="secondary" disabled={saving} onClick={() => submit('draft')}>Simpan Draft</button><button className="primary" disabled={saving} onClick={() => submit('confirmed')}>{saving ? 'Memproses...' : 'Konfirmasi Transaksi'}</button></div>
          </div>

          <div className="layout-card operation-side-card">
            <span className="eyebrow">DISPATCH</span><h3>Validasi Kendaraan</h3>
            <div className="dispatch-card"><span>DRIVER</span><strong>{form.driverName || '—'}</strong></div>
            <div className="dispatch-card"><span>NOPOL</span><strong>{form.nopol || '—'}</strong></div>
            <div className="dispatch-card"><span>PALLET</span><strong>{form.palletId || '—'}</strong></div>
            <p className="muted">Transaksi dapat disimpan sebagai draft terlebih dahulu untuk pending verification. Inventory hanya berubah setelah transaksi dikonfirmasi atau draft diverifikasi.</p>
          </div>
        </div>
      )}

      {tab === 'draft' && <div className="layout-card"><div className="section-title-row"><div><span className="eyebrow">PENDING VERIFICATION</span><h3>Transaksi Draf</h3></div><button className="secondary" onClick={loadAll}>Refresh</button></div>{drafts.length === 0 ? <div className="empty-page"><h3>Tidak ada draft</h3><p>Transaksi pending verification akan tampil di sini.</p></div> : <div className="master-table-wrap"><table className="detail-table"><thead><tr><th>ID</th><th>Jenis</th><th>Pallet</th><th>Driver</th><th>Nopol</th><th>Item</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{drafts.map(row => <tr key={row.id}><td><strong>{row.id}</strong></td><td>{row.type}</td><td>{row.palletId}</td><td>{row.driverName}</td><td>{row.nopol}</td><td>{row.items?.length || 0}</td><td><span className="capacity-badge">{row.status}</span></td><td><button className="primary small-button" onClick={() => verify(row.id)}>Verifikasi</button> <button className="danger-outline small-button" onClick={() => reject(row.id)}>Tolak</button></td></tr>)}</tbody></table></div>}</div>}

      {tab === 'logs' && <div className="layout-card"><div className="section-title-row"><div><span className="eyebrow">AUDIT</span><h3>Log & Riwayat Aktivitas Transaksi</h3></div><button className="secondary" onClick={loadAll}>Refresh</button></div><div className="master-table-wrap"><table className="detail-table"><thead><tr><th>Waktu</th><th>Transaksi</th><th>Aksi</th><th>User</th><th>Status</th><th>Pesan</th></tr></thead><tbody>{logs.map(row => <tr key={row._id}><td>{new Date(row.createdAt).toLocaleString('id-ID')}</td><td>{row.transactionId}</td><td>{row.action}</td><td>{row.username || '-'}</td><td>{row.status}</td><td>{row.message}</td></tr>)}</tbody></table></div></div>}
    </section>
  )
}
