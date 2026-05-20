const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  try {
    const res = await db.collection('users').doc(OPENID).get()

    // 检查用户是否在活跃房间中
    let activeRoom = null
    try {
      const roomRes = await db.collection('rooms')
        .where({
          status: 'active',
          'players.openid': OPENID
        })
        .limit(1)
        .get()

      if (roomRes.data && roomRes.data.length > 0) {
        const room = roomRes.data[0]
        // 检查是否已过期（2分钟无记分）
        const lastScore = room.lastScoreAt instanceof Date
          ? room.lastScoreAt.getTime()
          : new Date(room.lastScoreAt).getTime()
        if (Date.now() - lastScore > 2 * 60 * 1000) {
          await db.collection('rooms').doc(room._id).update({
            data: { status: 'dissolved', dissolvedAt: db.serverDate() }
          })
        } else {
          activeRoom = {
            _id: room._id,
            name: room.name,
            playerCount: room.players.length
          }
        }
      }
    } catch (roomErr) {
      console.error('检查活跃房间失败:', roomErr)
    }

    return { code: 0, user: res.data, activeRoom }
  } catch (err) {
    return { code: 0, user: null, activeRoom: null }
  }
}
