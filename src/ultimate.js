/**
 * 终极井字棋（Ultimate Tic-Tac-Toe）规则引擎 —— 纯函数模块，服务端与客户端共用。
 *
 * 棋盘结构：
 * - 大棋盘 3×3，共 9 个小棋盘；每个小棋盘 3×3，共 9 个格子。
 * - board[b][i] 表示第 b 个小棋盘（0~8）的第 i 个格子（0~8），值为 null / 'black' / 'white'。
 * - winners[b] 表示第 b 个小棋盘的结果：null（进行中）/ 'black' / 'white' / 'draw'（已填满无胜者）。
 * - forcedBoard 表示下一手必须落子的小棋盘索引；null 表示可自由选择。
 * 格子索引 i = r * 3 + c。
 */

/** 井字棋八条获胜连线（小棋盘与大棋盘共用） */
export const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // 横
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // 竖
  [0, 4, 8], [2, 4, 6],            // 斜
];

/**
 * 创建空棋盘：9 个小棋盘，每个 9 个空格。
 * @returns {Array<Array<string|null>>}
 */
export function initialBoard() {
  return Array.from({ length: 9 }, () => Array(9).fill(null));
}

/**
 * 创建空的小棋盘结果数组。
 * @returns {Array<string|null>}
 */
export function initialWinners() {
  return Array(9).fill(null);
}

/**
 * 判断一组 9 个格子中是否有三子连线。
 * @param {Array<string|null>} cells - 9 个格子
 * @returns {string|null} 获胜颜色；无胜者返回 null
 */
export function lineWinner(cells) {
  for (const [a, b, c] of LINES) {
    const v = cells[a];
    if (v && v !== 'draw' && v === cells[b] && v === cells[c]) return v;
  }
  return null;
}

/**
 * 判断某方颜色。
 * @param {string} color - 'black' | 'white'
 * @returns {string}
 */
export function opposite(color) {
  return color === 'black' ? 'white' : 'black';
}

/**
 * 小棋盘是否还能落子（未被占领/未填满，且有空格）。
 * @param {Array<Array<string|null>>} board - 棋盘
 * @param {Array<string|null>} winners - 小棋盘结果
 * @param {number} b - 小棋盘索引
 * @returns {boolean}
 */
export function isPlayable(board, winners, b) {
  if (!board[b] || winners[b] !== null) return false;
  return board[b].some((v) => v === null);
}

/**
 * 生成当前所有合法落子。
 * - forcedBoard 有效（未结束且有空位）时，只能在该小棋盘内落子。
 * - 否则可在任意未结束的小棋盘内落子。
 * @param {Array<Array<string|null>>} board - 棋盘
 * @param {Array<string|null>} winners - 小棋盘结果
 * @param {number|null} forcedBoard - 必须落子的小棋盘
 * @returns {Array<{b:number,r:number,c:number}>}
 */
export function getLegalMoves(board, winners, forcedBoard) {
  const moves = [];
  const restrict = forcedBoard !== null && forcedBoard !== undefined && isPlayable(board, winners, forcedBoard);
  for (let b = 0; b < 9; b++) {
    if (!isPlayable(board, winners, b)) continue;
    if (restrict && b !== forcedBoard) continue;
    for (let i = 0; i < 9; i++) {
      if (board[b][i] === null) moves.push({ b, r: Math.floor(i / 3), c: i % 3 });
    }
  }
  return moves;
}

/**
 * 应用一步落子并结算小棋盘/大棋盘结果。
 * 调用方需先用 getLegalMoves 校验合法性。
 * @param {Array<Array<string|null>>} board - 当前棋盘
 * @param {Array<string|null>} winners - 当前小棋盘结果
 * @param {{b:number,r:number,c:number}} move - 落子
 * @param {string} color - 落子方颜色
 * @returns {{board:Array, winners:Array, smallWinner:string|null, bigWinner:string|null, draw:boolean, forcedBoard:number|null}}
 */
export function applyMove(board, winners, move, color) {
  const newBoard = board.map((cells) => cells.slice());
  const newWinners = winners.slice();
  const i = move.r * 3 + move.c;
  newBoard[move.b][i] = color;

  // 结算小棋盘：三子连线 → 占领；填满无连线 → 和棋封闭
  let smallWinner = null;
  if (newWinners[move.b] === null) {
    smallWinner = lineWinner(newBoard[move.b]);
    if (smallWinner) newWinners[move.b] = smallWinner;
    else if (newBoard[move.b].every((v) => v !== null)) newWinners[move.b] = 'draw';
  }

  // 结算大棋盘：三个被占领的小棋盘连线 → 获胜
  const bigWinner = lineWinner(newWinners);

  // 下一手必须去“落子所在小棋盘的对应大棋盘格子”
  const nextBoard = move.r * 3 + move.c;
  let forcedBoard = isPlayable(newBoard, newWinners, nextBoard) ? nextBoard : null;

  // 无合法落子且无人获胜 → 和棋
  const draw = !bigWinner && getLegalMoves(newBoard, newWinners, forcedBoard).length === 0;

  return { board: newBoard, winners: newWinners, smallWinner, bigWinner, draw, forcedBoard };
}
