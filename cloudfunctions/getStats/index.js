const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  try {
    const userRes = await db.collection('users').doc(OPENID).get()
    const user = userRes.data

    const stats = {
      totalGames: user.totalGames || 0,
      totalWins: user.totalWins || 0,
      totalWinScore: user.totalWinScore || 0,
      totalLoseScore: user.totalLoseScore || 0,
      netScore: (user.totalWinScore || 0) - (user.totalLoseScore || 0),
      maxSingleWin: user.maxSingleWin || 0,
      maxStreak: user.maxStreak || 0,
      winRate: user.totalGames > 0 ? parseFloat(((user.totalWins / user.totalGames) * 100).toFixed(1)) : 0,
      avgScore: user.totalGames > 0 ? Math.round(((user.totalWinScore || 0) - (user.totalLoseScore || 0)) / user.totalGames) : 0
    }

    return { code: 0, stats }
  } catch (err) {
    console.error('getStats error:', err)
    return { code: -1, message: err.message || '获取统计失败' }
  }
}
