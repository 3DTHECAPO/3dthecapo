const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');

const START = [
  '♜','♞','♝','♛','♚','♝','♞','♜',
  '♟','♟','♟','♟','♟','♟','♟','♟',
  '','','','','','','','',
  '','','','','','','','',
  '','','','','','','','',
  '','','','','','','','',
  '♙','♙','♙','♙','♙','♙','♙','♙',
  '♖','♘','♗','♕','♔','♗','♘','♖'
];

let state = START.slice();
let whiteTurn = true;
let selected = null;

function isWhite(piece){ return '♔♕♖♗♘♙'.includes(piece); }
function isBlack(piece){ return '♚♛♜♝♞♟'.includes(piece); }

function render(){
  boardEl.innerHTML = '';
  for(let i = 0; i < 64; i++){
    const piece = state[i];
    const row = Math.floor(i / 8);
    const col = i % 8;
    const sq = document.createElement('button');
    sq.className = 'square ' + (((row + col) % 2) ? 'dark' : 'light');
    if(selected === i) sq.classList.add('selected');
    sq.textContent = piece;
    sq.onclick = () => clickSquare(i);
    boardEl.appendChild(sq);
  }
  statusEl.textContent = whiteTurn ? 'WHITE TO MOVE' : 'BLACK TO MOVE';
}

function clickSquare(i){
  const piece = state[i];

  if(selected === null){
    if(!piece) return;
    if(whiteTurn && !isWhite(piece)) return;
    if(!whiteTurn && !isBlack(piece)) return;
    selected = i;
    render();
    return;
  }

  if(selected === i){
    selected = null;
    render();
    return;
  }

  const moving = state[selected];
  if((whiteTurn && isWhite(piece)) || (!whiteTurn && isBlack(piece))){
    selected = i;
    render();
    return;
  }

  state[i] = moving;
  state[selected] = '';
  selected = null;
  whiteTurn = !whiteTurn;
  render();
}

document.getElementById('resetBtn').onclick = () => {
  state = START.slice();
  whiteTurn = true;
  selected = null;
  render();
};

render();
