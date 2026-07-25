export class Room {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.board = Array.from({ length: 15 }, () => Array(15).fill(null));
    this.connections = new Map(); // wsId -> { ws, color }
    this.currentTurn = 'black';
    this.gameOver = false;
    this.winner = null;
    this.blackPlayer = null;
    this.whitePlayer = null;
    this.nextId = 0;
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    if (this.connections.size >= 2) {
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      this.acceptWebSocket(server);
      // Send room full message after accept
      setTimeout(() => {
        this.sendMessage(server, { type: 'roomFull' });
        server.close(4001, 'Room is full');
      }, 0);
      return new Response(null, { status: 101, webSocket: client });
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  acceptWebSocket(ws) {
    const wsId = this.nextId++;
    this.connections.set(wsId, { ws, color: null });

    ws.addEventListener('message', (event) => {
      this.handleMessage(wsId, event.data);
    });

    ws.addEventListener('close', () => {
      this.handleClose(wsId);
    });

    ws.addEventListener('error', () => {
      this.handleClose(wsId);
    });

    // If this is the second player, assign colors
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
  }

  handleMessage(wsId, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    const conn = this.connections.get(wsId);
    if (!conn || !conn.color) return;

    if (msg.type === 'move') {
      this.handleMove(wsId, msg);
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
      [1, 0],  // horizontal
      [0, 1],  // vertical
      [1, 1],  // diagonal
      [1, -1], // anti-diagonal
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

    if (this.connections.size === 0) {
      this.state.abort();
      return;
    }

    // Notify remaining player
    for (const [, c] of this.connections) {
      this.sendMessage(c.ws, { type: 'opponentLeft' });
    }
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
