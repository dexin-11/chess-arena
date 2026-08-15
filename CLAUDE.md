# CLAUDE.md

本仓库的代理指引统一维护在 [AGENTS.md](./AGENTS.md)。请以 AGENTS.md 为准。

要点速览：
- Cloudflare Workers + Durable Objects (SQLite) 双人棋类游戏（五子棋/国际象棋/中国象棋）。
- `src/index.js` 内联全部前端；`src/room.js` 为 DO 房间逻辑；`src/chess.js` / `src/xiangqi.js` 为规则引擎。
- 本地测试：`node test_local_all.mjs`、`node test_local_gomoku.mjs`；集成测试 `test_review.mjs` / `test_chatfix.mjs` 需先 `wrangler dev --local`。
- 严格模式：未声明变量会抛 ReferenceError（曾致握手失败）。新增变量务必先声明。
- 走子用增量 `moveUpdate`，仅开始/重连/终局用全量 `sync`。
- 详细约定见 [AGENTS.md](./AGENTS.md)。