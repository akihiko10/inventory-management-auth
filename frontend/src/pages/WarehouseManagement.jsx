import { useEffect, useMemo, useState } from 'react'
import {
  configureWarehouseRack,
  createColdStorage,
  createRack,
  createWarehouse,
  createWarehouseArea,
  deleteWarehouse,
  getFifoReport,
  getPallets,
  getWarehouseMonitoring,
  getWarehouseMovementHistory,
  getWarehouses,
  moveWarehousePallet
} from '../services/api'

const TABS = [
  ['master', '1. Master Denah Gudang'],
  ['rack', '2. Level & Slot Rak'],
  ['monitor', '3. Peta Slotting & Kapasitas'],
  ['movement', '4. Drag & Drop Movement'],
  ['fifo', '5. Distribusi Slot & FIFO']
]

const statusLabel = {
  empty: 'Empty',
  occupied: 'Occupied',
  inactive: 'Inactive',
  moving: 'Moving'
}

function errorMessage(error, fallback) {
  return error?.response?.data?.message || fallback
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID')
}

export default function WarehouseManagement() {
  const [tab, setTab] = useState('master')
  const [warehouses, setWarehouses] = useState([])
  const [pallets, setPallets] = useState([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [selectedColdStorageId, setSelectedColdStorageId] = useState('')
  const [selectedRackId, setSelectedRackId] = useState('')
  const [loading, setLoading] = useState(true)

  const [warehouseForm, setWarehouseForm] = useState({ code: '', name: '', coldStorageCount: 2 })
  const [coldStorageForm, setColdStorageForm] = useState({ code: '', name: '' })
  const [areaForm, setAreaForm] = useState({ code: '', name: '', type: 'aisle' })
  const [rackForm, setRackForm] = useState({ code: '', name: '', slotCount: 4 })
  const [saving, setSaving] = useState(false)

  const [monitoring, setMonitoring] = useState({ summary: {}, slots: [] })
  const [search, setSearch] = useState('')
  const [monitorLoading, setMonitorLoading] = useState(false)
  const [draggedPallet, setDraggedPallet] = useState(null)

  const [fifo, setFifo] = useState({ priority: [], warnings: [], rackDistribution: [], unplaced: [] })
  const [history, setHistory] = useState([])
  const [manualMovement, setManualMovement] = useState({ palletId: '', warehouseId: '', coldStorageId: '', rackId: '', levelCode: 'L1', slotCode: '' })

  const selectedWarehouse = useMemo(
    () => warehouses.find(item => String(item._id) === String(selectedWarehouseId)) || null,
    [warehouses, selectedWarehouseId]
  )

  const selectedColdStorage = useMemo(
    () => selectedWarehouse?.coldStorages?.find(item => String(item._id) === String(selectedColdStorageId)) || null,
    [selectedWarehouse, selectedColdStorageId]
  )

  const selectedRack = useMemo(
    () => selectedColdStorage?.racks?.find(item => String(item._id) === String(selectedRackId)) || null,
    [selectedColdStorage, selectedRackId]
  )

  const selectedLevel = useMemo(
    () => selectedRack?.levels?.find(item => item.code === manualMovement.levelCode) || null,
    [selectedRack, manualMovement.levelCode]
  )

  async function loadWarehouses() {
    try {
      const [warehouseResponse, palletResponse] = await Promise.all([getWarehouses(), getPallets()])
      const data = warehouseResponse.data || []
      setWarehouses(data)
      setPallets(palletResponse.data || [])
      setSelectedWarehouseId(current => data.some(item => String(item._id) === String(current)) ? current : String(data[0]?._id || ''))
      setSelectedColdStorageId(current => current || String(data[0]?.coldStorages?.[0]?._id || ''))
      setSelectedRackId(current => current || String(data[0]?.coldStorages?.[0]?.racks?.[0]?._id || ''))
      setManualMovement(current => current.warehouseId ? current : {
        ...current,
        warehouseId: String(data[0]?._id || ''),
        coldStorageId: String(data[0]?.coldStorages?.[0]?._id || ''),
        rackId: String(data[0]?.coldStorages?.[0]?.racks?.[0]?._id || '')
      })
    } catch (error) {
      alert(errorMessage(error, 'Gagal mengambil data denah gudang'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWarehouses()
  }, [])

  useEffect(() => {
    if (!selectedWarehouse) return
    const coldStorage = selectedWarehouse.coldStorages?.find(item => String(item._id) === String(selectedColdStorageId))
    if (!coldStorage) {
      setSelectedColdStorageId(String(selectedWarehouse.coldStorages?.[0]?._id || ''))
      setSelectedRackId(String(selectedWarehouse.coldStorages?.[0]?.racks?.[0]?._id || ''))
    }
  }, [selectedWarehouse, selectedColdStorageId])

  useEffect(() => {
    if (!selectedColdStorage) return
    const rack = selectedColdStorage.racks?.find(item => String(item._id) === String(selectedRackId))
    if (!rack) setSelectedRackId(String(selectedColdStorage.racks?.[0]?._id || ''))
  }, [selectedColdStorage, selectedRackId])

  async function handleCreateWarehouse(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await createWarehouse({ ...warehouseForm, coldStorageCount: Number(warehouseForm.coldStorageCount) })
      setWarehouseForm({ code: '', name: '', coldStorageCount: 2 })
      await loadWarehouses()
      alert('Gudang berhasil dibuat')
    } catch (error) {
      alert(errorMessage(error, 'Gagal membuat gudang'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteWarehouse() {
    if (!selectedWarehouse) return
    if (!window.confirm(`Hapus gudang ${selectedWarehouse.code} - ${selectedWarehouse.name}?`)) return
    try {
      await deleteWarehouse(selectedWarehouse._id)
      setSelectedWarehouseId('')
      setSelectedColdStorageId('')
      setSelectedRackId('')
      await loadWarehouses()
      alert('Gudang berhasil dihapus')
    } catch (error) {
      alert(errorMessage(error, 'Gagal menghapus gudang'))
    }
  }

  async function handleCreateColdStorage(event) {
    event.preventDefault()
    if (!selectedWarehouse) return alert('Pilih gudang terlebih dahulu')
    setSaving(true)
    try {
      await createColdStorage(selectedWarehouse._id, coldStorageForm)
      setColdStorageForm({ code: '', name: '' })
      await loadWarehouses()
      alert('Cold storage berhasil ditambahkan')
    } catch (error) {
      alert(errorMessage(error, 'Gagal menambah cold storage'))
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateArea(event) {
    event.preventDefault()
    if (!selectedWarehouse) return alert('Pilih gudang terlebih dahulu')
    setSaving(true)
    try {
      await createWarehouseArea(selectedWarehouse._id, areaForm)
      setAreaForm({ code: '', name: '', type: 'aisle' })
      await loadWarehouses()
      alert('Area berhasil ditambahkan')
    } catch (error) {
      alert(errorMessage(error, 'Gagal menambah area'))
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateRack(event) {
    event.preventDefault()
    if (!selectedWarehouse || !selectedColdStorage) return alert('Pilih gudang dan cold storage terlebih dahulu')
    setSaving(true)
    try {
      await createRack(selectedWarehouse._id, selectedColdStorage._id, {
        ...rackForm,
        slotCount: Number(rackForm.slotCount)
      })
      setRackForm({ code: '', name: '', slotCount: 4 })
      await loadWarehouses()
      alert('Rak berhasil dibuat dengan 4 level')
    } catch (error) {
      alert(errorMessage(error, 'Gagal membuat rak'))
    } finally {
      setSaving(false)
    }
  }

  async function refreshMonitoring() {
    setMonitorLoading(true)
    try {
      const { data } = await getWarehouseMonitoring(search ? { q: search } : {})
      setMonitoring(data)
    } catch (error) {
      alert(errorMessage(error, 'Gagal mengambil monitoring slot'))
    } finally {
      setMonitorLoading(false)
    }
  }

  async function refreshFifo() {
    try {
      const { data } = await getFifoReport()
      setFifo(data)
    } catch (error) {
      alert(errorMessage(error, 'Gagal mengambil laporan FIFO'))
    }
  }

  async function refreshHistory() {
    try {
      const { data } = await getWarehouseMovementHistory()
      setHistory(data || [])
    } catch (error) {
      alert(errorMessage(error, 'Gagal mengambil riwayat movement'))
    }
  }

  useEffect(() => {
    if (tab === 'monitor') refreshMonitoring()
    if (tab === 'fifo') refreshFifo()
    if (tab === 'movement') refreshHistory()
  }, [tab])

  async function movePalletToSlot(palletId, slot) {
    if (!window.confirm(`Pindahkan ${palletId} ke ${slot.warehouseCode}/${slot.coldStorageCode}/${slot.rackCode}/${slot.levelCode}/${slot.slotCode}?`)) return
    try {
      await moveWarehousePallet({
        palletId,
        to: {
          warehouseId: slot.warehouseId,
          coldStorageId: slot.coldStorageId,
          rackId: slot.rackId,
          levelCode: slot.levelCode,
          slotCode: slot.slotCode
        }
      })
      await Promise.all([refreshMonitoring(), loadWarehouses()])
    } catch (error) {
      alert(errorMessage(error, 'Pallet tidak dapat dipindahkan'))
    }
  }

  function handleSlotDrop(event, slot) {
    event.preventDefault()
    const palletId = event.dataTransfer.getData('text/pallet') || draggedPallet
    if (!palletId || slot.slotStatus === 'occupied' || slot.slotStatus === 'inactive') return
    movePalletToSlot(palletId, slot)
    setDraggedPallet(null)
  }

  async function handleManualMovement(event) {
    event.preventDefault()
    const slot = selectedLevelForManual(warehouses, manualMovement)?.slots?.find(item => item.code === manualMovement.slotCode)
    if (!slot) return alert('Pilih slot tujuan')
    const target = {
      warehouseId: manualMovement.warehouseId,
      coldStorageId: manualMovement.coldStorageId,
      rackId: manualMovement.rackId,
      levelCode: manualMovement.levelCode,
      slotCode: manualMovement.slotCode
    }
    if (!window.confirm(`Konfirmasi movement pallet ${manualMovement.palletId} ke ${slot.code}?`)) return
    try {
      await moveWarehousePallet({ palletId: manualMovement.palletId, to: target })
      setManualMovement(prev => ({ ...prev, palletId: '', slotCode: '' }))
      await Promise.all([refreshHistory(), refreshMonitoring(), loadWarehouses()])
      alert('Movement berhasil dicatat')
    } catch (error) {
      alert(errorMessage(error, 'Movement gagal'))
    }
  }

  async function saveRackConfig(event) {
    event.preventDefault()
    if (!selectedWarehouse || !selectedColdStorage || !selectedRack) return
    const form = new FormData(event.currentTarget)
    const slotCount = Number(form.get('slotCount'))
    try {
      await configureWarehouseRack(selectedWarehouse._id, selectedColdStorage._id, selectedRack._id, {
        name: form.get('name'),
        slotCount
      })
      await loadWarehouses()
      alert('Pengaturan rak berhasil disimpan')
    } catch (error) {
      alert(errorMessage(error, 'Gagal menyimpan pengaturan rak'))
    }
  }

  async function updateSlotConfig(slot, changes) {
    if (!selectedWarehouse || !selectedColdStorage || !selectedRack) return
    try {
      await configureWarehouseRack(selectedWarehouse._id, selectedColdStorage._id, selectedRack._id, {
        slotConfigs: [{ code: slot.code, ...changes }]
      })
      await loadWarehouses()
    } catch (error) {
      alert(errorMessage(error, 'Gagal mengubah slot'))
    }
  }

  async function handleSlotConfigSubmit(event, slot) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await updateSlotConfig(slot, {
      maxWeightKg: Number(form.get('maxWeightKg')),
      maxCartons: Number(form.get('maxCartons')),
      maxPackages: Number(form.get('maxPackages')),
      status: form.get('status')
    })
  }

  if (loading) return <section className="page"><div className="loading-box">Memuat modul denah gudang...</div></section>

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">MODUL 1 • LAYOUTS</span>
          <h2>Denah Gudang & Dynamic Racking</h2>
          <p className="muted">Master gudang, cold storage, level, slotting, movement pallet, kapasitas, dan FIFO dalam satu modul.</p>
        </div>
        <div className="warehouse-selector-head">
          <label>
            Gudang aktif
            <select value={selectedWarehouseId} onChange={event => setSelectedWarehouseId(event.target.value)}>
              {warehouses.map(warehouse => <option key={warehouse._id} value={warehouse._id}>{warehouse.code} — {warehouse.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="module-tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={tab === key ? 'module-tab active' : 'module-tab'} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === 'master' && (
        <div className="module-grid-2">
          <div className="panel">
            <div className="section-head"><div><span className="eyebrow">MASTER DENAH</span><h3>Tambah Gudang</h3></div><button type="button" className="danger-outline small-button" onClick={handleDeleteWarehouse} disabled={!selectedWarehouse}>Hapus Gudang Aktif</button></div>
            <form className="form-grid" onSubmit={handleCreateWarehouse}>
              <label>Kode Gudang<input required value={warehouseForm.code} onChange={e => setWarehouseForm({ ...warehouseForm, code: e.target.value })} placeholder="WH-A" /></label>
              <label>Nama Gudang<input required value={warehouseForm.name} onChange={e => setWarehouseForm({ ...warehouseForm, name: e.target.value })} placeholder="Warehouse A" /></label>
              <label>Jumlah Cold Storage<input type="number" min="0" max="50" value={warehouseForm.coldStorageCount} onChange={e => setWarehouseForm({ ...warehouseForm, coldStorageCount: e.target.value })} /></label>
              <div className="form-submit"><button className="primary" disabled={saving}>+ Tambah Gudang</button></div>
            </form>
          </div>

          <div className="panel">
            <div className="section-head"><div><span className="eyebrow">AREA / AISLE</span><h3>Tambah Area Visual</h3></div></div>
            <form className="form-grid" onSubmit={handleCreateArea}>
              <label>Kode Area<input value={areaForm.code} onChange={e => setAreaForm({ ...areaForm, code: e.target.value })} placeholder="A01" /></label>
              <label>Nama Area<input required value={areaForm.name} onChange={e => setAreaForm({ ...areaForm, name: e.target.value })} placeholder="Aisle Utama" /></label>
              <label>Jenis<select value={areaForm.type} onChange={e => setAreaForm({ ...areaForm, type: e.target.value })}><option value="road">Jalan / Road</option><option value="aisle">Aisle</option><option value="storage-area">Storage Area</option></select></label>
              <div className="form-submit"><button className="primary" disabled={!selectedWarehouse || saving}>+ Tambah Area</button></div>
            </form>
          </div>

          <div className="panel panel-wide">
            <div className="section-head"><div><span className="eyebrow">COLD STORAGE</span><h3>Cold Storage Gudang Aktif</h3></div></div>
            <form className="inline-form" onSubmit={handleCreateColdStorage}>
              <input value={coldStorageForm.code} onChange={e => setColdStorageForm({ ...coldStorageForm, code: e.target.value })} placeholder="CS03 (opsional)" />
              <input required value={coldStorageForm.name} onChange={e => setColdStorageForm({ ...coldStorageForm, name: e.target.value })} placeholder="Cold Storage 3" />
              <button className="primary" disabled={!selectedWarehouse || saving}>+ Cold Storage</button>
            </form>
            <div className="warehouse-map-cards">
              {selectedWarehouse?.coldStorages?.map(cs => (
                <div className="warehouse-map-card" key={cs._id}>
                  <strong>{cs.code}</strong><span>{cs.name}</span><small>{cs.racks.length} rak</small>
                </div>
              ))}
            </div>
          </div>

          <div className="panel panel-wide">
            <div className="section-head"><div><span className="eyebrow">VISUAL GRID</span><h3>Denah Gudang</h3></div></div>
            <div className="floor-grid">
              {selectedWarehouse?.areas?.map(area => <div key={area.code} className={`floor-area ${area.type}`}><strong>{area.code}</strong><span>{area.name}</span></div>)}
              {selectedWarehouse?.coldStorages?.map(cs => <div key={cs._id} className="floor-area cold"><strong>{cs.code}</strong><span>{cs.name}</span><small>{cs.racks.length} rack</small></div>)}
              {!selectedWarehouse?.areas?.length && !selectedWarehouse?.coldStorages?.length && <div className="empty-state compact">Belum ada area/cold storage. Tambahkan dari form di atas.</div>}
            </div>
          </div>
        </div>
      )}

      {tab === 'rack' && (
        <div className="module-grid-2">
          <div className="panel">
            <div className="section-head"><div><span className="eyebrow">ADJUSTABLE RACK LEVELS</span><h3>Buat Rak</h3></div></div>
            <div className="selector-row">
              <label>Cold Storage<select value={selectedColdStorageId} onChange={e => setSelectedColdStorageId(e.target.value)}>{selectedWarehouse?.coldStorages?.map(cs => <option key={cs._id} value={cs._id}>{cs.code} — {cs.name}</option>)}</select></label>
            </div>
            <form className="form-grid" onSubmit={handleCreateRack}>
              <label>Kode Rak<input value={rackForm.code} onChange={e => setRackForm({ ...rackForm, code: e.target.value })} placeholder="R01" /></label>
              <label>Nama Rak<input required value={rackForm.name} onChange={e => setRackForm({ ...rackForm, name: e.target.value })} placeholder="Rack 01" /></label>
              <label>Slot per Level<input type="number" min="1" max="100" value={rackForm.slotCount} onChange={e => setRackForm({ ...rackForm, slotCount: e.target.value })} /></label>
              <div className="form-submit"><button className="primary" disabled={!selectedColdStorage || saving}>+ Buat Rak</button></div>
            </form>
            <p className="muted small-note">Setiap rak selalu memiliki <strong>4 level</strong>: Level 1 paling bawah sampai Level 4 paling atas.</p>
          </div>

          <div className="panel">
            <div className="section-head"><div><span className="eyebrow">RAK AKTIF</span><h3>Konfigurasi Rak</h3></div></div>
            <div className="selector-row">
              <label>Rak<select value={selectedRackId} onChange={e => setSelectedRackId(e.target.value)}>{selectedColdStorage?.racks?.map(rack => <option key={rack._id} value={rack._id}>{rack.code} — {rack.name}</option>)}</select></label>
            </div>
            {selectedRack ? (
              <form className="form-grid" onSubmit={saveRackConfig}>
                <label>Nama Rak<input name="name" defaultValue={selectedRack.name} /></label>
                <label>Jumlah Slot / Level<input name="slotCount" type="number" min="1" max="100" defaultValue={selectedRack.slotCount} /></label>
                <div className="form-submit"><button className="primary">Simpan Konfigurasi</button></div>
              </form>
            ) : <div className="empty-state compact">Belum ada rak pada cold storage ini.</div>}
          </div>

          <div className="panel panel-wide">
            <div className="section-head"><div><span className="eyebrow">LEVEL & SLOT</span><h3>Pengaturan Kapasitas</h3></div><span className="capacity-badge">4 Level</span></div>
            {selectedRack ? <div className="rack-levels-admin">
              {selectedRack.levels.map(level => (
                <div className="rack-level-admin" key={level.code}>
                  <div className="rack-level-title"><strong>{level.name}</strong><span>{level.slots.length} slot</span></div>
                  <div className="rack-slot-admin-grid">
                    {level.slots.map(slot => (
                      <div className={`rack-slot-admin ${slot.status}`} key={slot.code}>
                        <strong>{slot.code}</strong>
                        <span>{slot.palletId || 'Kosong'}</span>
                        <form className="slot-config-mini" onSubmit={event => handleSlotConfigSubmit(event, slot)}>
                          <label>Max Kg<input name="maxWeightKg" type="number" min="0" defaultValue={slot.maxWeightKg} /></label>
                          <label>Carton<input name="maxCartons" type="number" min="0" defaultValue={slot.maxCartons} /></label>
                          <label>Package<input name="maxPackages" type="number" min="0" defaultValue={slot.maxPackages} /></label>
                          <label>Status<select name="status" defaultValue={slot.status}><option value="empty">Empty</option><option value="occupied">Occupied</option><option value="inactive">Inactive</option><option value="moving">Moving</option></select></label>
                          <button className="small-button secondary" type="submit">Simpan</button>
                        </form>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div> : <div className="empty-state compact">Pilih rak untuk melihat level dan slot.</div>}
          </div>
        </div>
      )}

      {tab === 'monitor' && (
        <div>
          <div className="summary-cards">
            {[
              ['Total Slot', monitoring.summary.total || 0],
              ['Occupied', monitoring.summary.occupied || 0],
              ['Empty', monitoring.summary.empty || 0],
              ['Inactive', monitoring.summary.inactive || 0],
              ['Moving', monitoring.summary.moving || 0],
              ['Unplaced', monitoring.summary.unplaced || 0]
            ].map(([label, value]) => <div className="summary-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}
          </div>
          <div className="panel">
            <div className="monitor-toolbar"><div><span className="eyebrow">SLOTTING MAP</span><h3>Semua Posisi Slot</h3></div><div className="monitor-search"><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && refreshMonitoring()} placeholder="Cari pallet, SKU, item, gudang, rack, level, slot..." /><button className="secondary" onClick={refreshMonitoring}>{monitorLoading ? 'Memuat...' : 'Cari'}</button></div></div>
            <div className="capacity-line"><span>Pemakaian kapasitas berat</span><strong>{monitoring.summary.usedWeight || 0} / {monitoring.summary.maxWeight || 0} kg ({monitoring.summary.utilization || 0}%)</strong></div>
            <div className="slot-monitor-grid">
              {monitoring.slots?.map(slot => (
                <div key={`${slot.warehouseCode}-${slot.slotCode}`} className={`slot-monitor-card ${slot.slotStatus}`} draggable={Boolean(slot.palletId)} onDragStart={e => { setDraggedPallet(slot.palletId); e.dataTransfer.setData('text/pallet', slot.palletId) }} onDragOver={e => e.preventDefault()} onDrop={e => handleSlotDrop(e, slot)}>
                  <div className="slot-monitor-head"><strong>{slot.slotCode}</strong><span className={`slot-status ${slot.slotStatus}`}>{statusLabel[slot.slotStatus]}</span></div>
                  <small>{slot.warehouseCode} / {slot.coldStorageCode} / {slot.rackCode} / {slot.levelCode}</small>
                  {slot.palletId ? <><strong className="slot-pallet">{slot.palletId}</strong><span>{slot.palletName}</span><small>{slot.capacity.usedWeightKg} kg · {slot.capacity.usedCartons} carton · {slot.capacity.usedPackages} package</small></> : <span className="slot-empty-text">Drop pallet di sini</span>}
                </div>
              ))}
              {!monitoring.slots?.length && <div className="empty-state compact">Belum ada slot. Buat gudang, cold storage, dan rak terlebih dahulu.</div>}
            </div>
          </div>
        </div>
      )}

      {tab === 'movement' && (
        <div className="module-grid-2">
          <div className="panel">
            <div className="section-head"><div><span className="eyebrow">MOVEMENT PALLET</span><h3>Pindahkan Pallet</h3></div></div>
            <form className="form-grid" onSubmit={handleManualMovement}>
              <label>Pallet<select required value={manualMovement.palletId} onChange={e => setManualMovement({ ...manualMovement, palletId: e.target.value })}><option value="">Pilih pallet</option>{pallets.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}</select></label>
              <label>Gudang<select required value={manualMovement.warehouseId} onChange={e => { const value = e.target.value; const warehouse = warehouses.find(w => String(w._id) === value); setManualMovement({ ...manualMovement, warehouseId: value, coldStorageId: String(warehouse?.coldStorages?.[0]?._id || ''), rackId: String(warehouse?.coldStorages?.[0]?.racks?.[0]?._id || ''), levelCode: 'L1', slotCode: '' }) }}>{warehouses.map(w => <option key={w._id} value={w._id}>{w.code} — {w.name}</option>)}</select></label>
              <label>Cold Storage<select required value={manualMovement.coldStorageId} onChange={e => { const value = e.target.value; const cs = selectedWarehouseForManual(warehouses, manualMovement.warehouseId)?.coldStorages?.find(item => String(item._id) === value); setManualMovement({ ...manualMovement, coldStorageId: value, rackId: String(cs?.racks?.[0]?._id || ''), levelCode: 'L1', slotCode: '' }) }}>{(selectedWarehouseForManual(warehouses, manualMovement.warehouseId)?.coldStorages || []).map(cs => <option key={cs._id} value={cs._id}>{cs.code}</option>)}</select></label>
              <label>Rak<select required value={manualMovement.rackId} onChange={e => setManualMovement({ ...manualMovement, rackId: e.target.value, slotCode: '' })}>{(selectedColdStorageForManual(warehouses, manualMovement)?.racks || []).map(r => <option key={r._id} value={r._id}>{r.code}</option>)}</select></label>
              <label>Level<select value={manualMovement.levelCode} onChange={e => setManualMovement({ ...manualMovement, levelCode: e.target.value, slotCode: '' })}>{selectedRackForManual(warehouses, manualMovement)?.levels?.map(level => <option key={level.code} value={level.code}>{level.name}</option>)}</select></label>
              <label>Slot<select required value={manualMovement.slotCode} onChange={e => setManualMovement({ ...manualMovement, slotCode: e.target.value })}><option value="">Pilih slot</option>{(selectedLevelForManual(warehouses, manualMovement)?.slots || []).map(slot => <option key={slot.code} value={slot.code}>{slot.code} — {slot.status}</option>)}</select></label>
              <div className="form-submit"><button className="primary">Konfirmasi Movement</button></div>
            </form>
            <p className="muted small-note">Movement dapat berasal dari pallet belum ditempatkan, aisle, rak, cold storage, maupun gudang lain. Tujuan harus berupa slot aktif dan kosong.</p>
          </div>

          <div className="panel">
            <div className="section-head"><div><span className="eyebrow">AUDIT TRAIL</span><h3>Riwayat Movement</h3></div><button className="secondary small-button" onClick={refreshHistory}>Refresh</button></div>
            <div className="movement-history">
              {history.map(item => <div className="movement-history-item" key={item._id}><strong>{item.palletId}</strong><span>{item.username || '-'} · {formatDate(item.movedAt)}</span><small>{item.from?.warehouseCode || 'Unplaced'} → {item.to?.warehouseCode}/{item.to?.coldStorageCode}/{item.to?.rackCode}/{item.to?.levelCode}/{item.to?.slotCode}</small></div>)}
              {!history.length && <div className="empty-state compact">Belum ada riwayat movement.</div>}
            </div>
          </div>
        </div>
      )}

      {tab === 'fifo' && (
        <div className="module-grid-2">
          <div className="panel panel-wide">
            <div className="section-head"><div><span className="eyebrow">FIFO PRIORITY</span><h3>Urutan Pallet Berdasarkan Penerimaan</h3></div><button className="secondary small-button" onClick={refreshFifo}>Refresh</button></div>
            <p className="muted">Pallet paling lama diprioritaskan untuk dikeluarkan. Posisi fisik dipakai untuk mendeteksi potensi pallet lama tertutup pallet baru.</p>
            <div className="fifo-list">
              {fifo.priority?.map((item, index) => <div className="fifo-row" key={`${item.palletId}-${item.slotCode}`}><strong>#{index + 1}</strong><span><b>{item.palletId}</b><small>{item.warehouseCode}/{item.coldStorageCode}/{item.rackCode}/{item.levelCode}/{item.slotCode}</small></span><time>{formatDate(item.receivedAt)}</time></div>)}
              {!fifo.priority?.length && <div className="empty-state compact">Belum ada pallet yang ditempatkan.</div>}
            </div>
          </div>

          <div className="panel">
            <div className="section-head"><div><span className="eyebrow">FIFO WARNING</span><h3>Peringatan</h3></div></div>
            <div className="warning-list">{fifo.warnings?.map((warning, index) => <div className="warning-item" key={index}>⚠ {warning.message}</div>)}{!fifo.warnings?.length && <div className="success-note">Tidak ada potensi pembalikan FIFO pada posisi yang terdeteksi.</div>}</div>
            <h4>Unplaced Pallet</h4>
            <div className="unplaced-list-simple">{fifo.unplaced?.map(item => <div key={item.palletId}><strong>{item.palletId}</strong><span>{item.palletName}</span></div>)}{!fifo.unplaced?.length && <span className="muted">Tidak ada pallet unplaced.</span>}</div>
          </div>

          <div className="panel panel-wide">
            <div className="section-head"><div><span className="eyebrow">DISTRIBUSI SLOT</span><h3>Slot Terpakai per Rack / Level</h3></div></div>
            <div className="distribution-grid">{fifo.rackDistribution?.map(item => <div className="distribution-card" key={item.location}><strong>{item.palletCount}</strong><span>{item.location}</span></div>)}{!fifo.rackDistribution?.length && <div className="empty-state compact">Belum ada distribusi.</div>}</div>
          </div>
        </div>
      )}
    </section>
  )
}

function selectedWarehouseForManual(warehouses, movement) {
  return warehouses.find(item => String(item._id) === String(movement.warehouseId)) || null
}

function selectedColdStorageForManual(warehouses, movement) {
  const warehouse = selectedWarehouseForManual(warehouses, movement)
  return warehouse?.coldStorages?.find(item => String(item._id) === String(movement.coldStorageId)) || null
}

function selectedRackForManual(warehouses, movement) {
  const coldStorage = selectedColdStorageForManual(warehouses, movement)
  return coldStorage?.racks?.find(item => String(item._id) === String(movement.rackId)) || null
}

function selectedLevelForManual(warehouses, movement) {
  const rack = selectedRackForManual(warehouses, movement)
  return rack?.levels?.find(item => item.code === movement.levelCode) || null
}
