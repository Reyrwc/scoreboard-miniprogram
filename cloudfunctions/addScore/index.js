const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { roomId, toOpenid, amount, note } = event

  try {
    // 验证参数
    if (!roomId || !toOpenid || !amount || amount <= 0) {
      return { code: -1, message: '参数错误' }
    }
    if (OPENID === toOpenid) {
      return { code: -1, message: '不能给自己加分' }
    }

    // 获取房间信息
    const roomRes = await db.collection('rooms').doc(roomId).get()
    const room = roomRes.data

    if (room.status !== 'active') {
      return { code: -1, message: '房间已结束' }
    }

    // 验证双方都在房间内
    const fromInRoom = room.players.some(p => p.openid === OPENID)
    const toInRoom = room.players.some(p => p.openid === toOpenid)
    if (!fromInRoom || !toInRoom) {
      return { code: -1, message: '玩家不在房间内' }
    }

    // 获取双方昵称
    const toPlayer = room.players.find(p => p.openid === toOpenid)
    const fromPlayer = room.players.find(p => p.openid === OPENID)

    // 创建记分记录
    const score = {
      roomId,
      roundNum: room.currentRound,
      fromOpenid: OPENID,
      fromNickname: fromPlayer.nickname || '玩家',
      toOpenid,
      toNickname: toPlayer.nickname || '玩家',
      amount: parseFloat(amount),
      note: note || '',
      createdAt: db.serverDate()
    }

    await db.collection('scores').add({ data: score })

    // 更新房间最后记分时间
    await db.collection('rooms').doc(roomId).update({
      data: { lastScoreAt: db.serverDate() }
    })

    return { code: 0, score }
  } catch (err) {
    return { code: -1, message: '记分失败，请重试' }
  }
}
