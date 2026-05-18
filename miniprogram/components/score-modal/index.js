Component({
  properties: {
    visible: Boolean,
    targetPlayer: Object
  },
  data: {
    scoreValue: '',
    noteValue: '',
    quickScores: [1, 3, 5, 10, 20, 50, 100, 200]
  },
  methods: {
    onScoreInput(e) {
      this.setData({ scoreValue: e.detail.value })
    },
    onNoteInput(e) {
      this.setData({ noteValue: e.detail.value })
    },
    onQuickScore(e) {
      this.setData({ scoreValue: String(e.currentTarget.dataset.value) })
    },
    onClose() {
      this.setData({ scoreValue: '', noteValue: '' })
      this.triggerEvent('close')
    },
    onConfirm() {
      const score = parseFloat(this.data.scoreValue)
      if (!score || score <= 0) {
        wx.showToast({ title: '请输入正数', icon: 'none' })
        return
      }
      this.triggerEvent('confirm', {
        score,
        note: this.data.noteValue
      })
      this.setData({ scoreValue: '', noteValue: '' })
    }
  }
})
