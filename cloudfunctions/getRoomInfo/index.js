const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
// 房间无记分自动解散时间（毫秒）— 与其他云函数保持一致
const ROOM_EXPIRE_MS = 10 * 60 * 1000

exports.main = async (event, context) => {
  const { roomId } = event

  try {
    const roomRes = await db.collection('rooms').doc(roomId).get()
    const room = roomRes.data

    // 检查自动解散 (10分钟无记分)
    if (room.status === 'active') {
      const refTime = room.lastScoreAt || room.createdAt
      const lastScore = refTime instanceof Date
        ? refTime.getTime()
        : new Date(refTime).getTime()
      const now = Date.now()
      if (!lastScore || isNaN(lastScore) || now - lastScore > ROOM_EXPIRE_MS) {
        // 原子抢锁：只有第一个成功的调用才写 history
        const claimRes = await db.collection('rooms').where({
          _id: roomId, status: 'active'
        }).update({
          data: { status: 'dissolved', dissolvedAt: db.serverDate() }
        })
        if (claimRes.stats.updated > 0) {
          // 抢到锁，写入历史记录
          const scoresForHistory = await db.collection('scores').where({ roomId }).get()
          const scoresData = scoresForHistory.data
          const allPlayers = room.allPlayers || room.players
          const playerScores = {}
          allPlayers.forEach(p => { playerScores[p.openid] = 0 })
          scoresData.forEach(s => {
            if (playerScores[s.toOpenid] !== undefined) playerScores[s.toOpenid] += s.amount
            if (playerScores[s.fromOpenid] !== undefined) playerScores[s.fromOpenid] -= s.amount
          })
          const rankedPlayers = allPlayers.map(p => ({
            openid: p.openid, nickname: p.nickname, avatarUrl: p.avatarUrl,
            finalScore: playerScores[p.openid] || 0, rank: 0
          })).sort((a, b) => b.finalScore - a.finalScore)
          rankedPlayers.forEach((p, i) => { p.rank = i + 1 })
          await db.collection('history').add({
            data: {
              roomId, roomName: room.name, playerCount: allPlayers.length,
              roundCount: room.currentRound, totalScores: scoresData.length,
              players: rankedPlayers,
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
        }
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
