Component({
  properties: {
    visible: Boolean
  },
  data: {
    diceCount: 1,
    diceResults: [1],
    rolling: false
  },
  lifetimes: {
    detached() {
      if (this._timer) {
        clearInterval(this._timer)
        this._timer = null
      }
    }
  },
  methods: {
    onSelectCount(e) {
      if (this.data.rolling) return
      const count = parseInt(e.currentTarget.dataset.count, 10)
      const results = Array.from({ length: count }, () => 1)
      this.setData({ diceCount: count, diceResults: results })
    },

    onRoll() {
      if (this.data.rolling) return
      this.setData({ rolling: true })

      // 动画期间快速切换随机数字
      let tick = 0
      this._timer = setInterval(() => {
        const results = Array.from(
          { length: this.data.diceCount },
          () => Math.floor(Math.random() * 6) + 1
        )
        this.setData({ diceResults: results })
        tick++
        if (tick >= 10) {
          clearInterval(this._timer)
          this._timer = null
          this.setData({ rolling: false })
        }
      }, 80)
    },

    onClose() {
      if (this._timer) {
        clearInterval(this._timer)
        this._timer = null
      }
      this.setData({ rolling: false })
      this.triggerEvent('close')
    }
  }
})
