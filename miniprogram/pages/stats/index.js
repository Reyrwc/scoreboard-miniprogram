const api = require('../../utils/api')

Page({
  data: { stats: null, loading: true, loadError: false },
  onLoad() { this.loadStats() },
  onPullDownRefresh() {
    this.setData({ stats: null, loading: true, loadError: false })
    this.loadStats().finally(() => wx.stopPullDownRefresh())
  },
  async loadStats() {
    try {
      const res = await api.getStats()
      this.setData({ stats: res.stats, loading: false })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false, loadError: true })
    }
  },
  onRetry() {
    this.setData({ loading: true, loadError: false })
    this.loadStats()
  }
})
