import { Room } from './room.js';

export { Room };

const HOMEPAGE_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>棋类对战</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1a2e; color: #eee; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.home-card { background: #16213e; border: 1px solid #0f3460; border-radius: 16px; padding: 40px 32px; display: flex; flex-direction: column; align-items: center; gap: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
.home-title { font-size: 28px; font-weight: bold; color: #e94560; letter-spacing: 2px; }
.home-subtitle { font-size: 14px; color: #888; margin-top: -16px; }
.home-buttons { display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; }
.home-btn { padding: 28px 36px; border: none; border-radius: 12px; font-size: 22px; cursor: pointer; background: #e94560; color: #fff; font-weight: bold; transition: background 0.2s, transform 0.15s; min-width: 180px; }
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
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1a2e; color: #eee; min-height: 100vh; display: flex; flex-direction: column; align-items: center; }

.header { width: 100%; max-width: 600px; padding: 12px 16px; background: #16213e; border-bottom: 1px solid #0f3460; display: flex; flex-direction: column; gap: 6px; }
.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.header-item { font-size: 14px; }
.header-item span { font-weight: bold; }
.color-black { color: #fff; text-shadow: 0 0 4px #000; }
.color-white { color: #ddd; text-shadow: 0 0 4px #888; }

.player-status { display: flex; gap: 16px; font-size: 12px; color: #aaa; }
.player-status .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
.status-dot.online { background: #4ecca3; }
.status-dot.offline { background: #e94560; }
.latency-good { color: #4ecca3; }
.latency-ok { color: #f0a500; }
.latency-bad { color: #e94560; }

.board-container { padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; flex: 1; }

.status-msg { font-size: 16px; color: #e94560; min-height: 24px; text-align: center; }
.status-msg.check-msg { color: #ff5555; font-weight: bold; }

.board { position: relative; background: #DEB887; border-radius: 8px; padding: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
.board.chess { background: transparent; padding: 0; overflow: hidden; }

.board-grid { display: grid; grid-template-columns: repeat(15, 1fr); grid-template-rows: repeat(15, 1fr); gap: 0; }
.cell { width: 32px; height: 32px; position: relative; cursor: pointer; }
.cell::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #8B7355; }
.cell::after { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: #8B7355; }

.cell .stone { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 28px; height: 28px; border-radius: 50%; z-index: 2; }
.stone.black { background: radial-gradient(circle at 35% 35%, #555, #000); box-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
.stone.white { background: radial-gradient(circle at 35% 35%, #fff, #bbb); box-shadow: 2px 2px 4px rgba(0,0,0,0.3); }

.cell .preview { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 28px; height: 28px; border-radius: 50%; z-index: 1; opacity: 0.4; pointer-events: none; }
.preview.black { background: radial-gradient(circle at 35% 35%, #555, #000); }
.preview.white { background: radial-gradient(circle at 35% 35%, #fff, #bbb); }

.cell.disabled { cursor: default; }
.cell.disabled .preview { display: none; }

/* 国际象棋棋盘 */
.chess-grid { display: grid; grid-template-columns: repeat(8, 40px); grid-template-rows: repeat(8, 40px); gap: 0; }
.chess-cell { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 30px; cursor: pointer; position: relative; user-select: none; line-height: 1; }
.chess-cell.light { background: #f0d9b5; }
.chess-cell.dark { background: #b58863; }
.chess-cell .piece { line-height: 1; pointer-events: none; }
.chess-cell .piece.white { color: #fff; text-shadow: 0 0 2px #000, 1px 1px 1px #000, -1px -1px 1px #000; }
.chess-cell .piece.black { color: #111; text-shadow: 0 0 1px #000; }
.chess-cell.selected { box-shadow: inset 0 0 0 4px #e94560; }
.chess-cell.last-move { box-shadow: inset 0 0 0 4px rgba(255, 213, 79, 0.85); }
.chess-cell.check-king { box-shadow: inset 0 0 0 4px #ff3333; background: #ff6666 !important; }
.chess-cell .move-dot { position: absolute; width: 14px; height: 14px; border-radius: 50%; background: rgba(0,0,0,0.28); pointer-events: none; z-index: 1; }
.chess-cell .capture-ring { position: absolute; inset: 0; border: 4px solid rgba(0,0,0,0.28); border-radius: 50%; box-sizing: border-box; pointer-events: none; z-index: 1; }
.chess-cell .coord { position: absolute; font-size: 9px; color: rgba(0,0,0,0.55); pointer-events: none; font-weight: bold; }
.chess-cell .coord.file { bottom: 1px; right: 3px; }
.chess-cell .coord.rank { top: 1px; left: 3px; }
.chess-cell.light .coord { color: rgba(0,0,0,0.55); }
.chess-cell.dark .coord { color: rgba(255,255,255,0.7); }

.btn { padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; background: #e94560; color: #fff; font-weight: bold; transition: background 0.2s; }
.btn:hover { background: #c73650; }
.btn:active { transform: scale(0.97); }

.waiting-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; z-index: 100; }
.waiting-overlay.hidden { display: none; }
.spinner { width: 40px; height: 40px; border: 4px solid #333; border-top-color: #e94560; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.waiting-text { font-size: 18px; color: #eee; }

.result-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; z-index: 100; }
.result-overlay.hidden { display: none; }
.result-text { font-size: 28px; font-weight: bold; }
.rematch-select-row { display: flex; align-items: center; gap: 10px; font-size: 15px; color: #eee; }
.rematch-select-row select { padding: 8px 12px; border-radius: 6px; border: 1px solid #0f3460; background: #16213e; color: #eee; font-size: 15px; cursor: pointer; }
.rematch-hint { font-size: 14px; color: #f0a500; min-height: 18px; text-align: center; }

.rematch-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; z-index: 110; }
.rematch-modal.hidden { display: none; }
.rematch-modal-text { font-size: 18px; color: #eee; text-align: center; }
.rematch-buttons { display: flex; gap: 12px; }
.btn-secondary { background: #444; }
.btn-secondary:hover { background: #555; }
.button-row { display: flex; gap: 12px; }

.wait-notice-overlay { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #e94560; color: #fff; padding: 16px 32px; border-radius: 12px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 20px rgba(233,69,96,0.5); z-index: 200; animation: slideDown 0.3s ease; }
.wait-notice-overlay .ack-btn { margin-left: 16px; background: #fff; color: #e94560; border: none; padding: 6px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
@keyframes slideDown { from { transform: translate(-50%, -100px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }

.promotion-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; z-index: 120; }
.promotion-modal.hidden { display: none; }
.promotion-text { font-size: 18px; color: #eee; }
.promotion-buttons { display: flex; gap: 12px; }
.promotion-btn { font-size: 26px; min-width: 70px; }

@media (max-width: 540px) {
  .cell { width: 24px; height: 24px; }
  .cell .stone, .cell .preview { width: 20px; height: 20px; }
  .board { padding: 8px; }
  .header { font-size: 12px; padding: 8px 12px; }
  .chess-grid { grid-template-columns: repeat(8, 34px); grid-template-rows: repeat(8, 34px); }
  .chess-cell { width: 34px; height: 34px; font-size: 24px; }
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
  <div class="rematch-select-row">
    <label for="acceptGameSelect">棋种：</label>
    <select id="acceptGameSelect">
      <option value="gomoku">五子棋</option>
      <option value="chess">国际象棋</option>
    </select>
  </div>
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
const ROWS = 15, COLS = 15;
const CHESS_GLYPHS = {
  white: { k:'\\u2654', q:'\\u2655', r:'\\u2656', b:'\\u2657', n:'\\u2658', p:'\\u2659' },
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
    chessLegalMoves = [];
    renderChess();
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'getMoves', from: { r: r, c: c } }));
    }
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
  document.getElementById('acceptGameSelect').value = gameType;
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

      case 'legalMoves':
        if (chessSelected && msg.from && msg.from.r === chessSelected.r && msg.from.c === chessSelected.c) {
          chessLegalMoves = msg.moves || [];
          renderChess();
        }
        break;

      case 'rematchRequest':
        // 对方请求再来一局，弹出同意/拒绝弹窗（含棋种选择）
        rematchRole = 'accepter';
        document.getElementById('rematchWaiting').classList.add('hidden');
        document.getElementById('rematchModalText').textContent = '对方请求再来一局';
        setRematchSelectDefaults();
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
        document.getElementById('rematchWaiting').classList.add('hidden');
        if (rematchRole === 'accepter') {
          document.getElementById('rematchModalText').textContent = '双方选择不一致，请重新选择';
          document.getElementById('rematchModal').classList.remove('hidden');
        } else {
          // 请求方：回到结果弹窗以便重新选择棋种
          rematchRole = 'requester';
          document.getElementById('resultOverlay').classList.remove('hidden');
          document.getElementById('rematchHint').textContent = '双方选择不一致，请重新选择';
        }
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
    const gt = document.getElementById('acceptGameSelect').value;
    rematchRole = 'accepter';
    ws.send(JSON.stringify({ type: 'rematchAccept', gameType: gt }));
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
