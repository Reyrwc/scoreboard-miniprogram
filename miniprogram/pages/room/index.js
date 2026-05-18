const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    roomId: '',
    room: null,
    rankings: [],
    scores: [],
    isOwner: false,
    isLoading: true,
    isActive: false
  },

  onLoad(options) {
    if (options.create === 'true') {
      this.createRoom()
    } else if (options.roomId) {
      this.setData({ roomId: options.roomId })
      this.loadRoom()
    }
  },

  onUnload() {
    if (this.roomWatcher) this.roomWatcher.close()
    if (this.scoreWatcher) this.scoreWatcher.close()
  },

  async createRoom() {
    try {
      wx.showLoading({ title: '创建中...' })
      const res = await api.createRoom()
      this.setData({ roomId: res.room._id })
      this.loadRoom()
    } catch (err) {
      wx.showToast({ title: err.message || '创建失败', icon: 'none' })
      wx.navigateBack()
    } finally {
      wx.hideLoading()
    }
  },

  async loadRoom() {
    try {
      const res = await api.getRoomInfo({ roomId: this.data.roomId })
      this.setData({
        room: res.room,
        rankings: res.rankings,
        scores: res.scores,
        isOwner: res.room.ownerId === app.globalData.openid,
        isLoading: false,
        isActive: res.room.status === 'active'
      })
      wx.setNavigationBarTitle({ title: res.room.name })
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  onPlayerTap(e) {
    // Will be implemented in Task 5 (scoring)
  },

  onInvite() {
    // Will be implemented in Task 4 (join room)
  },

  onNextRound() {
    // Will be implemented in Task 6 (next round)
  }
})
