const api = require('../../utils/api')
const { formatDate } = require('../../utils/util')
const app = getApp()

Page({
  data: {
    list: [],
    page: 1,
    hasMore: true,
    loading: false
  },
  onLoad() { this.loadHistory() },
  onReachBottom() { if (this.data.hasMore) this.loadHistory() },
  onPullDownRefresh() {
    this.setData({ list: [], page: 1, hasMore: true })
    this.loadHistory().then(() => wx.stopPullDownRefresh())
  },

  async loadHistory() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const res = await api.getHistory({ page: this.data.page })
      const list = res.list.map(item => ({
        ...item,
        dateLabel: formatDate(item.dissolvedAt),
        myScore: item.players.find(p => p.openid === app.globalData.openid)?.finalScore || 0
      }))
      this.setData({
        list: [...this.data.list, ...list],
        page: this.data.page + 1,
        hasMore: this.data.list.length + list.length < res.total
      })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  onDetail(e) {
    const item = e.currentTarget.dataset.item
    wx.navigateTo({ url: `/pages/historyDetail/index?roomId=${item.roomId}` })
  }
})
