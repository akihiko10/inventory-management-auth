import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createLayout,
  deleteLayout,
  getLayouts,
  getPallets,
  movePallet,
  placePallet,
  updateLayout
} from '../services/api'

const colorPool = ['#4f7cff', '#f2b84b', '#55b978', '#e66a6a', '#7c5cff', '#ef8f45']

export default function PalletLayout() {
  const navigate = useNavigate()

  const [layouts, setLayouts] = useState([])
  const [pallets, setPallets] = useState([])
  const [activeId, setActiveId] = useState('')
  const [dragged, setDragged] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    name: '',
    orientation: 'horizontal',
    fifoDirection: 'right',
    levelCount: 3,
    slotCount: 4
  })

  const active = useMemo(
    () => layouts.find(layout => layout.id === activeId),
    [layouts, activeId]
  )

  const placedPalletIds = useMemo(() => {
    if (!active) return new Set()

    const ids = new Set()
    active.levels.forEach(level => {
      level.slots.forEach(slot => {
        if (slot.palletId) ids.add(slot.palletId)
      })
    })
    return ids
  }, [active])

  const unassignedPallets = useMemo(
    () => pallets.filter(pallet => !placedPalletIds.has(pallet.id)),
    [pallets, placedPalletIds]
  )

  const getPallet = palletId =>
    pallets.find(pallet => pallet.id === palletId)

  async function loadData() {
    try {
      setLoading(true)
      const [layoutsResponse, palletsResponse] = await Promise.all([
        getLayouts(),
        getPallets()
      ])

      const loadedLayouts = layoutsResponse.data || []
      setLayouts(loadedLayouts)
      setPallets(palletsResponse.data || [])
      setActiveId(current =>
        loadedLayouts.some(layout => layout.id === current)
          ? current
          : loadedLayouts[0]?.id || ''
      )
    } catch (error) {
      console.error(error)
      alert(error?.response?.data?.message || 'Gagal mengambil data layout')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleCreate(event) {
    event.preventDefault()
    setSaving(true)

    try {
      const { data } = await createLayout({
        ...form,
        levelCount: Number(form.levelCount),
        slotCount: Number(form.slotCount)
      })

      setLayouts(prev => [...prev, data])
      setActiveId(data.id)
      setShowForm(false)
      setForm({
        name: '',
        orientation: 'horizontal',
        fifoDirection: 'right',
        levelCount: 3,
        slotCount: 4
      })
    } catch (error) {
      console.error(error)
      alert(error?.response?.data?.message || 'Gagal membuat layout')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!active) return

    if (!window.confirm(`Hapus layout ${active.name}?`)) return

    try {
      await deleteLayout(active.id)
      const remaining = layouts.filter(layout => layout.id !== active.id)
      setLayouts(remaining)
      setActiveId(remaining[0]?.id || '')
    } catch (error) {
      console.error(error)
      alert(error?.response?.data?.message || 'Gagal menghapus layout')
    }
  }

  async function changeSetting(key, value) {
    if (!active) return

    try {
      const { data } = await updateLayout(active.id, { [key]: value })
      setLayouts(prev => prev.map(layout => layout.id === data.id ? data : layout))
    } catch (error) {
      console.error(error)
      alert(error?.response?.data?.message || 'Gagal mengubah pengaturan layout')
    }
  }

  function handleDragStart(event, payload) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', payload.palletId)
    setDragged(payload)
  }

  function handleDragEnd() {
    setDragged(null)
  }

  async function handleDrop(event, levelId, position) {
    event.preventDefault()

    if (!dragged || !active) return

    try {
      if (dragged.source === 'unassigned') {
        await placePallet(active.id, {
          palletId: dragged.palletId,
          levelId,
          position,
          color: dragged.color
        })
      } else {
        await movePallet(active.id, {
          fromLevelId: dragged.levelId,
          fromPosition: dragged.position,
          toLevelId: levelId,
          toPosition: position
        })
      }

      await loadData()
    } catch (error) {
      console.error(error)
      alert(error?.response?.data?.message || 'Pallet tidak dapat dipindahkan')
    } finally {
      setDragged(null)
    }
  }

  function openPalletDetail(palletId) {
    if (palletId) navigate(`/layout/${palletId}`)
  }

  if (loading) {
    return (
      <section className="page">
        <div className="loading-box">Memuat pallet layout...</div>
      </section>
    )
  }

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">LAYOUT DESIGNER</span>
          <h2>Pallet Layout</h2>
          <p className="muted">
            Atur denah pallet, level, posisi, orientasi, dan arah FIFO.
          </p>
        </div>

        <div className="action-row">
          <button className="secondary" onClick={handleDelete} disabled={!active}>
            Hapus Layout
          </button>
          <button className="primary" onClick={() => setShowForm(true)}>
            + Buat Layout
          </button>
        </div>
      </div>

      {showForm && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={handleCreate}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">NEW LAYOUT</span>
                <h3>Buat Pallet Layout</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setShowForm(false)}>
                ×
              </button>
            </div>

            <label>
              Nama Layout
              <input
                required
                value={form.name}
                onChange={event => setForm({ ...form, name: event.target.value })}
                placeholder="Warehouse B"
              />
            </label>

            <div className="form-grid">
              <label>
                Orientasi
                <select
                  value={form.orientation}
                  onChange={event => setForm({ ...form, orientation: event.target.value })}
                >
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </select>
              </label>

              <label>
                Arah FIFO
                <select
                  value={form.fifoDirection}
                  onChange={event => setForm({ ...form, fifoDirection: event.target.value })}
                >
                  <option value="right">→ Kanan</option>
                  <option value="left">← Kiri</option>
                  <option value="down">↓ Bawah</option>
                  <option value="up">↑ Atas</option>
                </select>
              </label>

              <label>
                Jumlah Level
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.levelCount}
                  onChange={event => setForm({ ...form, levelCount: event.target.value })}
                />
              </label>

              <label>
                Slot / Level
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={form.slotCount}
                  onChange={event => setForm({ ...form, slotCount: event.target.value })}
                />
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setShowForm(false)}>
                Batal
              </button>
              <button className="primary" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Buat Layout'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="layout-toolbar">
        <label>
          Layout
          <select value={activeId} onChange={event => setActiveId(event.target.value)}>
            {layouts.map(layout => (
              <option key={layout.id} value={layout.id}>
                {layout.name}
              </option>
            ))}
          </select>
        </label>

        {active && (
          <>
            <label>
              Orientasi
              <select
                value={active.orientation}
                onChange={event => changeSetting('orientation', event.target.value)}
              >
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
              </select>
            </label>

            <label>
              FIFO
              <select
                value={active.fifoDirection}
                onChange={event => changeSetting('fifoDirection', event.target.value)}
              >
                <option value="right">→ Kanan</option>
                <option value="left">← Kiri</option>
                <option value="down">↓ Bawah</option>
                <option value="up">↑ Atas</option>
              </select>
            </label>

            <span className="toolbar-note">
              Level 1 = paling bawah
            </span>
          </>
        )}
      </div>

      {active ? (
        <div className="layout-workspace">
          <div className="layout-card designer-card">
            <div className="designer-head">
              <div>
                <strong>{active.name}</strong>
                <span>
                  {active.levels.length} level · {active.levels[0]?.slots.length || 0} slot/level
                </span>
              </div>
              <div className="fifo-badge">
                FIFO {({ right: '→', left: '←', down: '↓', up: '↑' })[active.fifoDirection]}
              </div>
            </div>

            <div className={`warehouse-map ${active.orientation}`}>
              {active.levels.map(level => (
                <div className="level-row" key={level.id}>
                  <div className="level-name">
                    <strong>{level.name}</strong>
                    <small>{level.id === 'L1' ? 'Paling bawah' : ''}</small>
                  </div>

                  <div className="slot-row">
                    {level.slots.map(slot => {
                      const pallet = getPallet(slot.palletId)
                      const fallbackColor = colorPool[(slot.position - 1) % colorPool.length]

                      return (
                        <div
                          key={slot.position}
                          className={`pallet-slot ${slot.palletId ? '' : 'empty'} ${
                            dragged?.palletId === slot.palletId && dragged?.position === slot.position
                              ? 'dragging'
                              : ''
                          }`}
                          onDragOver={event => event.preventDefault()}
                          onDrop={event => handleDrop(event, level.id, slot.position)}
                          onClick={() => openPalletDetail(slot.palletId)}
                          draggable={Boolean(slot.palletId)}
                          onDragStart={event =>
                            slot.palletId &&
                            handleDragStart(event, {
                              source: 'layout',
                              palletId: slot.palletId,
                              levelId: level.id,
                              position: slot.position
                            })
                          }
                          onDragEnd={handleDragEnd}
                        >
                          {slot.palletId ? (
                            <>
                              <span
                                className="pallet-color"
                                style={{ background: slot.color || pallet?.color || fallbackColor }}
                              />
                              <strong>{slot.palletId}</strong>
                              <small>{pallet?.name || 'Pallet'}</small>
                              <small>Position {slot.position}</small>
                              <small className="pallet-click-hint">Klik untuk detail</small>
                            </>
                          ) : (
                            <>
                              <span className="empty-icon">+</span>
                              <small>Slot {slot.position}</small>
                              <small>Drop pallet di sini</small>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="designer-tip">
              💡 Drag pallet ke slot lain untuk memindahkan atau menukar posisi. Klik pallet untuk membuka detail.
            </div>
          </div>

          <aside className="unassigned-panel">
            <div className="unassigned-head">
              <div>
                <span className="eyebrow">PALLET READY</span>
                <h3>Belum Ditempatkan</h3>
                <p>{unassignedPallets.length} pallet tersedia</p>
              </div>
              <button className="secondary small-button" onClick={() => navigate('/pallets')}>
                Kelola
              </button>
            </div>

            {unassignedPallets.length === 0 ? (
              <div className="unassigned-empty">
                Semua pallet sudah memiliki posisi pada layout ini.
              </div>
            ) : (
              <div className="unassigned-list">
                {unassignedPallets.map((pallet, index) => (
                  <div
                    key={pallet.id}
                    className="unassigned-pallet"
                    draggable
                    onDragStart={event =>
                      handleDragStart(event, {
                        source: 'unassigned',
                        palletId: pallet.id,
                        color: pallet.color || colorPool[index % colorPool.length]
                      })
                    }
                    onDragEnd={handleDragEnd}
                    onClick={() => openPalletDetail(pallet.id)}
                  >
                    <span
                      className="pallet-color"
                      style={{ background: pallet.color || colorPool[index % colorPool.length] }}
                    />
                    <div>
                      <strong>{pallet.id}</strong>
                      <small>{pallet.name}</small>
                    </div>
                    <span className="drag-label">DRAG</span>
                  </div>
                ))}
              </div>
            )}

            <button className="primary full-button" onClick={() => navigate('/pallets')}>
              + Buat Pallet Baru
            </button>
          </aside>
        </div>
      ) : (
        <div className="panel empty-state">
          <h3>Belum ada layout</h3>
          <p>Buat layout pertama untuk mulai memetakan pallet.</p>
          <button className="primary" onClick={() => setShowForm(true)}>
            + Buat Layout
          </button>
        </div>
      )}
    </section>
  )
}
