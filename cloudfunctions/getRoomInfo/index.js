const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { roomId } = event

  try {
    const roomRes = await db.collection('rooms').doc(roomId).get()
    const room = roomRes.data

    // 检查自动解散 (30分钟无记分)
    if (room.status === 'active') {
      const lastScore = room.lastScoreAt instanceof Date
        ? room.lastScoreAt.getTime()
        : new Date(room.lastScoreAt).getTime()
      const now = Date.now()
      if (now - lastScore > 30 * 60 * 1000) {
        await db.collection('rooms').doc(roomId).update({
          data: { status: 'dissolved', dissolvedAt: db.serverDate() }
        })
        room.status = 'dissolved'
        return { code: 0, room, scores: [], rankings: [] }
      }
    }

    // 获取当前局记分记录
    const scoresRes = await db.collection('scores').where({
      roomId,
      roundNum: room.currentRound
    }).orderBy('createdAt', 'desc').get()

    // 计算排名
    const rankings = room.players.map(p => {
      const totalScore = scoresRes.data
        .filter(s => s.toOpenid === p.openid)
        .reduce((sum, s) => sum + s.amount, 0)
        - scoresRes.data
        .filter(s => s.fromOpenid === p.openid)
        .reduce((sum, s) => sum + s.amount, 0)
      return { ...p, score: totalScore }
    }).sort((a, b) => b.score - a.score)

    return { code: 0, room, scores: scoresRes.data, rankings }
  } catch (err) {
    return { code: -1, message: '房间不存在' }
  }
}
