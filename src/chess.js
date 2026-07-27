// 国际象棋规则引擎 —— 纯函数实现，无副作用、无 I/O。
// 棋盘表示：8x8 数组 board[row][col]，row 0 = 黑方底线（顶部），row 7 = 白方底线（底部）。
// 每格为 null（空）或 { type: 'k'|'q'|'r'|'b'|'n'|'p', color: 'white'|'black' }。
// 可同时用于 Cloudflare Worker Durable Object 服务端与浏览器端。

// 滑动方向常量
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const KING_DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const KNIGHT_DELTAS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

// 各色车在初始格的映射，用于易位权更新："行,列" -> 侧别
const ROOK_ORIGINS = {
  white: { '7,0': 'q', '7,7': 'k' },
  black: { '0,0': 'q', '0,7': 'k' },
};

const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const opposite = (color) => (color === 'white' ? 'black' : 'white');

// 生成标准起始局面：白方在 row 6/7，黑方在 row 0/1，底线顺序 r,n,b,q,k,b,n,r。
export function initialBoard() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const backRank = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRank[c], color: 'black' };
    board[1][c] = { type: 'p', color: 'black' };
    board[6][c] = { type: 'p', color: 'white' };
    board[7][c] = { type: backRank[c], color: 'white' };
  }
  return board;
}

// 深拷贝棋盘，避免外部修改影响内部状态。
export function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { type: cell.type, color: cell.color } : null)));
}

// 判断 byColor 方是否有棋子以基础走法攻击 (r,c)。不含王车易位、不含兵直走（兵只斜吃）。
export function isSquareAttacked(board, r, c, byColor) {
  // 兵的斜向攻击：白兵向上吃，故攻击 (r,c) 的白兵位于 (r+1, c±1)；黑兵反之。
  const pawnRow = byColor === 'white' ? r + 1 : r - 1;
  if (inBounds(pawnRow, c - 1)) {
    const p = board[pawnRow][c - 1];
    if (p && p.color === byColor && p.type === 'p') return true;
  }
  if (inBounds(pawnRow, c + 1)) {
    const p = board[pawnRow][c + 1];
    if (p && p.color === byColor && p.type === 'p') return true;
  }

  // 马的 L 形攻击
  for (const [dr, dc] of KNIGHT_DELTAS) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.type === 'n') return true;
    }
  }

  // 王的邻格攻击
  for (const [dr, dc] of KING_DIRS) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.type === 'k') return true;
    }
  }

  // 横竖滑动：车或后
  for (const [dr, dc] of ROOK_DIRS) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }

  // 斜向滑动：象或后
  for (const [dr, dc] of BISHOP_DIRS) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }

  return false;
}

// 查找指定色王的位置，找不到返回 null。
export function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) return { r, c };
    }
  }
  return null;
}

// 判断 color 方王是否被将军。
export function isInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return false;
  return isSquareAttacked(board, king.r, king.c, opposite(color));
}

// 生成伪合法走法（不检测走完后己方王是否被将军）。
// state: { castlingRights: {white:{k,q},black:{k,q}}, enPassantTarget: {r,c}|null }
export function getPseudoLegalMoves(board, r, c, state) {
  const piece = board[r][c];
  if (!piece) return [];
  const color = piece.color;
  const opponent = opposite(color);
  const moves = [];

  // 添加一个普通走法（自动跳过越界与己方棋子格）
  const add = (tr, tc, special) => {
    if (!inBounds(tr, tc)) return;
    const target = board[tr][tc];
    if (target && target.color === color) return;
    const move = { from: { r, c }, to: { r: tr, c: tc } };
    if (special) move.special = special;
    moves.push(move);
  };

  switch (piece.type) {
    case 'p': {
      const dir = color === 'white' ? -1 : 1;        // 白方向上（行号减小）
      const startRow = color === 'white' ? 6 : 1;
      const lastRow = color === 'white' ? 0 : 7;

      // 向前 1 格
      const fr = r + dir;
      if (inBounds(fr, c) && !board[fr][c]) {
        if (fr === lastRow) add(fr, c, 'promotion');
        else add(fr, c);
        // 起始位向前 2 格（需两格均空）
        const fr2 = r + 2 * dir;
        if (r === startRow && inBounds(fr2, c) && !board[fr2][c]) add(fr2, c);
      }

      // 斜向吃子 + 过路兵
      for (const dc of [-1, 1]) {
        const tr = r + dir, tc = c + dc;
        if (!inBounds(tr, tc)) continue;
        const target = board[tr][tc];
        if (target && target.color === opponent) {
          if (tr === lastRow) add(tr, tc, 'promotion');
          else add(tr, tc);
        } else if (state && state.enPassantTarget &&
                   state.enPassantTarget.r === tr && state.enPassantTarget.c === tc) {
          add(tr, tc, 'enpassant');
        }
      }
      break;
    }

    case 'n': {
      for (const [dr, dc] of KNIGHT_DELTAS) add(r + dr, c + dc);
      break;
    }

    case 'k': {
      // 普通邻格走法
      for (const [dr, dc] of KING_DIRS) add(r + dr, c + dc);

      // 王车易位：需有易位权、中间无子、王不在将军中、王路径格不被攻击
      if (state && state.castlingRights && state.castlingRights[color]) {
        const rights = state.castlingRights[color];
        const kingRow = color === 'white' ? 7 : 0;
        if (r === kingRow && c === 4 && !isSquareAttacked(board, kingRow, 4, opponent)) {
          // 王翼：f/g 空，h 为己车，f/g 不被攻击
          if (rights.k && !board[kingRow][5] && !board[kingRow][6] &&
              board[kingRow][7] && board[kingRow][7].type === 'r' && board[kingRow][7].color === color &&
              !isSquareAttacked(board, kingRow, 5, opponent) &&
              !isSquareAttacked(board, kingRow, 6, opponent)) {
            moves.push({ from: { r, c }, to: { r: kingRow, c: 6 }, special: 'castle-kingside' });
          }
          // 后翼：b/c/d 空，a 为己车，c/d 不被攻击（b1 王不经过，可被攻击）
          if (rights.q && !board[kingRow][1] && !board[kingRow][2] && !board[kingRow][3] &&
              board[kingRow][0] && board[kingRow][0].type === 'r' && board[kingRow][0].color === color &&
              !isSquareAttacked(board, kingRow, 3, opponent) &&
              !isSquareAttacked(board, kingRow, 2, opponent)) {
            moves.push({ from: { r, c }, to: { r: kingRow, c: 2 }, special: 'castle-queenside' });
          }
        }
      }
      break;
    }

    case 'b':
    case 'r':
    case 'q': {
      // 滑动走法：沿各方向直走到越界或遇子（遇敌可吃、遇己停）
      let dirs = [];
      if (piece.type === 'b' || piece.type === 'q') dirs = dirs.concat(BISHOP_DIRS);
      if (piece.type === 'r' || piece.type === 'q') dirs = dirs.concat(ROOK_DIRS);
      for (const [dr, dc] of dirs) {
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
  }

  return moves;
}

// 应用一步走法，返回新棋盘、新状态与被吃棋子。不修改入参。
export function applyMove(board, move, state, promotionPiece) {
  const newBoard = cloneBoard(board);
  const piece = newBoard[move.from.r][move.from.c];
  const color = piece.color;
  const opponent = opposite(color);
  let captured = null;
  let isPromotion = false;

  // 复制易位权（深拷贝）
  const newCastlingRights = state && state.castlingRights
    ? {
        white: { k: state.castlingRights.white.k, q: state.castlingRights.white.q },
        black: { k: state.castlingRights.black.k, q: state.castlingRights.black.q },
      }
    : { white: { k: false, q: false }, black: { k: false, q: false } };
  let newEnPassantTarget = null;

  // 处理过路兵：被吃兵位于走子方原行、目标列
  if (move.special === 'enpassant') {
    captured = newBoard[move.from.r][move.to.c];
    newBoard[move.from.r][move.to.c] = null;
  } else if (newBoard[move.to.r][move.to.c]) {
    captured = newBoard[move.to.r][move.to.c];
  }

  // 移动棋子
  newBoard[move.to.r][move.to.c] = piece;
  newBoard[move.from.r][move.from.c] = null;

  // 王车易位：同步移动车
  if (move.special === 'castle-kingside') {
    const row = move.from.r;
    newBoard[row][5] = newBoard[row][7];
    newBoard[row][7] = null;
  } else if (move.special === 'castle-queenside') {
    const row = move.from.r;
    newBoard[row][3] = newBoard[row][0];
    newBoard[row][0] = null;
  }

  // 兺升变与双步过路兵目标
  if (piece.type === 'p') {
    const lastRow = color === 'white' ? 0 : 7;
    if (move.to.r === lastRow) {
      newBoard[move.to.r][move.to.c] = { type: promotionPiece || 'q', color };
      isPromotion = true;
    }
    const startRow = color === 'white' ? 6 : 1;
    if (move.from.r === startRow && Math.abs(move.to.r - move.from.r) === 2) {
      newEnPassantTarget = { r: (move.from.r + move.to.r) / 2, c: move.from.c };
    }
  }

  // 更新易位权：王移动则失两侧；车离原格则失该侧；车在原格被吃则失该侧
  if (piece.type === 'k') {
    newCastlingRights[color].k = false;
    newCastlingRights[color].q = false;
  }
  const fromKey = `${move.from.r},${move.from.c}`;
  if (piece.type === 'r' && ROOK_ORIGINS[color][fromKey]) {
    newCastlingRights[color][ROOK_ORIGINS[color][fromKey]] = false;
  }
  if (captured && captured.type === 'r') {
    const toKey = `${move.to.r},${move.to.c}`;
    if (ROOK_ORIGINS[opponent][toKey]) {
      newCastlingRights[opponent][ROOK_ORIGINS[opponent][toKey]] = false;
    }
  }

  return {
    board: newBoard,
    newState: { castlingRights: newCastlingRights, enPassantTarget: newEnPassantTarget },
    captured,
    isPromotion,
  };
}

// 生成合法走法：过滤走完后己方王被将军的走法；易位额外校验路径格不被攻击。
export function getLegalMoves(board, r, c, state) {
  const piece = board[r][c];
  if (!piece) return [];
  const color = piece.color;
  const opponent = opposite(color);
  const pseudo = getPseudoLegalMoves(board, r, c, state);
  const legal = [];

  for (const move of pseudo) {
    // 易位：校验王起点、途经格、终点均不被攻击
    if (move.special === 'castle-kingside' || move.special === 'castle-queenside') {
      const row = move.from.r;
      const startC = 4;
      const midC = move.special === 'castle-kingside' ? 5 : 3;
      const endC = move.special === 'castle-kingside' ? 6 : 2;
      if (isSquareAttacked(board, row, startC, opponent)) continue;
      if (isSquareAttacked(board, row, midC, opponent)) continue;
      if (isSquareAttacked(board, row, endC, opponent)) continue;
    }
    // 模拟走完后己方王不能处于将军
    const { board: next } = applyMove(board, move, state);
    if (!isInCheck(next, color)) legal.push(move);
  }

  return legal;
}

// 判断 color 方是否还有任意合法走法（用于将杀/逼和判定）。
// 用 make/unmake 原地走法替代 cloneBoard，仅服务端将杀/逼和判定路径使用。
// 语义与原 getLegalMoves 版完全一致（含易位额外校验、promotion 按 'q' 升变）。
function makeMoveInPlace(board, move) {
  const from = move.from, to = move.to;
  const piece = board[from.r][from.c];
  const color = piece.color;
  const undo = {
    piece,            // 原棋子（promotion 时仍为 pawn）
    captured: null,   // 目标格原棋子
    enPassantCap: null, // 过路兵被吃位置与原值
    castleRook: null,   // 易位时车移动信息
  };
  if (move.special === 'enpassant') {
    undo.enPassantCap = { r: from.r, c: to.c, piece: board[from.r][to.c] };
    board[from.r][to.c] = null;
  } else {
    undo.captured = board[to.r][to.c];
  }
  if (move.special === 'castle-kingside') {
    const row = from.r;
    undo.castleRook = { fromR: row, fromC: 7, toR: row, toC: 5, piece: board[row][7] };
    board[row][5] = board[row][7];
    board[row][7] = null;
  } else if (move.special === 'castle-queenside') {
    const row = from.r;
    undo.castleRook = { fromR: row, fromC: 0, toR: row, toC: 3, piece: board[row][0] };
    board[row][3] = board[row][0];
    board[row][0] = null;
  }
  if (move.special === 'promotion') {
    board[to.r][to.c] = { type: 'q', color };
  } else {
    board[to.r][to.c] = piece;
  }
  board[from.r][from.c] = null;
  return undo;
}

function unmakeMove(board, move, undo) {
  const from = move.from, to = move.to;
  // 还原原棋子到起点（promotion 时还原为原 pawn）
  board[from.r][from.c] = undo.piece;
  // 还原目标格
  if (move.special === 'enpassant') {
    board[to.r][to.c] = null;
    board[undo.enPassantCap.r][undo.enPassantCap.c] = undo.enPassantCap.piece;
  } else {
    board[to.r][to.c] = undo.captured;
  }
  // 还原易位时的车
  if (undo.castleRook) {
    board[undo.castleRook.fromR][undo.castleRook.fromC] = undo.castleRook.piece;
    board[undo.castleRook.toR][undo.castleRook.toC] = null;
  }
}

export function hasAnyLegalMoveFast(board, color, state) {
  const opponent = opposite(color);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== color) continue;
      const pseudo = getPseudoLegalMoves(board, r, c, state);
      for (const move of pseudo) {
        // 易位：与 getLegalMoves 完全一致的额外路径校验（保持判定结果一致）
        if (move.special === 'castle-kingside' || move.special === 'castle-queenside') {
          const row = move.from.r;
          const startC = 4;
          const midC = move.special === 'castle-kingside' ? 5 : 3;
          const endC = move.special === 'castle-kingside' ? 6 : 2;
          if (isSquareAttacked(board, row, startC, opponent)) continue;
          if (isSquareAttacked(board, row, midC, opponent)) continue;
          if (isSquareAttacked(board, row, endC, opponent)) continue;
        }
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

// 逼和：未被将军且无合法走法。
export function isStalemate(board, color, state) {
  return !isInCheck(board, color) && !hasAnyLegalMove(board, color, state);
}

// 子力不足和棋：仅王；王+单马/单象对王；王+单象对王+单象且象同色格。
export function isInsufficientMaterial(board) {
  const white = [];
  const black = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const entry = { type: p.type, r, c };
      (p.color === 'white' ? white : black).push(entry);
    }
  }

  const nonKing = (arr) => arr.filter((p) => p.type !== 'k');
  const w = nonKing(white);
  const b = nonKing(black);

  // 仅剩王
  if (w.length === 0 && b.length === 0) return true;

  // 王 + 单轻子（马/象）对王
  if (w.length === 1 && b.length === 0 && (w[0].type === 'n' || w[0].type === 'b')) return true;
  if (b.length === 1 && w.length === 0 && (b[0].type === 'n' || b[0].type === 'b')) return true;

  // 王 + 单象 对 王 + 单象，且两象位于同色格
  if (w.length === 1 && b.length === 1 && w[0].type === 'b' && b[0].type === 'b') {
    if ((w[0].r + w[0].c) % 2 === (b[0].r + b[0].c) % 2) return true;
  }

  return false;
}
