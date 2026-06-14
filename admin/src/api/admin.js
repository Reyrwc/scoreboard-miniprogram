import axios from 'axios'

// 两个云函数的 HTTP 触发器地址，在 .env 中配置
const LOGIN_URL = import.meta.env.VITE_ADMIN_LOGIN_URL || ''
const API_URL = import.meta.env.VITE_ADMIN_API_URL || ''

const http = axios.create({ timeout: 15000 })

// 请求拦截：adminAPI 请求自动带上 token
http.interceptors.request.use(config => {
  if (config.url === API_URL) {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.data = { ...config.data, token }
    }
  }
  return config
})

// 响应拦截：统一处理返回格式
http.interceptors.response.use(
  res => {
    const { code, data, message } = res.data
    if (code === 0) return data
    if (code === 401) {
      localStorage.removeItem('admin_token')
      window.location.hash = '#/login'
    }
    return Promise.reject(new Error(message || '请求失败'))
  },
  err => Promise.reject(err)
)

export const adminLogin = (username, password) => {
  return http.post(LOGIN_URL, { username, password })
}

export const getDashboard = () => {
  return http.post(API_URL, { action: 'getDashboard' })
}

export const getUsers = (params) => {
  return http.post(API_URL, { action: 'getUsers', ...params })
}

export const banUser = (openid, banned, reason) => {
  return http.post(API_URL, { action: 'banUser', openid, banned, reason })
}

export const getRooms = (params) => {
  return http.post(API_URL, { action: 'getRooms', ...params })
}

export const getRoomDetail = (roomId) => {
  return http.post(API_URL, { action: 'getRoomDetail', roomId })
}

export const dissolveRoom = (roomId) => {
  return http.post(API_URL, { action: 'dissolveRoom', roomId })
}
