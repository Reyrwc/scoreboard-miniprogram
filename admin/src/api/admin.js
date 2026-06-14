import cloudbase from '@cloudbase/js-sdk'

const ENV_ID = import.meta.env.VITE_TCB_ENV_ID || ''

const app = cloudbase.init({
  env: ENV_ID,
  region: 'ap-shanghai' // 微信云开发默认区域
})

let authPromise = null

function ensureAuth() {
  if (!authPromise) {
    const auth = app.auth({ persistence: 'local' })
    authPromise = auth.signInAnonymously()
      .then(() => {
        console.log('[CloudBase] 匿名登录成功')
      })
      .catch(err => {
        console.error('[CloudBase] 匿名登录失败:', err)
        authPromise = null
        throw err
      })
  }
  return authPromise
}

async function callFunction(name, data = {}) {
  await ensureAuth()
  console.log(`[CloudBase] 调用 ${name}...`)
  const res = await app.callFunction({ name, data })
  console.log(`[CloudBase] ${name} 返回:`, res)
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

export const adminLogin = (username, password) => {
  return callFunction('adminLogin', { username, password })
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
