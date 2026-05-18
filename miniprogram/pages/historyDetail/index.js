const api = require('../../utils/api')
const { formatDate } = require('../../utils/util')

Page({
  data: { history: null, loading: true },
  onLoad(options) {
    if (options.roomId) {
      this.loadDetail(options.roomId)
    } else {
      this.setData({ loading: false })
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },
  async loadDetail(roomId) {
    try {
      const res = await api.getHistory({ roomId })
      const history = res.list.length > 0 ? {
        ...res.list[0],
        dateLabel: formatDate(res.list[0].dissolvedAt)
      } : null
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
      title: `战绩：${h.roomName || '战绩详情'}`,
      path: `/pages/historyDetail/index?roomId=${h.roomId}`
    }
  }
})
