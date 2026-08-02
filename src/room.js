import * as Chess from './chess.js';
import * as Xiangqi from './xiangqi.js';

export class Room {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.gameType = null; // 'gomoku' | 'chess' | 'xiangqi'，首次连接时确定
    this.board = Array.from({ length: 15 }, () => Array(15).fill(null));
    this.chessBoard = null;
    this.chessState = null;
    this.xiangqiBoard = null;
    this.xiangqiState = null;
    this.lastMove = null;
    this.draw = false;
    this.connections = new Map(); // wsId -> { ws, color, latency, online }
    this.currentTurn = 'black';
    this.gameOver = false;
    this.winner = null;
    this.blackPlayer = null;
    this.whitePlayer = null;
    this.nextId = 0;
    this.rematchVotes = new Map(); // wsId -> gameType
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    if (this.connections.size >= 2) {
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      server.accept();
      server.send(JSON.stringify({ type: 'roomFull' }));
      server.close(4001, 'Room is full');
      return new Response(null, { status: 101, webSocket: client });
    }

    // 从 URL 读取 game 参数，仅在首次连接时用于确定房间棋种
    let gameTypeFromUrl = 'gomoku';
    try {
      const url = new URL(request.url);
      const g = url.searchParams.get('game');
      if (g === 'chess') gameTypeFromUrl = 'chess';
      else if (g === 'xiangqi') gameTypeFromUrl = 'xiangqi';
    } catch {
      // 忽略 URL 解析错误，使用默认值
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.acceptWebSocket(server, gameTypeFromUrl);
    return new Response(null, { status: 101, webSocket: client });
  }

  acceptWebSocket(ws, gameTypeFromUrl) {
    ws.accept();

    const wsId = this.nextId++;
    this.connections.set(wsId, { ws, color: null, latency: 0, online: true });

    // 首次连接确定房间棋种并初始化对应状态
    if (this.gameType === null) {
      this.gameType = gameTypeFromUrl || 'gomoku';
      if (this.gameType === 'chess') {
        this.initChessState();
        this.currentTurn = 'white'; // 国际象棋白方先行
      } else if (this.gameType === 'xiangqi') {
        this.initXiangqiState();
        this.currentTurn = 'red'; // 中国象棋红方先行
      }
    }

    ws.addEventListener('message', (event) => {
      this.handleMessage(wsId, event.data);
    });

    ws.addEventListener('close', () => {
      this.handleClose(wsId);
    });

    ws.addEventListener('error', () => {
      this.handleClose(wsId);
    });

    if (this.blackPlayer !== null) {
      // 游戏已开始，这是重连
      const colors = this.playerColors();
      const connectedColors = new Set();
      for (const [, c] of this.connections) {
        if (c.color) connectedColors.add(c.color);
      }

      let assignedColor = null;
      for (const color of colors) {
        if (!connectedColors.has(color)) { assignedColor = color; break; }
      }

      if (assignedColor) {
        const conn = this.connections.get(wsId);
        conn.color = assignedColor;
        if (assignedColor === colors[0]) this.blackPlayer = wsId;
        else this.whitePlayer = wsId;

        this.sendMessage(conn.ws, {
          type: 'colorAssign',
          you: assignedColor,
          opponent: assignedColor === colors[0] ? colors[1] : colors[0],
          gameType: this.gameType,
        });
        this.broadcastSync();
        this.broadcastStatus(true);

        // 通知对方重连
        for (const [id, c] of this.connections) {
          if (id !== wsId) {
            this.sendMessage(c.ws, { type: 'opponentRejoin' });
          }
        }
      }
    } else if (this.connections.size === 2) {
      this.assignColors();
    }
  }

  // 返回当前棋种的两色 [先手色, 后手色]。
  playerColors() {
    if (this.gameType === 'chess') return ['white', 'black'];
    if (this.gameType === 'xiangqi') return ['red', 'black'];
    return ['black', 'white']; // 五子棋黑方先行
  }

  initChessState() {
    this.chessBoard = Chess.initialBoard();
    this.chessState = {
      castlingRights: {
        white: { k: true, q: true },
        black: { k: true, q: true },
      },
      enPassantTarget: null,
    };
  }

  assignColors() {
    const ids = [...this.connections.keys()];
    const colors = this.playerColors();
    const firstIdx = Math.random() < 0.5 ? 0 : 1;
    const firstId = ids[firstIdx];
    const secondId = ids[1 - firstIdx];

    this.blackPlayer = firstId;
    this.whitePlayer = secondId;

    for (const [id, conn] of this.connections) {
      const isFirst = id === firstId;
      conn.color = isFirst ? colors[0] : colors[1];
      this.sendMessage(conn.ws, {
        type: 'colorAssign',
        you: conn.color,
        opponent: isFirst ? colors[1] : colors[0],
        gameType: this.gameType,
      });
    }

    this.broadcastSync();
    this.broadcastStatus(true);
  }

  handleMessage(wsId, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    const conn = this.connections.get(wsId);
    if (!conn) return;

    switch (msg.type) {
      case 'ping':
        this.sendMessage(conn.ws, { type: 'pong', ts: msg.ts || Date.now() });
        break;

      case 'latency':
        conn.latency = msg.latency;
        this.broadcastStatus();
        break;

      case 'move':
        if (!conn.color) return;
        if (this.gameType === 'chess') this.handleChessMove(wsId, msg);
        else if (this.gameType === 'xiangqi') this.handleXiangqiMove(wsId, msg);
        else this.handleMove(wsId, msg);
        break;

      case 'rematchRequest':
        this.handleRematchRequest(wsId, msg);
        break;

      case 'rematchAccept':
        this.handleRematchAccept(wsId, msg);
        break;

      case 'rematchDecline':
        this.handleRematchDecline(wsId);
        break;

      case 'waitNotice':
        for (const [id, c] of this.connections) {
          if (id !== wsId) {
            this.sendMessage(c.ws, { type: 'waitNotice' });
          }
        }
        break;

      case 'waitAck':
        for (const [id, c] of this.connections) {
          if (id !== wsId) {
            this.sendMessage(c.ws, { type: 'waitAck' });
          }
        }
        break;

      case 'chat': {
        // E2E 加密聊天：仅转发密文给对手，不读取内容（发送方本地直接显示，无需回环）
        const payload = { type: 'chat', color: conn.color, ts: Date.now() };
        if (typeof msg.iv === 'string' && typeof msg.ct === 'string') {
          payload.iv = msg.iv.slice(0, 100);
          payload.ct = msg.ct.slice(0, 3000);
        } else if (typeof msg.text === 'string') {
          payload.text = msg.text.slice(0, 500).trim();
          if (!payload.text) return;
        } else {
          return;
        }
        for (const [id, c] of this.connections) {
          if (id !== wsId) this.sendMessage(c.ws, payload);
        }
        break;
      }

      case 'pubKey': {
        // E2E 密钥交换：将公钥转发给对方（服务端不存储，不接触会话密钥）
        if (typeof msg.key !== 'string') return;
        for (const [id, c] of this.connections) {
          if (id !== wsId) {
            this.sendMessage(c.ws, { type: 'pubKey', key: msg.key });
          }
        }
        break;
      }
    }
  }

  handleMove(wsId, msg) {
    if (this.gameOver) return;

    const conn = this.connections.get(wsId);
    if (!conn || conn.color !== this.currentTurn) return;

    const { row, col } = msg;
    if (row < 0 || row >= 15 || col < 0 || col >= 15) return;
    if (this.board[row][col] !== null) return;

    this.board[row][col] = conn.color;
    const move = { row, col };

    if (this.checkWin(row, col, conn.color)) {
      this.gameOver = true;
      this.winner = conn.color;
      this.draw = false;
      this.broadcast({ type: 'gameOver', winner: conn.color, draw: false });
      this.broadcastSync();
    } else {
      this.currentTurn = this.currentTurn === 'black' ? 'white' : 'black';
      this.broadcastMoveUpdate(move, conn.color, null, null);
    }
  }

  handleChessMove(wsId, msg) {
    if (this.gameOver) return;

    const conn = this.connections.get(wsId);
    if (!conn || conn.color !== this.currentTurn) return;
    if (!this.chessBoard || !this.chessState) return;

    const from = msg.from, to = msg.to;
    if (!from || !to) return;
    if (!Number.isInteger(from.r) || !Number.isInteger(from.c) ||
        !Number.isInteger(to.r) || !Number.isInteger(to.c)) return;
    if (from.r < 0 || from.r > 7 || from.c < 0 || from.c > 7 ||
        to.r < 0 || to.r > 7 || to.c < 0 || to.c > 7) return;

    const piece = this.chessBoard[from.r][from.c];
    if (!piece || piece.color !== conn.color) return;

    const legalMoves = Chess.getLegalMoves(this.chessBoard, from.r, from.c, this.chessState);

    // 先按 from/to/special 精确匹配；找不到再按 from/to 兜底（客户端可能省略 special）
    let matched = legalMoves.find(
      (m) =>
        m.from.r === from.r && m.from.c === from.c &&
        m.to.r === to.r && m.to.c === to.c &&
        (m.special || null) === (msg.special || null)
    );
    if (!matched) {
      matched = legalMoves.find(
        (m) =>
          m.from.r === from.r && m.from.c === from.c &&
          m.to.r === to.r && m.to.c === to.c
      );
    }
    if (!matched) return;

    const promotionPiece = matched.special === 'promotion' ? (msg.promotionPiece || 'q') : undefined;
    const result = Chess.applyMove(this.chessBoard, matched, this.chessState, promotionPiece);
    this.chessBoard = result.board;
    this.chessState = result.newState;
    this.lastMove = { from: { r: matched.from.r, c: matched.from.c }, to: { r: matched.to.r, c: matched.to.c } };

    const opponentColor = conn.color === 'white' ? 'black' : 'white';
    this.currentTurn = opponentColor;

    if (Chess.isCheckmate(this.chessBoard, opponentColor, this.chessState)) {
      this.gameOver = true;
      this.winner = conn.color;
      this.draw = false;
      this.broadcast({ type: 'gameOver', winner: conn.color, draw: false });
      this.broadcastSync();
    } else if (
      Chess.isStalemate(this.chessBoard, opponentColor, this.chessState) ||
      Chess.isInsufficientMaterial(this.chessBoard)
    ) {
      this.gameOver = true;
      this.winner = null;
      this.draw = true;
      this.broadcast({ type: 'gameOver', winner: null, draw: true });
      this.broadcastSync();
    } else {
      // 增量同步：仅下发走子与状态，客户端本地应用（payload 远小于整盘 sync）
      const checkColor = Chess.isInCheck(this.chessBoard, opponentColor) ? opponentColor : null;
      this.broadcastMoveUpdate(matched, conn.color, promotionPiece, checkColor);
    }
  }

  initXiangqiState() {
    this.xiangqiBoard = Xiangqi.initialBoard();
    this.xiangqiState = null; // 中国象棋规则引擎当前无需额外状态，保留字段以便与 chess 分支同构
  }

  handleXiangqiMove(wsId, msg) {
    if (this.gameOver) return;

    const conn = this.connections.get(wsId);
    if (!conn || conn.color !== this.currentTurn) return;
    if (!this.xiangqiBoard) return;

    const from = msg.from, to = msg.to;
    if (!from || !to) return;
    if (!Number.isInteger(from.r) || !Number.isInteger(from.c) ||
        !Number.isInteger(to.r) || !Number.isInteger(to.c)) return;
    if (from.r < 0 || from.r > 9 || from.c < 0 || from.c > 8 ||
        to.r < 0 || to.r > 9 || to.c < 0 || to.c > 8) return;

    const piece = this.xiangqiBoard[from.r][from.c];
    if (!piece || piece.color !== conn.color) return;

    const legalMoves = Xiangqi.getLegalMoves(this.xiangqiBoard, from.r, from.c, this.xiangqiState);
    const matched = legalMoves.find(
      (m) =>
        m.from.r === from.r && m.from.c === from.c &&
        m.to.r === to.r && m.to.c === to.c
    );
    if (!matched) return;

    const result = Xiangqi.applyMove(this.xiangqiBoard, matched, this.xiangqiState);
    this.xiangqiBoard = result.board;
    this.xiangqiState = result.newState;
    this.lastMove = { from: { r: matched.from.r, c: matched.from.c }, to: { r: matched.to.r, c: matched.to.c } };

    const opponentColor = conn.color === 'red' ? 'black' : 'red';
    this.currentTurn = opponentColor;

    if (Xiangqi.isCheckmate(this.xiangqiBoard, opponentColor, this.xiangqiState)) {
      this.gameOver = true;
      this.winner = conn.color;
      this.draw = false;
      this.broadcast({ type: 'gameOver', winner: conn.color, draw: false });
      this.broadcastSync();
    } else if (Xiangqi.isStalemate(this.xiangqiBoard, opponentColor, this.xiangqiState)) {
      // 困毙判负（中国象棋规则）
      this.gameOver = true;
      this.winner = conn.color;
      this.draw = false;
      this.broadcast({ type: 'gameOver', winner: conn.color, draw: false });
      this.broadcastSync();
    } else {
      const checkColor = Xiangqi.isInCheck(this.xiangqiBoard, opponentColor) ? opponentColor : null;
      this.broadcastMoveUpdate(matched, conn.color, null, checkColor);
    }
  }

  checkWin(row, col, color) {
    const directions = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];

    for (const [dr, dc] of directions) {
      let count = 1;

      for (let i = 1; i < 5; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r >= 0 && r < 15 && c >= 0 && c < 15 && this.board[r][c] === color) {
          count++;
        } else break;
      }

      for (let i = 1; i < 5; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (r >= 0 && r < 15 && c >= 0 && c < 15 && this.board[r][c] === color) {
          count++;
        } else break;
      }

      if (count >= 5) return true;
    }

    return false;
  }

  handleClose(wsId) {
    const conn = this.connections.get(wsId);
    if (!conn) return;

    this.connections.delete(wsId);
    this.rematchVotes.delete(wsId);

    if (this.connections.size === 0) {
      this.state.abort();
      return;
    }

    for (const [, c] of this.connections) {
      this.sendMessage(c.ws, { type: 'opponentLeft' });
    }

    this.broadcastStatus(true);
  }

  handleRematchRequest(wsId, msg) {
    if (!this.gameOver) return;
    const conn = this.connections.get(wsId);
    if (!conn) return;

    const gameType = this.normalizeGameType(msg && msg.gameType);
    this.rematchVotes.set(wsId, gameType);

    // 双方几乎同时点 request：比较棋种，一致就开新局，不一致提示重选
    if (this.bothVoted()) {
      this.resolveRematch();
      return;
    }

    // 仅一方投票：通知对方，带上请求方选择的棋种，对方无需再选
    for (const [id, c] of this.connections) {
      if (id !== wsId) {
        this.sendMessage(c.ws, { type: 'rematchRequest', gameType: gameType });
      }
    }
  }

  handleRematchAccept(wsId, msg) {
    if (!this.gameOver) return;
    const conn = this.connections.get(wsId);
    if (!conn) return;

    // 被请求方无需选棋种：采用请求方已投票的棋种
    let otherGameType = null;
    for (const [id, gt] of this.rematchVotes) {
      if (id !== wsId) {
        otherGameType = gt;
        break;
      }
    }
    if (!otherGameType) return; // 对方尚未申请，忽略

    this.rematchVotes.set(wsId, otherGameType);
    this.restartGame(otherGameType);
  }

  handleRematchDecline(wsId) {
    this.rematchVotes.delete(wsId);
    for (const [id, c] of this.connections) {
      if (id !== wsId) {
        this.sendMessage(c.ws, { type: 'rematchDecline' });
      }
    }
  }

  // 两端均已投票时比较棋种：一致则开新局，不一致则通知双方重选
  resolveRematch() {
    const values = [...this.rematchVotes.values()];
    if (values.length >= 2 && values[0] === values[1]) {
      this.restartGame(values[0]);
    } else {
      this.broadcast({ type: 'rematchMismatch' });
      this.rematchVotes.clear();
    }
  }

  bothVoted() {
    let count = 0;
    for (const id of this.connections.keys()) {
      if (this.rematchVotes.has(id)) count++;
    }
    return count >= 2;
  }

  normalizeGameType(gt) {
    if (gt === 'chess') return 'chess';
    if (gt === 'xiangqi') return 'xiangqi';
    return 'gomoku';
  }

  restartGame(newGameType) {
    this.gameType = this.normalizeGameType(newGameType);
    if (this.gameType === 'chess') {
      this.initChessState();
      this.currentTurn = 'white';
    } else if (this.gameType === 'xiangqi') {
      this.initXiangqiState();
      this.currentTurn = 'red';
    } else {
      this.board = Array.from({ length: 15 }, () => Array(15).fill(null));
      this.currentTurn = 'black';
    }
    this.gameOver = false;
    this.winner = null;
    this.draw = false;
    this.lastMove = null;
    this.rematchVotes.clear();

    this.assignColors();
  }

  broadcastSync() {
    let board;
    if (this.gameType === 'chess') board = this.chessBoard;
    else if (this.gameType === 'xiangqi') board = this.xiangqiBoard;
    else board = this.board;
    const payload = {
      type: 'sync',
      gameType: this.gameType,
      board,
      currentTurn: this.currentTurn,
      gameOver: this.gameOver,
      winner: this.winner,
      draw: this.draw,
    };
    if (this.gameType === 'chess') {
      payload.lastMove = this.lastMove;
      // 把规则状态一并下发，供客户端本地计算合法走法（避免每次选中棋子都 RTT）
      payload.chessState = this.chessState;
    } else if (this.gameType === 'xiangqi') {
      payload.lastMove = this.lastMove;
      payload.xiangqiState = this.xiangqiState;
    }
    this.broadcast(payload);
  }

  // 增量走子同步：仅下发走法与必要状态，客户端用本地引擎应用。
  // 相比 broadcastSync（整盘 ~2KB）显著减小每步 payload，降低走子延迟。
  // 终局仍用 broadcastSync 保证最终棋盘一致性。
  broadcastMoveUpdate(move, color, promotionPiece, checkColor) {
    const payload = {
      type: 'moveUpdate',
      gameType: this.gameType,
      color,
      currentTurn: this.currentTurn,
      gameOver: this.gameOver,
      winner: this.winner,
      draw: this.draw,
      lastMove: this.lastMove,
      checkColor: checkColor || null,
    };
    if (this.gameType === 'gomoku') {
      payload.move = { row: move.row, col: move.col };
    } else {
      payload.move = { from: move.from, to: move.to };
      if (move.special) payload.move.special = move.special;
      if (promotionPiece) payload.move.promotionPiece = promotionPiece;
    }
    if (this.gameType === 'chess') payload.chessState = this.chessState;
    else if (this.gameType === 'xiangqi') payload.xiangqiState = this.xiangqiState;
    this.broadcast(payload);
  }

  broadcastStatus(force) {
    const status = {};
    for (const [, conn] of this.connections) {
      if (conn.color) {
        status[conn.color] = {
          latency: conn.latency,
          online: conn.online,
        };
      }
    }
    // 节流：延迟数值频繁微调但档位未变时跳过，仅在上下线/延迟档位变化或超过 8s 时广播。
    // 原 3s/人的延迟上报会产生大量无意义 status 广播，节流后下行消息频率下降约 60%。
    if (!force) {
      const now = Date.now();
      const recent = this.lastStatusTs && (now - this.lastStatusTs) < 8000;
      if (recent && !this.statusMeaningfullyChanged(this.lastStatus, status)) return;
    }
    this.lastStatus = status;
    this.lastStatusTs = Date.now();
    this.broadcast({ type: 'status', players: status });
  }

  statusMeaningfullyChanged(prev, cur) {
    if (!prev) return true;
    const colors = new Set([...Object.keys(prev), ...Object.keys(cur)]);
    const cat = (lat) => (lat < 100 ? 0 : lat < 300 ? 1 : 2);
    for (const color of colors) {
      const p = prev[color], c = cur[color];
      if (!p || !c) return true;          // 玩家加入/离开
      if (p.online !== c.online) return true; // 上下线变化
      if (cat(p.latency) !== cat(c.latency)) return true; // 延迟档位变化
    }
    return false;
  }

  broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const [, conn] of this.connections) {
      if (conn.ws.readyState === 1) {
        conn.ws.send(data);
      }
    }
  }

  sendMessage(ws, msg) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(msg));
    }
  }
}
