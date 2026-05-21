const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 定时清理过期房间（每分钟触发一次）
// 解决：用户退出小程序后房间永远不会被解散的问题
exports.main = async (event, context) => {
  try {
    const cutoff = new Date(Date.now() - 2 * 60 * 1000)

    // 查找所有 active 且超过 2 分钟无记分的房间
    // 用 createdAt 筛选：房间创建超过 2 分钟的才需要检查
    // 函数内部再根据 lastScoreAt 判断是否真正过期
    const { data: rooms } = await db.collection('rooms')
      .where({
        status: 'active',
        createdAt: _.lt(cutoff)
      })
      .limit(100)
      .get()

    if (rooms.length === 0) return { code: 0, dissolved: 0 }

    let dissolvedCount = 0

    for (const room of rooms) {
      try {
        // 精确判断：根据 lastScoreAt 确认是否真的过期
        const refTime = room.lastScoreAt || room.createdAt
        const lastScore = refTime instanceof Date
          ? refTime.getTime()
          : new Date(refTime).getTime()
        if (lastScore && !isNaN(lastScore) && Date.now() - lastScore <= 2 * 60 * 1000) {
          continue // 最近有记分活动，跳过
        }
        // 原子抢锁：将 status 从 active 改为 dissolved
        const claimRes = await db.collection('rooms').where({
          _id: room._id, status: 'active'
        }).update({
          data: { status: 'dissolved', dissolvedAt: db.serverDate() }
        })
        if (claimRes.stats.updated === 0) continue // 已被其他调用处理

        // 获取记分记录
        const { data: scoresData } = await db.collection('scores')
          .where({ roomId: room._id })
          .get()

        const allPlayers = room.allPlayers || room.players

        // 计算排名
        const playerScores = {}
        allPlayers.forEach(p => { playerScores[p.openid] = 0 })
        scoresData.forEach(s => {
          if (playerScores[s.toOpenid] !== undefined) playerScores[s.toOpenid] += s.amount
          if (playerScores[s.fromOpenid] !== undefined) playerScores[s.fromOpenid] -= s.amount
        })

        const rankedPlayers = allPlayers.map(p => ({
          openid: p.openid,
          nickname: p.nickname,
          avatarUrl: p.avatarUrl,
          finalScore: playerScores[p.openid] || 0,
          rank: 0
        })).sort((a, b) => b.finalScore - a.finalScore)
        rankedPlayers.forEach((p, i) => { p.rank = i + 1 })

        // 写入历史记录
        await db.collection('history').add({
          data: {
            roomId: room._id,
            roomName: room.name,
            playerCount: allPlayers.length,
            roundCount: room.currentRound,
            totalScores: scoresData.length,
            players: rankedPlayers,
            createdAt: room.createdAt,
            dissolvedAt: db.serverDate()
          }
        })

        // 更新用户统计
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

        dissolvedCount++
      } catch (err) {
        console.error(`清理房间 ${room._id} 失败:`, err)
      }
    }

    return { code: 0, dissolved: dissolvedCount }
  } catch (err) {
    console.error('cleanExpiredRooms error:', err)
    return { code: -1, message: err.message }
  }
}
