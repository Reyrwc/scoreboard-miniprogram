const api = require('../../utils/api')

Page({
  data: {
    sortBy: 'winRate',
    list: [],
    topThree: [],
    loading: true,
    loadError: false
  },
  onLoad() { this.loadRank() },

  onSort(e) {
    const sort = e.currentTarget.dataset.sort
    if (sort === this.data.sortBy) return
    this.setData({ sortBy: sort, list: [], topThree: [], loading: true, loadError: false })
    this.loadRank()
  },

  onRetry() {
    this.setData({ loading: true, loadError: false })
    this.loadRank()
  },

  async loadRank() {
    try {
      const res = await api.getFriendsRank({ sortBy: this.data.sortBy })
      const allUsers = res.list
      const topThree = allUsers.slice(0, 3)
      // Reorder for display: 2-1-3 (silver, gold, bronze)
      const displayTop = topThree.length >= 3
        ? [topThree[1], topThree[0], topThree[2]]
        : topThree

      this.setData({
        topThree: displayTop,
        list: allUsers,
        loading: false,
        loadError: false
      })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false, loadError: true })
    }
  },

  formatScore(item) {
    const sortBy = this.data.sortBy
    if (sortBy === 'winRate') return item.winRate.toFixed(1) + '%'
    if (sortBy === 'totalGames') return item.totalGames + '场'
    return (item.netScore >= 0 ? '+' : '') + item.netScore
  }
})
