import axios from 'axios'

// 云开发 HTTP API 调用地址，部署后替换为实际地址
// 格式：https://{envId}.service.tcloudbase.net/{functionName}
const BASE_URL = import.meta.env.VITE_API_BASE || ''

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 10000
})

http.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  res => {
    const { code, data, message } = res.data
    if (code === 0) return data
    if (code === 401) {
      localStorage.removeItem('admin_token')
      window.location.hash = '#/login'
      return Promise.reject(new Error(message || '未授权'))
    }
    return Promise.reject(new Error(message || '请求失败'))
  },
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.hash = '#/login'
    }
    return Promise.reject(err)
  }
)

export const adminLogin = (username, password) => {
  return http.post('/adminLogin', { username, password })
}

export const getDashboard = () => {
  return http.post('/adminAPI', { action: 'getDashboard' })
}

export const getUsers = (params) => {
  return http.post('/adminAPI', { action: 'getUsers', ...params })
}

export const banUser = (openid, banned, reason) => {
  return http.post('/adminAPI', { action: 'banUser', openid, banned, reason })
}

export const getRooms = (params) => {
  return http.post('/adminAPI', { action: 'getRooms', ...params })
}

export const getRoomDetail = (roomId) => {
  return http.post('/adminAPI', { action: 'getRoomDetail', roomId })
}

export const dissolveRoom = (roomId) => {
  return http.post('/adminAPI', { action: 'dissolveRoom', roomId })
}
