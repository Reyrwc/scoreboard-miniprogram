/**
 * 用户认证相关工具
 */
const api = require('./api')

/**
 * 用户登录（静默获取 openid）
 * wx.login 获取 code，直接调用云函数换取 openid
 * 用户头像和昵称通过 profile 页面的 button 组件设置
 * @returns {Promise<object>} { openid, user }
 */
const login = () => {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          reject(new Error('wx.login 获取 code 失败'))
          return
        }
        api.login({ code: loginRes.code }).then(res => {
          const openid = res.openid || ''
          const app = getApp()
          app.globalData.openid = openid
          wx.setStorageSync('openid', openid)
          resolve({ openid, user: res.user })
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
