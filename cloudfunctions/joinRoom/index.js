const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { roomId } = event

  try {
    // 检查用户是否已在其他活跃房间（排除 inactive 玩家）
    const existing = await db.collection('rooms').where({
      players: _.elemMatch({ openid: OPENID, active: _.neq(false) }),
      status: 'active'
    }).get()

    if (existing.data.length > 0 && existing.data[0]._id !== roomId) {
      return { code: -1, message: '你已在其他房间中，请先退出' }
    }

    // 获取房间信息
    const roomRes = await db.collection('rooms').doc(roomId).get()
    const room = roomRes.data

    if (room.status !== 'active') {
      return { code: -1, message: '房间已解散' }
    }

    // 检查是否已在房间内且为活跃状态
    const existingPlayer = room.players.find(p => p.openid === OPENID)
    if (existingPlayer && existingPlayer.active !== false) {
      return { code: 0, room }
    }

    // 已退出的用户重新加入，标记为 active
    if (existingPlayer && existingPlayer.active === false) {
      const updatedPlayers = room.players.map(p => {
        if (p.openid === OPENID) return { ...p, active: true }
        return p
      })
      await db.collection('rooms').doc(roomId).update({
        data: { players: updatedPlayers }
      })
      const updatedRoom = await db.collection('rooms').doc(roomId).get()
      return { code: 0, room: updatedRoom.data }
    }

    // 检查人数上限（只计活跃玩家）
    const activeCount = room.players.filter(p => p.active !== false).length
    if (activeCount >= 20) {
      return { code: -1, message: '房间已满（最多20人）' }
    }

    // 获取用户信息
    const userRes = await db.collection('users').doc(OPENID).get()
    const user = userRes.data

    // 新用户加入房间
    const playerData = {
      openid: OPENID,
      nickname: user.nickname || '玩家',
      avatarUrl: user.avatarUrl || '',
      joinedAt: new Date(),
      active: true
    }
    await db.collection('rooms').doc(roomId).update({
      data: {
        players: _.push(playerData),
        allPlayers: _.push(playerData)
      }
    })

    // 获取更新后的房间信息
    const updatedRoom = await db.collection('rooms').doc(roomId).get()
    return { code: 0, room: updatedRoom.data }
  } catch (err) {
    return { code: -1, message: '加入房间失败，请重试' }
  }
}
