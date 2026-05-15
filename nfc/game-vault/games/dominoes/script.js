(()=>{
'use strict';

/*
PLAY 3D DOMINOES — DRAW/SPINNER RULES APPLIED

Rules applied:
- Double-six set = 28 tiles.
- 2–4 players, 7 tiles each.
- Highest double starts the round.
- If CPU owns highest double, CPU auto-plays it.
- If no double exists in dealt hands, highest pip tile starts.
- Clockwise turns.
- If blocked, player draws until playable or boneyard empty.
- If boneyard empty and still blocked, player passes.
- First double played is the spinner and opens 4 sides.
- All doubles render sideways.
- Round ends when player goes out.
- Round also ends on block when no player can move and boneyard empty.
- Winner scores opponents' remaining pips.
- First to 100 wins game.
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
      tiles.push({
        a,
        b,
        id:a + '-' + b + '-' + makeId(),
        double:a === b
      });
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

function setPlayerCount(count){
  playerCount = count;
  if(els.twoPlayerBtn) els.twoPlayerBtn.classList.toggle('active', count === 2);
  if(els.fourPlayerBtn) els.fourPlayerBtn.classList.toggle('active', count === 4);
  scores = Array.from({length:playerCount},()=>0);
  newRound(true);
}

function setNames(){
  names = playerCount === 4
    ? ['YOU','LEFT','PARTNER','RIGHT']
    : ['YOU','CPU'];
}

function newGame(){
  scores = Array.from({length:playerCount},()=>0);
  gameEnded = false;
  newRound(true);
}

function newRound(resetLog){
  setNames();
  stock = buildSet();
  hands = Array.from({length:playerCount},()=>stock.splice(0,7));
  board = { spinner:null, left:[], right:[], top:[], bottom:[] };
  handEnded = false;
  if(resetLog) logLines = [];

  addLog('Round started. Each player drew 7 tiles.');
  openWithHighestTile();
}

function tileTotal(tile){
  return tile.a + tile.b;
}

function findHighestStarter(){
  let best = null;

  hands.forEach((hand, playerIndex)=>{
    hand.forEach((tile, handIndex)=>{
      if(!tile.double) return;
      const score = 100 + tile.a;
      if(!best || score > best.score){
        best = {playerIndex, handIndex, tile, score};
      }
    });
  });

  if(best) return best;

  hands.forEach((hand, playerIndex)=>{
    hand.forEach((tile, handIndex)=>{
      const high = Math.max(tile.a, tile.b);
      const score = high * 10 + tileTotal(tile);
      if(!best || score > best.score){
        best = {playerIndex, handIndex, tile, score};
      }
    });
  });

  return best;
}

function openWithHighestTile(){
  const starter = findHighestStarter();

  if(!starter){
    addLog('No starter found. Restarting round.');
    render('ERROR');
    return;
  }

  current = starter.playerIndex;

  // Opening tile is forced by rule. CPU and player do not have to click it.
  const tile = hands[current].splice(starter.handIndex, 1)[0];
  const placed = {
    tile: cloneTile(tile),
    left: tile.a,
    right: tile.b,
    open: null,
    double: tile.double,
    side: 'start',
    isSpinner: tile.double
  };

  board.spinner = placed;

  addLog(names[current] + ' opened with ' + tileName(tile) + (tile.double ? ' — highest double spinner.' : ' — highest tile, no doubles dealt.'));

  if(!hands[current].length){
    endRound(current, 'went out on the opener');
    return;
  }

  current = nextIndex(current);
  render(tile.double ? 'SPINNER LIVE' : 'OPEN');
  scheduleCpuIfNeeded();
}

function cloneTile(tile){
  return {a:tile.a,b:tile.b,id:tile.id,double:tile.a===tile.b};
}

function nextIndex(i){
  return (i + 1) % playerCount;
}

function getOpenEnds(){
  if(!board || !board.spinner) return [];

  const ends = [];

  const leftEnd = board.left.length
    ? board.left[board.left.length - 1].open
    : board.spinner.left;

  const rightEnd = board.right.length
    ? board.right[board.right.length - 1].open
    : board.spinner.right;

  ends.push({side:'left', value:leftEnd});
  ends.push({side:'right', value:rightEnd});

  if(board.spinner.double){
    const spin = board.spinner.left;
    const topEnd = board.top.length ? board.top[board.top.length - 1].open : spin;
    const bottomEnd = board.bottom.length ? board.bottom[board.bottom.length - 1].open : spin;

    ends.push({side:'top', value:topEnd});
    ends.push({side:'bottom', value:bottomEnd});
  }

  return ends;
}

function sidesFor(tile){
  if(!board.spinner) return [];
  return getOpenEnds()
    .filter(end => tile.a === end.value || tile.b === end.value)
    .map(end => end.side);
}

function orientForSide(tile, side){
  const end = getOpenEnds().find(e=>e.side === side);
  if(!end) return null;

  const match = end.value;
  let inner;
  let open;

  if(tile.a === match){
    inner = tile.a;
    open = tile.b;
  }else if(tile.b === match){
    inner = tile.b;
    open = tile.a;
  }else{
    return null;
  }

  if(side === 'left'){
    return {tile:cloneTile(tile), left:open, right:inner, open, double:tile.double, side};
  }

  if(side === 'right'){
    return {tile:cloneTile(tile), left:inner, right:open, open, double:tile.double, side};
  }

  return {tile:cloneTile(tile), left:inner, right:open, open, double:tile.double, side};
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
    addLog('Wrong turn. It is ' + names[current] + "'s turn.");
    render();
    return;
  }

  const tile = hands[playerIndex][handIndex];
  if(!tile) return;

  const legalSides = sidesFor(tile);
  if(!legalSides.length){
    addLog(tileName(tile) + ' does not fit.');
    render();
    return;
  }

  const side = legalSides.includes(requestedSide) ? requestedSide : legalSides[0];
  const placed = orientForSide(tile, side);
  if(!placed){
    addLog(tileName(tile) + ' could not be placed.');
    render();
    return;
  }

  hands[playerIndex].splice(handIndex, 1);
  board[side].push(placed);

  addLog(names[playerIndex] + ' played ' + tileName(tile) + ' on ' + side.toUpperCase() + (tile.double ? ' — double sideways.' : '.'));

  if(!hands[playerIndex].length){
    endRound(playerIndex, 'went out');
    return;
  }

  current = nextIndex(current);
  render();
  checkBlockedOrCpu();
}

function drawUntilPlayableOrPass(playerIndex){
  if(handEnded || gameEnded) return;

  let drawn = 0;
  while(stock.length && legalMovesFor(playerIndex).length === 0){
    hands[playerIndex].push(stock.pop());
    drawn++;
  }

  if(drawn){
    addLog(names[playerIndex] + ' drew ' + drawn + ' tile' + (drawn === 1 ? '' : 's') + '.');
  }

  const moves = legalMovesFor(playerIndex);

  if(moves.length){
    render();
    return true;
  }

  addLog(names[playerIndex] + ' passed. Boneyard empty or no playable tile.');
  current = nextIndex(current);
  render();
  checkBlockedOrCpu();
  return false;
}

function humanDraw(){
  if(handEnded || gameEnded) return;
  if(!currentCanAct()){
    addLog('Wait for ' + names[current] + '.');
    return;
  }

  const playable = drawUntilPlayableOrPass(current);
  if(playable){
    addLog(names[current] + ' can now play.');
    render();
  }
}

function humanPass(){
  if(handEnded || gameEnded) return;
  if(!currentCanAct()){
    addLog('Wait for ' + names[current] + '.');
    return;
  }

  if(legalMovesFor(current).length){
    addLog('You have a playable tile. You cannot pass.');
    render();
    return;
  }

  if(stock.length){
    addLog('You must draw until playable before passing.');
    humanDraw();
    return;
  }

  addLog(names[current] + ' passed.');
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
    return;
  }

  drawUntilPlayableOrPass(current);

  if(currentCanAct()){
    const afterDraw = legalMovesFor(current);
    if(afterDraw.length){
      const best = chooseBestMove(afterDraw);
      playTile(current, best.handIndex, best.side);
    }
  }
}

function chooseBestMove(moves){
  return [...moves].sort((a,b)=>{
    const aScore = (a.tile.double ? 40 : 0) + tileTotal(a.tile) + ((a.side === 'top' || a.side === 'bottom') ? 12 : 0);
    const bScore = (b.tile.double ? 40 : 0) + tileTotal(b.tile) + ((b.side === 'top' || b.side === 'bottom') ? 12 : 0);
    return bScore - aScore;
  })[0];
}

function isCpuTurn(){
  if(handEnded || gameEnded) return false;
  if(mode === 'fan') return false;
  if(mode === 'local') return false;
  return current !== 0;
}

function scheduleCpuIfNeeded(){
  if(isCpuTurn()){
    window.setTimeout(cpuTurn, 650);
  }
}

function cpuTurn(){
  if(!isCpuTurn()) return;

  addLog(names[current] + ' is thinking...');

  const moves = legalMovesFor(current);
  if(moves.length){
    const best = chooseBestMove(moves);
    window.setTimeout(()=>playTile(current, best.handIndex, best.side), 350);
    return;
  }

  let drawn = 0;
  while(stock.length && legalMovesFor(current).length === 0){
    hands[current].push(stock.pop());
    drawn++;
  }

  if(drawn){
    addLog(names[current] + ' drew ' + drawn + ' tile' + (drawn === 1 ? '' : 's') + '.');
  }

  const afterDraw = legalMovesFor(current);
  if(afterDraw.length){
    const best = chooseBestMove(afterDraw);
    render();
    window.setTimeout(()=>playTile(current, best.handIndex, best.side), 450);
    return;
  }

  addLog(names[current] + ' passed.');
  current = nextIndex(current);
  render();
  checkBlockedOrCpu();
}

function checkBlockedOrCpu(){
  if(handEnded || gameEnded) return;

  if(stock.length === 0 && hands.every((_,i)=>legalMovesFor(i).length === 0)){
    endBlockedRound();
    return;
  }

  scheduleCpuIfNeeded();
}

function pipTotal(hand){
  return hand.reduce((sum,t)=>sum + t.a + t.b, 0);
}

function opponentsPips(winner){
  return hands.reduce((sum, hand, i)=> i === winner ? sum : sum + pipTotal(hand), 0);
}

function endRound(winner, reason){
  handEnded = true;
  const gained = opponentsPips(winner);
  scores[winner] += gained;
  addLog(names[winner] + ' ' + reason + ' and scores ' + gained + ' pips.');

  if(scores[winner] >= WIN_SCORE){
    gameEnded = true;
    addLog(names[winner] + ' wins the game at ' + scores[winner] + ' points.');
    render('GAME OVER');
    return;
  }

  render('ROUND OVER');
}

function endBlockedRound(){
  handEnded = true;

  const totals = hands.map(pipTotal);
  const lowest = Math.min(...totals);
  const winner = totals.indexOf(lowest);
  const gained = opponentsPips(winner);

  scores[winner] += gained;

  addLog('Blocked round. ' + names[winner] + ' has lowest count (' + lowest + ') and scores ' + gained + '.');

  if(scores[winner] >= WIN_SCORE){
    gameEnded = true;
    addLog(names[winner] + ' wins the game at ' + scores[winner] + ' points.');
    render('GAME OVER');
    return;
  }

  render('BLOCKED');
}

function tileName(tile){
  return tile.a + '-' + tile.b;
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

function dominoHTML(values, options={}){
  const a = values.left ?? values.a;
  const b = values.right ?? values.b;
  const double = options.double ?? values.double ?? (a === b);

  const cls = [
    'domino',
    double ? 'double' : '',
    options.spinner ? 'spinner' : ''
  ].join(' ');

  return `<div class="${cls}" title="${a}-${b}">
    <span class="half">${pips(a)}</span>
    <span class="divider"></span>
    <span class="half">${pips(b)}</span>
  </div>`;
}

function renderBranch(node, items, reverse=false){
  if(!node) return;
  const list = reverse ? [...items].reverse() : items;
  node.innerHTML = list.map(item=>dominoHTML(item,{double:item.double})).join('');
}

function renderBoard(){
  renderBranch(els.leftLine, board.left, true);
  renderBranch(els.rightLine, board.right, false);
  renderBranch(els.spinnerTop, board.top, true);
  renderBranch(els.spinnerBottom, board.bottom, false);

  if(els.spinnerSlot){
    els.spinnerSlot.innerHTML = board.spinner
      ? dominoHTML(board.spinner,{double:board.spinner.double, spinner:board.spinner.isSpinner})
      : '<div class="empty-slot">FIRST TILE</div>';
  }
}

function renderHand(){
  const active = hands[current] || [];
  const canAct = currentCanAct();

  if(els.handTitle) els.handTitle.textContent = names[current] + "'S HAND";
  if(els.handHint){
    els.handHint.textContent = canAct
      ? 'Playable tiles are highlighted. Draw until playable if blocked.'
      : 'CPU is playing...';
  }

  if(!els.hand) return;

  els.hand.innerHTML = active.map((tile,i)=>{
    const sides = sidesFor(tile);
    const legal = sides.length > 0;

    return `<button class="domino-btn ${legal ? 'selected' : ''}" data-i="${i}" ${canAct ? '' : 'disabled'}>
      ${dominoHTML(tile,{double:tile.double})}
      <small>${legal ? sides.join(' / ').toUpperCase() : 'NO FIT'}</small>
    </button>`;
  }).join('');

  els.hand.querySelectorAll('[data-i]').forEach(btn=>{
    btn.onclick = () => {
      const i = Number(btn.dataset.i);
      const tile = active[i];
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
    el.textContent = names[idx] + ' (' + (hands[idx] ? hands[idx].length : 0) + ')';
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
      (gameEnded ? 'GAME OVER' : handEnded ? 'ROUND OVER' : board.spinner && board.spinner.isSpinner ? 'SPINNER LIVE' : 'LIVE');
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
  logLines = logLines.slice(0,16);
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

// Start the game.
scores = Array.from({length:playerCount},()=>0);
newRound(true);
})();