import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPallets, updatePalletValidation, validatePalletBarcode, getPalletPositionHistory } from '../services/api'
import { createPallet } from '../services/api'

function fmt(v) { return Number(v || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 }) }

export default function Pallets() {
  const [pallets, setPallets] = useState([])
  const [tab, setTab] = useState('master')
  const [search, setSearch] = useState('')
  const [barcode, setBarcode] = useState('')
  const [barcodeResult, setBarcodeResult] = useState(null)
  const [scannerMessage, setScannerMessage] = useState('')
  const [selectedPallet, setSelectedPallet] = useState('')
  const [history, setHistory] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ id: '', name: '' })
  const [loading, setLoading] = useState(true)

  async function load() { try { setLoading(true); const { data } = await getPallets(); setPallets(data || []) } catch (err) { alert(err?.response?.data?.message || 'Gagal mengambil data pallet') } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return pallets
    return pallets.filter(p => [p.id, p.name, p.status, p.state, p.validationStatus, ...(p.items || []).map(i => `${i.sku} ${i.itemName} ${i.itemType} ${i.barcode}`)].join(' ').toLowerCase().includes(q))
  }, [pallets, search])

  async function create() {
    try { const { data } = await createPallet(form); setPallets(prev => [data, ...prev]); setShowModal(false); setForm({ id: '', name: '' }) }
    catch (err) { alert(err?.response?.data?.message || 'Gagal membuat pallet') }
  }
  async function setValidation(pallet, status) {
    try { const { data } = await updatePalletValidation(pallet.id, { validationStatus: status }); setPallets(prev => prev.map(x => x.id === pallet.id ? data : x)) }
    catch (err) { alert(err?.response?.data?.message || 'Gagal mengubah validasi') }
  }
  async function startCameraScan() {
    setScannerMessage('')
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
      setScannerMessage('Browser ini belum mendukung pemindaian kamera BarcodeDetector. Gunakan input barcode di samping.')
      return
    }
    try {
      const detector = new window.BarcodeDetector({ formats: ['code_128', 'ean_13', 'ean_8', 'qr_code'] })
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true
      await video.play()
      const scanUntil = Date.now() + 8000
      while (Date.now() < scanUntil) {
        try {
          const codes = await detector.detect(video)
          if (codes[0]?.rawValue) { setBarcode(codes[0].rawValue); stream.getTracks().forEach(track => track.stop()); await scan(codes[0].rawValue); return }
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 250))
      }
      stream.getTracks().forEach(track => track.stop())
      setScannerMessage('Barcode tidak terbaca dalam 8 detik. Coba lagi atau masukkan manual.')
    } catch (err) { setScannerMessage(err?.message || 'Kamera tidak dapat digunakan') }
  }
  async function scan(value = barcode) {
    try { const { data } = await validatePalletBarcode({ barcode: value }); setBarcodeResult(data) }
    catch (err) { setBarcodeResult({ valid: false, message: err?.response?.data?.message || 'Gagal scan' }) }
  }
  async function loadHistory(id) { setSelectedPallet(id); try { const { data } = await getPalletPositionHistory(id); setHistory(data || []) } catch (err) { alert('Gagal mengambil tracking posisi') } }

  const summary = pallets.reduce((a, p) => ({ occupied: a.occupied + (p.state === 'occupied' ? 1 : 0), partial: a.partial + (p.state === 'partial' ? 1 : 0), empty: a.empty + (p.state === 'empty' ? 1 : 0), weight: a.weight + Number(p.summary?.totalWeight || 0), cartons: a.cartons + Number(p.summary?.totalCartons || 0), sacks: a.sacks + Number(p.summary?.totalSacks || 0), boxes: a.boxes + Number(p.summary?.totalBoxes || 0) }), { occupied: 0, partial: 0, empty: 0, weight: 0, cartons: 0, sacks: 0, boxes: 0 })

  return <section className="page">
    <div className="page-head"><div><span className="eyebrow">MODUL 2 • PALLETS</span><h2>Manajemen Palet & Item</h2><p className="muted">Master pallet, status validasi, dynamic item, barcode/SKU, summary fisik, dan tracking posisi.</p></div><button className="primary" onClick={() => setShowModal(true)}>+ Buat Pallet</button></div>
    <div className="module-tabs"><button className={tab === 'master' ? 'module-tab active' : 'module-tab'} onClick={() => setTab('master')}>1. Master Data Palet</button><button className={tab === 'items' ? 'module-tab active' : 'module-tab'} onClick={() => setTab('items')}>2. Manajer Barang Dalam Palet</button><button className={tab === 'barcode' ? 'module-tab active' : 'module-tab'} onClick={() => setTab('barcode')}>3. Barcode & SKU</button><button className={tab === 'summary' ? 'module-tab active' : 'module-tab'} onClick={() => setTab('summary')}>4. Summary Fisik</button><button className={tab === 'history' ? 'module-tab active' : 'module-tab'} onClick={() => setTab('history')}>5. Riwayat Posisi</button></div>

    {tab === 'master' && <>
      <div className="pallet-master-grid"><div className="master-stat"><span>Total Pallet</span><strong>{pallets.length}</strong></div><div className="master-stat"><span>Occupied</span><strong>{summary.occupied}</strong></div><div className="master-stat"><span>Partial</span><strong>{summary.partial}</strong></div><div className="master-stat"><span>Unplaced/Empty</span><strong>{summary.empty}</strong></div></div>
      <div className="layout-card"><div className="section-title-row"><div><span className="eyebrow">MASTER DATA</span><h3>Status Validasi & State</h3></div><input className="module-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari pallet / SKU / barang / barcode..." /></div>{loading ? <div className="loading-box">Memuat...</div> : <div className="master-table-wrap"><table className="detail-table"><thead><tr><th>Pallet</th><th>State</th><th>Validasi</th><th>Item</th><th>Berat</th><th>Lokasi</th><th>Aksi</th></tr></thead><tbody>{filtered.map(p => <tr key={p.id}><td><strong>{p.id}</strong><br/><span className="muted">{p.name}</span></td><td>{p.state}</td><td><select value={p.validationStatus || 'pending'} onChange={e => setValidation(p, e.target.value)}><option value="pending">Pending</option><option value="valid">Valid</option><option value="invalid">Invalid</option></select></td><td>{p.summary?.itemCount || p.items?.length || 0}</td><td>{fmt(p.summary?.totalWeight)} kg</td><td>{p.location?.slotCode || 'Unplaced'}</td><td><Link className="secondary small-button" to={`/layout/${p.id}`}>Kelola Item</Link></td></tr>)}</tbody></table></div>}</div>
    </>}

    {tab === 'items' && <div className="layout-card"><div className="section-title-row"><div><span className="eyebrow">DYNAMIC ITEM MANAGER</span><h3>Pilih Palet untuk Kelola Barang</h3></div></div><div className="master-table-wrap"><table className="detail-table"><thead><tr><th>Pallet</th><th>Jumlah SKU</th><th>Jenis Barang</th><th>Berat</th><th>Aksi</th></tr></thead><tbody>{filtered.map(p => <tr key={p.id}><td><strong>{p.id}</strong><br/><span className="muted">{p.name}</span></td><td>{fmt(p.summary?.totalSku)}</td><td>{[...new Set((p.items || []).map(i => i.itemType).filter(Boolean))].join(', ') || '-'}</td><td>{fmt(p.summary?.totalWeight)} kg</td><td><Link className="primary small-button" to={`/layout/${p.id}`}>Buka Manajer Item</Link></td></tr>)}</tbody></table></div></div>}

    {tab === 'barcode' && <div className="layout-card"><div className="section-title-row"><div><span className="eyebrow">SCANNER</span><h3>Pemindai & Validasi Barcode SKU</h3></div></div><div className="barcode-scanner-box"><input value={barcode} onChange={e => setBarcode(e.target.value)} onKeyDown={e => e.key === 'Enter' && scan()} placeholder="Masukkan barcode lalu Enter" autoFocus/><button className="secondary" onClick={startCameraScan}>Scan Kamera</button><button className="primary" onClick={() => scan()}>Validasi</button></div>{scannerMessage && <div className="muted">{scannerMessage}</div>}{barcodeResult && <div className={barcodeResult.valid ? 'success-banner' : 'transaction-error'}>{barcodeResult.valid ? `Barcode ditemukan pada ${barcodeResult.matches.length} item.` : 'Barcode/SKU tidak ditemukan.'}</div>}{barcodeResult?.matches?.map((m, i) => <div className="barcode-result" key={`${m.palletId}-${m.item.id}-${i}`}><strong>{m.item.sku}</strong><span>{m.item.itemName}</span><span>Pallet: {m.palletId}</span><span>Qty: {fmt(m.item.packageQty)}</span></div>)}</div>}

    {tab === 'summary' && <div><div className="pallet-master-grid"><div className="master-stat"><span>Total Weight</span><strong>{fmt(summary.weight)} kg</strong></div><div className="master-stat"><span>Karton</span><strong>{fmt(summary.cartons)}</strong></div><div className="master-stat"><span>Karung</span><strong>{fmt(summary.sacks)}</strong></div><div className="master-stat"><span>Box</span><strong>{fmt(summary.boxes)}</strong></div></div><div className="layout-card"><div className="section-title-row"><div><span className="eyebrow">PHYSICAL SUMMARY</span><h3>Summary Fisik per Pallet</h3></div></div><div className="master-table-wrap"><table className="detail-table"><thead><tr><th>Pallet</th><th>SKU</th><th>Karton</th><th>Karung</th><th>Box</th><th>Weight</th></tr></thead><tbody>{filtered.map(p => <tr key={p.id}><td>{p.id}</td><td>{fmt(p.summary?.totalSku)}</td><td>{fmt(p.summary?.totalCartons)}</td><td>{fmt(p.summary?.totalSacks)}</td><td>{fmt(p.summary?.totalBoxes)}</td><td>{fmt(p.summary?.totalWeight)} kg</td></tr>)}</tbody></table></div></div></div>}

    {tab === 'history' && <div className="layout-card"><div className="section-title-row"><div><span className="eyebrow">TRACKING</span><h3>Riwayat Posisi Palet</h3></div><select value={selectedPallet} onChange={e => loadHistory(e.target.value)}><option value="">Pilih pallet</option>{pallets.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}</select></div>{selectedPallet && <div className="master-table-wrap"><table className="detail-table"><thead><tr><th>Waktu</th><th>User</th><th>Dari</th><th>Ke</th><th>Sumber</th></tr></thead><tbody>{history.map(row => <tr key={row._id}><td>{new Date(row.movedAt).toLocaleString('id-ID')}</td><td>{row.username || '-'}</td><td>{row.from?.slotCode || 'Unplaced'}</td><td>{row.to?.slotCode || '-'}</td><td>{row.source}</td></tr>)}</tbody></table></div>}</div>}

    {showModal && <div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><span className="eyebrow">MASTER PALLET</span><h3>Buat Pallet</h3></div><button className="icon-button" onClick={() => setShowModal(false)}>×</button></div><div className="form-grid"><label>Kode Pallet<input value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} /></label><label>Nama Pallet<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label></div><div className="modal-actions"><button className="secondary" onClick={() => setShowModal(false)}>Batal</button><button className="primary" onClick={create}>Simpan</button></div></div></div>}
  </section>
}
