const cloud = require('wx-server-sdk')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// JWT 密钥，需在云函数环境变量中配置
const JWT_SECRET = process.env.JWT_SECRET || 'scoreboard-admin-secret-dev'
const TOKEN_EXPIRE = '24h'

exports.main = async (event, context) => {
  const { username, password } = event

  if (!username || !password) {
    return { code: -1, message: '用户名和密码不能为空' }
  }

  try {
    // 查询管理员账号
    const res = await db.collection('admins').where({ username }).get()
    if (res.data.length === 0) {
      return { code: 401, message: '用户名或密码错误' }
    }

    const admin = res.data[0]

    // 校验密码
    const valid = bcrypt.compareSync(password, admin.passwordHash)
    if (!valid) {
      return { code: 401, message: '用户名或密码错误' }
    }

    // 签发 JWT
    const token = jwt.sign(
      { adminId: admin._id, username: admin.username },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRE }
    )

    // 更新最后登录时间
    await db.collection('admins').doc(admin._id).update({
      data: { lastLoginAt: db.serverDate() }
    })

    return {
      code: 0,
      data: {
        token,
        admin: {
          username: admin.username,
          lastLoginAt: new Date().toISOString()
        }
      },
      message: 'ok'
    }
  } catch (err) {
    console.error('adminLogin error:', err)
    return { code: -1, message: err.message || '登录失败' }
  }
}
