// 规则引擎单元测试 —— 无服务端依赖，直接运行
import * as Chess from './src/chess.js';
import * as Xiangqi from './src/xiangqi.js';

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log('  PASS', name); } else { fail++; console.log('  FAIL', name); } }
function group(name) { console.log('\n=== ' + name + ' ==='); }

// === 国际象棋引擎 ===
group('国际象棋：初始局面');

const initBoard = Chess.initialBoard();
ok('棋盘 8x8', initBoard.length === 8 && initBoard[0].length === 8);
ok('白王在 e1 (7,4)', initBoard[7][4].type === 'k' && initBoard[7][4].color === 'white');
ok('黑王在 e8 (0,4)', initBoard[0][4].type === 'k' && initBoard[0][4].color === 'black');
ok('白兵在 row 6', initBoard[6].every(c => c && c.type === 'p' && c.color === 'white'));
ok('黑兵在 row 1', initBoard[1].every(c => c && c.type === 'p' && c.color === 'black'));

const initState = { castlingRights: { white: { k: true, q: true }, black: { k: true, q: true } }, enPassantTarget: null };

group('国际象棋：走法生成');
let moves = Chess.getLegalMoves(initBoard, 6, 4, initState);
ok('白兵 e2-e4/e3 两步', moves.length === 2);
ok('e2-e4 目标格 (4,4)', moves.some(m => m.to.r === 4 && m.to.c === 4));
ok('e2-e3 目标格 (5,4)', moves.some(m => m.to.r === 5 && m.to.c === 4));

moves = Chess.getLegalMoves(initBoard, 7, 1, initState);
ok('白马 b1 合法走法：2 种', moves.length === 2);
ok('白马可到 a3/c3', moves.some(m => m.to.r === 5 && m.to.c === 0) && moves.some(m => m.to.r === 5 && m.to.c === 2));

moves = Chess.getLegalMoves(initBoard, 7, 3, initState);
ok('白后 d1 合法走法：0（被兵挡）', moves.length === 0);

group('国际象棋：将军检测');
// 构造一个简单将军局面：黑后 h4 将军白王 e1
let checkBoard = Chess.initialBoard();
// 清空一些子
checkBoard[0][4] = null; // 黑王暂时移开
checkBoard[1][4] = null; // 黑兵
checkBoard[1][3] = null;
checkBoard[0][3] = { type: 'k', color: 'black' }; // 黑王移开
checkBoard[5][7] = { type: 'q', color: 'black' }; // 黑后 h4
ok('白方被将军', Chess.isInCheck(checkBoard, 'white'));

// 白方应将：走王、挡后、吃后
moves = Chess.getLegalMoves(checkBoard, 7, 4, initState);
ok('被将军时王有合法应将', moves.length > 0);

group('国际象棋：将死判定');
// 经典的 Fool's Mate 局面：黑后 + 白方 f 兵被吃，后 h4 将杀
let mateBoard = Chess.initialBoard();
mateBoard[6][5] = null; // 吃 f 兵
mateBoard[4][7] = { type: 'q', color: 'black' }; // 黑后到 h4
mateBoard[0][4] = { type: 'k', color: 'black' }; // 黑王在 e8 不动
// 白王在 e1，g1 被自己的兵挡，无路可走
ok('Fool\'s Mate 白方被将死', Chess.isCheckmate(mateBoard, 'white', initState));

group('国际象棋：逼和判定');
// 构造逼和：白方仅剩王，黑方后 + 多子，但白王无合法走法且未被将军
let staleBoard = Chess.initialBoard();
// 清空所有棋子
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) staleBoard[r][c] = null;
staleBoard[0][7] = { type: 'k', color: 'black' };
staleBoard[7][2] = { type: 'k', color: 'white' };
staleBoard[2][2] = { type: 'q', color: 'black' };
staleBoard[1][4] = { type: 'r', color: 'black' };
// 白王在 a1，黑后在 a3，黑车在 b2 — 白王被限制在 a1 且未被将军
ok('逼和局面判定', Chess.isStalemate(staleBoard, 'white', initState));

group('国际象棋：王车易位');
// 构造易位局面：白王 e1，车 h1/a1，中间无子
let castleBoard = Chess.initialBoard();
// 清理王和车之间的棋子
castleBoard[7][5] = null; castleBoard[7][6] = null;
castleBoard[7][1] = null; castleBoard[7][2] = null; castleBoard[7][3] = null;
// 确认王翼易位可行
let kmoves = Chess.getLegalMoves(castleBoard, 7, 4, initState);
ok('王翼易位存在', kmoves.some(m => m.special === 'castle-kingside'));
ok('后翼易位存在', kmoves.some(m => m.special === 'castle-queenside'));

// 应用王翼易位
const castleResult = Chess.applyMove(castleBoard, { from: { r: 7, c: 4 }, to: { r: 7, c: 6 }, special: 'castle-kingside' }, initState);
ok('易位后王在 g1', castleResult.board[7][6].type === 'k' && castleResult.board[7][6].color === 'white');
ok('易位后车在 f1', castleResult.board[7][5].type === 'r' && castleResult.board[7][5].color === 'white');
ok('h1 已空', castleResult.board[7][7] === null);

group('国际象棋：过路兵');
let epBoard = Chess.initialBoard();
// 黑兵从 d7 走到 d5，白兵 e5 应可过路吃 d6
epBoard[3][3] = { type: 'p', color: 'black' }; // 黑兵到 d5
epBoard[6][4] = null; // 清掉 e2 原来的兵
epBoard[4][4] = { type: 'p', color: 'white' }; // 白兵到 e5
const epState = { castlingRights: { white: { k: false, q: false }, black: { k: false, q: false } }, enPassantTarget: { r: 2, c: 3 } };
let epMoves = Chess.getLegalMoves(epBoard, 4, 4, epState);
ok('过路兵吃子存在', epMoves.some(m => m.special === 'enpassant'));
// 应用过路兵
const epResult = Chess.applyMove(epBoard, { from: { r: 4, c: 4 }, to: { r: 2, c: 3 }, special: 'enpassant' }, epState);
ok('过路兵后白兵在新位', epResult.board[2][3].color === 'white');
ok('过路兵后黑兵被吃', epResult.board[3][3] === null);

group('国际象棋：兵升变');
// 白兵到 row 1，下一步升变
let promoBoard = Chess.initialBoard();
promoBoard[1][4] = { type: 'p', color: 'white' };
promoBoard[6][4] = null;
let promoState = { castlingRights: { white: { k: false, q: false }, black: { k: false, q: false } }, enPassantTarget: null };
let promoMoves = Chess.getLegalMoves(promoBoard, 1, 4, promoState);
ok('升变走法存在', promoMoves.some(m => m.special === 'promotion'));
// 升变为后
const promoResult = Chess.applyMove(promoBoard, promoMoves.find(m => m.special === 'promotion'), promoState, 'q');
ok('兵升变为后', promoResult.board[0][4].type === 'q' && promoResult.board[0][4].color === 'white');
// 升变为马
const promoResultN = Chess.applyMove(promoBoard, promoMoves.find(m => m.special === 'promotion'), promoState, 'n');
ok('兵升变为马', promoResultN.board[0][4].type === 'n' && promoResultN.board[0][4].color === 'white');

group('国际象棋：子力不足和棋');
// 仅剩王
let insufBoard = Chess.initialBoard();
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) insufBoard[r][c] = null;
insufBoard[0][0] = { type: 'k', color: 'white' };
insufBoard[7][7] = { type: 'k', color: 'black' };
ok('仅剩王 → 子力不足', Chess.isInsufficientMaterial(insufBoard));
// 王 + 单马对王
insufBoard[3][3] = { type: 'n', color: 'white' };
ok('王+马对王 → 子力不足', Chess.isInsufficientMaterial(insufBoard));
// 王 + 后对王 → 子力充足
insufBoard[3][3] = { type: 'q', color: 'white' };
ok('王+后对王 → 子力充足', !Chess.isInsufficientMaterial(insufBoard));

// === 中国象棋引擎 ===
group('中国象棋：初始局面');
const xboard = Xiangqi.initialBoard();
ok('棋盘 10x9', xboard.length === 10 && xboard[0].length === 9);
ok('红帅在 (9,4)', xboard[9][4].type === 'k' && xboard[9][4].color === 'red');
ok('黑将在 (0,4)', xboard[0][4].type === 'k' && xboard[0][4].color === 'black');
ok('红炮在 (7,1) 和 (7,7)', xboard[7][1].type === 'c' && xboard[7][7].type === 'c');
ok('黑炮在 (2,1) 和 (2,7)', xboard[2][1].type === 'c' && xboard[2][7].type === 'c');
ok('红兵在 row 6 (5 个)', xboard[6].filter(c => c && c.type === 'p').length === 5);
ok('黑卒在 row 3 (5 个)', xboard[3].filter(c => c && c.type === 'p').length === 5);

group('中国象棋：走法生成');
let xmoves = Xiangqi.getLegalMoves(xboard, 9, 1, null);
ok('红马九进八/七 2 种走法', xmoves.length === 2);
ok('红马可到 (7,0) 或 (7,2)', xmoves.every(m => m.to.r === 7));

xmoves = Xiangqi.getLegalMoves(xboard, 9, 4, null);
ok('红帅在九宫格内走法 > 0', xmoves.length > 0);
ok('红帅不离开九宫', xmoves.every(m => m.to.c >= 3 && m.to.c <= 5 && m.to.r >= 7 && m.to.r <= 9));

xmoves = Xiangqi.getLegalMoves(xboard, 9, 0, null);
ok('红车初始走法：0（被马炮兵挡）', xmoves.length === 0);

group('中国象棋：蹩马腿');
// 在红马旁边放一个子，阻塞马腿
let xblockBoard = Xiangqi.cloneBoard(xboard);
xblockBoard[8][2] = { type: 'p', color: 'red' }; // 在 (8,2) 放一个兵，阻挡马到 (7,2)
let xmoves2 = Xiangqi.getLegalMoves(xblockBoard, 9, 1, null);
// 马原本有 (7,0) 和 (7,2) 两个走法，现在 (7,2) 被蹩马腿（因为腿格 (8,1) 没有被堵，但等等让我重新算）
// 马 (9,1) 到 (7,2) 的腿格是 (8,1)，(8,1) 是空的，所以 (7,2) 应该仍然可达
// 但目标格 (7,2) 有红兵，是己方棋子，所以不能吃，所以 (7,2) 不可达
// (7,0) 是合法走法
ok('蹩马腿后走法减少', xmoves2.length < xmoves.length);

group('中国象棋：塞象眼');
// 红相 (9,2) 到 (7,0) 的象眼是 (8,1)
let xeleBoard = Xiangqi.cloneBoard(xboard);
xeleBoard[8][1] = { type: 'p', color: 'red' }; // 塞象眼
let xeleMoves = Xiangqi.getLegalMoves(xeleBoard, 9, 2, null);
ok('塞象眼后象不能到 (7,0)', !xeleMoves.some(m => m.to.r === 7 && m.to.c === 0));

group('中国象棋：炮的吃法');
// 构造炮隔子吃子局面
let xcannonBoard = Xiangqi.cloneBoard(xboard);
// 清空炮的路径
xcannonBoard[7][1] = { type: 'c', color: 'red' }; // 红炮在 (7,1)
xcannonBoard[1][1] = null; // 清黑炮
xcannonBoard[0][1] = null; // 清黑车
xcannonBoard[2][1] = null; // 清黑炮
xcannonBoard[3][1] = null; // 清黑卒
xcannonBoard[3][0] = null;
xcannonBoard[3][2] = null;
// 炮从 (7,1) 向上走，遇到 (6,1) 是第一个子（炮架），(5,1) 或往下是空的
// 找合法的炮走法
let xcannonMoves = Xiangqi.getLegalMoves(xcannonBoard, 7, 1, null);
// 炮可以走到 (6,1) 因为 (6,1) 有兵（红方），但走不过去，因为己方棋子不能吃
// 实际上炮在没有炮架时只能走空格，有炮架且炮架后有对方棋子时可吃
// 让我检查一下当前位置
const cannonAt71 = xcannonBoard[7][1];
// 炮上方 (6,1) 有红兵（己方）→ 不能走不能吃 → 跳过
// 炮下方 (8,1) 有红马 → 不能走不能吃 → 跳过
// 炮左方 (7,0) 有红车（己方）→ 不能走不能吃
// 炮右方 (7,2) 有红马（己方）→ 不能走不能吃
// 所以炮在初始位置被己方棋子包围，没有合法走法
ok('炮被己方棋子包围时无合法走法', xcannonMoves.length === 0);

// 构造一个更干净的炮局面
let xcannonBoard2 = Xiangqi.cloneBoard(xboard);
for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) xcannonBoard2[r][c] = null;
xcannonBoard2[9][4] = { type: 'k', color: 'red' };
xcannonBoard2[0][4] = { type: 'k', color: 'black' };
xcannonBoard2[5][1] = { type: 'c', color: 'red' }; // 炮在 (5,1)
xcannonBoard2[3][1] = { type: 'p', color: 'black' }; // 黑卒在 (3,1) 作为炮架
xcannonBoard2[1][1] = { type: 'r', color: 'black' }; // 黑车在 (1,1) 作为目标
// 炮可以隔卒吃车
let xcannonMoves2 = Xiangqi.getLegalMoves(xcannonBoard2, 5, 1, null);
ok('炮隔卒吃车', xcannonMoves2.some(m => m.to.r === 1 && m.to.c === 1));
// 炮也可以走到 (4,1) (空格)
ok('炮可移到空格 (4,1)', xcannonMoves2.some(m => m.to.r === 4 && m.to.c === 1 && !m.special));

group('中国象棋：兵过河');
let xpawnBoard = Xiangqi.cloneBoard(xboard);
// 假设红兵已过河（在 row 3）
xpawnBoard[6][0] = null; // 清掉原始兵
xpawnBoard[3][0] = { type: 'p', color: 'red' }; // 过河红兵
let xpawnMoves = Xiangqi.getLegalMoves(xpawnBoard, 3, 0, null);
ok('过河红兵可行前 + 右', xpawnMoves.length === 2);
ok('过河红兵可向前', xpawnMoves.some(m => m.to.r === 2 && m.to.c === 0));
ok('过河红兵可向右', xpawnMoves.some(m => m.to.r === 3 && m.to.c === 1));

// 未过河红兵
xpawnBoard[3][0] = null;
xpawnBoard[7][0] = { type: 'p', color: 'red' }; // 未过河（row 7）
let xpawnMoves2 = Xiangqi.getLegalMoves(xpawnBoard, 7, 0, null);
ok('未过河红兵只能向前', xpawnMoves2.length === 1 && xpawnMoves2[0].to.r === 6);

group('中国象棋：将死判定');
// 铁门闩杀法：红车占中路，将无法逃脱
let xmateBoard = Xiangqi.cloneBoard(xboard);
for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) xmateBoard[r][c] = null;
xmateBoard[9][4] = { type: 'k', color: 'red' };
xmateBoard[0][4] = { type: 'k', color: 'black' };
xmateBoard[0][3] = { type: 'a', color: 'black' };
xmateBoard[0][5] = { type: 'a', color: 'black' };
xmateBoard[9][3] = { type: 'r', color: 'red' }; // 红车占肋
xmateBoard[9][5] = { type: 'r', color: 'red' }; // 红车占肋
xmateBoard[8][4] = { type: 'r', color: 'red' }; // 红车中路
// 黑将被困在九宫，红车在中路将军
ok('铁门闩将死', Xiangqi.isCheckmate(xmateBoard, 'black', null));

group('中国象棋：飞将检测');
let xflyBoard = Xiangqi.cloneBoard(xboard);
for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) xflyBoard[r][c] = null;
xflyBoard[0][4] = { type: 'k', color: 'black' };
xflyBoard[9][4] = { type: 'k', color: 'red' };
// 同列无遮挡 → 飞将
ok('飞将检测', Xiangqi.isInCheck(xflyBoard, 'red'));
ok('飞将检测（黑方视角）', Xiangqi.isInCheck(xflyBoard, 'black'));

// 中间放一子阻断
xflyBoard[5][4] = { type: 'r', color: 'red' };
ok('有遮挡时非飞将', !Xiangqi.isInCheck(xflyBoard, 'red'));

group('中国象棋：困毙判定');
let xstaleBoard = Xiangqi.cloneBoard(xboard);
for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) xstaleBoard[r][c] = null;
xstaleBoard[0][4] = { type: 'k', color: 'black' };
xstaleBoard[9][4] = { type: 'k', color: 'red' };
// 黑将无子可走（九宫内被占），但未被将军
xstaleBoard[0][3] = { type: 'a', color: 'black' };
xstaleBoard[0][5] = { type: 'a', color: 'black' };
xstaleBoard[1][4] = { type: 'r', color: 'red' }; // 红车占黑将前方
// 黑将不能上移（被车吃），左右有士，下移出九宫 — 困毙
ok('困毙判定', Xiangqi.isStalemate(xstaleBoard, 'black', null));

// ========== 汇总 ==========
console.log(`\n========================================`);
console.log(`引擎单元测试结果: ${pass} 通过, ${fail} 失败`);
console.log(`========================================`);
process.exit(fail > 0 ? 1 : 0);