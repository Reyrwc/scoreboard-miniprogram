const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { roomId } = event

  try {
    if (!roomId) return { code: -1, message: '缺少房间ID' }

    const roomRes = await db.collection('rooms').doc(roomId).get()
    const room = roomRes.data

    if (room.ownerId !== OPENID) {
      return { code: -1, message: '只有房主可以解散房间' }
    }

    // 获取所有记分记录
    const scoresRes = await db.collection('scores').where({ roomId }).get()
    const scores = scoresRes.data

    // 计算最终排名
    const playerScores = {}
    room.players.forEach(p => { playerScores[p.openid] = 0 })
    scores.forEach(s => {
      if (playerScores[s.toOpenid] !== undefined) playerScores[s.toOpenid] += s.amount
      if (playerScores[s.fromOpenid] !== undefined) playerScores[s.fromOpenid] -= s.amount
    })

    const rankedPlayers = room.players.map(p => ({
      openid: p.openid,
      nickname: p.nickname,
      avatarUrl: p.avatarUrl,
      finalScore: playerScores[p.openid] || 0,
      rank: 0
    })).sort((a, b) => b.finalScore - a.finalScore)

    rankedPlayers.forEach((p, i) => { p.rank = i + 1 })

    // 创建历史记录
    const history = {
      roomId,
      roomName: room.name,
      playerCount: room.players.length,
      roundCount: room.currentRound,
      totalScores: scores.length,
      players: rankedPlayers,
      createdAt: room.createdAt,
      dissolvedAt: db.serverDate()
    }
    await db.collection('history').add({ data: history })

    // 更新房间状态
    await db.collection('rooms').doc(roomId).update({
      data: { status: 'dissolved', dissolvedAt: db.serverDate() }
    })

    // 更新用户统计
    await Promise.all(rankedPlayers.map(player => {
      const isWin = player.rank === 1
      const userUpdate = {
        totalGames: db.command.inc(1),
        totalWinScore: db.command.inc(Math.max(0, player.finalScore)),
        totalLoseScore: db.command.inc(Math.max(0, -player.finalScore)),
        updatedAt: db.serverDate()
      }
      if (isWin) userUpdate.totalWins = db.command.inc(1)
      return db.collection('users').doc(player.openid).update({ data: userUpdate })
    }))

    return { code: 0, history }
  } catch (err) {
    console.error('dissolveRoom error:', err)
    return { code: -1, message: err.message || '解散房间失败' }
  }
}
