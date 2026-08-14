/**
 * 棋类对战应用 - 前端入口文件
 * 包含：首页模板、游戏页面模板、前端规则引擎（国际象棋/中国象棋）、
 * WebSocket 通信、端到端加密聊天、复盘/模拟重下等功能。
 */

// 导入房间管理 Durable Object 类
import { Room } from './room.js';

// 导出 Room 供 Cloudflare Workers 路由绑定
export { Room };

// === 首页模板（HOMEPAGE_HTML）===
// 游戏选择首页：展示三种棋类（五子棋、国际象棋、中国象棋）入口，
// 支持当面对战和复制链接邀请好友两种模式。内联 CSS 与 JS 实现自包含页面。
const HOMEPAGE_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>棋类对战</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Ma+Shan+Zheng&family=ZCOOL+XiaoWei&display=swap" rel="stylesheet">
<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "xzlilpcqo4");
</script>
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
.mode-overlay { position: fixed; inset: 0; background: rgba(5,8,18,0.7); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); display: none; align-items: center; justify-content: center; z-index: 100; }
.mode-overlay.show { display: flex; }
.mode-card { background: linear-gradient(180deg, rgba(28,34,56,0.97), rgba(19,24,41,0.9)); border: 1px solid #2a3458; border-radius: 16px; padding: 36px 32px; display: flex; flex-direction: column; align-items: center; gap: 20px; box-shadow: 0 12px 40px rgba(0,0,0,0.7); min-width: 280px; }
.mode-title { font-size: 22px; font-weight: 700; color: #e94560; letter-spacing: 1px; }
.mode-buttons { display: flex; flex-direction: column; gap: 14px; width: 100%; }
.mode-btn { padding: 16px 20px; border: none; border-radius: 10px; font-size: 17px; font-family: 'Sora', sans-serif; cursor: pointer; background: #0f3460; color: #fff; font-weight: 600; transition: background 0.2s, transform 0.15s; letter-spacing: 0.5px; }
.mode-btn:hover { background: #1a4a8a; }
.mode-btn:active { transform: scale(0.97); }
.mode-btn.local-btn { background: #e94560; }
.mode-btn.local-btn:hover { background: #c73650; }
.mode-close { background: none; border: none; color: #8892b0; font-size: 14px; cursor: pointer; margin-top: 4px; }
.mode-close:hover { color: #eee; }
</style>
</head>
<body>
<div class="home-card">
  <div class="home-title">选择棋种</div>
  <div class="home-subtitle">点击进入对战房间</div>
  <div class="home-buttons">
    <button class="home-btn" onclick="showModeSelect('gomoku')">五子棋</button>
    <button class="home-btn chess-btn" onclick="showModeSelect('chess')">国际象棋</button>
    <button class="home-btn xiangqi-btn" onclick="showModeSelect('xiangqi')">中国象棋</button>
  </div>
</div>
<div class="mode-overlay" id="modeOverlay">
  <div class="mode-card">
    <div class="mode-title">选择对战方式</div>
    <div class="mode-buttons">
      <button class="mode-btn local-btn" onclick="enterGame(selectedGame,'local')">当面对战</button>
      <button class="mode-btn" onclick="enterGame(selectedGame,'online')">复制链接邀请好友</button>
    </div>
    <button class="mode-close" onclick="hideModeSelect()">取消</button>
  </div>
</div>
<script>
var selectedGame = 'gomoku';
function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}
function showModeSelect(game) {
  selectedGame = game;
  document.getElementById('modeOverlay').classList.add('show');
}
function hideModeSelect() {
  document.getElementById('modeOverlay').classList.remove('show');
}
function enterGame(game, mode) {
  if (mode === 'local') {
    location.href = '?game=' + game + '&mode=local';
    return;
  }
  const id = generateRoomId();
  const link = location.origin + '?room=' + id + '&game=' + game;
  try { navigator.clipboard.writeText(link); } catch (e) {}
  location.href = '?room=' + id + '&game=' + game;
}
</script>
</body>
</html>`;

// === 游戏页面模板（GAME_HTML）===
// 包含：棋盘渲染、聊天面板、状态栏、复盘控制条、弹窗等全部 DOM 结构，
// 以及内联 CSS 样式和 JS 逻辑。是一个自包含的单页应用 HTML 模板。
const GAME_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>棋类对战</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Ma+Shan+Zheng&family=ZCOOL+XiaoWei&display=swap" rel="stylesheet">
<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "xzlilpcqo4");
</script>
<style>
/* ---- CSS 变量定义 ---- */
:root {
  --bg-0: #0a0d1a; --bg-1: #131829; --bg-2: #1c2238; /* 背景色阶 */
  --border: #2a3458; --accent: #e94560;               /* 边框与强调色 */
  --text: #e8ecf4; --text-dim: #8892b0;                /* 文本颜色 */
  --good: #4ecca3; --warn: #f0a500; --bad: #e94560;    /* 状态颜色（好/警告/坏） */
  --board-wood: #DEB887; --board-line: #8B7355;         /* 棋盘木色与网格线 */
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

/* 页面头部：房间信息、玩家颜色、回合状态 */
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

/* 棋盘容器：居中放置棋盘，垂直方向自适应 */
.board-container { flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 8px; }

/* 游戏区域：手机端纵向（棋盘在上、聊天在下），桌面端横向（棋盘在左、聊天在右） */
.game-area { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 8px; padding: 0 8px 8px; }

/* 聊天面板：消息列表 + 输入框 + 折叠/展开功能 */
.chat-panel { flex-shrink: 0; display: flex; flex-direction: column; background: linear-gradient(180deg, rgba(28,34,56,0.95), rgba(19,24,41,0.85)); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; height: 170px; transition: height 0.2s ease; }
.chat-panel.collapsed { height: auto; }
.chat-panel.collapsed .chat-body { display: none; }
.chat-body { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.chat-header { flex-shrink: 0; padding: 6px 12px; font-size: 12px; font-weight: 600; color: var(--text-dim); letter-spacing: 0.5px; border-bottom: 1px solid var(--border); background: rgba(10,13,26,0.4); display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.chat-panel.collapsed .chat-header { border-bottom: none; }
.chat-toggle { display: inline-block; transition: transform 0.2s ease; font-size: 10px; color: var(--text-dim); width: 12px; text-align: center; }
.chat-panel.collapsed .chat-toggle { transform: rotate(-90deg); }
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

/* 状态消息：显示当前轮到谁、将军提示等 */
.status-msg { font-size: 13px; color: var(--text-dim); min-height: 18px; text-align: center; letter-spacing: 0.5px; flex-shrink: 0; font-weight: 500; }
.status-msg.check-msg { color: var(--bad); font-weight: 700; font-size: 14px; animation: checkPulse 1s ease-in-out infinite; }
@keyframes checkPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }

/* 吃子提示：固定高度预留位置，防止显示时棋盘缩放 */
.capture-notice { min-height: 22px; text-align: center; font-size: 13px; font-weight: 700; color: #ff4444; flex-shrink: 0; display: flex; align-items: center; justify-content: center; gap: 4px; }
.capture-notice:empty { min-height: 22px; }
.capture-notice .capture-glyph { font-size: 18px; line-height: 1; }

.board { position: relative; background: var(--board-wood); border-radius: 8px; padding: clamp(6px, 1.6vmin, 14px); box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15); width: var(--board-size); height: var(--board-size); max-width: 100%; flex-shrink: 1; min-width: 0; }
.board.chess { background: transparent; padding: 0; overflow: hidden; border-radius: 6px; box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.4); }
/* 模拟重下模式：棋盘绿色描边高亮 */
.board.sim-active { box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 3px #4ecca3, inset 0 1px 0 rgba(255,255,255,0.15); }

/* 五子棋棋盘网格：15x15 网格线 + 落子棋子 + 预览落点 */
.board-grid { width: 100%; height: 100%; display: grid; grid-template-columns: repeat(15, 1fr); grid-template-rows: repeat(15, 1fr); gap: 0; }
.cell { width: 100%; height: 100%; position: relative; cursor: pointer; }
.cell::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: var(--board-line); }
.cell::after { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: var(--board-line); }

/* 棋子样式：黑白棋子渐变 + 阴影 */
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
.chess-cell.castle-hint { box-shadow: inset 0 0 0 min(0.5vmin, 5px) #4ecca3; cursor: pointer; }
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

/* 通用按钮样式 */
.btn { padding: 8px 14px; border: none; border-radius: 8px; font-size: 13px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; background: var(--accent); color: #fff; transition: background 0.2s, transform 0.1s; letter-spacing: 0.3px; }
.btn:hover { background: #c73650; }
.btn:active { transform: scale(0.96); }
.btn-secondary { background: #2a3458; }
.btn-secondary:hover { background: #3a4578; }
.button-row { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; justify-content: center; }

/* 等待对手加入遮罩 */
.waiting-overlay { position: fixed; inset: 0; background: rgba(10,13,26,0.85); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; z-index: 100; }
.waiting-overlay.hidden { display: none; }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.waiting-text { font-size: 16px; color: var(--text); }

/* 结果弹窗：显示胜负/和棋 + 再来一局/复盘按钮 */
.result-overlay { position: fixed; inset: 0; background: rgba(10,13,26,0.88); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; z-index: 100; }
.result-overlay.hidden { display: none; }
.result-text { font-size: 26px; font-weight: 700; letter-spacing: 1px; }
.rematch-select-row { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--text); }
.rematch-select-row select { padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-2); color: var(--text); font-size: 14px; font-family: 'Sora', sans-serif; cursor: pointer; }
.rematch-hint { font-size: 13px; color: var(--warn); min-height: 16px; text-align: center; }
.result-buttons { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }

/* 复盘控制条：固定在底部，不遮挡棋盘 */
.review-bar { position: fixed; left: 0; right: 0; bottom: 0; padding: 10px 14px; padding-bottom: max(10px, env(safe-area-inset-bottom)); background: linear-gradient(180deg, rgba(19,24,41,0.85), rgba(10,13,26,0.98)); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; z-index: 105; }
.review-bar.hidden { display: none; }
.review-bar .review-step { font-size: 13px; font-weight: 600; color: var(--text); font-family: 'JetBrains Mono', monospace; min-width: 64px; text-align: center; }
.review-bar .review-title { font-size: 12px; color: var(--text-dim); letter-spacing: 0.5px; margin-right: 4px; }
.review-bar .btn { padding: 7px 12px; font-size: 13px; }
.review-bar .nav-btn { background: #2a3458; min-width: 40px; }
.review-bar .nav-btn:hover { background: #3a4578; }
.review-bar .nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.review-bar .exit-btn { background: var(--accent); margin-left: 6px; }
.review-bar .sim-btn { background: #1a6b4e; }
.review-bar .sim-btn:hover { background: #248a68; }
.review-bar .sim-btn.active { background: #4ecca3; color: #0a0d1a; }
.review-bar .export-btn { background: #6b5b1a; }
.review-bar .export-btn:hover { background: #8a7a28; }
.review-bar .divider { width: 1px; height: 20px; background: var(--border); margin: 0 4px; }
.review-bar .review-sim-hint { font-size: 11px; color: var(--good); font-weight: 600; }

/* 再来一局弹窗（全屏遮罩） */
.rematch-modal { position: fixed; inset: 0; background: rgba(10,13,26,0.88); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; z-index: 110; }
.rematch-modal.hidden { display: none; }
.rematch-modal-text { font-size: 16px; color: var(--text); text-align: center; }
.rematch-buttons { display: flex; gap: 12px; }

/* "等一会"通知弹窗：顶部滑入，不遮挡棋盘 */
.wait-notice-overlay { position: fixed; top: 14px; left: 50%; transform: translateX(-50%); background: var(--accent); color: #fff; padding: 12px 22px; border-radius: 10px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 20px rgba(233,69,96,0.5); z-index: 200; animation: slideDown 0.3s ease; display: flex; align-items: center; gap: 12px; }
.wait-notice-overlay .ack-btn { background: #fff; color: var(--accent); border: none; padding: 4px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px; }
@keyframes slideDown { from { transform: translate(-50%, -100px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }

/* 兵升变弹窗：选择升变后的棋子类型 */
.promotion-modal { position: fixed; inset: 0; background: rgba(10,13,26,0.88); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; z-index: 120; }
.promotion-modal.hidden { display: none; }
.promotion-text { font-size: 16px; color: var(--text); }
.promotion-buttons { display: flex; gap: 12px; }
.promotion-btn { font-size: 24px; min-width: 60px; }

/* 手机端（<=540px）：缩小字体和间距，调整棋盘尺寸 */
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
  /* 手机端复盘/再下一盘弹窗加宽，防止文字与按钮挤在一起 */
  .wait-notice-overlay { left: 4vw; right: 4vw; transform: none; width: 92vw; max-width: 92vw; flex-wrap: wrap; justify-content: center; gap: 8px 10px; padding: 10px 14px; font-size: 13px; }
  .wait-notice-overlay .ack-btn { padding: 6px 16px; font-size: 13px; }
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

<!-- 页面头部：显示房间号、玩家颜色、回合数、网络状态 -->
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

<!-- 游戏主区域：左侧棋盘 + 右侧聊天（桌面端布局） -->
<div class="game-area">
  <!-- 棋盘容器：包含状态消息、吃子提示、棋盘、操作按钮 -->
  <div class="board-container">
    <div class="status-msg" id="statusMsg"></div>
    <div class="capture-notice" id="captureNotice"></div>
    <div class="board" id="board"></div>
    <div class="button-row">
      <button class="btn" id="copyBtn" onclick="copyLink()">复制链接邀请好友</button>
      <button class="btn btn-secondary" id="waitBtn" onclick="sendWaitNotice()">等一会</button>
      <button class="btn btn-secondary" id="drawBtn" onclick="sendDrawOffer()">求和</button>
    </div>
  </div>
  <!-- 聊天面板：消息列表 + 输入框，支持折叠/展开 -->
  <aside class="chat-panel" id="chatPanel">
    <div class="chat-header" id="chatHeader">
      <span class="chat-toggle" id="chatToggle">▼</span>
      <span>聊天室</span>
      <span class="chat-badge hidden" id="chatBadge">0</span>
      <span class="chat-peer-status" id="chatPeerStatus"></span>
    </div>
    <div class="chat-body" id="chatBody">
    <div class="chat-messages" id="chatMessages"></div>
    <form class="chat-input-row" id="chatForm">
      <input type="text" id="chatInput" placeholder="输入消息..." autocomplete="off" maxlength="500">
      <button type="submit" class="btn chat-send-btn">发送</button>
    </form>
    </div>
  </aside>
</div>

<!-- 等待对手加入遮罩（含加载动画） -->
<div class="waiting-overlay" id="waitingOverlay">
  <div class="spinner"></div>
  <div class="waiting-text">等待好友加入...</div>
  <button class="btn" id="copyBtnWaiting" onclick="copyLink('copyBtnWaiting')">复制链接邀请好友</button>
</div>

<!-- 比赛结果弹窗：显示胜负/和棋，提供再来一局/复盘操作 -->
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
  <div class="result-buttons">
    <button class="btn" id="rematchBtn" onclick="requestRematch()">再来一局</button>
    <button class="btn btn-secondary" id="reviewBtn" onclick="enterReview()">复盘</button>
  </div>
</div>

<!-- 复盘控制条：固定在底部，提供步进导航、模拟重下、导出功能 -->
<div class="review-bar hidden" id="reviewBar">
  <span class="review-title">复盘</span>
  <button class="btn nav-btn" id="reviewStartBtn" onclick="reviewGoto(0)" title="回到开局">⏮</button>
  <button class="btn nav-btn" id="reviewPrevBtn" onclick="reviewStep(-1)" title="上一步">◀</button>
  <span class="review-step" id="reviewStep">0 / 0</span>
  <button class="btn nav-btn" id="reviewNextBtn" onclick="reviewStep(1)" title="下一步">▶</button>
  <button class="btn nav-btn" id="reviewEndBtn" onclick="reviewGoto(-1)" title="回到结局">⏭</button>
  <span class="divider"></span>
  <button class="btn sim-btn" id="simBtn" onclick="toggleSimMode()" title="模拟重下">模拟重下</button>
  <span class="review-sim-hint hidden" id="simHint">模拟重下中：点击棋盘轮流落子</span>
  <span class="divider"></span>
  <button class="btn export-btn" onclick="exportReviewHTML()" title="导出为 HTML">导出</button>
  <button class="btn exit-btn" onclick="exitReview()">退出</button>
</div>

<!-- 再来一局请求弹窗：对方请求时显示 -->
<div class="rematch-modal hidden" id="rematchModal">
  <div class="rematch-modal-text" id="rematchModalText">对方请求再来一局</div>
  <div class="rematch-buttons">
    <button class="btn" onclick="acceptRematch()">同意</button>
    <button class="btn btn-secondary" onclick="declineRematch()">拒绝</button>
  </div>
</div>

<!-- 等待对方同意再来一局 -->
<div class="rematch-modal hidden" id="rematchWaiting">
  <div class="rematch-modal-text">等待对方同意...</div>
  <button class="btn btn-secondary" onclick="cancelRematch()">取消</button>
</div>

<!-- 求和请求弹窗：对方请求和棋时显示 -->
<div class="rematch-modal hidden" id="drawModal">
  <div class="rematch-modal-text" id="drawModalText">对方请求求和</div>
  <div class="rematch-buttons">
    <button class="btn" onclick="acceptDraw()">同意</button>
    <button class="btn btn-secondary" onclick="declineDraw()">拒绝</button>
  </div>
</div>

<!-- 等待对方回应求和 -->
<div class="rematch-modal hidden" id="drawWaiting">
  <div class="rematch-modal-text">等待对方回应求和...</div>
  <button class="btn btn-secondary" onclick="cancelDraw()">取消</button>
</div>

<!-- 兵升变选择弹窗：选择升变棋子类型（后/车/象/马） -->
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
  // 方向常量定义
  const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];      // 车走法方向
  const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];   // 象走法方向
  const KING_DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]; // 王走法方向
  const KNIGHT_DELTAS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]; // 马走法方向
  // 车原始位置 → 易位类型映射（用于判断易位权是否变更）
  const ROOK_ORIGINS = {
    white: { '7,0': 'q', '7,7': 'k' },
    black: { '0,0': 'q', '0,7': 'k' },
  };
  /** 检查坐标是否在棋盘内 */
  const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  /** 返回对方颜色 */
  const opposite = (color) => (color === 'white' ? 'black' : 'white');

  /**
   * 深拷贝棋盘（避免引用污染）
   * @param {Array} board - 当前棋盘数组
   * @returns {Array} 深拷贝后的棋盘
   */
  function cloneBoard(board) {
    return board.map((row) => row.map((cell) => (cell ? { type: cell.type, color: cell.color } : null)));
  }

  /**
   * 判断指定格子是否被某方棋子攻击
   * @param {Array} board - 棋盘
   * @param {number} r - 行
   * @param {number} c - 列
   * @param {string} byColor - 攻击方颜色
   * @returns {boolean} 是否被攻击
   */
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

  /**
   * 在棋盘上查找指定颜色的王的位置
   * @param {Array} board - 棋盘
   * @param {string} color - 颜色
   * @returns {{r:number,c:number}|null} 王的位置
   */
  function findKing(board, color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === color) return { r, c };
      }
    }
    return null;
  }

  /**
   * 判断指定颜色是否处于被将军状态
   * @param {Array} board - 棋盘
   * @param {string} color - 颜色
   * @returns {boolean} 是否被将军
   */
  function isInCheck(board, color) {
    const king = findKing(board, color);
    if (!king) return false;
    return isSquareAttacked(board, king.r, king.c, opposite(color));
  }

  /**
   * 计算伪合法走法（不含将军检测）
   * @param {Array} board - 棋盘
   * @param {number} r - 行
   * @param {number} c - 列
   * @param {Object} state - 规则状态（易位权、过路兵目标）
   * @returns {Array} 伪合法走法列表
   */
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

  /**
   * 应用走法到棋盘，返回新棋盘及状态
   * @param {Array} board - 当前棋盘
   * @param {Object} move - 走法对象
   * @param {Object} state - 当前规则状态
   * @param {string} [promotionPiece] - 升变目标棋子类型
   * @returns {{board:Array, newState:Object, captured:Object|null, isPromotion:boolean}}
   */
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

  /**
   * 计算合法走法（过滤掉导致被将军的走法）
   * @param {Array} board - 棋盘
   * @param {number} r - 行
   * @param {number} c - 列
   * @param {Object} state - 规则状态
   * @returns {Array} 合法走法列表
   */
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

  /**
   * 判断某方是否还有合法走法
   * @param {Array} board - 棋盘
   * @param {string} color - 颜色
   * @param {Object} state - 规则状态
   * @returns {boolean} 是否还有合法走法
   */
  function hasAnyLegalMove(board, color, state) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.color === color) {
          if (getLegalMoves(board, r, c, state).length > 0) return true;
        }
      }
    }
    return false;
  }

  /**
   * 判断是否将杀
   * @param {Array} board - 棋盘
   * @param {string} color - 被将军方
   * @param {Object} state - 规则状态
   * @returns {boolean} 是否将杀
   */
  function isCheckmate(board, color, state) {
    return isInCheck(board, color) && !hasAnyLegalMove(board, color, state);
  }

  /**
   * 判断是否逼和
   * @param {Array} board - 棋盘
   * @param {string} color - 当前走棋方
   * @param {Object} state - 规则状态
   * @returns {boolean} 是否逼和
   */
  function isStalemate(board, color, state) {
    return !isInCheck(board, color) && !hasAnyLegalMove(board, color, state);
  }

  /**
   * 判断是否子力不足（单王、王+象/马等无法将杀情况）
   * @param {Array} board - 棋盘
   * @returns {boolean} 是否子力不足
   */
  function isInsufficientMaterial(board) {
    const white = [];
    const black = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (!p) continue;
        const entry = { type: p.type, r, c };
        (p.color === 'white' ? white : black).push(entry);
      }
    }
    const nonKing = (arr) => arr.filter((p) => p.type !== 'k');
    const w = nonKing(white);
    const b = nonKing(black);
    if (w.length === 0 && b.length === 0) return true;
    if (w.length === 1 && b.length === 0 && (w[0].type === 'n' || w[0].type === 'b')) return true;
    if (b.length === 1 && w.length === 0 && (b[0].type === 'n' || b[0].type === 'b')) return true;
    if (w.length === 1 && b.length === 1 && w[0].type === 'b' && b[0].type === 'b') {
      if ((w[0].r + w[0].c) % 2 === (b[0].r + b[0].c) % 2) return true;
    }
    return false;
  }

  /**
   * 创建国际象棋初始棋盘布局
   * @returns {Array} 初始棋盘 8x8 数组
   */
  function initialBoard() {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    const backRank = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    for (let c = 0; c < 8; c++) {
      board[0][c] = { type: backRank[c], color: 'black' };
      board[1][c] = { type: 'p', color: 'black' };
      board[6][c] = { type: 'p', color: 'white' };
      board[7][c] = { type: backRank[c], color: 'white' };
    }
    return board;
  }

  return { getLegalMoves, applyMove, isInCheck, hasAnyLegalMove, isCheckmate, isStalemate, isInsufficientMaterial, initialBoard };
})();

// === 中国象棋规则引擎（前端本地版，与 src/xiangqi.js 同源） ===
const Xiangqi = (function() {
  const ROWS = 10, COLS = 9;                              // 棋盘行数/列数
  const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];  // 车/炮走法方向
  // 九宫范围（红方在下，黑方在上）
  const PALACE = {
    red: { rowMin: 7, rowMax: 9, colMin: 3, colMax: 5 },
    black: { rowMin: 0, rowMax: 2, colMin: 3, colMax: 5 },
  };
  const RIVER_ROW = 4;  // 楚河汉界所在行（红方半场起点）
  /** 检查坐标是否在棋盘内 */
  const inBounds = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
  /** 返回对方颜色 */
  const opposite = (color) => (color === 'red' ? 'black' : 'red');
  /** 判断坐标是否在己方九宫内 */
  const inPalace = (r, c, color) => {
    const p = PALACE[color];
    return r >= p.rowMin && r <= p.rowMax && c >= p.colMin && c <= p.colMax;
  };
  /** 判断坐标是否在己方半场 */
  const inOwnHalf = (r, color) => (color === 'red' ? r >= 5 : r <= 4);
  /** 红兵是否已过河 */
  const isRedPawnCrossed = (r) => r <= RIVER_ROW;
  /** 黑卒是否已过河 */
  const isBlackPawnCrossed = (r) => r >= RIVER_ROW + 1;

  /**
   * 深拷贝棋盘
   * @param {Array} board - 棋盘
   * @returns {Array} 拷贝后的棋盘
   */
  function cloneBoard(board) {
    return board.map((row) => row.map((cell) => (cell ? { type: cell.type, color: cell.color } : null)));
  }

  /**
   * 查找指定颜色的将/帅位置
   * @param {Array} board - 棋盘
   * @param {string} color - 颜色
   * @returns {{r:number,c:number}|null} 将/帅位置
   */
  function findGeneral(board, color) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === color) return { r, c };
      }
    }
    return null;
  }

  /**
   * 判断指定格子是否被某方棋子攻击
   * @param {Array} board - 棋盘
   * @param {number} r - 行
   * @param {number} c - 列
   * @param {string} byColor - 攻击方颜色
   * @returns {boolean} 是否被攻击
   */
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
    // 马走法：先判断蹩脚腿，再判断目标位置
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

  /**
   * 判断指定颜色是否被将军
   * @param {Array} board - 棋盘
   * @param {string} color - 颜色
   * @returns {boolean} 是否被将军
   */
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

  /**
   * 计算伪合法走法（不含将军检测）
   * @param {Array} board - 棋盘
   * @param {number} r - 行
   * @param {number} c - 列
   * @param {Object} state - 规则状态
   * @returns {Array} 走法列表
   */
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

  /**
   * 应用走法到棋盘，返回新棋盘及状态
   * @param {Array} board - 当前棋盘
   * @param {Object} move - 走法对象
   * @param {Object} state - 当前规则状态
   * @returns {{board:Array, newState:Object, captured:Object|null}}
   */
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

  /**
   * 计算合法走法（过滤掉导致被将军的走法）
   * @param {Array} board - 棋盘
   * @param {number} r - 行
   * @param {number} c - 列
   * @param {Object} state - 规则状态
   * @returns {Array} 合法走法列表
   */
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

  /**
   * 判断某方是否还有合法走法
   * @param {Array} board - 棋盘
   * @param {string} color - 颜色
   * @param {Object} state - 规则状态
   * @returns {boolean} 是否还有合法走法
   */
  function hasAnyLegalMove(board, color, state) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = board[r][c];
        if (p && p.color === color) {
          if (getLegalMoves(board, r, c, state).length > 0) return true;
        }
      }
    }
    return false;
  }

  /**
   * 判断是否将杀
   * @param {Array} board - 棋盘
   * @param {string} color - 被将军方
   * @param {Object} state - 规则状态
   * @returns {boolean} 是否将杀
   */
  function isCheckmate(board, color, state) {
    return isInCheck(board, color) && !hasAnyLegalMove(board, color, state);
  }

  /**
   * 判断是否困毙（中国象棋无逼和，困毙判负）
   * @param {Array} board - 棋盘
   * @param {string} color - 当前走棋方
   * @param {Object} state - 规则状态
   * @returns {boolean} 是否困毙
   */
  function isStalemate(board, color, state) {
    return !isInCheck(board, color) && !hasAnyLegalMove(board, color, state);
  }

  /**
   * 创建中国象棋初始棋盘布局
   * @returns {Array} 初始棋盘 10x9 数组
   */
  function initialBoard() {
    const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    const backRank = ['r', 'h', 'e', 'a', 'k', 'a', 'e', 'h', 'r'];
    for (let c = 0; c < COLS; c++) {
      board[0][c] = { type: backRank[c], color: 'black' };
      board[9][c] = { type: backRank[c], color: 'red' };
    }
    board[2][1] = { type: 'c', color: 'black' };
    board[2][7] = { type: 'c', color: 'black' };
    board[7][1] = { type: 'c', color: 'red' };
    board[7][7] = { type: 'c', color: 'red' };
    for (let c = 0; c < COLS; c += 2) {
      board[3][c] = { type: 'p', color: 'black' };
      board[6][c] = { type: 'p', color: 'red' };
    }
    return board;
  }

  return { getLegalMoves, applyMove, isInCheck, hasAnyLegalMove, isCheckmate, isStalemate, initialBoard };
})();

// === 全局变量定义 ===

// 五子棋盘尺寸：15x15
const ROWS = 15, COLS = 15;

// 国际象棋棋子 Unicode 字形映射（实心符号）
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
// 吃子提示用的棋子中文名
const CHESS_PIECE_NAMES = { k:'王', q:'后', r:'车', b:'象', n:'马', p:'兵' };
const XIANGQI_PIECE_NAMES = { k:'将帅', a:'士', e:'象', h:'马', r:'车', c:'炮', p:'兵卒' };

// 当前游戏类型：gomoku（五子棋）/ chess（国际象棋）/ xiangqi（中国象棋）
let gameType = 'gomoku';
// 我方颜色（五子棋：black/white；国际象棋：white/black；中国象棋：red/black）
let myColor = null;
// 当面对战模式：纯客户端热座模式，无 WebSocket 通信
let localMode = false;
// 当前轮到谁走棋
let currentTurn = 'black';
// 游戏是否已结束
let gameOver = false;
// 是否和棋
let draw = false;
// WebSocket 连接实例
let ws = null;
// 当前房间 ID
let roomId = '';
// 五子棋棋盘数据（15x15，存储棋子颜色字符串）
let boardData = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
// 国际象棋棋盘数据与状态
let chessBoardData = null;
// 规则状态：易位权、过路兵目标
let chessState = null;
// 当前选中的国际象棋棋子位置
let chessSelected = null;
// 当前选中棋子的合法走法列表
let chessLegalMoves = [];
// 是否翻转棋盘（黑方视角时翻转）
let chessFlipped = false;
// 中国象棋棋盘数据
let xiangqiBoardData = null;
// 中国象棋规则状态
let xiangqiState = null;
// 当前选中的中国象棋棋子位置
let xiangqiSelected = null;
// 当前选中棋子的合法走法列表
let xiangqiLegalMoves = [];
// 是否翻转棋盘（黑方视角时翻转）
let xiangqiFlipped = false;
// 缓存 90 个 cell DOM 引用，避免每次 render 全量重建
let xiangqiCellRefs = null;
// 上一步走法记录
let lastMove = null;
// 当前被将军的颜色
let checkColor = null;
// 再来一局角色：'requester'（请求方）| 'accepter'（接受方）| null
let rematchRole = null;
// 待处理的兵升变走法（用户选择升变类型后执行）
let pendingPromotionMove = null;
// 复盘历史记录：每一步的棋盘快照（含开局状态）
let moveHistory = []; // [{ gameType, board, chessState, xiangqiState, lastMove, checkColor, currentTurn }]
// 是否处于复盘模式
let replaying = false;
// 当前复盘步数索引
let replayIndex = 0;
// 模拟重下模式：在复盘基础上从当前步开始，本地轮流落子
let simMode = false;
// 模拟重下下一手颜色（gomoku: black/white）
let simColor = null;
// 模拟新增的走子记录，退出时丢弃
let simMoves = [];
// "等一会"消息是否已收到对方确认
var waitAckReceived = false;
// 端到端加密状态（ECDH P-256 + AES-GCM）
let myKeyPair = null;       // 我方密钥对
let sharedSecretKey = null; // 共享密钥
let peerKeyBase64 = null;   // 对方公钥（Base64）
// 待发送消息队列：密钥尚未建立时暂存，建立后自动发送
let pendingChatQueue = [];
// 待解密消息队列：密钥尚未建立时收到的密文暂存，密钥建立后批量解密
let pendingDecryptQueue = [];
// 聊天记录持久化：重连/刷新后从数组重建 DOM，避免消息丢失
let chatHistory = [];
// 聊天未读消息计数
let chatUnread = 0;
// 聊天面板是否获得焦点
let chatFocused = true;
// 是否允许断线重连（roomFull 等场景需禁用，避免无限重连循环）
let shouldReconnect = true;
// localStorage 键名：按房间号隔离聊天记录
const CHAT_STORAGE_KEY = 'chatHistory_' + (new URLSearchParams(location.search).get('room') || '');

/**
 * 从 localStorage 恢复聊天记录（页面刷新/关闭标签页后仍保留，跨会话持久化）
 */
function loadChatHistory() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) chatHistory = JSON.parse(raw) || [];
  } catch (e) { chatHistory = []; }
}

/**
 * 保存聊天记录到 localStorage（仅保留最近 50 条，避免存储膨胀）
 */
function saveChatHistory() {
  try {
    // 仅保留最近 50 条，避免存储膨胀
    const trimmed = chatHistory.slice(-50);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {}
}

/**
 * 生成随机房间 ID（6 位字母数字组合）
 * @returns {string} 房间 ID
 */
function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

/**
 * 应用初始化入口：解析 URL 参数，启动 WebSocket 或本地模式
 */
function init() {
  const params = new URLSearchParams(location.search);
  roomId = params.get('room');
  localMode = (params.get('mode') === 'local');
  if (!roomId && !localMode) {
    // 没有房间号且非当面对战则回到首页
    location.href = '/';
    return;
  }
  const g = params.get('game');
  gameType = (g === 'chess') ? 'chess' : (g === 'xiangqi') ? 'xiangqi' : 'gomoku';
  document.getElementById('roomId').textContent = roomId || '当面对战';
  if (localMode) {
    initLocalGame();
    return;
  }
  // 先启动 WebSocket 连接（与 DOM 构建并行，减少首次交互延迟）
  connect();
  buildBoard();
  setupChat();
  // 刷新后从 sessionStorage 恢复聊天记录并立即渲染（无需等待重连）
  loadChatHistory();
  renderChatHistory();
}

/**
 * 初始化当面对战（纯客户端热座模式）
 * 隐藏仅在线模式相关的 UI，初始化棋盘状态，开始第一回合
 */
function initLocalGame() {
  // 隐藏仅在线模式有意义的 UI
  ['copyBtn', 'waitBtn', 'drawBtn', 'chatPanel', 'playerStatus'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  // 初始化棋盘状态（镜像服务端逻辑）
  if (gameType === 'chess') {
    chessBoardData = Chess.initialBoard();
    chessState = { castlingRights: { white: { k: true, q: true }, black: { k: true, q: true } }, enPassantTarget: null };
    currentTurn = 'white';
  } else if (gameType === 'xiangqi') {
    xiangqiBoardData = Xiangqi.initialBoard();
    xiangqiState = null;
    currentTurn = 'red';
  } else {
    boardData = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    currentTurn = 'black';
  }
  myColor = currentTurn; // 复用现有回合守卫（myColor === currentTurn 即放行）
  chessFlipped = false;
  xiangqiFlipped = false;
  gameOver = false;
  draw = false;
  checkColor = null;
  chessSelected = null;
  chessLegalMoves = [];
  xiangqiSelected = null;
  xiangqiLegalMoves = [];
  lastMove = null;
  rematchRole = null;
  pendingPromotionMove = null;
  moveHistory = [];
  replaying = false;
  replayIndex = 0;
  simMode = false;
  simMoves = [];
  simColor = null;
  exitReviewUI();
  hideAllModals();
  setRematchSelectDefaults();
  buildBoard();
  renderBoard();
  moveHistory.push(snapshotState());
  updateHeader();
  setStatus('轮到 ' + colorLabel(currentTurn));
}

/**
 * 五子棋胜负判定（检查五子连珠）
 * @param {number} row - 落子行
 * @param {number} col - 落子列
 * @param {string} color - 落子颜色
 * @returns {boolean} 是否获胜
 */
function checkGomokuWin(row, col, color) {
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (const [dr, dc] of directions) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
      const r = row + dr * i, c = col + dc * i;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && boardData[r][c] === color) count++;
      else break;
    }
    for (let i = 1; i < 5; i++) {
      const r = row - dr * i, c = col - dc * i;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && boardData[r][c] === color) count++;
      else break;
    }
    if (count >= 5) return true;
  }
  return false;
}

/**
 * 本地五子棋走子：更新棋盘、判定胜负、切换回合
 * @param {number} r - 行
 * @param {number} c - 列
 */
function applyLocalGomokuMove(r, c) {
  if (gameOver || boardData[r][c]) return;
  const mover = currentTurn;
  boardData[r][c] = mover;
  lastMove = { row: r, col: c };
  if (checkGomokuWin(r, c, mover)) {
    gameOver = true;
    draw = false;
    renderGomoku();
    moveHistory.push(snapshotState());
    showLocalGameOver(mover, false);
  } else {
    currentTurn = (mover === 'black') ? 'white' : 'black';
    myColor = currentTurn;
    renderGomoku();
    moveHistory.push(snapshotState());
    updateHeader();
    setStatus('轮到 ' + colorLabel(currentTurn));
  }
}

/**
 * 本地国际象棋走子：验证合法性、应用走法、判定胜负/将军
 * @param {Object} move - 走法对象
 * @param {string} [promotionPiece] - 升变目标棋子类型
 */
function applyLocalChessMove(move, promotionPiece) {
  if (gameOver || !chessBoardData) return;
  const from = move.from, to = move.to;
  const piece = chessBoardData[from.r][from.c];
  if (!piece || piece.color !== currentTurn) return;
  let legalMoves;
  try { legalMoves = Chess.getLegalMoves(chessBoardData, from.r, from.c, chessState); } catch { return; }
  let matched = legalMoves.find(function(m) {
    return m.from.r === from.r && m.from.c === from.c && m.to.r === to.r && m.to.c === to.c && (m.special || null) === (move.special || null);
  });
  if (!matched) {
    matched = legalMoves.find(function(m) {
      return m.from.r === from.r && m.from.c === from.c && m.to.r === to.r && m.to.c === to.c;
    });
  }
  if (!matched) return;
  const VALID_PROMOTIONS = ['q', 'r', 'b', 'n'];
  const promo = matched.special === 'promotion' ? (VALID_PROMOTIONS.includes(promotionPiece) ? promotionPiece : 'q') : undefined;
  const mover = currentTurn;
  const result = Chess.applyMove(chessBoardData, matched, chessState, promo);
  chessBoardData = result.board;
  chessState = result.newState;
  lastMove = { from: { r: matched.from.r, c: matched.from.c }, to: { r: matched.to.r, c: matched.to.c } };
  chessSelected = null;
  chessLegalMoves = [];
  const opponentColor = mover === 'white' ? 'black' : 'white';
  currentTurn = opponentColor;
  myColor = currentTurn;
  if (Chess.isCheckmate(chessBoardData, opponentColor, chessState)) {
    renderChess();
    moveHistory.push(snapshotState());
    showLocalGameOver(mover, false);
  } else if (Chess.isStalemate(chessBoardData, opponentColor, chessState) || Chess.isInsufficientMaterial(chessBoardData)) {
    renderChess();
    moveHistory.push(snapshotState());
    showLocalGameOver(null, true);
  } else {
    checkColor = Chess.isInCheck(chessBoardData, opponentColor) ? opponentColor : null;
    renderChess();
    moveHistory.push(snapshotState());
    updateHeader();
    if (checkColor) setStatus('将军！轮到 ' + colorLabel(currentTurn), true);
    else setStatus('轮到 ' + colorLabel(currentTurn));
  }
}

/**
 * 本地中国象棋走子：验证合法性、应用走法、判定胜负/将军
 * @param {Object} move - 走法对象
 */
function applyLocalXiangqiMove(move) {
  if (gameOver || !xiangqiBoardData) return;
  const from = move.from, to = move.to;
  const piece = xiangqiBoardData[from.r][from.c];
  if (!piece || piece.color !== currentTurn) return;
  let legalMoves;
  try { legalMoves = Xiangqi.getLegalMoves(xiangqiBoardData, from.r, from.c, xiangqiState); } catch { return; }
  const matched = legalMoves.find(function(m) {
    return m.from.r === from.r && m.from.c === from.c && m.to.r === to.r && m.to.c === to.c;
  });
  if (!matched) return;
  const mover = currentTurn;
  const result = Xiangqi.applyMove(xiangqiBoardData, matched, xiangqiState);
  xiangqiBoardData = result.board;
  xiangqiState = result.newState;
  lastMove = { from: { r: matched.from.r, c: matched.from.c }, to: { r: matched.to.r, c: matched.to.c } };
  xiangqiSelected = null;
  xiangqiLegalMoves = [];
  const opponentColor = mover === 'red' ? 'black' : 'red';
  currentTurn = opponentColor;
  myColor = currentTurn;
  if (Xiangqi.isCheckmate(xiangqiBoardData, opponentColor, xiangqiState)) {
    renderXiangqi();
    moveHistory.push(snapshotState());
    showLocalGameOver(mover, false);
  } else if (Xiangqi.isStalemate(xiangqiBoardData, opponentColor, xiangqiState)) {
    // 困毙判负（中国象棋规则）
    renderXiangqi();
    moveHistory.push(snapshotState());
    showLocalGameOver(mover, false);
  } else {
    checkColor = Xiangqi.isInCheck(xiangqiBoardData, opponentColor) ? opponentColor : null;
    renderXiangqi();
    moveHistory.push(snapshotState());
    updateHeader();
    if (checkColor) setStatus('将军！轮到 ' + colorLabel(currentTurn), true);
    else setStatus('轮到 ' + colorLabel(currentTurn));
  }
}

/**
 * 显示本地模式游戏结束弹窗
 * @param {string|null} winner - 赢家颜色（null 表示和棋）
 * @param {boolean} isDraw - 是否和棋
 */
function showLocalGameOver(winner, isDraw) {
  gameOver = true;
  draw = isDraw;
  checkColor = null;
  renderBoard();
  updateHeader();
  var overlay = document.getElementById('resultOverlay');
  overlay.classList.remove('hidden');
  var txt = document.getElementById('resultText');
  if (isDraw) {
    txt.textContent = '🤝 和棋';
    txt.style.color = '#f0a500';
  } else {
    txt.textContent = '🎉 ' + colorLabel(winner) + '胜利';
    txt.style.color = '#4ecca3';
  }
  setRematchSelectDefaults();
  var drawBtnEl = document.getElementById('drawBtn');
  if (drawBtnEl) drawBtnEl.style.display = 'none';
  var drawModalEl = document.getElementById('drawModal');
  if (drawModalEl) drawModalEl.classList.add('hidden');
  var drawWaitingEl = document.getElementById('drawWaiting');
  if (drawWaitingEl) drawWaitingEl.classList.add('hidden');
}

/**
 * 本地模式再来一局：切换棋种、重新初始化
 */
function localRematch() {
  var sel = document.getElementById('rematchGameSelect');
  if (sel) gameType = sel.value;
  document.getElementById('resultOverlay').classList.add('hidden');
  exitReviewUI();
  initLocalGame();
}

/**
 * 构建棋盘 DOM：根据当前游戏类型渲染对应棋盘
 */
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

/**
 * 构建五子棋棋盘网格（15x15），绑定点击、悬停事件
 */
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

/**
 * 渲染当前游戏类型的棋盘（重绘）
 */
function renderBoard() {
  if (gameType === 'chess') renderChess();
  else if (gameType === 'xiangqi') renderXiangqi();
  else renderGomoku();
}

/**
 * 获取五子棋棋盘指定格子的 DOM 元素
 * @param {number} r - 行
 * @param {number} c - 列
 * @returns {Element|null} 格子 DOM 元素
 */
function getCell(r, c) {
  return document.querySelector('.cell[data-row="' + r + '"][data-col="' + c + '"]');
}

/**
 * 渲染五子棋棋盘：更新所有格子的棋子显示
 */
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

/**
 * 五子棋格子点击处理：落子（在线/本地/复盘/模拟重下）
 * @param {number} r - 行
 * @param {number} c - 列
 */
function onGomokuCellClick(r, c) {
  // 复盘模式下：点击空格直接进入模拟重下并落子
  if (replaying && !simMode) {
    if (!boardData || !boardData[r] || boardData[r][c]) return;
    enterSimMode();
    if (simMode) onSimCellClick(r, c);
    return;
  }
  // 模拟重下模式：本地轮流落子，不发送到服务端
  if (simMode) { onSimCellClick(r, c); return; }
  if (gameOver || !myColor || myColor !== currentTurn) return;
  if (boardData[r][c]) return;
  if (localMode) { applyLocalGomokuMove(r, c); return; }
  ws.send(JSON.stringify({ type: 'move', row: r, col: c }));
}

/**
 * 五子棋格子悬停：显示预览落子
 * @param {number} r - 行
 * @param {number} c - 列
 * @param {Element} cell - 格子 DOM 元素
 */
function onCellHover(r, c, cell) {
  if (gameOver || !myColor || myColor !== currentTurn) return;
  if (boardData[r][c]) return;
  if (cell.querySelector('.preview')) return;
  const preview = document.createElement('div');
  preview.className = 'preview ' + myColor;
  cell.appendChild(preview);
}

/**
 * 五子棋格子离开：移除预览落子
 * @param {Element} cell - 格子 DOM 元素
 */
function onCellLeave(cell) {
  const preview = cell.querySelector('.preview');
  if (preview) preview.remove();
}

/**
 * 渲染国际象棋棋盘：全量重建 8x8 网格，包含棋子、选中态、合法走法提示、坐标标签
 */
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

      // 王车易位：选中王时，在可参与易位的车上显示绿色高亮提示
      if (chessSelected && piece && piece.type === 'r' && piece.color === myColor) {
        const hasKingside = chessLegalMoves.some(m => m.special === 'castle-kingside' && r === chessSelected.r && c === 7);
        const hasQueenside = chessLegalMoves.some(m => m.special === 'castle-queenside' && r === chessSelected.r && c === 0);
        if (hasKingside || hasQueenside) cell.classList.add('castle-hint');
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

/**
 * 国际象棋格子点击处理：选中棋子/走子/取消选中
 * @param {number} r - 行
 * @param {number} c - 列
 */
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
    // 王车易位：选中王后点击车也能触发（用户直觉操作）
    if (chessSelected.r !== undefined && piece && piece.color === myColor && piece.type === 'r') {
      const castleMove = chessLegalMoves.find(m =>
        m.special === 'castle-kingside' && r === chessSelected.r && c === 7
      ) || chessLegalMoves.find(m =>
        m.special === 'castle-queenside' && r === chessSelected.r && c === 0
      );
      if (castleMove) { sendChessMove(castleMove); return; }
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

/**
 * 显示兵升变选择弹窗
 * @param {Object} move - 兵升变走法
 */
function showPromotionModal(move) {
  pendingPromotionMove = move;
  document.getElementById('promotionModal').classList.remove('hidden');
}

/**
 * 选择升变棋子类型后执行走子
 * @param {string} piece - 棋子类型（q/r/b/n）
 */
function choosePromotion(piece) {
  document.getElementById('promotionModal').classList.add('hidden');
  if (pendingPromotionMove) {
    const move = pendingPromotionMove;
    pendingPromotionMove = null;
    sendChessMove(move, piece);
  }
}

/**
 * 发送国际象棋走子（在线模式发送 WebSocket，本地模式应用本地规则）
 * @param {Object} move - 走法对象
 * @param {string} [promotionPiece] - 升变棋子类型
 */
function sendChessMove(move, promotionPiece) {
  if (localMode) { applyLocalChessMove(move, promotionPiece); return; }
  if (!ws || ws.readyState !== 1) return;
  const payload = { type: 'move', from: { r: move.from.r, c: move.from.c }, to: { r: move.to.r, c: move.to.c } };
  if (move.special) payload.special = move.special;
  if (promotionPiece) payload.promotionPiece = promotionPiece;
  ws.send(JSON.stringify(payload));
  chessSelected = null;
  chessLegalMoves = [];
  renderChess();
}

/**
 * 渲染中国象棋棋盘：增量更新，仅更新 class 与子元素内容，不重建 DOM
 */
function renderXiangqi() {
  const boardEl = document.getElementById('board');
  const needRebuild = !xiangqiCellRefs || boardEl.querySelector('.xiangqi-grid') !== xiangqiCellRefs._grid;
  if (needRebuild) buildXiangqiDOM(boardEl);
  updateXiangqiCells();
}

/**
 * 首次构建中国象棋棋盘 DOM：grid + 90 cell + 楚河汉界 + 九宫斜线 SVG。
 * cell 引用缓存到 xiangqiCellRefs，事件委托到 grid 上
 * @param {Element} boardEl - 棋盘容器元素
 */
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
    line.setAttribute('x1', vx(p.c1));
    line.setAttribute('y1', vy(p.r1));
    line.setAttribute('x2', vx(p.c2));
    line.setAttribute('y2', vy(p.r2));
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

/**
 * 增量更新中国象棋棋盘：仅修改 class 与子元素内容，不重建 DOM
 */
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

/**
 * 中国象棋格子点击处理：选中棋子/走子/取消选中
 * @param {number} r - 行
 * @param {number} c - 列
 */
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

/**
 * 发送中国象棋走子（在线模式发送 WebSocket，本地模式应用本地规则）
 * @param {Object} move - 走法对象
 */
function sendXiangqiMove(move) {
  if (localMode) { applyLocalXiangqiMove(move); return; }
  if (!ws || ws.readyState !== 1) return;
  const payload = { type: 'move', from: { r: move.from.r, c: move.from.c }, to: { r: move.to.r, c: move.to.c } };
  ws.send(JSON.stringify(payload));
  xiangqiSelected = null;
  xiangqiLegalMoves = [];
  renderXiangqi();
}

/**
 * 颜色名称映射
 * @param {string} color - 颜色标识
 * @returns {string} 中文颜色名称
 */
function colorLabel(color) {
  if (color === 'red') return '红棋';
  if (color === 'black') return '黑棋';
  if (color === 'white') return '白棋';
  return color;
}

/**
 * 更新页面头部信息：玩家颜色、回合状态
 */
function updateHeader() {
  const colorEl = document.getElementById('myColor');
  if (localMode) {
    colorEl.textContent = '当面对战';
    colorEl.className = '';
  } else if (myColor) {
    colorEl.textContent = colorLabel(myColor);
    colorEl.className = 'color-' + myColor;
  } else {
    colorEl.textContent = '—';
    colorEl.className = '';
  }
  const turnEl = document.getElementById('turnInfo');
  turnEl.textContent = gameOver ? '已结束' : colorLabel(currentTurn);
}

// === 复盘 ===
/**
 * 快照当前棋盘与相关状态（深拷贝，避免后续走子污染历史记录）
 * @returns {Object} 状态快照
 */
function snapshotState() {
  let board;
  if (gameType === 'chess') board = chessBoardData;
  else if (gameType === 'xiangqi') board = xiangqiBoardData;
  else board = boardData;
  return {
    gameType,
    board: board ? JSON.parse(JSON.stringify(board)) : null,
    chessState: chessState ? JSON.parse(JSON.stringify(chessState)) : null,
    xiangqiState: xiangqiState ? JSON.parse(JSON.stringify(xiangqiState)) : null,
    lastMove: lastMove ? JSON.parse(JSON.stringify(lastMove)) : null,
    checkColor,
    currentTurn,
  };
}

/**
 * 浅比较两个棋盘是否相同（用于终局 sync 去重）
 * @param {Array} a - 棋盘 A
 * @param {Array} b - 棋盘 B
 * @returns {boolean} 是否相同
 */
function boardsEqual(a, b) {
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  for (let r = 0; r < a.length; r++) {
    const ar = a[r], br = b[r];
    if (!ar || !br || ar.length !== br.length) return false;
    for (let c = 0; c < ar.length; c++) {
      const av = ar[c], bv = br[c];
      if (typeof av === 'object' && typeof bv === 'object') {
        if (!av || !bv) return av === bv;
        if (av.color !== bv.color || av.type !== bv.type) return false;
      } else if (av !== bv) {
        return false;
      }
    }
  }
  return true;
}

/**
 * 进入复盘模式：从最后一步开始，显示复盘控制条
 */
function enterReview() {
  if (moveHistory.length < 2) { setStatus('暂无复盘数据'); return; }
  replaying = true;
  replayIndex = moveHistory.length - 1; // 默认停在结局
  simMode = false;
  simMoves = [];
  document.getElementById('resultOverlay').classList.add('hidden');
  document.getElementById('reviewBar').classList.remove('hidden');
  applyReviewSnapshot();
}

/**
 * 退出复盘模式，恢复终局棋盘
 */
function exitReview() {
  replaying = false;
  exitSimMode();
  exitReviewUI();
  // 恢复终局棋盘
  if (moveHistory.length > 0) {
    restoreFromSnapshot(moveHistory[moveHistory.length - 1]);
    renderBoard();
  }
  document.getElementById('resultOverlay').classList.remove('hidden');
}

/**
 * 仅隐藏复盘 UI（不恢复棋盘），用于新一局开始时清理
 */
function exitReviewUI() {
  const bar = document.getElementById('reviewBar');
  if (bar) bar.classList.add('hidden');
  const board = document.getElementById('board');
  if (board) board.classList.remove('sim-active');
  hideRematchNotice();
  clearCaptureNotice();
}

/**
 * 复盘步进：前进或后退指定步数
 * @param {number} delta - 步进量（正数前进，负数后退）
 */
function reviewStep(delta) {
  if (!replaying || moveHistory.length === 0) return;
  // 复盘导航前退出模拟重下模式，回到真实历史
  if (simMode) exitSimMode();
  let idx = replayIndex + delta;
  if (idx < 0) idx = 0;
  if (idx > moveHistory.length - 1) idx = moveHistory.length - 1;
  replayIndex = idx;
  applyReviewSnapshot();
}

/**
 * 复盘跳转到指定步数
 * @param {number} target - 目标步数索引（-1 表示最后一步）
 */
function reviewGoto(target) {
  if (!replaying || moveHistory.length === 0) return;
  if (simMode) exitSimMode();
  replayIndex = (target < 0) ? moveHistory.length - 1 : Math.min(target, moveHistory.length - 1);
  applyReviewSnapshot();
}

/**
 * 将快照恢复到全局渲染状态并重绘（复盘模式下棋盘只读）
 */
function applyReviewSnapshot() {
  const snap = moveHistory[replayIndex];
  if (!snap) return;
  restoreFromSnapshot(snap);
  // 复盘时清空选中与合法走法提示，避免显示可走点
  chessSelected = null;
  chessLegalMoves = [];
  xiangqiSelected = null;
  xiangqiLegalMoves = [];
  renderBoard();
  updateReviewControls();
}

/**
 * 从快照恢复全局状态变量
 * @param {Object} snap - 状态快照
 */
function restoreFromSnapshot(snap) {
  gameType = snap.gameType;
  if (snap.gameType === 'chess') {
    chessBoardData = snap.board ? JSON.parse(JSON.stringify(snap.board)) : null;
    chessState = snap.chessState ? JSON.parse(JSON.stringify(snap.chessState)) : null;
  } else if (snap.gameType === 'xiangqi') {
    xiangqiBoardData = snap.board ? JSON.parse(JSON.stringify(snap.board)) : null;
    xiangqiState = snap.xiangqiState ? JSON.parse(JSON.stringify(snap.xiangqiState)) : null;
  } else {
    boardData = snap.board ? JSON.parse(JSON.stringify(snap.board)) : null;
  }
  lastMove = snap.lastMove ? JSON.parse(JSON.stringify(snap.lastMove)) : null;
  checkColor = snap.checkColor || null;
  currentTurn = snap.currentTurn;
}

/**
 * 更新复盘控制条的显示状态（步数、按钮可用性、模拟重下高亮）
 */
function updateReviewControls() {
  const total = moveHistory.length;
  const stepEl = document.getElementById('reviewStep');
  if (stepEl) {
    // 模拟重下模式下步数显示真实步数 + 模拟新增步数
    const shown = simMode ? (replayIndex + simMoves.length) : replayIndex;
    const shownTotal = simMode ? (total - 1 + simMoves.length) : Math.max(0, total - 1);
    stepEl.textContent = (total > 0 ? shown : 0) + ' / ' + shownTotal;
  }
  const atStart = !simMode && replayIndex <= 0;
  const atEnd = !simMode && replayIndex >= total - 1;
  const set = (id, disabled) => { const el = document.getElementById(id); if (el) el.disabled = disabled; };
  set('reviewStartBtn', atStart);
  set('reviewPrevBtn', atStart);
  set('reviewNextBtn', atEnd);
  set('reviewEndBtn', atEnd);
  // 模拟重下按钮高亮 + 提示
  const simBtn = document.getElementById('simBtn');
  if (simBtn) simBtn.classList.toggle('active', simMode);
  const simHint = document.getElementById('simHint');
  if (simHint) simHint.classList.toggle('hidden', !simMode);
}

/**
 * 切换模拟重下模式开关
 */
function toggleSimMode() {
  if (!replaying) return;
  if (simMode) exitSimMode();
  else enterSimMode();
}

/**
 * 进入模拟重下模式：从当前复盘快照开始，本地轮流落子
 */
function enterSimMode() {
  if (gameType !== 'gomoku') { setStatus('模拟重下仅支持五子棋'); return; }
  // 从当前复盘快照开始模拟：以快照的 currentTurn 作为下一手颜色
  const snap = moveHistory[replayIndex];
  if (!snap) return;
  simMode = true;
  simMoves = [];
  // 五子棋 currentTurn 为 black/white；开局快照 currentTurn=black
  simColor = snap.currentTurn || 'black';
  document.getElementById('board').classList.add('sim-active');
  updateReviewControls();
  setStatus('模拟重下中：点击棋盘轮流落子，再点「模拟重下」退出');
}

/**
 * 退出模拟重下模式，恢复到当前复盘快照
 */
function exitSimMode() {
  if (!simMode) return;
  simMode = false;
  simMoves = [];
  simColor = null;
  document.getElementById('board').classList.remove('sim-active');
  // 恢复到当前复盘快照
  applyReviewSnapshot();
}

/**
 * 复盘+模拟重下模式下的棋盘点击处理
 * @param {number} r - 行
 * @param {number} c - 列
 */
function onSimCellClick(r, c) {
  if (!simMode || gameType !== 'gomoku') return;
  if (boardData[r] && boardData[r][c]) return; // 已有棋子
  boardData[r][c] = simColor;
  simMoves.push({ r, c, color: simColor });
  lastMove = { from: { r, c }, to: { r, c } };
  simColor = simColor === 'black' ? 'white' : 'black';
  renderGomoku();
  updateReviewControls();
}

/**
 * 导出复盘为自包含 HTML 文件（含所有快照与导航控件）
 */
function exportReviewHTML() {
  if (moveHistory.length < 2) { setStatus('暂无复盘数据可导出'); return; }
  // 序列化快照（含模拟重下合并到末尾的虚拟快照）
  const snaps = moveHistory.map(s => ({
    gameType: s.gameType,
    board: s.board,
    lastMove: s.lastMove,
    checkColor: s.checkColor || null,
    currentTurn: s.currentTurn,
  }));
  // 若处于模拟重下模式，附加当前模拟状态作为最后一步
  if (simMode && simMoves.length > 0) {
    const last = snaps[snaps.length - 1];
    const simBoard = last.board ? JSON.parse(JSON.stringify(last.board)) : null;
    for (const m of simMoves) {
      if (simBoard) simBoard[m.r][m.c] = m.color;
    }
    snaps.push({
      gameType: last.gameType,
      board: simBoard,
      lastMove: simMoves.length > 0 ? { from: { r: simMoves[simMoves.length-1].r, c: simMoves[simMoves.length-1].c }, to: { r: simMoves[simMoves.length-1].r, c: simMoves[simMoves.length-1].c } } : last.lastMove,
      checkColor: null,
      currentTurn: simColor,
    });
  }
  const gameLabel = snaps[0].gameType === 'chess' ? '国际象棋' : (snaps[0].gameType === 'xiangqi' ? '中国象棋' : '五子棋');
  const data = JSON.stringify(snaps);
  const html = buildExportHTML(snaps, gameLabel, data);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const ts = new Date();
  const pad = n => String(n).padStart(2, '0');
  const filename = 'review_' + ts.getFullYear() + pad(ts.getMonth()+1) + pad(ts.getDate()) + '_' + pad(ts.getHours()) + pad(ts.getMinutes()) + '.html';
  try {
    // 方式一：标准 <a download> 触发浏览器下载（普通浏览器/允许下载的内嵌环境均可）
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // 兜底：页面运行在内嵌 iframe（如 IDE 预览/第三方嵌入）时，浏览器会静默拦截下载，
    // 此时在新窗口打开导出的复盘文件，用户可直接查看并手动保存
    if (window.self !== window.top) {
      const w = window.open('', '_blank');
      if (w) {
        w.document.open();
        w.document.write(html);
        w.document.close();
        setStatus('当前为内嵌预览环境，已在新窗口打开复盘文件，请在新窗口中选择「另存为」保存');
      } else {
        setStatus('浏览器拦截了导出，请允许弹窗后重新点击导出');
      }
    } else {
      setStatus('已导出复盘文件，请留意浏览器下载记录');
    }
  } catch (e) {
    // 兜底：自动下载未生效时在新窗口打开导出内容，保证用户仍能拿到复盘文件
    try {
      const w = window.open('', '_blank');
      if (w) {
        w.document.open();
        w.document.write(html);
        w.document.close();
        setStatus('自动下载未成功，已在新窗口打开复盘文件，请手动保存');
      } else {
        setStatus('导出失败：浏览器拦截了弹窗，请允许弹窗后重试');
      }
    } catch (e2) {
      setStatus('导出失败：' + (e && e.message ? e.message : '未知错误'));
    }
  } finally {
    // 延迟释放，避免兜底的新窗口尚未加载完成
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}

/**
 * 构建自包含复盘 HTML（含内联 CSS + JS，快照内嵌为 JSON）
 * @param {Array} snaps - 快照数组
 * @param {string} gameLabel - 游戏类型标签
 * @param {string} dataJson - 序列化的快照 JSON 字符串
 * @returns {string} 完整的 HTML 字符串
 */
function buildExportHTML(snaps, gameLabel, dataJson) {
  var N = String.fromCharCode(10);
  var css = [
    '* { margin: 0; padding: 0; box-sizing: border-box; }',
    "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0d1a; color: #e8ecf4; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 16px; }",
    'h1 { font-size: 20px; margin-bottom: 12px; color: #e94560; }',
    '.board-wrap { width: min(92vw, 600px); aspect-ratio: 1; background: #DEB887; border-radius: 8px; padding: 14px; box-shadow: 0 12px 40px rgba(0,0,0,0.6); }',
    '.board-wrap.chess { background: transparent; padding: 0; overflow: hidden; }',
    '.board-wrap.xiangqi { background: linear-gradient(135deg, #f0d9a4, #e6c388); aspect-ratio: 9/10; }',
    '.grid { width: 100%; height: 100%; display: grid; }',
    '.cell { position: relative; cursor: default; }',
    ".cell::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #8B7355; }",
    ".cell::after { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: #8B7355; }",
    '.stone { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 82%; height: 82%; border-radius: 50%; z-index: 2; }',
    '.stone.black { background: radial-gradient(circle at 35% 30%, #4a4a4a, #050505 70%); }',
    '.stone.white { background: radial-gradient(circle at 35% 30%, #fff, #b0b0b0 80%); }',
    '.chess-cell { display: flex; align-items: center; justify-content: center; font-size: 7vmin; }',
    '.chess-cell.light { background: #f0d9b5; }',
    '.chess-cell.dark { background: #b58863; }',
    '.chess-cell.last-move { box-shadow: inset 0 0 0 4px rgba(255,213,79,0.85); }',
    '.chess-cell.check-king { box-shadow: inset 0 0 0 4px #ff3333; }',
    '.chess-piece.white { color: #f8f6f0; text-shadow: -1px 0 0 #2a2a2a,1px 0 0 #2a2a2a,0 -1px 0 #2a2a2a,0 1px 0 #2a2a2a,-1px -1px 0 #2a2a2a,1px -1px 0 #2a2a2a,-1px 1px 0 #2a2a2a,1px 1px 0 #2a2a2a; }',
    '.chess-piece.black { color: #1a1a1a; }',
    '.xiangqi-cell { display: flex; align-items: center; justify-content: center; font-size: 6vmin; font-weight: 700; }',
    '.xiangqi-cell.last-move { box-shadow: inset 0 0 0 3px rgba(233,69,96,0.4); }',
    '.xpiece.red { color: #c0392b; }',
    '.xpiece.black { color: #1a1a1a; }',
    '.controls { display: flex; align-items: center; gap: 8px; margin-top: 16px; flex-wrap: wrap; justify-content: center; }',
    '.controls button { padding: 8px 14px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; background: #2a3458; color: #fff; font-weight: 600; }',
    '.controls button:hover { background: #3a4578; }',
    '.controls button:disabled { opacity: 0.35; cursor: not-allowed; }',
    '.controls .step { font-family: monospace; font-weight: 700; min-width: 70px; text-align: center; }',
    '.controls .sim-btn { background: #1a6b4e; }',
    '.controls .sim-btn:hover { background: #248a68; }',
    '.controls .sim-btn.active { background: #4ecca3; color: #0a0d1a; }',
    '.controls .sim-hint { font-size: 12px; color: #4ecca3; font-weight: 600; }',
    '.controls .sim-hint.hidden { display: none; }',
    '.board-wrap.sim-active { box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 3px #4ecca3; }',
    '.cell.sim-cell { cursor: pointer; }'
  ].join(N);
  var js = [
    'var simMode = false;',
    'var simMoves = [];',
    'var simColor = "black";',
    'function curBoard() {',
    '  var s = SNAPS[idx];',
    '  if (!simMode || simMoves.length === 0) return s.board;',
    '  var b = JSON.parse(JSON.stringify(s.board));',
    '  for (var i = 0; i < simMoves.length; i++) { var m = simMoves[i]; b[m.r][m.c] = m.color; }',
    '  return b;',
    '}',
    'function curLastMove() {',
    '  if (!simMode || simMoves.length === 0) return SNAPS[idx].lastMove;',
    '  var last = simMoves[simMoves.length - 1];',
    '  return { from: { r: last.r, c: last.c }, to: { r: last.r, c: last.c } };',
    '}',
    'function toggleSim() {',
    '  if (simMode) exitSim(); else enterSim();',
    '}',
    'function enterSim() {',
    '  var s = SNAPS[idx];',
    '  if (s.gameType !== "gomoku") { alert("模拟重下仅支持五子棋"); return; }',
    '  simMode = true;',
    '  simMoves = [];',
    '  simColor = s.currentTurn || "black";',
    '  render();',
    '}',
    'function exitSim() {',
    '  if (!simMode) return;',
    '  simMode = false;',
    '  simMoves = [];',
    '  render();',
    '}',
    'function onCellClick(r, c) {',
    '  var s = SNAPS[idx];',
    '  if (s.gameType !== "gomoku") return;',
    '  if (!simMode) enterSim();',
    '  if (!simMode) return;',
    '  var b = curBoard();',
    '  if (!b[r] || b[r][c]) return;',
    '  simMoves.push({ r: r, c: c, color: simColor });',
    '  simColor = simColor === "black" ? "white" : "black";',
    '  render();',
    '}',
    'function render() {',
    '  var s = SNAPS[idx];',
    '  var boardData = curBoard();',
    '  var lastMove = curLastMove();',
    '  var boardEl = document.getElementById("board");',
    '  boardEl.className = "board-wrap" + (s.gameType === "chess" ? " chess" : (s.gameType === "xiangqi" ? " xiangqi" : "")) + (simMode ? " sim-active" : "");',
    '  boardEl.innerHTML = "";',
    '  var grid = document.createElement("div");',
    '  grid.className = "grid";',
    '  var rows, cols;',
    '  if (s.gameType === "gomoku") { rows = 15; cols = 15; }',
    '  else if (s.gameType === "chess") { rows = 8; cols = 8; }',
    '  else { rows = 10; cols = 9; }',
    '  grid.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";',
    '  grid.style.gridTemplateRows = "repeat(" + rows + ", 1fr)";',
    '  for (var r = 0; r < rows; r++) {',
    '    for (var c = 0; c < cols; c++) {',
    '      var cell = document.createElement("div");',
    '      if (s.gameType === "chess") {',
    '        var isLight = (r + c) % 2 === 0;',
    '        cell.className = "chess-cell " + (isLight ? "light" : "dark");',
    '      } else if (s.gameType === "xiangqi") {',
    '        cell.className = "xiangqi-cell";',
    '      } else {',
    '        cell.className = "cell" + (simMode ? " sim-cell" : "");',
    '      }',
    '      cell.dataset.row = r;',
    '      cell.dataset.col = c;',
    '      var piece = boardData && boardData[r] ? boardData[r][c] : null;',
    '      if (piece) {',
    '        if (s.gameType === "gomoku") {',
    '          var st = document.createElement("div");',
    '          st.className = "stone " + piece;',
    '          cell.appendChild(st);',
    '        } else if (s.gameType === "chess") {',
    '          var sp = document.createElement("span");',
    '          sp.className = "chess-piece " + piece.color;',
    '          sp.textContent = CHESS[piece.color][piece.type] || "";',
    '          cell.appendChild(sp);',
    '        } else {',
    '          var sp2 = document.createElement("span");',
    '          sp2.className = "xpiece " + piece.color;',
    '          sp2.textContent = XIANGQI[piece.color][piece.type] || "";',
    '          cell.appendChild(sp2);',
    '        }',
    '      }',
    '      if (lastMove) {',
    '        if ((lastMove.from && lastMove.from.r === r && lastMove.from.c === c) ||',
    '            (lastMove.to && lastMove.to.r === r && lastMove.to.c === c)) {',
    '          cell.classList.add("last-move");',
    '        }',
    '      }',
    '      grid.appendChild(cell);',
    '    }',
    '  }',
    '  grid.addEventListener("click", function(e) {',
    '    var node = e.target;',
    '    while (node && node.parentNode !== grid) node = node.parentNode;',
    '    if (!node || node.dataset.row === undefined) return;',
    '    onCellClick(+node.dataset.row, +node.dataset.col);',
    '  });',
    '  boardEl.appendChild(grid);',
    '  var shown = simMode ? (idx + simMoves.length) : idx;',
    '  var shownTotal = simMode ? (SNAPS.length - 1 + simMoves.length) : Math.max(0, SNAPS.length - 1);',
    '  document.getElementById("stepEl").textContent = shown + " / " + shownTotal;',
    '  document.getElementById("startBtn").disabled = simMode || idx <= 0;',
    '  document.getElementById("prevBtn").disabled = simMode || idx <= 0;',
    '  document.getElementById("nextBtn").disabled = simMode || idx >= SNAPS.length - 1;',
    '  document.getElementById("endBtn").disabled = simMode || idx >= SNAPS.length - 1;',
    '  var simBtn = document.getElementById("simBtn");',
    '  if (simBtn) simBtn.classList.toggle("active", simMode);',
    '  var simHint = document.getElementById("simHint");',
    '  if (simHint) simHint.classList.toggle("hidden", !simMode);',
    '}',
    'function step(d) { if (simMode) exitSim(); var n = idx + d; if (n < 0) n = 0; if (n > SNAPS.length - 1) n = SNAPS.length - 1; idx = n; render(); }',
    'function goto(t) { if (simMode) exitSim(); idx = t < 0 ? SNAPS.length - 1 : Math.min(t, SNAPS.length - 1); render(); }',
    'document.addEventListener("keydown", function(e) {',
    '  if (e.key === "ArrowLeft") step(-1);',
    '  else if (e.key === "ArrowRight") step(1);',
    '  else if (e.key === "Home") goto(0);',
    '  else if (e.key === "End") goto(-1);',
    '});',
    'render();'
  ].join(N);
  var SC = '<scr' + 'ipt>';
  var ESC = '</scr' + 'ipt>';
  var html = '<!DOCTYPE html>' + N
    + '<html lang="zh-CN">' + N + '<head>' + N + '<meta charset="UTF-8">' + N
    + '<meta name="viewport" content="width=device-width, initial-scale=1.0">' + N
    + '<title>复盘 - __GAME_LABEL__</title>' + N + '<style>' + N + css + N + '</style>' + N + '</head>' + N + '<body>' + N
    + '<h1>复盘 - __GAME_LABEL__</h1>' + N
    + '<div class="board-wrap" id="board"></div>' + N
    + '<div class="controls">' + N
    + '  <button id="startBtn" onclick="goto(0)" title="开局">⏮</button>' + N
    + '  <button id="prevBtn" onclick="step(-1)" title="上一步">◀</button>' + N
    + '  <span class="step" id="stepEl">0 / 0</span>' + N
    + '  <button id="nextBtn" onclick="step(1)" title="下一步">▶</button>' + N
    + '  <button id="endBtn" onclick="goto(-1)" title="结局">⏭</button>' + N
    + '  <button id="simBtn" class="sim-btn" onclick="toggleSim()" title="模拟重下">模拟重下</button>' + N
    + '  <span id="simHint" class="sim-hint hidden">模拟重下中：点击棋盘轮流落子</span>' + N
    + '</div>' + N + SC + N
    + 'var SNAPS = __DATA_JSON__;' + N
    + 'var idx = SNAPS.length - 1;' + N
    + 'var CHESS = { white:{k:"♔",q:"♕",r:"♖",b:"♗",n:"♘",p:"♙"}, black:{k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"} };' + N
    + 'var XIANGQI = { red:{k:"帥",a:"仕",e:"相",h:"傌",r:"俥",c:"炮",p:"兵"}, black:{k:"將",a:"士",e:"象",h:"馬",r:"車",c:"炮",p:"卒"} };' + N
    + js + N + ESC + N + '</body>' + N + '</html>';
  return html.replace(/__GAME_LABEL__/g, gameLabel).replace(/__DATA_JSON__/g, dataJson);
}

/**
 * 更新玩家状态显示（在线/离线、延迟信息）
 * @param {Object} msg - 状态消息对象
 */
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

/**
 * 设置状态消息文字
 * @param {string} msg - 消息内容
 * @param {boolean} [isCheck] - 是否为将军提示
 */
function setStatus(msg, isCheck) {
  const el = document.getElementById('statusMsg');
  el.textContent = msg;
  if (isCheck) el.classList.add('check-msg'); else el.classList.remove('check-msg');
}

/**
 * 显示吃子提示：对方吃了我的棋子时，在棋盘顶部红字显示
 * @param {Object} piece - 被吃棋子
 * @param {string} gt - 游戏类型
 */
function showCaptureNotice(piece, gt) {
  const el = document.getElementById('captureNotice');
  if (!el) return;
  var nameMap = gt === 'xiangqi' ? XIANGQI_PIECE_NAMES : CHESS_PIECE_NAMES;
  var name = nameMap[piece.type] || piece.type;
  var glyph = '';
  if (gt === 'chess' && CHESS_GLYPHS[piece.color]) {
    glyph = CHESS_GLYPHS[piece.color][piece.type] || '';
  } else if (gt === 'xiangqi' && XIANGQI_GLYPHS[piece.color]) {
    glyph = XIANGQI_GLYPHS[piece.color][piece.type] || '';
  }
  el.innerHTML = '对方吃了你的 ' + name +
    (glyph ? ' <span class="capture-glyph">' + glyph + '</span>' : '');
}
/**
 * 清除吃子提示
 */
function clearCaptureNotice() {
  var el = document.getElementById('captureNotice');
  if (el) el.innerHTML = '';
}

/**
 * 设置再来一局选择框默认值
 */
function setRematchSelectDefaults() {
  document.getElementById('rematchGameSelect').value = gameType;
  document.getElementById('rematchHint').textContent = '';
}

/**
 * 隐藏所有弹窗遮罩
 */
function hideAllModals() {
  document.getElementById('waitingOverlay').classList.add('hidden');
  document.getElementById('resultOverlay').classList.add('hidden');
  document.getElementById('rematchModal').classList.add('hidden');
  document.getElementById('rematchWaiting').classList.add('hidden');
  document.getElementById('promotionModal').classList.add('hidden');
}

/**
 * 建立 WebSocket 连接并初始化消息处理
 */
function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(proto + '://' + location.host + '/ws?room=' + roomId + '&game=' + gameType);
  // 新连接默认允许重连（roomFull 等场景会显式置 false）
  shouldReconnect = true;

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
        // 新一局/重连开始：清空复盘记录与状态
        moveHistory = [];
        replaying = false;
        simMode = false;
        simMoves = [];
        simColor = null;
        exitReviewUI();
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
        // 记录快照：开局（moveHistory 为空时）或终局（gameOver 且与上一步不同）
        if (!replaying) {
          if (moveHistory.length === 0) {
            moveHistory.push(snapshotState());
          } else if (gameOver) {
            const lastSnap = moveHistory[moveHistory.length - 1];
            if (!boardsEqual(lastSnap.board, msg.board)) moveHistory.push(snapshotState());
          }
        }
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
        var capturedPiece = null;
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
            capturedPiece = result.captured;
          } catch (e) {
            // 本地应用失败（引擎同源，理论上不会发生）；以服务端状态为准
          }
          if (msg.chessState) chessState = msg.chessState;
        } else if (gameType === 'xiangqi') {
          try {
            const result = Xiangqi.applyMove(xiangqiBoardData, msg.move, xiangqiState);
            xiangqiBoardData = result.board;
            xiangqiState = result.newState;
            capturedPiece = result.captured;
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
        // 记录本步走完后的棋盘快照（开局状态由 sync 首次记录，此处记录每一步）
        if (!replaying && !gameOver) moveHistory.push(snapshotState());
        // 对方吃了我的棋子时，在棋盘顶部红字提示
        if (capturedPiece && myColor && capturedPiece.color === myColor) {
          showCaptureNotice(capturedPiece, gameType);
        } else {
          clearCaptureNotice();
        }
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
        const rematchText = '对方申请再下一盘' + gameName;
        // 复盘模式下用顶部弹窗提醒，避免全屏遮罩打断复盘；其他场景沿用全屏弹窗
        if (replaying) {
          showRematchNotice(rematchText);
        } else {
          document.getElementById('rematchModalText').textContent = rematchText;
          document.getElementById('rematchModal').classList.remove('hidden');
        }
        break;

      case 'rematchDecline':
        document.getElementById('rematchWaiting').classList.add('hidden');
        document.getElementById('rematchModal').classList.add('hidden');
        hideRematchNotice();
        rematchRole = null;
        // 复盘模式下保持复盘界面，仅顶部提示；否则回到结果弹窗
        if (!replaying) document.getElementById('resultOverlay').classList.remove('hidden');
        setStatus('对方拒绝了再来一局');
        break;

      case 'rematchMismatch':
        // 双方几乎同时点 request 且选了不同棋种：双方都回到结果弹窗重新发起
        document.getElementById('rematchWaiting').classList.add('hidden');
        document.getElementById('rematchModal').classList.add('hidden');
        hideRematchNotice();
        rematchRole = null;
        if (!replaying) document.getElementById('resultOverlay').classList.remove('hidden');
        document.getElementById('rematchHint').textContent = '双方选择不一致，请重新发起';
        break;

      case 'roomFull':
        // 房间已满：禁用重连，避免无限循环
        shouldReconnect = false;
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
        // 对方重连后旧共享密钥已失效（对方重新生成了密钥对）。
        // 必须立即置空 sharedSecretKey，避免我方用旧密钥加密导致对方无法解密。
        // 新密钥在公钥重新交换后由 onPeerPubKey 重新派生；期间消息暂存 pendingChatQueue。
        if (sharedSecretKey) {
          sharedSecretKey = null;
          peerKeyBase64 = null;
          initEncryption();
        }
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
        // E2E 加密消息：解密后显示；密钥未建立时暂存，建立后批量解密
        (async () => {
          if (msg.ct && msg.iv && window.crypto && crypto.subtle) {
            if (!sharedSecretKey) {
              // 密钥尚未建立（重连/刷新后公钥交换未完成），暂存待解密
              if (pendingDecryptQueue.length < 50) pendingDecryptQueue.push(msg);
              return;
            }
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
    if (shouldReconnect && !gameOver) {
      setStatus('连接断开，正在重连...');
      setTimeout(() => {
        if (shouldReconnect && !gameOver) connect();
      }, 2000);
    }
  };

  ws.onerror = () => {};
}

/**
 * 请求再来一局：向服务端发送重赛请求并显示等待界面
 */
function requestRematch() {
  if (localMode) { localRematch(); return; }
  if (ws && ws.readyState === 1) {
    const gt = document.getElementById('rematchGameSelect').value;
    rematchRole = 'requester';
    ws.send(JSON.stringify({ type: 'rematchRequest', gameType: gt }));
    document.getElementById('resultOverlay').classList.add('hidden');
    document.getElementById('rematchHint').textContent = '';
    document.getElementById('rematchWaiting').classList.remove('hidden');
  }
}

/**
 * 接受对方的再来一局请求
 */
function acceptRematch() {
  if (ws && ws.readyState === 1) {
    rematchRole = 'accepter';
    // 被请求方无需选择棋种，服务端会采用请求方已选的棋种
    ws.send(JSON.stringify({ type: 'rematchAccept' }));
    document.getElementById('rematchModal').classList.add('hidden');
    hideRematchNotice();
    // 被请求方同意后等待服务端重启游戏（colorAssign 会清理复盘状态与 UI）
  }
}

/**
 * 拒绝对方的再来一局请求
 */
function declineRematch() {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'rematchDecline' }));
    document.getElementById('rematchModal').classList.add('hidden');
    hideRematchNotice();
    // 复盘模式下保持复盘界面；否则回到结果弹窗
    if (!replaying) document.getElementById('resultOverlay').classList.remove('hidden');
    rematchRole = null;
  }
}

/**
 * 取消自己发起的再来一局请求
 */
function cancelRematch() {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'rematchDecline' }));
    document.getElementById('rematchWaiting').classList.add('hidden');
    document.getElementById('resultOverlay').classList.remove('hidden');
    rematchRole = null;
  }
}

/**
 * 发送"请等一会"通知给对方
 */
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

/**
 * 显示"请等一会"通知弹窗，含"收到"确认按钮
 * @param {string} text - 通知消息内容
 */
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

/**
 * 复盘模式下的重赛请求顶部弹窗（非全屏，不遮挡复盘界面）
 * @param {string} text - 提示消息文本
 */
function showRematchNotice(text) {
  hideRematchNotice();
  var el = document.createElement('div');
  el.id = 'rematchNoticeOverlay';
  el.className = 'wait-notice-overlay';
  var span = document.createElement('span');
  span.textContent = text;
  var acceptBtn = document.createElement('button');
  acceptBtn.className = 'ack-btn';
  acceptBtn.textContent = '同意';
  acceptBtn.onclick = function() { acceptRematch(); };
  var declineBtn = document.createElement('button');
  declineBtn.className = 'ack-btn';
  declineBtn.style.background = '#2a3458';
  declineBtn.style.color = '#fff';
  declineBtn.textContent = '拒绝';
  declineBtn.onclick = function() { declineRematch(); };
  el.appendChild(span);
  el.appendChild(acceptBtn);
  el.appendChild(declineBtn);
  document.body.appendChild(el);
}

/**
 * 隐藏复盘模式下的重赛请求弹窗
 */
function hideRematchNotice() {
  var el = document.getElementById('rematchNoticeOverlay');
  if (el) el.remove();
}

// === 求和（和棋请求） ===
/**
 * 向对方发起和棋请求
 */
function sendDrawOffer() {
  if (gameOver) return;
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'drawOffer' }));
    document.getElementById('drawWaiting').classList.remove('hidden');
  }
}

/**
 * 接受对方的和棋请求
 */
function acceptDraw() {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'drawAccept' }));
  }
  document.getElementById('drawModal').classList.add('hidden');
}

/**
 * 拒绝对方的和棋请求
 */
function declineDraw() {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'drawDecline' }));
  }
  document.getElementById('drawModal').classList.add('hidden');
}

/**
 * 取消自己发起的和棋请求
 */
function cancelDraw() {
  // 取消等同于拒绝（对方若已收到请求，会收到 decline）
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'drawDecline' }));
  }
  document.getElementById('drawWaiting').classList.add('hidden');
}

/**
 * 复制房间链接到剪贴板（优先使用 Clipboard API，回退到 execCommand）
 * @param {string} [btnId] - 按钮元素的 ID
 */
function copyLink(btnId) {
  var url = location.href;
  var btn = document.getElementById(btnId || 'copyBtn');
  var showDone = function(ok) {
    if (!btn) return;
    btn.textContent = ok ? '已复制!' : '请从地址栏复制';
    setTimeout(function() { btn.textContent = '复制链接邀请好友'; }, 2000);
  };
  var fallback = function() {
    var ok = false;
    try {
      var ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ok = document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (e) { ok = false; }
    showDone(ok);
  };
  if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(function() { showDone(true); }).catch(function() { fallback(); });
  } else {
    fallback();
  }
}

// === 端到端加密（ECDH P-256 派生共享密钥 + AES-GCM 加密） ===
// 服务端只转发公钥与密文，无法解密聊天内容。重连时重新协商密钥。

/**
 * 将 ArrayBuffer 编码为 Base64 字符串
 * @param {ArrayBuffer} buf - 二进制数据
 * @returns {string} Base64 编码字符串
 */
function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/**
 * 将 Base64 字符串解码为 ArrayBuffer
 * @param {string} b64 - Base64 编码字符串
 * @returns {ArrayBuffer} 解码后的二进制数据
 */
function base64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/**
 * 初始化 ECDH 加密通道：生成密钥对并发送公钥
 * 重连时重置旧密钥，用新公钥重新协商
 */
async function initEncryption() {
  // 重连时重置：旧共享密钥已失效，需用新公钥重新协商
  sharedSecretKey = null;
  peerKeyBase64 = null;
  pendingDecryptQueue = [];
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

/**
 * 收到对方公钥后派生共享密钥，并处理排队消息
 * 仅在公钥变化时重新派生，避免互相重发形成死循环
 * @param {string} newKeyBase64 - 对方公钥的 Base64 编码
 */
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
    // 解密通道建立前暂存的消息（重连/刷新后公钥交换完成前的来消息）
    while (pendingDecryptQueue.length && sharedSecretKey) {
      const m = pendingDecryptQueue.shift();
      const plain = await decryptChat(m.iv, m.ct);
      if (plain !== null) appendChatMessage(m.color, plain, m.ts);
    }
  } catch (e) {
    sharedSecretKey = null;
  }
}

/**
 * 加密并发送聊天消息（本地立即显示，降低感知延迟）
 * @param {string} text - 消息文本
 * @param {boolean} [skipLocalDisplay] - 是否跳过本地显示（重发排队消息时避免重复显示）
 */
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

/**
 * 使用 AES-GCM 解密聊天消息
 * @param {string} ivBase64 - 初始化向量的 Base64 编码
 * @param {string} ctBase64 - 密文的 Base64 编码
 * @returns {Promise<string|null>} 解密后的明文，失败返回 null
 */
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

/**
 * 初始化聊天面板：绑定表单提交、折叠/展开、未读标记等事件
 */
function setupChat() {
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const box = document.getElementById('chatMessages');
  const header = document.getElementById('chatHeader');
  const panel = document.getElementById('chatPanel');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = (input.value || '').trim();
    if (!text) return;
    input.value = '';
    input.focus();
    sendChatEncrypted(text.slice(0, 500));
  });

  // 点击聊天头部折叠/展开
  header.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('collapsed');
    if (!collapsed) {
      // 展开时视为已读，清除未读红点并滚动到底部
      if (chatUnread > 0) { chatUnread = 0; updateChatBadge(); }
      chatFocused = true;
      box.scrollTop = box.scrollHeight;
    }
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

/**
 * 重建聊天 DOM（重连或首次渲染时从 chatHistory 恢复）
 */
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

/**
 * 创建聊天消息 DOM 元素（含玩家名和消息内容）
 * @param {string} color - 玩家颜色
 * @param {string} text - 消息文本
 * @returns {HTMLElement} 聊天消息元素
 */
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

/**
 * 创建系统消息 DOM 元素
 * @param {string} text - 系统消息文本
 * @returns {HTMLElement} 系统消息元素
 */
function createSystemMsgEl(text) {
  const msg = document.createElement('div');
  msg.className = 'chat-msg sys';
  msg.textContent = text;
  return msg;
}

/**
 * 追加聊天消息到历史记录和 DOM，自动滚动到底部并计未读
 * @param {string} color - 发送方颜色
 * @param {string} text - 消息文本
 * @param {number} ts - 时间戳
 */
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

/**
 * 追加系统消息到聊天记录
 * @param {string} text - 系统消息文本
 */
function appendSystemMessage(text) {
  chatHistory.push({ sys: true, text });
  if (chatHistory.length > 200) chatHistory.shift();
  saveChatHistory();
  const box = document.getElementById('chatMessages');
  if (!box) return;
  box.appendChild(createSystemMsgEl(text));
  box.scrollTop = box.scrollHeight;
}

/**
 * 增加未读计数（仅在折叠状态或窗口未聚焦时计入）
 */
function incrementUnread() {
  // 折叠状态或窗口未聚焦时计入未读
  const panel = document.getElementById('chatPanel');
  const collapsed = panel && panel.classList.contains('collapsed');
  if (!collapsed && chatFocused && document.hasFocus && document.hasFocus()) return;
  chatUnread++;
  updateChatBadge();
}

/**
 * 更新聊天未读徽章显示
 */
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

/**
 * 更新对方在线/离线状态指示
 * @param {boolean} online - 是否在线
 */
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

    // 访问校验文件时返回指定内容
    if (url.pathname === '/a99c2705f068c610851a6aefbc835ba6.txt') {
      return new Response('fbe9523f4886cc22930efbe9523f4886cc22930e5b67003056036f049bdb', {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      });
    }

    const room = url.searchParams.get('room');
    const mode = url.searchParams.get('mode');
    // 无 room 参数且非当面对战 → 返回模式选择首页
    if (!room && mode !== 'local') {
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
