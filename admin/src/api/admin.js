import cloudbase from '@cloudbase/js-sdk'

const ENV_ID = import.meta.env.VITE_TCB_ENV_ID || ''

const app = cloudbase.init({
  env: ENV_ID,
  region: 'ap-shanghai'
})

let authPromise = null

function ensureAuth() {
  if (!authPromise) {
    const auth = app.auth({ persistence: 'local' })
    authPromise = auth.signInAnonymously().catch(err => {
      authPromise = null
      throw err
    })
  }
  return authPromise
}

async function sha256(str) {
  const data = new TextEncoder().encode(str)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function callFunction(name, data = {}) {
  await ensureAuth()
  const res = await app.callFunction({ name, data })
  const result = res.result
  if (result.code !== undefined && result.code !== 0) {
    if (result.code === 401) {
      localStorage.removeItem('admin_token')
      window.location.hash = '#/login'
    }
    const err = new Error(result.message || '请求失败')
    err.code = result.code
    throw err
  }
  return result.data !== undefined ? result.data : result
}

export const adminLogin = async (username, password) => {
  const hashedPassword = await sha256(password)
  return callFunction('adminLogin', { username, password: hashedPassword })
}

export const getDashboard = () => {
  const token = localStorage.getItem('admin_token')
  return callFunction('adminAPI', { action: 'getDashboard', token })
}

export const getUsers = (params) => {
  const token = localStorage.getItem('admin_token')
  return callFunction('adminAPI', { action: 'getUsers', token, ...params })
}

export const banUser = (openid, banned, reason) => {
  const token = localStorage.getItem('admin_token')
  return callFunction('adminAPI', { action: 'banUser', token, openid, banned, reason })
}

export const getRooms = (params) => {
  const token = localStorage.getItem('admin_token')
  return callFunction('adminAPI', { action: 'getRooms', token, ...params })
}

export const getRoomDetail = (roomId) => {
  const token = localStorage.getItem('admin_token')
  return callFunction('adminAPI', { action: 'getRoomDetail', token, roomId })
}

export const dissolveRoom = (roomId) => {
  const token = localStorage.getItem('admin_token')
  return callFunction('adminAPI', { action: 'dissolveRoom', token, roomId })
}
