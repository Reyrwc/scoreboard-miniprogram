const api = require('../../utils/api')

Page({
  data: { stats: null, loading: true },
  onLoad() { this.loadStats() },
  async loadStats() {
    try {
      const res = await api.getStats()
      this.setData({ stats: res.stats, loading: false })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  }
})
