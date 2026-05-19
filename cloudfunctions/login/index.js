const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const DEFAULT_AVATARS = [
  '/static/avatars/cat.jpg',
  '/static/avatars/dog.jpg',
  '/static/avatars/panda.jpg',
  '/static/avatars/rabbit.jpg'
]

function generateNickname() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let suffix = ''
  for (let i = 0; i < 5; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return '微信用户_' + suffix
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  try {
    const userRes = await db.collection('users').doc(OPENID).get()
    return { code: 0, openid: OPENID, user: userRes.data }
  } catch (err) {
    const randomAvatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]
    const nickname = generateNickname()

    const newUser = {
      _id: OPENID,
      nickname,
      avatarUrl: randomAvatar,
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
