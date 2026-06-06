/**
 * 云函数全局配置（唯一源）
 * 修改后需同步到以下目录：
 *   cleanExpiredRooms/config.js
 *   getRoomInfo/config.js
 *   getUserInfo/config.js
 *   leaveRoom/config.js
 * 同步命令（在 cloudfunctions/ 目录下执行）：
 *   cp shared/config.js cleanExpiredRooms/config.js
 *   cp shared/config.js getRoomInfo/config.js
 *   cp shared/config.js getUserInfo/config.js
 *   cp shared/config.js leaveRoom/config.js
 */

// 房间无记分自动解散时间（毫秒）
const ROOM_EXPIRE_MS = 10 * 60 * 1000

module.exports = { ROOM_EXPIRE_MS }
