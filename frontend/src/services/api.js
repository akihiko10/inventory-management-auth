import axios from 'axios'

export const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('warehouse_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// ======================================================
// AUTH
// ======================================================

export const registerUser = data =>
  api.post('/auth/register', data)

export const loginUser = data =>
  api.post('/auth/login', data)

export const getCurrentUser = () =>
  api.get('/auth/me', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('warehouse_token') || ''}`
    }
  })

export const logoutUser = () =>
  api.post('/auth/logout', {}, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('warehouse_token') || ''}`
    }
  })

// ======================================================
// PALLET MASTER
// ======================================================

export const getPallets = () => api.get('/pallets')
export const getPallet = palletId => api.get(`/pallets/${palletId}`)
export const createPallet = data => api.post('/pallets', data)
export const updatePallet = (palletId, data) => api.put(`/pallets/${palletId}`, data)
export const addPalletItem = (palletId, data) => api.post(`/pallets/${palletId}/items`, data)
export const updatePalletItem = (palletId, itemId, data) => api.put(`/pallets/${palletId}/items/${itemId}`, data)
export const deletePalletItem = (palletId, itemId) => api.delete(`/pallets/${palletId}/items/${itemId}`)
export const clearPalletItems = palletId => api.delete(`/pallets/${palletId}/items`)

// ======================================================
// LAYOUT
// ======================================================

export const getLayouts = () => api.get('/layouts')
export const getLayout = layoutId => api.get(`/layouts/${layoutId}`)
export const createLayout = data => api.post('/layouts', data)
export const updateLayout = (layoutId, data) => api.put(`/layouts/${layoutId}`, data)
export const deleteLayout = layoutId => api.delete(`/layouts/${layoutId}`)

export const placePallet = (layoutId, data) =>
  api.put(`/layouts/${layoutId}/place`, data)

export const movePallet = (layoutId, data) =>
  api.put(`/layouts/${layoutId}/move`, data)

// ======================================================
// TRANSACTIONS
// ======================================================

export const getTransactions = params =>
  api.get('/transactions', { params })

export const getTransaction = transactionId =>
  api.get(`/transactions/${transactionId}`)

export const createTransaction = data =>
  api.post('/transactions', data)

// ======================================================
// MODUL 1 - DENAH GUDANG & DYNAMIC RACKING
// ======================================================

export const getWarehouses = () => api.get('/warehouses')
export const createWarehouse = data => api.post('/warehouses', data)
export const updateWarehouse = (warehouseId, data) =>
  api.put(`/warehouses/${warehouseId}`, data)
export const deleteWarehouse = warehouseId =>
  api.delete(`/warehouses/${warehouseId}`)
export const createColdStorage = (warehouseId, data) =>
  api.post(`/warehouses/${warehouseId}/cold-storages`, data)
export const createWarehouseArea = (warehouseId, data) =>
  api.post(`/warehouses/${warehouseId}/areas`, data)
export const createRack = (warehouseId, coldStorageId, data) =>
  api.post(`/warehouses/${warehouseId}/cold-storages/${coldStorageId}/racks`, data)
export const configureWarehouseRack = (warehouseId, coldStorageId, rackId, data) =>
  api.put(`/warehouses/${warehouseId}/cold-storages/${coldStorageId}/racks/${rackId}/config`, data)
export const getWarehouseMonitoring = params =>
  api.get('/warehouses/monitoring/slots', { params })
export const getFifoReport = () =>
  api.get('/warehouses/monitoring/fifo')
export const moveWarehousePallet = data =>
  api.post('/warehouses/movement', data)
export const getWarehouseMovementHistory = () =>
  api.get('/warehouses/movement/history')

// ======================================================
// MODUL 2 - PALLET VALIDATION, BARCODE & POSITION TRACKING
// ======================================================
export const validatePalletBarcode = data => api.post('/pallets/validate-barcode', data)
export const updatePalletValidation = (palletId, data) => api.put(`/pallets/${palletId}/validation`, data)
export const getPalletPositionHistory = palletId => api.get(`/pallets/${palletId}/position-history`)

// ======================================================
// MODUL 3 - TRANSACTION GATEWAY / DRAFT / LOG
// ======================================================
export const validateTransaction = data => api.post('/transactions/validate', data)
export const createTransactionDraft = data => api.post('/transactions/drafts', data)
export const getTransactionDrafts = () => api.get('/transactions/drafts')
export const verifyTransactionDraft = (id, data) => api.put(`/transactions/drafts/${id}/verify`, data)
export const rejectTransactionDraft = (id, data) => api.put(`/transactions/drafts/${id}/reject`, data)
export const getTransactionLogs = () => api.get('/transactions/logs')

// ======================================================
// MODUL 4 - MANIFESTS
// ======================================================
export const getManifests = () => api.get('/manifests')
export const generateManifest = data => api.post('/manifests/generate', data)
export const reconcileManifest = (id, data) => api.put(`/manifests/${id}/reconcile`, data)

export const exportManifestCsv = () => api.get('/manifests/export/csv', { responseType: 'blob' })
