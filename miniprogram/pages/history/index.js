const api = require('../../utils/api')
const { formatDate } = require('../../utils/util')
const app = getApp()

Page({
  data: {
    list: [],
    groups: [],
    page: 1,
    hasMore: true,
    loading: false
  },
  onLoad() { this.loadHistory() },
  onReachBottom() { if (this.data.hasMore) this.loadHistory() },
  onPullDownRefresh() {
    this.setData({ list: [], groups: [], page: 1, hasMore: true })
    this.loadHistory().finally(() => wx.stopPullDownRefresh())
  },

  _buildGroups(list) {
    const groups = []
    list.forEach(item => {
      const last = groups[groups.length - 1]
      if (last && last.dateLabel === item.dateLabel) {
        last.items.push(item)
      } else {
        groups.push({ dateLabel: item.dateLabel, items: [item] })
      }
    })
    return groups
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
      const allList = [...this.data.list, ...list]
      this.setData({
        list: allList,
        groups: this._buildGroups(allList),
        page: this.data.page + 1,
        hasMore: allList.length < res.total
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
