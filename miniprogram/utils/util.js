/**
 * 通用工具函数
 */

/**
 * 格式化时间为 YYYY-MM-DD HH:mm:ss
 * @param {Date} date
 * @returns {string}
 */
const formatTime = (date) => {
  if (!date) return ''
  if (typeof date === 'string' || typeof date === 'number') {
    date = new Date(date)
  }
  const year = date.getFullYear()
  const month = padZero(date.getMonth() + 1)
  const day = padZero(date.getDate())
  const hour = padZero(date.getHours())
  const minute = padZero(date.getMinutes())
  const second = padZero(date.getSeconds())
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
const formatDate = (date) => {
  if (!date) return ''
  if (typeof date === 'string' || typeof date === 'number') {
    date = new Date(date)
  }
  const year = date.getFullYear()
  const month = padZero(date.getMonth() + 1)
  const day = padZero(date.getDate())
  return `${year}-${month}-${day}`
}

/**
 * 数字补零
 * @param {number} n
 * @returns {string}
 */
const padZero = (n) => {
  return (n < 10 ? '0' : '') + n
}

module.exports = {
  formatTime,
  formatDate,
}
