(()=>{
  'use strict';

  const START = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
  ];

  let board = [];
  let selected = null;
  let whiteTurn = true;
  let flipped = false;
  let mode = window.Play3DModeBar ? window.Play3DModeBar.getMode() : 'cpu';

  const boardEl = document.getElementById('board');
  const turnText = document.getElementById('turnText');
  const stateText = document.getElementById('stateText');

  function reset(){
    board = START.map(row => row.slice());
    selected = null;
    whiteTurn = true;
    render('READY');
  }

  function isWhite(piece){ return piece && piece === piece.toUpperCase(); }
  function sameSide(a,b){ return a && b && isWhite(a) === isWhite(b); }
  function inBounds(r,c){ return r >= 0 && r < 8 && c >= 0 && c < 8; }

  function clearPath(from,to){
    const dr = Math.sign(to.r - from.r);
    const dc = Math.sign(to.c - from.c);
    let r = from.r + dr;
    let c = from.c + dc;
    while(r !== to.r || c !== to.c){
      if(board[r][c]) return false;
      r += dr;
      c += dc;
    }
    return true;
  }

  function legalMove(from,to){
    if(!inBounds(to.r,to.c)) return false;
    const piece = board[from.r][from.c];
    const target = board[to.r][to.c];
    if(!piece || sameSide(piece,target)) return false;

    const dr = to.r - from.r;
    const dc = to.c - from.c;
    const adr = Math.abs(dr);
    const adc = Math.abs(dc);
    const lower = piece.toLowerCase();
    const forward = isWhite(piece) ? -1 : 1;
    const home = isWhite(piece) ? 6 : 1;

    if(lower === 'p'){
      if(dc === 0 && !target && dr === forward) return true;
      if(dc === 0 && !target && from.r === home && dr === forward * 2 && !board[from.r + forward][from.c]) return true;
      return adc === 1 && dr === forward && !!target;
    }
    if(lower === 'n') return (adr === 2 && adc === 1) || (adr === 1 && adc === 2);
    if(lower === 'b') return adr === adc && clearPath(from,to);
    if(lower === 'r') return (dr === 0 || dc === 0) && clearPath(from,to);
    if(lower === 'q') return (adr === adc || dr === 0 || dc === 0) && clearPath(from,to);
    if(lower === 'k') return adr <= 1 && adc <= 1;
    return false;
  }

  function legalMovesFor(r,c){
    const moves = [];
    for(let tr = 0; tr < 8; tr++){
      for(let tc = 0; tc < 8; tc++){
        if(legalMove({r,c},{r:tr,c:tc})) moves.push({from:{r,c}, to:{r:tr,c:tc}});
      }
    }
    return moves;
  }

  function allLegalMoves(forWhite){
    const moves = [];
    for(let r = 0; r < 8; r++){
      for(let c = 0; c < 8; c++){
        const piece = board[r][c];
        if(piece && isWhite(piece) === forWhite) moves.push(...legalMovesFor(r,c));
      }
    }
    return moves;
  }

  function makeMove(move, label){
    const piece = board[move.from.r][move.from.c];
    board[move.to.r][move.to.c] = piece;
    board[move.from.r][move.from.c] = '';
    whiteTurn = !whiteTurn;
    selected = null;
    render(label || 'MOVED');

    if(mode === 'cpu' && !whiteTurn){
      window.setTimeout(cpuMove, 420);
    }
  }

  function cpuMove(){
    if(mode !== 'cpu' || whiteTurn) return;
    const moves = allLegalMoves(false);
    if(!moves.length){ render('CPU STUCK'); return; }
    const captures = moves.filter(m => board[m.to.r][m.to.c]);
    const pool = captures.length ? captures : moves;
    makeMove(pool[Math.floor(Math.random() * pool.length)], 'CPU MOVED');
  }

  function clickSquare(r,c){
    const piece = board[r][c];
    if(mode === 'fan'){
      render('ROOM CODE READY');
      return;
    }
    if(mode === 'cpu' && !whiteTurn) return;

    if(selected){
      const move = {from:selected, to:{r,c}};
      if(legalMove(selected,{r,c})) makeMove(move, 'MOVED');
      else { selected = null; render('ILLEGAL'); }
      return;
    }

    if(!piece) return;
    if(isWhite(piece) !== whiteTurn) return;
    selected = {r,c};
    render('SELECTED');
  }

  function render(label){
    boardEl.innerHTML = '';
    let rows = [0,1,2,3,4,5,6,7];
    let cols = [0,1,2,3,4,5,6,7];
    if(flipped){ rows = rows.reverse(); cols = cols.reverse(); }

    for(const r of rows){
      for(const c of cols){
        const sq = document.createElement('button');
        sq.className = 'sq ' + (((r + c) % 2 === 0) ? 'light' : 'dark');
        if(selected && selected.r === r && selected.c === c) sq.classList.add('selected');
        sq.textContent = board[r][c] || '';
        sq.onclick = () => clickSquare(r,c);
        boardEl.appendChild(sq);
      }
    }
    turnText.textContent = whiteTurn ? 'WHITE' : (mode === 'cpu' ? 'CPU' : 'BLACK');
    stateText.textContent = label || (mode === 'fan' ? 'FAN ROOM' : mode.toUpperCase());
  }

  document.getElementById('resetBtn').onclick = reset;
  document.getElementById('flipBtn').onclick = ()=>{
    flipped = !flipped;
    render('FLIPPED');
  };
  window.addEventListener('play3d:modechange', event=>{
    mode = event.detail.mode;
    reset();
  });

  reset();
})();
