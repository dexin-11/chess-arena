import { Room } from './room.js';

export { Room };

const INDEX_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>五子棋对战</title>
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

.board { position: relative; background: #DEB887; border-radius: 8px; padding: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
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

@media (max-width: 540px) {
  .cell { width: 24px; height: 24px; }
  .cell .stone, .cell .preview { width: 20px; height: 20px; }
  .board { padding: 8px; }
  .header { font-size: 12px; padding: 8px 12px; }
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
  <button class="btn" id="copyBtn" onclick="copyLink()">复制链接邀请好友</button>
</div>

<div class="waiting-overlay" id="waitingOverlay">
  <div class="spinner"></div>
  <div class="waiting-text">等待好友加入...</div>
  <button class="btn" onclick="copyLink()">复制链接邀请好友</button>
</div>

<div class="result-overlay hidden" id="resultOverlay">
  <div class="result-text" id="resultText"></div>
  <button class="btn" onclick="location.reload()">再来一局</button>
</div>

<script>
const ROWS = 15, COLS = 15;
let myColor = null;
let currentTurn = 'black';
let gameOver = false;
let ws = null;
let roomId = '';
let boardData = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

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
    roomId = generateRoomId();
    history.replaceState({}, '', '?room=' + roomId);
  }
  document.getElementById('roomId').textContent = roomId;
  buildBoard();
  connect();
}

function buildBoard() {
  const grid = document.createElement('div');
  grid.className = 'board-grid';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('click', () => onCellClick(r, c));
      cell.addEventListener('mouseenter', () => onCellHover(r, c, cell));
      cell.addEventListener('mouseleave', () => onCellLeave(cell));
      grid.appendChild(cell);
    }
  }
  document.getElementById('board').innerHTML = '';
  document.getElementById('board').appendChild(grid);
}

function getCell(r, c) {
  return document.querySelector('.cell[data-row="' + r + '"][data-col="' + c + '"]');
}

function renderBoard() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = getCell(r, c);
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

function onCellClick(r, c) {
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

function updateHeader() {
  const colorEl = document.getElementById('myColor');
  if (myColor) {
    colorEl.textContent = myColor === 'black' ? '黑棋' : '白棋';
    colorEl.className = 'color-' + myColor;
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

function setStatus(msg) {
  document.getElementById('statusMsg').textContent = msg;
}

function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(proto + '://' + location.host + '/ws?room=' + roomId);

  ws.onopen = () => {
    setStatus('已连接，等待对手...');
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    switch (msg.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', ts: msg.ts }));
        break;

      case 'status':
        updateStatus(msg);
        break;

      case 'colorAssign':
        myColor = msg.you;
        document.getElementById('waitingOverlay').classList.add('hidden');
        setStatus('');
        updateHeader();
        break;

      case 'sync':
        boardData = msg.board;
        currentTurn = msg.currentTurn;
        gameOver = msg.gameOver;
        renderBoard();
        updateHeader();
        if (!gameOver && myColor) {
          setStatus(myColor === currentTurn ? '轮到你了！' : '等待对手落子...');
        }
        break;

      case 'gameOver':
        gameOver = true;
        const overlay = document.getElementById('resultOverlay');
        overlay.classList.remove('hidden');
        const txt = document.getElementById('resultText');
        if (msg.winner === myColor) {
          txt.textContent = '🎉 你赢了！';
          txt.style.color = '#4ecca3';
        } else {
          txt.textContent = '😔 你输了';
          txt.style.color = '#e94560';
        }
        updateHeader();
        break;

      case 'roomFull':
        setStatus('房间已满，请创建新游戏');
        ws.close();
        break;

      case 'opponentLeft':
        setStatus('对手已断开');
        break;
    }
  };

  ws.onclose = () => {
    if (!gameOver) setStatus('连接断开，正在重连...');
    setTimeout(() => {
      if (!gameOver) connect();
    }, 2000);
  };

  ws.onerror = () => {};
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
      const stub = env.ROOM.get(id);
      return stub.fetch(request);
    }

    return new Response(INDEX_HTML, {
      headers: { 'Content-Type': 'text/html;charset=utf-8' },
    });
  },
};
