# 管理后台设计文档

## 一、项目概述

**项目名称**：记分板管理后台
**产品形态**：独立 Web 管理后台（Vue SPA）
**目标用户**：记分板小程序管理员
**核心价值**：提供用户管理、房间管理和数据统计能力，便于运营监控和异常处理

### 1.1 背景

记分板小程序当前无管理后台，管理员无法查看用户数据、处理异常房间或监控运营指标。需要一个独立的 Web 管理后台来满足这些运维需求。

### 1.2 技术选型

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + Element Plus + ECharts |
| 后端 | 微信云函数（adminLogin + adminAPI） |
| 数据库 | 云数据库（MongoDB），复用现有集合 |
| 认证 | JWT Token，bcryptjs 密码哈希 |
| 部署 | 云开发静态托管 |

### 1.3 架构方案

Vue SPA 部署在云开发静态托管，所有管理操作通过云函数 API 层进行，云函数负责鉴权和权限校验，再操作云数据库。

```
浏览器 (Vue SPA)  →  云函数 (adminLogin/adminAPI)  →  云数据库
     ↑                        ↑
  云托管静态托管         JWT 鉴权 + 权限校验
```

选择云函数 API 层而非前端直连数据库的原因：管理后台涉及敏感操作（封禁用户、删除数据），云函数层做鉴权和权限校验更安全可靠，且与现有小程序云函数架构一致。

---

## 二、项目结构

```
admin/                          # 管理后台（项目根目录下新增）
├── index.html                  # 入口
├── vite.config.js              # Vite 配置
├── package.json
├── src/
│   ├── main.js                 # Vue 入口
│   ├── App.vue                 # 根组件（含布局）
│   ├── router/
│   │   └── index.js            # 路由配置
│   ├── api/
│   │   └── admin.js            # API 调用封装
│   ├── views/
│   │   ├── Login.vue           # 登录页
│   │   ├── Dashboard.vue       # 数据统计看板
│   │   ├── Users.vue           # 用户管理
│   │   └── Rooms.vue           # 房间管理
│   └── components/             # 公共组件
└── dist/                       # 构建产物，部署到云托管

cloudfunctions/
├── adminLogin/                 # 新增：管理员认证
│   └── index.js
└── adminAPI/                   # 新增：管理后台统一 API
    └── index.js
```

---

## 三、管理员认证

### 3.1 数据模型

新增 `admins` 集合：

```javascript
{
  _id: "admin_001",
  username: "admin",
  passwordHash: "$2a$10$...",   // bcryptjs 哈希，不存明文
  createdAt: "2026-06-14T...",
  lastLoginAt: "2026-06-14T..."
}
```

### 3.2 认证流程

1. 管理员在登录页输入用户名和密码
2. 前端调用 `adminLogin` 云函数
3. 云函数从 `admins` 集合查询用户，用 bcryptjs 校验密码
4. 校验通过后签发 JWT（有效期 24 小时），密钥存于云函数环境变量
5. 前端将 token 存入 localStorage
6. 后续所有请求 Header 携带 `Authorization: Bearer <token>`
7. `adminAPI` 云函数每次请求先校验 token，校验通过后再分发到具体操作

### 3.3 安全措施

- 密码使用 bcryptjs 哈希存储，不存明文
- JWT 密钥通过云函数环境变量配置，不硬编码在代码中
- Token 有效期 24 小时，过期需重新登录
- 前端路由守卫：未登录时跳转登录页

---

## 四、功能模块

### 4.1 数据统计看板 `/dashboard`

页面加载时调用 `adminAPI` 的 `getDashboard` action，返回以下指标：

| 指标 | 数据来源 | 说明 |
|------|----------|------|
| 总用户数 | `users` 集合 count | 注册用户总数 |
| 总房间数 | `rooms` 集合 count | 已创建房间总数 |
| 今日活跃房间数 | `rooms` 集合按 `lastScoreAt` 筛选今日 | 今日有记分操作的房间 |
| 用户增长趋势 | `users` 集合按 `createdAt` 聚合近 30 天 | 折线图，每日新增用户数 |
| 房间增长趋势 | `rooms` 集合按 `createdAt` 聚合近 30 天 | 折线图，每日新增房间数 |

### 4.2 用户管理 `/users`

**用户列表**：
- 分页展示，每页 20 条，支持翻页
- 支持按昵称或 openid 关键词搜索
- 列显示：头像、昵称、openid、总场次、胜率、状态（正常/已封禁）

**用户详情**（点击列表行展开或弹窗）：
- 基本信息：头像、昵称、openid、注册时间
- 统计数据：总场次、总胜场、胜率、净得分、最高连胜、最大单局赢分

**封禁/解封**：
- 点击"封禁"按钮，弹窗输入封禁原因（可选），确认后标记 `banned: true`
- 已封禁用户显示"解封"按钮，点击后恢复 `banned: false`
- 小程序端 `login` 云函数需新增检查：被封用户返回错误，无法创建/加入房间

**用户数据结构变更**：

```javascript
{
  // ... 现有字段保持不变
  banned: false,          // 新增：是否被封禁
  bannedAt: null,         // 新增：封禁时间
  bannedReason: ""        // 新增：封禁原因
}
```

### 4.3 房间管理 `/rooms`

**房间列表**：
- 分页展示，每页 20 条，支持翻页
- 支持按房间名关键词搜索
- 支持按状态筛选：全部 / 进行中 / 已解散
- 列显示：房间名、房间 ID、玩家数、当前局数、状态、创建时间

**房间详情**（点击列表行展开或弹窗）：
- 房间信息：房间名、ID、状态、创建时间、解散时间（如已解散）
- 玩家列表：头像、昵称、最终得分（如已结算）
- 记分记录：最近的记分操作列表

**强制解散**：
- 仅对"进行中"状态的房间可用
- 点击后二次确认，确认后调用 `dissolveRoom` 逻辑解散房间
- 解散时生成结算记录（与现有小程序解散逻辑一致）

---

## 五、云函数 API 设计

### 5.1 `adminLogin`

**输入**：
```javascript
{ username: "admin", password: "123456" }
```

**输出**：
```javascript
{
  code: 0,
  data: {
    token: "eyJhbGciOiJIUzI1NiIs...",
    admin: { username: "admin", lastLoginAt: "2026-..." }
  },
  message: "ok"
}
```

**错误码**：
- `401`：用户名或密码错误

### 5.2 `adminAPI`（统一入口）

通过 `action` 参数分发到具体操作。每个请求 Header 携带 JWT token。

| action | 参数 | 说明 | 返回 |
|--------|------|------|------|
| `getDashboard` | — | 统计聚合数据 | `{ totalUsers, totalRooms, todayActiveRooms, userTrend[], roomTrend[] }` |
| `getUsers` | `{ page, pageSize, keyword? }` | 用户列表 | `{ list[], total }` |
| `banUser` | `{ openid, banned, reason? }` | 封禁/解封 | `{ success: true }` |
| `getRooms` | `{ page, pageSize, keyword?, status? }` | 房间列表 | `{ list[], total }` |
| `getRoomDetail` | `{ roomId }` | 房间详情 | `{ room, players, scores[] }` |
| `dissolveRoom` | `{ roomId }` | 强制解散 | `{ success: true }` |

### 5.3 统一响应格式

```javascript
{
  code: 0,           // 0=成功, 401=未授权, 403=权限不足, 500=服务错误
  data: { ... },
  message: "ok"
}
```

### 5.4 鉴权流程

`adminAPI` 入口统一执行：

1. 从 Header 提取 `Authorization: Bearer <token>`
2. 用 `jsonwebtoken.verify()` 校验 token 有效性
3. 校验通过 → 解析 `action` 参数，路由到具体操作
4. 校验失败 → 返回 `{ code: 401, message: "未授权" }`

---

## 六、小程序端适配

### 6.1 封禁用户检查

`login` 云函数需新增逻辑：

```javascript
// login 云函数中新增
const user = await db.collection('users').where({ _id: openid }).get();
if (user.data[0]?.banned) {
  return { code: 403, message: "账号已被封禁", data: { reason: user.data[0].bannedReason } };
}
```

### 6.2 封禁用户提示

小程序端登录时如果收到 403 响应，显示提示弹窗："您的账号已被封禁，原因：xxx"。

---

## 七、部署方案

1. **云函数部署**：`adminLogin` 和 `adminAPI` 上传到云开发
2. **前端构建**：`cd admin && npm run build`，产物在 `dist/`
3. **静态托管**：将 `dist/` 目录部署到云开发静态托管
4. **环境变量**：在云开发控制台配置 JWT_SECRET 环境变量
5. **初始化管理员**：手动在 `admins` 集合插入一条管理员记录（密码用 bcryptjs 预先哈希）

---

## 八、依赖清单

### 前端（admin/package.json）

| 依赖 | 用途 |
|------|------|
| vue@3 | 框架 |
| vue-router@4 | 路由 |
| element-plus | UI 组件库 |
| echarts | 数据图表 |
| axios | HTTP 请求 |

### 云函数（adminLogin/package.json）

| 依赖 | 用途 |
|------|------|
| wx-server-sdk | 云开发 SDK |
| bcryptjs | 密码哈希 |
| jsonwebtoken | JWT 签发与校验 |

### 云函数（adminAPI/package.json）

| 依赖 | 用途 |
|------|------|
| wx-server-sdk | 云开发 SDK |
| jsonwebtoken | JWT 校验 |

---

## 九、页面导航

```
/login ─────────→ /dashboard
                    ├── /users（用户管理）
                    └── /rooms（房间管理）
```

侧边栏布局：左侧固定导航菜单，右侧内容区域。

---

*文档版本：v1.0*
*创建日期：2026-06-14*
