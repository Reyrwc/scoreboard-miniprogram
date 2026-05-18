Component({
  properties: {
    player: Object,
    rank: Number
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { player: this.data.player })
    }
  }
})
