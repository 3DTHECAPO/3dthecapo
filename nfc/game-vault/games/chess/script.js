
const pieces = {
  wr:'♖', wn:'♘', wb:'♗', wq:'♕', wk:'♔', wp:'♙',
  br:'♜', bn:'♞', bb:'♝', bq:'♛', bk:'♚', bp:'♟'
};
const start = [
  ['br','bn','bb','bq','bk','bb','bn','br'],
  ['bp','bp','bp','bp','bp','bp','bp','bp'],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['wp','wp','wp','wp','wp','wp','wp','wp'],
  ['wr','wn','wb','wq','wk','wb','wn','wr'],
];
let boardState, turn='w', selected=null;
const board=document.getElementById('board'), msg=document.getElementById('msg');
function reset(){ boardState = JSON.parse(JSON.stringify(start)); turn='w'; selected=null; render(); msg.textContent='White to move.'; }
function render(){
  board.innerHTML='';
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const d=document.createElement('div'); d.className='sq '+(((r+c)%2)?'dark':'light')+(selected&&selected.r===r&&selected.c===c?' sel':'');
    d.dataset.r=r; d.dataset.c=c; const p=boardState[r][c]; d.textContent = pieces[p] || ''; d.onclick=onClick; board.appendChild(d);
  }
}
function colorOf(p){ return p ? p[0] : ''; }
function legal(from,to){
  const p=boardState[from.r][from.c]; if(!p) return false;
  const target=boardState[to.r][to.c]; if(colorOf(target)===colorOf(p)) return false;
  const dr=to.r-from.r, dc=to.c-from.c; const adr=Math.abs(dr), adc=Math.abs(dc);
  const type=p[1], dir=p[0]==='w'?-1:1;
  if(type==='p'){
    if(dc===0 && !target && dr===dir) return true;
    if(dc===0 && !target && dr===2*dir && ((p[0]==='w'&&from.r===6)||(p[0]==='b'&&from.r===1)) && !boardState[from.r+dir][from.c]) return true;
    if(adr===1 && dc!==0 && dr===dir && target) return true;
    return false;
  }
  if(type==='r') return rookClear(from,to);
  if(type==='b') return bishopClear(from,to);
  if(type==='q') return rookClear(from,to)||bishopClear(from,to);
  if(type==='n') return (adr===2&&adc===1)||(adr===1&&adc===2);
  if(type==='k') return adr<=1&&adc<=1;
}
function rookClear(f,t){ if(f.r!==t.r && f.c!==t.c) return false; const sr=Math.sign(t.r-f.r), sc=Math.sign(t.c-f.c); let r=f.r+sr, c=f.c+sc; while(r!==t.r||c!==t.c){ if(boardState[r][c]) return false; r+=sr; c+=sc; } return true; }
function bishopClear(f,t){ if(Math.abs(t.r-f.r)!==Math.abs(t.c-f.c)) return false; const sr=Math.sign(t.r-f.r), sc=Math.sign(t.c-f.c); let r=f.r+sr, c=f.c+sc; while(r!==t.r&&c!==t.c){ if(boardState[r][c]) return false; r+=sr; c+=sc; } return true; }
function onClick(e){
  const r=+e.currentTarget.dataset.r, c=+e.currentTarget.dataset.c;
  const p=boardState[r][c];
  if(selected){
    if(legal(selected,{r,c})){
      boardState[r][c]=boardState[selected.r][selected.c]; boardState[selected.r][selected.c]='';
      turn = turn==='w'?'b':'w';
      msg.textContent = (turn==='w'?'White':'Black') + ' to move.';
      selected=null; render(); return;
    }
    selected=null;
  }
  if(p && colorOf(p)===turn){ selected={r,c}; render(); }
}
document.getElementById('reset').onclick=reset;
reset();
