# 棋类对战

支持**五子棋**、**国际象棋**、**中国象棋**的在线双人对战平台。基于 Cloudflare Workers + Durable Objects 架构，纯前端无框架，走棋增量更新，断线自动重连。

## 目录

- [功能特性](#功能特性)
- [项目结构](#项目结构)
- [技术架构](#技术架构)
- [对局流程](#对局流程)
- [棋盘与规则](#棋盘与规则)
  - [五子棋](#五子棋)
  - [国际象棋](#国际象棋)
  - [中国象棋](#中国象棋)
- [UI 与交互](#ui-与交互)
- [重赛机制](#重赛机制)
- [求和功能](#求和功能)
- [复盘与模拟重下](#复盘与模拟重下)
- [断线重连](#断线重连)
- [本地开发](#本地开发)
- [部署](#部署)

---

## 功能特性

| 特性 | 说明 |
|---|---|
| 三种棋类 | 五子棋、国际象棋、中国象棋 |
| 实时对战 | WebSocket 双向通信，走棋即时同步 |
| 增量渲染 | 走棋只更新变化格子，选中态无需重建棋盘 |
| 断线重连 | DO SQLite 持久化棋局，断开后 2 秒自动重连恢复 |
| 重赛协商 | 双方可发起重赛，先申请者锁定棋种，对方同意/拒绝 |
| 求和功能 | 对局中任意一方可发起求和，对方同意则判和，拒绝/取消则继续 |
| 将军提示 | 国际象棋、中国象棋被将军时闪烁提示 |
| 被吃子提示 | 己方棋子被吃时红字短暂提示 |
| 复盘 | 对局结束后逐步回放每一步走棋，支持键盘方向键导航 |
| 模拟重下 | 复盘基础上点击棋盘本地轮流落子，五子连珠自动判定胜负并红字提示 |
| 复盘导出 | 导出为自包含 HTML 离线复盘，支持模拟重下与胜负判定 |
| 棋子翻转 | 黑方/红方视角自动翻转为下方 |
| 响应式布局 | 棋盘自适应屏幕，支持移动端 |
| 零依赖 | 纯 JavaScript，无框架依赖 |

---

## 项目结构

```
workspace/
├── src/
│   ├── index.js       # Worker 入口 + HTML/CSS/JS 前端（单文件 SPA）
│   ├── room.js        # Durable Object 房间逻辑（对局状态、走棋、重赛、持久化）
│   ├── chess.js       # 国际象棋规则引擎（走法生成、合法校验、终局判定）
│   └── xiangqi.js     # 中国象棋规则引擎（走法生成、将军检测、终局判定）
├── wrangler.toml      # Cloudflare 部署配置
└── .gitignore
```

### 文件职责

| 文件 | 职责 |
|---|---|
| [src/index.js](src/index.js) | Worker 入口：HTTP 路由（首页/对局页）、WebSocket 代理到 DO、前端 UI（HTML/CSS/JS 全部内联） |
| [src/room.js](src/room.js) | Durable Object `Room` 类：WebSocket 管理、走棋校验与广播、重赛协商、SQLite 持久化、断线处理 |
| [src/chess.js](src/chess.js) | 国际象棋规则引擎：棋盘表示、走法生成、合法走法过滤、将军/将死/逼和判定 |
| [src/xiangqi.js](src/xiangqi.js) | 中国象棋规则引擎：棋盘表示、走法生成、将军检测、将死判定 |

---

## 技术架构

### 整体架构

```
浏览器 ──WebSocket──> Cloudflare Worker (index.js) ──> Durable Object (room.js)
                                        │
                                   HTML/CSS/JS (内联返回)
```

- **Worker** ([index.js](src/index.js))：处理 HTTP 请求返回首页/对局页 HTML，将 WebSocket 请求路由到 Durable Object
- **Durable Object** ([room.js](src/room.js))：每个房间一个 DO 实例，管理对局状态、WebSocket 连接、走棋逻辑、持久化
- **前端**：内联在 Worker 中的 HTML/CSS/JS，无构建工具，无框架依赖

### 关键设计决策

**增量渲染**：走棋和选中态切换只更新受影响格子，不重建整个棋盘（避免 64-90 格 DOM 重建的卡顿）。

- `renderChessMove` / `renderXiangqiMove`：走棋后更新 from/to 格 + lastMove 标记 + 将军高亮
- `refreshChessSelection` / `refreshXiangqiSelection`：选中态切换只操作 selected class 和 move-dot/capture-ring 元素
- 全量 `renderChess` / `renderXiangqi` 仅在 `colorAssign` / `sync` 等需要重建的场景使用

**WebSocket 消息类型**：

| 消息 | 方向 | 说明 |
|---|---|---|
| `colorAssign` | 服务端→客户端 | 分配颜色 + 棋种 |
| `sync` | 服务端→客户端 | 全量同步棋盘状态 |
| `move` | 客户端→服务端 | 走棋请求 |
| `moveApplied` | 服务端→客户端 | 走棋确认（增量） |
| `check` | 服务端→客户端 | 将军通知 |
| `gameOver` | 服务端→客户端 | 对局结束 |
| `rematchRequest` / `rematchAccept` / `rematchDecline` | 双向 | 重赛协商 |
| `rematchStart` | 服务端→客户端 | 重赛已开始 |
| `drawRequest` / `drawAccept` / `drawDecline` | 双向 | 求和协商 |
| `opponentLeft` / `opponentRejoin` | 服务端→客户端 | 对手断线/重连 |
| `status` | 服务端→客户端 | 延迟与在线状态 |

**持久化**：使用 DO SQLite 存储对局状态（`gameType`、`board`、`chessState`、`xiangqiState`、`lastMove`、`currentTurn`、`gameOver`、`winner`、`draw`），DO 重启后自动恢复，支持断线重连。

**智能放置**：Worker 按客户端 IP 所在国家动态选择最近的 DO 节点（`pickLocationHint`），降低首屏与走棋 RTT。

---

## 对局流程

```
1. 首页选择棋种 → 生成 6 位房间 ID → 跳转对局页
2. 对局页建立 WebSocket 连接（/ws?room=xxx&game=xxx）
3. 服务端分配颜色（colorAssign），发送棋盘初始状态（sync）
4. 显示等待界面，复制链接邀请好友
5. 好友加入 → 双方进入对局
6. 轮流出棋 → 走棋增量同步（move / moveApplied）
7. 对局结束 → 显示结果弹窗，可发起重赛
```

### 房间创建

- 首页点击任一棋种，生成随机 6 位房间 ID，URL 为 `?room=xxx&game=gomoku|chess|xiangqi`
- 第一个连接者成为先手方（五子棋=黑、国际象棋=白、中国象棋=红）
- 第二个连接者成为后手方，棋盘自动翻转

---

## 棋盘与规则

### 五子棋

- 15×15 棋盘，黑先白后
- 五子连珠判定胜负（横、竖、斜）
- 纯前端渲染 + 服务端校验

### 国际象棋

- 8×8 棋盘，白先黑后
- 完整规则引擎（[chess.js](src/chess.js)）：
  - 所有棋子标准走法
  - 王车易位（短易位/长易位，含合法性校验）
  - 过路兵（en passant）
  - 兵升变（promotion，弹窗选择后/车/象/马）
  - 将军（check）与将死（checkmate）判定
  - 逼和（stalemate）判定
- 选中棋子时本地计算合法走法，避免 RTT 延迟
- 走法提交到服务端二次校验，确保安全性

### 中国象棋

- 10×9 棋盘（9 列 10 行），红先黑后
- 完整规则引擎（[xiangqi.js](src/xiangqi.js)）：
  - 将/帅（九宫格内移动）
  - 士/仕（九宫斜线）
  - 象/相（田字格，不能过河，塞象眼）
  - 马（日字格，蹩马腿）
  - 车（直线任意距离）
  - 炮（直线移动，吃子须翻山）
  - 兵/卒（未过河只能前进，过河可左右）
  - 飞将（将帅同列无遮挡）检测
  - 将军与将死判定
- 楚河汉界标记
- 十字花角标（兵卒位与炮位棋盘装饰）
- 选中棋子时本地计算合法走法

---

## UI 与交互

### 棋盘样式

- 五子棋：木质棋盘 + 立体棋子（radial-gradient 模拟）
- 国际象棋：浅/深色交替格子 + Unicode 棋子字形 + 8 方向 text-shadow 描边
- 中国象棋：木质棋盘 + 十字线 + 楚河汉界 + 木质浮雕硬币棋子

### 走棋标记

- **落点**：棋子边缘绿色环（`#4ecca3`）
- **起点**：交叉点中心黄色圆点（`#f0a500`）
- 五子棋只有落点（落子型游戏无起点概念）

### 状态提示

- 顶部状态栏：己方颜色、当前回合、对手在线状态与延迟
- 棋盘上方：将军提示（红色闪烁）、回合提示、被吃子提示（红字，3.5s 自动消失）、模拟重下胜负提示（红字「黑方赢了」/「白方赢了」）
- 选中棋子：格子红框高亮 + 合法走法标记（空心点=移动、圆环=吃子）

### 响应式适配

- 棋盘尺寸 `min(96vw, calc(100dvh - 130px))` 自适应屏幕
- 移动端安全区域适配（`env(safe-area-inset-top)`）
- 移动端禁用双击缩放（`touch-action: manipulation`）

---

## 重赛机制

### 先申请者锁定棋种

1. 对局结束后显示结果弹窗，可选择棋种并发起重赛
2. **先到达服务端者为请求方**，其棋种锁定
3. 后申请者收到"对方申请再下一盘 [棋种]"弹窗，只能同意/拒绝
4. 同意 → 按请求方棋种开新局（颜色重新随机分配）
5. 拒绝 → 协商终止，双方回到结果界面

### 状态管理

- 服务端 `rematchVotes` Map 记录请求方棋种
- 拒绝/断线时清空 votes，避免残留影响后续申请
- 服务端显式广播 `rematchStart`，不依赖 `colorAssign` 副作用

---

## 求和功能

对局中任意一方可点击"求和"按钮发起求和请求，对方可选择同意或拒绝：

1. 点击"求和" → 发送 `drawRequest`，显示"等待对方回应求和..."弹窗
2. 对方收到求和弹窗（`drawRequestModal`），可选择"同意"或"拒绝"
3. 同意 → 服务端判为和棋（`gameOver` + `draw:true`），双方进入结果界面显示"🤝 和棋"
4. 拒绝 → 请求方收到"对方拒绝了求和请求"提示，对局继续
5. 请求方可随时"取消"等待中的求和请求

### 同时发起求和

双方几乎同时点击"求和"时，先到达服务端者为请求方，后到者的 `drawRequest` 被视为同意，直接判和。

### 状态管理

- 服务端 `drawOffered` 记录请求方 wsId，防止重复请求
- 仅在非结束状态（`!gameOver`）且无未处理求和时接受新请求
- 求和状态为内存态（不持久化），断线/重赛时自动清除，避免恢复后残留
- 断线时清除未处理求和，对方收到 `opponentLeft` 后关闭求和弹窗

---

## 复盘与模拟重下

### 复盘

对局结束后点击「复盘」进入复盘模式，逐步回放整局走棋：

- 底部复盘控制条：⏮ 开局 / ◀ 上一步 / ▶ 下一步 / ⏭ 结局
- 键盘快捷键：`←` / `→` 翻步，`Home` / `End` 跳到开局/结局
- 每一步对应一个棋盘快照（含开局状态），从 `moveHistory` 重建渲染

### 模拟重下

在复盘基础上从当前步开始本地轮流落子，探索不同变化（不发送到服务端）：

- 进入方式：点击「模拟重下」按钮，或直接点击棋盘空格自动进入
- 棋盘绿色描边高亮表示模拟重下中
- 五子棋黑白轮流落子，导航复盘前自动退出模拟重下
- **胜负判定**：五子连珠后自动结束模拟对局，棋盘顶部红字显示「黑方赢了」/「白方赢了」
- 胜负已分后停止落子，再次点击「模拟重下」退出并恢复复盘快照
- 国际象棋、中国象棋暂不支持模拟重下

### 复盘导出

点击「导出」生成自包含 HTML 文件，可在任意浏览器离线打开复盘：

- 内联 CSS + JS，快照以 JSON 内嵌，无需网络与服务端
- 支持逐步导航与模拟重下
- 模拟重下中导出会附加当前模拟状态作为最后一步
- 导出文件同样支持五子连珠胜负判定与红字提示

---

## 断线重连

### 客户端

- WebSocket `onclose` 触发后 2 秒自动重连
- 重连后收到 `colorAssign` + `sync` 恢复棋盘状态
- 对局已结束时自动恢复结果界面（含赢/输/和棋文案）

### 服务端

- DO SQLite 持久化完整对局状态
- DO 重启后 `ensureStateLoaded` 自动恢复
- 断线时通知对方 `opponentLeft`，重连时 `opponentRejoin`
- 断线方重连走重连分支（不发 `colorAssign` 但发 `sync`）

---

## 本地开发

### 前置条件

- [Node.js](https://nodejs.org/) ≥ 18
- [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/)

```bash
npm install -g wrangler
```

### 启动开发服务器

```bash
cd /path/to/workspace
wrangler dev
```

启动后访问 `http://localhost:8787` 即可看到首页。

### 调试

- `wrangler dev` 默认开启 live reload
- 走棋日志在浏览器控制台查看
- DO 状态在 Wrangler Dashboard 中可查看

---

## 部署

### 部署到 Cloudflare Workers

```bash
wrangler deploy
```

### 配置说明

[wrangler.toml](wrangler.toml)：

```toml
name = "gomoku"
main = "src/index.js"
compatibility_date = "2024-12-01"

[placement]
mode = "smart"  # 智能放置 Worker 到离用户更近的节点

[[durable_objects.bindings]]
name = "ROOM"
class_name = "Room"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["Room"]
```

- `name`：Worker 名称
- `main`：入口文件
- `placement.mode = "smart"`：启用智能放置，降低用户延迟
- `durable_objects.bindings`：绑定 DO 类 `Room` 到 `ROOM` 命名空间
- `migrations`：SQLite DO 迁移配置

### 首次部署

首次部署需创建 DO 命名空间，`wrangler deploy` 会自动处理。若需手动创建：

```bash
wrangler deploy --keep-vars
```

### 环境变量

无需额外环境变量。Worker 直接使用 `wrangler.toml` 中的 DO 绑定。

---

## 技术栈

| 层 | 技术 |
|---|---|
| 运行时 | Cloudflare Workers |
| 有状态服务 | Cloudflare Durable Objects (SQLite) |
| 通信 | WebSocket |
| 前端 | HTML + CSS + JavaScript（无框架，零依赖） |
| 部署 | Wrangler CLI |
| 字体 | Google Fonts（Sora, JetBrains Mono, Ma Shan Zheng, ZCOOL XiaoWei, Noto Sans Symbols） |