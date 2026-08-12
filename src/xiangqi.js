// 中国象棋规则引擎 —— 纯函数实现，无副作用、无 I/O。
// 棋盘表示：10 行 × 9 列数组 board[row][col]，row 0 = 黑方底线（顶部），row 9 = 红方底线（底部）。
// 每格为 null（空）或 { type: 'k'|'a'|'e'|'h'|'r'|'c'|'p', color: 'red'|'black' }。
// 类型对照：k=将/帅，a=士/仕，e=象/相，h=马，r=车，c=炮，p=兵/卒。
// 可同时用于 Cloudflare Worker Durable Object 服务端与浏览器端。

/** 棋盘行数（10 行） */
const ROWS = 10;
/** 棋盘列数（9 列） */
const COLS = 9;

// 滑动方向常量（车/炮的横竖滑动）
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// 九宫格范围（行范围按颜色区分）
const PALACE = {
  red: { rowMin: 7, rowMax: 9, colMin: 3, colMax: 5 },
  black: { rowMin: 0, rowMax: 2, colMin: 3, colMax: 5 },
};

// 河界行：红方半场 row 5-9，黑方半场 row 0-4
const RIVER_ROW = 4; // 黑方半场最底行；红方半场最顶行为 5

/**
 * 判断坐标 (r, c) 是否在棋盘范围内
 * @param {number} r - 行号
 * @param {number} c - 列号
 * @returns {boolean}
 */
const inBounds = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

/**
 * 返回对方颜色
 * @param {'red'|'black'} color
 * @returns {'red'|'black'}
 */
const opposite = (color) => (color === 'red' ? 'black' : 'red');

/**
 * 判断某格是否在某色九宫格内
 * @param {number} r - 行号
 * @param {number} c - 列号
 * @param {'red'|'black'} color - 所属方
 * @returns {boolean}
 */
const inPalace = (r, c, color) => {
  const p = PALACE[color];
  return r >= p.rowMin && r <= p.rowMax && c >= p.colMin && c <= p.colMax;
};

/**
 * 判断某格是否在某色本方半场内
 * 红方半场为 row 5~9，黑方半场为 row 0~4
 * @param {number} r - 行号
 * @param {'red'|'black'} color
 * @returns {boolean}
 */
const inOwnHalf = (r, color) => (color === 'red' ? r >= 5 : r <= 4);

/**
 * 生成标准起始局面
 * 红方棋子位于 row 6~9（底部），黑方棋子位于 row 0~3（顶部）
 * 布局：底线(0/9)为车马象士将士象马车，次底线(2/7)为炮，第三线(3/6)为兵/卒
 * @returns {Array<Array<{type:string, color:string}|null>>} 初始棋盘
 */
export function initialBoard() {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const backRank = ['r', 'h', 'e', 'a', 'k', 'a', 'e', 'h', 'r'];
  for (let c = 0; c < COLS; c++) {
    board[0][c] = { type: backRank[c], color: 'black' };
    board[9][c] = { type: backRank[c], color: 'red' };
  }
  // 炮：黑方 row 2 col 1/7，红方 row 7 col 1/7
  board[2][1] = { type: 'c', color: 'black' };
  board[2][7] = { type: 'c', color: 'black' };
  board[7][1] = { type: 'c', color: 'red' };
  board[7][7] = { type: 'c', color: 'red' };
  // 兵/卒：黑方 row 3 col 0/2/4/6/8，红方 row 6 col 0/2/4/6/8
  for (let c = 0; c < COLS; c += 2) {
    board[3][c] = { type: 'p', color: 'black' };
    board[6][c] = { type: 'p', color: 'red' };
  }
  return board;
}

/**
 * 深拷贝棋盘
 * 每个棋格对象都会被复制为新对象，避免外部修改影响内部状态
 * @param {Array<Array<{type:string, color:string}|null>>} board - 原棋盘
 * @returns {Array<Array<{type:string, color:string}|null>>} 新棋盘
 */
export function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { type: cell.type, color: cell.color } : null)));
}

/**
 * 查找指定颜色将/帅的位置
 * 遍历整个棋盘找到第一个匹配的将/帅棋子
 * @param {Array<Array<{type:string, color:string}|null>>} board - 棋盘
 * @param {'red'|'black'} color - 要查找的颜色
 * @returns {{r:number, c:number}|null} 将/帅的位置，未找到则返回 null
 */
export function findGeneral(board, color) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) return { r, c };
    }
  }
  return null;
}

/**
 * 判断 byColor 方是否有棋子攻击目标格 (r, c)
 * 
 * 检测范围包括：
 * - 车/炮的横竖直线攻击（炮需跳恰好一子作为炮架）
 * - 马的日字攻击（含蹩马腿检测）
 * - 兵/卒的前进与左右攻击（过河后才有左右攻击能力）
 * 
 * 注意：飞将（将帅对脸）不在此处检测，由 isInCheck 单独处理
 * 
 * @param {Array<Array<{type:string, color:string}|null>>} board - 棋盘
 * @param {number} r - 目标行
 * @param {number} c - 目标列
 * @param {'red'|'black'} byColor - 攻击方颜色
 * @returns {boolean} 是否有子攻击该格
 */
export function isSquareAttacked(board, r, c, byColor) {
  // --- 车/炮的横竖直线扫描 ---
  // 从目标格 (r,c) 出发，沿四个方向（上下左右）逐格扫描
  // 车：第一个遇到的敌方棋子就是攻击者
  // 炮：需要先遇到一个棋子（炮架），再遇到第二个敌方棋子（炮本身）才构成攻击
  for (const [dr, dc] of ROOK_DIRS) {
    let nr = r + dr, nc = c + dc;
    let jumped = false; // 是否已遇到一个棋子（即炮架，仅炮需要）
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (!jumped) {
          // 第一个遇到的棋子：若为敌方车则直接攻击；否则标记为炮架继续扫描
          if (p.color === byColor && p.type === 'r') return true;
          jumped = true;
        } else {
          // 第二个遇到的棋子：若为敌方炮则跳炮架攻击
          if (p.color === byColor && p.type === 'c') return true;
          break; // 无论是否炮，第二个棋子之后不再继续扫描该方向
        }
      }
      nr += dr; nc += dc;
    }
  }

  // --- 马的日字攻击检测（含蹩马腿） ---
  // 枚举所有可能攻击 (r,c) 的马位置 (mr,mc)，以及对应的腿格位置
  // 马走日字，腿格为马与目标之间、靠近马一侧的直走一格
  // 例如：马从 (mr,mc) 走到 (r,c) = (mr-2, mc-1)，则腿格为 (mr-1, mc)
  // knightOffset = 马相对于目标 (r,c) 的偏移量
  // legOffset = 腿格相对于目标 (r,c) 的偏移量
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
    // 校验腿格是否为空
    const lr = r + legOffset[0], lc = c + legOffset[1];
    if (inBounds(lr, lc) && board[lr][lc]) continue; // 腿格有子，蹩马腿
    return true;
  }

  // --- 兵/卒的攻击检测 ---
  // 攻击方向取决于兵/卒所在行是否过河：
  // - 红兵（红色）向上走（row 递减），在 (r+1, c) 位置的兵可以向前攻击到 (r,c)
  // - 红兵过河后（r <= RIVER_ROW=4），还可以在 (r, c±1) 左右攻击
  // - 黑卒（黑色）向下走（row 递增），在 (r-1, c) 位置的卒可以向前攻击到 (r,c)
  // - 黑卒过河后（r >= RIVER_ROW+1=5），还可以在 (r, c±1) 左右攻击
  // 红兵攻击检测：红兵位于 (r+1, c) 可向前攻击到 (r,c)
  if (byColor === 'red') {
    // 向前攻击：红兵在目标格下方一格
    if (inBounds(r + 1, c)) {
      const p = board[r + 1][c];
      if (p && p.color === 'red' && p.type === 'p') return true;
    }
    // 左右攻击：仅当目标格行号 <= 河界行（即红兵已过河到黑方半场）时有效
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
    // 黑卒攻击检测：黑卒位于 (r-1, c) 可向前攻击到 (r,c)
    // 向前攻击：黑卒在目标格上方一格
    if (inBounds(r - 1, c)) {
      const p = board[r - 1][c];
      if (p && p.color === 'black' && p.type === 'p') return true;
    }
    // 左右攻击：仅当目标格行号 >= 河界行+1（即黑卒已过河到红方半场）时有效
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
 * 判断位于 (r,c) 的红兵是否已过河
 * 过河条件：红兵进入黑方半场，即 row <= 4（河界行）
 * @param {number} r - 行号
 * @param {number} c - 列号（未使用，保持接口一致性）
 * @returns {boolean}
 */
function isRedPawnCrossed(r, c) {
  return r <= RIVER_ROW;
}
/**
 * 判断位于 (r,c) 的黑卒是否已过河
 * 过河条件：黑卒进入红方半场，即 row >= 5
 * @param {number} r - 行号
 * @param {number} c - 列号（未使用，保持接口一致性）
 * @returns {boolean}
 */
function isBlackPawnCrossed(r, c) {
  return r >= RIVER_ROW + 1;
}

/**
 * 判断 color 方将/帅是否处于被将军状态
 * 
 * 将军检测包括两部分：
 * 1. 常规攻击检测：车、炮、马、兵/卒对将/帅所在格的直接攻击
 * 2. 飞将检测：双方将/帅在同一列且中间无任何棋子阻挡
 *    中国象棋规则禁止将帅直接对脸，因此飞将也算将军
 * 
 * @param {Array<Array<{type:string, color:string}|null>>} board - 棋盘
 * @param {'red'|'black'} color - 被检测方的颜色
 * @returns {boolean} 是否被将军
 */
export function isInCheck(board, color) {
  const general = findGeneral(board, color);
  if (!general) return false;
  const opp = opposite(color);

  // 普通攻击检测（车、炮、马、兵）
  if (isSquareAttacked(board, general.r, general.c, opp)) return true;

  // 飞将检测：双方将/帅同列且中间无子
  const oppGeneral = findGeneral(board, opp);
  if (oppGeneral && oppGeneral.c === general.c) {
    let blocked = false;
    const lo = Math.min(general.r, oppGeneral.r) + 1;
    const hi = Math.max(general.r, oppGeneral.r);
    for (let r = lo; r < hi; r++) {
      if (board[r][general.c]) { blocked = true; break; }
    }
    if (!blocked) return true; // 中间无子阻挡，飞将成立
  }

  return false;
}

/**
 * 生成指定棋子的伪合法走法列表
 * 
 * "伪合法"指不考虑走完后己方将/帅是否仍被将军（即不检查"自将"）
 * 这一步由 getLegalMoves 通过过滤完成
 * 
 * 各棋子走法规则：
 * - 将/帅（k）：九宫格内上下左右各一格
 * - 士/仕（a）：九宫格内对角线一格
 * - 象/相（e）：田字对角线两格，象眼不可堵，不能过河
 * - 马（h）：日字走法，需检测蹩马腿
 * - 车（r）：横竖直线滑动，遇子停
 * - 炮（c）：横竖直线滑动，不吃子同车，吃子需跳恰好一炮架
 * - 兵/卒（p）：未过河仅向前，过河后可前/左/右
 * 
 * @param {Array<Array<{type:string, color:string}|null>>} board - 棋盘
 * @param {number} r - 棋子行
 * @param {number} c - 棋子列
 * @param {*} state - 预留状态接口（与 chess.js 同构）
 * @returns {Array<{from:{r:number,c:number}, to:{r:number,c:number}}>} 走法列表
 */
export function getPseudoLegalMoves(board, r, c, state) {
  const piece = board[r][c];
  if (!piece) return [];
  const color = piece.color;
  const moves = [];

  /**
   * 辅助函数：尝试将一步走法加入结果列表
   * 自动过滤出界和吃己方子的情况
   * @param {number} tr - 目标行
   * @param {number} tc - 目标列
   * @returns {boolean} 是否成功添加（用于提前终止循环）
   */
  const add = (tr, tc) => {
    if (!inBounds(tr, tc)) return false;
    const target = board[tr][tc];
    if (target && target.color === color) return false; // 不能吃己方棋子
    moves.push({ from: { r, c }, to: { r: tr, c: tc } });
    return true;
  };

  switch (piece.type) {
    case 'k': {
      // 将/帅（King）：上下左右各一格，且目标格必须在己方九宫格内
      for (const [dr, dc] of ROOK_DIRS) {
        const tr = r + dr, tc = c + dc;
        if (!inBounds(tr, tc)) continue;
        if (!inPalace(tr, tc, color)) continue;
        add(tr, tc);
      }
      break;
    }
    case 'a': {
      // 士/仕（Advisor）：九宫格内对角线走一格，共四个方向
      for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        const tr = r + dr, tc = c + dc;
        if (!inBounds(tr, tc)) continue;
        if (!inPalace(tr, tc, color)) continue;
        add(tr, tc);
      }
      break;
    }
    case 'e': {
      // 象/相（Elephant/Bishop）：田字对角线走两格
      // 约束条件：象眼（中间格）必须为空，目标格必须在本方半场（不能过河）
      for (const [dr, dc] of [[-2, -2], [-2, 2], [2, -2], [2, 2]]) {
        const tr = r + dr, tc = c + dc;
        if (!inBounds(tr, tc)) continue;
        if (!inOwnHalf(tr, color)) continue;
        // 象眼
        const er = r + dr / 2, ec = c + dc / 2;
        if (board[er][ec]) continue;
        add(tr, tc);
      }
      break;
    }
    case 'h': {
      // 马（Horse/Knight）：日字走法，需检测蹩马腿
      // 走法规律：在某个方向直走一格（腿格），再斜走一格
      // 走 (±1,±2) 时腿格为 (±1,0)；走 (±2,±1) 时腿格为 (0,±1)
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
        if (board[lr][lc]) continue; // 蹩马腿
        add(tr, tc);
      }
      break;
    }
    case 'r': {
      // 车（Rook/Chariot）：横竖直线滑动
      // 沿四个方向逐格延伸，遇到己方棋子停，遇到敌方棋子可吃并停
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
      // 炮（Cannon）：横竖直线滑动，分两种模式
      // 1. 不吃子移动：同车走法，沿直线到空格
      // 2. 吃子：必须跳恰好一个棋子（炮架），吃掉炮架后的第一个敌方棋子
      for (const [dr, dc] of ROOK_DIRS) {
        let nr = r + dr, nc = c + dc;
        let jumped = false;
        while (inBounds(nr, nc)) {
          const target = board[nr][nc];
          if (!jumped) {
            if (target) {
              // 遇到第一个棋子，标记为炮架
              jumped = true;
            } else {
              // 空格，可移动
              moves.push({ from: { r, c }, to: { r: nr, c: nc } });
            }
          } else {
            // 已跳过炮架
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
      // 兵/卒（Pawn/Soldier）：未过河时只能向前走一格
      // 过河后可以向前、向左、向右各一格（不能后退）
      // 红兵初始方向向上（row 递减），黑卒初始方向向下（row 递增）
      const dir = color === 'red' ? -1 : 1; // 红兵向上（row 递减），黑卒向下（row 递增）
      const crossed = color === 'red' ? isRedPawnCrossed(r, c) : isBlackPawnCrossed(r, c);
      // 向前
      add(r + dir, c);
      if (crossed) {
        // 过河后可左右
        add(r, c - 1);
        add(r, c + 1);
      }
      break;
    }
  }

  return moves;
}

/**
 * 应用一步走法，返回新棋盘与被吃棋子
 * 不修改入参，通过深拷贝创建新棋盘
 * 
 * @param {Array<Array<{type:string, color:string}|null>>} board - 原棋盘
 * @param {{from:{r:number,c:number}, to:{r:number,c:number}}} move - 走法
 * @param {*} state - 预留状态接口（中国象棋无需额外状态）
 * @returns {{board:Array, newState:*, captured:{type:string,color:string}|null}}
 *   返回包含新棋盘、新状态、被吃棋子的结果对象
 */
export function applyMove(board, move, state) {
  const newBoard = cloneBoard(board);
  const piece = newBoard[move.from.r][move.from.c];
  let captured = null;

  if (newBoard[move.to.r][move.to.c]) {
    captured = newBoard[move.to.r][move.to.c];
  }

  newBoard[move.to.r][move.to.c] = piece;
  newBoard[move.from.r][move.from.c] = null;

  return {
    board: newBoard,
    newState: state,
    captured,
  };
}

/**
 * 生成指定棋子的合法走法列表
 * 
 * 在伪合法走法基础上，过滤掉会导致己方将/帅被将军（自将）的走法
 * 即：模拟执行每个走法，然后检查己方将是否被将军，若被将军则排除
 * 
 * @param {Array<Array<{type:string, color:string}|null>>} board - 棋盘
 * @param {number} r - 棋子行
 * @param {number} c - 棋子列
 * @param {*} state - 预留状态接口
 * @returns {Array<{from:{r:number,c:number}, to:{r:number,c:number}}>} 合法走法列表
 */
export function getLegalMoves(board, r, c, state) {
  const piece = board[r][c];
  if (!piece) return [];
  const color = piece.color;
  const pseudo = getPseudoLegalMoves(board, r, c, state);
  const legal = [];

  for (const move of pseudo) {
    const { board: next } = applyMove(board, move, state);
    if (!isInCheck(next, color)) legal.push(move);
  }

  return legal;
}

/**
 * 判断 color 方是否还有任意合法走法
 * 遍历该方所有棋子，若存在至少一个合法走法则返回 true
 * 用于将杀/困毙判定
 * 
 * @param {Array<Array<{type:string, color:string}|null>>} board - 棋盘
 * @param {'red'|'black'} color - 要检测的颜色
 * @param {*} state - 预留状态接口
 * @returns {boolean} 是否有合法走法
 */
export function hasAnyLegalMove(board, color, state) {
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
 * 条件：被将军且没有任何合法走法可解除将军
 * 中国象棋中将杀即判负
 * 
 * @param {Array<Array<{type:string, color:string}|null>>} board - 棋盘
 * @param {'red'|'black'} color - 被检测方的颜色
 * @param {*} state - 预留状态接口
 * @returns {boolean} 是否被将杀
 */
export function isCheckmate(board, color, state) {
  return isInCheck(board, color) && !hasAnyLegalMove(board, color, state);
}

/**
 * 判断是否困毙
 * 条件：未被将军但没有合法走法
 * 中国象棋规则中困毙（无子可走）同样判负
 * 与国际象棋不同，中国象棋不存在"困毙是和棋"的规则
 * 
 * @param {Array<Array<{type:string, color:string}|null>>} board - 棋盘
 * @param {'red'|'black'} color - 被检测方的颜色
 * @param {*} state - 预留状态接口
 * @returns {boolean} 是否困毙
 */
export function isStalemate(board, color, state) {
  return !isInCheck(board, color) && !hasAnyLegalMove(board, color, state);
}
