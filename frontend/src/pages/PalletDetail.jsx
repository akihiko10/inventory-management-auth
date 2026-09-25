import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TransactionModal from '../components/TransactionModal'

import {
  addPalletItem,
  deletePalletItem,
  getPallet,
  updatePalletItem
} from '../services/api'

const initialForm = {
  sku: '',
  itemName: '',
  itemType: '',
  packaging: '',
  packageQty: 0,
  cartonQty: 0,
  sackQty: 0,
  boxQty: 0,
  weightKg: 0,
  customFieldsText: '{}',
  barcode: ''
}

export default function PalletDetail() {
  const navigate = useNavigate()
  const { palletId } = useParams()

  const [pallet, setPallet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [transactionType, setTransactionType] = useState(null)
  const [transactionNotice, setTransactionNotice] = useState('')

  async function loadPallet() {
    try {
      setLoading(true)
      setError('')
      const { data } = await getPallet(palletId)
      setPallet(data)
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.message || 'Pallet tidak ditemukan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPallet()
  }, [palletId])

  function openAdd() {
    setEditingItem(null)
    setForm({ ...initialForm })
    setShowModal(true)
  }

  function openEdit(item) {
    setEditingItem(item)
    setForm({
      sku: item.sku || '',
      itemName: item.itemName || '',
      itemType: item.itemType || '',
      packaging: item.packaging || '',
      packageQty: item.packageQty || 0,
      cartonQty: item.cartonQty || 0,
      sackQty: item.sackQty || 0,
      boxQty: item.boxQty || 0,
      weightKg: item.weightKg || 0,
      customFieldsText: JSON.stringify(item.customFields || {}, null, 2),
      barcode: item.barcode || ''
    })
    setShowModal(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)

    try {
      const payload = {
        ...form,
        packageQty: Number(form.packageQty),
        cartonQty: Number(form.cartonQty),
        sackQty: Number(form.sackQty),
        boxQty: Number(form.boxQty),
        weightKg: Number(form.weightKg),
        customFields: (() => { try { return JSON.parse(form.customFieldsText || '{}') } catch { return {} } })()
      }

      if (editingItem) {
        await updatePalletItem(palletId, editingItem.id, payload)
      } else {
        await addPalletItem(palletId, payload)
      }

      setShowModal(false)
      await loadPallet()
    } catch (err) {
      console.error(err)
      alert(err?.response?.data?.message || 'Gagal menyimpan item')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Hapus ${item.itemName}?`)) return

    try {
      await deletePalletItem(palletId, item.id)
      await loadPallet()
    } catch (err) {
      console.error(err)
      alert(err?.response?.data?.message || 'Gagal menghapus item')
    }
  }

  if (loading) {
    return (
      <section className="page">
        <div className="loading-box">Memuat detail pallet...</div>
      </section>
    )
  }

  if (error || !pallet) {
    return (
      <section className="page">
        <div className="empty-page">
          <div className="empty-page-icon">!</div>
          <h3>Pallet tidak dapat dibuka</h3>
          <p>{error || 'Data pallet tidak tersedia.'}</p>
          <button className="primary" onClick={() => navigate('/layout')}>
            ← Kembali ke Layout
          </button>
        </div>
      </section>
    )
  }

  const summary = pallet.summary || {}

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">PALLET DETAIL</span>
          <h2>{pallet.name}</h2>
          <p className="muted">
            Detail inventory yang tersimpan pada pallet {pallet.id}.
          </p>
        </div>

        <div className="transaction-page-actions">
          <button
            className="secondary inbound-button"
            onClick={() => {
              setTransactionNotice('')
              setTransactionType('inbound')
            }}
          >
            ↓ Inbound
          </button>
          <button
            className="secondary outbound-button"
            onClick={() => {
              setTransactionNotice('')
              setTransactionType('outbound')
            }}
          >
            ↑ Outbound
          </button>
          <button className="secondary" onClick={() => navigate('/layout')}>
            ← Kembali ke Layout
          </button>
        </div>
      </div>

      {transactionNotice && (
        <div className="transaction-notice">
          <span className="transaction-notice-icon">✓</span>
          <div>
            <strong>{transactionNotice}</strong>
            <span>Data inventory pallet sudah diperbarui.</span>
          </div>
        </div>
      )}

      <div className="layout-info-grid detail-summary-grid">
        <div className="info-card">
          <span>PALLET ID</span>
          <strong>{pallet.id}</strong>
        </div>
        <div className="info-card">
          <span>STATUS</span>
          <strong className={`detail-status ${pallet.status}`}>
            {pallet.status}
          </strong>
        </div>
        <div className="info-card">
          <span>TOTAL BERAT</span>
          <strong>{summary.totalWeight || 0} kg</strong>
        </div>
        <div className="info-card">
          <span>TOTAL KARTON</span>
          <strong>{summary.totalCartons || 0}</strong>
        </div>
        <div className="info-card">
          <span>TOTAL SKU</span>
          <strong>{summary.totalSku || 0}</strong>
        </div>
      </div>

      <div className="layout-card detail-card">
        <div className="detail-card-head">
          <div>
            <span className="eyebrow">INVENTORY</span>
            <h3>Isi Pallet</h3>
            <p className="muted">
              Barang dan SKU yang berada di dalam pallet.
            </p>
          </div>
          <button className="primary" onClick={openAdd}>
            + Tambah Item
          </button>
        </div>

        {pallet.items?.length ? (
          <div className="detail-table-wrap">
            <table className="detail-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Barang</th>
                  <th>Jenis</th>
                  <th>Barcode</th>
                  <th>Kemasan</th>
                  <th>Karton</th>
                  <th>Karung</th>
                  <th>Jumlah</th>
                  <th>Berat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pallet.items.map(item => (
                  <tr key={item.id}>
                    <td><strong>{item.sku}</strong></td>
                    <td>{item.itemName}</td>
                    <td>{item.itemType || '-'}</td>
                    <td>{item.barcode || '-'}</td>
                    <td>{item.packaging || '-'}</td>
                    <td>{item.cartonQty}</td>
                    <td>{item.sackQty}</td>
                    <td>{item.packageQty}</td>
                    <td>{item.weightKg} kg</td>
                    <td>
                      <div className="detail-actions">
                        <button className="secondary small-button" onClick={() => openEdit(item)}>
                          Edit
                        </button>
                        <button className="danger-outline small-button" onClick={() => handleDelete(item)}>
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-page detail-empty">
            <div className="empty-page-icon">+</div>
            <h3>Pallet masih kosong</h3>
            <p>Tambahkan item untuk mengisi pallet ini.</p>
            <button className="primary" onClick={openAdd}>+ Tambah Item</button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={handleSubmit}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">PALLET {pallet.id}</span>
                <h3>{editingItem ? 'Edit Item' : 'Tambah Item'}</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <label>
              SKU
              <input required value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
            </label>

            <label>
              Jenis Barang
              <input value={form.itemType} onChange={e => setForm({ ...form, itemType: e.target.value })} placeholder="Frozen Food / Daging / Sayur" />
            </label>

            <label>
              Nama Barang
              <input required value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })} />
            </label>

            <div className="form-grid">
              <label>
                Barcode
                <input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} />
              </label>
              <label>
                Kemasan
                <input value={form.packaging} onChange={e => setForm({ ...form, packaging: e.target.value })} placeholder="Box / Bag / Sack" />
              </label>
              <label>
                Jumlah Kemasan
                <input type="number" min="0" value={form.packageQty} onChange={e => setForm({ ...form, packageQty: e.target.value })} />
              </label>
              <label>
                Jumlah Karton
                <input type="number" min="0" value={form.cartonQty} onChange={e => setForm({ ...form, cartonQty: e.target.value })} />
              </label>
              <label>
                Jumlah Karung
                <input type="number" min="0" value={form.sackQty} onChange={e => setForm({ ...form, sackQty: e.target.value })} />
              </label>
              <label>
                Jumlah Box
                <input type="number" min="0" value={form.boxQty} onChange={e => setForm({ ...form, boxQty: e.target.value })} />
              </label>
              <label>
                Berat (kg)
                <input type="number" min="0" step="0.01" value={form.weightKg} onChange={e => setForm({ ...form, weightKg: e.target.value })} />
              </label>
            </div>

            <label>
              Dynamic Fields (JSON)
              <textarea rows="5" value={form.customFieldsText} onChange={e => setForm({ ...form, customFieldsText: e.target.value })} placeholder='{"batch":"B-001","suhu":-18}' />
            </label>

            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setShowModal(false)}>
                Batal
              </button>
              <button className="primary" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Item'}
              </button>
            </div>
          </form>
        </div>
      )}


      {transactionType && (
        <TransactionModal
          type={transactionType}
          pallet={pallet}
          onClose={() => {
            setTransactionType(null)
          }}
          onSuccess={data => {
            setPallet(data.pallet)
            setTransactionNotice(
              data.message ||
              (transactionType === 'inbound'
                ? 'Barang berhasil di-inbound.'
                : 'Barang berhasil di-outbound.')
            )
          }}
        />
      )}
    </section>
  )
}
