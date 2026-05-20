const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { roomId } = event

  try {
    const roomRes = await db.collection('rooms').doc(roomId).get()
    const room = roomRes.data

    // 检查自动解散 (2分钟无记分，测试用)
    if (room.status === 'active') {
      const refTime = room.lastScoreAt || room.createdAt
      const lastScore = refTime instanceof Date
        ? refTime.getTime()
        : new Date(refTime).getTime()
      const now = Date.now()
      if (!lastScore || isNaN(lastScore) || now - lastScore > 2 * 60 * 1000) {
        // 保存历史记录 + 更新用户统计（与 dissolveRoom 一致）
        const scoresForHistory = await db.collection('scores').where({ roomId }).get()
        const scoresData = scoresForHistory.data
        const playerScores = {}
        room.players.forEach(p => { playerScores[p.openid] = 0 })
        scoresData.forEach(s => {
          if (playerScores[s.toOpenid] !== undefined) playerScores[s.toOpenid] += s.amount
          if (playerScores[s.fromOpenid] !== undefined) playerScores[s.fromOpenid] -= s.amount
        })
        const rankedPlayers = room.players.map(p => ({
          openid: p.openid, nickname: p.nickname, avatarUrl: p.avatarUrl,
          finalScore: playerScores[p.openid] || 0, rank: 0
        })).sort((a, b) => b.finalScore - a.finalScore)
        rankedPlayers.forEach((p, i) => { p.rank = i + 1 })
        await db.collection('history').add({
          data: {
            roomId, roomName: room.name, playerCount: room.players.length,
            roundCount: room.currentRound, players: rankedPlayers,
            createdAt: room.createdAt, dissolvedAt: db.serverDate()
          }
        })
        await Promise.all(rankedPlayers.map(player => {
          const isWin = player.rank === 1
          const u = {
            totalGames: db.command.inc(1),
            totalWinScore: db.command.inc(Math.max(0, player.finalScore)),
            totalLoseScore: db.command.inc(Math.max(0, -player.finalScore)),
            updatedAt: db.serverDate()
          }
          if (isWin) u.totalWins = db.command.inc(1)
          return db.collection('users').doc(player.openid).update({ data: u })
        }))
        await db.collection('rooms').doc(roomId).update({
          data: { status: 'dissolved', dissolvedAt: db.serverDate() }
        })
        room.status = 'dissolved'
        return { code: 0, room, scores: [], rankings: [] }
      }
    }

    // 获取所有记分记录
    const scoresRes = await db.collection('scores').where({
      roomId
    }).orderBy('createdAt', 'desc').limit(100).get()

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
