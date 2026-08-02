// 验证复盘：模拟一局五子棋走子 + 终局，检查 moveHistory 快照逻辑
// 此测试直接验证服务端走子转发与终局 sync 流程（复盘快照在客户端记录，此处验证服务端数据链路）
const BASE = 'ws://localhost:8787/ws';
let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log('  PASS', name); } else { fail++; console.log('  FAIL', name); } }

function connect(room, game) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${BASE}?room=${room}&game=${game}`);
    const inbox = [];
    ws.addEventListener('message', (ev) => { inbox.push(JSON.parse(ev.data)); });
    ws.addEventListener('error', () => reject(new Error('ws error')));
    ws.addEventListener('open', () => resolve({ ws, inbox }));
    setTimeout(() => reject(new Error('connect timeout')), 5000);
  });
}
async function connectPair(room, game) {
  const [pa, pb] = await Promise.all([connect(room, game), connect(room, game)]);
  const ca = await waitFor(pa.ws, pa.inbox, 'colorAssign');
  const cb = await waitFor(pb.ws, pb.inbox, 'colorAssign');
  return [{ ws: pa.ws, inbox: pa.inbox, color: ca.you }, { ws: pb.ws, inbox: pb.inbox, color: cb.you }];
}
function waitFor(ws, inbox, type, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const found = inbox.find(m => m.type === type);
    if (found) return resolve(found);
    const onMsg = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === type) { ws.removeEventListener('message', onMsg); resolve(msg); }
    };
    ws.addEventListener('message', onMsg);
    setTimeout(() => { ws.removeEventListener('message', onMsg); reject(new Error('timeout ' + type)); }, timeout);
  });
}
function send(ws, obj) { ws.send(JSON.stringify(obj)); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 等待 inbox 中 type 类消息数量超过 beforeCount，返回新增的最后一条
function waitForNew(ws, inbox, type, beforeCount, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const check = () => inbox.filter(m => m.type === type).length;
    if (check() > beforeCount) return resolve(inbox.filter(m => m.type === type).pop());
    const onMsg = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === type && check() > beforeCount) {
        ws.removeEventListener('message', onMsg);
        resolve(inbox.filter(m => m.type === type).pop());
      }
    };
    ws.addEventListener('message', onMsg);
    setTimeout(() => { ws.removeEventListener('message', onMsg); reject(new Error('timeout ' + type)); }, timeout);
  });
}

async function testGomokuReviewHistory() {
  console.log('\n[Test] 五子棋走子 → 终局 sync 链路完整（复盘数据源）');
  const [a, b] = await connectPair('REVIEW1', 'gomoku');
  await waitFor(a.ws, a.inbox, 'sync');
  await waitFor(b.ws, b.inbox, 'sync');

  // 先手（黑方）连成 5 子获胜（同一行 0,0 0,1 0,2 0,3 0,4）
  // 后手（白方）在第 1 行落子，不阻挡第 0 行
  const firstPlayer = a.color === 'black' ? a : b;
  const secondPlayer = a.color === 'black' ? b : a;
  const movesFirst = [[0,0],[0,1],[0,2],[0,3],[0,4]];
  const movesSecond = [[1,0],[1,1],[1,2],[1,3]];
  let fi = 0, si = 0;
  for (let step = 0; step < 9; step++) {
    if (step % 2 === 0) {
      const [r, c] = movesFirst[fi++];
      send(firstPlayer.ws, { type: 'move', row: r, col: c });
    } else {
      const [r, c] = movesSecond[si++];
      send(secondPlayer.ws, { type: 'move', row: r, col: c });
    }
    await sleep(80);
  }

  // 应收到 gameOver（含 winner）与最终 sync（含完整棋盘）
  // gameOver 仅终局发送，直接等待；sync 取 inbox 中最后一条（开局 sync 也会到达）
  let gameOverMsg = null;
  try { gameOverMsg = await waitFor(firstPlayer.ws, firstPlayer.inbox, 'gameOver', 3000); } catch (e) {}
  // 等待终局 sync（可能稍晚于 gameOver 到达）
  await sleep(100);
  const syncs = firstPlayer.inbox.filter(m => m.type === 'sync');
  const syncMsg = syncs[syncs.length - 1];

  ok('先手收到 gameOver', !!gameOverMsg);
  ok('gameOver winner=先手颜色', gameOverMsg && gameOverMsg.winner === firstPlayer.color);
  ok('先手收到终局 sync', !!syncMsg);
  ok('sync 棋盘含第 5 子', syncMsg && syncMsg.board[0][4] === firstPlayer.color);
  ok('sync gameOver=true', syncMsg && syncMsg.gameOver === true);

  // 验证整局 moveUpdate 数量（前 8 步非终局，broadcast 给双方）
  const moveUpdates = firstPlayer.inbox.filter(m => m.type === 'moveUpdate');
  ok('非终局 moveUpdate 数量正确（应为 8）', moveUpdates.length === 8);

  a.ws.close(); b.ws.close();
}

async function testChessReviewHistory() {
  console.log('\n[Test] 国际象棋走子 → moveUpdate 链路（复盘数据源）');
  const [a, b] = await connectPair('REVIEW2', 'chess');
  await waitFor(a.ws, a.inbox, 'sync');
  await waitFor(b.ws, b.inbox, 'sync');

  // 白方 e2-e4, 黑方 e7-e5（合法开局）
  // colorAssign 中 you=white 者先手
  const whitePlayer = a.color === 'white' ? a : b;
  const blackPlayer = a.color === 'white' ? b : a;

  send(whitePlayer.ws, { type: 'move', from: { r: 6, c: 4 }, to: { r: 4, c: 4 } });
  const blackMuBefore = blackPlayer.inbox.filter(m => m.type === 'moveUpdate').length;
  let mu1;
  try { mu1 = await waitForNew(blackPlayer.ws, blackPlayer.inbox, 'moveUpdate', blackMuBefore, 3000); } catch (e) {}
  ok('白方 e2-e4 后黑方收到 moveUpdate', !!mu1);
  ok('moveUpdate.color=white', mu1 && mu1.color === 'white');
  ok('moveUpdate.move.from=(6,4)', mu1 && mu1.move.from.r === 6 && mu1.move.from.c === 4);

  // 等待 whitePlayer 收到白方这步的 moveUpdate（broadcast 给双方），再发黑方
  const whiteMuBefore = whitePlayer.inbox.filter(m => m.type === 'moveUpdate').length;
  await waitForNew(whitePlayer.ws, whitePlayer.inbox, 'moveUpdate', whiteMuBefore, 3000).catch(() => {});
  const whiteMuBefore2 = whitePlayer.inbox.filter(m => m.type === 'moveUpdate').length;

  send(blackPlayer.ws, { type: 'move', from: { r: 1, c: 4 }, to: { r: 3, c: 4 } });
  let mu2 = null;
  try { mu2 = await waitForNew(whitePlayer.ws, whitePlayer.inbox, 'moveUpdate', whiteMuBefore2, 3000); } catch (e) {}
  ok('黑方 e7-e5 后白方收到 moveUpdate', !!mu2);
  ok('moveUpdate.color=black', mu2 && mu2.color === 'black');

  a.ws.close(); b.ws.close();
}

(async () => {
  try {
    await testGomokuReviewHistory();
    await testChessReviewHistory();
  } catch (e) {
    console.error('测试异常:', e);
  }
  console.log(`\n=== 结果: ${pass} 通过, ${fail} 失败 ===`);
  process.exit(fail > 0 ? 1 : 0);
})();
