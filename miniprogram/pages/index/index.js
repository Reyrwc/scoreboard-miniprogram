const auth = require('../../utils/auth')
const api = require('../../utils/api')
const icons = require('../../utils/icons')
const { formatShortTime } = require('../../utils/util')
const app = getApp()

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    activeRoom: null,
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
    // 房间页解散后 navigateBack 回来时，云函数可能还未完成写入，延迟重查
    if (app.globalData._roomDissolved) {
      app.globalData._roomDissolved = false
      setTimeout(() => { if (auth.checkLogin()) this._loadUserInfo() }, 1500)
    }
  },

  onPullDownRefresh() {
    this._loadUserInfo().finally(() => wx.stopPullDownRefresh())
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
        const activeRoom = res.activeRoom ? {
          ...res.activeRoom,
          startTime: formatShortTime(res.activeRoom.createdAt)
        } : null
        this.setData({
          userInfo: user,
          isLoggedIn: true,
          activeRoom
        })
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

  onEnterRoom() {
    if (this.data.activeRoom) {
      wx.navigateTo({ url: `/pages/room/index?roomId=${this.data.activeRoom._id}` })
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
