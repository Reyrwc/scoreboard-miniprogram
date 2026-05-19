const auth = require('../../utils/auth')
const api = require('../../utils/api')
const icons = require('../../utils/icons')
const app = getApp()

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    icons: {
      circlePlusWhite: icons.circlePlusWhite,
      qrScan: icons.qrScan
    }
  },

  onLoad() {
    this._tryAutoLogin()
  },

  onShow() {
    if (app.globalData.userInfo) {
      const user = app.globalData.userInfo
      user.winRate = user.totalGames > 0 ? (user.totalWins / user.totalGames * 100).toFixed(1) : '0.0'
      user.netScore = (user.totalWinScore || 0) - (user.totalLoseScore || 0)
      this.setData({ userInfo: user, isLoggedIn: true })
    }
  },

  async _tryAutoLogin() {
    if (auth.checkLogin()) {
      this._loadUserInfo()
    } else {
      try {
        const res = await auth.login()
        if (res.user) {
          this._loadUserInfo()
        }
      } catch (err) {
        console.error('静默登录失败:', err)
      }
    }
  },

  async _loadUserInfo() {
    try {
      const res = await api.getUserInfo()
      if (res.user) {
        const user = res.user
        user.winRate = user.totalGames > 0 ? (user.totalWins / user.totalGames * 100).toFixed(1) : '0.0'
        user.netScore = (user.totalWinScore || 0) - (user.totalLoseScore || 0)
        app.globalData.userInfo = user
        this.setData({ userInfo: user, isLoggedIn: true })
      }
    } catch (err) {
      console.error('获取用户信息失败:', err)
    }
  },

  onCreateRoom() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      wx.switchTab({ url: '/pages/profile/index' })
      return
    }
    wx.navigateTo({ url: '/pages/room/index?create=true' })
  },

  onScanCode() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      wx.switchTab({ url: '/pages/profile/index' })
      return
    }
    wx.scanCode({
      success: (res) => {
        const roomId = res.result
        wx.navigateTo({ url: `/pages/room/index?roomId=${roomId}` })
      }
    })
  }
})
