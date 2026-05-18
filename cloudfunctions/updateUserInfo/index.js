const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { nickname, avatarUrl } = event

  try {
    const updates = { updatedAt: db.serverDate() }

    if (nickname !== undefined && nickname !== null) {
      const trimmed = String(nickname).trim()
      if (trimmed.length > 20) {
        return { code: -1, message: '昵称不能超过20个字符' }
      }
      updates.nickname = trimmed
    }

    if (avatarUrl !== undefined && avatarUrl !== null) {
      updates.avatarUrl = avatarUrl
    }

    await db.collection('users').doc(OPENID).update({ data: updates })
    return { code: 0 }
  } catch (err) {
    console.error('updateUserInfo error:', err)
    return { code: -1, message: err.message || '更新用户信息失败' }
  }
}
