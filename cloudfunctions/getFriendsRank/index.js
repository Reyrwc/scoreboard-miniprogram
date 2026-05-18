const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { sortBy = 'winRate' } = event

  try {
    const usersRes = await db.collection('users')
      .where({ totalGames: db.command.gt(0) })
      .get()

    const users = usersRes.data.map(u => ({
      ...u,
      winRate: u.totalGames > 0 ? parseFloat((u.totalWins / u.totalGames * 100).toFixed(1)) : 0,
      netScore: (u.totalWinScore || 0) - (u.totalLoseScore || 0)
    }))

    const sortFns = {
      winRate: (a, b) => b.winRate - a.winRate,
      totalGames: (a, b) => b.totalGames - a.totalGames,
      netScore: (a, b) => b.netScore - a.netScore
    }
    users.sort(sortFns[sortBy] || sortFns.winRate)

    return { code: 0, list: users, total: users.length }
  } catch (err) {
    console.error('getFriendsRank error:', err)
    return { code: -1, message: err.message || '获取排行榜失败' }
  }
}
