export class Room {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.board = Array.from({ length: 15 }, () => Array(15).fill(null));
    this.currentTurn = 'black';
    this.gameOver = false;
    this.winner = null;
    this.blackPlayer = null;
    this.whitePlayer = null;
    this.rematchVotes = new Set();
    // Hibernation 模式下不用实例变量存连接，改用 state.getWebSockets()
  }

  // 获取所有活跃 WebSocket 连接
  getConnections() {
    return this.state.getWebSockets();
  }

  // 处理 WebSocket 升级请求
  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const conns = this.getConnections();

    if (conns.length >= 2) {
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      server.accept();
      server.send(JSON.stringify({ type: 'roomFull' }));
      server.close(4001, 'Room is full');
      return new Response(null, { status: 101, webSocket: client });
    }

    // 使用 Hibernation API：让 DO 在空闲时可休眠，减少唤醒延迟
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    server.serializeAttachment({ color: null, latency: 0, online: true });
    await this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  // WebSocket Hibernation API：连接建立时调用
  async webSocketConnect(ws) {
    const conns = this.getConnections();
    // 第二个玩家加入时分配颜色
    if (conns.length === 2 && !this.blackPlayer) {
      this.assignColors();
    }
  }

  // WebSocket Hibernation API：收到消息时调用
  async webSocketMessage(ws, message) {
    let msg;
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }

    const attachment = ws.deserializeAttachment() || {};

    switch (msg.type) {
      case 'ping':
        this.sendMessage(ws, { type: 'pong', ts: msg.ts || Date.now() });
        break;

      case 'latency':
        attachment.latency = msg.latency;
        ws.serializeAttachment(attachment);
        this.broadcastStatus();
        break;

      case 'move':
        if (!attachment.color) return;
        this.handleMove(ws, attachment, msg);
        break;

      case 'rematchRequest':
        this.handleRematchRequest(ws);
        break;

      case 'rematchAccept':
        this.handleRematchAccept(ws);
        break;

      case 'rematchDecline':
        this.handleRematchDecline(ws);
        break;
    }
  }

  // WebSocket Hibernation API：连接关闭时调用
  async webSocketClose(ws, code, reason) {
    const conns = this.getConnections();
    if (conns.length === 0) {
      this.state.abort();
      return;
    }
    for (const c of conns) {
      if (c !== ws) {
        this.sendMessage(c, { type: 'opponentLeft' });
      }
    }
    this.broadcastStatus();
  }

  // WebSocket Hibernation API：连接出错时调用
  async webSocketError(ws, error) {
    const conns = this.getConnections();
    if (conns.length === 0) {
      this.state.abort();
      return;
    }
    for (const c of conns) {
      if (c !== ws) {
        this.sendMessage(c, { type: 'opponentLeft' });
      }
    }
    this.broadcastStatus();
  }

  assignColors() {
    const conns = this.getConnections();
    const blackIdx = Math.random() < 0.5 ? 0 : 1;
    const blackWs = conns[blackIdx];
    const whiteWs = conns[1 - blackIdx];

    this.blackPlayer = blackWs;
    this.whitePlayer = whiteWs;

    for (const ws of conns) {
      const color = ws === blackWs ? 'black' : 'white';
      const att = ws.deserializeAttachment() || {};
      att.color = color;
      ws.serializeAttachment(att);
      this.sendMessage(ws, {
        type: 'colorAssign',
        you: color,
        opponent: color === 'black' ? 'white' : 'black',
      });
    }

    this.broadcastSync();
    this.broadcastStatus();
  }

  handleMove(ws, attachment, msg) {
    if (this.gameOver) return;

    if (!attachment.color || attachment.color !== this.currentTurn) return;

    const { row, col } = msg;
    if (row < 0 || row >= 15 || col < 0 || col >= 15) return;
    if (this.board[row][col] !== null) return;

    this.board[row][col] = attachment.color;

    if (this.checkWin(row, col, attachment.color)) {
      this.gameOver = true;
      this.winner = attachment.color;
      this.broadcast({ type: 'gameOver', winner: attachment.color });
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

  // 处理再来一局请求
  handleRematchRequest(ws) {
    if (!this.gameOver) return;

    this.rematchVotes.add(ws);

    if (this.rematchVotes.size >= 2) {
      this.restartGame();
      return;
    }

    const conns = this.getConnections();
    for (const c of conns) {
      if (c !== ws) {
        this.sendMessage(c, { type: 'rematchRequest' });
      }
    }
  }

  handleRematchAccept(ws) {
    if (!this.gameOver) return;

    this.rematchVotes.add(ws);

    if (this.rematchVotes.size >= 2) {
      this.restartGame();
    }
  }

  handleRematchDecline(ws) {
    this.rematchVotes.delete(ws);
    const conns = this.getConnections();
    for (const c of conns) {
      if (c !== ws) {
        this.sendMessage(c, { type: 'rematchDecline' });
      }
    }
  }

  restartGame() {
    this.board = Array.from({ length: 15 }, () => Array(15).fill(null));
    this.currentTurn = 'black';
    this.gameOver = false;
    this.winner = null;
    this.rematchVotes.clear();

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
    const conns = this.getConnections();
    for (const ws of conns) {
      const att = ws.deserializeAttachment() || {};
      if (att.color) {
        status[att.color] = {
          latency: att.latency || 0,
          online: true,
        };
      }
    }
    this.broadcast({ type: 'status', players: status });
  }

  broadcast(msg) {
    const data = JSON.stringify(msg);
    const conns = this.getConnections();
    for (const ws of conns) {
      if (ws.readyState === 1) {
        ws.send(data);
      }
    }
  }

  sendMessage(ws, msg) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(msg));
    }
  }
}
