const bcrypt = require('bcryptjs')

const password = process.argv[2]

if (!password) {
  console.log('用法: node scripts/hash-password.js <密码>')
  console.log('示例: node scripts/hash-password.js mypassword123')
  process.exit(1)
}

const hash = bcrypt.hashSync(password, 10)

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
