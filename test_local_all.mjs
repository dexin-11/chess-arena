// 当面对战逻辑综合测试 —— 覆盖全部三种棋种
// 做法：从 src/index.js 提取真实客户端脚本，在 vm 沙箱中运行（mock DOM），
// 分别验证五子棋连五、国际象棋 Fool's Mate 将杀、中国象棋闷宫炮将杀。
// 运行：node test_local_all.mjs

import fs from 'node:fs';
import vm from 'node:vm';
import { URLSearchParams } from 'node:url';

const SRC_PATH = new URL('./src/index.js', import.meta.url).pathname;

function extractClientScript(src) {
  const ghStart = src.indexOf('const GAME_HTML = `');
  if (ghStart === -1) throw new Error('未找到 GAME_HTML');
  const scriptOpen = src.indexOf('<script>', ghStart);
  if (scriptOpen === -1) throw new Error('未找到对局页 <script> 起始');
  const exportIdx = src.indexOf('export default', scriptOpen);
  const scriptClose = src.lastIndexOf('</script>', exportIdx);
  if (scriptClose === -1 || scriptClose < scriptOpen) throw new Error('未找到对局页 </script> 结束');
  return src.slice(scriptOpen + '<script>'.length, scriptClose);
}

function makeMockElement() {
  const el = {};
  el.style = {};
  el.dataset = {};
  el._children = [];
  el._set = new Set();
  el.classList = {
    add: (c) => el._set.add(c),
    remove: (c) => el._set.delete(c),
    contains: (c) => el._set.has(c),
    toggle: (c) => (el._set.has(c) ? el._set.delete(c) : el._set.add(c)),
  };
  el.textContent = '';
  el.innerHTML = '';
  el.className = '';
  el.value = '';
  el._attrs = {};
  el.setAttribute = (k, v) => { el._attrs[k] = v; };
  el.getAttribute = (k) => el._attrs[k];
  el.appendChild = (child) => { el._children.push(child); return child; };
  el.removeChild = (child) => { el._children = el._children.filter((c) => c !== child); return child; };
  el.remove = () => {};
  el.querySelector = () => null;
  el.querySelectorAll = () => [];
  el.addEventListener = () => {};
  el.removeEventListener = () => {};
  el.insertBefore = (child) => { el._children.push(child); return child; };
  el.scrollIntoView = () => {};
  el.focus = () => {};
  el.click = () => {};
  return el;
}

function makeMockDocument() {
  const cache = new Map();
  const get = (id) => {
    if (!cache.has(id)) cache.set(id, makeMockElement());
    return cache.get(id);
  };
  return {
    getElementById: get,
    createElement: () => makeMockElement(),
    createElementNS: () => makeMockElement(),
    createTextNode: (t) => ({ textContent: t }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    body: makeMockElement(),
    documentElement: makeMockElement(),
  };
}

function buildSandbox(search) {
  const sandbox = {};
  sandbox.location = {
    search,
    href: 'http://localhost/' + search,
    origin: 'http://localhost',
    protocol: 'http:',
    host: 'localhost',
    pathname: '/',
  };
  sandbox.document = makeMockDocument();
  sandbox.navigator = { clipboard: { writeText: () => Promise.resolve() }, userAgent: 'node' };
  sandbox.crypto = { subtle: {}, getRandomValues: (arr) => arr };
  sandbox.localStorage = {
    _s: {},
    getItem: (k) => (sandbox.localStorage._s[k] ?? null),
    setItem: (k, v) => { sandbox.localStorage._s[k] = String(v); },
    removeItem: (k) => { delete sandbox.localStorage._s[k]; },
  };
  sandbox.WebSocket = class { constructor() { this.readyState = 0; } send() {} close() {} };
  sandbox.fetch = () => Promise.resolve({ text: () => Promise.resolve('') });
  sandbox.requestAnimationFrame = (cb) => { try { cb(); } catch {} return 0; };
  sandbox.cancelAnimationFrame = () => {};
  sandbox.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  sandbox.addEventListener = () => {};
  sandbox.removeEventListener = () => {};
  sandbox.setTimeout = () => 0;
  sandbox.clearTimeout = () => {};
  sandbox.setInterval = () => 0;
  sandbox.clearInterval = () => {};
  sandbox.console = console;
  sandbox.URLSearchParams = URLSearchParams;
  sandbox.URL = URL;
  sandbox.encodeURIComponent = encodeURIComponent;
  sandbox.decodeURIComponent = decodeURIComponent;
  sandbox.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
  sandbox.atob = (s) => Buffer.from(s, 'base64').toString('binary');
  sandbox.alert = () => {};
  sandbox.isSecureContext = false;
  sandbox.innerWidth = 1024;
  sandbox.innerHeight = 768;
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  return sandbox;
}

// 追加 bootstrap：将 let/const 词法作用域内的状态通过 getter 暴露到 globalThis
const BOOTSTRAP = `
;globalThis.__SB = {
  applyLocalGomokuMove, applyLocalChessMove, applyLocalXiangqiMove,
  document,
  get localMode(){return localMode},
  get gameType(){return gameType},
  get currentTurn(){return currentTurn},
  get myColor(){return myColor},
  get gameOver(){return gameOver},
  get draw(){return draw},
  get boardData(){return boardData},
  get chessBoardData(){return chessBoardData},
  get chessState(){return chessState},
  get xiangqiBoardData(){return xiangqiBoardData},
  get xiangqiState(){return xiangqiState},
  get moveHistory(){return moveHistory},
  get lastMove(){return lastMove},
  get checkColor(){return checkColor},
};
;globalThis.__setBoard = function(name, board) {
  if (name === 'xiangqiBoardData') xiangqiBoardData = board;
  else if (name === 'chessBoardData') chessBoardData = board;
};
;globalThis.__setState = function(o) {
  if ('xiangqiState' in o) xiangqiState = o.xiangqiState;
  if ('currentTurn' in o) currentTurn = o.currentTurn;
  if ('myColor' in o) myColor = o.myColor;
  if ('gameOver' in o) gameOver = o.gameOver;
  if ('draw' in o) draw = o.draw;
  if ('checkColor' in o) checkColor = o.checkColor;
  if ('xiangqiSelected' in o) xiangqiSelected = o.xiangqiSelected;
  if ('xiangqiLegalMoves' in o) xiangqiLegalMoves = o.xiangqiLegalMoves;
};
`;

// 运行指定 URL 进入的客户端脚本，返回沙箱（通过 __SB 访问内部状态）
function runClient(search) {
  const src = fs.readFileSync(SRC_PATH, 'utf8');
  const clientScript = extractClientScript(src) + BOOTSTRAP;
  const sandbox = buildSandbox(search);
  vm.createContext(sandbox);
  vm.runInContext(clientScript, sandbox, { filename: 'client-script.js' });
  return sandbox;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ─── 测试 1：五子棋连五 ───
function testGomoku() {
  const sb = runClient('?game=gomoku&mode=local');
  const S = sb.__SB;
  assert(S.localMode, 'localMode 应为 true');
  assert(S.gameType === 'gomoku', '棋种应为 gomoku');
  assert(S.currentTurn === 'black', '黑棋应先行');
  assert(S.myColor === S.currentTurn, 'myColor 应跟随 currentTurn');
  assert(!S.gameOver, '初始不应 gameOver');

  const seq = [
    ['black', 0, 0], ['white', 0, 1],
    ['black', 1, 0], ['white', 1, 1],
    ['black', 2, 0], ['white', 2, 1],
    ['black', 3, 0], ['white', 3, 1],
    ['black', 4, 0],
  ];
  for (let i = 0; i < seq.length; i++) {
    const [, r, c] = seq[i];
    const mover = S.currentTurn;
    S.applyLocalGomokuMove(r, c);
    assert(S.boardData[r][c] === mover, `第${i + 1}步落子未记录`);
    if (!S.gameOver) {
      const expected = mover === 'black' ? 'white' : 'black';
      assert(S.currentTurn === expected, `第${i + 1}步后回合未切换`);
      assert(S.myColor === S.currentTurn, `第${i + 1}步后 myColor 未跟随`);
    }
  }
  assert(S.gameOver, '黑棋连五后应 gameOver');
  assert(!S.draw, '不应误判和棋');
  const txt = S.document.getElementById('resultText').textContent;
  assert(txt.includes('黑棋') && txt.includes('胜利'), '结果文案应含"黑棋胜利": ' + txt);
  assert(S.moveHistory.length === 10, '快照数应为 10: ' + S.moveHistory.length);
}

// ─── 测试 2：国际象棋 Fool's Mate 将杀 ───
// 1.f3 e5 2.g4 Qh4# （黑后四步绝杀白王）
function testChess() {
  const sb = runClient('?game=chess&mode=local');
  const S = sb.__SB;
  assert(S.localMode, 'localMode 应为 true');
  assert(S.gameType === 'chess', '棋种应为 chess');
  assert(S.currentTurn === 'white', '白棋应先行');
  assert(!S.gameOver, '初始不应 gameOver');

  const moves = [
    // 1.f3：白兵 f2→f3，坐标 (6,5)->(5,5)
    { from: { r: 6, c: 5 }, to: { r: 5, c: 5 }, mover: 'white' },
    // 1...e5：黑兵 e7→e5，坐标 (1,4)->(3,4)
    { from: { r: 1, c: 4 }, to: { r: 3, c: 4 }, mover: 'black' },
    // 2.g4：白兵 g2→g4，坐标 (6,6)->(4,6)
    { from: { r: 6, c: 6 }, to: { r: 4, c: 6 }, mover: 'white' },
    // 2...Qh4#：黑后 d8→h4，坐标 (0,3)->(4,7)
    { from: { r: 0, c: 3 }, to: { r: 4, c: 7 }, mover: 'black', mate: true },
  ];

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    assert(S.currentTurn === m.mover, `第${i + 1}步回合错: 期望 ${m.mover} 实际 ${S.currentTurn}`);
    S.applyLocalChessMove({ from: m.from, to: m.to });
    assert(S.chessBoardData[m.to.r][m.to.c] !== null, `第${i + 1}步目标格应非空`);
    assert(S.lastMove.from.r === m.from.r && S.lastMove.to.r === m.to.r, `第${i + 1}步 lastMove 未记录`);
    if (m.mate) {
      assert(S.gameOver, 'Qh4 后应判定 gameOver（将杀）');
      assert(!S.draw, '不应为和棋');
      const txt = S.document.getElementById('resultText').textContent;
      assert(txt.includes('黑') && txt.includes('胜利'), '结果文案应含黑方胜利: ' + txt);
    } else {
      assert(!S.gameOver, `第${i + 1}步不应结束对局`);
      const expected = m.mover === 'white' ? 'black' : 'white';
      assert(S.currentTurn === expected, `第${i + 1}步后回合未切换`);
      assert(S.myColor === S.currentTurn, `第${i + 1}步后 myColor 未跟随`);
    }
  }
  assert(S.gameOver, '对局应已结束');
  // 隐藏项确认
  for (const id of ['copyBtn', 'waitBtn', 'drawBtn', 'chatPanel', 'playerStatus']) {
    assert(S.document.getElementById(id).style.display === 'none', id + ' 应隐藏');
  }
}

// ─── 测试 3：中国象棋 闷宫炮 将杀 ───
// 构造位置：黑将困于宫中（被己方仕包围），红炮隔仕照将，绝杀。
function testXiangqi() {
  const sb = runClient('?game=xiangqi&mode=local');
  const S = sb.__SB;
  assert(S.localMode, 'localMode 应为 true');
  assert(S.gameType === 'xiangqi', '棋种应为 xiangqi');
  assert(S.currentTurn === 'red', '红棋应先行');

  // 先验证一回合普通走子（红兵前进 → 黑兵前进）引擎集成正常
  assert(!S.gameOver, '初始不应 gameOver');
  // 红兵 (6,4) → (5,4)
  S.applyLocalXiangqiMove({ from: { r: 6, c: 4 }, to: { r: 5, c: 4 } });
  assert(S.xiangqiBoardData[5][4] && S.xiangqiBoardData[5][4].type === 'p' && S.xiangqiBoardData[5][4].color === 'red', '红兵应移动到 (5,4)');
  assert(S.xiangqiBoardData[6][4] === null, '原格 (6,4) 应清空');
  assert(!S.gameOver, '走子后不应结束');
  assert(S.currentTurn === 'black', '应轮到黑方');
  assert(S.myColor === 'black', 'myColor 应为 black');
  // 黑兵 (3,0) → (4,0)（过河）
  S.applyLocalXiangqiMove({ from: { r: 3, c: 0 }, to: { r: 4, c: 0 } });
  assert(S.xiangqiBoardData[4][0] && S.xiangqiBoardData[4][0].color === 'black', '黑卒应移动到 (4,0)');
  assert(S.currentTurn === 'red', '应轮到红方');
  assert(S.moveHistory.length >= 3, '快照数应增长');

  // 构造闷宫炮绝杀位置
  // 黑将 (0,4) 被己方仕包围无法移动；仕 (1,4) 作炮架，其斜向出口 (2,3)/(2,5) 被黑卒封堵；
  // 红炮从 (4,4) 移至 (2,4)，隔 (1,4) 黑仕照将黑将，绝杀。
  const board = Array.from({ length: 10 }, () => Array(9).fill(null));
  board[0][3] = { type: 'a', color: 'black' }; // 黑仕（围将）
  board[0][4] = { type: 'k', color: 'black' }; // 黑将（被围）
  board[0][5] = { type: 'a', color: 'black' }; // 黑仕（围将）
  board[1][4] = { type: 'a', color: 'black' }; // 黑仕（炮架/屏风，出口被封无法移动）
  board[2][3] = { type: 'p', color: 'black' }; // 黑卒（封堵仕的斜向出口）
  board[2][5] = { type: 'p', color: 'black' }; // 黑卒（封堵仕的斜向出口）
  board[4][4] = { type: 'c', color: 'red' };   // 红炮（待走至 (2,4)）
  board[9][4] = { type: 'k', color: 'red' };    // 红帅
  sb.__setBoard('xiangqiBoardData', board);
  sb.__setState({ xiangqiState: null, currentTurn: 'red', myColor: 'red', gameOver: false, draw: false, checkColor: null, xiangqiSelected: null, xiangqiLegalMoves: [] });

  // 红炮 (4,4) → (2,4)：隔 (1,4) 黑仕照将黑将 (0,4)
  S.applyLocalXiangqiMove({ from: { r: 4, c: 4 }, to: { r: 2, c: 4 } });
  assert(S.xiangqiBoardData[2][4] && S.xiangqiBoardData[2][4].type === 'c', '红炮应移动到 (2,4)');
  assert(S.xiangqiBoardData[4][4] === null, '原格 (4,4) 应清空');
  assert(S.gameOver, '闷宫炮应判定 gameOver（将杀）');
  assert(!S.draw, '不应为和棋');
  const txt = S.document.getElementById('resultText').textContent;
  assert(txt.includes('红') && txt.includes('胜利'), '结果文案应含红方胜利: ' + txt);
}

// ─── 主流程 ───
const tests = [
  ['五子棋·连五', testGomoku],
  ['国际象棋·Fool\'s Mate 将杀', testChess],
  ['中国象棋·闷宫炮将杀', testXiangqi],
];

let passed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  FAIL  ${name}`);
    console.error('       ' + e.message);
    if (e.stack) console.error('       ' + e.stack.split('\n').slice(1, 3).join('\n       '));
  }
}

console.log(`\n${passed}/${tests.length} 项通过`);
process.exit(passed === tests.length ? 0 : 1);
