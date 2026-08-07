const api = require('../../utils/api')
const icons = require('../../utils/icons')
const { ROOM_EXPIRE_MS } = require('../../utils/config')
const app = getApp()

// 轮询间隔（毫秒）：云函数可绕过安全规则读取全部玩家与记分，
// 客户端 watch 受数据库安全规则限制不可靠，故用轮询保证实时同步
const POLL_INTERVAL = 3000

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
    qrError: '',
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
    } else if (options.scene) {
      // 小程序码扫码进入：scene 形如 "roomId=xxxx"（URL 编码）
      try {
        const scene = decodeURIComponent(options.scene)
        const params = {}
        scene.split('&').forEach(pair => {
          const [k, v] = pair.split('=')
          if (k && v) params[k] = v
        })
        if (params.roomId) this.joinRoom(params.roomId)
      } catch (err) {
        console.error('解析 scene 失败:', err)
      }
    }
  },

  onShow() {
    // 回到页面时恢复实时同步
    this.startPolling()
  },

  onHide() {
    // 页面隐藏时暂停轮询，节省云函数调用
    this.stopPolling()
  },

  onPullDownRefresh() {
    this.loadRoom().finally(() => wx.stopPullDownRefresh())
  },

  onUnload() {
    this.stopPolling()
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
      wx.setNavigationBarTitle({ title: res.room.name })
      this.applyRoomData(res)
      if (res.room.status !== 'active') {
        this.handleRoomEnded('房间已结束')
        return
      }
      this.watchRoom()
      this._startExpireTimer()
      this.startPolling()
    } catch (err) {
      this.setData({ isLoading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  // 应用云函数返回的房间/排名/记分数据
  applyRoomData(res) {
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
          s._time = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0') + ':' + d.getSeconds().toString().padStart(2, '0')
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
  },

  // 从云函数拉取最新数据并应用（云函数有管理员权限，能读到全部玩家与记分）
  async refreshRoom() {
    try {
      const res = await api.getRoomInfo({ roomId: this.data.roomId })
      if (this._ended || !res.room) return
      if (res.room.status !== 'active') {
        this.applyRoomData(res)
        this.handleRoomEnded('房间已结束')
        return
      }
      this.applyRoomData(res)
      this._startExpireTimer()
    } catch (err) {
      console.error('刷新房间数据失败:', err)
      throw err
    }
  },

  startPolling() {
    if (this._ended || !this.data.roomId) return
    this.stopPolling()
    this._pollTimer = setInterval(() => this.pollRoom(), POLL_INTERVAL)
  },

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
  },

  async pollRoom() {
    if (this._polling || this._ended) return
    this._polling = true
    try {
      await this.refreshRoom()
    } catch (err) {
      // 瞬时错误忽略，等待下一次轮询
    } finally {
      this._polling = false
    }
  },

  handleRoomEnded(title) {
    if (this._ended) return
    this._ended = true
    this.stopPolling()
    if (this.roomWatcher) this.roomWatcher.close()
    if (this._expireTimer) clearTimeout(this._expireTimer)
    app.globalData._roomDissolved = true
    wx.showToast({ title, icon: 'none' })
    setTimeout(() => wx.navigateBack(), 1500)
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
    const { score } = e.detail
    const { targetPlayer, roomId } = this.data
    try {
      wx.showLoading({ title: '提交中...' })
      await api.addScore({ roomId, toOpenid: targetPlayer.openid, amount: score })
      this.setData({ showScoreModal: false, targetPlayer: null })
      try {
        // 保存成功后立即同步最新分数与排名
        await this.refreshRoom()
      } catch (err) {
        // 分数已保存，仅刷新失败不影响结果
        console.error('记分后刷新失败:', err)
      }
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
      this.setData({ qrError: '' })
      const res = await wx.cloud.callFunction({
        name: 'getRoomQRCode',
        data: { roomId: this.data.roomId }
      })
      if (res.result && res.result.code === 0 && res.result.imageUrl) {
        this.setData({ qrcodeUrl: res.result.imageUrl, qrError: '' })
      } else {
        // 展示具体错误信息，供用户重试
        this.setData({ qrError: (res.result && res.result.message) || '生成失败' })
      }
    } catch (err) {
      console.error('生成二维码失败:', err)
      this.setData({ qrError: err.errMsg || '网络异常，请重试' })
    }
  },

  onRetryQRCode() {
    this._generateQRCode()
  },

  onMenuLeave() {
    this.setData({ showMenu: false })
    wx.showModal({
      title: '确认退出',
      content: '退出后可重新加入，确定退出房间？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '退出中...' })
            await api.leaveRoom({ roomId: this.data.roomId })
            wx.showToast({ title: '已退出房间', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 1500)
          } catch (err) {
            wx.showToast({ title: err.message || '退出失败', icon: 'none' })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
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
    const remain = ROOM_EXPIRE_MS - (Date.now() - lastScore)

    if (remain <= 0) {
      this.handleRoomEnded('房间已过期')
      return
    }

    this._expireTimer = setTimeout(() => {
      this.handleRoomEnded('房间已过期')
    }, remain)
  },

  watchRoom() {
    if (this.roomWatcher) this.roomWatcher.close()

    try {
      const db = wx.cloud.database()
      const roomId = this.data.roomId

      this.roomWatcher = db.collection('rooms').doc(roomId).watch({
        onChange: (snapshot) => {
          const room = snapshot.docs[0]
          if (!room) return
          // 房间数据有变化（新玩家加入/记分/下一局/解散），立即拉取最新完整数据
          // 客户端受安全规则限制无法读取他人记分，统一以云函数返回为准
          this.pollRoom()
        },
        onError: (err) => {
          // 客户端可能因安全规则无法监听 rooms 集合，轮询兜底
          console.warn('房间监听失败（轮询兜底）:', err)
        }
      })
    } catch (err) {
      console.warn('房间监听初始化失败（轮询兜底）:', err)
    }
  },
})
