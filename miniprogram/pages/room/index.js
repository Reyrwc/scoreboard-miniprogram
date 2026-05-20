const api = require('../../utils/api')
const icons = require('../../utils/icons')
const app = getApp()

Page({
  data: {
    roomId: '',
    room: null,
    rankings: [],
    scores: [],
    isOwner: false,
    isLoading: true,
    isActive: false,
    showScoreModal: false,
    targetPlayer: null,
    showMenu: false,
    showInviteModal: false,
    qrcodeUrl: '',
    icons: {
      people: icons.people,
      logout: icons.logout,
      shareWhite: icons.shareWhite
    }
  },

  onLoad(options) {
    if (options.create === 'true') {
      this.createRoom()
    } else if (options.roomId) {
      this.joinRoom(options.roomId)
    }
  },

  onUnload() {
    if (this.roomWatcher) this.roomWatcher.close()
    if (this.scoreWatcher) this.scoreWatcher.close()
    if (this._expireTimer) clearTimeout(this._expireTimer)
  },

  async joinRoom(roomId) {
    try {
      wx.showLoading({ title: '加入中...' })
      await api.joinRoom({ roomId })
      this.setData({ roomId })
      this.loadRoom()
    } catch (err) {
      wx.showToast({ title: err.message || '加入失败', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
    } finally {
      wx.hideLoading()
    }
  },

  async createRoom() {
    try {
      wx.showLoading({ title: '创建中...' })
      const res = await api.createRoom()
      this.setData({ roomId: res.room._id })
      this.loadRoom()
      this.onShowInvite()
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
      this.watchRoom(res.room.currentRound)
      this._startExpireTimer()
    } catch (err) {
      this.setData({ isLoading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  onPlayerTap(e) {
    const player = e.detail.player
    if (player.openid === app.globalData.openid) {
      wx.showToast({ title: '不能给自己记分', icon: 'none' })
      return
    }
    this.setData({ showScoreModal: true, targetPlayer: player })
  },

  onScoreClose() {
    this.setData({ showScoreModal: false, targetPlayer: null })
  },

  async onScoreConfirm(e) {
    const { score, note } = e.detail
    const { targetPlayer, roomId } = this.data
    try {
      wx.showLoading({ title: '提交中...' })
      await api.addScore({ roomId, toOpenid: targetPlayer.openid, amount: score, note })
      this.setData({ showScoreModal: false, targetPlayer: null })
      this.loadRoom()
    } catch (err) {
      wx.showToast({ title: err.message || '记分失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  onToggleMenu() {
    this.setData({ showMenu: !this.data.showMenu })
  },

  onCloseMenu() {
    this.setData({ showMenu: false })
  },

  onMenuTap() {
    // 阻止事件冒泡
  },

  onShowInvite() {
    this.setData({ showMenu: false, showInviteModal: true })
    this._generateQRCode()
  },

  onCloseInviteModal() {
    this.setData({ showInviteModal: false })
  },

  onModalContentTap() {
    // 阻止事件冒泡
  },

  async _generateQRCode() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getRoomQRCode',
        data: { roomId: this.data.roomId }
      })
      if (res.result && res.result.imageUrl) {
        this.setData({ qrcodeUrl: res.result.imageUrl })
      }
    } catch (err) {
      console.error('生成二维码失败:', err)
      // 使用备用方案：显示房间ID
      this.setData({ qrcodeUrl: '' })
    }
  },

  onMenuDissolve() {
    this.setData({ showMenu: false })
    wx.showModal({
      title: '确认解散',
      content: '解散后将保存战绩，确定解散房间？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '解散中...' })
            await api.dissolveRoom({ roomId: this.data.roomId })
            wx.showToast({ title: '房间已解散', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 1500)
          } catch (err) {
            wx.showToast({ title: err.message || '解散失败', icon: 'none' })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
  },

  onInvite() {
    this.setData({ showInviteModal: true })
    this._generateQRCode()
  },

  async onAddTestPlayer() {
    try {
      wx.showLoading({ title: '添加中...' })
      await api.addTestPlayer({ roomId: this.data.roomId })
      wx.hideLoading()
      wx.showToast({ title: '测试玩家已添加', icon: 'success' })
      this.loadRoom()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '添加失败', icon: 'none' })
    }
  },

  onShareAppMessage() {
    if (!this.data.room) {
      return { title: '邀请你加入记分', path: '/pages/index/index' }
    }
    return {
      title: `邀请你加入「${this.data.room.name}」`,
      path: `/pages/room/index?roomId=${this.data.roomId}`
    }
  },

  async onNextRound() {
    try {
      await api.nextRound({ roomId: this.data.roomId })
      this.loadRoom()
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  },

  _startExpireTimer() {
    if (this._expireTimer) clearTimeout(this._expireTimer)
    const { room } = this.data
    if (!room || room.status !== 'active' || !room.lastScoreAt) return

    const lastScore = room.lastScoreAt instanceof Date
      ? room.lastScoreAt.getTime()
      : new Date(room.lastScoreAt).getTime()
    const remain = 2 * 60 * 1000 - (Date.now() - lastScore)

    if (remain <= 0) {
      // 已过期，触发解散检查
      this.loadRoom()
      return
    }

    this._expireTimer = setTimeout(() => {
      if (this.data.isActive) {
        wx.showToast({ title: '房间已过期', icon: 'none' })
        this.loadRoom()
        setTimeout(() => wx.navigateBack(), 1500)
      }
    }, remain)
  },

  watchRoom(currentRound) {
    if (this.roomWatcher) this.roomWatcher.close()
    if (this.scoreWatcher) this.scoreWatcher.close()

    const db = wx.cloud.database()
    const roomId = this.data.roomId

    this.roomWatcher = db.collection('rooms').doc(roomId).watch({
      onChange: (snapshot) => {
        const room = snapshot.docs[0]
        if (!room) return
        this.setData({ room, isActive: room.status === 'active' })
        if (room.status !== 'active') {
          if (this._expireTimer) clearTimeout(this._expireTimer)
          wx.showToast({ title: '房间已解散', icon: 'none' })
          setTimeout(() => wx.navigateBack(), 1500)
        }
        // 局数变化时重启 score watcher
        if (room.currentRound !== currentRound) {
          this.watchRoom(room.currentRound)
        }
      },
      onError: (err) => {
        console.error('房间监听失败:', err)
      }
    })

    this.scoreWatcher = db.collection('scores')
      .where({ roomId, roundNum: currentRound })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .watch({
        onChange: (snapshot) => {
          this.setData({ scores: snapshot.docs })
          this.calcRankings()
        },
        onError: (err) => {
          console.error('记分监听失败:', err)
        }
      })
  },

  calcRankings() {
    const { room, scores } = this.data
    if (!room) return

    const scoreMap = {}
    scores.forEach(s => {
      scoreMap[s.toOpenid] = (scoreMap[s.toOpenid] || 0) + s.amount
      scoreMap[s.fromOpenid] = (scoreMap[s.fromOpenid] || 0) - s.amount
    })

    const rankings = room.players.map(p => ({
      ...p,
      score: scoreMap[p.openid] || 0
    })).sort((a, b) => b.score - a.score)

    this.setData({ rankings })
  }
})
