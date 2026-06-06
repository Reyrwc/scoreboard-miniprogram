// 3D 骰子各面朝上时的旋转角度
const FACE_ROTATIONS = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateX(0deg) rotateY(-90deg)',
  3: 'rotateX(-90deg) rotateY(0deg)',
  4: 'rotateX(90deg) rotateY(0deg)',
  5: 'rotateX(0deg) rotateY(90deg)',
  6: 'rotateX(0deg) rotateY(180deg)'
}

Component({
  properties: {
    visible: Boolean
  },
  data: {
    diceCount: 1,
    diceResults: [1],
    diceTransforms: ['rotateX(0deg) rotateY(0deg)'],
    rolling: false
  },
  lifetimes: {
    detached() {
      this._clearTimer()
    }
  },
  methods: {
    _clearTimer() {
      if (this._timer) {
        clearTimeout(this._timer)
        this._timer = null
      }
    },

    onSelectCount(e) {
      if (this.data.rolling) return
      const count = parseInt(e.currentTarget.dataset.count, 10)
      const results = Array.from({ length: count }, () => 1)
      const transforms = Array.from({ length: count }, () => 'rotateX(0deg) rotateY(0deg)')
      this.setData({ diceCount: count, diceResults: results, diceTransforms: transforms })
    },

    onRoll() {
      if (this.data.rolling) return
      this.setData({ rolling: true })

      const count = this.data.diceCount
      const results = Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1)
      // 固定 5 圈 (1800°) + 各面精确角度，确保停在正对位置
      const finalTransforms = results.map(v => {
        switch (v) {
          case 1: return 'rotateX(1800deg) rotateY(1800deg)'
          case 2: return 'rotateX(1800deg) rotateY(1710deg)'
          case 3: return 'rotateX(1710deg) rotateY(1800deg)'
          case 4: return 'rotateX(1890deg) rotateY(1800deg)'
          case 5: return 'rotateX(1800deg) rotateY(1890deg)'
          case 6: return 'rotateX(1800deg) rotateY(1980deg)'
        }
      })

      this.setData({ diceResults: results, diceTransforms: finalTransforms })

      this._timer = setTimeout(() => {
        this._timer = null
        this.setData({ rolling: false })
      }, 1200)
    },

    onClose() {
      this._clearTimer()
      this.setData({ rolling: false })
      this.triggerEvent('close')
    }
  }
})
