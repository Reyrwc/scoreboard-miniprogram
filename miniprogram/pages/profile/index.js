const auth = require('../../utils/auth')
const api = require('../../utils/api')
const icons = require('../../utils/icons')
const app = getApp()

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    tempAvatarUrl: '',
    editNickname: '',
    showNicknameEdit: false,
    icons: {
      document: icons.document,
      barChart: icons.barChart,
      people: icons.people,
      chevronRight: icons.chevronRight,
      edit: icons.edit
    }
  },

  onShow() {
    if (auth.checkLogin()) {
      this._fetchUserInfo()
    }
  },

  onPullDownRefresh() {
    this._fetchUserInfo().finally(() => wx.stopPullDownRefresh())
  },

  async _fetchUserInfo() {
    try {
      const res = await api.getUserInfo()
      if (res.user) {
        app.globalData.userInfo = res.user
        this._setUserInfo(res.user)
      } else {
        this._clearLoginState()
      }
    } catch (err) {
      console.error('获取用户信息失败:', err)
      this._clearLoginState()
    }
  },

  _setUserInfo(user) {
    user.winRate = user.totalGames > 0 ? (user.totalWins / user.totalGames * 100).toFixed(1) : '0.0'
    user.netScore = (user.totalWinScore || 0) - (user.totalLoseScore || 0)
    this.setData({
      userInfo: user,
      isLoggedIn: true,
      editNickname: user.nickname || ''
    })
  },

  _clearLoginState() {
    app.globalData.userInfo = null
    app.globalData.openid = null
    wx.removeStorageSync('openid')
    this.setData({ userInfo: null, isLoggedIn: false })
  },

  onLogin() {
    wx.showLoading({ title: '登录中...' })
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          wx.hideLoading()
          wx.showToast({ title: 'wx.login 获取 code 失败', icon: 'none' })
          return
        }
        api.login({ code: loginRes.code }).then(res => {
          wx.hideLoading()
          if (res.openid) {
            app.globalData.openid = res.openid
            wx.setStorageSync('openid', res.openid)
          }
          if (res.user) {
            app.globalData.userInfo = res.user
            this._setUserInfo(res.user)
          }
        }).catch(err => {
          wx.hideLoading()
          console.error('云函数 login 调用失败:', err)
          wx.showToast({ title: '登录失败: ' + (err.message || '云函数调用失败'), icon: 'none' })
        })
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('wx.login 失败:', err)
        wx.showToast({ title: 'wx.login 失败', icon: 'none' })
      }
    })
  },

  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl
    this.setData({ tempAvatarUrl: avatarUrl })
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

  onTapModalOverlay() {
    this.setData({ showNicknameEdit: false })
  },

  onTapModalContent() {
    // 阻止事件冒泡到 overlay，防止点击内容区域时关闭弹窗
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
      const res = await api.updateUserInfo({ nickname })
      wx.hideLoading()
      if (res.code === 0) {
        this.data.userInfo.nickname = nickname
        app.globalData.userInfo = this.data.userInfo
        this.setData({
          userInfo: this.data.userInfo,
          showNicknameEdit: false
        })
        wx.showToast({ title: '昵称已更新', icon: 'success' })
      } else {
        wx.showToast({ title: res.message || '保存失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('保存昵称失败:', err)
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
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
  goFriends() { wx.navigateTo({ url: '/pages/friends/index' }) }
})
