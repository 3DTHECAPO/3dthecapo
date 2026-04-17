const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');

const START_ROWS = [
  ['♜','♞','♝','♛','♚','♝','♞','♜'],
  ['♟','♟','♟','♟','♟','♟','♟','♟'],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['♙','♙','♙','♙','♙','♙','♙','♙'],
  ['♖','♘','♗','♕','♔','♗','♘','♖']
];

let state = START_ROWS.map(row => row.slice());
let whiteTurn = true;
let selected = null;

function isWhite(piece){ return '♔♕♖♗♘♙'.includes(piece); }
function isBlack(piece){ return '♚♛♜♝♞♟'.includes(piece); }

function render(){
  boardEl.innerHTML = '';
  for(let row = 0; row < 8; row++){
    for(let col = 0; col < 8; col++){
      const piece = state[row][col];
      const sq = document.createElement('button');
      sq.className = 'square ' + (((row + col) % 2) ? 'dark' : 'light');
      if(selected && selected.row === row && selected.col === col) sq.classList.add('selected');
      sq.textContent = piece;
      sq.onclick = () => clickSquare(row, col);
      boardEl.appendChild(sq);
    }
  }
  statusEl.textContent = whiteTurn ? 'WHITE TO MOVE' : 'BLACK TO MOVE';
}

function clickSquare(row, col){
  const piece = state[row][col];

  if(selected === null){
    if(!piece) return;
    if(whiteTurn && !isWhite(piece)) return;
    if(!whiteTurn && !isBlack(piece)) return;
    selected = {row, col};
    render();
    return;
  }

  if(selected.row === row && selected.col === col){
    selected = null;
    render();
    return;
  }

  const target = state[row][col];
  const moving = state[selected.row][selected.col];

  if((whiteTurn && isWhite(target)) || (!whiteTurn && isBlack(target))){
    selected = {row, col};
    render();
    return;
  }

  state[row][col] = moving;
  state[selected.row][selected.col] = '';
  selected = null;
  whiteTurn = !whiteTurn;
  render();
}

document.getElementById('resetBtn').onclick = () => {
  state = START_ROWS.map(row => row.slice());
  whiteTurn = true;
  selected = null;
  render();
};

render();
