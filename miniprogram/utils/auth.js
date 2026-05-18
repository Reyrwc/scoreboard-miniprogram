/**
 * 用户认证相关工具
 */
const api = require('./api')

/**
 * 用户登录
 * 使用 wx.getUserProfile 获取用户信息后调用云函数 login
 * @returns {Promise<object>} 用户信息
 */
const login = () => {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于记分板用户信息展示',
      success: (res) => {
        const userInfo = res.userInfo
        // 调用云函数完成登录
        api.login().then(loginRes => {
          const openid = loginRes.openid || ''
          const app = getApp()
          app.globalData.userInfo = userInfo
          app.globalData.openid = openid
          // 缓存用户信息
          wx.setStorageSync('userInfo', userInfo)
          resolve({ userInfo, openid })
        }).catch(reject)
      },
      fail: (err) => {
        console.error('getUserProfile 失败:', err)
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
  return !!(app.globalData && app.globalData.userInfo)
}

module.exports = {
  login,
  checkLogin,
}
