// 本地当面对战（五子棋）逻辑测试
// 做法：从 src/index.js 提取真实的客户端 <script>，在 vm 沙箱中运行（mock DOM），
// 让 init() 以 ?game=gomoku&mode=local 进入当面对战模式，再由驱动代码调用
// applyLocalGomokuMove 模拟双方轮流落子，断言胜负判定与回合切换正确。
// 运行：node test_local_gomoku.mjs

import fs from 'node:fs';
import vm from 'node:vm';
import { URLSearchParams } from 'node:url';

const SRC_PATH = new URL('./src/index.js', import.meta.url).pathname;

// 1. 从源码中提取 GAME_HTML 里的客户端 <script> 真实内容
function extractClientScript(src) {
  const ghStart = src.indexOf('const GAME_HTML = `');
  if (ghStart === -1) throw new Error('未找到 GAME_HTML');
  const scriptOpen = src.indexOf('<script>', ghStart);
  if (scriptOpen === -1) throw new Error('未找到对局页 <script> 起始');
  // GAME_HTML 之后、export default 之前的最后一个 </script> 即客户端脚本结束
  const exportIdx = src.indexOf('export default', scriptOpen);
  const scriptClose = src.lastIndexOf('</script>', exportIdx);
  if (scriptClose === -1 || scriptClose < scriptOpen) throw new Error('未找到对局页 </script> 结束');
  return src.slice(scriptOpen + '<script>'.length, scriptClose);
}

// 2. 构造 mock DOM 与浏览器全局
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

function buildSandbox() {
  const sandbox = {};
  sandbox.location = {
    search: '?game=gomoku&mode=local',
    href: 'http://localhost/?game=gomoku&mode=local',
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
  sandbox.WebSocket = class { constructor() { this.readyState = 0; } send() {} close() {} set onopen(v){} set onmessage(v){} set onclose(v){} set onerror(v){} };
  sandbox.fetch = () => Promise.resolve({ text: () => Promise.resolve('') });
  sandbox.requestAnimationFrame = (cb) => { try { cb(); } catch {} return 0; };
  sandbox.cancelAnimationFrame = () => {};
  sandbox.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  sandbox.addEventListener = () => {};
  sandbox.removeEventListener = () => {};
  sandbox.setTimeout = (fn, t) => { /* 不真实触发，避免进程挂起 */ return 0; };
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
  sandbox.window = sandbox; // 自引用
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  return sandbox;
}

// 3. 驱动代码：在脚本作用域内执行，通过 globalThis.__test 回传结果
const DRIVER = `
;globalThis.__test = (function () {
  var report = { ok: false, errors: [], steps: [] };
  try {
    // 前置：init() 已在脚本末尾执行，因 mode=local 已进入 initLocalGame()
    if (!localMode) throw new Error('未进入当面对战模式 (localMode=false)');
    if (gameType !== 'gomoku') throw new Error('棋种非五子棋: ' + gameType);
    if (gameOver) throw new Error('初始即 gameOver');
    if (currentTurn !== 'black') throw new Error('黑棋未先行: ' + currentTurn);
    if (myColor !== currentTurn) throw new Error('myColor 与 currentTurn 不同步');

    // 棋谱：黑棋在 col=0 的 row 0..4 连五；白棋在 col=1 的 row 0..3 应对
    var seq = [
      ['black', 0, 0], ['white', 0, 1],
      ['black', 1, 0], ['white', 1, 1],
      ['black', 2, 0], ['white', 2, 1],
      ['black', 3, 0], ['white', 3, 1],
      ['black', 4, 0],
    ];
    for (var i = 0; i < seq.length; i++) {
      var mover = seq[i][0], r = seq[i][1], c = seq[i][2];
      var beforeTurn = currentTurn;
      var beforeOver = gameOver;
      if (currentTurn !== mover) throw new Error('第' + (i + 1) + '步回合错: 期望 ' + mover + ' 实际 ' + currentTurn);
      if (boardData[r][c]) throw new Error('第' + (i + 1) + '步落子点非空');
      applyLocalGomokuMove(r, c);
      var afterTurn = currentTurn;
      var afterOver = gameOver;
      report.steps.push({ idx: i + 1, mover, r, c, beforeTurn, afterTurn, beforeOver, afterOver });
      if (!afterOver) {
        // 未结束：回合应切换到对方，myColor 跟随
        var expected = mover === 'black' ? 'white' : 'black';
        if (afterTurn !== expected) throw new Error('第' + (i + 1) + '步后回合未切换: 期望 ' + expected + ' 实际 ' + afterTurn);
        if (myColor !== afterTurn) throw new Error('第' + (i + 1) + '步后 myColor 未跟随');
        if (boardData[r][c] !== mover) throw new Error('第' + (i + 1) + '步落子未记录');
      }
    }

    // 最终：黑棋应已连五取胜
    if (!gameOver) throw new Error('黑棋连五后未判定 gameOver');
    if (draw) throw new Error('误判为和棋');
    // 终局时 currentTurn 保持为胜方（与在线模式服务端 handleMove 行为一致：胜时不切换回合）
    if (currentTurn !== 'black') throw new Error('终局回合非胜方(黑): ' + currentTurn);
    // 校验连五
    for (var rr = 0; rr <= 4; rr++) {
      if (boardData[rr][0] !== 'black') throw new Error('col0 row' + rr + ' 不是黑子: ' + boardData[rr][0]);
    }
    // 白棋 4 子应记录在 col1
    for (var wr = 0; wr <= 3; wr++) {
      if (boardData[wr][1] !== 'white') throw new Error('col1 row' + wr + ' 不是白子');
    }
    // 结果浮层应显示且文案为黑棋胜利
    var overlay = document.getElementById('resultOverlay');
    if (overlay.classList.contains('hidden')) throw new Error('结果浮层未显示');
    var txt = document.getElementById('resultText').textContent;
    if (txt.indexOf('黑棋') === -1 || txt.indexOf('胜利') === -1) throw new Error('结果文案异常: ' + txt);
    // 当面对战隐藏项应已 display:none
    ['copyBtn', 'waitBtn', 'drawBtn', 'chatPanel', 'playerStatus'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el.style.display !== 'none') throw new Error(id + ' 未隐藏');
    });
    // moveHistory 应含开局 + 9 步 = 10 个快照
    if (moveHistory.length !== 10) throw new Error('快照数异常: ' + moveHistory.length + ' (期望 10)');

    report.ok = true;
    report.final = {
      gameOver: gameOver,
      draw: draw,
      resultText: txt,
      moveHistoryLen: moveHistory.length,
      currentTurn: currentTurn,
    };
  } catch (e) {
    report.errors.push(e.message + (e.stack ? '\\n' + e.stack : ''));
  }
  return report;
})();
`;

// 4. 执行
const src = fs.readFileSync(SRC_PATH, 'utf8');
const clientScript = extractClientScript(src);
const sandbox = buildSandbox();
vm.createContext(sandbox);

try {
  vm.runInContext(clientScript + DRIVER, sandbox, { filename: 'client-script.js' });
} catch (e) {
  console.error('脚本执行抛出异常:', e.message);
  console.error(e.stack);
  process.exit(1);
}

const report = sandbox.__test;
if (!report) {
  console.error('未取到测试结果');
  process.exit(1);
}

console.log('=== 当面对战（五子棋）逻辑测试 ===\n');
console.log('步骤明细:');
for (const s of report.steps) {
  const tag = s.afterOver ? '终局' : (s.afterTurn + ' 轮');
  console.log(`  第${s.idx}步 ${s.mover} (${s.r},${s.c}) -> ${tag}`);
}
console.log('');
if (report.ok) {
  console.log('结果:', JSON.stringify(report.final));
  console.log('\nPASS: 当面对战五子棋连五判定、回合切换、结果浮层、隐藏项均符合预期');
  process.exit(0);
} else {
  console.error('FAIL:');
  for (const err of report.errors) console.error('  -', err);
  process.exit(1);
}
