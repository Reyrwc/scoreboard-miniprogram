const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  try {
    // 尝试获取已有用户
    const userRes = await db.collection('users').doc(OPENID).get()
    return { code: 0, openid: OPENID, user: userRes.data }
  } catch (err) {
    // 用户不存在，创建新用户
    const newUser = {
      _id: OPENID,
      nickname: '',
      avatarUrl: '',
      totalGames: 0,
      totalWins: 0,
      totalWinScore: 0,
      totalLoseScore: 0,
      maxSingleWin: 0,
      maxStreak: 0,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
    await db.collection('users').add({ data: newUser })
    return { code: 0, openid: OPENID, user: newUser }
  }
}
