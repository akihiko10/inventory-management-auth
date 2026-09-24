import axios from 'axios'

const API = axios.create({
  baseURL: 'http://localhost:5000/api'
})

// Auto-inject JWT Token ke setiap request jika ada
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default API
