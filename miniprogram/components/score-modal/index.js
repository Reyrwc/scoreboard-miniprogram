Component({
  properties: {
    visible: Boolean,
    targetPlayer: Object
  },
  data: {
    scoreValue: '',
    inputFocus: false,
    keyboardHeight: 0
  },
  observers: {
    // 弹窗打开时自动聚焦输入框，弹出数字键盘
    'visible'(val) {
      if (val) {
        this.setData({ scoreValue: '' })
        // 等弹窗渲染完成后再聚焦，保证键盘可靠弹出
        setTimeout(() => this.setData({ inputFocus: true }), 60)
      } else {
        this.setData({ inputFocus: false, keyboardHeight: 0 })
      }
    }
  },
  methods: {
    onScoreInput(e) {
      this.setData({ scoreValue: e.detail.value })
    },
    onKeyboardHeightChange(e) {
      this.setData({ keyboardHeight: e.detail.height || 0 })
    },
    onClose() {
      this.setData({ scoreValue: '', inputFocus: false, keyboardHeight: 0 })
      this.triggerEvent('close')
    },
    onConfirm() {
      const score = parseFloat(this.data.scoreValue)
      if (!score || score <= 0) {
        wx.showToast({ title: '请输入正数', icon: 'none' })
        return
      }
      this.triggerEvent('confirm', { score })
      this.setData({ scoreValue: '', inputFocus: false, keyboardHeight: 0 })
    }
  }
})
