(()=>{
'use strict';

/*
PLAY 3D DOMINOES — REAL SPINNER / ALL-FIVES LAYOUT

Rules applied from references:
- Double-six set = 28 tiles.
- 2–4 players.
- 7 tiles each.
- Highest double starts automatically.
- First double is the spinner.
- Spinner has four REAL branch endpoints: left, right, top, bottom.
- A tile must match the exact branch connection value.
- After a tile is played on a branch, that branch's open value becomes the outside end of that tile.
- Do NOT allow random side/top placement unless it matches that branch's current open value.
- Draw until playable; pass only if boneyard is empty.
- Doubles are displayed perpendicular/sideways.
- Round ends when a player goes out or the game is blocked.
- Winner scores opponents' remaining pips.
- First player to 100 wins.
*/

const MAX_PIP = 6;
const WIN_SCORE = 100;

let stock = [];
let hands = [];
let names = [];
let scores = [];
let playerCount = 2;
let current = 0;
let board = null;
let mode = window.Play3DModeBar ? window.Play3DModeBar.getMode() : 'cpu';
let logLines = [];
let handEnded = false;
let gameEnded = false;

const els = {
  leftLine: document.getElementById('leftLine'),
  rightLine: document.getElementById('rightLine'),
  spinnerTop: document.getElementById('spinnerTop'),
  spinnerBottom: document.getElementById('spinnerBottom'),
  spinnerSlot: document.getElementById('spinnerSlot'),
  hand: document.getElementById('hand'),
  log: document.getElementById('log'),
  turnText: document.getElementById('turnText'),
  stateText: document.getElementById('stateText'),
  scoreText: document.getElementById('scoreText'),
  stockCount: document.getElementById('stockCount'),
  handTitle: document.getElementById('handTitle'),
  handHint: document.getElementById('handHint'),
  drawBtn: document.getElementById('drawBtn'),
  passBtn: document.getElementById('passBtn'),
  autoBtn: document.getElementById('autoBtn'),
  twoPlayerBtn: document.getElementById('twoPlayerBtn'),
  fourPlayerBtn: document.getElementById('fourPlayerBtn')
};

function makeId(){
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function buildSet(){
  const tiles = [];
  for(let a=0; a<=MAX_PIP; a++){
    for(let b=a; b<=MAX_PIP; b++){
      tiles.push({a,b,id:a+'-'+b+'-'+makeId(),double:a===b});
    }
  }
  return shuffle(tiles);
}

function shuffle(arr){
  for(let i=arr.length-1; i>0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function setNames(){
  names = playerCount === 4 ? ['YOU','LEFT','PARTNER','RIGHT'] : ['YOU','CPU'];
}

function setPlayerCount(count){
  playerCount = count;
  if(els.twoPlayerBtn) els.twoPlayerBtn.classList.toggle('active', count === 2);
  if(els.fourPlayerBtn) els.fourPlayerBtn.classList.toggle('active', count === 4);
  scores = Array.from({length:playerCount},()=>0);
  gameEnded = false;
  newRound(true);
}

function newGame(){
  scores = Array.from({length:playerCount},()=>0);
  gameEnded = false;
  newRound(true);
}

function newRound(clearLog){
  setNames();
  stock = buildSet();
  hands = Array.from({length:playerCount},()=>stock.splice(0,7));
  board = {
    spinner:null,
    branches:{
      left:[],
      right:[],
      top:[],
      bottom:[]
    },
    open:{
      left:null,
      right:null,
      top:null,
      bottom:null
    }
  };
  current = 0;
  handEnded = false;
  if(clearLog) logLines = [];
  addLog('Round started. 7 tiles each. Boneyard: '+stock.length+'.');
  openHighestDoubleOrTile();
}

function tileTotal(tile){
  return tile.a + tile.b;
}

function findStarter(){
  let best = null;

  // Real dominoes start with highest double.
  hands.forEach((hand, playerIndex)=>{
    hand.forEach((tile, handIndex)=>{
      if(!tile.double) return;
      const score = 100 + tile.a;
      if(!best || score > best.score){
        best = {playerIndex, handIndex, tile, score};
      }
    });
  });

  // Fallback if no double is in dealt hands.
  if(best) return best;

  hands.forEach((hand, playerIndex)=>{
    hand.forEach((tile, handIndex)=>{
      const score = Math.max(tile.a,tile.b) * 10 + tileTotal(tile);
      if(!best || score > best.score){
        best = {playerIndex, handIndex, tile, score};
      }
    });
  });

  return best;
}

function openHighestDoubleOrTile(){
  const starter = findStarter();
  if(!starter){
    addLog('No starter found.');
    render('ERROR');
    return;
  }

  current = starter.playerIndex;
  const tile = hands[current].splice(starter.handIndex, 1)[0];

  board.spinner = clone(tile);
  board.open.left = tile.a;
  board.open.right = tile.b;
  board.open.top = tile.double ? tile.a : null;
  board.open.bottom = tile.double ? tile.a : null;

  addLog(names[current]+' opens with '+tileName(tile)+(tile.double ? ' as the spinner.' : '.'));

  logOpenEnds();

  if(!hands[current].length){
    endRound(current, 'went out on the opener');
    return;
  }

  current = nextIndex(current);
  render(tile.double ? 'SPINNER LIVE' : 'OPEN');
  checkBlockedOrCpu();
}

function clone(tile){
  return {a:tile.a,b:tile.b,id:tile.id,double:tile.a===tile.b};
}

function nextIndex(i){
  return (i + 1) % playerCount;
}

function openBranches(){
  if(!board.spinner) return [];

  return ['left','right','top','bottom']
    .filter(side => board.open[side] !== null && board.open[side] !== undefined)
    .map(side => ({side, value:board.open[side]}));
}

function sidesFor(tile){
  return openBranches()
    .filter(end => tile.a === end.value || tile.b === end.value)
    .map(end => end.side);
}

function orientForSide(tile, side){
  const match = board.open[side];
  if(match === null || match === undefined) return null;
  if(tile.a !== match && tile.b !== match) return null;

  const outer = tile.a === match ? tile.b : tile.a;

  // connection = side touching existing branch/spinner
  // outer = new open end after placement
  return {
    tile: clone(tile),
    connection: match,
    outer,
    a: tile.a,
    b: tile.b,
    double: tile.double,
    side
  };
}

function legalMovesFor(playerIndex){
  const moves = [];
  (hands[playerIndex] || []).forEach((tile, handIndex)=>{
    sidesFor(tile).forEach(side=>{
      moves.push({tile, handIndex, side});
    });
  });
  return moves;
}

function currentCanAct(){
  return current === 0 || mode === 'local';
}

function playTile(playerIndex, handIndex, requestedSide){
  if(handEnded || gameEnded) return;

  if(playerIndex !== current){
    addLog('Wrong turn. It is '+names[current]+"'s turn.");
    render();
    return;
  }

  const tile = hands[playerIndex][handIndex];
  if(!tile) return;

  const legalSides = sidesFor(tile);
  if(!legalSides.length){
    addLog(tileName(tile)+' does not match any open branch end.');
    render();
    return;
  }

  const side = legalSides.includes(requestedSide) ? requestedSide : legalSides[0];
  const placement = orientForSide(tile, side);

  if(!placement){
    addLog(tileName(tile)+' cannot connect to '+side.toUpperCase()+'.');
    render();
    return;
  }

  hands[playerIndex].splice(handIndex, 1);
  board.branches[side].push(placement);
  board.open[side] = placement.outer;

  addLog(
    names[playerIndex]+' played '+tileName(tile)+
    ' on '+side.toUpperCase()+
    ' matching '+placement.connection+
    '. New '+side.toUpperCase()+' open end: '+placement.outer+'.'
  );

  logOpenEnds();

  if(!hands[playerIndex].length){
    endRound(playerIndex, 'went out');
    return;
  }

  current = nextIndex(current);
  render();
  checkBlockedOrCpu();
}

function openEndSummary(){
  return openBranches().map(end=>end.side.toUpperCase()+':'+end.value).join(' | ');
}

function logOpenEnds(){
  const summary = openEndSummary();
  if(summary){
    addLog('Open ends: '+summary+'.');
  }
}

function drawUntilPlayableOrPass(playerIndex){
  if(handEnded || gameEnded) return false;

  let drawn = 0;

  while(stock.length && legalMovesFor(playerIndex).length === 0){
    hands[playerIndex].push(stock.pop());
    drawn++;
  }

  if(drawn){
    addLog(names[playerIndex]+' drew '+drawn+' tile'+(drawn===1?'':'s')+'.');
  }

  if(legalMovesFor(playerIndex).length){
    render();
    return true;
  }

  addLog(names[playerIndex]+' passes. No move and boneyard empty.');
  current = nextIndex(current);
  render();
  checkBlockedOrCpu();
  return false;
}

function humanDraw(){
  if(!currentCanAct()){
    addLog('Wait for '+names[current]+'.');
    return;
  }
  drawUntilPlayableOrPass(current);
}

function humanPass(){
  if(!currentCanAct()){
    addLog('Wait for '+names[current]+'.');
    return;
  }
  if(legalMovesFor(current).length){
    addLog('You have a legal move. You cannot pass.');
    return;
  }
  if(stock.length){
    addLog('You must draw until playable before passing.');
    humanDraw();
    return;
  }
  addLog(names[current]+' passes.');
  current = nextIndex(current);
  render();
  checkBlockedOrCpu();
}

function autoPlayCurrent(){
  if(handEnded || gameEnded) return;
  const moves = legalMovesFor(current);
  if(moves.length){
    const best = chooseBestMove(moves);
    playTile(current, best.handIndex, best.side);
  }else{
    drawUntilPlayableOrPass(current);
  }
}

function chooseBestMove(moves){
  return [...moves].sort((a,b)=>{
    const aScore = projectedScore(a) + (a.tile.double ? 6 : 0) + tileTotal(a.tile);
    const bScore = projectedScore(b) + (b.tile.double ? 6 : 0) + tileTotal(b.tile);
    return bScore - aScore;
  })[0];
}

function projectedScore(move){
  const old = board.open[move.side];
  const outer = move.tile.a === old ? move.tile.b : move.tile.a;
  const total = openBranches().reduce((sum,end)=>{
    return sum + (end.side === move.side ? outer : end.value);
  },0);
  return total % 5 === 0 ? total : 0;
}

function isCpuTurn(){
  if(handEnded || gameEnded) return false;
  if(mode === 'fan' || mode === 'local') return false;
  return current !== 0;
}

function checkBlockedOrCpu(){
  if(handEnded || gameEnded) return;

  if(stock.length === 0 && hands.every((_,i)=>legalMovesFor(i).length === 0)){
    endBlockedRound();
    return;
  }

  if(isCpuTurn()){
    setTimeout(cpuTurn, 650);
  }
}

function cpuTurn(){
  if(!isCpuTurn()) return;

  addLog(names[current]+' is thinking...');
  const moves = legalMovesFor(current);

  if(moves.length){
    const best = chooseBestMove(moves);
    setTimeout(()=>playTile(current, best.handIndex, best.side), 350);
    return;
  }

  let drawn = 0;
  while(stock.length && legalMovesFor(current).length === 0){
    hands[current].push(stock.pop());
    drawn++;
  }

  if(drawn){
    addLog(names[current]+' drew '+drawn+' tile'+(drawn===1?'':'s')+'.');
  }

  const after = legalMovesFor(current);
  if(after.length){
    const best = chooseBestMove(after);
    render();
    setTimeout(()=>playTile(current, best.handIndex, best.side), 450);
    return;
  }

  addLog(names[current]+' passes. No move and boneyard empty.');
  current = nextIndex(current);
  render();
  checkBlockedOrCpu();
}

function pipTotal(hand){
  return hand.reduce((sum,t)=>sum + t.a + t.b, 0);
}

function opponentPips(winner){
  return hands.reduce((sum,hand,i)=> i === winner ? sum : sum + pipTotal(hand), 0);
}

function endRound(winner, reason){
  handEnded = true;
  const pts = opponentPips(winner);
  scores[winner] += pts;
  addLog(names[winner]+' '+reason+' and scores opponents pips: '+pts+'.');

  if(scores[winner] >= WIN_SCORE){
    gameEnded = true;
    addLog(names[winner]+' wins the game at '+scores[winner]+' points.');
  }

  render(gameEnded ? 'GAME OVER' : 'ROUND OVER');
}

function endBlockedRound(){
  handEnded = true;
  const totals = hands.map(pipTotal);
  const low = Math.min(...totals);
  const winner = totals.indexOf(low);
  const pts = opponentPips(winner);
  scores[winner] += pts;
  addLog('Blocked round. '+names[winner]+' has lowest pips ('+low+') and scores '+pts+'.');

  if(scores[winner] >= WIN_SCORE){
    gameEnded = true;
    addLog(names[winner]+' wins the game at '+scores[winner]+' points.');
  }

  render(gameEnded ? 'GAME OVER' : 'BLOCKED');
}

function tileName(tile){
  return tile.a+'-'+tile.b;
}

function pips(n){
  const spots = {
    0:[],
    1:[5],
    2:[1,9],
    3:[1,5,9],
    4:[1,3,7,9],
    5:[1,3,5,7,9],
    6:[1,3,4,6,7,9]
  }[Number(n)] || [];

  return Array.from({length:9},(_,i)=>{
    return spots.includes(i+1) ? '<i class="pip"></i>' : '<i></i>';
  }).join('');
}

function dominoHTML(tile, options={}){
  const a = options.displayA ?? tile.a ?? tile.connection;
  const b = options.displayB ?? tile.b ?? tile.outer;
  const double = options.double ?? tile.double ?? (a === b);
  const connect = options.connect || null;
  const cls = ['domino', double ? 'double' : '', options.spinner ? 'spinner' : '', options.side || ''].join(' ');
  const firstConnect = connect === 'first' ? ' connect' : '';
  const secondConnect = connect === 'second' ? ' connect' : '';

  return `<div class="${cls}" title="${a}-${b}">
    <span class="half${firstConnect}">${pips(a)}</span>
    <span class="divider"></span>
    <span class="half${secondConnect}">${pips(b)}</span>
  </div>`;
}

function renderBranch(node, side){
  if(!node) return;
  const branch = board.branches[side] || [];
  const list = side === 'left' || side === 'top' ? [...branch].reverse() : branch;

  node.innerHTML = list.map((p, idx)=>{
    const isConnectionEnd =
      (side === 'left' || side === 'top')
        ? idx === list.length - 1
        : idx === 0;

    const displayA = (side === 'left' || side === 'top') ? p.outer : p.connection;
    const displayB = (side === 'left' || side === 'top') ? p.connection : p.outer;

    // left/top: connection is second half, closest to spinner/previous branch
    // right/bottom: connection is first half, closest to spinner/previous branch
    const connect = isConnectionEnd
      ? ((side === 'left' || side === 'top') ? 'second' : 'first')
      : null;

    return dominoHTML(p.tile, {
      double:p.double,
      side,
      displayA,
      displayB,
      connect
    });
  }).join('');
}

function renderBoard(){
  renderBranch(els.leftLine,'left');
  renderBranch(els.rightLine,'right');
  renderBranch(els.spinnerTop,'top');
  renderBranch(els.spinnerBottom,'bottom');

  if(els.spinnerSlot){
    els.spinnerSlot.innerHTML = board.spinner
      ? dominoHTML(board.spinner,{double:board.spinner.double,spinner:board.spinner.double,side:'spinner'})
      : '<div class="empty-slot">FIRST TILE</div>';
  }
}

function renderHand(){
  const hand = hands[current] || [];
  const canAct = currentCanAct();

  if(els.handTitle) els.handTitle.textContent = names[current]+"'S HAND";
  if(els.handHint){
    els.handHint.textContent = canAct
      ? 'Playable tiles show exact branch matches. Normal scoring happens when someone goes out or the round blocks.'
      : 'CPU is playing...';
  }

  if(!els.hand) return;

  els.hand.innerHTML = hand.map((tile,i)=>{
    const sides = sidesFor(tile);
    const legal = sides.length > 0;
    return `<button class="domino-btn ${legal?'selected':''}" data-i="${i}" ${canAct?'':'disabled'}>
      ${dominoHTML(tile,{double:tile.double})}
      <small>${legal ? sides.map(s=>s.toUpperCase()+':'+board.open[s]).join(' / ') : 'NO FIT'}</small>
    </button>`;
  }).join('');

  els.hand.querySelectorAll('[data-i]').forEach(btn=>{
    btn.onclick = () => {
      const i = Number(btn.dataset.i);
      const tile = hand[i];
      const sides = sidesFor(tile);
      playTile(current, i, sides[0]);
    };
  });
}

function renderSeats(){
  const seatMap = playerCount === 4
    ? {seatSouth:0, seatWest:1, seatNorth:2, seatEast:3}
    : {seatSouth:0, seatNorth:1};

  ['seatSouth','seatWest','seatNorth','seatEast'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    if(!(id in seatMap)){
      el.style.display = 'none';
      return;
    }
    const idx = seatMap[id];
    el.style.display = '';
    el.textContent = names[idx]+' ('+(hands[idx] ? hands[idx].length : 0)+')';
    el.classList.toggle('active', idx === current && !handEnded && !gameEnded);
  });
}

function render(label){
  renderBoard();
  renderHand();
  renderSeats();

  if(els.turnText) els.turnText.textContent = handEnded || gameEnded ? 'DONE' : (names[current] || 'YOU');

  if(els.stateText){
    els.stateText.textContent =
      label ||
      (gameEnded ? 'GAME OVER' : handEnded ? 'ROUND OVER' : board.spinner && board.spinner.double ? 'SPINNER LIVE' : 'LIVE');
  }

  if(els.stockCount) els.stockCount.textContent = stock.length;

  if(els.scoreText){
    els.scoreText.textContent = names.map((n,i)=> n + ': ' + (scores[i] || 0) + ' pts / ' + pipTotal(hands[i] || []) + ' pips').join(' | ');
  }

  const humanTurn = currentCanAct();

  if(els.drawBtn) els.drawBtn.disabled = handEnded || gameEnded || !humanTurn;
  if(els.passBtn) els.passBtn.disabled = handEnded || gameEnded || !humanTurn;
  if(els.autoBtn) els.autoBtn.disabled = handEnded || gameEnded || !humanTurn;

  if(els.log) els.log.innerHTML = logLines.map(x=>'<li>'+x+'</li>').join('');
}

function addLog(msg){
  logLines.unshift(msg);
  logLines = logLines.slice(0,18);
  if(els.log) els.log.innerHTML = logLines.map(x=>'<li>'+x+'</li>').join('');
}

document.getElementById('newBtn')?.addEventListener('click', newGame);
document.getElementById('drawBtn')?.addEventListener('click', humanDraw);
document.getElementById('passBtn')?.addEventListener('click', humanPass);
document.getElementById('autoBtn')?.addEventListener('click', autoPlayCurrent);

els.twoPlayerBtn?.addEventListener('click', ()=>setPlayerCount(2));
els.fourPlayerBtn?.addEventListener('click', ()=>setPlayerCount(4));

window.addEventListener('play3d:modechange', event=>{
  mode = event.detail.mode;
  newRound(true);
});

scores = Array.from({length:playerCount},()=>0);
newRound(true);
})();