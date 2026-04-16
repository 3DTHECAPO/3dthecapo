
const boardEl=document.getElementById('board'); const pieces={w:{K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙'},b:{K:'♚',Q:'♛',R:'♜',B:'♝',N:'♞',P:'♟'}}; let board,turn='w',selected=null,moves=[];
function start(){ board=[['bR','bN','bB','bQ','bK','bB','bN','bR'],['bP','bP','bP','bP','bP','bP','bP','bP'],['','','','','','','',''],['','','','','','','',''],['','','','','','','',''],['','','','','','','',''],['wP','wP','wP','wP','wP','wP','wP','wP'],['wR','wN','wB','wQ','wK','wB','wN','wR']]; turn='w'; selected=null; moves=[]; render(); setMsg('Tap a piece, then tap a highlighted square.'); }
function colorOf(p){return p?p[0]:null} function typeOf(p){return p?p[1]:null}
function setMsg(t){document.getElementById('msg').textContent=t} function setStatus(t){document.getElementById('status').textContent=t; document.getElementById('turn').textContent=turn==='w'?'White':'Black';}
function inside(x,y){return x>=0&&x<8&&y>=0&&y<8}
function addSlide(ms,x,y,dirs){dirs.forEach(([dx,dy])=>{ let nx=x+dx,ny=y+dy; while(inside(nx,ny)){ if(!board[ny][nx]) ms.push([nx,ny]); else { if(colorOf(board[ny][nx])!==turn) ms.push([nx,ny]); break; } nx+=dx; ny+=dy; } })}
function genMoves(x,y){ const p=board[y][x], t=typeOf(p), ms=[]; if(!p) return ms; if(t==='P'){ const dir=turn==='w'?-1:1; if(inside(x,y+dir)&&!board[y+dir][x]) ms.push([x,y+dir]); [[-1,dir],[1,dir]].forEach(([dx,dy])=>{const nx=x+dx,ny=y+dy;if(inside(nx,ny)&&board[ny][nx]&&colorOf(board[ny][nx])!==turn) ms.push([nx,ny])}); }
 if(t==='R') addSlide(ms,x,y,[[1,0],[-1,0],[0,1],[0,-1]]); if(t==='B') addSlide(ms,x,y,[[1,1],[1,-1],[-1,1],[-1,-1]]); if(t==='Q') addSlide(ms,x,y,[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
 if(t==='N') [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]].forEach(([dx,dy])=>{const nx=x+dx,ny=y+dy;if(inside(nx,ny)&&colorOf(board[ny][nx])!==turn) ms.push([nx,ny])});
 if(t==='K') [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dx,dy])=>{const nx=x+dx,ny=y+dy;if(inside(nx,ny)&&colorOf(board[ny][nx])!==turn) ms.push([nx,ny])}); return ms; }
function clickSq(x,y){ if(selected && moves.some(m=>m[0]===x&&m[1]===y)){ board[y][x]=board[selected[1]][selected[0]]; board[selected[1]][selected[0]]=''; turn=turn==='w'?'b':'w'; selected=null; moves=[]; render(); setStatus('Live'); return; }
 if(board[y][x] && colorOf(board[y][x])===turn){ selected=[x,y]; moves=genMoves(x,y); render(); }}
function render(){ boardEl.innerHTML=''; for(let y=0;y<8;y++) for(let x=0;x<8;x++){ const sq=document.createElement('div'); sq.className='sq '+(((x+y)%2===0)?'light':'dark'); if(selected&&selected[0]===x&&selected[1]===y) sq.classList.add('sel'); if(moves.some(m=>m[0]===x&&m[1]===y)) sq.classList.add('move'); const p=board[y][x]; if(p){ sq.textContent=pieces[p[0]][p[1]]; } sq.onclick=()=>clickSq(x,y); boardEl.appendChild(sq); } setStatus('Live'); }
document.getElementById('reset').onclick=start; start();
