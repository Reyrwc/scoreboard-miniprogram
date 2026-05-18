const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { sortBy = 'winRate' } = event
  const allowedSorts = ['winRate', 'totalGames', 'netScore']
  const sortKey = allowedSorts.includes(sortBy) ? sortBy : 'winRate'

  try {
    const usersRes = await db.collection('users')
      .where({ totalGames: db.command.gt(0) })
      .field({
        _id: true,
        nickname: true,
        totalGames: true,
        totalWins: true,
        totalWinScore: true,
        totalLoseScore: true
      })
      .limit(100)
      .get()

    const users = usersRes.data.map(u => ({
      ...u,
      winRate: parseFloat((u.totalWins / u.totalGames * 100).toFixed(1)),
      netScore: (u.totalWinScore || 0) - (u.totalLoseScore || 0)
    }))

    const sortFns = {
      winRate: (a, b) => b.winRate - a.winRate,
      totalGames: (a, b) => b.totalGames - a.totalGames,
      netScore: (a, b) => b.netScore - a.netScore
    }
    users.sort(sortFns[sortKey])

    return { code: 0, list: users, total: users.length }
  } catch (err) {
    console.error('getFriendsRank error:', err)
    return { code: -1, message: err.message || '获取排行榜失败' }
  }
}
