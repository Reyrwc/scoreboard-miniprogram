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
    showNicknameEdit: false,
    editNickname: '',
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
      // 云函数有管理员权限，能读到所有分数；客户端查询受安全规则限制会返回空
      const scores = res.scores || []
      const rankings = res.rankings || []
      // 给分数记录附带头像
      const players = res.room.players || []
      const avatarMap = {}
      players.forEach(p => { avatarMap[p.openid] = p.avatarUrl || '' })
      scores.forEach(s => {
        s.fromAvatarUrl = avatarMap[s.fromOpenid] || ''
        s.toAvatarUrl = avatarMap[s.toOpenid] || ''
        // 直接计算时间，不依赖 observer
        if (!s._time) {
          const d = s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt)
          if (!isNaN(d.getTime())) {
            s._time = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
          } else {
            s._time = ''
          }
        }
      })

      this.setData({
        room: res.room,
        rankings,
        scores,
        isOwner: res.room.ownerId === app.globalData.openid,
        isLoading: false,
        isActive: res.room.status === 'active'
      })
      wx.setNavigationBarTitle({ title: res.room.name })
      this.watchRoom()
      this._startExpireTimer()
    } catch (err) {
      this.setData({ isLoading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  onPlayerTap(e) {
    const player = e.detail.player
    if (player.openid === app.globalData.openid) {
      this.setData({ showNicknameEdit: true, editNickname: player.nickname || '' })
      return
    }
    this.setData({ showScoreModal: true, targetPlayer: player })
  },

  onNicknameInput(e) {
    this.setData({ editNickname: e.detail.value })
  },

  onCloseNicknameEdit() {
    this.setData({ showNicknameEdit: false })
  },

  onNicknameModalOverlay() {
    this.setData({ showNicknameEdit: false })
  },

  onNicknameModalContent() {
    // 阻止冒泡
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
        // 更新 room.players、rankings、scores 中自己的昵称
        const myOpenid = app.globalData.openid
        const players = this.data.room.players.map(p => {
          if (p.openid === myOpenid) return { ...p, nickname }
          return p
        })
        const room = { ...this.data.room, players }
        // 房主改昵称时同步更新房间名
        if (this.data.isOwner) {
          room.name = nickname + '的房间'
          wx.setNavigationBarTitle({ title: room.name })
        }
        const rankings = this.data.rankings.map(r => {
          if (r.openid === myOpenid) return { ...r, nickname }
          return r
        })
        const scores = this.data.scores.map(s => {
          const update = {}
          if (s.fromOpenid === myOpenid) update.fromNickname = nickname
          if (s.toOpenid === myOpenid) update.toNickname = nickname
          return Object.keys(update).length ? { ...s, ...update } : s
        })
        this.setData({ room, rankings, scores, showNicknameEdit: false })
        wx.showToast({ title: '昵称已更新', icon: 'success' })
      } else {
        wx.showToast({ title: res.message || '保存失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    }
  },

  onScoreClose() {
    this.setData({ showScoreModal: false, targetPlayer: null })
  },

  async onScoreConfirm(e) {
    const { score, note } = e.detail
    const { targetPlayer, roomId, room } = this.data
    try {
      wx.showLoading({ title: '提交中...' })
      await api.addScore({ roomId, toOpenid: targetPlayer.openid, amount: score, note })
      const now = new Date()
      const fromPlayer = room.players.find(p => p.openid === app.globalData.openid)
      const h = now.getHours().toString().padStart(2, '0')
      const m = now.getMinutes().toString().padStart(2, '0')
      const newScore = {
        _id: 'local_' + now.getTime(),
        roomId,
        roundNum: room.currentRound,
        fromOpenid: app.globalData.openid,
        fromNickname: fromPlayer?.nickname || '玩家',
        fromAvatarUrl: fromPlayer?.avatarUrl || '',
        toOpenid: targetPlayer.openid,
        toNickname: targetPlayer.nickname || '玩家',
        toAvatarUrl: targetPlayer.avatarUrl || '',
        amount: parseFloat(score),
        note: note || '',
        createdAt: now,
        _time: h + ':' + m
      }
      const scores = [newScore, ...this.data.scores]
      // 更新 room.lastScoreAt 使过期计时器从本次记分开始重新倒计时
      const updatedRoom = { ...room, lastScoreAt: now }
      this.setData({ showScoreModal: false, targetPlayer: null, scores, room: updatedRoom })
      this.calcRankings()
      this._startExpireTimer()
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
      wx.showToast({ title: '已开始下一局', icon: 'success' })
      this.loadRoom()
    } catch (err) {
      // 别人已经点过了，也算成功开始
      if (err.message && err.message.includes('一分钟')) {
        wx.showToast({ title: '已开始下一局', icon: 'success' })
        this.loadRoom()
      } else {
        wx.showToast({ title: err.message || '操作失败', icon: 'none' })
      }
    }
  },

  _startExpireTimer() {
    if (this._expireTimer) clearTimeout(this._expireTimer)
    const { room } = this.data
    if (!room || room.status !== 'active') return

    const refTime = room.lastScoreAt || room.createdAt
    const lastScore = refTime instanceof Date
      ? refTime.getTime()
      : new Date(refTime).getTime()
    if (!lastScore || isNaN(lastScore)) return
    const remain = 2 * 60 * 1000 - (Date.now() - lastScore)

    if (remain <= 0) {
      // 已过期，触发解散检查
      this.loadRoom()
      return
    }

    this._expireTimer = setTimeout(() => {
      if (this.data.isActive) {
        app.globalData._roomDissolved = true
        wx.showToast({ title: '房间已过期', icon: 'none' })
        this.loadRoom()
        setTimeout(() => wx.navigateBack(), 1500)
      }
    }, remain)
  },

  watchRoom() {
    if (this.roomWatcher) this.roomWatcher.close()

    const db = wx.cloud.database()
    const roomId = this.data.roomId

    this.roomWatcher = db.collection('rooms').doc(roomId).watch({
      onChange: (snapshot) => {
        const room = snapshot.docs[0]
        if (!room) return
        this.setData({ room, isActive: room.status === 'active' })
        if (room.status !== 'active') {
          if (this._expireTimer) clearTimeout(this._expireTimer)
          app.globalData._roomDissolved = true
          wx.showToast({ title: '房间已解散', icon: 'none' })
          setTimeout(() => wx.navigateBack(), 1500)
        }
      },
      onError: (err) => {
        console.error('房间监听失败:', err)
      }
    })

    // 不监听 scores 集合——客户端受安全规则限制读不到其他用户创建的记录，
    // watch 会返回空数组覆盖掉从云函数拿到的真实数据。
    // 分数变更通过 onScoreConfirm 本地更新 + loadRoom 从云函数获取。
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
