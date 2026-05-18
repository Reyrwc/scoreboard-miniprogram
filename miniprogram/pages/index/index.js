const auth = require('../../utils/auth')
const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    userInfo: null,
    isLoggedIn: false
  },

  onLoad() {
    this._tryAutoLogin()
  },

  onShow() {},

  async _tryAutoLogin() {
    if (auth.checkLogin()) {
      // 已有登录态，获取用户信息
      this._loadUserInfo()
    }
  },

  async _loadUserInfo() {
    try {
      const res = await api.getUserInfo()
      if (res.user) {
        app.globalData.userInfo = res.user
        this.setData({ userInfo: res.user, isLoggedIn: true })
      }
    } catch (err) {
      console.error('获取用户信息失败:', err)
    }
  },

  async onLogin() {
    try {
      wx.showLoading({ title: '登录中...' })
      await auth.login()
      await this._loadUserInfo()
    } catch (err) {
      console.error('登录失败:', err)
      wx.showToast({ title: '登录失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl
    if (avatarUrl && this.data.userInfo) {
      this.setData({ 'userInfo.avatarUrl': avatarUrl })
      // 可以在这里调用 updateUserInfo 保存头像
    }
  },

  onCreateRoom() {
    if (!this.data.isLoggedIn) {
      this.onLogin()
      return
    }
    wx.navigateTo({ url: '/pages/room/index?create=true' })
  },

  onScanCode() {
    if (!this.data.isLoggedIn) {
      this.onLogin()
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
