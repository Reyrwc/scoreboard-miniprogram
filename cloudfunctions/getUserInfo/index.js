const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  try {
    const res = await db.collection('users').doc(OPENID).get()
    return { code: 0, user: res.data }
  } catch (err) {
    return { code: 0, user: null }
  }
}
