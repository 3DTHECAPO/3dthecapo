
const boardEl = document.getElementById('board');
const statusText = document.getElementById('statusText');
const turnPill = document.getElementById('turnPill');
const whiteCapsEl = document.getElementById('whiteCaps');
const blackCapsEl = document.getElementById('blackCaps');
const glyph = {
  wk:'♔', wq:'♕', wr:'♖', wb:'♗', wn:'♘', wp:'♙',
  bk:'♚', bq:'♛', br:'♜', bb:'♝', bn:'♞', bp:'♟'
};
let state, turn, selected, legalMoves, whiteCaps, blackCaps;
function reset(){
 state = [
 ['br','bn','bb','bq','bk','bb','bn','br'],
 ['bp','bp','bp','bp','bp','bp','bp','bp'],
 ['','','','','','','',''],['','','','','','','',''],['','','','','','','',''],['','','','','','','',''],
 ['wp','wp','wp','wp','wp','wp','wp','wp'],
 ['wr','wn','wb','wq','wk','wb','wn','wr']
 ];
 turn='w'; selected=null; legalMoves=[]; whiteCaps=[]; blackCaps=[]; render();
}
function inside(r,c){ return r>=0&&r<8&&c>=0&&c<8; }
function colorOf(p){ return p ? p[0] : ''; }
function cloneMoves(list){ return list.map(m=>({...m})); }
function pathClear(fr,fc,tr,tc){ const sr=Math.sign(tr-fr), sc=Math.sign(tc-fc); let r=fr+sr,c=fc+sc; while(r!==tr || c!==tc){ if(state[r][c]) return false; r+=sr; c+=sc; } return true; }
function getMoves(r,c){
 const p=state[r][c]; if(!p) return []; const color=p[0], type=p[1], moves=[]; const dir=color==='w'?-1:1;
 const add=(rr,cc,captureOnly=false)=>{ if(!inside(rr,cc)) return; const t=state[rr][cc]; if(captureOnly){ if(t && colorOf(t)!==color) moves.push({r:rr,c:cc,capture:true}); return; } if(!t) moves.push({r:rr,c:cc}); else if(colorOf(t)!==color) moves.push({r:rr,c:cc,capture:true}); };
 if(type==='p'){ add(r+dir,c); if(((color==='w'&&r===6)||(color==='b'&&r===1)) && !state[r+dir][c] && !state[r+2*dir][c]) moves.push({r:r+2*dir,c}); add(r+dir,c-1,true); add(r+dir,c+1,true); return moves.filter(m=>inside(m.r,m.c)); }
 if(type==='n'){ [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(([dr,dc])=>add(r+dr,c+dc)); return moves; }
 const lines=[]; if(type==='b'||type==='q') lines.push([1,1],[1,-1],[-1,1],[-1,-1]); if(type==='r'||type==='q') lines.push([1,0],[-1,0],[0,1],[0,-1]);
 if(type==='k'){ [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>add(r+dr,c+dc)); return moves; }
 for(const [dr,dc] of lines){ let rr=r+dr, cc=c+dc; while(inside(rr,cc)){ const t=state[rr][cc]; if(!t){ moves.push({r:rr,c:cc}); } else { if(colorOf(t)!==color) moves.push({r:rr,c:cc,capture:true}); break; } rr+=dr; cc+=dc; } }
 return moves;
}
function render(){
 boardEl.innerHTML='';
 for(let r=0;r<8;r++) for(let c=0;c<8;c++){
   const sq=document.createElement('button'); sq.className=`square ${((r+c)%2)?'dark':'light'}`; sq.type='button';
   if(selected && selected.r===r && selected.c===c) sq.classList.add('sel');
   const legal = legalMoves.find(m=>m.r===r&&m.c===c); if(legal) sq.classList.add(legal.capture?'capture':'move');
   sq.onclick=()=>clickSquare(r,c);
   const piece=state[r][c]; if(piece){ const d=document.createElement('div'); d.className=`piece ${piece[0]==='w'?'white':'black'}`; d.textContent=glyph[piece]; sq.appendChild(d); }
   boardEl.appendChild(sq);
 }
 statusText.textContent = `${turn==='w'?'Gold':'Black'} to move`;
 turnPill.textContent = `${turn==='w'?'Gold':'Black'} to move`;
 whiteCapsEl.textContent = whiteCaps.map(p=>glyph[p]).join(' ');
 blackCapsEl.textContent = blackCaps.map(p=>glyph[p]).join(' ');
}
function clickSquare(r,c){
 const piece=state[r][c];
 if(selected){
   const move=legalMoves.find(m=>m.r===r&&m.c===c);
   if(move){
     const moving=state[selected.r][selected.c];
     if(state[r][c]){ if(turn==='w') whiteCaps.push(state[r][c]); else blackCaps.push(state[r][c]); }
     state[r][c]=moving; state[selected.r][selected.c]='';
     if(moving[1]==='p' && (r===0 || r===7)) state[r][c]=moving[0]+'q';
     turn = turn==='w' ? 'b':'w'; selected=null; legalMoves=[]; render(); return;
   }
 }
 if(piece && colorOf(piece)===turn){ selected={r,c}; legalMoves=getMoves(r,c); render(); return; }
 selected=null; legalMoves=[]; render();
}
document.getElementById('resetBtn').onclick=reset;
reset();
