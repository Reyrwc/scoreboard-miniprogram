const api = require('../../utils/api')

Page({
  data: { history: null, loading: true },
  onLoad(options) {
    if (options.roomId) this.loadDetail(options.roomId)
  },
  async loadDetail(roomId) {
    try {
      const res = await api.getHistory({ roomId })
      const history = res.list.length > 0 ? res.list[0] : null
      this.setData({ history, loading: false })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },
  onShareAppMessage() {
    const h = this.data.history
    if (!h) return { title: '战绩详情', path: '/pages/index/index' }
    return {
      title: `战绩：${h.roomName}`,
      path: `/pages/historyDetail/index?roomId=${h.roomId}`
    }
  }
})
