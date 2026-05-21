const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    const { OPENID } = cloud.getWXContext()

    // 检查用户是否已在其他活跃房间（排除 inactive 玩家）
    const existing = await db.collection('rooms').where({
      players: _.elemMatch({ openid: OPENID, active: _.neq(false) }),
      status: 'active'
    }).get()

    if (existing.data.length > 0) {
      return { code: -1, message: '你已在其他房间中，请先退出' }
    }

    // 获取用户信息
    const userRes = await db.collection('users').doc(OPENID).get()
    const user = userRes.data

    // 随机房间名
    const roomNames = [
      '快乐老家','今晚不睡','等你来战','一起开黑','四缺一呀',
      '赢了请客','半夜开团','摸鱼基地','谁最强呀','别跑没完',
      '赢麻了呀','今晚通宵','刺激战场','最后一局','来把大的',
      '今天手气','战斗开始','上号上号','来了就赢','不见不散'
    ]
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let suffix = ''
    for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
    const roomName = roomNames[Math.floor(Math.random() * roomNames.length)] + suffix

    // 创建房间
    const creator = {
      openid: OPENID,
      nickname: user.nickname || '玩家',
      avatarUrl: user.avatarUrl || '',
      joinedAt: new Date()
    }
    const room = {
      name: roomName,
      ownerId: OPENID,
      players: [creator],
      allPlayers: [creator],
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
  } catch (err) {
    return { code: -1, message: '创建房间失败，请重试' }
  }
}
