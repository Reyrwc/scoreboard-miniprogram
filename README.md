# 记分板

线下多人棋牌、桌游实时记分的微信小程序。替代纸笔记录，多人实时同步，自动统计战绩。

## 功能特性

### 核心功能 (P0)

- **微信登录** — 授权登录，自动获取头像和昵称
- **创建/加入房间** — 随机房间名 + 4 位随机码，支持分享链接和二维码扫码加入，最多 20 人
- **实时记分** — 点击玩家头像加分，记分人自动扣减相应分数，支持小数和备注（如"自摸"、"杠"）
- **下一局** — 记录局数，1 分钟防重复机制
- **实时排名** — 按积分从高到低排序，所有端实时刷新
- **解散/结算** — 任何成员可解散，2 分钟无记分自动解散，生成结算报告

### 次要功能 (P1)

- **历史战绩** — 按日期查看过往房间记录和详细记分
- **个人统计** — 总场次、胜率、净得分、最高连胜等

### 锦上添花 (P2)

- **好友排行** — 基于同房记录统计，支持按胜率/场次/净得分排序
- **个人资料编辑** — 修改头像和昵称，实时同步到所在房间

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 微信小程序原生 (WXML/WXSS/JS)，基础库 3.0+ |
| 后端 | 微信云开发 (CloudBase) |
| 数据库 | 云数据库 (MongoDB) |
| 实时同步 | 数据库 `watch()` API 实时推送 |
| 设计系统 | CSS Variables |

## 项目结构

```
miniprogram/
├── app.js                    # 入口，初始化云开发
├── app.json                  # 全局配置，页面路由，tabBar
├── app.wxss                  # 全局样式
├── pages/
│   ├── index/                # 首页（头像 + 统计 + 创建/扫码按钮）
│   ├── room/                 # 记分房间（玩家网格 + 记分弹窗 + 记录列表）
│   ├── history/              # 历史战绩列表
│   ├── historyDetail/        # 战绩详情
│   ├── stats/                # 个人统计
│   ├── friends/              # 好友排行
│   └── profile/              # 我的（个人资料 + 设置菜单）
├── components/
│   ├── player-card/          # 玩家卡片组件
│   ├── score-modal/          # 记分弹窗组件
│   └── score-record/         # 记分记录组件
├── utils/
│   ├── api.js                # 云函数调用封装
│   ├── util.js               # 通用工具函数
│   └── auth.js               # 登录相关
└── static/images/            # 静态资源

cloudfunctions/
├── login/                    # 登录/注册
├── getUserInfo/              # 获取用户信息（含活跃房间检测）
├── updateUserInfo/           # 更新用户信息
├── createRoom/               # 创建房间
├── joinRoom/                 # 加入房间
├── getRoomInfo/              # 获取房间信息
├── leaveRoom/                # 退出房间
├── dissolveRoom/             # 解散房间
├── addScore/                 # 记分
├── nextRound/                # 下一局
├── getScores/                # 获取记分记录
├── getHistory/               # 获取历史战绩
├── getStats/                 # 获取个人统计
└── getFriendsRank/           # 获取好友排行
```

## 快速开始

### 前置条件

- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 已注册微信小程序并开通云开发

### 安装与运行

1. 克隆项目

```bash
git clone https://github.com/Reyrwc/scoreboard-miniprogram.git
```

2. 使用微信开发者工具打开项目根目录

3. 在云开发控制台创建以下数据库集合：

   - `users`
   - `rooms`
   - `scores`
   - `history`

4. 上传并部署 `cloudfunctions/` 下所有云函数

5. 在微信开发者工具中编译运行

## 数据模型

### users 集合

```javascript
{
  _id: "openid",           // 微信 openid
  nickname: "张三",         // 昵称
  avatarUrl: "https://...", // 头像 URL
  totalGames: 28,           // 总场次
  totalWins: 15,            // 总胜场
  totalWinScore: 1280,      // 总赢分
  totalLoseScore: 860,      // 总输分
  maxSingleWin: 350,        // 最大单局赢分
  maxStreak: 5              // 最高连胜
}
```

### rooms 集合

```javascript
{
  _id: "room_abc123",
  name: "快乐老家AB12",       // 随机名 + 4 位随机码
  ownerId: "openid_owner",    // 房主 openid（退出后保留）
  players: [                  // 所有玩家（含已退出，通过 active 区分）
    { openid, nickname, avatarUrl, joinedAt, active: true },
    { openid, nickname, avatarUrl, joinedAt, active: false }
  ],
  currentRound: 0,
  lastNextRoundTime: null,
  status: "active",           // active | dissolved
  lastScoreAt: "2026-...",
  dissolvedAt: null
}
```

### scores 集合

```javascript
{
  _id: "score_xyz789",
  roomId: "room_abc123",
  roundNum: 4,
  fromOpenid: "openid_1",     // 记分人
  toOpenid: "openid_2",       // 被记分人
  amount: 5.0,                 // 正数，记分人自动扣减
  note: "自摸",
  createdAt: "2026-..."
}
```

### history 集合

```javascript
{
  _id: "hist_def456",
  roomId: "room_abc123",
  roomName: "快乐老家AB12",
  playerCount: 4,
  roundCount: 4,
  players: [
    { openid, nickname, avatarUrl, finalScore: 50, rank: 1 }
  ],
  createdAt: "2026-...",
  dissolvedAt: "2026-..."
}
```

## 关键设计决策

| 决策 | 说明 |
|------|------|
| 实时同步 | 使用云数据库 `watch()` API，非轮询 |
| 自动解散 | 三层保障：客户端定时器 + 服务端懒检查 + 孤儿房间兜底 |
| 玩家退出 | 标记 `active: false` 而非删除，保留信息供他人继续记分 |
| 并发控制 | 下一局用 `lastNextRoundTime` 防重复；加入房间用事务确保人数不超限 |
| 设计系统 | CSS Variables 管理设计 Token，iOS 风格简约设计 |

## 记分规则

1. 点击任意玩家头像 → 输入正数分数（支持小数点后 1 位）
2. 被点击玩家 **加分**，记分人 **自动扣减** 相同分数
3. 分数累计，不随"下一局"重置
4. 不能给自己加分

## 页面导航

```
Tab 1: 首页 ──→ 创建房间 ──→ 房间记分页
       │         扫码进房 ──→ 房间记分页
       └── 进行中的房间卡片 ──→ 房间记分页

Tab 2: 我的 ──→ 历史战绩 ──→ 战绩详情
       │        个人统计
       │        好友排行
       └── 个人资料编辑
```

## 相关文档

- [产品需求文档 (PRD)](scoreboard/docs/PRD.md)
- [技术设计文档](scoreboard/docs/Technical-Design.md)
- [产品路线图](scoreboard/docs/Roadmap.md)
- [机会评估](scoreboard/docs/Opportunity-Assessment.md)
- [上市计划](scoreboard/docs/GTM-Brief.md)

## 云开发免费额度

| 资源 | 每日限额 |
|------|----------|
| 数据库读 | 50,000 次 |
| 数据库写 | 20,000 次 |
| 数据库存储 | 2 GB |
| 云函数调用 | 50,000 次 |

初期足够使用，后期按量付费。

## License

个人项目，仅供学习交流。
