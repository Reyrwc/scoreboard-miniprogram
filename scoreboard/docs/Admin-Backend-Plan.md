# 管理后台实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为记分板小程序构建独立的 Web 管理后台，支持用户管理、房间管理和数据统计看板。

**Architecture:** Vue 3 SPA 部署在云开发静态托管，通过两个云函数（adminLogin 鉴权、adminAPI 统一入口）操作云数据库。JWT 认证，bcryptjs 密码哈希。

**Tech Stack:** Vue 3 + Vite + Element Plus + ECharts / 微信云函数 + wx-server-sdk + jsonwebtoken + bcryptjs

**Design Doc:** `scoreboard/docs/Admin-Backend-Design.md`

---

## 文件结构总览

### 新增文件

| 文件 | 职责 |
|------|------|
| `admin/package.json` | 前端依赖管理 |
| `admin/vite.config.js` | Vite 构建配置 |
| `admin/index.html` | HTML 入口 |
| `admin/src/main.js` | Vue 应用入口，注册 Element Plus 和 Router |
| `admin/src/App.vue` | 根组件，含侧边栏布局和路由出口 |
| `admin/src/router/index.js` | 路由配置 + 导航守卫 |
| `admin/src/api/admin.js` | API 调用封装（axios 封装 + 各 action 方法） |
| `admin/src/views/Login.vue` | 登录页 |
| `admin/src/views/Dashboard.vue` | 数据统计看板 |
| `admin/src/views/Users.vue` | 用户管理页 |
| `admin/src/views/Rooms.vue` | 房间管理页 |
| `cloudfunctions/adminLogin/index.js` | 管理员认证云函数 |
| `cloudfunctions/adminLogin/package.json` | adminLogin 依赖 |
| `cloudfunctions/adminAPI/index.js` | 管理后台统一 API 云函数 |
| `cloudfunctions/adminAPI/package.json` | adminAPI 依赖 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `cloudfunctions/login/index.js` | 新增封禁用户检查逻辑 |
| `.gitignore` | 新增 `admin/dist/`、`admin/node_modules/` |

---

## Task 1: 项目脚手架 — Vue 管理后台前端

**Files:**
- Create: `admin/package.json`
- Create: `admin/vite.config.js`
- Create: `admin/index.html`
- Create: `admin/src/main.js`
- Create: `admin/src/App.vue`
- Create: `admin/src/router/index.js`
- Create: `admin/src/api/admin.js`
- Modify: `.gitignore`

- [ ] **Step 1: 创建 `admin/package.json`**

```json
{
  "name": "scoreboard-admin",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.3.0",
    "element-plus": "^2.7.0",
    "echarts": "^5.5.0",
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: 创建 `admin/vite.config.js`**

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist'
  }
})
```

- [ ] **Step 3: 创建 `admin/index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>记分板管理后台</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: 创建 `admin/src/main.js`**

```js
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router/index.js'

const app = createApp(App)
app.use(ElementPlus)
app.use(router)
app.mount('#app')
```

- [ ] **Step 5: 创建 `admin/src/router/index.js`**

```js
import { createRouter, createWebHashHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import Users from '../views/Users.vue'
import Rooms from '../views/Rooms.vue'

const routes = [
  { path: '/login', name: 'Login', component: Login },
  {
    path: '/',
    component: { template: '<router-view />' },
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: Dashboard },
      { path: 'users', name: 'Users', component: Users },
      { path: 'rooms', name: 'Rooms', component: Rooms }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
```

- [ ] **Step 6: 创建 `admin/src/api/admin.js`**

```js
import axios from 'axios'

// 云开发 HTTP API 调用地址，部署后替换为实际地址
// 格式：https://{envId}.service.tcloudbase.net/{functionName}
const BASE_URL = import.meta.env.VITE_API_BASE || ''

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 10000
})

http.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  res => {
    const { code, data, message } = res.data
    if (code === 0) return data
    if (code === 401) {
      localStorage.removeItem('admin_token')
      window.location.hash = '#/login'
      return Promise.reject(new Error(message || '未授权'))
    }
    return Promise.reject(new Error(message || '请求失败'))
  },
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.hash = '#/login'
    }
    return Promise.reject(err)
  }
)

export const adminLogin = (username, password) => {
  return http.post('/adminLogin', { username, password })
}

export const getDashboard = () => {
  return http.post('/adminAPI', { action: 'getDashboard' })
}

export const getUsers = (params) => {
  return http.post('/adminAPI', { action: 'getUsers', ...params })
}

export const banUser = (openid, banned, reason) => {
  return http.post('/adminAPI', { action: 'banUser', openid, banned, reason })
}

export const getRooms = (params) => {
  return http.post('/adminAPI', { action: 'getRooms', ...params })
}

export const getRoomDetail = (roomId) => {
  return http.post('/adminAPI', { action: 'getRoomDetail', roomId })
}

export const dissolveRoom = (roomId) => {
  return http.post('/adminAPI', { action: 'dissolveRoom', roomId })
}
```

- [ ] **Step 7: 创建 `admin/src/App.vue`**

```vue
<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f7fa;
}
</style>
```

- [ ] **Step 8: 修改 `.gitignore`，追加管理后台忽略规则**

在 `.gitignore` 末尾追加：

```
# Admin backend
admin/node_modules/
admin/dist/
```

- [ ] **Step 9: 安装依赖并验证构建**

```bash
cd admin && npm install && npm run build
```

Expected: `dist/` 目录生成，无报错。

- [ ] **Step 10: 提交**

```bash
git add admin/ .gitignore
git commit -m "feat(admin): 初始化 Vue 管理后台前端脚手架"
```

---

## Task 2: adminLogin 云函数

**Files:**
- Create: `cloudfunctions/adminLogin/package.json`
- Create: `cloudfunctions/adminLogin/index.js`

- [ ] **Step 1: 创建 `cloudfunctions/adminLogin/package.json`**

```json
{
  "name": "adminLogin",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2"
  }
}
```

- [ ] **Step 2: 创建 `cloudfunctions/adminLogin/index.js`**

```js
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
```

- [ ] **Step 3: 提交**

```bash
git add cloudfunctions/adminLogin/
git commit -m "feat(admin): 新增 adminLogin 云函数"
```

---

## Task 3: adminAPI 云函数

**Files:**
- Create: `cloudfunctions/adminAPI/package.json`
- Create: `cloudfunctions/adminAPI/index.js`

- [ ] **Step 1: 创建 `cloudfunctions/adminAPI/package.json`**

```json
{
  "name": "adminAPI",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3",
    "jsonwebtoken": "^9.0.2"
  }
}
```

- [ ] **Step 2: 创建 `cloudfunctions/adminAPI/index.js`**

```js
const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const JWT_SECRET = process.env.JWT_SECRET || 'scoreboard-admin-secret-dev'

// 统一响应
const ok = (data) => ({ code: 0, data, message: 'ok' })
const fail = (code, message) => ({ code, message })

// 鉴权
function verifyToken(event) {
  const authHeader = event.authorization || event.Authorization || ''
  const token = authHeader.replace('Bearer ', '')
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
```

- [ ] **Step 3: 提交**

```bash
git add cloudfunctions/adminAPI/
git commit -m "feat(admin): 新增 adminAPI 云函数（统一入口）"
```

---

## Task 4: 登录页 + 布局

**Files:**
- Create: `admin/src/views/Login.vue`
- Modify: `admin/src/App.vue`

- [ ] **Step 1: 创建 `admin/src/views/Login.vue`**

```vue
<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <h2>记分板管理后台</h2>
        </div>
      </template>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="0"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            prefix-icon="User"
            size="large"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            prefix-icon="Lock"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            style="width: 100%"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { adminLogin } from '../api/admin.js'

const router = useRouter()
const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const data = await adminLogin(form.username, form.password)
    localStorage.setItem('admin_token', data.token)
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (err) {
    ElMessage.error(err.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 400px;
}

.card-header {
  text-align: center;
}

.card-header h2 {
  margin: 0;
  color: #303133;
  font-size: 22px;
}
</style>
```

- [ ] **Step 2: 更新 `admin/src/App.vue` 为后台管理布局**

替换整个文件内容：

```vue
<template>
  <div id="app">
    <!-- 登录页不显示布局 -->
    <router-view v-if="route.path === '/login'" />

    <!-- 后台管理布局 -->
    <el-container v-else style="height: 100vh">
      <el-aside width="200px" style="background: #304156">
        <div class="logo">记分板管理</div>
        <el-menu
          :default-active="route.path"
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409eff"
          router
        >
          <el-menu-item index="/dashboard">
            <el-icon><DataAnalysis /></el-icon>
            <span>数据看板</span>
          </el-menu-item>
          <el-menu-item index="/users">
            <el-icon><User /></el-icon>
            <span>用户管理</span>
          </el-menu-item>
          <el-menu-item index="/rooms">
            <el-icon><House /></el-icon>
            <span>房间管理</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-container>
        <el-header style="display: flex; align-items: center; justify-content: flex-end; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.08)">
          <el-button type="danger" text @click="handleLogout">退出登录</el-button>
        </el-header>
        <el-main style="background: #f5f7fa">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { DataAnalysis, User, House } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const handleLogout = () => {
  localStorage.removeItem('admin_token')
  router.push('/login')
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255,255,255,.1);
}
</style>
```

- [ ] **Step 3: 更新 `admin/src/main.js` 注册 Element Plus 图标**

替换 `admin/src/main.js`：

```js
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router/index.js'

const app = createApp(App)
app.use(ElementPlus)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(router)
app.mount('#app')
```

- [ ] **Step 4: 安装图标依赖**

```bash
cd admin && npm install @element-plus/icons-vue
```

- [ ] **Step 5: 验证**

运行 `npm run dev`，访问 `http://localhost:5173`，确认：
- 未登录时跳转到登录页
- 登录页表单校验正常
- 登录按钮可点击（会报网络错误，这是正常的，云函数还没部署）

- [ ] **Step 6: 提交**

```bash
git add admin/
git commit -m "feat(admin): 添加登录页和后台管理布局"
```

---

## Task 5: 数据统计看板

**Files:**
- Create: `admin/src/views/Dashboard.vue`

- [ ] **Step 1: 创建 `admin/src/views/Dashboard.vue`**

```vue
<template>
  <div class="dashboard">
    <h2 style="margin-bottom: 20px">数据看板</h2>

    <!-- 指标卡片 -->
    <el-row :gutter="20" style="margin-bottom: 24px">
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-value">{{ stats.totalUsers }}</div>
            <div class="stat-label">总用户数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-value">{{ stats.totalRooms }}</div>
            <div class="stat-label">总房间数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-value">{{ stats.todayActiveRooms }}</div>
            <div class="stat-label">今日活跃房间</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 趋势图 -->
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>用户增长趋势（近 30 天）</template>
          <div ref="userChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>房间增长趋势（近 30 天）</template>
          <div ref="roomChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { getDashboard } from '../api/admin.js'

const stats = reactive({
  totalUsers: 0,
  totalRooms: 0,
  todayActiveRooms: 0,
  userTrend: [],
  roomTrend: []
})

const userChartRef = ref()
const roomChartRef = ref()
let userChart = null
let roomChart = null

function renderChart(el, data, title) {
  const chart = echarts.init(el)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, bottom: 30, top: 30 },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date.slice(5)),
      axisLabel: { rotate: 45 }
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{
      name: title,
      type: 'line',
      smooth: true,
      areaStyle: { opacity: 0.3 },
      data: data.map(d => d.count)
    }]
  })
  return chart
}

onMounted(async () => {
  try {
    const data = await getDashboard()
    Object.assign(stats, data)
    await nextTick()
    userChart = renderChart(userChartRef.value, stats.userTrend, '新增用户')
    roomChart = renderChart(roomChartRef.value, stats.roomTrend, '新增房间')

    window.addEventListener('resize', handleResize)
  } catch (err) {
    ElMessage.error(err.message || '加载数据失败')
  }
})

function handleResize() {
  userChart?.resize()
  roomChart?.resize()
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  userChart?.dispose()
  roomChart?.dispose()
})
</script>

<style scoped>
.stat-card {
  text-align: center;
  padding: 10px 0;
}
.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #409eff;
}
.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 8px;
}
</style>
```

- [ ] **Step 2: 验证**

运行 `npm run dev`，访问 `#dashboard`，确认：
- 页面结构正确（3 个指标卡片 + 2 个图表区域）
- 数据加载会报错（云函数未部署），但组件渲染正常

- [ ] **Step 3: 提交**

```bash
git add admin/src/views/Dashboard.vue
git commit -m "feat(admin): 添加数据统计看板页面"
```

---

## Task 6: 用户管理页

**Files:**
- Create: `admin/src/views/Users.vue`

- [ ] **Step 1: 创建 `admin/src/views/Users.vue`**

```vue
<template>
  <div class="users-page">
    <h2 style="margin-bottom: 20px">用户管理</h2>

    <!-- 搜索栏 -->
    <el-card style="margin-bottom: 16px">
      <el-row :gutter="16" align="middle">
        <el-col :span="8">
          <el-input
            v-model="keyword"
            placeholder="搜索昵称或 openid"
            clearable
            @keyup.enter="loadUsers"
          />
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="loadUsers">搜索</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 用户列表 -->
    <el-card>
      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column label="头像" width="70">
          <template #default="{ row }">
            <el-avatar :src="row.avatarUrl" :size="40" />
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" width="140" />
        <el-table-column prop="_id" label="OpenID" min-width="200" show-overflow-tooltip />
        <el-table-column prop="totalGames" label="总场次" width="80" align="center" />
        <el-table-column label="胜率" width="80" align="center">
          <template #default="{ row }">
            {{ row.totalGames > 0 ? Math.round(row.totalWins / row.totalGames * 100) + '%' : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.banned ? 'danger' : 'success'" size="small">
              {{ row.banned ? '已封禁' : '正常' }}
            </template>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-button size="small" @click="showDetail(row)">详情</el-button>
            <el-button
              v-if="!row.banned"
              type="danger"
              size="small"
              @click="handleBan(row)"
            >封禁</el-button>
            <el-button
              v-else
              type="success"
              size="small"
              @click="handleUnban(row)"
            >解封</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 16px; justify-content: flex-end"
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadUsers"
      />
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="用户详情" width="500px">
      <template v-if="detailUser">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="昵称" :span="2">
            <el-avatar :src="detailUser.avatarUrl" :size="24" style="vertical-align: middle; margin-right: 8px" />
            {{ detailUser.nickname }}
          </el-descriptions-item>
          <el-descriptions-item label="OpenID" :span="2">{{ detailUser._id }}</el-descriptions-item>
          <el-descriptions-item label="总场次">{{ detailUser.totalGames }}</el-descriptions-item>
          <el-descriptions-item label="总胜场">{{ detailUser.totalWins }}</el-descriptions-item>
          <el-descriptions-item label="胜率">
            {{ detailUser.totalGames > 0 ? Math.round(detailUser.totalWins / detailUser.totalGames * 100) + '%' : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="净得分">{{ detailUser.totalWinScore - detailUser.totalLoseScore }}</el-descriptions-item>
          <el-descriptions-item label="最高连胜">{{ detailUser.maxStreak }}</el-descriptions-item>
          <el-descriptions-item label="最大单局赢分">{{ detailUser.maxSingleWin }}</el-descriptions-item>
          <el-descriptions-item label="注册时间" :span="2">{{ formatDate(detailUser.createdAt) }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>

    <!-- 封禁弹窗 -->
    <el-dialog v-model="banVisible" title="封禁用户" width="400px">
      <p style="margin-bottom: 12px">确定要封禁用户 <strong>{{ banTarget?.nickname }}</strong> 吗？</p>
      <el-input v-model="banReason" placeholder="封禁原因（可选）" type="textarea" :rows="2" />
      <template #footer>
        <el-button @click="banVisible = false">取消</el-button>
        <el-button type="danger" :loading="banLoading" @click="confirmBan">确认封禁</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUsers, banUser } from '../api/admin.js'

const users = ref([])
const loading = ref(false)
const keyword = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)

const detailVisible = ref(false)
const detailUser = ref(null)

const banVisible = ref(false)
const banTarget = ref(null)
const banReason = ref('')
const banLoading = ref(false)

async function loadUsers() {
  loading.value = true
  try {
    const data = await getUsers({ page: page.value, pageSize, keyword: keyword.value || undefined })
    users.value = data.list
    total.value = data.total
  } catch (err) {
    ElMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function showDetail(user) {
  detailUser.value = user
  detailVisible.value = true
}

function handleBan(user) {
  banTarget.value = user
  banReason.value = ''
  banVisible.value = true
}

async function confirmBan() {
  banLoading.value = true
  try {
    await banUser(banTarget.value._id, true, banReason.value)
    ElMessage.success('封禁成功')
    banVisible.value = false
    loadUsers()
  } catch (err) {
    ElMessage.error(err.message || '封禁失败')
  } finally {
    banLoading.value = false
  }
}

async function handleUnban(user) {
  try {
    await ElMessageBox.confirm(`确定要解封用户 ${user.nickname} 吗？`, '确认解封')
    await banUser(user._id, false)
    ElMessage.success('解封成功')
    loadUsers()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(err.message || '解封失败')
  }
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(loadUsers)
</script>
```

- [ ] **Step 2: 验证**

运行 `npm run dev`，访问 `#users`，确认：
- 表格结构正确（7 列）
- 搜索栏和分页组件渲染正常
- 弹窗组件结构正确

- [ ] **Step 3: 提交**

```bash
git add admin/src/views/Users.vue
git commit -m "feat(admin): 添加用户管理页面"
```

---

## Task 7: 房间管理页

**Files:**
- Create: `admin/src/views/Rooms.vue`

- [ ] **Step 1: 创建 `admin/src/views/Rooms.vue`**

```vue
<template>
  <div class="rooms-page">
    <h2 style="margin-bottom: 20px">房间管理</h2>

    <!-- 搜索筛选栏 -->
    <el-card style="margin-bottom: 16px">
      <el-row :gutter="16" align="middle">
        <el-col :span="6">
          <el-input
            v-model="keyword"
            placeholder="搜索房间名"
            clearable
            @keyup.enter="loadRooms"
          />
        </el-col>
        <el-col :span="4">
          <el-select v-model="statusFilter" placeholder="状态筛选" clearable>
            <el-option label="全部" value="all" />
            <el-option label="进行中" value="active" />
            <el-option label="已解散" value="dissolved" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="loadRooms">搜索</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 房间列表 -->
    <el-card>
      <el-table :data="rooms" v-loading="loading" stripe>
        <el-table-column prop="name" label="房间名" width="180" />
        <el-table-column prop="_id" label="房间 ID" min-width="200" show-overflow-tooltip />
        <el-table-column label="玩家数" width="80" align="center">
          <template #default="{ row }">
            {{ (row.allPlayers || row.players || []).length }}
          </template>
        </el-table-column>
        <el-table-column prop="currentRound" label="当前局数" width="90" align="center" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '进行中' : '已解散' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-button size="small" @click="showDetail(row)">详情</el-button>
            <el-button
              v-if="row.status === 'active'"
              type="danger"
              size="small"
              @click="handleDissolve(row)"
            >解散</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 16px; justify-content: flex-end"
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadRooms"
      />
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="房间详情" width="700px">
      <template v-if="detailRoom">
        <el-descriptions :column="2" border style="margin-bottom: 16px">
          <el-descriptions-item label="房间名">{{ detailRoom.room.name }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="detailRoom.room.status === 'active' ? 'success' : 'info'" size="small">
              {{ detailRoom.room.status === 'active' ? '进行中' : '已解散' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="房间 ID" :span="2">{{ detailRoom.room._id }}</el-descriptions-item>
          <el-descriptions-item label="当前局数">{{ detailRoom.room.currentRound }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(detailRoom.room.createdAt) }}</el-descriptions-item>
        </el-descriptions>

        <!-- 玩家列表 -->
        <h4 style="margin-bottom: 8px">玩家</h4>
        <el-table :data="(detailRoom.room.allPlayers || detailRoom.room.players || [])" size="small" style="margin-bottom: 16px">
          <el-table-column label="头像" width="60">
            <template #default="{ row }">
              <el-avatar :src="row.avatarUrl" :size="30" />
            </template>
          </el-table-column>
          <el-table-column prop="nickname" label="昵称" />
          <el-table-column prop="openid" label="OpenID" show-overflow-tooltip />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.active ? 'success' : 'info'" size="small">
                {{ row.active ? '在线' : '已退出' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>

        <!-- 记分记录 -->
        <h4 style="margin-bottom: 8px">记分记录（最近 100 条）</h4>
        <el-table :data="detailRoom.scores" size="small" max-height="300">
          <el-table-column prop="roundNum" label="局" width="50" />
          <el-table-column prop="fromNickname" label="记分人" width="100" />
          <el-table-column prop="toNickname" label="被记分人" width="100" />
          <el-table-column prop="amount" label="分数" width="70" />
          <el-table-column prop="note" label="备注" />
          <el-table-column label="时间" width="160">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getRooms, getRoomDetail, dissolveRoom } from '../api/admin.js'

const rooms = ref([])
const loading = ref(false)
const keyword = ref('')
const statusFilter = ref('all')
const page = ref(1)
const pageSize = 20
const total = ref(0)

const detailVisible = ref(false)
const detailRoom = ref(null)

async function loadRooms() {
  loading.value = true
  try {
    const params = {
      page: page.value,
      pageSize,
      keyword: keyword.value || undefined,
      status: statusFilter.value || undefined
    }
    const data = await getRooms(params)
    rooms.value = data.list
    total.value = data.total
  } catch (err) {
    ElMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function showDetail(room) {
  try {
    const data = await getRoomDetail(room._id)
    detailRoom.value = data
    detailVisible.value = true
  } catch (err) {
    ElMessage.error(err.message || '加载详情失败')
  }
}

async function handleDissolve(room) {
  try {
    await ElMessageBox.confirm(
      `确定要强制解散房间「${room.name}」吗？解散后将生成结算记录，不可恢复。`,
      '强制解散',
      { confirmButtonText: '确认解散', cancelButtonText: '取消', type: 'warning' }
    )
    await dissolveRoom(room._id)
    ElMessage.success('解散成功')
    loadRooms()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(err.message || '解散失败')
  }
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(loadRooms)
</script>
```

- [ ] **Step 2: 验证**

运行 `npm run dev`，访问 `#rooms`，确认：
- 表格结构正确（7 列）
- 搜索栏和状态筛选组件渲染正常
- 详情弹窗和解散确认弹窗结构正确

- [ ] **Step 3: 提交**

```bash
git add admin/src/views/Rooms.vue
git commit -m "feat(admin): 添加房间管理页面"
```

---

## Task 8: 小程序端封禁检查

**Files:**
- Modify: `cloudfunctions/login/index.js`

- [ ] **Step 1: 修改 `cloudfunctions/login/index.js`**

在 `exports.main` 函数内，`try` 块中查询用户成功后、返回之前，新增封禁检查。

当前代码（第 24-26 行）：
```js
  try {
    const userRes = await db.collection('users').doc(OPENID).get()
    return { code: 0, openid: OPENID, user: userRes.data }
```

替换为：
```js
  try {
    const userRes = await db.collection('users').doc(OPENID).get()
    const user = userRes.data
    if (user.banned) {
      return { code: 403, message: '账号已被封禁', data: { reason: user.bannedReason || '' } }
    }
    return { code: 0, openid: OPENID, user }
```

完整修改后的 `login/index.js`：

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const DEFAULT_AVATARS = [
  '/static/avatars/cat.jpg',
  '/static/avatars/dog.jpg',
  '/static/avatars/panda.jpg',
  '/static/avatars/rabbit.jpg'
]

function generateNickname() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let suffix = ''
  for (let i = 0; i < 5; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return '微信用户_' + suffix
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  try {
    const userRes = await db.collection('users').doc(OPENID).get()
    const user = userRes.data
    if (user.banned) {
      return { code: 403, message: '账号已被封禁', data: { reason: user.bannedReason || '' } }
    }
    return { code: 0, openid: OPENID, user }
  } catch (err) {
    const randomAvatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]
    const nickname = generateNickname()

    const newUser = {
      _id: OPENID,
      nickname,
      avatarUrl: randomAvatar,
      totalGames: 0,
      totalWins: 0,
      totalWinScore: 0,
      totalLoseScore: 0,
      maxSingleWin: 0,
      maxStreak: 0,
      banned: false,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
    await db.collection('users').add({ data: newUser })
    return { code: 0, openid: OPENID, user: newUser }
  }
}
```

注意：新建用户时也加上了 `banned: false` 默认字段，保持数据结构一致。

- [ ] **Step 2: 提交**

```bash
git add cloudfunctions/login/index.js
git commit -m "feat(admin): login 云函数新增封禁用户检查"
```

---

## Task 9: API 地址配置与构建验证

**Files:**
- Create: `admin/.env`
- Create: `admin/.env.example`

- [ ] **Step 1: 创建 `admin/.env.example`**

```
# 云开发 HTTP API 地址
# 格式：https://{envId}.service.tcloudbase.net
VITE_API_BASE=
```

- [ ] **Step 2: 创建 `admin/.env`**

```
VITE_API_BASE=
```

实际部署时需填入云开发环境的 HTTP API 地址。

- [ ] **Step 3: 更新 `.gitignore`**

在 `.gitignore` 的 `# Admin backend` 部分追加：

```
admin/.env
```

- [ ] **Step 4: 完整构建验证**

```bash
cd admin && npm run build
```

Expected: `dist/` 目录生成，包含 `index.html`、`assets/` 等文件，无报错。

- [ ] **Step 5: 提交**

```bash
git add admin/ .gitignore
git commit -m "feat(admin): 添加环境变量配置，验证构建"
```

---

## 部署清单（手动操作）

实现计划完成后，需要手动执行以下部署步骤：

1. **云开发控制台创建 `admins` 集合**
   - 在云开发控制台 → 数据库 → 新建集合 `admins`

2. **插入管理员记录**
   - 用 Node.js 本地生成 bcryptjs 哈希密码：
     ```js
     const bcrypt = require('bcryptjs')
     console.log(bcrypt.hashSync('你的密码', 10))
     ```
   - 在 `admins` 集合中插入文档：
     ```json
     {
       "_id": "admin_001",
       "username": "admin",
       "passwordHash": "上面生成的哈希值",
       "createdAt": "2026-06-14T00:00:00Z",
       "lastLoginAt": null
     }
     ```

3. **配置云函数环境变量**
   - 在云开发控制台 → 云函数 → adminLogin → 环境变量
   - 添加 `JWT_SECRET` = 一个随机长字符串
   - 对 adminAPI 做同样配置

4. **部署云函数**
   - 上传 `adminLogin` 和 `adminAPI` 到云开发
   - 安装依赖：在云开发控制台对每个函数点击"安装依赖"

5. **配置 HTTP API 触发器**
   - 在云开发控制台 → 云函数 → adminLogin → 触发器
   - 添加 HTTP 触发器，记录访问路径
   - 对 adminAPI 做同样配置

6. **构建并部署前端**
   ```bash
   cd admin
   # 编辑 .env，填入 VITE_API_BASE=https://{envId}.service.tcloudbase.net
   npm run build
   ```
   - 在云开发控制台 → 静态网站托管 → 上传 `admin/dist/` 目录

7. **访问测试**
   - 通过静态托管域名访问管理后台
   - 用配置的管理员账号登录
   - 验证各功能模块正常工作
