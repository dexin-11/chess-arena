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
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Ma+Shan+Zheng&family=ZCOOL+XiaoWei&display=swap" rel="stylesheet">
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
.home-btn.xiangqi-btn { background: #8B4513; }
.home-btn.xiangqi-btn:hover { background: #A0522D; }
</style>
</head>
<body>
<div class="home-card">
  <div class="home-title">选择棋种</div>
  <div class="home-subtitle">点击进入对战房间</div>
  <div class="home-buttons">
    <button class="home-btn" onclick="enterGame('gomoku')">五子棋</button>
    <button class="home-btn chess-btn" onclick="enterGame('chess')">国际象棋</button>
    <button class="home-btn xiangqi-btn" onclick="enterGame('xiangqi')">中国象棋</button>
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
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Ma+Shan+Zheng&family=ZCOOL+XiaoWei&display=swap" rel="stylesheet">
<style>
:root {
  --bg-0: #0a0d1a; --bg-1: #131829; --bg-2: #1c2238;
  --border: #2a3458; --accent: #e94560;
  --text: #e8ecf4; --text-dim: #8892b0;
  --good: #4ecca3; --warn: #f0a500; --bad: #e94560;
  --board-wood: #DEB887; --board-line: #8B7355;
  /* 手机端：棋盘下方留出聊天面板（约 170px）+ 头部与按钮行开销 */
  --board-size: min(96vw, calc(100vh - 320px));
  --board-size: min(96vw, calc(100dvh - 320px));
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
.color-red { color: #ff6b6b !important; }

.player-status { display: flex; gap: 14px; font-size: 11px; color: var(--text-dim); font-family: 'JetBrains Mono', monospace; }
.player-status .status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
.status-dot.online { background: var(--good); box-shadow: 0 0 6px var(--good); }
.status-dot.offline { background: var(--bad); }
.latency-good { color: var(--good); }
.latency-ok { color: var(--warn); }
.latency-bad { color: var(--bad); }

.board-container { flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 8px; }

/* 游戏区域：手机端纵向（棋盘在上、聊天在下），桌面端横向（棋盘在左、聊天在右） */
.game-area { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 8px; padding: 0 8px 8px; }

/* 聊天面板 */
.chat-panel { flex-shrink: 0; display: flex; flex-direction: column; background: linear-gradient(180deg, rgba(28,34,56,0.95), rgba(19,24,41,0.85)); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; height: 170px; }
.chat-header { flex-shrink: 0; padding: 6px 12px; font-size: 12px; font-weight: 600; color: var(--text-dim); letter-spacing: 0.5px; border-bottom: 1px solid var(--border); background: rgba(10,13,26,0.4); display: flex; align-items: center; gap: 8px; }
.chat-badge { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: var(--bad); color: #fff; font-size: 11px; line-height: 18px; text-align: center; font-weight: 700; }
.chat-badge.hidden { display: none; }
.chat-peer-status { margin-left: auto; font-size: 11px; font-weight: 500; color: var(--text-dim); display: flex; align-items: center; gap: 5px; }
.chat-peer-status::before { content: ''; display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.chat-peer-status.online { color: var(--good); }
.chat-peer-status.offline { color: var(--bad); }
.chat-messages { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; line-height: 1.4; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
.chat-messages::-webkit-scrollbar { width: 5px; }
.chat-messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
.chat-msg { word-break: break-word; overflow-wrap: anywhere; }
.chat-msg .chat-name { font-weight: 700; margin-right: 6px; font-size: 12px; }
.chat-msg .chat-name.color-black { color: #fff; }
.chat-msg .chat-name.color-white { color: #e0e0e0; }
.chat-msg .chat-name.color-red { color: #ff6b6b; }
.chat-msg .chat-text { color: var(--text); }
.chat-msg.sys { color: var(--text-dim); font-size: 11px; text-align: center; font-style: italic; }
.chat-input-row { flex-shrink: 0; display: flex; gap: 6px; padding: 8px 10px; border-top: 1px solid var(--border); background: rgba(10,13,26,0.4); }
.chat-input-row input { flex: 1; min-width: 0; padding: 7px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-2); color: var(--text); font-size: 13px; font-family: 'Sora', sans-serif; outline: none; }
.chat-input-row input:focus { border-color: var(--accent); }
.chat-send-btn { padding: 7px 14px; font-size: 12px; flex-shrink: 0; }

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

/* 中国象棋棋盘 */
.board.xiangqi { background: linear-gradient(135deg, #f0d9a4 0%, #e6c388 50%, #dcb380 100%); padding: clamp(4px, 1.2vmin, 10px); border-radius: 8px; box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.4), inset 0 0 30px rgba(120,70,20,0.15); position: relative; aspect-ratio: 9 / 10; width: auto; height: var(--board-size); max-width: 100%; flex-shrink: 1; min-width: 0; }
.xiangqi-grid { width: 100%; height: 100%; display: grid; grid-template-columns: repeat(9, minmax(0, 1fr)); grid-template-rows: repeat(10, minmax(0, 1fr)); gap: 0; position: relative; }
.xiangqi-cell { width: 100%; height: 100%; position: relative; cursor: pointer; display: flex; align-items: center; justify-content: center; min-width: 0; min-height: 0; }
/* 网格线、九宫斜线、兵炮角标全部由 SVG 矢量绘制，避免 DPR 1 屏幕子像素错位 */
/* 楚河汉界 */
.xiangqi-river { position: absolute; left: 0; right: 0; top: 45%; height: 10%; display: flex; align-items: center; justify-content: space-around; font-size: calc(var(--board-size) * 0.06); color: rgba(60,30,10,0.5); font-family: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', serif; font-weight: 700; letter-spacing: 0.3em; pointer-events: none; z-index: 1; }
.xiangqi-river span { display: inline-block; }
/* SVG 叠加层：网格线 + 九宫斜线 + 兵炮角标 */
.xiangqi-palace-diag { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; overflow: visible; }
.xiangqi-palace-diag line { stroke: rgba(60,30,10,0.7); stroke-width: 0.04; stroke-linecap: round; }
/* 网格线略粗于装饰线 */
.xiangqi-palace-diag line.grid-line { stroke: rgba(60,30,10,0.78); stroke-width: 0.045; }
/* 兵/炮位「十字花」角标，比九宫斜线略细 */
.xiangqi-palace-diag line.star-mark { stroke: rgba(60,30,10,0.75); stroke-width: 0.035; }
/* 棋子：木质浮雕硬币风格 */
.xiangqi-cell .xpiece { position: relative; z-index: 3; width: 86%; height: 86%; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: calc(var(--board-size) * 0.05); font-family: 'Ma Shan Zheng', 'ZCOOL XiaoWei', 'STKaiti', 'KaiTi', 'Noto Serif SC', serif; font-weight: 700; line-height: 1; background: radial-gradient(circle at 32% 26%, #fff8e3 0%, #f4dba2 55%, #d4a76a 100%); box-shadow: 0 2px 5px rgba(60,30,10,0.45), inset 0 2px 3px rgba(255,250,235,0.7), inset 0 -3px 5px rgba(120,60,20,0.28); transition: transform 0.15s ease; will-change: transform; }
.xiangqi-cell .xpiece::before { content: ''; position: absolute; inset: 7%; border-radius: 50%; border: 1.5px solid currentColor; opacity: 0.45; pointer-events: none; }
.xiangqi-cell .xpiece.red { color: #b91c1c; border: 2px solid #7f1d1d; text-shadow: 0 1px 0 rgba(255,250,235,0.5); }
.xiangqi-cell .xpiece.black { color: #1f1f1f; border: 2px solid #0a0a0a; text-shadow: 0 1px 0 rgba(255,250,235,0.4); }
.xiangqi-cell.selected .xpiece { transform: translateY(-1px) scale(1.06); box-shadow: 0 0 0 min(0.5vmin,5px) var(--accent), 0 3px 7px rgba(60,30,10,0.5), inset 0 2px 3px rgba(255,250,235,0.7), inset 0 -3px 5px rgba(120,60,20,0.28); }
/* last-move 用 inset 边框标记，不改变网格线颜色 */
.xiangqi-cell.last-move { box-shadow: inset 0 0 0 min(0.4vmin, 4px) rgba(233,69,96,0.4); }
.xiangqi-cell.check-king .xpiece { box-shadow: 0 0 0 min(0.5vmin,5px) #ff3333, 0 3px 7px rgba(60,30,10,0.5), inset 0 2px 3px rgba(255,250,235,0.7), inset 0 -3px 5px rgba(120,60,20,0.28); }
/* 走法提示：move-hint 容器复用，子类区分空格点/吃子环 */
.xiangqi-cell .move-hint { position: absolute; pointer-events: none; z-index: 2; }
.xiangqi-cell .move-hint.move-dot { width: 26%; height: 26%; border-radius: 50%; background: rgba(60,30,10,0.3); left: 50%; top: 50%; transform: translate(-50%, -50%); }
.xiangqi-cell .move-hint.capture-ring { inset: 7%; border: min(0.5vmin,5px) solid rgba(233,69,96,0.6); border-radius: 50%; box-sizing: border-box; }
/* 兼容旧直接类名（以防其他位置直接用 move-dot/capture-ring） */
.xiangqi-cell .move-dot { position: absolute; width: 26%; height: 26%; border-radius: 50%; background: rgba(60,30,10,0.3); pointer-events: none; z-index: 2; left: 50%; top: 50%; transform: translate(-50%, -50%); }
.xiangqi-cell .capture-ring { position: absolute; inset: 7%; border: min(0.5vmin,5px) solid rgba(233,69,96,0.6); border-radius: 50%; box-sizing: border-box; pointer-events: none; z-index: 2; }

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
    /* 小屏手机：聊天面板收窄至 150px，棋盘高度同步调小 */
    --board-size: min(98vw, calc(100vh - 300px));
    --board-size: min(98vw, calc(100dvh - 300px));
  }
  .header { padding: 6px 10px; padding-top: max(6px, env(safe-area-inset-top)); }
  .header-row { font-size: 12px; gap: 6px; }
  .header-item span { font-size: 12px; }
  .player-status { font-size: 10px; gap: 10px; }
  .btn { padding: 6px 12px; font-size: 12px; }
  .status-msg { font-size: 12px; }
  .board { border-radius: 6px; padding: clamp(4px, 1.4vmin, 10px); }
  .chat-panel { height: 150px; }
  .chat-messages { font-size: 12px; }
  .chat-input-row input { font-size: 12px; padding: 6px 8px; }
}
/* 横屏手机：屏幕宽而矮，聊天改到侧面（窄面板）以免棋盘过小 */
@media (orientation: landscape) and (max-height: 500px) {
  :root {
    --board-size: min(calc(100vh - 90px), calc(100vw - 280px));
    --board-size: min(calc(100dvh - 90px), calc(100vw - 280px));
  }
  .header { flex-direction: row; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; }
  .player-status { font-size: 10px; }
  .game-area { flex-direction: row; }
  .board-container { flex: 1; min-width: 0; }
  .chat-panel { width: 240px; height: auto; flex: 0 0 240px; }
}
/* 桌面/平板：聊天固定在右侧 320px，棋盘占剩余宽度 */
@media (min-width: 880px) {
  :root {
    --board-size: min(calc(100vh - 130px), calc(100vw - 400px));
    --board-size: min(calc(100dvh - 130px), calc(100vw - 400px));
  }
  .game-area { flex-direction: row; gap: 12px; padding: 0 12px 12px; }
  .board-container { flex: 1; min-width: 0; }
  .chat-panel { width: 320px; height: auto; flex: 0 0 320px; }
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
    <span><span id="blackLabel">黑棋</span>: <span class="status-dot offline" id="blackDot"></span><span id="blackLatency">—</span></span>
    <span><span id="whiteLabel">白棋</span>: <span class="status-dot offline" id="whiteDot"></span><span id="whiteLatency">—</span></span>
  </div>
</div>

<div class="game-area">
  <div class="board-container">
    <div class="status-msg" id="statusMsg"></div>
    <div class="board" id="board"></div>
    <div class="button-row">
      <button class="btn" id="copyBtn" onclick="copyLink()">复制链接邀请好友</button>
      <button class="btn btn-secondary" id="waitBtn" onclick="sendWaitNotice()">等一会</button>
      <button class="btn btn-secondary" id="drawBtn" onclick="sendDrawOffer()">求和</button>
    </div>
  </div>
  <aside class="chat-panel">
    <div class="chat-header">
      <span>聊天室</span>
      <span class="chat-badge hidden" id="chatBadge">0</span>
      <span class="chat-peer-status" id="chatPeerStatus"></span>
    </div>
    <div class="chat-messages" id="chatMessages"></div>
    <form class="chat-input-row" id="chatForm">
      <input type="text" id="chatInput" placeholder="输入消息..." autocomplete="off" maxlength="500">
      <button type="submit" class="btn chat-send-btn">发送</button>
    </form>
  </aside>
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
      <option value="xiangqi">中国象棋</option>
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

<div class="rematch-modal hidden" id="drawModal">
  <div class="rematch-modal-text" id="drawModalText">对方请求求和</div>
  <div class="rematch-buttons">
    <button class="btn" onclick="acceptDraw()">同意</button>
    <button class="btn btn-secondary" onclick="declineDraw()">拒绝</button>
  </div>
</div>

<div class="rematch-modal hidden" id="drawWaiting">
  <div class="rematch-modal-text">等待对方回应求和...</div>
  <button class="btn btn-secondary" onclick="cancelDraw()">取消</button>
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

  return { getLegalMoves, applyMove };
})();

// === 中国象棋规则引擎（前端本地版，与 src/xiangqi.js 同源） ===
const Xiangqi = (function() {
  const ROWS = 10, COLS = 9;
  const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const PALACE = {
    red: { rowMin: 7, rowMax: 9, colMin: 3, colMax: 5 },
    black: { rowMin: 0, rowMax: 2, colMin: 3, colMax: 5 },
  };
  const RIVER_ROW = 4;
  const inBounds = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
  const opposite = (color) => (color === 'red' ? 'black' : 'red');
  const inPalace = (r, c, color) => {
    const p = PALACE[color];
    return r >= p.rowMin && r <= p.rowMax && c >= p.colMin && c <= p.colMax;
  };
  const inOwnHalf = (r, color) => (color === 'red' ? r >= 5 : r <= 4);
  const isRedPawnCrossed = (r) => r <= RIVER_ROW;
  const isBlackPawnCrossed = (r) => r >= RIVER_ROW + 1;

  function cloneBoard(board) {
    return board.map((row) => row.map((cell) => (cell ? { type: cell.type, color: cell.color } : null)));
  }

  function findGeneral(board, color) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === color) return { r, c };
      }
    }
    return null;
  }

  function isSquareAttacked(board, r, c, byColor) {
    for (const [dr, dc] of ROOK_DIRS) {
      let nr = r + dr, nc = c + dc;
      let jumped = false;
      while (inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p) {
          if (!jumped) {
            if (p.color === byColor && p.type === 'r') return true;
            jumped = true;
          } else {
            if (p.color === byColor && p.type === 'c') return true;
            break;
          }
        }
        nr += dr; nc += dc;
      }
    }
    const knightAttacks = [
      { legOffset: [-1, -1], knightOffset: [-2, -1] },
      { legOffset: [-1, 1], knightOffset: [-2, 1] },
      { legOffset: [1, -1], knightOffset: [2, -1] },
      { legOffset: [1, 1], knightOffset: [2, 1] },
      { legOffset: [-1, -1], knightOffset: [-1, -2] },
      { legOffset: [-1, 1], knightOffset: [-1, 2] },
      { legOffset: [1, -1], knightOffset: [1, -2] },
      { legOffset: [1, 1], knightOffset: [1, 2] },
    ];
    for (const { legOffset, knightOffset } of knightAttacks) {
      const mr = r + knightOffset[0], mc = c + knightOffset[1];
      if (!inBounds(mr, mc)) continue;
      const p = board[mr][mc];
      if (!p || p.color !== byColor || p.type !== 'h') continue;
      const lr = r + legOffset[0], lc = c + legOffset[1];
      if (inBounds(lr, lc) && board[lr][lc]) continue;
      return true;
    }
    if (byColor === 'red') {
      if (inBounds(r + 1, c)) {
        const p = board[r + 1][c];
        if (p && p.color === 'red' && p.type === 'p') return true;
      }
      if (r <= RIVER_ROW) {
        if (inBounds(r, c - 1)) {
          const p = board[r][c - 1];
          if (p && p.color === 'red' && p.type === 'p') return true;
        }
        if (inBounds(r, c + 1)) {
          const p = board[r][c + 1];
          if (p && p.color === 'red' && p.type === 'p') return true;
        }
      }
    } else {
      if (inBounds(r - 1, c)) {
        const p = board[r - 1][c];
        if (p && p.color === 'black' && p.type === 'p') return true;
      }
      if (r >= RIVER_ROW + 1) {
        if (inBounds(r, c - 1)) {
          const p = board[r][c - 1];
          if (p && p.color === 'black' && p.type === 'p') return true;
        }
        if (inBounds(r, c + 1)) {
          const p = board[r][c + 1];
          if (p && p.color === 'black' && p.type === 'p') return true;
        }
      }
    }
    return false;
  }

  function isInCheck(board, color) {
    const general = findGeneral(board, color);
    if (!general) return false;
    const opp = opposite(color);
    if (isSquareAttacked(board, general.r, general.c, opp)) return true;
    const oppGeneral = findGeneral(board, opp);
    if (oppGeneral && oppGeneral.c === general.c) {
      let blocked = false;
      const lo = Math.min(general.r, oppGeneral.r) + 1;
      const hi = Math.max(general.r, oppGeneral.r);
      for (let r = lo; r < hi; r++) {
        if (board[r][general.c]) { blocked = true; break; }
      }
      if (!blocked) return true;
    }
    return false;
  }

  function getPseudoLegalMoves(board, r, c, state) {
    const piece = board[r][c];
    if (!piece) return [];
    const color = piece.color;
    const moves = [];
    const add = (tr, tc) => {
      if (!inBounds(tr, tc)) return;
      const target = board[tr][tc];
      if (target && target.color === color) return;
      moves.push({ from: { r, c }, to: { r: tr, c: tc } });
    };
    switch (piece.type) {
      case 'k': {
        for (const [dr, dc] of ROOK_DIRS) {
          const tr = r + dr, tc = c + dc;
          if (!inBounds(tr, tc)) continue;
          if (!inPalace(tr, tc, color)) continue;
          add(tr, tc);
        }
        break;
      }
      case 'a': {
        for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
          const tr = r + dr, tc = c + dc;
          if (!inBounds(tr, tc)) continue;
          if (!inPalace(tr, tc, color)) continue;
          add(tr, tc);
        }
        break;
      }
      case 'e': {
        for (const [dr, dc] of [[-2, -2], [-2, 2], [2, -2], [2, 2]]) {
          const tr = r + dr, tc = c + dc;
          if (!inBounds(tr, tc)) continue;
          if (!inOwnHalf(tr, color)) continue;
          const er = r + dr / 2, ec = c + dc / 2;
          if (board[er][ec]) continue;
          add(tr, tc);
        }
        break;
      }
      case 'h': {
        const horseMoves = [
          { to: [-1, -2], leg: [0, -1] }, { to: [-1, 2], leg: [0, 1] },
          { to: [1, -2], leg: [0, -1] }, { to: [1, 2], leg: [0, 1] },
          { to: [-2, -1], leg: [-1, 0] }, { to: [-2, 1], leg: [-1, 0] },
          { to: [2, -1], leg: [1, 0] }, { to: [2, 1], leg: [1, 0] },
        ];
        for (const { to, leg } of horseMoves) {
          const tr = r + to[0], tc = c + to[1];
          if (!inBounds(tr, tc)) continue;
          const lr = r + leg[0], lc = c + leg[1];
          if (board[lr][lc]) continue;
          add(tr, tc);
        }
        break;
      }
      case 'r': {
        for (const [dr, dc] of ROOK_DIRS) {
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
      case 'c': {
        for (const [dr, dc] of ROOK_DIRS) {
          let nr = r + dr, nc = c + dc;
          let jumped = false;
          while (inBounds(nr, nc)) {
            const target = board[nr][nc];
            if (!jumped) {
              if (target) {
                jumped = true;
              } else {
                moves.push({ from: { r, c }, to: { r: nr, c: nc } });
              }
            } else {
              if (target) {
                if (target.color !== color) {
                  moves.push({ from: { r, c }, to: { r: nr, c: nc } });
                }
                break;
              }
            }
            nr += dr; nc += dc;
          }
        }
        break;
      }
      case 'p': {
        const dir = color === 'red' ? -1 : 1;
        const crossed = color === 'red' ? isRedPawnCrossed(r) : isBlackPawnCrossed(r);
        add(r + dir, c);
        if (crossed) {
          add(r, c - 1);
          add(r, c + 1);
        }
        break;
      }
    }
    return moves;
  }

  function applyMove(board, move, state) {
    const newBoard = cloneBoard(board);
    const piece = newBoard[move.from.r][move.from.c];
    let captured = null;
    if (newBoard[move.to.r][move.to.c]) {
      captured = newBoard[move.to.r][move.to.c];
    }
    newBoard[move.to.r][move.to.c] = piece;
    newBoard[move.from.r][move.from.c] = null;
    return { board: newBoard, newState: state, captured };
  }

  function getLegalMoves(board, r, c, state) {
    const piece = board[r][c];
    if (!piece) return [];
    const color = piece.color;
    const pseudo = getPseudoLegalMoves(board, r, c, state);
    const legal = [];
    for (const move of pseudo) {
      const next = applyMove(board, move, state).board;
      if (!isInCheck(next, color)) legal.push(move);
    }
    return legal;
  }

  return { getLegalMoves, applyMove };
})();

const ROWS = 15, COLS = 15;
const CHESS_GLYPHS = {
  // 白黑双方统一使用实心字形（U+265A..F），靠 CSS 颜色与描边区分，
  // 形状完全对称，避免空心字形在不同字体下细节缺失。
  white: { k:'\\u265A', q:'\\u265B', r:'\\u265C', b:'\\u265D', n:'\\u265E', p:'\\u265F' },
  black: { k:'\\u265A', q:'\\u265B', r:'\\u265C', b:'\\u265D', n:'\\u265E', p:'\\u265F' }
};
// 中国象棋棋子字符：红方用帅仕相马车炮兵，黑方用将士象马车炮卒
const XIANGQI_GLYPHS = {
  red:   { k:'帅', a:'仕', e:'相', h:'马', r:'车', c:'炮', p:'兵' },
  black: { k:'将', a:'士', e:'象', h:'马', r:'车', c:'炮', p:'卒' }
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
let xiangqiBoardData = null;
let xiangqiState = null;
let xiangqiSelected = null;
let xiangqiLegalMoves = [];
let xiangqiFlipped = false;
let xiangqiCellRefs = null; // 缓存 90 个 cell DOM 引用，避免每次 render 全量重建
let lastMove = null;
let checkColor = null;
let rematchRole = null; // 'requester' | 'accepter' | null
let pendingPromotionMove = null;
var waitAckReceived = false;
// 端到端加密状态（ECDH P-256 + AES-GCM）
let myKeyPair = null;
let sharedSecretKey = null;
let peerKeyBase64 = null;
let pendingChatQueue = [];
// 聊天记录持久化：重连/刷新后从数组重建 DOM，避免消息丢失
let chatHistory = [];
let chatUnread = 0;
let chatFocused = true;
const CHAT_STORAGE_KEY = 'chatHistory_' + (new URLSearchParams(location.search).get('room') || '');

// 从 sessionStorage 恢复聊天记录（页面刷新后仍保留，关闭标签页则清除）
function loadChatHistory() {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) chatHistory = JSON.parse(raw) || [];
  } catch (e) { chatHistory = []; }
}

function saveChatHistory() {
  try {
    // 仅保留最近 50 条，避免存储膨胀
    const trimmed = chatHistory.slice(-50);
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {}
}

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
  gameType = (g === 'chess') ? 'chess' : (g === 'xiangqi') ? 'xiangqi' : 'gomoku';
  document.getElementById('roomId').textContent = roomId;
  // 先启动 WebSocket 连接（与 DOM 构建并行，减少首次交互延迟）
  connect();
  buildBoard();
  setupChat();
  // 刷新后从 sessionStorage 恢复聊天记录并立即渲染（无需等待重连）
  loadChatHistory();
  renderChatHistory();
}

function buildBoard() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  // 切换棋种/重建时清空中国象棋 DOM 缓存，强制重新构建
  xiangqiCellRefs = null;
  if (gameType === 'chess') {
    boardEl.className = 'board chess';
    renderChess();
  } else if (gameType === 'xiangqi') {
    boardEl.className = 'board xiangqi';
    renderXiangqi();
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
  else if (gameType === 'xiangqi') renderXiangqi();
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

// === 中国象棋渲染与交互 ===
// 为降低走棋卡顿，DOM 只在首次/翻转/重建时构建一次，
// 后续选中/取消选中只更新 cell 的 class 与子元素，避免 90 个节点全量重建。
function renderXiangqi() {
  const boardEl = document.getElementById('board');
  const needRebuild = !xiangqiCellRefs || boardEl.querySelector('.xiangqi-grid') !== xiangqiCellRefs._grid;
  if (needRebuild) buildXiangqiDOM(boardEl);
  updateXiangqiCells();
}

// 首次构建棋盘 DOM：grid + 90 cell + 楚河汉界 + 九宫斜线 SVG。
// cell 引用缓存到 xiangqiCellRefs[r][c]，事件委托到 grid 上，避免 90 个 listener。
function buildXiangqiDOM(boardEl) {
  boardEl.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'xiangqi-grid';

  xiangqiCellRefs = { _grid: grid };
  const rows = xiangqiFlipped ? [9,8,7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7,8,9];
  const cols = xiangqiFlipped ? [8,7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7,8];

  for (const r of rows) {
    xiangqiCellRefs[r] = {};
    for (const c of cols) {
      const cell = document.createElement('div');
      cell.className = 'xiangqi-cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      // 棋子容器（固定占位，更新时只改内容）
      const pieceSpan = document.createElement('span');
      pieceSpan.className = 'xpiece';
      pieceSpan.style.display = 'none';
      cell.appendChild(pieceSpan);
      // 走法提示容器
      const hintSpan = document.createElement('span');
      hintSpan.className = 'move-hint';
      hintSpan.style.display = 'none';
      cell.appendChild(hintSpan);

      xiangqiCellRefs[r][c] = { cell, piece: pieceSpan, hint: hintSpan };
      grid.appendChild(cell);
    }
  }

  // 楚河汉界
  const river = document.createElement('div');
  river.className = 'xiangqi-river';
  const leftHalf = document.createElement('span');
  leftHalf.textContent = '楚 河';
  const rightHalf = document.createElement('span');
  rightHalf.textContent = '汉 界';
  river.appendChild(leftHalf);
  river.appendChild(rightHalf);
  grid.appendChild(river);

  // SVG 叠加层：网格线 + 九宫斜线 + 兵炮角标（矢量绘制，避免 DPR 1 子像素错位）
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'xiangqi-palace-diag');
  svg.setAttribute('viewBox', '0 0 9 10');
  svg.setAttribute('preserveAspectRatio', 'none');

  // 坐标转换：逻辑 (r,c) → viewBox (vx,vy)，翻转时镜像
  const vx = (c) => (xiangqiFlipped ? 8 - c : c) + 0.5;
  const vy = (r) => (xiangqiFlipped ? 9 - r : r) + 0.5;

  // 网格线
  // 横线：10 条，y=r+0.5，从 x=0.5 到 x=8.5（左右边界）
  for (let r = 0; r < 10; r++) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', 0.5);
    line.setAttribute('y1', vy(r));
    line.setAttribute('x2', 8.5);
    line.setAttribute('y2', vy(r));
    line.setAttribute('class', 'grid-line');
    svg.appendChild(line);
  }
  // 竖线：9 条，x=c+0.5
  // col 0/8（边界）从 y=0.5 到 y=9.5 连续；其余在河界处断开（y=0.5-4.5 + y=5.5-9.5）
  for (let c = 0; c < 9; c++) {
    const x = vx(c);
    if (c === 0 || c === 8) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x);
      line.setAttribute('y1', 0.5);
      line.setAttribute('x2', x);
      line.setAttribute('y2', 9.5);
      line.setAttribute('class', 'grid-line');
      svg.appendChild(line);
    } else {
      // 上段（含黑方半场）
      const up = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      up.setAttribute('x1', x);
      up.setAttribute('y1', 0.5);
      up.setAttribute('x2', x);
      up.setAttribute('y2', vy(4));
      up.setAttribute('class', 'grid-line');
      svg.appendChild(up);
      // 下段（含红方半场）
      const down = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      down.setAttribute('x1', x);
      down.setAttribute('y1', vy(5));
      down.setAttribute('x2', x);
      down.setAttribute('y2', 9.5);
      down.setAttribute('class', 'grid-line');
      svg.appendChild(down);
    }
  }

  const palaces = [
    { r1: 0, c1: 3, r2: 2, c2: 5 },
    { r1: 0, c1: 5, r2: 2, c2: 3 },
    { r1: 7, c1: 3, r2: 9, c2: 5 },
    { r1: 7, c1: 5, r2: 9, c2: 3 },
  ];
  for (const p of palaces) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', vx(p.c1) - 0.5);
    line.setAttribute('y1', vy(p.r1) - 0.5);
    line.setAttribute('x2', vx(p.c2) - 0.5);
    line.setAttribute('y2', vy(p.r2) - 0.5);
    svg.appendChild(line);
  }

  // 兵/卒位与炮位「十字花」角标（共 14 个标记点）
  // 红兵 row 6 col 0/2/4/6/8；黑卒 row 3 col 0/2/4/6/8
  // 红炮 row 7 col 1/7；黑炮 row 2 col 1/7
  // 边界列 (col 0/8) 只画内侧两角，其余四角全画
  const markPoints = [];
  for (const r of [3, 6]) for (const c of [0, 2, 4, 6, 8]) markPoints.push({ r, c });
  for (const r of [2, 7]) for (const c of [1, 7]) markPoints.push({ r, c });
  const G = 0.12;  // 角标内边距（viewBox 单位）
  const L = 0.22;  // 角标线长
  for (const { r, c } of markPoints) {
    const cx = vx(c), cy = vy(r);
    const visualC = xiangqiFlipped ? 8 - c : c;
    // 四个角：每个角两条短线（水平+垂直）组成 ⌐ 型；边界列只画内侧两角
    const corners = [];
    if (visualC !== 0) corners.push({ sx: cx - G - L, sy: cy - G, ex: cx - G, ey: cy - G, sx2: cx - G, sy2: cy - G - L, ex2: cx - G, ey2: cy - G }); // 左上
    if (visualC !== 8) corners.push({ sx: cx + G, sy: cy - G, ex: cx + G + L, ey: cy - G, sx2: cx + G, sy2: cy - G - L, ex2: cx + G, ey2: cy - G }); // 右上
    if (visualC !== 0) corners.push({ sx: cx - G - L, sy: cy + G, ex: cx - G, ey: cy + G, sx2: cx - G, sy2: cy + G, ex2: cx - G, ey2: cy + G + L }); // 左下
    if (visualC !== 8) corners.push({ sx: cx + G, sy: cy + G, ex: cx + G + L, ey: cy + G, sx2: cx + G, sy2: cy + G, ex2: cx + G, ey2: cy + G + L }); // 右下
    for (const corner of corners) {
      const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      hLine.setAttribute('x1', corner.sx); hLine.setAttribute('y1', corner.sy);
      hLine.setAttribute('x2', corner.ex); hLine.setAttribute('y2', corner.ey);
      hLine.setAttribute('class', 'star-mark');
      svg.appendChild(hLine);
      const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      vLine.setAttribute('x1', corner.sx2); vLine.setAttribute('y1', corner.sy2);
      vLine.setAttribute('x2', corner.ex2); vLine.setAttribute('y2', corner.ey2);
      vLine.setAttribute('class', 'star-mark');
      svg.appendChild(vLine);
    }
  }

  grid.appendChild(svg);

  // 事件委托：单个 listener 处理所有 cell 点击，避免 90 个闭包
  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('.xiangqi-cell');
    if (!cell || !grid.contains(cell)) return;
    const r = +cell.dataset.row;
    const c = +cell.dataset.col;
    onXiangqiCellClick(r, c);
  });

  boardEl.appendChild(grid);
}

// 增量更新：仅修改 class 与子元素内容，不重建 DOM。
function updateXiangqiCells() {
  if (!xiangqiCellRefs) return;
  const legalByTo = new Map();
  for (const m of xiangqiLegalMoves) {
    legalByTo.set(m.to.r + ',' + m.to.c, m);
  }
  const lastFromKey = lastMove ? lastMove.from.r + ',' + lastMove.from.c : null;
  const lastToKey = lastMove ? lastMove.to.r + ',' + lastMove.to.c : null;
  const selKey = xiangqiSelected ? xiangqiSelected.r + ',' + xiangqiSelected.c : null;

  for (let r = 0; r < 10; r++) {
    const row = xiangqiCellRefs[r];
    if (!row) continue;
    for (let c = 0; c < 9; c++) {
      const ref = row[c];
      if (!ref) continue;
      const piece = (xiangqiBoardData && xiangqiBoardData[r]) ? xiangqiBoardData[r][c] : null;
      const key = r + ',' + c;

      // 棋子内容
      const pieceEl = ref.piece;
      if (piece && XIANGQI_GLYPHS[piece.color] && XIANGQI_GLYPHS[piece.color][piece.type]) {
        const glyph = XIANGQI_GLYPHS[piece.color][piece.type];
        if (pieceEl.textContent !== glyph || pieceEl.className !== 'xpiece ' + piece.color) {
          pieceEl.className = 'xpiece ' + piece.color;
          pieceEl.textContent = glyph;
        }
        pieceEl.style.display = '';
      } else {
        if (pieceEl.style.display !== 'none') pieceEl.style.display = 'none';
        pieceEl.textContent = '';
      }

      // 走法提示
      const move = legalByTo.get(key);
      const hintEl = ref.hint;
      if (move) {
        const wantClass = piece ? 'move-hint capture-ring' : 'move-hint move-dot';
        if (hintEl.className !== wantClass) hintEl.className = wantClass;
        if (hintEl.style.display !== '') hintEl.style.display = '';
      } else {
        if (hintEl.style.display !== 'none') hintEl.style.display = 'none';
      }

      // class 增量
      const cell = ref.cell;
      cell.classList.toggle('selected', key === selKey);
      cell.classList.toggle('last-move', key === lastFromKey || key === lastToKey);
      cell.classList.toggle('check-king', !!(checkColor && piece && piece.type === 'k' && piece.color === checkColor));
    }
  }
}

function onXiangqiCellClick(r, c) {
  if (gameOver || !myColor || myColor !== currentTurn) return;
  if (!xiangqiBoardData) return;

  const piece = xiangqiBoardData[r][c];

  if (xiangqiSelected) {
    const move = xiangqiLegalMoves.find(m => m.to.r === r && m.to.c === c);
    if (move) {
      sendXiangqiMove(move);
      return;
    }
  }

  if (piece && piece.color === myColor) {
    xiangqiSelected = { r, c };
    try {
      xiangqiLegalMoves = Xiangqi.getLegalMoves(xiangqiBoardData, r, c, xiangqiState);
    } catch {
      xiangqiLegalMoves = [];
    }
    renderXiangqi();
  } else {
    xiangqiSelected = null;
    xiangqiLegalMoves = [];
    renderXiangqi();
  }
}

function sendXiangqiMove(move) {
  if (!ws || ws.readyState !== 1) return;
  const payload = { type: 'move', from: { r: move.from.r, c: move.from.c }, to: { r: move.to.r, c: move.to.c } };
  ws.send(JSON.stringify(payload));
  xiangqiSelected = null;
  xiangqiLegalMoves = [];
  renderXiangqi();
}

function colorLabel(color) {
  if (color === 'red') return '红棋';
  if (color === 'black') return '黑棋';
  if (color === 'white') return '白棋';
  return color;
}

function updateHeader() {
  const colorEl = document.getElementById('myColor');
  if (myColor) {
    colorEl.textContent = colorLabel(myColor);
    colorEl.className = 'color-' + myColor;
  } else {
    colorEl.textContent = '—';
    colorEl.className = '';
  }
  const turnEl = document.getElementById('turnInfo');
  turnEl.textContent = gameOver ? '已结束' : colorLabel(currentTurn);
}

function updateStatus(msg) {
  document.getElementById('playerStatus').style.display = 'flex';
  var players = msg.players;
  // 第二色（先手为黑时是 white，先手为红时是 red）
  var secondColor = (gameType === 'xiangqi') ? 'red' : 'white';
  var blackLabelEl = document.getElementById('blackLabel');
  var whiteLabelEl = document.getElementById('whiteLabel');
  if (blackLabelEl) blackLabelEl.textContent = '黑棋';
  if (whiteLabelEl) whiteLabelEl.textContent = (gameType === 'xiangqi') ? '红棋' : '白棋';
  // black 总是映射到 blackDot/blackLatency；第二色映射到 whiteDot/whiteLatency
  var pairs = [['black', 'black'], [secondColor, 'white']];
  pairs.forEach(function(pair) {
    var srcColor = pair[0], domKey = pair[1];
    var dot = document.getElementById(domKey + 'Dot');
    var latEl = document.getElementById(domKey + 'Latency');
    var p = players[srcColor];
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
    initEncryption();
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

      case 'colorAssign': {
        myColor = msg.you;
        const prevXiangqiFlipped = xiangqiFlipped;
        if (msg.gameType && msg.gameType !== gameType) {
          gameType = msg.gameType;
          buildBoard();
        } else if (msg.gameType) {
          gameType = msg.gameType;
        }
        chessFlipped = (gameType === 'chess' && myColor === 'black');
        xiangqiFlipped = (gameType === 'xiangqi' && myColor === 'black');
        // 翻转状态变化（如再来一局换边）需重建 DOM 以重排行列顺序与边界 class
        if (gameType === 'xiangqi' && prevXiangqiFlipped !== xiangqiFlipped) {
          buildBoard();
        }
        chessSelected = null;
        chessLegalMoves = [];
        chessState = null;
        xiangqiSelected = null;
        xiangqiLegalMoves = [];
        xiangqiState = null;
        checkColor = null;
        rematchRole = null;
        gameOver = false;
        draw = false;
        hideAllModals();
        setRematchSelectDefaults();
        setStatus('');
        updateHeader();
        // 重连后从内存重建聊天记录，恢复对方在线状态
        renderChatHistory();
        setPeerOnline(true);
        break;
      }

      case 'sync':
        if (msg.gameType && msg.gameType !== gameType) {
          gameType = msg.gameType;
          buildBoard();
        }
        if (gameType === 'chess') {
          chessBoardData = msg.board;
          lastMove = msg.lastMove || null;
          chessState = msg.chessState || null;
          chessSelected = null;
          chessLegalMoves = [];
        } else if (gameType === 'xiangqi') {
          xiangqiBoardData = msg.board;
          lastMove = msg.lastMove || null;
          xiangqiState = msg.xiangqiState || null;
          xiangqiSelected = null;
          xiangqiLegalMoves = [];
        } else {
          boardData = msg.board;
        }
        currentTurn = msg.currentTurn;
        gameOver = msg.gameOver;
        draw = !!msg.draw;
        checkColor = null;
        renderBoard();
        updateHeader();
        if (!gameOver && myColor) {
          setStatus(myColor === currentTurn ? '轮到你了！' : '等待对手落子...');
        }
        // 新一局开始时恢复求和按钮
        var drawBtnSync = document.getElementById('drawBtn');
        if (drawBtnSync) drawBtnSync.style.display = '';
        break;

      case 'moveUpdate': {
        // 增量走子同步：用本地引擎应用走法，避免整盘下发
        if (msg.gameType && msg.gameType !== gameType) {
          gameType = msg.gameType;
          buildBoard();
        }
        if (gameType === 'gomoku') {
          if (msg.move) boardData[msg.move.row][msg.move.col] = msg.color;
        } else if (gameType === 'chess') {
          try {
            const result = Chess.applyMove(chessBoardData, msg.move, chessState, msg.move && msg.move.promotionPiece);
            chessBoardData = result.board;
            chessState = result.newState;
          } catch (e) {
            // 本地应用失败（引擎同源，理论上不会发生）；以服务端状态为准
          }
          if (msg.chessState) chessState = msg.chessState;
        } else if (gameType === 'xiangqi') {
          try {
            const result = Xiangqi.applyMove(xiangqiBoardData, msg.move, xiangqiState);
            xiangqiBoardData = result.board;
            xiangqiState = result.newState;
          } catch (e) {
            // 本地应用失败，以服务端状态为准
          }
          if (msg.xiangqiState) xiangqiState = msg.xiangqiState;
        }
        lastMove = msg.lastMove || null;
        currentTurn = msg.currentTurn;
        gameOver = msg.gameOver;
        draw = !!msg.draw;
        checkColor = msg.checkColor || null;
        chessSelected = null;
        chessLegalMoves = [];
        xiangqiSelected = null;
        xiangqiLegalMoves = [];
        renderBoard();
        updateHeader();
        if (!gameOver && myColor) {
          setStatus(myColor === currentTurn ? '轮到你了！' : '等待对手落子...');
        }
        break;
      }

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
        // 终局后求和按钮不再可用
        var drawBtn = document.getElementById('drawBtn');
        if (drawBtn) drawBtn.style.display = 'none';
        document.getElementById('drawModal').classList.add('hidden');
        document.getElementById('drawWaiting').classList.add('hidden');
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
        const gameName = msg.gameType === 'chess' ? '国际象棋' : (msg.gameType === 'xiangqi' ? '中国象棋' : '五子棋');
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
        setPeerOnline(false);
        break;

      case 'opponentRejoin':
        setStatus('');
        setPeerOnline(true);
        break;

      case 'waitNotice':
        showWaitNotice('对方说：请等我一会');
        break;

      case 'waitAck':
        waitAckReceived = true;
        break;

      case 'drawOffer':
        // 对方发起求和：弹窗让我方同意/拒绝
        document.getElementById('drawWaiting').classList.add('hidden');
        document.getElementById('drawModalText').textContent = '对方请求求和，是否同意？';
        document.getElementById('drawModal').classList.remove('hidden');
        break;

      case 'drawDecline':
        // 对方拒绝求和（或取消）：关闭我方等待弹窗
        document.getElementById('drawWaiting').classList.add('hidden');
        setStatus('对方拒绝了求和', true);
        break;

      case 'drawAccept':
        // drawAccept 由服务端处理为 gameOver，前端不单独处理（gameOver 会到达）
        break;

      case 'chat': {
        // E2E 加密消息：解密后显示；不支持加密或解密失败时回退明文
        (async () => {
          if (msg.ct && msg.iv && window.crypto && crypto.subtle) {
            const plain = await decryptChat(msg.iv, msg.ct);
            if (plain !== null) appendChatMessage(msg.color, plain, msg.ts);
            else appendSystemMessage('收到无法解密的消息');
          } else if (typeof msg.text === 'string') {
            appendChatMessage(msg.color, msg.text, msg.ts);
          }
        })();
        break;
      }

      case 'pubKey':
        onPeerPubKey(msg.key);
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

// === 求和（和棋请求） ===
function sendDrawOffer() {
  if (gameOver) return;
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'drawOffer' }));
    document.getElementById('drawWaiting').classList.remove('hidden');
  }
}

function acceptDraw() {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'drawAccept' }));
  }
  document.getElementById('drawModal').classList.add('hidden');
}

function declineDraw() {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'drawDecline' }));
  }
  document.getElementById('drawModal').classList.add('hidden');
}

function cancelDraw() {
  // 取消等同于拒绝（对方若已收到请求，会收到 decline）
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'drawDecline' }));
  }
  document.getElementById('drawWaiting').classList.add('hidden');
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

// === 端到端加密（ECDH P-256 派生共享密钥 + AES-GCM 加密） ===
// 服务端只转发公钥与密文，无法解密聊天内容。重连时重新协商密钥。
function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function base64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function initEncryption() {
  // 重连时重置：旧共享密钥已失效，需用新公钥重新协商
  sharedSecretKey = null;
  peerKeyBase64 = null;
  if (!window.crypto || !crypto.subtle) return;
  try {
    myKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']
    );
    const pubKeyBytes = await crypto.subtle.exportKey('raw', myKeyPair.publicKey);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'pubKey', key: arrayBufferToBase64(pubKeyBytes) }));
    }
  } catch (e) {
    myKeyPair = null;
  }
}

async function onPeerPubKey(newKeyBase64) {
  if (!window.crypto || !crypto.subtle || !myKeyPair) return;
  // 仅在公钥变化时重新派生（断开重连或首次交换），同时避免双方互相重发形成死循环
  if (peerKeyBase64 === newKeyBase64) return;
  peerKeyBase64 = newKeyBase64;
  try {
    const peerPublicKey = await crypto.subtle.importKey(
      'raw', base64ToArrayBuffer(newKeyBase64),
      { name: 'ECDH', namedCurve: 'P-256' }, false, []
    );
    sharedSecretKey = await crypto.subtle.deriveKey(
      { name: 'ECDH', public: peerPublicKey }, myKeyPair.privateKey,
      { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
    // 通道建立后重发我方公钥：对方可能刚重连/刚加入，尚未收到我方公钥
    const pubKeyBytes = await crypto.subtle.exportKey('raw', myKeyPair.publicKey);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'pubKey', key: arrayBufferToBase64(pubKeyBytes) }));
    }
    // 发送通道建立前排队等待的消息
    while (pendingChatQueue.length && sharedSecretKey) {
      const text = pendingChatQueue.shift();
      await sendChatEncrypted(text, true);
    }
  } catch (e) {
    sharedSecretKey = null;
  }
}

async function sendChatEncrypted(text, skipLocalDisplay) {
  // 发送方本地立即显示，无需等服务端回环，降低感知延迟
  if (!skipLocalDisplay) appendChatMessage(myColor, text, Date.now());
  if (!ws || ws.readyState !== 1) return;
  if (!window.crypto || !crypto.subtle) {
    // 不支持 Web Crypto（非安全上下文）时回退明文
    ws.send(JSON.stringify({ type: 'chat', text: text.slice(0, 500) }));
    return;
  }
  if (!sharedSecretKey) {
    // 加密通道尚未建立，排队等待建立后自动发送
    if (pendingChatQueue.length < 50) pendingChatQueue.push(text);
    return;
  }
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, sharedSecretKey, encoded
    );
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'chat',
        iv: arrayBufferToBase64(iv.buffer),
        ct: arrayBufferToBase64(ciphertext),
      }));
    }
  } catch (e) {
    // 加密失败时回退明文，保证消息可达
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'chat', text: text.slice(0, 500) }));
    }
  }
}

async function decryptChat(ivBase64, ctBase64) {
  if (!sharedSecretKey) return null;
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToArrayBuffer(ivBase64) },
      sharedSecretKey, base64ToArrayBuffer(ctBase64)
    );
    return new TextDecoder().decode(plain);
  } catch (e) {
    return null;
  }
}

// === 聊天室 ===
function setupChat() {
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const box = document.getElementById('chatMessages');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = (input.value || '').trim();
    if (!text) return;
    input.value = '';
    input.focus();
    sendChatEncrypted(text.slice(0, 500));
  });

  // 输入框/消息区获得焦点时视为已读，清除未读红点
  const markRead = () => {
    if (chatUnread > 0) { chatUnread = 0; updateChatBadge(); }
    chatFocused = true;
  };
  input.addEventListener('focus', markRead);
  box.addEventListener('scroll', markRead);
  box.addEventListener('mousedown', markRead);
  // 点击消息区也视为已读（移动端 tap 不一定触发 focus）
  box.addEventListener('click', markRead);
  window.addEventListener('focus', markRead);
}

// 重建聊天 DOM（重连或首次渲染时从 chatHistory 恢复）
function renderChatHistory() {
  const box = document.getElementById('chatMessages');
  if (!box) return;
  box.innerHTML = '';
  for (const item of chatHistory) {
    if (item.sys) box.appendChild(createSystemMsgEl(item.text));
    else box.appendChild(createChatMsgEl(item.color, item.text));
  }
  box.scrollTop = box.scrollHeight;
}

function createChatMsgEl(color, text) {
  const msg = document.createElement('div');
  msg.className = 'chat-msg';
  const name = document.createElement('span');
  name.className = 'chat-name color-' + (color || 'black');
  name.textContent = color ? (colorLabel(color) + '（' + (color === myColor ? '我' : '对手') + '）') : '玩家';
  const body = document.createElement('span');
  body.className = 'chat-text';
  body.textContent = text;
  msg.appendChild(name);
  msg.appendChild(body);
  return msg;
}

function createSystemMsgEl(text) {
  const msg = document.createElement('div');
  msg.className = 'chat-msg sys';
  msg.textContent = text;
  return msg;
}

function appendChatMessage(color, text, ts) {
  chatHistory.push({ color, text, ts });
  if (chatHistory.length > 200) chatHistory.shift();
  saveChatHistory();
  const box = document.getElementById('chatMessages');
  if (!box) return;
  box.appendChild(createChatMsgEl(color, text));
  // 仅在用户贴近底部时自动滚动，避免回看历史时被强制拉到底
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
  if (nearBottom) box.scrollTop = box.scrollHeight;
  // 收到对方消息时计入未读
  if (color !== myColor) incrementUnread();
}

function appendSystemMessage(text) {
  chatHistory.push({ sys: true, text });
  if (chatHistory.length > 200) chatHistory.shift();
  saveChatHistory();
  const box = document.getElementById('chatMessages');
  if (!box) return;
  box.appendChild(createSystemMsgEl(text));
  box.scrollTop = box.scrollHeight;
}

function incrementUnread() {
  if (chatFocused && document.hasFocus && document.hasFocus()) return;
  chatUnread++;
  updateChatBadge();
}

function updateChatBadge() {
  const badge = document.getElementById('chatBadge');
  if (!badge) return;
  if (chatUnread > 0) {
    badge.textContent = chatUnread > 99 ? '99+' : chatUnread;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// 更新对方在线/离线状态指示
function setPeerOnline(online) {
  const el = document.getElementById('chatPeerStatus');
  if (!el) return;
  if (online) {
    el.className = 'chat-peer-status online';
    el.textContent = '在线';
  } else {
    el.className = 'chat-peer-status offline';
    el.textContent = '离线';
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
