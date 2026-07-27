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
    this.lastStatusSnapshot = null; // 心跳状态去重用
    this._stateLoadPromise = null; // 防止并发重复加载 storage
  }

  // 从 DO SQLite 加载持久化对局状态（断线重连/DO 重启后恢复棋盘）。
  // 幂等：并发调用共享同一个 Promise。
  ensureStateLoaded() {
    if (this._stateLoadPromise) return this._stateLoadPromise;
    this._stateLoadPromise = (async () => {
      try {
        const saved = await this.state.storage.get('game');
        if (saved && saved.gameType) {
          this.gameType = saved.gameType;
          this.board = saved.board || Array.from({ length: 15 }, () => Array(15).fill(null));
          this.chessBoard = saved.chessBoard || null;
          this.chessState = saved.chessState || null;
          this.xiangqiBoard = saved.xiangqiBoard || null;
          this.xiangqiState = saved.xiangqiState || null;
          this.lastMove = saved.lastMove || null;
          this.currentTurn = saved.currentTurn || 'black';
          this.gameOver = !!saved.gameOver;
          this.winner = saved.winner || null;
          this.draw = !!saved.draw;
        }
      } catch {
        // 忽略 storage 错误，回退到默认状态
      }
    })();
    return this._stateLoadPromise;
  }

  // 持久化当前对局状态到 DO SQLite。每步走棋后调用，fire-and-forget。
  async persistState() {
    if (!this.state || !this.state.storage) return;
    try {
      await this.state.storage.put('game', {
        gameType: this.gameType,
        board: this.board,
        chessBoard: this.chessBoard,
        chessState: this.chessState,
        xiangqiBoard: this.xiangqiBoard,
        xiangqiState: this.xiangqiState,
        lastMove: this.lastMove,
        currentTurn: this.currentTurn,
        gameOver: this.gameOver,
        winner: this.winner,
        draw: this.draw,
      });
    } catch {
      // 忽略持久化错误
    }
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
    // 先恢复持久化状态，再接受 WebSocket（断线重连/DO 重启后可继续对局）
    await this.ensureStateLoaded();
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
        this.maybeBroadcastStatus();
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
    this.lastMove = { row, col };

    if (this.checkWin(row, col, conn.color)) {
      this.gameOver = true;
      this.winner = conn.color;
      this.draw = false;
      this.broadcastMoveApplied({ row, col, color: conn.color, check: null });
      this.broadcast({ type: 'gameOver', winner: conn.color, draw: false });
      this.persistState();
    } else {
      this.currentTurn = this.currentTurn === 'black' ? 'white' : 'black';
      this.broadcastMoveApplied({ row, col, color: conn.color, check: null });
      this.persistState();
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

    // 单步走法校验：只校验提交的这一步，不重算全部合法走法
    const { legal, move } = Chess.isLegalMove(
      this.chessBoard, from.r, from.c, to.r, to.c, this.chessState, msg.special, msg.promotionPiece
    );
    if (!legal) return;

    const promotionPiece = move.special === 'promotion' ? (msg.promotionPiece || 'q') : undefined;
    const result = Chess.applyMove(this.chessBoard, move, this.chessState, promotionPiece);
    this.chessBoard = result.board;
    this.chessState = result.newState;
    this.lastMove = { from: { r: move.from.r, c: move.from.c }, to: { r: move.to.r, c: move.to.c } };

    const opponentColor = conn.color === 'white' ? 'black' : 'white';
    this.currentTurn = opponentColor;

    // 走完子后只算一次 isInCheck，复用给终局判定与将军通知
    const inCheck = Chess.isInCheck(this.chessBoard, opponentColor);

    if (inCheck && Chess.isCheckmate(this.chessBoard, opponentColor, this.chessState, inCheck)) {
      this.gameOver = true;
      this.winner = conn.color;
      this.draw = false;
      this.broadcastMoveApplied({
        from: move.from, to: move.to, captured: result.captured,
        special: move.special, promotionPiece, check: opponentColor,
      });
      this.broadcast({ type: 'gameOver', winner: conn.color, draw: false });
      this.persistState();
    } else if (
      (!inCheck && Chess.isStalemate(this.chessBoard, opponentColor, this.chessState, inCheck)) ||
      Chess.isInsufficientMaterial(this.chessBoard)
    ) {
      this.gameOver = true;
      this.winner = null;
      this.draw = true;
      this.broadcastMoveApplied({
        from: move.from, to: move.to, captured: result.captured,
        special: move.special, promotionPiece, check: null,
      });
      this.broadcast({ type: 'gameOver', winner: null, draw: true });
      this.persistState();
    } else {
      this.broadcastMoveApplied({
        from: move.from, to: move.to, captured: result.captured,
        special: move.special, promotionPiece, check: inCheck ? opponentColor : null,
      });
      this.persistState();
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

    // 单步走法校验：只校验提交的这一步，不重算全部合法走法
    const { legal, move } = Xiangqi.isLegalMove(
      this.xiangqiBoard, from.r, from.c, to.r, to.c, this.xiangqiState
    );
    if (!legal) return;

    const result = Xiangqi.applyMove(this.xiangqiBoard, move, this.xiangqiState);
    this.xiangqiBoard = result.board;
    this.xiangqiState = result.newState;
    this.lastMove = { from: { r: move.from.r, c: move.from.c }, to: { r: move.to.r, c: move.to.c } };

    const opponentColor = conn.color === 'red' ? 'black' : 'red';
    this.currentTurn = opponentColor;

    // 走完子后只算一次 isInCheck，复用给终局判定与将军通知
    const inCheck = Xiangqi.isInCheck(this.xiangqiBoard, opponentColor);

    if (inCheck && Xiangqi.isCheckmate(this.xiangqiBoard, opponentColor, this.xiangqiState, inCheck)) {
      this.gameOver = true;
      this.winner = conn.color;
      this.draw = false;
      this.broadcastMoveApplied({
        from: move.from, to: move.to, captured: result.captured, check: opponentColor,
      });
      this.broadcast({ type: 'gameOver', winner: conn.color, draw: false });
      this.persistState();
    } else if (!inCheck && Xiangqi.isStalemate(this.xiangqiBoard, opponentColor, this.xiangqiState, inCheck)) {
      // 困毙判负（中国象棋规则）
      this.gameOver = true;
      this.winner = conn.color;
      this.draw = false;
      this.broadcastMoveApplied({
        from: move.from, to: move.to, captured: result.captured, check: null,
      });
      this.broadcast({ type: 'gameOver', winner: conn.color, draw: false });
      this.persistState();
    } else {
      this.broadcastMoveApplied({
        from: move.from, to: move.to, captured: result.captured,
        check: inCheck ? opponentColor : null,
      });
      this.persistState();
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

    // 显式通知双方重赛已开始：立即隐藏 rematchWaiting/rematchModal 等弹窗，
    // 不依赖随后 colorAssign 触发 hideAllModals 的副作用（colorAssign 在网络抖动/DO 重启时可能延迟或丢失）。
    this.broadcast({ type: 'rematchStart' });

    this.assignColors();
    this.persistState();
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
    } else {
      payload.lastMove = this.lastMove;
    }
    this.broadcast(payload);
  }

  // 增量走法广播：客户端本地 applyMove + 局部 DOM 更新，避免每次走棋都全量 sync。
  // moveInfo 字段因棋种而异：
  //   chess/xiangqi: { from, to, captured, special?, promotionPiece?, check }
  //   gomoku:        { row, col, color, check }
  broadcastMoveApplied(moveInfo) {
    const payload = {
      type: 'moveApplied',
      gameType: this.gameType,
      turn: this.currentTurn,
      lastMove: this.lastMove,
      check: moveInfo.check || null,
      gameOver: this.gameOver,
      winner: this.winner,
      draw: this.draw,
    };
    if (this.gameType === 'chess') {
      payload.from = moveInfo.from;
      payload.to = moveInfo.to;
      payload.captured = moveInfo.captured;
      payload.special = moveInfo.special || null;
      payload.promotionPiece = moveInfo.promotionPiece || null;
      payload.chessState = this.chessState;
    } else if (this.gameType === 'xiangqi') {
      payload.from = moveInfo.from;
      payload.to = moveInfo.to;
      payload.captured = moveInfo.captured;
      payload.xiangqiState = this.xiangqiState;
    } else {
      payload.row = moveInfo.row;
      payload.col = moveInfo.col;
      payload.color = moveInfo.color;
    }
    this.broadcast(payload);
  }

  // 状态广播：连接/断开/分配颜色等关键事件强制广播；心跳上报仅在状态变化时广播。
  broadcastStatus() {
    const status = {};
    for (const [, conn] of this.connections) {
      if (conn.color) {
        status[conn.color] = { latency: conn.latency, online: conn.online };
      }
    }
    this.lastStatusSnapshot = this._snapshotStatus(status);
    this.broadcast({ type: 'status', players: status });
  }

  // 心跳去重：latency 按 10ms 桶量化后与上次快照比较，无变化则跳过广播。
  maybeBroadcastStatus() {
    const status = {};
    for (const [, conn] of this.connections) {
      if (conn.color) {
        status[conn.color] = { latency: conn.latency, online: conn.online };
      }
    }
    const snapshot = this._snapshotStatus(status);
    if (snapshot === this.lastStatusSnapshot) return;
    this.lastStatusSnapshot = snapshot;
    this.broadcast({ type: 'status', players: status });
  }

  // 用 10ms 桶量化的状态字符串做去重 key，避免微小抖动触发频繁广播。
  _snapshotStatus(status) {
    const rounded = {};
    for (const color of Object.keys(status)) {
      rounded[color] = {
        latency: Math.round((status[color].latency || 0) / 10) * 10,
        online: status[color].online,
      };
    }
    return JSON.stringify(rounded);
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
