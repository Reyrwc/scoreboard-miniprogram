const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { sortBy = 'winRate' } = event
  const allowedSorts = ['winRate', 'totalGames', 'netScore']
  const sortKey = allowedSorts.includes(sortBy) ? sortBy : 'winRate'

  try {
    // 1. 从历史记录中提取一起玩过的玩家
    const historyRes = await db.collection('history')
      .where({ 'players.openid': OPENID })
      .field({ players: true })
      .limit(100)
      .get()

    const friendSet = new Set()
    historyRes.data.forEach(h => {
      h.players.forEach(p => {
        if (p.openid !== OPENID) friendSet.add(p.openid)
      })
    })

    let users = []

    if (friendSet.size > 0) {
      // 2a. 有好友：批量查询好友的用户数据（in 查询限20个，分批）
      const friendOpenids = [...friendSet]
      const field = {
        _id: true,
        nickname: true,
        avatarUrl: true,
        totalGames: true,
        totalWins: true,
        totalWinScore: true,
        totalLoseScore: true
      }

      for (let i = 0; i < friendOpenids.length; i += 20) {
        const batch = friendOpenids.slice(i, i + 20)
        const res = await db.collection('users')
          .where({ _id: db.command.in(batch), totalGames: db.command.gt(0) })
          .field(field)
          .get()
        users.push(...res.data)
      }
    } else {
      // 2b. 没有好友：降级显示全平台排行
      const res = await db.collection('users')
        .where({ totalGames: db.command.gt(0) })
        .field({
          _id: true,
          nickname: true,
          avatarUrl: true,
          totalGames: true,
          totalWins: true,
          totalWinScore: true,
          totalLoseScore: true
        })
        .limit(100)
        .get()
      users = res.data
    }

    // 3. 计算统计数据并排序
    const result = users.map(u => ({
      ...u,
      winRate: parseFloat((u.totalWins / u.totalGames * 100).toFixed(1)),
      netScore: (u.totalWinScore || 0) - (u.totalLoseScore || 0)
    }))

    const sortFns = {
      winRate: (a, b) => b.winRate - a.winRate,
      totalGames: (a, b) => b.totalGames - a.totalGames,
      netScore: (a, b) => b.netScore - a.netScore
    }
    result.sort(sortFns[sortKey])

    return { code: 0, list: result, total: result.length }
  } catch (err) {
    console.error('getFriendsRank error:', err)
    return { code: -1, message: err.message || '获取排行榜失败' }
  }
}
