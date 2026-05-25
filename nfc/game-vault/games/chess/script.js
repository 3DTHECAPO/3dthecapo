(()=>{
  'use strict';

  const game = new window.Chess();
  const files = ['a','b','c','d','e','f','g','h'];
  const pieceGlyph = {
    wp:'\u2659', wr:'\u2656', wn:'\u2658', wb:'\u2657', wq:'\u2655', wk:'\u2654',
    bp:'\u265F', br:'\u265C', bn:'\u265E', bb:'\u265D', bq:'\u265B', bk:'\u265A'
  };
  const pieceValue = {p:100,n:320,b:330,r:500,q:900,k:20000};
  const cpuDifficulty = 'boss';

  let selected = null;
  let flipped = false;
  let mode = window.Play3DModeBar ? window.Play3DModeBar.getMode() : 'cpu';

  const boardEl = document.getElementById('board');
  const turnText = document.getElementById('turnText');
  const stateText = document.getElementById('stateText');

  function squareName(row, col){ return files[col] + (8 - row); }
  function statusText(label){
    if(game.isCheckmate()) return 'CHECKMATE';
    if(game.isStalemate()) return 'STALEMATE';
    if(game.isDraw()) return 'DRAW';
    if(game.isCheck()) return 'CHECK';
    return label || (mode === 'fan' ? 'FAN ROOM' : 'READY');
  }
  function legalTargets(square){
    return game.moves({square, verbose:true}).map(move => move.to);
  }
  function thinkDelay(){ return 400 + Math.floor(Math.random() * 1000); }

  function render(label){
    boardEl.innerHTML = '';
    const legal = selected ? legalTargets(selected) : [];
    let rows = [0,1,2,3,4,5,6,7];
    let cols = [0,1,2,3,4,5,6,7];
    if(flipped){ rows = rows.reverse(); cols = cols.reverse(); }

    for(const row of rows){
      for(const col of cols){
        const square = squareName(row, col);
        const piece = game.get(square);
        const sq = document.createElement('button');
        sq.className = 'sq ' + (((row + col) % 2 === 0) ? 'light' : 'dark');
        sq.dataset.square = square;
        if(selected === square) sq.classList.add('selected');
        if(legal.includes(square)) sq.classList.add('legal-target');
        sq.textContent = piece ? pieceGlyph[piece.color + piece.type] : '';
        sq.onclick = () => clickSquare(square);
        boardEl.appendChild(sq);
      }
    }
    const turn = game.turn() === 'w' ? 'WHITE' : 'BLACK';
    turnText.textContent = mode === 'cpu' && game.turn() === 'b' ? 'CPU' : turn;
    stateText.textContent = statusText(label);
  }

  function movePiece(from, to){
    const piece = game.get(from);
    const promote = piece && piece.type === 'p' && ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));
    const move = game.move({from, to, promotion: promote ? 'q' : undefined});
    selected = null;
    if(!move){ render('ILLEGAL'); return; }
    render(move.san);
    if(window.Play3DGameSync) window.Play3DGameSync.sendMove({game:'chess', san:move.san, fen:game.fen()});
    if(window.Play3DPoints && game.isCheckmate()) window.Play3DPoints.award('chess', 350, 'checkmate');
    if(mode === 'cpu' && game.turn() === 'b' && !game.isGameOver()){
      render('OPPONENT THINKING...');
      window.setTimeout(cpuMove, thinkDelay());
    }
  }

  function scoreCandidate(candidate){
    let score = Math.random() * 6;
    if(candidate.captured) score += (pieceValue[candidate.captured] || 0) + 35;
    if(candidate.promotion) score += 780;
    if(candidate.san && candidate.san.includes('+')) score += 90;
    if(candidate.san && candidate.san.includes('#')) score += 100000;

    const played = game.move({from:candidate.from, to:candidate.to, promotion:candidate.promotion || 'q'});
    if(!played) return -999999;

    if(game.isCheckmate()) score += 100000;
    else if(game.isCheck()) score += 120;

    const replies = game.moves({verbose:true});
    let worstReply = 0;
    for(const reply of replies){
      if(reply.captured) worstReply = Math.max(worstReply, pieceValue[reply.captured] || 0);
      if(reply.san && reply.san.includes('#')) worstReply = Math.max(worstReply, 50000);
      else if(reply.san && reply.san.includes('+')) worstReply = Math.max(worstReply, 140);
    }
    score -= worstReply * (cpuDifficulty === 'boss' ? 0.9 : 0.55);
    score -= replies.length * 0.25;

    if(typeof game.undo === 'function') game.undo();
    return score;
  }

  function chooseCpuMove(moves){
    return moves
      .map(move => ({move, score:scoreCandidate(move)}))
      .sort((a,b)=>b.score - a.score)[0].move;
  }

  function cpuMove(){
    if(mode !== 'cpu' || game.turn() !== 'b' || game.isGameOver()) return;
    render('OPPONENT THINKING...');
    const moves = game.moves({verbose:true});
    if(!moves.length){ render(); return; }
    const picked = chooseCpuMove(moves);
    const move = game.move({from:picked.from, to:picked.to, promotion:picked.promotion || 'q'});
    render(move ? move.san : 'CPU PASS');
  }

  function clickSquare(square){
    if(mode === 'fan'){ render('ROOM CODE READY'); return; }
    if(mode === 'cpu' && game.turn() === 'b') return;
    const piece = game.get(square);
    if(selected){
      if(selected === square){ selected = null; render(); return; }
      movePiece(selected, square);
      return;
    }
    if(!piece || piece.color !== game.turn()) return;
    selected = square;
    render('SELECTED');
  }

  function reset(){
    game.reset();
    selected = null;
    render('READY');
  }

  document.getElementById('resetBtn').onclick = reset;
  document.getElementById('flipBtn').onclick = ()=>{ flipped = !flipped; render('FLIPPED'); if(mode === 'cpu' && game.turn() === 'b' && !game.isGameOver()) window.setTimeout(cpuMove, 80); };
  window.addEventListener('play3d:modechange', event=>{ mode = event.detail.mode; reset(); });
  window.addEventListener('load', ()=>{
    if(window.Play3DGameSync){
      window.Play3DGameSync.onMove(payload=>{
        if(!payload || payload.game !== 'chess' || !payload.fen) return;
        try{ game.load(payload.fen); selected = null; render('REMOTE MOVE'); }catch(e){}
      });
    }
  });

  reset();
})();
