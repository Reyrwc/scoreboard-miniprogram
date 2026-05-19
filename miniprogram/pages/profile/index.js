const auth = require('../../utils/auth')
const api = require('../../utils/api')
const icons = require('../../utils/icons')
const app = getApp()

Page({
  data: {
    userInfo: null,
    tempAvatarUrl: '',
    editNickname: '',
    showNicknameEdit: false,
    icons: {
      document: icons.document,
      barChart: icons.barChart,
      people: icons.people,
      logout: icons.logout,
      chevronRight: icons.chevronRight,
      edit: icons.edit
    }
  },

  onShow() {
    const user = app.globalData.userInfo
    if (user) {
      user.winRate = user.totalGames > 0 ? (user.totalWins / user.totalGames * 100).toFixed(1) : '0.0'
      user.netScore = (user.totalWinScore || 0) - (user.totalLoseScore || 0)
    }
    this.setData({
      userInfo: user,
      editNickname: user ? (user.nickname || '') : ''
    })
  },

  onLogin() {
    auth.login().then((res) => {
      if (res.user) {
        const user = res.user
        user.winRate = user.totalGames > 0 ? (user.totalWins / user.totalGames * 100).toFixed(1) : '0.0'
        user.netScore = (user.totalWinScore || 0) - (user.totalLoseScore || 0)
        app.globalData.userInfo = user
        this.setData({
          userInfo: user,
          editNickname: user.nickname || ''
        })
      }
    }).catch(err => {
      console.error('登录失败:', err)
      wx.showToast({ title: '登录失败', icon: 'none' })
    })
  },

  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl
    this.setData({ tempAvatarUrl: avatarUrl })
    // 如果已有昵称，直接保存头像
    if (this.data.userInfo && this.data.userInfo.nickname) {
      this._saveAvatar(avatarUrl)
    }
  },

  async _saveAvatar(avatarUrl) {
    try {
      wx.showLoading({ title: '上传头像...' })
      const cloudPath = `avatars/${app.globalData.openid}.png`
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: avatarUrl
      })
      wx.hideLoading()

      const res = await api.updateUserInfo({
        nickname: this.data.userInfo.nickname,
        avatarUrl: uploadRes.fileID
      })
      if (res.code === 0) {
        this.data.userInfo.avatarUrl = uploadRes.fileID
        app.globalData.userInfo = this.data.userInfo
        this.setData({ userInfo: this.data.userInfo })
        wx.showToast({ title: '头像已更新', icon: 'success' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('保存头像失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  onEditNickname() {
    this.setData({
      showNicknameEdit: true,
      editNickname: this.data.userInfo.nickname || ''
    })
  },

  onCloseEdit() {
    this.setData({ showNicknameEdit: false })
  },

  onNicknameInput(e) {
    this.setData({ editNickname: e.detail.value })
  },

  async onSaveNickname() {
    const nickname = this.data.editNickname.trim()
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    try {
      wx.showLoading({ title: '保存中...' })
      const res = await api.updateUserInfo({
        nickname,
        avatarUrl: this.data.userInfo.avatarUrl || ''
      })
      wx.hideLoading()
      if (res.code === 0) {
        this.data.userInfo.nickname = nickname
        app.globalData.userInfo = this.data.userInfo
        this.setData({
          userInfo: this.data.userInfo,
          showNicknameEdit: false
        })
        wx.showToast({ title: '昵称已更新', icon: 'success' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('保存昵称失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  async onSaveProfile() {
    const nickname = this.data.editNickname.trim()
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })
      let avatarUrl = ''

      if (this.data.tempAvatarUrl) {
        const cloudPath = `avatars/${app.globalData.openid}.png`
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: this.data.tempAvatarUrl
        })
        avatarUrl = uploadRes.fileID
      }

      const res = await api.updateUserInfo({ nickname, avatarUrl })
      wx.hideLoading()

      if (res.code === 0) {
        this.data.userInfo.nickname = nickname
        if (avatarUrl) this.data.userInfo.avatarUrl = avatarUrl
        app.globalData.userInfo = this.data.userInfo
        this.setData({
          userInfo: this.data.userInfo,
          tempAvatarUrl: ''
        })
        wx.showToast({ title: '保存成功', icon: 'success' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('保存失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
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
          this.setData({ userInfo: null, tempAvatarUrl: '', editNickname: '' })
        }
      }
    })
  }
})
