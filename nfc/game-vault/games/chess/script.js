const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');

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

let state = cloneRows(START_ROWS);
let whiteTurn = true;
let selected = null;

function cloneRows(rows){
  return rows.map(row => row.slice());
}

function isWhite(piece){ return '♔♕♖♗♘♙'.includes(piece); }
function isBlack(piece){ return '♚♛♜♝♞♟'.includes(piece); }

function render(){
  boardEl.innerHTML = '';
  for(let row = 0; row < 8; row++){
    for(let col = 0; col < 8; col++){
      const piece = state[row][col];
      const sq = document.createElement('button');
      sq.type = 'button';
      sq.className = 'square ' + (((row + col) % 2) ? 'dark' : 'light');
      sq.dataset.row = String(row);
      sq.dataset.col = String(col);
      if(selected && selected.row === row && selected.col === col){
        sq.classList.add('selected');
      }
      sq.textContent = piece;
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
    selected = { row, col };
    render();
    return;
  }

  if(selected.row === row && selected.col === col){
    selected = null;
    render();
    return;
  }

  const moving = state[selected.row][selected.col];
  const target = state[row][col];

  if((whiteTurn && isWhite(target)) || (!whiteTurn && isBlack(target))){
    selected = { row, col };
    render();
    return;
  }

  state[row][col] = moving;
  state[selected.row][selected.col] = '';
  selected = null;
  whiteTurn = !whiteTurn;
  render();
}

function handleBoardEvent(event){
  const square = event.target.closest('.square');
  if(!square) return;
  const row = Number(square.dataset.row);
  const col = Number(square.dataset.col);
  if(Number.isNaN(row) || Number.isNaN(col)) return;
  clickSquare(row, col);
}

boardEl.addEventListener('click', handleBoardEvent);
boardEl.addEventListener('pointerup', handleBoardEvent);

resetBtn.addEventListener('click', () => {
  state = cloneRows(START_ROWS);
  whiteTurn = true;
  selected = null;
  render();
});

render();
