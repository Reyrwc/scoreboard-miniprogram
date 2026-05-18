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

    // 尝试获取已登录用户信息
    this._checkLogin()
  },

  /**
   * 检查是否已有登录态
   */
  _checkLogin() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
    }
  },

  globalData: {
    userInfo: null,
    openid: '',
  },
})
