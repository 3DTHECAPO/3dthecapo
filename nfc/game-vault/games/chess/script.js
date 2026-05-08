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

const boardEl=document.getElementById('board');
const turnText=document.getElementById('turnText');
const stateText=document.getElementById('stateText');

function cloneStart(){
return START.map(row=>row.slice());
}

function reset(){
board=cloneStart();
selected=null;
whiteTurn=true;
render();
}

function isWhite(piece){
return '♙♖♘♗♕♔'.includes(piece);
}

function isBlack(piece){
return '♟♜♞♝♛♚'.includes(piece);
}

function sameSide(a,b){
if(!a||!b)return false;
return (isWhite(a)&&isWhite(b))||(isBlack(a)&&isBlack(b));
}

function render(){
boardEl.innerHTML='';

let rows=[0,1,2,3,4,5,6,7];
let cols=[0,1,2,3,4,5,6,7];

if(flipped){
rows=rows.reverse();
cols=cols.reverse();
}

for(const r of rows){
for(const c of cols){
const sq=document.createElement('button');
sq.className='sq '+(((r+c)%2===0)?'light':'dark');

if(selected&&selected.r===r&&selected.c===c){
sq.classList.add('selected');
}

sq.textContent=board[r][c] || '';
sq.onclick=()=>clickSquare(r,c);
boardEl.appendChild(sq);
}
}

turnText.textContent=whiteTurn?'WHITE':'BLACK';
stateText.textContent='READY';
}

function clickSquare(r,c){
const piece=board[r][c];

if(selected){
const moving=board[selected.r][selected.c];

if(selected.r===r&&selected.c===c){
selected=null;
render();
return;
}

if(moving && !sameSide(moving,piece)){
board[r][c]=moving;
board[selected.r][selected.c]='';
whiteTurn=!whiteTurn;
selected=null;
stateText.textContent='MOVED';
render();
return;
}

selected=null;
render();
return;
}

if(!piece)return;

if(whiteTurn && !isWhite(piece))return;
if(!whiteTurn && !isBlack(piece))return;

selected={r,c};
render();
}

document.getElementById('resetBtn').onclick=reset;
document.getElementById('flipBtn').onclick=()=>{
flipped=!flipped;
render();
};

reset();

})();
