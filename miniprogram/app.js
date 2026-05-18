// app.js
App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }

    wx.cloud.init({
      env: 'scoreboard-prod',
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
