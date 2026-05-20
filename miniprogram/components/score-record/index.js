Component({
  properties: {
    scores: Array,
    currentRound: Number
  },
  methods: {
    _formatTime(date) {
      if (!date) return ''
      const d = date instanceof Date ? date : new Date(date)
      if (isNaN(d.getTime())) return ''
      const h = d.getHours().toString().padStart(2, '0')
      const m = d.getMinutes().toString().padStart(2, '0')
      return h + ':' + m
    },
    _buildGroups(scores, currentRound) {
      if (currentRound <= 0) return [{ roundLabel: '', items: scores }]
      const map = {}
      scores.forEach(s => {
        const r = s.roundNum || 0
        if (!map[r]) map[r] = []
        map[r].push(s)
      })
      const groups = []
      const rounds = Object.keys(map).map(Number).sort((a, b) => b - a)
      rounds.forEach(r => {
        groups.push({ roundLabel: '第' + (r + 1) + '局', items: map[r] })
      })
      return groups
    }
  },
  observers: {
    'scores, currentRound': function(scores, currentRound) {
      if (!scores || !scores.length) {
        this.setData({ groups: [] })
        return
      }
      const fmt = this._formatTime
      // 创建全新对象，确保 WeChat 检测到变化并刷新视图
      const formatted = scores.map(s => ({
        _id: s._id,
        fromNickname: s.fromNickname,
        toNickname: s.toNickname,
        fromAvatarUrl: s.fromAvatarUrl || '',
        toAvatarUrl: s.toAvatarUrl || '',
        amount: s.amount,
        note: s.note,
        roundNum: s.roundNum,
        _time: fmt(s.createdAt)
      }))
      this.setData({ groups: this._buildGroups(formatted, currentRound || 0) })
    }
  },
  data: {
    groups: []
  }
})
