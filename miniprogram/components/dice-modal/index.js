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
      const finalTransforms = results.map(v => {
        const spinX = 720 + Math.floor(Math.random() * 360)
        const spinY = 720 + Math.floor(Math.random() * 360)
        switch (v) {
          case 1: return `rotateX(${spinX}deg) rotateY(${spinY}deg)`
          case 2: return `rotateX(${spinX}deg) rotateY(${-90 + spinY}deg)`
          case 3: return `rotateX(${-90 + spinX}deg) rotateY(${spinY}deg)`
          case 4: return `rotateX(${90 + spinX}deg) rotateY(${spinY}deg)`
          case 5: return `rotateX(${spinX}deg) rotateY(${90 + spinY}deg)`
          case 6: return `rotateX(${spinX}deg) rotateY(${180 + spinY}deg)`
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
