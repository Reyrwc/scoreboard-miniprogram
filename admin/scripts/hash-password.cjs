const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const password = process.argv[2]

if (!password) {
  console.log('用法: node scripts/hash-password.cjs <密码>')
  console.log('示例: node scripts/hash-password.cjs mypassword123')
  process.exit(1)
}

// 先 SHA256 哈希（与前端一致），再 bcrypt 存储
const sha256Hash = crypto.createHash('sha256').update(password).digest('hex')
const hash = bcrypt.hashSync(sha256Hash, 10)

console.log('\n密码哈希已生成:\n')
console.log(hash)
console.log('\n--- 复制以下内容到 admins 集合 ---\n')
console.log(JSON.stringify({
  _id: 'admin_001',
  username: 'admin',
  passwordHash: hash,
  createdAt: new Date().toISOString(),
  lastLoginAt: null
}, null, 2))
console.log('')
