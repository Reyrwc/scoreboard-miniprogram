/**
 * 用户认证相关工具
 */
const api = require('./api')

/**
 * 用户登录
 * 使用 wx.login 获取 code 后调用云函数 login 获取 openid
 * @returns {Promise<object>} { openid }
 */
const login = () => {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          reject(new Error('wx.login 获取 code 失败'))
          return
        }
        // 调用云函数完成登录，传入 code
        api.login({ code: loginRes.code }).then(res => {
          const openid = res.openid || ''
          const app = getApp()
          app.globalData.openid = openid
          // 缓存登录态
          wx.setStorageSync('openid', openid)
          resolve({ openid })
        }).catch(reject)
      },
      fail: (err) => {
        console.error('wx.login 失败:', err)
        reject(err)
      },
    })
  })
}

/**
 * 检查是否已登录
 * @returns {boolean}
 */
const checkLogin = () => {
  const app = getApp()
  if (app.globalData && app.globalData.openid) {
    return true
  }
  // 尝试从缓存恢复
  const cachedOpenid = wx.getStorageSync('openid')
  if (cachedOpenid) {
    app.globalData.openid = cachedOpenid
    return true
  }
  return false
}

module.exports = {
  login,
  checkLogin,
}
