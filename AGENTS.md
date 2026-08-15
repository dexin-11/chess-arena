# AGENTS.md

面向 AI 编码代理的仓库指引。修改本仓库代码前请阅读。

## 项目概览

在线双人棋类对战平台（五子棋 / 国际象棋 / 中国象棋），基于 **Cloudflare Workers + Durable Objects (SQLite)** 架构，纯前端无框架、零依赖。

- 每个房间 = 一个 DO 实例（`Room` 类），管理 WebSocket 连接、对局状态、走棋校验、重赛、求和、聊天。
- 前端（HTML/CSS/JS）全部内联在 Worker 入口 `src/index.js` 中（单文件 SPA，无构建工具）。
- 规则引擎为纯函数模块，服务端与客户端共用。

## 目录结构

```
src/
  index.js    Worker 入口 + 前端 SPA（HTML/CSS/JS 全部内联）
  room.js     Durable Object Room：连接管理、走棋校验广播、重赛/求和/E2E 聊天
  chess.js    国际象棋规则引擎（走法生成、合法校验、将杀/逼和判定）
  xiangqi.js  中国象棋规则引擎（走法生成、将军检测、将死判定）
wrangler.toml  Cloudflare 部署配置（DO 绑定 + SQLite 迁移）
test_*.mjs    本地/集成测试脚本
```

## 常用命令

```bash
# 本地起服务（集成测试依赖 localhost:8787）
wrangler dev --local

# 测试（全部为 Node 脚本，无测试框架）
node test_local_all.mjs      # 进程内：五子棋/国际象棋/中国象棋终局
node test_local_gomoku.mjs   # 进程内：五子棋完整对局
node test_review.mjs         # 集成：走子→终局 sync 链路（需先起服务）
node test_chatfix.mjs        # 集成：E2E 聊天密文转发与重连重协商（需先起服务）

# 部署
wrangler deploy
```

## 重要约定与坑位

- **严格模式**：`src/` 为 ES 模块，处于严格模式。**未声明变量即赋值/读取会抛 `ReferenceError`**。曾有 bug 因 `gameTypeFromUrl` 未声明导致每次 WebSocket 握手失败、两端卡在"等待好友加入"。新增变量务必先 `let`/`const` 声明。
- **WebSocket 消息类型**：服务端→客户端有 `colorAssign`、`sync`（全量棋盘）、`moveUpdate`（增量走子）、`gameOver`、`status` 等；客户端→服务端有 `ping`、`latency`、`move`、`rematchRequest/Accept/Decline`、`drawOffer/Accept/Decline`、`chat`、`pubKey`。新增消息需在 `handleMessage` 的 switch 中注册。
- **增量 vs 全量同步**：走子用 `broadcastMoveUpdate`（增量，payload 小）；仅在游戏开始、重连、终局时用 `broadcastSync`（全量）。不要随意把走子改成全量 sync。
- **棋种与先行**：五子棋 `['black','white']` 黑先；国际象棋 `['white','black']` 白先；中国象棋 `['red','black']` 红先。路由分支以 `this.gameType` 为准。
- **E2E 聊天**：`chat` 消息只转发密文（`iv`+`ct`），服务端不读取明文；公钥经 `pubKey` 转发。新增聊天逻辑务必保持不落地明文。
- **状态持久化**：DO 用 SQLite 持久化对局状态；`rematchVotes`、`drawOffered` 为内存态，断线/重赛时需清理，避免残留。
- **客户端二次校验**：服务端对每次走子独立校验合法性，不能信任客户端。合法走法列表由 `getLegalMoves` 生成，服务端必须在其中精确匹配。

## 修改规范

- 保持与现有代码同构：新增棋种/分支时参照现有 chess/xiangqi 分支的写法。
- 修改后运行相关测试，确认未引入回归（尤其是 `test_review`、`test_chatfix` 这类集成测试，能暴露握手/同步链路问题）。
- 注释与用户沟通使用中文；代码标识符保持英文。