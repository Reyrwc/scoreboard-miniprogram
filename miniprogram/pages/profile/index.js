const app = getApp()

Page({
  data: { userInfo: null },
  onShow() {
    this.setData({ userInfo: app.globalData.userInfo })
  },
  goHistory() { wx.navigateTo({ url: '/pages/history/index' }) },
  goStats() { wx.navigateTo({ url: '/pages/stats/index' }) },
  goFriends() { wx.navigateTo({ url: '/pages/friends/index' }) },
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定退出登录？',
      success: (res) => {
        if (res.confirm) {
          app.globalData.userInfo = null
          app.globalData.openid = null
          wx.removeStorageSync('openid')
          this.setData({ userInfo: null })
        }
      }
    })
  }
})
