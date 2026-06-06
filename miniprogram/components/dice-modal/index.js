Component({
  properties: {
    visible: Boolean
  },
  data: {
    diceCount: 1,
    diceResults: [1],
    rolling: false
  },
  methods: {
    onSelectCount(e) {
      const count = e.currentTarget.dataset.count
      const results = Array.from({ length: count }, () => 1)
      this.setData({ diceCount: count, diceResults: results })
    },

    onRoll() {
      if (this.data.rolling) return
      this.setData({ rolling: true })

      // 动画期间快速切换随机数字
      let tick = 0
      const timer = setInterval(() => {
        const results = Array.from(
          { length: this.data.diceCount },
          () => Math.floor(Math.random() * 6) + 1
        )
        this.setData({ diceResults: results })
        tick++
        if (tick >= 10) {
          clearInterval(timer)
          this.setData({ rolling: false })
        }
      }, 80)
    },

    onClose() {
      this.setData({ rolling: false })
      this.triggerEvent('close')
    }
  }
})
