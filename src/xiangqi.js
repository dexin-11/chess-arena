// 中国象棋规则引擎 —— 纯函数实现，无副作用、无 I/O。
// 棋盘表示：10 行 × 9 列数组 board[row][col]，row 0 = 黑方底线（顶部），row 9 = 红方底线（底部）。
// 每格为 null（空）或 { type: 'k'|'a'|'e'|'h'|'r'|'c'|'p', color: 'red'|'black' }。
// 类型对照：k=将/帅，a=士/仕，e=象/相，h=马，r=车，c=炮，p=兵/卒。
// 可同时用于 Cloudflare Worker Durable Object 服务端与浏览器端。

const ROWS = 10;
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

const inBounds = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
const opposite = (color) => (color === 'red' ? 'black' : 'red');

// 判断某格是否在某色九宫格内
const inPalace = (r, c, color) => {
  const p = PALACE[color];
  return r >= p.rowMin && r <= p.rowMax && c >= p.colMin && c <= p.colMax;
};

// 判断某格是否在某色半场内（红方 row>=5，黑方 row<=4）
const inOwnHalf = (r, color) => (color === 'red' ? r >= 5 : r <= 4);

// 生成标准起始局面：红方在 row 6-9，黑方在 row 0-3。
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

// 深拷贝棋盘，避免外部修改影响内部状态。
export function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { type: cell.type, color: cell.color } : null)));
}

// 查找指定色将/帅的位置，找不到返回 null。
export function findGeneral(board, color) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) return { r, c };
    }
  }
  return null;
}

// 判断 byColor 方是否有棋子攻击 (r,c)。
// 含：车/炮横竖滑动、马走日、兵/卒。飞将（将帅对脸）单独在 isInCheck 中处理。
export function isSquareAttacked(board, r, c, byColor) {
  // 车 / 炮的横竖扫描：车可直接攻击，炮需跳一子
  for (const [dr, dc] of ROOK_DIRS) {
    let nr = r + dr, nc = c + dc;
    let jumped = false; // 是否已遇到一个棋子（炮架）
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (!jumped) {
          // 第一个遇到的棋子
          if (p.color === byColor && p.type === 'r') return true; // 车直接攻击
          jumped = true;
        } else {
          // 第二个遇到的棋子：炮跳一子吃子
          if (p.color === byColor && p.type === 'c') return true;
          break;
        }
      }
      nr += dr; nc += dc;
    }
  }

  // 马的日字攻击（含蹩马腿）。
  // 枚举所有可能攻击 (r,c) 的马位置 (mr,mc)，腿格为马与目标之间、靠近马一侧的直走格。
  // knightOffset = 马相对目标的偏移；legOffset = 腿格相对目标的偏移。
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

  // 兵/卒的攻击：
  // 红兵攻击 (r,c)：红兵在 (r+1, c) 可向前吃；位于 (r, c±1) 且已过河（该兵 row<=4，即 r<=4）可左右吃
  // 黑卒攻击 (r,c)：黑卒在 (r-1, c) 可向前吃；位于 (r, c±1) 且已过河（该兵 row>=5，即 r>=5）可左右吃
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

// 判断位于 (r,c) 的红兵是否已过河（即位于黑方半场 row<=4）
function isRedPawnCrossed(r, c) {
  return r <= RIVER_ROW;
}
// 判断位于 (r,c) 的黑卒是否已过河（即位于红方半场 row>=5）
function isBlackPawnCrossed(r, c) {
  return r >= RIVER_ROW + 1;
}

// 判断 color 方将/帅是否处于被将军状态（含飞将检测）。
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
    if (!blocked) return true;
  }

  return false;
}

// 生成伪合法走法（不检测走完后己方将是否仍被将军）。
// state: 预留接口（中国象棋规则引擎当前无需状态，保留以便与 chess.js 同构）。
export function getPseudoLegalMoves(board, r, c, state) {
  const piece = board[r][c];
  if (!piece) return [];
  const color = piece.color;
  const moves = [];

  const add = (tr, tc) => {
    if (!inBounds(tr, tc)) return false;
    const target = board[tr][tc];
    if (target && target.color === color) return false;
    moves.push({ from: { r, c }, to: { r: tr, c: tc } });
    return true;
  };

  switch (piece.type) {
    case 'k': {
      // 将/帅：上下左右一格，且必须在己方九宫格内
      for (const [dr, dc] of ROOK_DIRS) {
        const tr = r + dr, tc = c + dc;
        if (!inBounds(tr, tc)) continue;
        if (!inPalace(tr, tc, color)) continue;
        add(tr, tc);
      }
      break;
    }
    case 'a': {
      // 士/仕：九宫格内对角线一格
      for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        const tr = r + dr, tc = c + dc;
        if (!inBounds(tr, tc)) continue;
        if (!inPalace(tr, tc, color)) continue;
        add(tr, tc);
      }
      break;
    }
    case 'e': {
      // 象/相：对角线两格，象眼（中间格）必须为空，目标格必须在本方半场
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
      // 马：日字，蹩马腿
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
      // 车：横竖滑动
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
      // 炮：横竖滑动；不吃子时按车走法，吃子时需跳恰好一个棋子（炮架）
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
      // 兵/卒：未过河仅向前；过河后可前/左/右
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

// 应用一步走法，返回新棋盘与被吃棋子。不修改入参。
// state 当前为预留接口（中国象棋无需额外状态）。
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

// 生成合法走法：过滤走完后己方将仍被将军（含飞将）的走法。
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

// 判断 color 方是否还有任意合法走法（用于将杀/困毙判定）。
// 用 make/unmake 原地走法替代 cloneBoard，仅服务端将杀/困毙判定路径使用。
// 中国象棋 applyMove 极简（仅移动棋子，无易位/升变/过路兵），make/unmake 只需还原 to/from。
function makeMoveInPlace(board, move) {
  const from = move.from, to = move.to;
  const piece = board[from.r][from.c];
  const captured = board[to.r][to.c];
  board[to.r][to.c] = piece;
  board[from.r][from.c] = null;
  return { piece, captured };
}

function unmakeMove(board, move, undo) {
  const from = move.from, to = move.to;
  board[from.r][from.c] = undo.piece;
  board[to.r][to.c] = undo.captured;
}

export function hasAnyLegalMoveFast(board, color, state) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p || p.color !== color) continue;
      const pseudo = getPseudoLegalMoves(board, r, c, state);
      for (const move of pseudo) {
        const undo = makeMoveInPlace(board, move);
        const ok = !isInCheck(board, color);
        unmakeMove(board, move, undo);
        if (ok) return true;
      }
    }
  }
  return false;
}

export function hasAnyLegalMove(board, color, state) {
  return hasAnyLegalMoveFast(board, color, state);
}

// 将杀：被将军且无合法走法。
export function isCheckmate(board, color, state) {
  return isInCheck(board, color) && !hasAnyLegalMove(board, color, state);
}

// 困毙：未被将军且无合法走法（中国象棋规则：困毙判负）。
export function isStalemate(board, color, state) {
  return !isInCheck(board, color) && !hasAnyLegalMove(board, color, state);
}
