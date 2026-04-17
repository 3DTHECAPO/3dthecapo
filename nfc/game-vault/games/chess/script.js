/* FINAL CHESS FIX */
const boardEl=document.getElementById('board');
const statusEl=document.getElementById('status');

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

let state=JSON.parse(JSON.stringify(START));
let turn=true,sel=null;

function isW(p){return '♔♕♖♗♘♙'.includes(p)}
function isB(p){return '♚♛♜♝♞♟'.includes(p)}

function draw(){
boardEl.innerHTML='';
for(let r=0;r<8;r++){
for(let c=0;c<8;c++){
let sq=document.createElement('button');
sq.className='square '+((r+c)%2?'dark':'light');
sq.textContent=state[r][c];
sq.onclick=()=>click(r,c);
boardEl.appendChild(sq);
}}
statusEl.textContent=turn?'WHITE':'BLACK';
}

function click(r,c){
let p=state[r][c];
if(!sel){
if(!p)return;
if(turn&&!isW(p))return;
if(!turn&&!isB(p))return;
sel={r,c};return;
}
if(sel.r===r&&sel.c===c){sel=null;return;}
let t=state[r][c];
if((turn&&isW(t))||(!turn&&isB(t))){sel={r,c};return;}
state[r][c]=state[sel.r][sel.c];
state[sel.r][sel.c]='';
sel=null;turn=!turn;draw();
}

draw();
