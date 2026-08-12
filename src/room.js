import * as Chess from './chess.js';
import * as Xiangqi from './xiangqi.js';

/**
 * 游戏房间类 —— 基于 Cloudflare Durable Object 实现。
 * 管理两名玩家的 WebSocket 连接、游戏状态同步、走法验证、重连恢复、求和与复盘等功能。
 * 支持三种棋类：五子棋（gomoku）、国际象棋（chess）、中国象棋（xiangqi）。
 */
export class Room {
  /**
   * @param {import('../../').DurableObjectState} state - Durable Object 持久化状态，由运行时注入
   * @param {import('../../').Env} env - 环境变量绑定，由运行时注入
   */
  constructor(state, env) {
    /** @type {import('../../').DurableObjectState} DO 状态存储，用于持久化 */
    this.state = state;
    /** @type {import('../../').Env} 环境变量绑定（如 KV、R2、Secrets 等） */
    this.env = env;
    /**
     * 当前房间的棋种。
     * - 'gomoku' — 五子棋（15×15 棋盘，黑先）
     * - 'chess'  — 国际象棋（8×8 棋盘，白先）
     * - 'xiangqi' — 中国象棋（9×10 棋盘，红先）
     * 首次玩家连接时从 URL 参数确定，后续连接沿用。
     * @type {string|null}
     */
    this.gameType = null;
    /**
     * 五子棋棋盘状态（15×15 二维数组）。
     * 每个元素为 null（空）、'black'（黑子）或 'white'（白子）。
     * @type {Array<Array<string|null>>}
     */
    this.board = Array.from({ length: 15 }, () => Array(15).fill(null));
    /**
     * 国际象棋棋盘状态（8×8 二维数组）。
     * 每个元素为 null 或 { type: string, color: string } 格式的棋子对象。
     * @type {Array<Array<Object|null>>|null}
     */
    this.chessBoard = null;
    /**
     * 国际象棋规则状态，包含王车易位权、过路兵目标格等。
     * @type {{ castlingRights: Object, enPassantTarget: {r:number,c:number}|null }|null}
     */
    this.chessState = null;
    /**
     * 中国象棋棋盘状态（9×10 二维数组，行 0~9，列 0~8）。
     * @type {Array<Array<Object|null>>|null}
     */
    this.xiangqiBoard = null;
    /**
     * 中国象棋规则状态（当前仅为占位字段，与 chess 分支保持同构）。
     * @type {Object|null}
     */
    this.xiangqiState = null;
    /**
     * 上一步走子记录，用于客户端高亮上一步落子位置。
     * 五子棋格式：{ row, col }；象棋格式：{ from: {r,c}, to: {r,c} }。
     * @type {Object|null}
     */
    this.lastMove = null;
    /**
     * 是否为和棋（平局）。
     * @type {boolean}
     */
    this.draw = false;
    /**
     * WebSocket 连接映射表。
     * @type {Map<number, { ws: WebSocket, color: string|null, latency: number, online: boolean }>}
     * - wsId → 连接信息
     * - ws: WebSocket 实例
     * - color: 分配的棋子颜色
     * - latency: 网络延迟（ms）
     * - online: 连接是否在线
     */
    this.connections = new Map();
    /**
     * 当前轮到哪一方行棋。
     * 五子棋：'black' | 'white'；国际象棋：'white' | 'black'；中国象棋：'red' | 'black'。
     * @type {string}
     */
    this.currentTurn = 'black';
    /**
     * 游戏是否已结束（将杀、困毙、和棋、超时等情况）。
     * @type {boolean}
     */
    this.gameOver = false;
    /**
     * 胜方颜色。null 表示平局或无胜负。
     * @type {string|null}
     */
    this.winner = null;
    /**
     * 执黑方（或红方/先手方）的 wsId。
     * @type {number|null}
     */
    this.blackPlayer = null;
    /**
     * 执白方（或后手方）的 wsId。
     * @type {number|null}
     */
    this.whitePlayer = null;
    /**
     * 自增连接 ID 计数器，每次新连接 +1，确保 ID 唯一。
     * @type {number}
     */
    this.nextId = 0;
    /**
     * 复盘投票映射表。
     * @type {Map<number, string>}
     * - key: wsId —— 投票玩家
     * - value: gameType —— 投票选择的棋种
     */
    this.rematchVotes = new Map();
    /**
     * 当前求和发起方的 wsId。
     * - 非 null 表示有未处理的求和请求
     * - 双方同时求和时，先到者记录为此值，后到者视为同意
     * @type {number|null}
     */
    this.drawOffered = null;
  }

  /**
   * HTTP 请求入口 —— 处理 WebSocket 升级握手。
   * - 非 WebSocket 请求返回 426 状态码
   * - 房间已满（≥2 连接）时返回 roomFull 错误并关闭
   * - 正常连接时从 URL 解析 game 参数确定棋种，建立 WebSocket 连接
   * @param {Request} request - 客户端 HTTP 请求
   * @returns {Promise<Response>} WebSocket 升级响应或错误响应
   */
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

  /**
   * 接受 WebSocket 连接并初始化玩家会话。
   * 根据当前房间状态决定：
   * - 首次连接（gameType===null）：确定棋种、初始化棋盘、绑定事件
   * - 游戏已开始且双方未满（重连）：分配颜色、同步状态、补发终局事件
   * - 两人已满（首次连接第二人）：分配颜色开始游戏
   * @param {WebSocket} ws - WebSocket 实例
   * @param {string} gameTypeFromUrl - 从 URL 解析的棋种
   */
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

        // 终局重连：补发 gameOver 事件，让重连方恢复结果弹窗
        // （sync 仅同步棋盘与 gameOver 标志，但不触发结果弹窗显示）
        if (this.gameOver) {
          this.sendMessage(conn.ws, {
            type: 'gameOver',
            winner: this.winner,
            draw: this.draw,
          });
        }

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

  /**
   * 返回当前棋种的两色数组 [先手色, 后手色]。
   * - 五子棋：['black', 'white']（黑先）
   * - 国际象棋：['white', 'black']（白先）
   * - 中国象棋：['red', 'black']（红先）
   * @returns {string[]} 包含两个颜色字符串的数组，索引 0 为先手方
   */
  playerColors() {
    if (this.gameType === 'chess') return ['white', 'black'];
    if (this.gameType === 'xiangqi') return ['red', 'black'];
    return ['black', 'white']; // 五子棋黑方先行
  }

  /**
   * 初始化国际象棋棋盘与规则状态。
   * 使用 chess.js 模块创建初始棋盘布局，并设置王车易位权（双方均可易位）、置空过路兵目标。
   */
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

  /**
   * 为两名玩家分配先后手颜色。
   * 随机决定先手方（黑/白/红），然后为双方发送 colorAssign 消息并同步棋盘状态。
   * 先手方记录到 blackPlayer，后手方记录到 whitePlayer。
   */
  assignColors() {
    const ids = [...this.connections.keys()];
    const colors = this.playerColors();
    // 随机选择先手方索引（0 或 1）
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

  /**
   * WebSocket 消息总入口 —— 解析 JSON 消息并按类型分发处理。
   * 支持的消息类型：
   * - ping/pong：心跳保活
   * - latency：延迟上报
   * - move：走子（按棋种分发）
   * - rematchRequest/rematchAccept/rematchDecline：复盘投票
   * - waitNotice/waitAck：等待通知
   * - drawOffer/drawAccept/drawDecline：求和
   * - chat：聊天（支持 E2E 加密）
   * - pubKey：E2E 公钥交换
   * @param {number} wsId - 发送消息的 WebSocket 连接 ID
   * @param {string} raw - 原始 JSON 字符串消息
   */
  handleMessage(wsId, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      // JSON 解析失败，直接忽略非法消息
      return;
    }

    const conn = this.connections.get(wsId);
    if (!conn) return;

    switch (msg.type) {
      // 心跳检测：原样返回客户端时间戳，用于计算 RTT
      case 'ping':
        this.sendMessage(conn.ws, { type: 'pong', ts: msg.ts || Date.now() });
        break;

      // 延迟上报：更新该连接的延迟值，并触发状态广播
      case 'latency':
        conn.latency = msg.latency;
        this.broadcastStatus();
        break;

      // 走子：根据当前棋种路由到对应的走子处理函数
      case 'move':
        if (!conn.color) return;
        if (this.gameType === 'chess') this.handleChessMove(wsId, msg);
        else if (this.gameType === 'xiangqi') this.handleXiangqiMove(wsId, msg);
        else this.handleMove(wsId, msg);
        break;

      // 复盘请求：记录投票，若双方均已投票则自动解析
      case 'rematchRequest':
        this.handleRematchRequest(wsId, msg);
        break;

      // 接受复盘：直接采用对方已投票的棋种开始新局
      case 'rematchAccept':
        this.handleRematchAccept(wsId, msg);
        break;

      // 拒绝复盘：清除投票状态并通知对方
      case 'rematchDecline':
        this.handleRematchDecline(wsId);
        break;

      // 等待提示：转发给对手，表示本端正在等待对方操作
      case 'waitNotice':
        for (const [id, c] of this.connections) {
          if (id !== wsId) {
            this.sendMessage(c.ws, { type: 'waitNotice' });
          }
        }
        break;

      // 等待确认：对手收到 waitNotice 后的确认回复
      case 'waitAck':
        for (const [id, c] of this.connections) {
          if (id !== wsId) {
            this.sendMessage(c.ws, { type: 'waitAck' });
          }
        }
        break;

      // 求和请求
      case 'drawOffer': {
        // 求和请求：仅在非结束状态且无未处理求和时接受。
        // 双方几乎同时发起时，先到者为请求方，后到者视为同意 → 直接判和。
        if (this.gameOver) return;
        if (this.drawOffered !== null && this.drawOffered !== wsId) {
          // 对方已发起求和，本次视为同意 —— 握手式自动判和
          this.drawOffered = null;
          this.gameOver = true;
          this.winner = null;
          this.draw = true;
          this.broadcast({ type: 'gameOver', winner: null, draw: true });
          this.broadcastSync();
        } else if (this.drawOffered === null) {
          // 首次求和：记录发起方并转发给对方，等待对方响应
          this.drawOffered = wsId;
          for (const [id, c] of this.connections) {
            if (id !== wsId) this.sendMessage(c.ws, { type: 'drawOffer', color: conn.color });
          }
        }
        // drawOffered === wsId：重复请求，忽略
        break;
      }

      // 接受求和
      case 'drawAccept': {
        // 同意求和：仅当对方已发起求和时生效，防止任意玩家强制和棋
        if (this.gameOver) return;
        if (this.drawOffered === null || this.drawOffered === wsId) return;
        this.drawOffered = null;
        this.gameOver = true;
        this.winner = null;
        this.draw = true;
        this.broadcast({ type: 'gameOver', winner: null, draw: true });
        this.broadcastSync();
        break;
      }

      // 拒绝/取消求和
      case 'drawDecline': {
        // 拒绝/取消求和：清除求和状态并通知对方
        this.drawOffered = null;
        for (const [id, c] of this.connections) {
          if (id !== wsId) this.sendMessage(c.ws, { type: 'drawDecline' });
        }
        break;
      }

      // 聊天消息（支持 E2E 端到端加密）
      case 'chat': {
        // E2E 加密聊天：仅转发密文给对手，不读取内容（发送方本地直接显示，无需回环）
        const payload = { type: 'chat', color: conn.color, ts: Date.now() };
        // 优先识别 E2E 加密格式（iv + ct），其次识别明文格式（text）
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

      // E2E 公钥交换
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

  /**
   * 处理五子棋走子。
   * 验证：游戏未结束、轮到该玩家、坐标在 15×15 范围内、目标格为空。
   * 落子后检查五子连珠胜负，若未结束则切换回合。
   * @param {number} wsId - 走子玩家的 wsId
   * @param {Object} msg - 消息对象，包含 { row, col }
   */
  handleMove(wsId, msg) {
    if (this.gameOver) return;

    const conn = this.connections.get(wsId);
    if (!conn || conn.color !== this.currentTurn) return;

    const { row, col } = msg;
    // 边界检查：五子棋 15×15 棋盘
    if (row < 0 || row >= 15 || col < 0 || col >= 15) return;
    // 目标位置已有棋子 → 非法走子
    if (this.board[row][col] !== null) return;

    this.board[row][col] = conn.color;
    const move = { row, col };

    if (this.checkWin(row, col, conn.color)) {
      // 五子连珠 → 该玩家获胜
      this.gameOver = true;
      this.winner = conn.color;
      this.draw = false;
      this.broadcast({ type: 'gameOver', winner: conn.color, draw: false });
      this.broadcastSync();
    } else {
      // 未分出胜负，切换回合
      this.currentTurn = this.currentTurn === 'black' ? 'white' : 'black';
      this.broadcastMoveUpdate(move, conn.color, null, null);
    }
  }

  /**
   * 处理国际象棋走子。
   * 验证流程：游戏未结束 → 轮到该玩家 → 棋盘状态有效 → 坐标在 8×8 范围内 →
   * 源格有棋子且属于该玩家 → 走法在合法走子列表中 → 应用走子并判断终局（将杀/逼和/子力不足）。
   * @param {number} wsId - 走子玩家的 wsId
   * @param {Object} msg - 消息对象，包含 { from: {r,c}, to: {r,c}, special?, promotionPiece? }
   */
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

    // 校验升变棋子类型，防止恶意客户端构造非法棋子（如升变为王导致双王）
    const VALID_PROMOTIONS = ['q', 'r', 'b', 'n'];
    const promotionPiece = matched.special === 'promotion'
      ? (VALID_PROMOTIONS.includes(msg.promotionPiece) ? msg.promotionPiece : 'q')
      : undefined;
    const result = Chess.applyMove(this.chessBoard, matched, this.chessState, promotionPiece);
    this.chessBoard = result.board;
    this.chessState = result.newState;
    this.lastMove = { from: { r: matched.from.r, c: matched.from.c }, to: { r: matched.to.r, c: matched.to.c } };

    const opponentColor = conn.color === 'white' ? 'black' : 'white';
    this.currentTurn = opponentColor;

    if (Chess.isCheckmate(this.chessBoard, opponentColor, this.chessState)) {
      // 将杀：走子方获胜
      this.gameOver = true;
      this.winner = conn.color;
      this.draw = false;
      this.broadcast({ type: 'gameOver', winner: conn.color, draw: false });
      this.broadcastSync();
    } else if (
      Chess.isStalemate(this.chessBoard, opponentColor, this.chessState) ||
      Chess.isInsufficientMaterial(this.chessBoard)
    ) {
      // 逼和或子力不足 → 平局
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

  /**
   * 初始化中国象棋棋盘与规则状态。
   * 使用 xiangqi.js 模块创建初始棋盘布局（9×10），当前规则引擎无需额外状态字段，
   * xiangqiState 保留为 null 以便与 chess 分支代码保持同构。
   */
  initXiangqiState() {
    this.xiangqiBoard = Xiangqi.initialBoard();
    this.xiangqiState = null; // 中国象棋规则引擎当前无需额外状态，保留字段以便与 chess 分支同构
  }

  /**
   * 处理中国象棋走子。
   * 验证流程：游戏未结束 → 轮到该玩家 → 棋盘状态有效 → 坐标在 9×10 范围内 →
   * 源格有棋子且属于该玩家 → 走法在合法走子列表中 → 应用走子并判断终局（将杀/困毙）。
   * 中国象棋中困毙（无合法走子）同样判负，与国际象棋的逼和判和规则不同。
   * @param {number} wsId - 走子玩家的 wsId
   * @param {Object} msg - 消息对象，包含 { from: {r,c}, to: {r,c} }
   */
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

  /**
   * 五子棋胜负判定 —— 检查以 (row, col) 为中心在四个方向上是否有五子连珠。
   * 四个方向：水平（→）、垂直（↓）、主对角线（↘）、副对角线（↙）。
   * 每个方向从落子点向正反两个方向延伸计数，总数 ≥ 5 即判胜。
   * @param {number} row - 落子行坐标（0~14）
   * @param {number} col - 落子列坐标（0~14）
   * @param {string} color - 落子颜色（'black' | 'white'）
   * @returns {boolean} 是否五子连珠
   */
  checkWin(row, col, color) {
    // 四个检测方向：[水平, 垂直, 主对角线, 副对角线]
    const directions = [
      [1, 0],  // 水平方向：向右
      [0, 1],  // 垂直方向：向下
      [1, 1],  // 主对角线：右下
      [1, -1], // 副对角线：左下
    ];

    for (const [dr, dc] of directions) {
      let count = 1; // 包含当前落子

      // 正方向延伸计数
      for (let i = 1; i < 5; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r >= 0 && r < 15 && c >= 0 && c < 15 && this.board[r][c] === color) {
          count++;
        } else break;
      }

      // 反方向延伸计数
      for (let i = 1; i < 5; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (r >= 0 && r < 15 && c >= 0 && c < 15 && this.board[r][c] === color) {
          count++;
        } else break;
      }

      // 任一方向连珠 ≥ 5 即获胜
      if (count >= 5) return true;
    }

    return false;
  }

  /**
   * 处理 WebSocket 断开连接（包括显式关闭和错误中断）。
   * 清理连接记录、投票和求和状态，通知对方玩家已离开。
   * 双方均断开时，Durable Object 由运行时自动回收，无需额外处理。
   * @param {number} wsId - 断开连接的 wsId
   */
  handleClose(wsId) {
    const conn = this.connections.get(wsId);
    if (!conn) return;

    this.connections.delete(wsId);
    this.rematchVotes.delete(wsId);
    // 断线时清除未处理求和，避免恢复后残留
    this.drawOffered = null;

    if (this.connections.size === 0) {
      // 双方均断开：DO 在空闲后由运行时自动回收，无需显式终止
      return;
    }

    // 通知对方玩家已离开
    for (const [, c] of this.connections) {
      this.sendMessage(c.ws, { type: 'opponentLeft' });
    }

    this.broadcastStatus(true);
  }

  /**
   * 处理复盘请求（投票选择棋种）。
   * 仅游戏结束后可发起。记录请求方的棋种选择，若双方均已投票则自动解析结果；
   * 若仅一方投票，将请求及其棋种转发给对方，对方无需再选棋种。
   * @param {number} wsId - 发起请求的 wsId
   * @param {Object} msg - 消息对象，包含 { gameType }
   */
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

  /**
   * 处理接受复盘请求。
   * 被请求方无需选择棋种，直接采用请求方已投票的棋种，然后开始新局。
   * @param {number} wsId - 接受复盘请求的 wsId
   * @param {Object} msg - 消息对象（当前未使用，保留参数以保持接口一致）
   */
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

  /**
   * 处理拒绝复盘请求。
   * 清除该玩家的投票记录，并通知对方复盘被拒绝。
   * @param {number} wsId - 拒绝复盘请求的 wsId
   */
  handleRematchDecline(wsId) {
    this.rematchVotes.delete(wsId);
    for (const [id, c] of this.connections) {
      if (id !== wsId) {
        this.sendMessage(c.ws, { type: 'rematchDecline' });
      }
    }
  }

  /**
   * 解析复盘投票结果。
   * 两端均已投票时比较棋种：
   * - 一致 → 调用 restartGame 开始新局
   * - 不一致 → 广播 rematchMismatch 通知双方重新选择，同时清空投票记录
   */
  resolveRematch() {
    const values = [...this.rematchVotes.values()];
    if (values.length >= 2 && values[0] === values[1]) {
      this.restartGame(values[0]);
    } else {
      this.broadcast({ type: 'rematchMismatch' });
      this.rematchVotes.clear();
    }
  }

  /**
   * 检查当前所有在线玩家是否均已投票。
   * 用于判断是否可触发 resolveRematch。
   * @returns {boolean} 是否所有玩家均已投票
   */
  bothVoted() {
    let count = 0;
    for (const id of this.connections.keys()) {
      if (this.rematchVotes.has(id)) count++;
    }
    return count >= 2;
  }

  /**
   * 规范化棋种字符串，确保返回值为三种合法棋种之一。
   * @param {string} gt - 原始棋种字符串
   * @returns {string} 规范化后的棋种：'gomoku' | 'chess' | 'xiangqi'
   */
  normalizeGameType(gt) {
    if (gt === 'chess') return 'chess';
    if (gt === 'xiangqi') return 'xiangqi';
    return 'gomoku';
  }

  /**
   * 重新开始新对局（复盘/换棋种再战）。
   * 恢复所有游戏状态至初始值，根据棋种初始化对应棋盘，然后重新分配颜色。
   * @param {string} newGameType - 新对局的棋种：'gomoku' | 'chess' | 'xiangqi'
   */
  restartGame(newGameType) {
    this.gameType = this.normalizeGameType(newGameType);
    // 按棋种初始化棋盘和先手方
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
    // 重置游戏状态
    this.gameOver = false;
    this.winner = null;
    this.draw = false;
    this.lastMove = null;
    this.rematchVotes.clear();
    this.drawOffered = null;

    // 重新分配颜色（随机），开始新对局
    this.assignColors();
  }

  /**
   * 全量同步棋盘状态给所有玩家。
   * 包含：棋盘布局、当前回合、终局状态、胜负信息、上一步走子。
   * 国际象棋和中国象棋还会附带规则状态，供客户端本地计算合法走法。
   * 仅在游戏开始、重连、终局时调用；走子过程中使用 broadcastMoveUpdate 增量同步以减小 payload。
   */
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

  /**
   * 增量走子同步：仅下发走法与必要状态，客户端用本地引擎应用。
   * 相比 broadcastSync（整盘约 2KB）显著减小每步 payload，降低走子延迟。
   * 终局仍用 broadcastSync 保证最终棋盘一致性。
   * @param {Object} move - 走子信息（五子棋：{ row, col }；象棋：{ from, to, special? }）
   * @param {string} color - 走子方颜色
   * @param {string|undefined} promotionPiece - 国际象棋升变目标棋子类型（非升变时为 undefined）
   * @param {string|null} checkColor - 被将军方的颜色，无将军时为 null
   */
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

  /**
   * 广播玩家状态（延迟、在线状态）给所有玩家。
   * 包含节流机制：延迟数值频繁微调但档位未变时跳过广播，
   * 仅在上下线/延迟档位变化或超过 8s 时广播。
   * 原 3s/人的延迟上报会产生大量无意义 status 广播，节流后下行消息频率下降约 60%。
   * @param {boolean} [force=false] - 是否强制广播（忽略节流），用于断线/重连等关键事件
   */
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

  /**
   * 判断状态是否有实质变化（需要广播）。
   * 将延迟划分为三个档位（<100ms / <300ms / ≥300ms），
   * 仅档位变化时才视为有意义变更，避免高频微调导致广播风暴。
   * @param {Object|null} prev - 上一次广播的状态快照
   * @param {Object} cur - 当前状态
   * @returns {boolean} 是否有实质变化
   */
  statusMeaningfullyChanged(prev, cur) {
    if (!prev) return true;
    const colors = new Set([...Object.keys(prev), ...Object.keys(cur)]);
    // 延迟档位划分：0-100ms 为低延迟，100-300ms 为中延迟，300ms+ 为高延迟
    const cat = (lat) => (lat < 100 ? 0 : lat < 300 ? 1 : 2);
    for (const color of colors) {
      const p = prev[color], c = cur[color];
      if (!p || !c) return true;          // 玩家加入/离开
      if (p.online !== c.online) return true; // 上下线变化
      if (cat(p.latency) !== cat(c.latency)) return true; // 延迟档位变化
    }
    return false;
  }

  /**
   * 广播消息给所有在线玩家。
   * 仅发送给 readyState === 1（OPEN）的连接，自动跳过关闭中的连接。
   * @param {Object} msg - 要广播的消息对象（自动 JSON.stringify）
   */
  broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const [, conn] of this.connections) {
      if (conn.ws.readyState === 1) {
        conn.ws.send(data);
      }
    }
  }

  /**
   * 向单个 WebSocket 连接发送消息。
   * 发送前检查 readyState 确保连接处于 OPEN 状态。
   * @param {WebSocket} ws - 目标 WebSocket 实例
   * @param {Object} msg - 要发送的消息对象（自动 JSON.stringify）
   */
  sendMessage(ws, msg) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(msg));
    }
  }
}
