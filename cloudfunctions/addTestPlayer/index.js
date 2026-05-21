const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { roomId } = event

  if (!roomId) {
    return { code: -1, message: '缺少房间ID' }
  }

  try {
    // 获取房间信息
    const roomRes = await db.collection('rooms').doc(roomId).get()
    const room = roomRes.data

    if (room.status !== 'active') {
      return { code: -1, message: '房间已结束' }
    }

    if (room.players.length >= 20) {
      return { code: -1, message: '房间人数已满' }
    }

    // 生成测试玩家
    const testId = 'test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)
    const names = ['测试A', '测试B', '测试C', '测试D', '测试E', '测试F']
    const nameIndex = room.players.length - 1  // 减去房主
    const nickname = names[nameIndex % names.length] + '_' + testId.substr(-4)

    const testPlayer = {
      openid: testId,
      nickname: nickname,
      avatarUrl: '',
      joinedAt: new Date()
    }

    // 添加测试玩家到房间
    await db.collection('rooms').doc(roomId).update({
      data: {
        players: _.push(testPlayer)
      }
    })

    return { code: 0, message: '添加成功', player: testPlayer }
  } catch (err) {
    console.error('添加测试玩家失败:', err)
    return { code: -1, message: err.message || '添加失败' }
  }
}
