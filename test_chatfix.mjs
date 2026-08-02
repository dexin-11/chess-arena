// 验证聊天密文转发与重连后密钥重协商（修复核心：消息不因密钥未建立而丢失）
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

async function testChatRelayAfterReconnect() {
  console.log('\n[Test] 重连后聊天密文转发正常（密钥重协商）');
  const [a, b] = await connectPair('FIXCHAT1', 'gomoku');
  await waitFor(a.ws, a.inbox, 'sync');
  await waitFor(b.ws, b.inbox, 'sync');

  // 模拟客户端：b 发送加密格式密文，a 应收到转发
  send(b.ws, { type: 'chat', iv: 'INITIV001', ct: 'CIPHERTEXT001' });
  let msg;
  try {
    msg = await waitFor(a.ws, a.inbox, 'chat');
    ok('a 收到加密聊天转发', msg.type === 'chat' && msg.iv === 'INITIV001' && msg.ct === 'CIPHERTEXT001');
    ok('转发不含明文 text', msg.text === undefined);
  } catch (e) { ok('a 收到加密聊天转发', false); console.log('    err:', e.message); }

  // b 断开后重连，再次发消息，a 仍应收到（验证重连不影响转发）
  b.ws.close();
  await waitFor(a.ws, a.inbox, 'opponentLeft');
  const b2 = await connect('FIXCHAT1', 'gomoku');
  await waitFor(b2.ws, b2.inbox, 'colorAssign');
  await waitFor(a.ws, a.inbox, 'opponentRejoin', 4000);

  // 清空 a 的 inbox，避免 waitFor 命中重连前的旧 chat 消息
  a.inbox.length = 0;
  send(b2.ws, { type: 'chat', iv: 'RECONNECTIV', ct: 'RECONNECTCT' });
  try {
    const msg2 = await waitFor(a.ws, a.inbox, 'chat', 3000);
    ok('b 重连后 a 仍收到聊天转发', msg2.iv === 'RECONNECTIV' && msg2.ct === 'RECONNECTCT');
  } catch (e) {
    ok('b 重连后 a 仍收到聊天转发', false);
    console.log('    err:', e.message);
  }
  a.ws.close(); b2.ws.close();
}

async function testPubKeyExchangeAfterReconnect() {
  console.log('\n[Test] 重连后公钥重新交换（密钥协商）');
  const [a, b] = await connectPair('FIXPK1', 'gomoku');
  await waitFor(a.ws, a.inbox, 'sync');
  await waitFor(b.ws, b.inbox, 'sync');

  // a 发公钥，b 收到
  send(a.ws, { type: 'pubKey', key: 'PUBKEY_A_V1' });
  try {
    const pk = await waitFor(b.ws, b.inbox, 'pubKey');
    ok('b 收到 a 的公钥', pk.key === 'PUBKEY_A_V1');
  } catch (e) { ok('b 收到 a 的公钥', false); }

  // b 断开重连，a 发新公钥，b 应收到新公钥
  b.ws.close();
  await waitFor(a.ws, a.inbox, 'opponentLeft');
  const b2 = await connect('FIXPK1', 'gomoku');
  await waitFor(b2.ws, b2.inbox, 'colorAssign');
  await waitFor(a.ws, a.inbox, 'opponentRejoin', 4000);

  send(a.ws, { type: 'pubKey', key: 'PUBKEY_A_V2' });
  try {
    const pk2 = await waitFor(b2.ws, b2.inbox, 'pubKey', 3000);
    ok('b 重连后收到 a 的新公钥', pk2.key === 'PUBKEY_A_V2');
  } catch (e) {
    ok('b 重连后收到 a 的新公钥', false);
    console.log('    err:', e.message);
  }
  a.ws.close(); b2.ws.close();
}

(async () => {
  try {
    await testChatRelayAfterReconnect();
    await testPubKeyExchangeAfterReconnect();
  } catch (e) {
    console.error('测试异常:', e);
  }
  console.log(`\n=== 结果: ${pass} 通过, ${fail} 失败 ===`);
  process.exit(fail > 0 ? 1 : 0);
})();
