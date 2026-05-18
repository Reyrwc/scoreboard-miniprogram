const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { roomId } = event

  try {
    const roomRes = await db.collection('rooms').doc(roomId).get()
    const room = roomRes.data

    // 如果是最后一个玩家，解散房间
    if (room.players.length <= 1) {
      await db.collection('rooms').doc(roomId).update({
        data: { status: 'dissolved', dissolvedAt: db.serverDate() }
      })
      return { code: 0 }
    }

    // 如果是房主，转移房主
    const updates = {
      players: _.pull({ openid: OPENID })
    }
    if (room.ownerId === OPENID) {
      const nextOwner = room.players.find(p => p.openid !== OPENID)
      if (nextOwner) updates.ownerId = nextOwner.openid
    }

    await db.collection('rooms').doc(roomId).update({ data: updates })
    return { code: 0 }
  } catch (err) {
    console.error('leaveRoom error:', err)
    return { code: -1, message: err.message || '退出房间失败' }
  }
}
