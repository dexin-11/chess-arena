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

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  acceptWebSocket(ws) {
    ws.accept();

    const wsId = this.nextId++;
    this.connections.set(wsId, { ws, color: null, latency: 0, online: true });

    ws.addEventListener('message', (event) => {
      this.handleMessage(wsId, event.data);
    });

    ws.addEventListener('close', () => {
      this.handleClose(wsId);
    });

    ws.addEventListener('error', () => {
      this.handleClose(wsId);
    });

    if (this.connections.size === 2 && !this.blackPlayer) {
      this.assignColors();
    }
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

      case 'waitNotice':
        for (const [id, c] of this.connections) {
          if (id !== wsId) {
            this.sendMessage(c.ws, { type: 'waitNotice' });
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

  handleRematchRequest(wsId) {
    if (!this.gameOver) return;
    const conn = this.connections.get(wsId);
    if (!conn) return;

    this.rematchVotes.add(wsId);

    if (this.rematchVotes.size >= 2) {
      this.restartGame();
      return;
    }

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
