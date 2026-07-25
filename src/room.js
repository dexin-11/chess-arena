import * as Chess from './chess.js';

export class Room {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.gameType = null; // 'gomoku' | 'chess'，首次连接时确定
    this.board = Array.from({ length: 15 }, () => Array(15).fill(null));
    this.chessBoard = null;
    this.chessState = null;
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
      if (url.searchParams.get('game') === 'chess') gameTypeFromUrl = 'chess';
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
      const connectedColors = new Set();
      for (const [, c] of this.connections) {
        if (c.color) connectedColors.add(c.color);
      }

      let assignedColor = null;
      if (!connectedColors.has('black')) assignedColor = 'black';
      else if (!connectedColors.has('white')) assignedColor = 'white';

      if (assignedColor) {
        const conn = this.connections.get(wsId);
        conn.color = assignedColor;
        if (assignedColor === 'black') this.blackPlayer = wsId;
        else this.whitePlayer = wsId;

        this.sendMessage(conn.ws, {
          type: 'colorAssign',
          you: assignedColor,
          opponent: assignedColor === 'black' ? 'white' : 'black',
          gameType: this.gameType,
        });
        this.broadcastSync();
        this.broadcastStatus();

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
    const blackIdx = Math.random() < 0.5 ? 0 : 1;
    const blackId = ids[blackIdx];
    const whiteId = ids[1 - blackIdx];

    this.blackPlayer = blackId;
    this.whitePlayer = whiteId;

    for (const [id, conn] of this.connections) {
      conn.color = id === blackId ? 'black' : 'white';
      this.sendMessage(conn.ws, {
        type: 'colorAssign',
        you: conn.color,
        opponent: id === blackId ? 'white' : 'black',
        gameType: this.gameType,
      });
    }

    this.broadcastSync();
    this.broadcastStatus();
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

    if (this.checkWin(row, col, conn.color)) {
      this.gameOver = true;
      this.winner = conn.color;
      this.draw = false;
      this.broadcast({ type: 'gameOver', winner: conn.color, draw: false });
      this.broadcastSync();
    } else {
      this.currentTurn = this.currentTurn === 'black' ? 'white' : 'black';
      this.broadcastSync();
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
      this.broadcastSync();
      // 非将杀的将军：sync 之后发送 check 通知，客户端据此高亮被将军的王
      if (Chess.isInCheck(this.chessBoard, opponentColor)) {
        this.broadcast({ type: 'check', color: opponentColor });
      }
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

    this.broadcastStatus();
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
    return gt === 'chess' ? 'chess' : 'gomoku';
  }

  restartGame(newGameType) {
    this.gameType = this.normalizeGameType(newGameType);
    if (this.gameType === 'chess') {
      this.initChessState();
      this.currentTurn = 'white';
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
    const payload = {
      type: 'sync',
      gameType: this.gameType,
      board: this.gameType === 'chess' ? this.chessBoard : this.board,
      currentTurn: this.currentTurn,
      gameOver: this.gameOver,
      winner: this.winner,
      draw: this.draw,
    };
    if (this.gameType === 'chess') {
      payload.lastMove = this.lastMove;
      // 把规则状态一并下发，供客户端本地计算合法走法（避免每次选中棋子都 RTT）
      payload.chessState = this.chessState;
    }
    this.broadcast(payload);
  }

  broadcastStatus() {
    const status = {};
    for (const [, conn] of this.connections) {
      if (conn.color) {
        status[conn.color] = {
          latency: conn.latency,
          online: conn.online,
        };
      }
    }
    this.broadcast({ type: 'status', players: status });
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
