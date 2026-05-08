(()=>{

const START=[
['♜','♞','♝','♛','♚','♝','♞','♜'],
['♟','♟','♟','♟','♟','♟','♟','♟'],
['','','','','','','',''],
['','','','','','','',''],
['','','','','','','',''],
['','','','','','','',''],
['♙','♙','♙','♙','♙','♙','♙','♙'],
['♖','♘','♗','♕','♔','♗','♘','♖']
];

let board=[];
let selected=null;
let whiteTurn=true;
let flipped=false;
let applyingRemoteMove=false;

const boardEl=document.getElementById('board');
const turnText=document.getElementById('turnText');
const stateText=document.getElementById('stateText');

function cloneStart(){return START.map(row=>row.slice())}
function isWhite(p){return '♙♖♘♗♕♔'.includes(p)}
function isBlack(p){return '♟♜♞♝♛♚'.includes(p)}
function sameSide(a,b){return !!a&&!!b&&((isWhite(a)&&isWhite(b))||(isBlack(a)&&isBlack(b)))}
function inBounds(r,c){return r>=0&&r<8&&c>=0&&c<8}
function clearPath(sr,sc,tr,tc){
  const dr=Math.sign(tr-sr), dc=Math.sign(tc-sc);
  let r=sr+dr,c=sc+dc;
  while(r!==tr||c!==tc){if(board[r][c])return false;r+=dr;c+=dc}
  return true;
}
function legalMove(piece,sr,sc,tr,tc){
  if(!inBounds(tr,tc))return false;
  if(sr===tr&&sc===tc)return false;
  if(sameSide(piece,board[tr][tc]))return false;
  const ar=Math.abs(tr-sr), ac=Math.abs(tc-sc);
  const white=isWhite(piece);
  switch(piece){
    case '♙': {
      const dir=-1,start=6;
      if(sc===tc&&!board[tr][tc]&&tr-sr===dir)return true;
      if(sc===tc&&!board[tr][tc]&&sr===start&&tr-sr===2*dir&&!board[sr+dir][sc])return true;
      if(ac===1&&tr-sr===dir&&board[tr][tc]&&isBlack(board[tr][tc]))return true;
      return false;
    }
    case '♟': {
      const dir=1,start=1;
      if(sc===tc&&!board[tr][tc]&&tr-sr===dir)return true;
      if(sc===tc&&!board[tr][tc]&&sr===start&&tr-sr===2*dir&&!board[sr+dir][sc])return true;
      if(ac===1&&tr-sr===dir&&board[tr][tc]&&isWhite(board[tr][tc]))return true;
      return false;
    }
    case '♖': case '♜': return (sr===tr||sc===tc)&&clearPath(sr,sc,tr,tc);
    case '♗': case '♝': return ar===ac&&clearPath(sr,sc,tr,tc);
    case '♕': case '♛': return ((sr===tr||sc===tc)||ar===ac)&&clearPath(sr,sc,tr,tc);
    case '♔': case '♚': return ar<=1&&ac<=1;
    case '♘': case '♞': return (ar===2&&ac===1)||(ar===1&&ac===2);
    default:return false;
  }
}

function legalTargets(r,c){
  const p=board[r][c];const out=[];
  if(!p)return out;
  for(let tr=0;tr<8;tr++)for(let tc=0;tc<8;tc++)if(legalMove(p,r,c,tr,tc))out.push(tr+','+tc);
  return out;
}

function render(){
  boardEl.innerHTML='';
  let rows=[0,1,2,3,4,5,6,7],cols=[0,1,2,3,4,5,6,7];
  if(flipped){rows=rows.reverse();cols=cols.reverse()}
  const legal=selected?new Set(legalTargets(selected.r,selected.c)):new Set();

  for(const r of rows){
    for(const c of cols){
      const sq=document.createElement('button');
      sq.className='sq '+(((r+c)%2===0)?'light':'dark');
      if(selected&&selected.r===r&&selected.c===c)sq.classList.add('selected');
      if(legal.has(r+','+c))sq.classList.add('legal');
      const piece=board[r][c]||'';
      if(piece){
        const span=document.createElement('span');
        span.className='piece '+(isWhite(piece)?'white-piece':'black-piece');
        span.textContent=piece;
        sq.appendChild(span);
      }
      sq.onclick=()=>clickSquare(r,c);
      boardEl.appendChild(sq);
    }
  }
  turnText.textContent=whiteTurn?'WHITE':'BLACK';
}

function clickSquare(r,c){
  const piece=board[r][c];
  if(selected){
    const moving=board[selected.r][selected.c];
    if(selected.r===r&&selected.c===c){selected=null;stateText.textContent='READY';render();return}
    if(moving&&legalMove(moving,selected.r,selected.c,r,c)){
      board[r][c]=moving;board[selected.r][selected.c]='';
      if(window.PLAY3D_SYNC && !applyingRemoteMove){ window.PLAY3D_SYNC.sendMove({type:'chess_move',from:{r:selected.r,c:selected.c},to:{r,c},piece:moving}); }
      whiteTurn=!whiteTurn;selected=null;stateText.textContent='MOVED';render();return;
    }
    stateText.textContent='ILLEGAL MOVE';
    selected=null;render();return;
  }
  if(!piece)return;
  if(whiteTurn&&!isWhite(piece)){stateText.textContent='WHITE TURN';return}
  if(!whiteTurn&&!isBlack(piece)){stateText.textContent='BLACK TURN';return}
  selected={r,c};stateText.textContent='SELECTED';render();
}

function reset(){board=cloneStart();selected=null;whiteTurn=true;stateText.textContent='READY';render()}
document.getElementById('resetBtn').onclick=reset;
document.getElementById('flipBtn').onclick=()=>{flipped=!flipped;render()};
reset();

if(window.PLAY3D_SYNC && window.PLAY3D_SYNC.enabled){
  window.PLAY3D_SYNC.onMove(function(move){
    if(!move || !move.payload || move.playerId === window.PLAY3D_SYNC.playerId) return;
    const p = move.payload;
    if(p.type === 'chess_move' && p.from && p.to){
      applyingRemoteMove = true;
      const moving = board[p.from.r][p.from.c];
      board[p.to.r][p.to.c] = moving || p.piece || '';
      board[p.from.r][p.from.c] = '';
      whiteTurn = !whiteTurn;
      selected = null;
      stateText.textContent = 'REMOTE MOVE';
      render();
      applyingRemoteMove = false;
    }
  });
}

})();