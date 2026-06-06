// 3D 骰子各面朝上时的旋转角度偏移
const FACE_OFFSETS = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 }
}

Component({
  properties: {
    visible: Boolean
  },
  data: {
    diceCount: 1,
    diceResults: [1],
    diceTransforms: ['rotateX(0deg) rotateY(0deg)'],
    rolling: false,
    noTransition: false
  },
  lifetimes: {
    created() {
      this._baseRotX = 0
      this._baseRotY = 0
    },
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
      this._baseRotX = 0
      this._baseRotY = 0
      const transforms = Array.from({ length: count }, () => 'rotateX(0deg) rotateY(0deg)')
      // 先禁用过渡，再重置角度，避免骰子从当前点数回 1 时播放动画
      this.setData({ noTransition: true })
      setTimeout(() => {
        this.setData({ diceCount: count, diceResults: results, diceTransforms: transforms })
        setTimeout(() => {
          this.setData({ noTransition: false })
        }, 50)
      }, 50)
    },

    onRoll() {
      if (this.data.rolling) return
      this.setData({ rolling: true })

      // 每次投掷在当前基础上多转 5 圈
      this._baseRotX += 1800
      this._baseRotY += 1800

      const count = this.data.diceCount
      const results = Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1)
      const finalTransforms = results.map(v => {
        const offset = FACE_OFFSETS[v]
        const rx = this._baseRotX + offset.x
        const ry = this._baseRotY + offset.y
        return `rotateX(${rx}deg) rotateY(${ry}deg)`
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
