(()=>{
  'use strict';

  function play3dAnnounce(event, type, message){
    window.dispatchEvent(new CustomEvent('superior:event', { detail:{ category:'chess', event:event, type:type, message:message } }));
  }

  const game = new window.Chess();
  const files = ['a','b','c','d','e','f','g','h'];
  const pieceGlyph = {
    wp:'\u2659', wr:'\u2656', wn:'\u2658', wb:'\u2657', wq:'\u2655', wk:'\u2654',
    bp:'\u265F', br:'\u265C', bn:'\u265E', bb:'\u265D', bq:'\u265B', bk:'\u265A'
  };
  const pieceValue = {p:100,n:320,b:330,r:500,q:900,k:0};
  const defaultDifficulty = 'hard';
  const difficultyDepth = {easy:1,normal:2,hard:3,boss:4};
  const pst = {
    p:[0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
    n:[-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,5,5,0,-20,-40,-30,5,10,15,15,10,5,-30,-30,0,15,20,20,15,0,-30,-30,5,15,20,20,15,5,-30,-30,0,10,15,15,10,0,-30,-40,-20,0,0,0,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
    b:[-20,-10,-10,-10,-10,-10,-10,-20,-10,5,0,0,0,0,5,-10,-10,10,10,10,10,10,10,-10,-10,0,10,10,10,10,0,-10,-10,5,5,10,10,5,5,-10,-10,0,5,10,10,5,0,-10,-10,0,0,0,0,0,0,-10,-20,-10,-10,-10,-10,-10,-10,-20],
    r:[0,0,0,5,5,0,0,0,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,5,10,10,10,10,10,10,5,0,0,0,0,0,0,0,0],
    q:[-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
    k:[20,30,10,0,0,10,30,20,20,20,0,0,0,0,20,20,-10,-20,-20,-20,-20,-20,-20,-10,-20,-30,-30,-40,-40,-30,-30,-20,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-30,-30,-30,-30,-30,-30,-30,-30,-30,-30,-30,-30,-30,-30,-30]
  };

  let selected = null;
  let flipped = false;
  let mode = window.Play3DModeBar ? window.Play3DModeBar.getMode() : 'cpu';

  const boardEl = document.getElementById('board');
  const turnText = document.getElementById('turnText');
  const stateText = document.getElementById('stateText');

  const moveSound = new Audio('./sounds/chess-move.wav');
  const checkSound = new Audio('./sounds/check.wav');

  function playSound(sound){
    if(!sound) return;
    try{
      sound.pause();
      sound.currentTime = 0;
      const played = sound.play();
      if(played && typeof played.catch === 'function') played.catch(()=>{});
    }catch(e){}
  }

  function playMoveSound(){ playSound(moveSound); }
  function playCheckSound(){ playSound(checkSound); }

  function squareName(row, col){ return files[col] + (8 - row); }

  function boardPieceAt(square){ return game.get(square); }
  function kingSquare(color){
    for(const square of allSquares()){
      const piece = boardPieceAt(square);
      if(piece && piece.color === color && piece.type === 'k') return square;
    }
    return null;
  }
  function inBoundsCoord(coord){
    return coord.file >= 0 && coord.file < 8 && coord.rank >= 1 && coord.rank <= 8;
  }
  function strictClearPath(from,to){
    const a=squareCoord(from), b=squareCoord(to);
    const df=Math.sign(b.file-a.file), dr=Math.sign(b.rank-a.rank);
    let file=a.file+df, rank=a.rank+dr;
    while(file!==b.file || rank!==b.rank){
      if(!inBoundsCoord({file,rank})) return false;
      if(boardPieceAt(files[file]+rank)) return false;
      file+=df; rank+=dr;
    }
    return true;
  }
  function strictAttacks(piece, from, to){
    if(!piece || from===to) return false;
    const a=squareCoord(from), b=squareCoord(to);
    const df=b.file-a.file, dr=b.rank-a.rank;
    const adf=Math.abs(df), adr=Math.abs(dr);

    if(piece.type==='p') return adf===1 && dr===(piece.color==='w'?1:-1);
    if(piece.type==='n') return (adf===1&&adr===2)||(adf===2&&adr===1);
    if(piece.type==='b') return adf===adr && adf>0 && strictClearPath(from,to);
    if(piece.type==='r') return ((df===0) !== (dr===0)) && strictClearPath(from,to);
    if(piece.type==='q') return ((adf===adr && adf>0) || ((df===0) !== (dr===0))) && strictClearPath(from,to);
    if(piece.type==='k') return adf<=1 && adr<=1;
    return false;
  }
  function strictAttackers(attackerColor, square){
    if(!square) return [];
    return allSquares().filter(from=>{
      const piece=boardPieceAt(from);
      return piece && piece.color===attackerColor && strictAttacks(piece,from,square);
    });
  }
  function verifiedCheck(){
    const defender = game.turn();
    const attacker = defender === 'w' ? 'b' : 'w';
    const king = kingSquare(defender);
    return !!king && game.isCheck() && strictAttackers(attacker, king).length > 0;
  }
  function verifiedCheckmate(){
    return game.isCheckmate() && verifiedCheck() && game.moves().length === 0;
  }

  function statusText(label){
    if(verifiedCheckmate()) return 'CHECKMATE';
    if(game.isStalemate()) return 'STALEMATE';
    if(game.isDraw()) return 'DRAW';
    if(verifiedCheck()) return 'CHECK';
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
    if(label && String(label).includes('#') && !verifiedCheckmate()) label = String(label).replace(/#/g,'');
    if(label && String(label).includes('+') && !verifiedCheck()) label = String(label).replace(/\+/g,'');
    stateText.textContent = statusText(label);
  }

  function movePiece(from, to){
    const piece = game.get(from);
    const promote = piece && piece.type === 'p' && ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));
    const move = game.move({from, to, promotion: promote ? 'q' : undefined});
    selected = null;
    if(!move){ render('ILLEGAL'); return; }
    render(move.san);
    playMoveSound();
    if(move.captured) play3dAnnounce('CAPTURE','boss');
    if(verifiedCheckmate()){
      playCheckSound();
      play3dAnnounce('CHECKMATE','success');
    }
    else if(verifiedCheck()){
      playCheckSound();
      play3dAnnounce('CHECK','warning');
    }
    if(window.Play3DGameSync) window.Play3DGameSync.sendMove({game:'chess', san:move.san, fen:game.fen()});
    if(window.Play3DPoints && verifiedCheckmate()) window.Play3DPoints.award('chess', 350, 'checkmate');
    if(mode === 'cpu' && game.turn() === 'b' && !game.isGameOver()){
      render('OPPONENT THINKING...');
      window.setTimeout(cpuMove, thinkDelay());
    }
  }

  function cpuDepth(){
    try{
      const saved = String(localStorage.getItem('play3d_chess_difficulty') || defaultDifficulty).toLowerCase();
      return difficultyDepth[saved] || difficultyDepth[defaultDifficulty];
    }catch(e){
      return difficultyDepth[defaultDifficulty];
    }
  }

  function allSquares(){
    const out = [];
    for(const file of files) for(let rank=1; rank<=8; rank++) out.push(file + rank);
    return out;
  }

  function squareCoord(square){
    return {file:files.indexOf(square[0]), rank:Number(square[1])};
  }

  function clearPath(from,to){
    const a=squareCoord(from), b=squareCoord(to);
    const df=Math.sign(b.file-a.file), dr=Math.sign(b.rank-a.rank);
    let file=a.file+df, rank=a.rank+dr;
    while(file!==b.file || rank!==b.rank){
      if(game.get(files[file]+rank)) return false;
      file+=df; rank+=dr;
    }
    return true;
  }

  function attacks(piece, from, to){
    return strictAttacks(piece, from, to);
  }

  function isAttackedBy(color, square){
    return strictAttackers(color, square).length > 0;
  }

  function pstValue(piece, square){
    const c=squareCoord(square);
    const whiteIndex=(c.rank-1)*8+c.file;
    const blackIndex=(8-c.rank)*8+c.file;
    return (pst[piece.type] || [])[piece.color==='w'?whiteIndex:blackIndex] || 0;
  }

  function evaluateBoard(){
    if(verifiedCheckmate()) return game.turn()==='b' ? -999999 : 999999;
    if(game.isDraw() || game.isStalemate()) return 0;
    let score = 0;
    for(const square of allSquares()){
      const piece=game.get(square);
      if(!piece) continue;
      const sign=piece.color==='b'?1:-1;
      score += sign * ((pieceValue[piece.type] || 0) + pstValue(piece,square));
      if(['d4','d5','e4','e5'].includes(square)) score += sign*16;
      const enemy=piece.color==='b'?'w':'b';
      const attacked=isAttackedBy(enemy,square);
      const defended=isAttackedBy(piece.color,square);
      if(piece.type!=='k' && attacked && !defended) score -= sign * Math.floor((pieceValue[piece.type] || 0) * 0.42);
      if(piece.type==='q' && attacked) score -= sign * (defended ? 80 : 260);
    }
    if(verifiedCheck()) score += game.turn()==='w' ? 70 : -70;
    return score;
  }

  function moveOrderScore(move){
    let score = 0;
    // Do not trust SAN symbols alone for check/checkmate bonuses.
    // Verified check/checkmate is handled after the move is applied.
    if(move.captured) score += (pieceValue[move.captured] || 0) * 10 - (pieceValue[move.piece] || 0);
    if(move.promotion) score += pieceValue[move.promotion] || 900;
    if(['d4','d5','e4','e5'].includes(move.to)) score += 40;
    return score;
  }

  function search(depth, alpha, beta){
    if(depth<=0 || game.isGameOver()) return evaluateBoard();
    const moves = game.moves({verbose:true}).sort((a,b)=>moveOrderScore(b)-moveOrderScore(a));
    if(!moves.length) return evaluateBoard();
    if(game.turn()==='b'){
      let best=-Infinity;
      for(const move of moves){
        game.move({from:move.from,to:move.to,promotion:move.promotion||'q'});
        const score=search(depth-1,alpha,beta);
        game.undo();
        if(score>best) best=score;
        alpha=Math.max(alpha,best);
        if(alpha>=beta) break;
      }
      return best;
    }
    let best=Infinity;
    for(const move of moves){
      game.move({from:move.from,to:move.to,promotion:move.promotion||'q'});
      const score=search(depth-1,alpha,beta);
      game.undo();
      if(score<best) best=score;
      beta=Math.min(beta,best);
      if(alpha>=beta) break;
    }
    return best;
  }

  function scoreMove(move){
    game.move({from:move.from, to:move.to, promotion:move.promotion || 'q'});
    let score = search(cpuDepth()-1, -Infinity, Infinity);
    if(verifiedCheckmate()) score += 1000000;
    else if(verifiedCheck()) score += 9000;
    game.undo();
    return score + moveOrderScore(move) / 1000;
  }

  function cpuMove(){
    if(mode !== 'cpu' || game.turn() !== 'b' || game.isGameOver()) return;
    render('OPPONENT THINKING...');
    const moves = game.moves({verbose:true});
    if(!moves.length){ render(); return; }
    const scored = moves.map(move=>({move,score:scoreMove(move)}));
    const best = Math.max(...scored.map(item=>item.score));
    const tied = scored.filter(item=>item.score===best).map(item=>item.move);
    const picked = tied[Math.floor(Math.random() * tied.length)];
    const move = game.move({from:picked.from, to:picked.to, promotion:picked.promotion || 'q'});
    render(move ? move.san : 'CPU PASS');
    if(move) playMoveSound();
    if(move && move.captured) play3dAnnounce('CAPTURE','boss');
    if(verifiedCheckmate()){
      playCheckSound();
      play3dAnnounce('CHECKMATE','success');
    }
    else if(verifiedCheck()){
      playCheckSound();
      play3dAnnounce('CHECK','warning');
    }
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
