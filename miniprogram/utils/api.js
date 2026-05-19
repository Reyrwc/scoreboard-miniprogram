/**
 * 云函数调用封装
 */

/**
 * 通用云函数调用
 * @param {string} name 云函数名
 * @param {object} data 参数
 * @returns {Promise}
 */
const callFunction = (name, data = {}) => {
  return wx.cloud.callFunction({
    name,
    data,
  }).then(res => {
    if (res.result) {
      // 如果云函数返回了明确的错误码，抛出错误
      if (res.result.code !== undefined && res.result.code !== 0) {
        const err = new Error(res.result.message || '云函数调用失败')
        err.code = res.result.code
        throw err
      }
      return res.result
    }
    return res
  }).catch(err => {
    console.error(`[云函数 ${name}] 调用失败:`, err)
    throw err
  })
}

/**
 * 用户登录
 * @param {object} data { code }
 */
const login = (data) => {
  return callFunction('login', data)
}

/**
 * 获取用户信息
 */
const getUserInfo = () => {
  return callFunction('getUserInfo')
}

/**
 * 创建房间
 * @param {object} data { roomName, players }
 */
const createRoom = (data) => {
  return callFunction('createRoom', data)
}

/**
 * 加入房间
 * @param {object} data { roomCode }
 */
const joinRoom = (data) => {
  return callFunction('joinRoom', data)
}

/**
 * 获取房间信息
 * @param {object} data { roomId }
 */
const getRoomInfo = (data) => {
  return callFunction('getRoomInfo', data)
}

/**
 * 添加得分
 * @param {object} data { roomId, playerId, score, roundIndex }
 */
const addScore = (data) => {
  return callFunction('addScore', data)
}

/**
 * 下一轮
 * @param {object} data { roomId }
 */
const nextRound = (data) => {
  return callFunction('nextRound', data)
}

/**
 * 解散房间
 * @param {object} data { roomId }
 */
const dissolveRoom = (data) => {
  return callFunction('dissolveRoom', data)
}

/**
 * 离开房间
 * @param {object} data { roomId }
 */
const leaveRoom = (data) => {
  return callFunction('leaveRoom', data)
}

/**
 * 获取历史记录
 * @param {object} data { page, pageSize }
 */
const getHistory = (data) => {
  return callFunction('getHistory', data)
}

/**
 * 获取统计数据
 * @param {object} data { period }
 */
const getStats = (data) => {
  return callFunction('getStats', data)
}

/**
 * 获取好友排行榜
 * @param {object} data { sortBy }
 */
const getFriendsRank = (data) => {
  return callFunction('getFriendsRank', data)
}

/**
 * 更新用户信息
 * @param {object} data { nickname, avatarUrl }
 */
const updateUserInfo = (data) => {
  return callFunction('updateUserInfo', data)
}

/**
 * 添加测试玩家（调试用）
 * @param {object} data { roomId }
 */
const addTestPlayer = (data) => {
  return callFunction('addTestPlayer', data)
}

module.exports = {
  callFunction,
  login,
  getUserInfo,
  createRoom,
  joinRoom,
  getRoomInfo,
  addScore,
  nextRound,
  dissolveRoom,
  leaveRoom,
  getHistory,
  getStats,
  getFriendsRank,
  updateUserInfo,
  addTestPlayer,
}
