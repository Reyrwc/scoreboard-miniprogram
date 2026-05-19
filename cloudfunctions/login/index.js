const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { nickname, avatarUrl } = event

  try {
    // 尝试获取已有用户
    const userRes = await db.collection('users').doc(OPENID).get()
    const user = userRes.data

    // 如果传了用户信息且原数据为空，更新
    if (nickname && !user.nickname) {
      await db.collection('users').doc(OPENID).update({
        data: {
          nickname,
          avatarUrl: avatarUrl || '',
          updatedAt: db.serverDate()
        }
      })
      user.nickname = nickname
      user.avatarUrl = avatarUrl || ''
    }

    return { code: 0, openid: OPENID, user }
  } catch (err) {
    // 用户不存在，创建新用户
    const newUser = {
      _id: OPENID,
      nickname: nickname || '',
      avatarUrl: avatarUrl || '',
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
