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

    // Pull the player, clear owner if needed
    const updates = { players: _.pull({ openid: OPENID }) }
    if (room.ownerId === OPENID) {
      updates.ownerId = ''
    }
    await db.collection('rooms').doc(roomId).update({ data: updates })

    // Re-read to check if empty (last person left)
    const updatedRoomRes = await db.collection('rooms').doc(roomId).get()
    if (updatedRoomRes.data.players.length === 0) {
      // 最后一人退出，解散并保存历史
      const scoresRes = await db.collection('scores').where({ roomId }).get()
      const scoresData = scoresRes.data
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
