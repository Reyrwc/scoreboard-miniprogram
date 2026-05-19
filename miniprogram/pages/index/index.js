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
    // 每次显示页面时重新拉取最新用户数据
    if (auth.checkLogin()) {
      this._loadUserInfo()
    }
  },

  async _tryAutoLogin() {
    if (auth.checkLogin()) {
      const loaded = await this._loadUserInfo()
      if (loaded) return
      this._clearLoginState()
    }
    try {
      await auth.login()
      await this._loadUserInfo()
    } catch (err) {
      console.error('自动登录失败:', err)
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
        return true
      }
    } catch (err) {
      console.error('获取用户信息失败:', err)
    }
    return false
  },

  _clearLoginState() {
    app.globalData.openid = null
    wx.removeStorageSync('openid')
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
