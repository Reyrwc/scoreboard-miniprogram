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
    isActive: false,
    showScoreModal: false,
    targetPlayer: null,
    cooldown: 0,
    cooldownTimer: null
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
    if (this.data.cooldownTimer) clearInterval(this.data.cooldownTimer)
  },

  async joinRoom(roomId) {
    try {
      wx.showLoading({ title: '加入中...' })
      await api.joinRoom({ roomId })
      // api.callFunction throws on non-zero codes, so success here means join succeeded
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
      this.watchRoom()
    } catch (err) {
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

  onInvite() {
    // Will be implemented in Task 4 (join room)
  },

  async onNextRound() {
    if (this.data.cooldown > 0) return
    try {
      await api.nextRound({ roomId: this.data.roomId })
      this.startCooldown()
      this.loadRoom()
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  },

  startCooldown() {
    this.setData({ cooldown: 60 })
    this.data.cooldownTimer = setInterval(() => {
      if (this.data.cooldown <= 0) {
        clearInterval(this.data.cooldownTimer)
        return
      }
      this.setData({ cooldown: this.data.cooldown - 1 })
    }, 1000)
  },

  watchRoom() {
    const db = wx.cloud.database()
    const roomId = this.data.roomId

    // 监听房间变化
    this.roomWatcher = db.collection('rooms').doc(roomId).watch({
      onChange: (snapshot) => {
        const room = snapshot.docs[0]
        if (!room) return
        this.setData({ room })
        this.calcRankings()
      },
      onError: (err) => {
        console.error('房间监听失败:', err)
      }
    })

    // 监听记分记录变化
    this.scoreWatcher = db.collection('scores')
      .where({ roomId })
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

    const rankings = room.players.map(p => {
      const totalScore = scores
        .filter(s => s.toOpenid === p.openid)
        .reduce((sum, s) => sum + s.amount, 0)
        - scores
        .filter(s => s.fromOpenid === p.openid)
        .reduce((sum, s) => sum + s.amount, 0)
      return { ...p, score: totalScore }
    }).sort((a, b) => b.score - a.score)

    this.setData({ rankings })
  }
})
