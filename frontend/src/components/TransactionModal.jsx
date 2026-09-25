import { useMemo, useState } from 'react'
import { createTransaction } from '../services/api'

const emptyNewItem = () => ({
  rowId: `NEW-${Date.now()}-${Math.random()}`,
  selected: true,
  itemId: null,
  sku: '',
  itemName: '',
  itemType: '',
  packaging: 'Box',
  packageQty: 0,
  cartonQty: 0,
  sackQty: 0,
  weightKg: 0,
  barcode: ''
})

function number(value) {
  const result = Number(value)
  return Number.isFinite(result) && result >= 0 ? result : 0
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('id-ID', {
    maximumFractionDigits: 2
  })
}

export default function TransactionModal({
  type,
  pallet,
  onClose,
  onSuccess
}) {
  const isInbound = type === 'inbound'

  const [step, setStep] = useState('form')
  const [driverName, setDriverName] = useState('')
  const [nopol, setNopol] = useState('')
  const [rows, setRows] = useState(() => [
    ...(pallet.items || []).map(item => ({
      rowId: item.id,
      selected: false,
      itemId: item.id,
      sku: item.sku,
      itemName: item.itemName,
      itemType: item.itemType || '',
      packaging: item.packaging,
      packageQty: 0,
      cartonQty: 0,
      sackQty: 0,
      weightKg: 0,
      barcode: item.barcode || '',
      maxPackageQty: item.packageQty,
      maxCartonQty: item.cartonQty,
      maxSackQty: item.sackQty,
      maxWeightKg: item.weightKg
    })),
    ...(isInbound ? [emptyNewItem()] : [])
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedRows = useMemo(
    () => rows.filter(row => row.selected),
    [rows]
  )

  const totals = useMemo(() => ({
    packageQty: selectedRows.reduce((sum, row) => sum + number(row.packageQty), 0),
    cartonQty: selectedRows.reduce((sum, row) => sum + number(row.cartonQty), 0),
    sackQty: selectedRows.reduce((sum, row) => sum + number(row.sackQty), 0),
    weightKg: selectedRows.reduce((sum, row) => sum + number(row.weightKg), 0)
  }), [selectedRows])

  function updateRow(rowId, key, value) {
    setRows(prev => prev.map(row =>
      row.rowId === rowId
        ? { ...row, [key]: value }
        : row
    ))
  }

  function addNewItem() {
    setRows(prev => [...prev, emptyNewItem()])
  }

  function removeNewItem(rowId) {
    setRows(prev => prev.filter(row => row.rowId !== rowId))
  }

  function validateForm() {
    if (!driverName.trim()) {
      return 'Nama driver wajib diisi.'
    }

    if (!nopol.trim()) {
      return 'Nomor polisi wajib diisi.'
    }

    if (selectedRows.length === 0) {
      return 'Pilih minimal satu barang.'
    }

    for (const row of selectedRows) {
      if (!row.sku.trim()) {
        return 'SKU wajib diisi.'
      }

      if (!row.itemName.trim()) {
        return `Nama barang ${row.sku} wajib diisi.`
      }

      if (
        number(row.packageQty) === 0 &&
        number(row.cartonQty) === 0 &&
        number(row.sackQty) === 0 &&
        number(row.weightKg) === 0
      ) {
        return `Masukkan jumlah untuk ${row.sku}.`
      }

      if (!isInbound) {
        if (number(row.packageQty) > number(row.maxPackageQty)) {
          return `Jumlah kemasan ${row.sku} melebihi stok.`
        }
        if (number(row.cartonQty) > number(row.maxCartonQty)) {
          return `Jumlah karton ${row.sku} melebihi stok.`
        }
        if (number(row.sackQty) > number(row.maxSackQty)) {
          return `Jumlah karung ${row.sku} melebihi stok.`
        }
        if (number(row.weightKg) > number(row.maxWeightKg)) {
          return `Berat ${row.sku} melebihi stok.`
        }
      }
    }

    return ''
  }

  function openRecap(event) {
    event.preventDefault()

    const validationError = validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setStep('recap')
  }

  async function confirmTransaction() {
    setSaving(true)
    setError('')

    try {
      const payload = {
        type,
        palletId: pallet.id,
        driverName: driverName.trim(),
        nopol: nopol.trim(),
        items: selectedRows.map(row => ({
          selected: true,
          itemId: row.itemId,
          sku: row.sku,
          itemName: row.itemName,
          packaging: row.packaging,
          packageQty: number(row.packageQty),
          cartonQty: number(row.cartonQty),
          sackQty: number(row.sackQty),
          weightKg: number(row.weightKg),
          barcode: row.barcode,
          itemType: row.itemType
        }))
      }

      const { data } = await createTransaction(payload)

      setStep('success')
      onSuccess?.(data)
    } catch (err) {
      console.error(err)
      setError(
        err?.response?.data?.message ||
        'Transaksi gagal dikonfirmasi.'
      )
      setStep('recap')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal transaction-modal">

        <div className="modal-head">
          <div>
            <span className="eyebrow">
              {isInbound ? 'INBOUND' : 'OUTBOUND'} · {pallet.id}
            </span>
            <h3>
              {step === 'success'
                ? 'Transaksi Berhasil'
                : step === 'recap'
                  ? 'Rekap Transaksi'
                  : isInbound
                    ? 'Form Inbound'
                    : 'Form Outbound'}
            </h3>
          </div>

          {step !== 'success' && (
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
            >
              ×
            </button>
          )}
        </div>

        {step === 'form' && (
          <form onSubmit={openRecap}>
            <div className="transaction-driver-grid">
              <label>
                Nama Driver
                <input
                  required
                  value={driverName}
                  onChange={event => setDriverName(event.target.value)}
                  placeholder="Nama driver"
                />
              </label>

              <label>
                Nomor Polisi
                <input
                  required
                  value={nopol}
                  onChange={event => setNopol(event.target.value.toUpperCase())}
                  placeholder="B 1234 XYZ"
                />
              </label>
            </div>

            <div className="transaction-section-head">
              <div>
                <span className="eyebrow">BARANG</span>
                <h4>
                  {isInbound
                    ? 'Barang yang masuk'
                    : 'Barang yang keluar'}
                </h4>
              </div>

              {isInbound && (
                <button
                  type="button"
                  className="secondary small-button"
                  onClick={addNewItem}
                >
                  + Barang Baru
                </button>
              )}
            </div>

            {rows.length === 0 ? (
              <div className="transaction-empty">
                Belum ada barang. Tambahkan barang baru untuk inbound.
              </div>
            ) : (
              <div className="transaction-items">
                {rows.map(row => (
                  <div
                    className={`transaction-item-row ${row.selected ? 'selected' : ''}`}
                    key={row.rowId}
                  >
                    <div className="transaction-check">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={event => updateRow(row.rowId, 'selected', event.target.checked)}
                      />
                    </div>

                    <div className="transaction-item-main">
                      {isInbound && !row.itemId ? (
                        <div className="transaction-new-fields">
                          <input
                            placeholder="SKU"
                            value={row.sku}
                            onChange={event => updateRow(row.rowId, 'sku', event.target.value)}
                          />
                          <input
                            placeholder="Nama barang"
                            value={row.itemName}
                            onChange={event => updateRow(row.rowId, 'itemName', event.target.value)}
                          />
                          <input
                            placeholder="Jenis barang"
                            value={row.itemType}
                            onChange={event => updateRow(row.rowId, 'itemType', event.target.value)}
                          />
                          <input
                            placeholder="Barcode"
                            value={row.barcode}
                            onChange={event => updateRow(row.rowId, 'barcode', event.target.value)}
                          />
                        </div>
                      ) : (
                        <div>
                          <strong>{row.sku}</strong>
                          <span>{row.itemName}</span>
                          <small>{row.barcode || 'Tanpa barcode'}</small>
                        </div>
                      )}
                    </div>

                    <label className="transaction-qty-field">
                      Kemasan
                      <input
                        type="number"
                        min="0"
                        max={isInbound ? undefined : row.maxPackageQty}
                        value={row.packageQty}
                        onChange={event => updateRow(row.rowId, 'packageQty', event.target.value)}
                      />
                    </label>

                    <label className="transaction-qty-field">
                      Karton
                      <input
                        type="number"
                        min="0"
                        max={isInbound ? undefined : row.maxCartonQty}
                        value={row.cartonQty}
                        onChange={event => updateRow(row.rowId, 'cartonQty', event.target.value)}
                      />
                    </label>

                    <label className="transaction-qty-field">
                      Karung
                      <input
                        type="number"
                        min="0"
                        max={isInbound ? undefined : row.maxSackQty}
                        value={row.sackQty}
                        onChange={event => updateRow(row.rowId, 'sackQty', event.target.value)}
                      />
                    </label>

                    <label className="transaction-qty-field">
                      Berat kg
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        max={isInbound ? undefined : row.maxWeightKg}
                        value={row.weightKg}
                        onChange={event => updateRow(row.rowId, 'weightKg', event.target.value)}
                      />
                    </label>

                    {isInbound && !row.itemId && (
                      <button
                        type="button"
                        className="danger-outline small-button"
                        onClick={() => removeNewItem(row.rowId)}
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="transaction-total-bar">
              <span>Total dipilih</span>
              <strong>
                {formatNumber(totals.packageQty)} kemasan ·{' '}
                {formatNumber(totals.cartonQty)} karton ·{' '}
                {formatNumber(totals.sackQty)} karung ·{' '}
                {formatNumber(totals.weightKg)} kg
              </strong>
            </div>

            {error && (
              <div className="transaction-error">
                {error}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={onClose}
              >
                Batal
              </button>
              <button className="primary">
                Lanjut ke Rekap →
              </button>
            </div>
          </form>
        )}

        {step === 'recap' && (
          <div>
            <div className={`transaction-type-banner ${isInbound ? 'inbound' : 'outbound'}`}>
              <strong>
                {isInbound ? 'BARANG MASUK' : 'BARANG KELUAR'}
              </strong>
              <span>
                Transaksi untuk pallet {pallet.id}
              </span>
            </div>

            <div className="recap-driver-grid">
              <div>
                <span>DRIVER</span>
                <strong>{driverName}</strong>
              </div>
              <div>
                <span>NOMOR POLISI</span>
                <strong>{nopol.toUpperCase()}</strong>
              </div>
              <div>
                <span>PALLET</span>
                <strong>{pallet.id}</strong>
              </div>
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
                  {selectedRows.map(row => (
                    <tr key={row.rowId}>
                      <td><strong>{row.sku}</strong></td>
                      <td>{row.itemName}</td>
                      <td>{formatNumber(row.packageQty)}</td>
                      <td>{formatNumber(row.cartonQty)}</td>
                      <td>{formatNumber(row.sackQty)}</td>
                      <td>{formatNumber(row.weightKg)} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="recap-total-grid">
              <div><span>Total Kemasan</span><strong>{formatNumber(totals.packageQty)}</strong></div>
              <div><span>Total Karton</span><strong>{formatNumber(totals.cartonQty)}</strong></div>
              <div><span>Total Karung</span><strong>{formatNumber(totals.sackQty)}</strong></div>
              <div><span>Total Berat</span><strong>{formatNumber(totals.weightKg)} kg</strong></div>
            </div>

            {error && (
              <div className="transaction-error">
                {error}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setStep('form')}
                disabled={saving}
              >
                ← Kembali
              </button>
              <button
                type="button"
                className="primary"
                onClick={confirmTransaction}
                disabled={saving}
              >
                {saving ? 'Memproses...' : '✓ Konfirmasi Transaksi'}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="transaction-success">
            <div className="success-icon">✓</div>

            <h3>
              {isInbound
                ? 'Inbound berhasil'
                : 'Outbound berhasil'}
            </h3>

            <p>
              Transaksi untuk pallet <strong>{pallet.id}</strong> sudah tercatat.
            </p>

            <div className="success-summary">
              <span>{driverName}</span>
              <strong>{nopol.toUpperCase()}</strong>
            </div>

            <button
              type="button"
              className="primary full-button"
              onClick={onClose}
            >
              Selesai
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
