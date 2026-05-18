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
      if (!res || !Array.isArray(res.list)) {
        throw new Error(res?.message || '数据格式错误')
      }
      const allUsers = res.list
      const topThreeRaw = allUsers.slice(0, 3)
      // Reorder for podium display: 2-1-3
      let displayTop = []
      if (topThreeRaw.length >= 3) {
        displayTop = [
          { ...topThreeRaw[1], displayRank: 2 },
          { ...topThreeRaw[0], displayRank: 1 },
          { ...topThreeRaw[2], displayRank: 3 }
        ]
      } else if (topThreeRaw.length === 2) {
        displayTop = [
          { ...topThreeRaw[1], displayRank: 2 },
          { ...topThreeRaw[0], displayRank: 1 }
        ]
      } else if (topThreeRaw.length === 1) {
        displayTop = [
          { ...topThreeRaw[0], displayRank: 1 }
        ]
      }

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

})
