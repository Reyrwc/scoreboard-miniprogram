const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const JWT_SECRET = process.env.JWT_SECRET || 'scoreboard-admin-secret-dev'

// 统一响应
const ok = (data) => ({ code: 0, data, message: 'ok' })
const fail = (code, message) => ({ code, message })

// 鉴权 — 支持从 Authorization header（HTTP 触发器）或 event.token（SDK 调用）读取
function verifyToken(event) {
  const token = (event.authorization || event.Authorization || '').replace('Bearer ', '') || event.token
  if (!token) return null
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

// ---- Action Handlers ----

async function getDashboard() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 总用户数
  const usersCount = await db.collection('users').count()

  // 总房间数
  const roomsCount = await db.collection('rooms').count()

  // 今日活跃房间（今日有记分操作）
  const todayActive = await db.collection('rooms').where({
    lastScoreAt: _.gte(today)
  }).count()

  // 近 30 天用户增长趋势
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const allUsers = await db.collection('users').where({
    createdAt: _.gte(thirtyDaysAgo)
  }).orderBy('createdAt', 'asc').get()

  const userTrend = aggregateByDate(allUsers.data, thirtyDaysAgo, today)

  // 近 30 天房间增长趋势
  const allRooms = await db.collection('rooms').where({
    createdAt: _.gte(thirtyDaysAgo)
  }).orderBy('createdAt', 'asc').get()

  const roomTrend = aggregateByDate(allRooms.data, thirtyDaysAgo, today)

  return ok({
    totalUsers: usersCount.total,
    totalRooms: roomsCount.total,
    todayActiveRooms: todayActive.total,
    userTrend,
    roomTrend
  })
}

function aggregateByDate(records, startDate, endDate) {
  const dateMap = {}
  const d = new Date(startDate)
  while (d <= endDate) {
    const key = d.toISOString().slice(0, 10)
    dateMap[key] = 0
    d.setDate(d.getDate() + 1)
  }
  records.forEach(r => {
    const date = r.createdAt
    const key = (date instanceof Date ? date : new Date(date)).toISOString().slice(0, 10)
    if (dateMap[key] !== undefined) dateMap[key]++
  })
  return Object.entries(dateMap).map(([date, count]) => ({ date, count }))
}

async function getUsers(params) {
  const { page = 1, pageSize = 20, keyword } = params
  const skip = (page - 1) * pageSize

  let query = {}
  if (keyword) {
    query = _.or([
      { nickname: db.RegExp({ regexp: keyword, options: 'i' }) },
      { _id: db.RegExp({ regexp: keyword, options: 'i' }) }
    ])
  }

  const countRes = await db.collection('users').where(query).count()
  const listRes = await db.collection('users').where(query)
    .orderBy('createdAt', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  return ok({
    list: listRes.data,
    total: countRes.total
  })
}

async function banUser(params) {
  const { openid, banned, reason = '' } = params
  if (!openid || banned === undefined) {
    return fail(-1, '缺少参数')
  }

  const updateData = { banned }
  if (banned) {
    updateData.bannedAt = db.serverDate()
    updateData.bannedReason = reason
  } else {
    updateData.bannedAt = null
    updateData.bannedReason = ''
  }

  await db.collection('users').doc(openid).update({ data: updateData })
  return ok({ success: true })
}

async function getRooms(params) {
  const { page = 1, pageSize = 20, keyword, status } = params
  const skip = (page - 1) * pageSize

  let query = {}
  if (keyword) {
    query.name = db.RegExp({ regexp: keyword, options: 'i' })
  }
  if (status && status !== 'all') {
    query.status = status
  }

  const countRes = await db.collection('rooms').where(query).count()
  const listRes = await db.collection('rooms').where(query)
    .orderBy('createdAt', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  return ok({
    list: listRes.data,
    total: countRes.total
  })
}

async function getRoomDetail(params) {
  const { roomId } = params
  if (!roomId) return fail(-1, '缺少房间ID')

  const roomRes = await db.collection('rooms').doc(roomId).get()
  const room = roomRes.data

  const scoresRes = await db.collection('scores').where({ roomId })
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()

  return ok({
    room,
    scores: scoresRes.data
  })
}

async function handleDissolveRoom(params) {
  const { roomId } = params
  if (!roomId) return fail(-1, '缺少房间ID')

  const roomRes = await db.collection('rooms').doc(roomId).get()
  const room = roomRes.data

  if (room.status !== 'active') {
    return fail(-1, '房间已解散')
  }

  // 复用 dissolveRoom 的核心逻辑
  const scoresRes = await db.collection('scores').where({ roomId }).get()
  const scores = scoresRes.data
  const allPlayers = room.allPlayers || room.players

  // 计算排名
  const playerScores = {}
  allPlayers.forEach(p => { playerScores[p.openid] = 0 })
  scores.forEach(s => {
    if (playerScores[s.toOpenid] !== undefined) playerScores[s.toOpenid] += s.amount
    if (playerScores[s.fromOpenid] !== undefined) playerScores[s.fromOpenid] -= s.amount
  })

  const rankedPlayers = allPlayers.map(p => ({
    openid: p.openid,
    nickname: p.nickname,
    avatarUrl: p.avatarUrl,
    finalScore: playerScores[p.openid] || 0,
    rank: 0
  })).sort((a, b) => b.finalScore - a.finalScore)
  rankedPlayers.forEach((p, i) => { p.rank = i + 1 })

  // 原子抢锁
  const claimRes = await db.collection('rooms').where({
    _id: roomId, status: 'active'
  }).update({
    data: { status: 'dissolved', dissolvedAt: db.serverDate() }
  })
  if (claimRes.stats.updated === 0) {
    return ok({ success: true, message: '房间已解散' })
  }

  // 创建历史记录
  const history = {
    roomId,
    roomName: room.name,
    playerCount: allPlayers.length,
    roundCount: room.currentRound,
    totalScores: scores.length,
    players: rankedPlayers,
    createdAt: room.createdAt,
    dissolvedAt: db.serverDate()
  }
  await db.collection('history').add({ data: history })

  // 更新用户统计
  await Promise.all(rankedPlayers.map(player => {
    const isWin = player.rank === 1
    const userUpdate = {
      totalGames: _.inc(1),
      totalWinScore: _.inc(Math.max(0, player.finalScore)),
      totalLoseScore: _.inc(Math.max(0, -player.finalScore)),
      updatedAt: db.serverDate()
    }
    if (isWin) userUpdate.totalWins = _.inc(1)
    return db.collection('users').doc(player.openid).update({ data: userUpdate })
  }))

  return ok({ success: true })
}

// ---- Router ----

const ACTIONS = {
  getDashboard,
  getUsers,
  banUser,
  getRooms,
  getRoomDetail,
  dissolveRoom: handleDissolveRoom
}

exports.main = async (event, context) => {
  // 鉴权
  const admin = verifyToken(event)
  if (!admin) {
    return fail(401, '未授权，请重新登录')
  }

  const { action, ...params } = event

  if (!action || !ACTIONS[action]) {
    return fail(-1, '未知操作')
  }

  try {
    return await ACTIONS[action](params)
  } catch (err) {
    console.error(`adminAPI [${action}] error:`, err)
    return fail(500, err.message || '服务错误')
  }
}
