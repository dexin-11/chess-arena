export class Room {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.board = Array.from({ length: 15 }, () => Array(15).fill(null));
    this.connections = new Map(); // wsId -> { ws, color, latency, online }
    this.currentTurn = 'black';
    this.gameOver = false;
    this.winner = null;
    this.blackPlayer = null;
    this.whitePlayer = null;
    this.nextId = 0;
    this.rematchVotes = new Set();
  }

  // 处理 WebSocket 升级请求
  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    // 使用 Hibernation API：让 DO 在空闲时可休眠，减少唤醒延迟
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    await this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  // WebSocket Hibernation API：连接建立时调用
  async webSocketConnect(ws) {
    ws.accept();

    if (this.connections.size >= 2) {
      ws.send(JSON.stringify({ type: 'roomFull' }));
      ws.close(4001, 'Room is full');
      return;
    }

    const wsId = this.nextId++;
    this.connections.set(wsId, { ws, color: null, latency: 0, online: true });
    ws.serializeAttachment({ wsId });

    // 第二个玩家加入时分配颜色
    if (this.connections.size === 2 && !this.blackPlayer) {
      this.assignColors();
    }
  }

  // WebSocket Hibernation API：收到消息时调用
  async webSocketMessage(ws, message) {
    const attachment = ws.deserializeAttachment();
    if (!attachment) return;
    const wsId = attachment.wsId;

    let msg;
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }

    const conn = this.connections.get(wsId);
    if (!conn) return;

    switch (msg.type) {
      case 'ping':
        this.sendMessage(ws, { type: 'pong', ts: msg.ts || Date.now() });
        break;

      case 'latency':
        conn.latency = msg.latency;
        this.broadcastStatus();
        break;

      case 'move':
        if (!conn.color) return;
        this.handleMove(wsId, msg);
        break;

      case 'rematchRequest':
        this.handleRematchRequest(wsId);
        break;

      case 'rematchAccept':
        this.handleRematchAccept(wsId);
        break;

      case 'rematchDecline':
        this.handleRematchDecline(wsId);
        break;
    }
  }

  // WebSocket Hibernation API：连接关闭时调用
  async webSocketClose(ws, code, reason) {
    const attachment = ws.deserializeAttachment();
    if (!attachment) return;
    this.handleClose(attachment.wsId);
  }

  // WebSocket Hibernation API：连接出错时调用
  async webSocketError(ws, error) {
    const attachment = ws.deserializeAttachment();
    if (!attachment) return;
    this.handleClose(attachment.wsId);
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
      });
    }

    this.broadcastSync();
    this.broadcastStatus();
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
      this.broadcast({ type: 'gameOver', winner: conn.color });
      this.broadcastSync();
    } else {
      this.currentTurn = this.currentTurn === 'black' ? 'white' : 'black';
      this.broadcastSync();
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

  // 处理再来一局请求
  handleRematchRequest(wsId) {
    if (!this.gameOver) return;
    const conn = this.connections.get(wsId);
    if (!conn) return;

    this.rematchVotes.add(wsId);

    // 如果两位玩家都请求，直接重开
    if (this.rematchVotes.size >= 2) {
      this.restartGame();
      return;
    }

    // 否则通知对方
    for (const [id, c] of this.connections) {
      if (id !== wsId) {
        this.sendMessage(c.ws, { type: 'rematchRequest' });
      }
    }
  }

  handleRematchAccept(wsId) {
    if (!this.gameOver) return;
    const conn = this.connections.get(wsId);
    if (!conn) return;

    this.rematchVotes.add(wsId);

    if (this.rematchVotes.size >= 2) {
      this.restartGame();
    }
  }

  handleRematchDecline(wsId) {
    this.rematchVotes.delete(wsId);
    // 通知对方拒绝
    for (const [id, c] of this.connections) {
      if (id !== wsId) {
        this.sendMessage(c.ws, { type: 'rematchDecline' });
      }
    }
  }

  restartGame() {
    this.board = Array.from({ length: 15 }, () => Array(15).fill(null));
    this.currentTurn = 'black';
    this.gameOver = false;
    this.winner = null;
    this.rematchVotes.clear();

    // 重新随机分配颜色
    this.assignColors();
  }

  broadcastSync() {
    this.broadcast({
      type: 'sync',
      board: this.board,
      currentTurn: this.currentTurn,
      gameOver: this.gameOver,
      winner: this.winner,
    });
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
