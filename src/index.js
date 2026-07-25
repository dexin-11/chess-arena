import { Room } from './room.js';

export { Room };

const HOMEPAGE_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>棋类对战</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: radial-gradient(ellipse 80% 60% at 50% -20%, rgba(233,69,96,0.12), transparent 60%), radial-gradient(ellipse 60% 80% at 100% 100%, rgba(15,52,96,0.4), transparent 70%), #0a0d1a; color: #eee; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.home-card { background: linear-gradient(180deg, rgba(28,34,56,0.95), rgba(19,24,41,0.85)); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid #2a3458; border-radius: 16px; padding: 40px 32px; display: flex; flex-direction: column; align-items: center; gap: 24px; box-shadow: 0 12px 40px rgba(0,0,0,0.6); }
.home-title { font-size: 28px; font-weight: 700; color: #e94560; letter-spacing: 2px; }
.home-subtitle { font-size: 14px; color: #8892b0; margin-top: -16px; letter-spacing: 0.3px; }
.home-buttons { display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; }
.home-btn { padding: 28px 36px; border: none; border-radius: 12px; font-size: 22px; font-family: 'Sora', sans-serif; cursor: pointer; background: #e94560; color: #fff; font-weight: 600; transition: background 0.2s, transform 0.15s; min-width: 180px; letter-spacing: 1px; }
.home-btn:hover { background: #c73650; }
.home-btn:active { transform: scale(0.97); }
.home-btn.chess-btn { background: #0f3460; }
.home-btn.chess-btn:hover { background: #1a4a8a; }
</style>
</head>
<body>
<div class="home-card">
  <div class="home-title">选择棋种</div>
  <div class="home-subtitle">点击进入对战房间</div>
  <div class="home-buttons">
    <button class="home-btn" onclick="enterGame('gomoku')">五子棋</button>
    <button class="home-btn chess-btn" onclick="enterGame('chess')">国际象棋</button>
  </div>
</div>
<script>
function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}
function enterGame(game) {
  const id = generateRoomId();
  location.href = '?room=' + id + '&game=' + game;
}
</script>
</body>
</html>`;

const GAME_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>棋类对战</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
:root {
  --bg-0: #0a0d1a; --bg-1: #131829; --bg-2: #1c2238;
  --border: #2a3458; --accent: #e94560;
  --text: #e8ecf4; --text-dim: #8892b0;
  --good: #4ecca3; --warn: #f0a500; --bad: #e94560;
  --board-wood: #DEB887; --board-line: #8B7355;
  --board-size: min(96vw, calc(100vh - 130px));
  --board-size: min(96vw, calc(100dvh - 130px));
}
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { height: 100%; overflow: hidden; overscroll-behavior: none; }
body {
  font-family: 'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: radial-gradient(ellipse 80% 60% at 50% -20%, rgba(233,69,96,0.12), transparent 60%), radial-gradient(ellipse 60% 80% at 100% 100%, rgba(15,52,96,0.4), transparent 70%), var(--bg-0);
  color: var(--text);
  display: flex; flex-direction: column;
  height: 100vh; height: 100dvh;
  user-select: none; -webkit-user-select: none;
}

.header { flex-shrink: 0; padding: 8px 14px; padding-top: max(8px, env(safe-area-inset-top)); background: linear-gradient(180deg, rgba(28,34,56,0.95), rgba(19,24,41,0.85)); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px; }
.header-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 13px; font-weight: 500; }
.header-item { display: inline-flex; align-items: center; gap: 4px; color: var(--text-dim); letter-spacing: 0.3px; }
.header-item span { color: var(--text); font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 13px; }
.color-black { color: #fff !important; text-shadow: 0 0 6px rgba(255,255,255,0.4); }
.color-white { color: #e0e0e0 !important; }

.player-status { display: flex; gap: 14px; font-size: 11px; color: var(--text-dim); font-family: 'JetBrains Mono', monospace; }
.player-status .status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
.status-dot.online { background: var(--good); box-shadow: 0 0 6px var(--good); }
.status-dot.offline { background: var(--bad); }
.latency-good { color: var(--good); }
.latency-ok { color: var(--warn); }
.latency-bad { color: var(--bad); }

.board-container { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 8px; }

.status-msg { font-size: 13px; color: var(--text-dim); min-height: 18px; text-align: center; letter-spacing: 0.5px; flex-shrink: 0; font-weight: 500; }
.status-msg.check-msg { color: var(--bad); font-weight: 700; font-size: 14px; animation: checkPulse 1s ease-in-out infinite; }
@keyframes checkPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }

.board { position: relative; background: var(--board-wood); border-radius: 8px; padding: clamp(6px, 1.6vmin, 14px); box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15); width: var(--board-size); height: var(--board-size); max-width: 100%; flex-shrink: 1; min-width: 0; }
.board.chess { background: transparent; padding: 0; overflow: hidden; border-radius: 6px; box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.4); }

.board-grid { width: 100%; height: 100%; display: grid; grid-template-columns: repeat(15, 1fr); grid-template-rows: repeat(15, 1fr); gap: 0; }
.cell { width: 100%; height: 100%; position: relative; cursor: pointer; }
.cell::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: var(--board-line); }
.cell::after { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: var(--board-line); }

.cell .stone { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 82%; height: 82%; border-radius: 50%; z-index: 2; }
.stone.black { background: radial-gradient(circle at 35% 30%, #4a4a4a, #050505 70%); box-shadow: 1px 2px 4px rgba(0,0,0,0.6), inset 0 -2px 4px rgba(0,0,0,0.5); }
.stone.white { background: radial-gradient(circle at 35% 30%, #ffffff, #b0b0b0 80%); box-shadow: 1px 2px 4px rgba(0,0,0,0.4), inset 0 -2px 4px rgba(0,0,0,0.2); }

.cell .preview { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 82%; height: 82%; border-radius: 50%; z-index: 1; opacity: 0.45; pointer-events: none; }
.preview.black { background: radial-gradient(circle at 35% 30%, #4a4a4a, #050505 70%); }
.preview.white { background: radial-gradient(circle at 35% 30%, #ffffff, #b0b0b0 80%); }

.cell.disabled { cursor: default; }
.cell.disabled .preview { display: none; }

/* 国际象棋棋盘 */
.chess-grid { width: 100%; height: 100%; display: grid; grid-template-columns: repeat(8, 1fr); grid-template-rows: repeat(8, 1fr); gap: 0; }
.chess-cell { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: calc(var(--board-size) * 0.108); cursor: pointer; position: relative; user-select: none; line-height: 1; }
.chess-cell.light { background: #f0d9b5; }
.chess-cell.dark { background: #b58863; }
.chess-cell .piece { line-height: 1; pointer-events: none; font-family: 'Noto Sans Symbols 2', 'Segoe UI Symbol', 'Apple Symbols', 'Noto Sans Symbols', 'DejaVu Sans', sans-serif; transition: transform 0.15s ease; will-change: transform; }
.chess-cell .piece.white { color: #f8f6f0; text-shadow: -1px 0 0 #2a2a2a, 1px 0 0 #2a2a2a, 0 -1px 0 #2a2a2a, 0 1px 0 #2a2a2a, -1px -1px 0 #2a2a2a, 1px -1px 0 #2a2a2a, -1px 1px 0 #2a2a2a, 1px 1px 0 #2a2a2a, 0 2px 3px rgba(0,0,0,0.45); }
.chess-cell .piece.black { color: #1a1a1a; text-shadow: 0 0 1px rgba(255,255,255,0.22), 0 2px 3px rgba(0,0,0,0.5); }
.chess-cell.selected .piece { transform: translateY(-1px) scale(1.04); }
.chess-cell.selected { box-shadow: inset 0 0 0 min(0.4vmin, 4px) var(--accent); }
.chess-cell.last-move { box-shadow: inset 0 0 0 min(0.4vmin, 4px) rgba(255, 213, 79, 0.85); }
.chess-cell.check-king { box-shadow: inset 0 0 0 min(0.4vmin, 4px) #ff3333; background: #ff6666 !important; }
.chess-cell .move-dot { position: absolute; width: 32%; height: 32%; border-radius: 50%; background: rgba(0,0,0,0.28); pointer-events: none; z-index: 1; }
.chess-cell .capture-ring { position: absolute; inset: 6%; border: min(0.4vmin, 4px) solid rgba(0,0,0,0.32); border-radius: 50%; box-sizing: border-box; pointer-events: none; z-index: 1; }
.chess-cell .coord { position: absolute; font-size: min(1.6vmin, 10px); font-family: 'JetBrains Mono', monospace; font-weight: 700; pointer-events: none; }
.chess-cell .coord.file { bottom: 1px; right: 3px; }
.chess-cell .coord.rank { top: 1px; left: 3px; }
.chess-cell.light .coord { color: rgba(0,0,0,0.55); }
.chess-cell.dark .coord { color: rgba(255,255,255,0.7); }

.btn { padding: 8px 14px; border: none; border-radius: 8px; font-size: 13px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; background: var(--accent); color: #fff; transition: background 0.2s, transform 0.1s; letter-spacing: 0.3px; }
.btn:hover { background: #c73650; }
.btn:active { transform: scale(0.96); }
.btn-secondary { background: #2a3458; }
.btn-secondary:hover { background: #3a4578; }
.button-row { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; justify-content: center; }

.waiting-overlay { position: fixed; inset: 0; background: rgba(10,13,26,0.85); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; z-index: 100; }
.waiting-overlay.hidden { display: none; }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.waiting-text { font-size: 16px; color: var(--text); }

.result-overlay { position: fixed; inset: 0; background: rgba(10,13,26,0.88); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; z-index: 100; }
.result-overlay.hidden { display: none; }
.result-text { font-size: 26px; font-weight: 700; letter-spacing: 1px; }
.rematch-select-row { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--text); }
.rematch-select-row select { padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-2); color: var(--text); font-size: 14px; font-family: 'Sora', sans-serif; cursor: pointer; }
.rematch-hint { font-size: 13px; color: var(--warn); min-height: 16px; text-align: center; }

.rematch-modal { position: fixed; inset: 0; background: rgba(10,13,26,0.88); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; z-index: 110; }
.rematch-modal.hidden { display: none; }
.rematch-modal-text { font-size: 16px; color: var(--text); text-align: center; }
.rematch-buttons { display: flex; gap: 12px; }

.wait-notice-overlay { position: fixed; top: 14px; left: 50%; transform: translateX(-50%); background: var(--accent); color: #fff; padding: 12px 22px; border-radius: 10px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 20px rgba(233,69,96,0.5); z-index: 200; animation: slideDown 0.3s ease; display: flex; align-items: center; gap: 12px; }
.wait-notice-overlay .ack-btn { background: #fff; color: var(--accent); border: none; padding: 4px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px; }
@keyframes slideDown { from { transform: translate(-50%, -100px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }

.promotion-modal { position: fixed; inset: 0; background: rgba(10,13,26,0.88); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; z-index: 120; }
.promotion-modal.hidden { display: none; }
.promotion-text { font-size: 16px; color: var(--text); }
.promotion-buttons { display: flex; gap: 12px; }
.promotion-btn { font-size: 24px; min-width: 60px; }

@media (max-width: 540px) {
  :root {
    --board-size: min(98vw, calc(100vh - 120px));
    --board-size: min(98vw, calc(100dvh - 120px));
  }
  .header { padding: 6px 10px; padding-top: max(6px, env(safe-area-inset-top)); }
  .header-row { font-size: 12px; gap: 6px; }
  .header-item span { font-size: 12px; }
  .player-status { font-size: 10px; gap: 10px; }
  .btn { padding: 6px 12px; font-size: 12px; }
  .status-msg { font-size: 12px; }
  .board { border-radius: 6px; padding: clamp(4px, 1.4vmin, 10px); }
}
@media (orientation: landscape) and (max-height: 500px) {
  :root {
    --board-size: min(85vh, 80vw);
    --board-size: min(85dvh, 80vw);
  }
  .header { flex-direction: row; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; }
  .player-status { font-size: 10px; }
}
</style>
</head>
<body>

<div class="header">
  <div class="header-row">
    <div class="header-item">房间: <span id="roomId">—</span></div>
    <div class="header-item">你: <span id="myColor">—</span></div>
    <div class="header-item">回合: <span id="turnInfo">—</span></div>
  </div>
  <div class="player-status" id="playerStatus" style="display:none">
    <span>黑棋: <span class="status-dot offline" id="blackDot"></span><span id="blackLatency">—</span></span>
    <span>白棋: <span class="status-dot offline" id="whiteDot"></span><span id="whiteLatency">—</span></span>
  </div>
</div>

<div class="board-container">
  <div class="status-msg" id="statusMsg"></div>
  <div class="board" id="board"></div>
  <div class="button-row">
    <button class="btn" id="copyBtn" onclick="copyLink()">复制链接邀请好友</button>
    <button class="btn btn-secondary" id="waitBtn" onclick="sendWaitNotice()">等一会</button>
  </div>
</div>

<div class="waiting-overlay" id="waitingOverlay">
  <div class="spinner"></div>
  <div class="waiting-text">等待好友加入...</div>
  <button class="btn" onclick="copyLink()">复制链接邀请好友</button>
</div>

<div class="result-overlay hidden" id="resultOverlay">
  <div class="result-text" id="resultText"></div>
  <div class="rematch-select-row">
    <label for="rematchGameSelect">再来一局：</label>
    <select id="rematchGameSelect">
      <option value="gomoku">五子棋</option>
      <option value="chess">国际象棋</option>
    </select>
  </div>
  <div class="rematch-hint" id="rematchHint"></div>
  <button class="btn" id="rematchBtn" onclick="requestRematch()">再来一局</button>
</div>

<div class="rematch-modal hidden" id="rematchModal">
  <div class="rematch-modal-text" id="rematchModalText">对方请求再来一局</div>
  <div class="rematch-buttons">
    <button class="btn" onclick="acceptRematch()">同意</button>
    <button class="btn btn-secondary" onclick="declineRematch()">拒绝</button>
  </div>
</div>

<div class="rematch-modal hidden" id="rematchWaiting">
  <div class="rematch-modal-text">等待对方同意...</div>
  <button class="btn btn-secondary" onclick="cancelRematch()">取消</button>
</div>

<div class="promotion-modal hidden" id="promotionModal">
  <div class="promotion-text">选择升变棋子</div>
  <div class="promotion-buttons">
    <button class="btn promotion-btn" onclick="choosePromotion('q')">后 ♕</button>
    <button class="btn promotion-btn" onclick="choosePromotion('r')">车 ♖</button>
    <button class="btn promotion-btn" onclick="choosePromotion('b')">象 ♗</button>
    <button class="btn promotion-btn" onclick="choosePromotion('n')">马 ♘</button>
  </div>
</div>

<script>
// === 国际象棋规则引擎（前端本地版，与 src/chess.js 同源） ===
// 选中棋子时本地计算合法走法，避免每次都向服务端 RTT。
const Chess = (function() {
  const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const KING_DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const KNIGHT_DELTAS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const ROOK_ORIGINS = {
    white: { '7,0': 'q', '7,7': 'k' },
    black: { '0,0': 'q', '0,7': 'k' },
  };
  const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const opposite = (color) => (color === 'white' ? 'black' : 'white');

  function cloneBoard(board) {
    return board.map((row) => row.map((cell) => (cell ? { type: cell.type, color: cell.color } : null)));
  }

  function isSquareAttacked(board, r, c, byColor) {
    const pawnRow = byColor === 'white' ? r + 1 : r - 1;
    if (inBounds(pawnRow, c - 1)) {
      const p = board[pawnRow][c - 1];
      if (p && p.color === byColor && p.type === 'p') return true;
    }
    if (inBounds(pawnRow, c + 1)) {
      const p = board[pawnRow][c + 1];
      if (p && p.color === byColor && p.type === 'p') return true;
    }
    for (const [dr, dc] of KNIGHT_DELTAS) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p && p.color === byColor && p.type === 'n') return true;
      }
    }
    for (const [dr, dc] of KING_DIRS) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p && p.color === byColor && p.type === 'k') return true;
      }
    }
    for (const [dr, dc] of ROOK_DIRS) {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p) {
          if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
          break;
        }
        nr += dr; nc += dc;
      }
    }
    for (const [dr, dc] of BISHOP_DIRS) {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p) {
          if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
          break;
        }
        nr += dr; nc += dc;
      }
    }
    return false;
  }

  function findKing(board, color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === color) return { r, c };
      }
    }
    return null;
  }

  function isInCheck(board, color) {
    const king = findKing(board, color);
    if (!king) return false;
    return isSquareAttacked(board, king.r, king.c, opposite(color));
  }

  function getPseudoLegalMoves(board, r, c, state) {
    const piece = board[r][c];
    if (!piece) return [];
    const color = piece.color;
    const opponent = opposite(color);
    const moves = [];
    const add = (tr, tc, special) => {
      if (!inBounds(tr, tc)) return;
      const target = board[tr][tc];
      if (target && target.color === color) return;
      const move = { from: { r, c }, to: { r: tr, c: tc } };
      if (special) move.special = special;
      moves.push(move);
    };
    switch (piece.type) {
      case 'p': {
        const dir = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        const lastRow = color === 'white' ? 0 : 7;
        const fr = r + dir;
        if (inBounds(fr, c) && !board[fr][c]) {
          if (fr === lastRow) add(fr, c, 'promotion');
          else add(fr, c);
          const fr2 = r + 2 * dir;
          if (r === startRow && inBounds(fr2, c) && !board[fr2][c]) add(fr2, c);
        }
        for (const dc of [-1, 1]) {
          const tr = r + dir, tc = c + dc;
          if (!inBounds(tr, tc)) continue;
          const target = board[tr][tc];
          if (target && target.color === opponent) {
            if (tr === lastRow) add(tr, tc, 'promotion');
            else add(tr, tc);
          } else if (state && state.enPassantTarget &&
                     state.enPassantTarget.r === tr && state.enPassantTarget.c === tc) {
            add(tr, tc, 'enpassant');
          }
        }
        break;
      }
      case 'n': {
        for (const [dr, dc] of KNIGHT_DELTAS) add(r + dr, c + dc);
        break;
      }
      case 'k': {
        for (const [dr, dc] of KING_DIRS) add(r + dr, c + dc);
        if (state && state.castlingRights && state.castlingRights[color]) {
          const rights = state.castlingRights[color];
          const kingRow = color === 'white' ? 7 : 0;
          if (r === kingRow && c === 4 && !isSquareAttacked(board, kingRow, 4, opponent)) {
            if (rights.k && !board[kingRow][5] && !board[kingRow][6] &&
                board[kingRow][7] && board[kingRow][7].type === 'r' && board[kingRow][7].color === color &&
                !isSquareAttacked(board, kingRow, 5, opponent) &&
                !isSquareAttacked(board, kingRow, 6, opponent)) {
              moves.push({ from: { r, c }, to: { r: kingRow, c: 6 }, special: 'castle-kingside' });
            }
            if (rights.q && !board[kingRow][1] && !board[kingRow][2] && !board[kingRow][3] &&
                board[kingRow][0] && board[kingRow][0].type === 'r' && board[kingRow][0].color === color &&
                !isSquareAttacked(board, kingRow, 3, opponent) &&
                !isSquareAttacked(board, kingRow, 2, opponent)) {
              moves.push({ from: { r, c }, to: { r: kingRow, c: 2 }, special: 'castle-queenside' });
            }
          }
        }
        break;
      }
      case 'b':
      case 'r':
      case 'q': {
        let dirs = [];
        if (piece.type === 'b' || piece.type === 'q') dirs = dirs.concat(BISHOP_DIRS);
        if (piece.type === 'r' || piece.type === 'q') dirs = dirs.concat(ROOK_DIRS);
        for (const [dr, dc] of dirs) {
          let nr = r + dr, nc = c + dc;
          while (inBounds(nr, nc)) {
            const target = board[nr][nc];
            if (target) {
              if (target.color !== color) moves.push({ from: { r, c }, to: { r: nr, c: nc } });
              break;
            }
            moves.push({ from: { r, c }, to: { r: nr, c: nc } });
            nr += dr; nc += dc;
          }
        }
        break;
      }
    }
    return moves;
  }

  function applyMove(board, move, state, promotionPiece) {
    const newBoard = cloneBoard(board);
    const piece = newBoard[move.from.r][move.from.c];
    const color = piece.color;
    const opponent = opposite(color);
    let captured = null;
    let isPromotion = false;
    const newCastlingRights = state && state.castlingRights
      ? {
          white: { k: state.castlingRights.white.k, q: state.castlingRights.white.q },
          black: { k: state.castlingRights.black.k, q: state.castlingRights.black.q },
        }
      : { white: { k: false, q: false }, black: { k: false, q: false } };
    let newEnPassantTarget = null;
    if (move.special === 'enpassant') {
      captured = newBoard[move.from.r][move.to.c];
      newBoard[move.from.r][move.to.c] = null;
    } else if (newBoard[move.to.r][move.to.c]) {
      captured = newBoard[move.to.r][move.to.c];
    }
    newBoard[move.to.r][move.to.c] = piece;
    newBoard[move.from.r][move.from.c] = null;
    if (move.special === 'castle-kingside') {
      const row = move.from.r;
      newBoard[row][5] = newBoard[row][7];
      newBoard[row][7] = null;
    } else if (move.special === 'castle-queenside') {
      const row = move.from.r;
      newBoard[row][3] = newBoard[row][0];
      newBoard[row][0] = null;
    }
    if (piece.type === 'p') {
      const lastRow = color === 'white' ? 0 : 7;
      if (move.to.r === lastRow) {
        newBoard[move.to.r][move.to.c] = { type: promotionPiece || 'q', color };
        isPromotion = true;
      }
      const startRow = color === 'white' ? 6 : 1;
      if (move.from.r === startRow && Math.abs(move.to.r - move.from.r) === 2) {
        newEnPassantTarget = { r: (move.from.r + move.to.r) / 2, c: move.from.c };
      }
    }
    if (piece.type === 'k') {
      newCastlingRights[color].k = false;
      newCastlingRights[color].q = false;
    }
    const fromKey = move.from.r + ',' + move.from.c;
    if (piece.type === 'r' && ROOK_ORIGINS[color][fromKey]) {
      newCastlingRights[color][ROOK_ORIGINS[color][fromKey]] = false;
    }
    if (captured && captured.type === 'r') {
      const toKey = move.to.r + ',' + move.to.c;
      if (ROOK_ORIGINS[opponent][toKey]) {
        newCastlingRights[opponent][ROOK_ORIGINS[opponent][toKey]] = false;
      }
    }
    return {
      board: newBoard,
      newState: { castlingRights: newCastlingRights, enPassantTarget: newEnPassantTarget },
      captured,
      isPromotion,
    };
  }

  function getLegalMoves(board, r, c, state) {
    const piece = board[r][c];
    if (!piece) return [];
    const color = piece.color;
    const opponent = opposite(color);
    const pseudo = getPseudoLegalMoves(board, r, c, state);
    const legal = [];
    for (const move of pseudo) {
      if (move.special === 'castle-kingside' || move.special === 'castle-queenside') {
        const row = move.from.r;
        const startC = 4;
        const midC = move.special === 'castle-kingside' ? 5 : 3;
        const endC = move.special === 'castle-kingside' ? 6 : 2;
        if (isSquareAttacked(board, row, startC, opponent)) continue;
        if (isSquareAttacked(board, row, midC, opponent)) continue;
        if (isSquareAttacked(board, row, endC, opponent)) continue;
      }
      const { board: next } = applyMove(board, move, state);
      if (!isInCheck(next, color)) legal.push(move);
    }
    return legal;
  }

  return { getLegalMoves };
})();

const ROWS = 15, COLS = 15;
const CHESS_GLYPHS = {
  // 白黑双方统一使用实心字形（U+265A..F），靠 CSS 颜色与描边区分，
  // 形状完全对称，避免空心字形在不同字体下细节缺失。
  white: { k:'\\u265A', q:'\\u265B', r:'\\u265C', b:'\\u265D', n:'\\u265E', p:'\\u265F' },
  black: { k:'\\u265A', q:'\\u265B', r:'\\u265C', b:'\\u265D', n:'\\u265E', p:'\\u265F' }
};

let gameType = 'gomoku';
let myColor = null;
let currentTurn = 'black';
let gameOver = false;
let draw = false;
let ws = null;
let roomId = '';
let boardData = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
let chessBoardData = null;
let chessState = null;       // 与服务端同步的规则状态（易位权、过路兵目标）
let chessSelected = null;
let chessLegalMoves = [];
let chessFlipped = false;
let lastMove = null;
let checkColor = null;
let rematchRole = null; // 'requester' | 'accepter' | null
let pendingPromotionMove = null;
var waitAckReceived = false;

function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function init() {
  const params = new URLSearchParams(location.search);
  roomId = params.get('room');
  if (!roomId) {
    // 没有房间号则回到首页
    location.href = '/';
    return;
  }
  const g = params.get('game');
  gameType = (g === 'chess') ? 'chess' : 'gomoku';
  document.getElementById('roomId').textContent = roomId;
  // 先启动 WebSocket 连接（与 DOM 构建并行，减少首次交互延迟）
  connect();
  buildBoard();
}

function buildBoard() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  if (gameType === 'chess') {
    boardEl.className = 'board chess';
    renderChess();
  } else {
    boardEl.className = 'board';
    buildGomokuBoard();
  }
}

function buildGomokuBoard() {
  const grid = document.createElement('div');
  grid.className = 'board-grid';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('click', () => onGomokuCellClick(r, c));
      cell.addEventListener('mouseenter', () => onCellHover(r, c, cell));
      cell.addEventListener('mouseleave', () => onCellLeave(cell));
      grid.appendChild(cell);
    }
  }
  document.getElementById('board').appendChild(grid);
}

function renderBoard() {
  if (gameType === 'chess') renderChess();
  else renderGomoku();
}

function getCell(r, c) {
  return document.querySelector('.cell[data-row="' + r + '"][data-col="' + c + '"]');
}

function renderGomoku() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = getCell(r, c);
      if (!cell) continue;
      const existing = cell.querySelector('.stone');
      if (boardData[r][c]) {
        if (!existing || existing.className !== 'stone ' + boardData[r][c]) {
          if (existing) existing.remove();
          const stone = document.createElement('div');
          stone.className = 'stone ' + boardData[r][c];
          cell.appendChild(stone);
        }
        cell.classList.add('disabled');
      } else {
        if (existing) existing.remove();
        cell.classList.remove('disabled');
      }
    }
  }
}

function onGomokuCellClick(r, c) {
  if (gameOver || !myColor || myColor !== currentTurn) return;
  if (boardData[r][c]) return;
  ws.send(JSON.stringify({ type: 'move', row: r, col: c }));
}

function onCellHover(r, c, cell) {
  if (gameOver || !myColor || myColor !== currentTurn) return;
  if (boardData[r][c]) return;
  if (cell.querySelector('.preview')) return;
  const preview = document.createElement('div');
  preview.className = 'preview ' + myColor;
  cell.appendChild(preview);
}

function onCellLeave(cell) {
  const preview = cell.querySelector('.preview');
  if (preview) preview.remove();
}

function renderChess() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'chess-grid';

  const rows = chessFlipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
  const cols = chessFlipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
  const leftmostCol = chessFlipped ? 7 : 0;
  const bottomRow = chessFlipped ? 0 : 7;

  for (const r of rows) {
    for (const c of cols) {
      const cell = document.createElement('div');
      const isLight = (r + c) % 2 === 0;
      cell.className = 'chess-cell ' + (isLight ? 'light' : 'dark');
      cell.dataset.row = r;
      cell.dataset.col = c;

      const piece = (chessBoardData && chessBoardData[r]) ? chessBoardData[r][c] : null;
      if (piece && CHESS_GLYPHS[piece.color] && CHESS_GLYPHS[piece.color][piece.type]) {
        const span = document.createElement('span');
        span.className = 'piece ' + piece.color;
        span.textContent = CHESS_GLYPHS[piece.color][piece.type];
        cell.appendChild(span);
      }

      if (chessSelected && chessSelected.r === r && chessSelected.c === c) {
        cell.classList.add('selected');
      }
      if (lastMove && ((lastMove.from.r === r && lastMove.from.c === c) || (lastMove.to.r === r && lastMove.to.c === c))) {
        cell.classList.add('last-move');
      }
      if (checkColor && piece && piece.type === 'k' && piece.color === checkColor) {
        cell.classList.add('check-king');
      }

      const moveTo = chessLegalMoves.find(m => m.to.r === r && m.to.c === c);
      if (moveTo) {
        if (piece) {
          const ring = document.createElement('span');
          ring.className = 'capture-ring';
          cell.appendChild(ring);
        } else {
          const dot = document.createElement('span');
          dot.className = 'move-dot';
          cell.appendChild(dot);
        }
      }

      // 坐标标签
      if (c === leftmostCol) {
        const rank = document.createElement('span');
        rank.className = 'coord rank';
        rank.textContent = String(8 - r);
        cell.appendChild(rank);
      }
      if (r === bottomRow) {
        const file = document.createElement('span');
        file.className = 'coord file';
        file.textContent = String.fromCharCode(97 + c);
        cell.appendChild(file);
      }

      cell.addEventListener('click', () => onChessCellClick(r, c));
      grid.appendChild(cell);
    }
  }
  boardEl.appendChild(grid);
}

function onChessCellClick(r, c) {
  if (gameOver || !myColor || myColor !== currentTurn) return;
  if (!chessBoardData) return;

  const piece = chessBoardData[r][c];

  // 已选中棋子，且点击的是合法目标格 → 走子
  if (chessSelected) {
    const move = chessLegalMoves.find(m => m.to.r === r && m.to.c === c);
    if (move) {
      if (move.special === 'promotion') {
        showPromotionModal(move);
      } else {
        sendChessMove(move);
      }
      return;
    }
  }

  // 选中己方棋子
  if (piece && piece.color === myColor) {
    chessSelected = { r, c };
    // 本地直接计算合法走法，避免往返 RTT 造成"卡顿感"
    try {
      chessLegalMoves = chessState ? Chess.getLegalMoves(chessBoardData, r, c, chessState) : [];
    } catch {
      chessLegalMoves = [];
    }
    renderChess();
  } else {
    // 点击空格或对方棋子（非目标）→ 取消选中
    chessSelected = null;
    chessLegalMoves = [];
    renderChess();
  }
}

function showPromotionModal(move) {
  pendingPromotionMove = move;
  document.getElementById('promotionModal').classList.remove('hidden');
}

function choosePromotion(piece) {
  document.getElementById('promotionModal').classList.add('hidden');
  if (pendingPromotionMove) {
    const move = pendingPromotionMove;
    pendingPromotionMove = null;
    sendChessMove(move, piece);
  }
}

function sendChessMove(move, promotionPiece) {
  if (!ws || ws.readyState !== 1) return;
  const payload = { type: 'move', from: { r: move.from.r, c: move.from.c }, to: { r: move.to.r, c: move.to.c } };
  if (move.special) payload.special = move.special;
  if (promotionPiece) payload.promotionPiece = promotionPiece;
  ws.send(JSON.stringify(payload));
  chessSelected = null;
  chessLegalMoves = [];
  renderChess();
}

function updateHeader() {
  const colorEl = document.getElementById('myColor');
  if (myColor) {
    colorEl.textContent = myColor === 'black' ? '黑棋' : '白棋';
    colorEl.className = 'color-' + myColor;
  } else {
    colorEl.textContent = '—';
    colorEl.className = '';
  }
  const turnEl = document.getElementById('turnInfo');
  turnEl.textContent = gameOver ? '已结束' : (currentTurn === 'black' ? '黑棋' : '白棋');
}

function updateStatus(msg) {
  document.getElementById('playerStatus').style.display = 'flex';
  var players = msg.players;
  ['black', 'white'].forEach(function(color) {
    var dot = document.getElementById(color + 'Dot');
    var latEl = document.getElementById(color + 'Latency');
    var p = players[color];
    if (p) {
      dot.className = 'status-dot ' + (p.online ? 'online' : 'offline');
      var lat = p.latency;
      latEl.textContent = lat > 0 ? lat + 'ms' : '—';
      latEl.className = lat < 100 ? 'latency-good' : (lat < 300 ? 'latency-ok' : 'latency-bad');
    } else {
      dot.className = 'status-dot offline';
      latEl.textContent = '—';
      latEl.className = '';
    }
  });
}

function setStatus(msg, isCheck) {
  const el = document.getElementById('statusMsg');
  el.textContent = msg;
  if (isCheck) el.classList.add('check-msg'); else el.classList.remove('check-msg');
}

function setRematchSelectDefaults() {
  document.getElementById('rematchGameSelect').value = gameType;
  document.getElementById('rematchHint').textContent = '';
}

function hideAllModals() {
  document.getElementById('waitingOverlay').classList.add('hidden');
  document.getElementById('resultOverlay').classList.add('hidden');
  document.getElementById('rematchModal').classList.add('hidden');
  document.getElementById('rematchWaiting').classList.add('hidden');
  document.getElementById('promotionModal').classList.add('hidden');
}

function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(proto + '://' + location.host + '/ws?room=' + roomId + '&game=' + gameType);

  // 客户端每 3 秒发起 ping 测量延迟
  var pingTimer = null;

  ws.onopen = () => {
    setStatus('已连接，等待对手...');
    pingTimer = setInterval(() => {
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
      }
    }, 3000);
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    switch (msg.type) {
      case 'pong':
        var lat = Date.now() - msg.ts;
        if (ws && ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'latency', latency: lat }));
        }
        break;

      case 'status':
        updateStatus(msg);
        break;

      case 'colorAssign':
        myColor = msg.you;
        if (msg.gameType && msg.gameType !== gameType) {
          gameType = msg.gameType;
          buildBoard();
        } else if (msg.gameType) {
          gameType = msg.gameType;
        }
        chessFlipped = (gameType === 'chess' && myColor === 'black');
        chessSelected = null;
        chessLegalMoves = [];
        chessState = null;
        checkColor = null;
        rematchRole = null;
        gameOver = false;
        draw = false;
        hideAllModals();
        setRematchSelectDefaults();
        setStatus('');
        updateHeader();
        break;

      case 'sync':
        if (msg.gameType && msg.gameType !== gameType) {
          gameType = msg.gameType;
          buildBoard();
        }
        if (gameType === 'chess') {
          chessBoardData = msg.board;
          lastMove = msg.lastMove || null;
          // 同步规则状态：服务端权威，前端用于本地计算合法走法
          chessState = msg.chessState || null;
          // 棋盘已变，原选中与走法作废（除非用户刚刚又点了同一棋子，那会在点击处理里重置）
          chessSelected = null;
          chessLegalMoves = [];
        } else {
          boardData = msg.board;
        }
        currentTurn = msg.currentTurn;
        gameOver = msg.gameOver;
        draw = !!msg.draw;
        checkColor = null; // 新局面清除将军高亮（如仍被将军，后续 check 消息会重新设置）
        renderBoard();
        updateHeader();
        if (!gameOver && myColor) {
          setStatus(myColor === currentTurn ? '轮到你了！' : '等待对手落子...');
        }
        break;

      case 'gameOver':
        gameOver = true;
        draw = !!msg.draw;
        checkColor = null;
        renderBoard();
        var overlay = document.getElementById('resultOverlay');
        overlay.classList.remove('hidden');
        var txt = document.getElementById('resultText');
        if (msg.draw) {
          txt.textContent = '🤝 和棋';
          txt.style.color = '#f0a500';
        } else if (msg.winner === myColor) {
          txt.textContent = '🎉 你赢了！';
          txt.style.color = '#4ecca3';
        } else {
          txt.textContent = '😔 你输了';
          txt.style.color = '#e94560';
        }
        setRematchSelectDefaults();
        updateHeader();
        break;

      case 'check':
        checkColor = msg.color;
        renderBoard();
        setStatus('将军！', true);
        break;

      case 'rematchRequest':
        // 对方请求再来一局，弹窗显示对方选择的棋种，我方只点同意/拒绝
        rematchRole = 'accepter';
        document.getElementById('rematchWaiting').classList.add('hidden');
        const gameName = msg.gameType === 'chess' ? '国际象棋' : '五子棋';
        document.getElementById('rematchModalText').textContent = '对方申请在下一盘' + gameName;
        document.getElementById('rematchModal').classList.remove('hidden');
        break;

      case 'rematchDecline':
        document.getElementById('rematchWaiting').classList.add('hidden');
        document.getElementById('rematchModal').classList.add('hidden');
        rematchRole = null;
        document.getElementById('resultOverlay').classList.remove('hidden');
        setStatus('对方拒绝了再来一局');
        break;

      case 'rematchMismatch':
        // 双方几乎同时点 request 且选了不同棋种：双方都回到结果弹窗重新发起
        document.getElementById('rematchWaiting').classList.add('hidden');
        document.getElementById('rematchModal').classList.add('hidden');
        rematchRole = null;
        document.getElementById('resultOverlay').classList.remove('hidden');
        document.getElementById('rematchHint').textContent = '双方选择不一致，请重新发起';
        break;

      case 'roomFull':
        setStatus('房间已满，请创建新游戏');
        ws.close();
        break;

      case 'opponentLeft':
        setStatus('对手已断开，等待重连...');
        break;

      case 'opponentRejoin':
        setStatus('');
        break;

      case 'waitNotice':
        showWaitNotice('对方说：请等我一会');
        break;

      case 'waitAck':
        waitAckReceived = true;
        break;
    }
  };

  ws.onclose = () => {
    if (pingTimer) clearInterval(pingTimer);
    if (!gameOver) setStatus('连接断开，正在重连...');
    setTimeout(() => {
      if (!gameOver) connect();
    }, 2000);
  };

  ws.onerror = () => {};
}

function requestRematch() {
  if (ws && ws.readyState === 1) {
    const gt = document.getElementById('rematchGameSelect').value;
    rematchRole = 'requester';
    ws.send(JSON.stringify({ type: 'rematchRequest', gameType: gt }));
    document.getElementById('resultOverlay').classList.add('hidden');
    document.getElementById('rematchHint').textContent = '';
    document.getElementById('rematchWaiting').classList.remove('hidden');
  }
}

function acceptRematch() {
  if (ws && ws.readyState === 1) {
    rematchRole = 'accepter';
    // 被请求方无需选择棋种，服务端会采用请求方已选的棋种
    ws.send(JSON.stringify({ type: 'rematchAccept' }));
    document.getElementById('rematchModal').classList.add('hidden');
    // 被请求方同意后等待服务端重启游戏（或发送 rematchMismatch）
  }
}

function declineRematch() {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'rematchDecline' }));
    document.getElementById('rematchModal').classList.add('hidden');
    document.getElementById('resultOverlay').classList.remove('hidden');
    rematchRole = null;
  }
}

function cancelRematch() {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'rematchDecline' }));
    document.getElementById('rematchWaiting').classList.add('hidden');
    document.getElementById('resultOverlay').classList.remove('hidden');
    rematchRole = null;
  }
}

function sendWaitNotice() {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'waitNotice' }));
    waitAckReceived = false;
    var btn = document.getElementById('waitBtn');
    btn.textContent = '等待对方确认...';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    var checkAck = setInterval(function() {
      if (waitAckReceived) {
        clearInterval(checkAck);
        btn.textContent = '已收到';
        setTimeout(function() {
          btn.textContent = '等一会';
          btn.disabled = false;
          btn.style.opacity = '';
          btn.style.cursor = '';
        }, 1500);
      }
    }, 200);
  }
}

function showWaitNotice(text) {
  var existing = document.getElementById('waitNoticeOverlay');
  if (existing) existing.remove();
  var el = document.createElement('div');
  el.id = 'waitNoticeOverlay';
  el.className = 'wait-notice-overlay';
  var span = document.createElement('span');
  span.textContent = text;
  var btn = document.createElement('button');
  btn.className = 'ack-btn';
  btn.textContent = '收到';
  btn.onclick = function() {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'waitAck' }));
    }
    el.remove();
  };
  el.appendChild(span);
  el.appendChild(btn);
  document.body.appendChild(el);
}

function copyLink() {
  const url = location.href;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      document.getElementById('copyBtn').textContent = '已复制!';
      setTimeout(() => {
        document.getElementById('copyBtn').textContent = '复制链接邀请好友';
      }, 2000);
    });
  } else {
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    document.getElementById('copyBtn').textContent = '已复制!';
    setTimeout(() => {
      document.getElementById('copyBtn').textContent = '复制链接邀请好友';
    }, 2000);
  }
}

init();
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      const roomId = url.searchParams.get('room');
      if (!roomId) {
        return new Response('Missing room parameter', { status: 400 });
      }
      const id = env.ROOM.idFromName(roomId);
      // locationHint: apac 让 DO 创建在亚太节点，减少中国用户延迟
      const stub = env.ROOM.get(id, { locationHint: 'apac' });
      return stub.fetch(request);
    }

    const room = url.searchParams.get('room');
    // 无 room 参数 → 返回模式选择首页
    if (!room) {
      return new Response(HOMEPAGE_HTML, {
        headers: {
          'Content-Type': 'text/html;charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // 带 room 参数 → 返回对局页（对局页根据 game 参数与服务端 sync/colorAssign 渲染）
    return new Response(GAME_HTML, {
      headers: {
        'Content-Type': 'text/html;charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  },
};
