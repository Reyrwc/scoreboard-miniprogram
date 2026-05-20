# 记分板 — 技术设计文档

## 一、MVP 功能范围

### 1.1 核心功能（P0 - 必须有）

| 功能 | 说明 |
|------|------|
| 微信登录 | wx.login 获取 openid，获取头像昵称 |
| 创建房间 | 房主昵称 + "的房间"，最多 20 人 |
| 加入房间 | 通过分享链接/二维码加入 |
| 实时记分 | 点击头像加分，记分人自动扣分 |
| 下一局 | 记录局数，至少 1 条记录才能点，1分钟防重复 |
| 实时排名 | 按积分排序，实时刷新 |
| 解散房间 | 房主可解散，30 分钟无操作自动解散 |
| 结算报告 | 解散后生成最终排名 |

### 1.2 次要功能（P1 - 应该有）

| 功能 | 说明 |
|------|------|
| 历史战绩 | 查看过往房间记录 |
| 战绩详情 | 查看单个房间的详细记分 |
| 个人统计 | 总场次、胜率、净得分等 |

### 1.3 锦上添花（P2 - 可以有）

| 功能 | 说明 |
|------|------|
| 好友排行 | 基于房间内玩家关系统计 |
| 分享卡片 | 自定义分享卡片样式 |
| 个人资料编辑 | 修改头像昵称 |

---

## 二、技术架构

### 2.1 整体架构

```
┌─────────────────┐     ┌─────────────────────┐
│   微信小程序     │────▶│   微信云开发         │
│   (前端)        │     │   (后端 + 数据库)    │
└─────────────────┘     └─────────────────────┘
        │                        │
        ▼                        ▼
┌─────────────────┐     ┌─────────────────────┐
│   WXML/WXSS     │     │   云函数            │
│   JS 逻辑       │     │   云数据库 (MongoDB) │
│   组件化开发     │     │   实时数据推送       │
└─────────────────┘     └─────────────────────┘
```

### 2.2 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | 微信小程序原生 | 基础库 3.0+ |
| UI 组件 | 自定义组件 | - |
| 后端 | 微信云开发 | - |
| 数据库 | 云数据库 (MongoDB) | - |
| 实时同步 | 数据库实时推送 | - |
| 文件存储 | 云存储 | - |

### 2.3 云开发环境

```
环境 ID: scoreboard-prod (生产)
环境 ID: scoreboard-dev (开发)
```

---

## 三、数据库设计

### 3.1 users 集合

```javascript
{
  _id: "openid",                    // 微信 openid
  nickname: "张三",                 // 昵称
  avatarUrl: "https://...",         // 头像 URL
  totalGames: 28,                   // 总场次
  totalWins: 15,                    // 总胜场
  totalWinScore: 1280,              // 总赢分
  totalLoseScore: 860,              // 总输分
  maxSingleWin: 350,                // 最大单局赢分
  maxStreak: 5,                     // 最高连胜
  createdAt: "2026-05-17T10:00:00", // 创建时间
  updatedAt: "2026-05-17T10:00:00"  // 更新时间
}
```

**索引：**
- `_id` (主键)

### 3.2 rooms 集合

```javascript
{
  _id: "room_abc123",               // 房间 ID (自动生成)
  name: "张三的房间",               // 房间名称
  ownerId: "openid_owner",          // 房主 openid
  players: [                        // 玩家列表
    {
      openid: "openid_1",
      nickname: "张三",
      avatarUrl: "https://...",
      joinedAt: "2026-05-17T10:00:00"
    },
    {
      openid: "openid_2",
      nickname: "李四",
      avatarUrl: "https://...",
      joinedAt: "2026-05-17T10:01:00"
    }
  ],
  currentRound: 0,                  // 当前局数（0 表示还未开始）
  lastNextRoundTime: null,          // 最后点击"下一局"的时间（用于1分钟防重复）
  status: "active",                 // 状态: active | dissolved
  createdAt: "2026-05-17T10:00:00",
  lastScoreAt: "2026-05-17T10:30:00", // 最后记分时间
  dissolvedAt: null                  // 解散时间
}
```

**索引：**
- `_id` (主键)
- `ownerId` (房主查询)
- `status` (状态过滤)
- `lastScoreAt` (自动解散检查)

### 3.3 scores 集合

```javascript
{
  _id: "score_xyz789",              // 记分 ID
  roomId: "room_abc123",            // 房间 ID
  roundNum: 4,                      // 局数
  fromOpenid: "openid_1",           // 记分人
  toOpenid: "openid_2",             // 被记分人
  amount: 5.0,                      // 分数 (正数)
  note: "自摸",                     // 备注
  createdAt: "2026-05-17T10:30:00"
}
```

**索引：**
- `_id` (主键)
- `roomId` + `createdAt` (房间记分记录查询)
- `roomId` + `roundNum` (按局查询)

### 3.4 history 集合

```javascript
{
  _id: "hist_def456",               // 历史记录 ID
  roomId: "room_abc123",            // 原房间 ID
  roomName: "张三的房间",           // 房间名称
  playerCount: 4,                   // 玩家数
  roundCount: 4,                    // 总局数
  players: [                        // 玩家信息
    {
      openid: "openid_1",
      nickname: "张三",
      avatarUrl: "https://...",
      finalScore: 50,               // 最终得分
      rank: 1                       // 排名
    }
  ],
  createdAt: "2026-05-17T10:00:00",
  dissolvedAt: "2026-05-17T11:00:00"
}
```

**索引：**
- `_id` (主键)
- `players.openid` + `dissolvedAt` (用户历史查询)

---

## 四、API 设计（云函数）

### 4.1 用户相关

#### login - 登录/注册
```javascript
// 入参
{
  nickname: "张三",
  avatarUrl: "https://..."
}

// 返回
{
  success: true,
  user: { _id, nickname, avatarUrl, ... }
}
```

#### getUserInfo - 获取用户信息
```javascript
// 入参
无 (使用 context.OPENID)

// 返回
{
  success: true,
  user: { _id, nickname, avatarUrl, totalGames, ... }
}
```

#### updateUserInfo - 更新用户信息
```javascript
// 入参
{
  nickname: "新昵称",  // 可选
  avatarUrl: "https://..."  // 可选
}

// 返回
{
  success: true
}
```

### 4.2 房间相关

#### createRoom - 创建房间
```javascript
// 入参
无

// 返回
{
  success: true,
  room: { _id, name, ownerId, players, ... }
}
```

**逻辑：**
1. 检查用户是否已在其他活跃房间
2. 创建房间，房间名为 "用户昵称 + 的房间"
3. 房主自动加入

#### joinRoom - 加入房间
```javascript
// 入参
{
  roomId: "room_abc123"
}

// 返回
{
  success: true,
  room: { ... }
}
```

**逻辑：**
1. 检查房间是否存在且状态为 active
2. 检查用户是否已在其他活跃房间
3. 检查房间人数是否已满 (20人)
4. 加入房间

#### getRoomInfo - 获取房间信息
```javascript
// 入参
{
  roomId: "room_abc123"
}

// 返回
{
  success: true,
  room: { ... },
  scores: [ ... ],  // 当前局的记分记录
  rankings: [ ... ] // 当前排名
}
```

#### leaveRoom - 退出房间
```javascript
// 入参
{
  roomId: "room_abc123"
}

// 返回
{
  success: true
}
```

**逻辑：**
1. 如果是房主，转移房主给下一个玩家
2. 如果是最后一个玩家，解散房间
3. 从玩家列表移除

#### dissolveRoom - 解散房间
```javascript
// 入参
{
  roomId: "room_abc123"
}

// 返回
{
  success: true,
  history: { ... }  // 结算报告
}
```

**逻辑：**
1. 只有房主可以解散
2. 生成历史记录
3. 更新房间状态为 dissolved
4. 更新所有玩家的统计数据

### 4.3 记分相关

#### addScore - 记分
```javascript
// 入参
{
  roomId: "room_abc123",
  toOpenid: "openid_2",
  amount: 5.0,
  note: "自摸"
}

// 返回
{
  success: true,
  score: { ... },
  rankings: [ ... ]  // 更新后的排名
}
```

**逻辑：**
1. 验证房间存在且状态为 active
2. 验证记分人和被记分人都在房间内
3. 验证 amount > 0
4. 验证记分人 ≠ 被记分人（不能给自己加分）
5. 创建记分记录
6. 更新房间的 lastScoreAt
7. 返回更新后的排名

#### nextRound - 下一局（含1分钟防重复）
```javascript
// 入参
{
  roomId: "room_abc123"
}

// 返回
// 成功：
{ success: true, currentRound: 5 }

// 失败（1分钟内重复点击）：
{ success: false, message: "已有人点击，一分钟后再试" }

// 失败（当前局无记分记录）：
{ success: false, message: "当前局还没有记分记录" }
```

**逻辑：**
1. 验证房间存在且状态为 active
2. 验证当前局至少有 1 条记分记录
3. **检查 lastNextRoundTime**：如果当前时间 - lastNextRoundTime < 60秒，返回失败
4. 更新 currentRound + 1
5. 更新 lastNextRoundTime 为当前时间

**实现代码：**
```javascript
exports.main = async (event, context) => {
  const db = cloud.database()
  const { roomId } = event
  const { OPENID } = context
  
  const room = await db.collection('rooms').doc(roomId).get()
  const { currentRound, lastNextRoundTime } = room.data
  
  // 检查：1分钟内再次点击无效
  if (lastNextRoundTime) {
    const diff = Date.now() - new Date(lastNextRoundTime).getTime()
    if (diff < 60000) {
      return { 
        success: false, 
        message: '已有人点击，一分钟后再试' 
      }
    }
  }
  
  // 检查：当前局至少有1条记分记录
  if (currentRound > 0) {
    const scores = await db.collection('scores')
      .where({ roomId, roundNum: currentRound })
      .limit(1)
      .get()
      
    if (scores.data.length === 0) {
      return { success: false, message: '当前局还没有记分记录' }
    }
  }
  
  // 更新局数 + 记录时间
  await db.collection('rooms').doc(roomId).update({
    data: {
      currentRound: currentRound + 1,
      lastNextRoundTime: db.serverDate()
    }
  })
  
  return { success: true, currentRound: currentRound + 1 }
}
```

#### getScores - 获取记分记录
```javascript
// 入参
{
  roomId: "room_abc123",
  roundNum: 4  // 可选，不传则返回所有
}

// 返回
{
  success: true,
  scores: [ ... ]
}
```

### 4.4 统计相关

#### getHistory - 获取历史战绩
```javascript
// 入参
{
  page: 1,
  pageSize: 20
}

// 返回
{
  success: true,
  list: [ ... ],
  total: 100
}
```

#### getStats - 获取个人统计
```javascript
// 入参
无

// 返回
{
  success: true,
  stats: {
    totalGames: 28,
    totalWins: 15,
    totalWinScore: 1280,
    totalLoseScore: 860,
    maxSingleWin: 350,
    maxStreak: 5,
    winRate: 53.6
  }
}
```

#### getFriendsRank - 获取好友排行

基于房间历史统计一起玩过的玩家排行。

**好友判定逻辑**：查询 `history` 集合中当前用户参与过的房间，提取同房玩家 openid 列表（排除自己）。

```javascript
// 入参
{
  sortBy: "winRate"  // winRate | totalGames | netScore
}

// 返回
{
  code: 0,
  list: [
    {
      _id: "openid",
      nickname: "张三",
      avatarUrl: "...",
      totalGames: 10,
      totalWins: 6,
      winRate: 60.0,
      netScore: 120
    }
  ],
  total: 5
}
```

**无好友时**：返回空列表，前端提示"暂无好友，去创建房间邀请好友吧"。

---

## 五、前端架构

### 5.1 目录结构

```
miniprogram/
├── app.js                    # 小程序入口
├── app.json                  # 全局配置
├── app.wxss                  # 全局样式
├── pages/
│   ├── index/                # 首页
│   │   ├── index.js
│   │   ├── index.json
│   │   ├── index.wxml
│   │   └── index.wxss
│   ├── room/                 # 记分房间
│   │   ├── index.js
│   │   ├── index.json
│   │   ├── index.wxml
│   │   └── index.wxss
│   ├── history/              # 历史战绩
│   │   └── ...
│   ├── historyDetail/        # 战绩详情
│   │   └── ...
│   ├── stats/                # 个人统计
│   │   └── ...
│   ├── friends/              # 好友排行
│   │   └── ...
│   └── profile/              # 个人资料
│       └── ...
├── components/               # 自定义组件
│   ├── player-card/          # 玩家卡片
│   ├── score-modal/          # 记分弹窗
│   ├── score-record/         # 记分记录
│   └── tab-bar/              # 底部导航
├── utils/                    # 工具函数
│   ├── api.js                # 云函数调用封装
│   ├── util.js               # 通用工具（时间格式化等）
│   └── auth.js               # 登录相关
└── static/                   # 静态资源
    └── images/
```

### 5.2 核心组件

#### player-card 玩家卡片
```javascript
// 属性
{
  player: Object,    // 玩家信息
  rank: Number,      // 排名
  score: Number,     // 当前分数
  onTap: Function    // 点击事件
}
```

#### score-modal 记分弹窗
```javascript
// 属性
{
  visible: Boolean,
  targetPlayer: Object,
  onConfirm: Function,
  onCancel: Function
}
```

### 5.3 实时数据同步

使用云数据库的实时推送功能：

```javascript
// 监听房间数据变化
const watcher = db.collection('rooms')
  .doc(roomId)
  .watch({
    onChange: function(snapshot) {
      // 数据变化，更新界面
      updateRoomData(snapshot.docs[0]);
    },
    onError: function(err) {
      console.error('监听失败', err);
    }
  });

// 监听记分记录变化
const scoreWatcher = db.collection('scores')
  .where({ roomId: roomId })
  .orderBy('createdAt', 'desc')
  .limit(50)
  .watch({
    onChange: function(snapshot) {
      // 更新记分列表
      updateScoreList(snapshot.docs);
    },
    onError: function(err) {
      console.error('监听失败', err);
    }
  });
```

### 5.4 "下一局"按钮交互

```html
<!-- WXML -->
<button 
  disabled="{{cooldown > 0}}" 
  bindtap="onNextRound"
>
  {{cooldown > 0 ? '请等待 ' + cooldown + ' 秒' : '下一局'}}
</button>
```

```javascript
// JS
Page({
  data: { cooldown: 0 },
  
  async onNextRound() {
    if (this.data.cooldown > 0) return
    
    const res = await wx.cloud.callFunction({
      name: 'nextRound',
      data: { roomId: this.data.roomId }
    })
    
    if (!res.result.success) {
      wx.showToast({
        title: res.result.message,
        icon: 'none',
        duration: 2000
      })
    }
  }
})
```

---

## 六、开发计划

### 6.1 里程碑

| 阶段 | 时间 | 交付物 |
|------|------|--------|
| M1: 环境搭建 | Day 1 | 云开发环境、项目结构 |
| M2: 核心功能 | Day 2-4 | 登录、创建/加入房间、记分 |
| M3: 实时同步 | Day 5-6 | 实时排名、多端同步 |
| M4: 次要功能 | Day 7-8 | 历史战绩、个人统计 |
| M5: 测试优化 | Day 9-10 | 测试、bug 修复、性能优化 |

### 6.2 详细任务

#### Day 1: 环境搭建
- [ ] 注册微信小程序
- [ ] 开通云开发
- [ ] 创建项目结构
- [ ] 配置云函数
- [ ] 创建数据库集合

#### Day 2: 用户系统
- [ ] 实现 wx.login
- [ ] 实现用户信息获取
- [ ] 实现 login 云函数
- [ ] 实现 getUserInfo 云函数

#### Day 3: 房间系统
- [ ] 实现 createRoom 云函数
- [ ] 实现 joinRoom 云函数
- [ ] 实现首页 UI
- [ ] 实现房间分享

#### Day 4: 记分系统
- [ ] 实现 addScore 云函数
- [ ] 实现 nextRound 云函数（含1分钟防重复）
- [ ] 实现记分 UI
- [ ] 实现记分弹窗

#### Day 5: 实时同步
- [ ] 实现房间数据监听
- [ ] 实现记分记录监听
- [ ] 实现实时排名
- [ ] 实现多端同步测试

#### Day 6: 房间管理
- [ ] 实现 leaveRoom 云函数
- [ ] 实现 dissolveRoom 云函数
- [ ] 实现自动解散检查（查询时判断 lastScoreAt）
- [ ] 实现结算报告

#### Day 7: 历史战绩
- [ ] 实现 history 集合写入
- [ ] 实现 getHistory 云函数
- [ ] 实现历史战绩 UI
- [ ] 实现战绩详情 UI

#### Day 8: 个人统计
- [ ] 实现 getStats 云函数
- [ ] 实现个人统计 UI
- [ ] 实现好友排行（可选）

#### Day 9: 测试
- [ ] 功能测试
- [ ] 多设备测试
- [ ] 边界条件测试
- [ ] 性能测试

#### Day 10: 优化上线
- [ ] Bug 修复
- [ ] 性能优化
- [ ] 体验优化
- [ ] 提交审核

---

## 七、注意事项

### 7.1 安全性
- 所有云函数通过 `context.OPENID` 验证用户身份
- 记分操作需要验证用户在房间内
- 不能给自己加分
- 防止重复记分（幂等性）

### 7.2 并发控制
- **下一局防重复**：使用 `lastNextRoundTime` 字段，1分钟内只允许点击一次
- **同时记分**：云数据库支持并发写入，不会冲突
- **同时加入房间**：使用 `db.runTransaction()` 事务确保人数不超过上限

### 7.3 性能
- 实时监听需要限制数据量（最近 50 条）
- 排名计算在服务端完成
- 图片使用云存储 CDN
- watch() 同一时刻最多 50 个连接（20人房间没问题）

### 7.4 自动解散
- 云开发没有定时器（cron）
- 实现方式：每次查询房间信息时检查 `lastScoreAt`，超过 30 分钟标记为 dissolved
- 用户尝试操作已解散房间时，提示"房间已解散"

### 7.5 云开发免费额度
- 每日读次数：50,000
- 每日写次数：20,000
- 数据库存储：2GB
- 云函数调用：50,000 次
- 初期足够使用，后期按量付费

### 7.6 用户体验
- 加载状态提示
- 错误提示友好
- 断网重连处理
- 动画流畅

---

*文档版本：v1.3*  
*创建日期：2026-05-19*  
*更新日期：2026-05-19*
