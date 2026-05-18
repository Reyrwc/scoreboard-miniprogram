const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { roomId } = event

  try {
    if (!roomId) return { code: -1, message: '缺少房间ID' }

    const roomRes = await db.collection('rooms').doc(roomId).get()
    const room = roomRes.data

    // Validate caller is a member
    if (!room.players.some(p => p.openid === OPENID)) {
      return { code: -1, message: '你不在该房间中' }
    }

    // Pull the player first
    const updates = { players: _.pull({ openid: OPENID }) }
    if (room.ownerId === OPENID) {
      const nextOwner = room.players.find(p => p.openid !== OPENID)
      if (nextOwner) updates.ownerId = nextOwner.openid
    }
    await db.collection('rooms').doc(roomId).update({ data: updates })

    // Re-read to check if empty
    const updatedRoomRes = await db.collection('rooms').doc(roomId).get()
    if (updatedRoomRes.data.players.length === 0) {
      await db.collection('rooms').doc(roomId).update({
        data: { status: 'dissolved', dissolvedAt: db.serverDate() }
      })
    }

    return { code: 0 }
  } catch (err) {
    console.error('leaveRoom error:', err)
    return { code: -1, message: err.message || '退出房间失败' }
  }
}
