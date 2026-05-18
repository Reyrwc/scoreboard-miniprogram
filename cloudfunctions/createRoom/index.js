const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  // 检查用户是否已在其他活跃房间
  const existing = await db.collection('rooms').where({
    'players.openid': OPENID,
    status: 'active'
  }).get()

  if (existing.data.length > 0) {
    return { code: -1, message: '你已在其他房间中，请先退出' }
  }

  // 获取用户信息
  const userRes = await db.collection('users').doc(OPENID).get()
  const user = userRes.data

  // 创建房间
  const room = {
    name: `${user.nickname || '玩家'}的房间`,
    ownerId: OPENID,
    players: [{
      openid: OPENID,
      nickname: user.nickname || '玩家',
      avatarUrl: user.avatarUrl || '',
      joinedAt: new Date()
    }],
    currentRound: 0,
    lastNextRoundTime: null,
    status: 'active',
    createdAt: db.serverDate(),
    lastScoreAt: db.serverDate(),
    dissolvedAt: null
  }

  const res = await db.collection('rooms').add({ data: room })
  room._id = res._id

  return { code: 0, room }
}
