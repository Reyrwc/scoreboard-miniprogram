Component({
  properties: {
    visible: Boolean,
    targetPlayer: Object
  },
  data: {
    scoreValue: ''
  },
  methods: {
    onScoreInput(e) {
      this.setData({ scoreValue: e.detail.value })
    },
    onClose() {
      this.setData({ scoreValue: '' })
      this.triggerEvent('close')
    },
    onConfirm() {
      const score = parseFloat(this.data.scoreValue)
      if (!score || score <= 0) {
        wx.showToast({ title: '请输入正数', icon: 'none' })
        return
      }
      this.triggerEvent('confirm', { score })
      this.setData({ scoreValue: '' })
    }
  }
})
