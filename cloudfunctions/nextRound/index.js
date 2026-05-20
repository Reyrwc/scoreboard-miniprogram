const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { roomId } = event

  try {
    const roomRes = await db.collection('rooms').doc(roomId).get()
    const { currentRound, lastNextRoundTime } = roomRes.data

    // 检查：1分钟内再次点击无效
    if (lastNextRoundTime) {
      const lastTime = lastNextRoundTime instanceof Date
        ? lastNextRoundTime.getTime()
        : new Date(lastNextRoundTime).getTime()
      const diff = Date.now() - lastTime
      if (diff < 60000) {
        return { code: -1, message: '已有人点击，一分钟后再试' }
      }
    }

    // 检查：房间至少有1条记分记录才能进入下一局
    const scores = await db.collection('scores')
      .where({ roomId })
      .limit(1)
      .get()
    if (scores.data.length === 0) {
      return { code: -1, message: '请先记分再开始下一局' }
    }

    // 更新局数 + 记录时间
    await db.collection('rooms').doc(roomId).update({
      data: {
        currentRound: currentRound + 1,
        lastNextRoundTime: db.serverDate()
      }
    })

    return { code: 0, currentRound: currentRound + 1 }
  } catch (err) {
    return { code: -1, message: '操作失败，请重试' }
  }
}
