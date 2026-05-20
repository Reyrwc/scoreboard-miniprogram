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
          // 保存历史记录 + 更新用户统计
          const scoresForHistory = await db.collection('scores').where({ roomId: room._id }).get()
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
              roomId: room._id, roomName: room.name, playerCount: room.players.length,
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
