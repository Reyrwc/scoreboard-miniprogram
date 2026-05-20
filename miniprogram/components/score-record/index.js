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
      if (!scores) return
      const fmt = this._formatTime.bind(this)
      scores.forEach(s => { s._time = fmt(s.createdAt) })
      this.setData({ groups: this._buildGroups(scores, currentRound || 0) })
    }
  },
  data: {
    groups: []
  }
})
