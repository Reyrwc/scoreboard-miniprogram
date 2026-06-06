/**
 * 全局配置
 * 过期时间需与 cloudfunctions/shared/config.js 保持一致
 */

// 房间无记分自动解散时间（毫秒）
const ROOM_EXPIRE_MS = 10 * 60 * 1000

module.exports = { ROOM_EXPIRE_MS }
