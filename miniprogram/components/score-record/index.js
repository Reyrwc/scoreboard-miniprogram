Component({
  properties: {
    scores: {
      type: Array,
      observer: function(scores) {
        if (!scores || !scores.length) {
          if (this.data.groups.length) this.setData({ groups: [] })
          return
        }
        // 直接使用 scores（调用方已算好 _time），构建分组
        this.setData({ groups: this._buildGroups(scores, this.data.currentRound || 0) })
      }
    },
    currentRound: {
      type: Number,
      observer: function() {
        const { scores } = this.data
        if (!scores || !scores.length) return
        this.setData({ groups: this._buildGroups(scores, this.data.currentRound || 0) })
      }
    }
  },
  methods: {
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
  data: {
    groups: []
  }
})
