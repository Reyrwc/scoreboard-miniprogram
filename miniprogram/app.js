// app.js
App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }

    wx.cloud.init({
      env: 'cloud1-d2gi8awfvb18a2995',
      traceUser: true,
    })

    // 尝试恢复登录态
    this._checkLogin()
  },

  /**
   * 检查是否已有登录态
   */
  _checkLogin() {
    const openid = wx.getStorageSync('openid')
    if (openid) {
      this.globalData.openid = openid
    }
  },

  globalData: {
    userInfo: null,
    openid: '',
  },
})
