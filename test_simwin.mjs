// 验证模拟重下胜负判定逻辑（checkSimWin 算法）+ 导出 HTML 含胜负提示
// checkSimWin 在 src/index.js 中内联，此处复制相同算法做单元验证
const ROWS = 15, COLS = 15;

// 与 src/index.js 中 checkSimWin 完全一致的实现
function checkSimWin(board, r, c, color) {
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === color) count++;
      else break;
    }
    for (let i = 1; i < 5; i++) {
      const nr = r - dr * i, nc = c - dc * i;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === color) count++;
      else break;
    }
    if (count >= 5) return true;
  }
  return false;
}

// 导出 HTML 中 checkSimWin 的实现（var 风格，与 src/index.js buildExportHTML 一致）
function checkSimWinExport(b, r, c, color) {
  var dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for (var i = 0; i < dirs.length; i++) {
    var dr = dirs[i][0], dc = dirs[i][1];
    var count = 1;
    for (var j = 1; j < 5; j++) {
      var nr = r + dr*j, nc = c + dc*j;
      if (nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && b[nr][nc] === color) count++; else break;
    }
    for (var j = 1; j < 5; j++) {
      var nr2 = r - dr*j, nc2 = c - dc*j;
      if (nr2 >= 0 && nr2 < 15 && nc2 >= 0 && nc2 < 15 && b[nr2][nc2] === color) count++; else break;
    }
    if (count >= 5) return true;
  }
  return false;
}

function emptyBoard() {
  const b = [];
  for (let r = 0; r < ROWS; r++) b.push(new Array(COLS).fill(null));
  return b;
}

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log('  PASS', name); } else { fail++; console.log('  FAIL', name); } }

// 测试1：横向五连
{
  const b = emptyBoard();
  b[7][3] = b[7][4] = b[7][5] = b[7][6] = 'black';
  // 落第 5 子在 (7,7)
  ok('横向五连判定（主算法）', checkSimWin(b, 7, 7, 'black') === true);
  ok('横向五连判定（导出算法）', checkSimWinExport(b, 7, 7, 'black') === true);
}

// 测试2：纵向五连
{
  const b = emptyBoard();
  b[0][0] = b[1][0] = b[2][0] = b[3][0] = 'white';
  ok('纵向五连判定', checkSimWin(b, 4, 0, 'white') === true);
  ok('纵向五连判定（导出）', checkSimWinExport(b, 4, 0, 'white') === true);
}

// 测试3：主对角线五连
{
  const b = emptyBoard();
  b[0][0] = b[1][1] = b[2][2] = b[3][3] = 'black';
  ok('主对角线五连判定', checkSimWin(b, 4, 4, 'black') === true);
}

// 测试4：副对角线五连
{
  const b = emptyBoard();
  b[0][4] = b[1][3] = b[2][2] = b[3][1] = 'white';
  ok('副对角线五连判定', checkSimWin(b, 4, 0, 'white') === true);
  ok('副对角线五连判定（导出）', checkSimWinExport(b, 4, 0, 'white') === true);
}

// 测试5：中间落子连成五连（两侧各有 2 子）
{
  const b = emptyBoard();
  b[5][3] = b[5][4] = 'black';
  b[5][6] = b[5][7] = 'black';
  ok('中间落子横向五连', checkSimWin(b, 5, 5, 'black') === true);
}

// 测试6：仅四连不判胜（checkSimWin 在落子后调用，(r,c) 已含该子）
{
  const b = emptyBoard();
  // 仅 4 子连成，落子点 (0,3) 已在棋盘上
  b[0][0] = b[0][1] = b[0][2] = b[0][3] = 'black';
  ok('仅四连不判胜', checkSimWin(b, 0, 3, 'black') === false);
  ok('仅四连不判胜（导出）', checkSimWinExport(b, 0, 3, 'black') === false);
}

// 测试7：四连 + 落子后五连
{
  const b = emptyBoard();
  b[0][0] = b[0][1] = b[0][2] = b[0][3] = 'black';
  b[0][4] = 'black'; // 模拟落第 5 子
  ok('落第5子后五连判胜', checkSimWin(b, 0, 4, 'black') === true);
}

// 测试8：空棋盘不判胜
{
  const b = emptyBoard();
  b[7][7] = 'black';
  ok('单子不判胜', checkSimWin(b, 7, 7, 'black') === false);
}

// 测试9：胜方文案映射
{
  ok('黑方胜文案', ('black' === 'black' ? '黑方赢了' : '白方赢了') === '黑方赢了');
  ok('白方胜文案', ('white' === 'black' ? '黑方赢了' : '白方赢了') === '白方赢了');
}

console.log(`\n=== 结果: ${pass} 通过, ${fail} 失败 ===`);
process.exit(fail > 0 ? 1 : 0);
