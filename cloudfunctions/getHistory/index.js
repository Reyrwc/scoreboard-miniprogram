const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { page = 1, pageSize = 20, roomId } = event

  try {
    // Single record lookup by roomId
    if (roomId) {
      const res = await db.collection('history').where({
        roomId,
        'players.openid': OPENID
      }).limit(1).get()
      return {
        code: 0,
        list: res.data,
        total: res.data.length
      }
    }

    // Existing pagination logic
    const countRes = await db.collection('history').where({
      'players.openid': OPENID
    }).count()

    const historyRes = await db.collection('history').where({
      'players.openid': OPENID
    }).orderBy('dissolvedAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      code: 0,
      list: historyRes.data,
      total: countRes.total
    }
  } catch (err) {
    console.error('getHistory error:', err)
    return { code: -1, message: err.message || '获取历史记录失败' }
  }
}
