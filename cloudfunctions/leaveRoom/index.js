const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

async function dissolveWithHistory(room, roomId) {
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

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { roomId } = event

  try {
    if (!roomId) return { code: -1, message: '缺少房间ID' }

    const roomRes = await db.collection('rooms').doc(roomId).get()
    const room = roomRes.data

    // Validate caller is an active member
    const me = room.players.find(p => p.openid === OPENID)
    if (!me || me.active === false) {
      return { code: -1, message: '你不在该房间中' }
    }

    // 标记玩家为 inactive（read-modify-write，保留信息供其他人记分）
    const updatedPlayers = room.players.map(p => {
      if (p.openid === OPENID) return { ...p, active: false }
      return p
    })
    await db.collection('rooms').doc(roomId).update({
      data: { players: updatedPlayers }
    })

    // 最后一个活跃玩家退出，直接解散
    const hasActivePlayers = updatedPlayers.some(p => p.active !== false)
    if (!hasActivePlayers) {
      // 二次确认房间仍为 active（防止与 getUserInfo 并发解散导致重复历史）
      const freshRoom = await db.collection('rooms').doc(roomId).get()
      if (freshRoom.data.status === 'active') {
        await dissolveWithHistory(room, roomId)
      }
      return { code: 0 }
    }

    // 还有玩家在房间，检查是否已过期（2分钟无记分）
    const refTime = room.lastScoreAt || room.createdAt
    const lastScore = refTime instanceof Date ? refTime.getTime() : new Date(refTime).getTime()
    if (lastScore && !isNaN(lastScore) && Date.now() - lastScore > 2 * 60 * 1000) {
      // 二次确认房间仍为 active（防止与 getUserInfo 并发解散导致重复历史）
      const freshRoom = await db.collection('rooms').doc(roomId).get()
      if (freshRoom.data.status === 'active') {
        await dissolveWithHistory(room, roomId)
      }
    }

    return { code: 0 }
  } catch (err) {
    console.error('leaveRoom error:', err)
    return { code: -1, message: err.message || '退出房间失败' }
  }
}
