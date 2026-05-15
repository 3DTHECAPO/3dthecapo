(()=>{
'use strict';

const MAX_PIP = 6;
let stock = [];
let hands = [];
let names = [];
let playerCount = 2;
let current = 0;
let board = null;
let mode = window.Play3DModeBar ? window.Play3DModeBar.getMode() : 'cpu';
let selectedSide = null;
let logLines = [];
let handEnded = false;

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
  twoPlayerBtn: document.getElementById('twoPlayerBtn'),
  fourPlayerBtn: document.getElementById('fourPlayerBtn')
};

function makeId(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function cloneTile(tile){
  return {a:tile.a,b:tile.b,id:tile.id,double:tile.a===tile.b};
}

function buildSet(){
  const tiles = [];
  for(let a=0;a<=MAX_PIP;a++){
    for(let b=a;b<=MAX_PIP;b++){
      tiles.push({a,b,id:a+'-'+b+'-'+makeId(),double:a===b});
    }
  }
  return shuffle(tiles);
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function setPlayerCount(count){
  playerCount = count;
  els.twoPlayerBtn.classList.toggle('active', count === 2);
  els.fourPlayerBtn.classList.toggle('active', count === 4);
  newGame();
}

function setNames(){
  names = playerCount === 4
    ? ['YOU','LEFT','PARTNER','RIGHT']
    : ['YOU','CPU'];
}

function newGame(){
  setNames();
  stock = buildSet();
  hands = Array.from({length:playerCount},()=>stock.splice(0,7));
  current = findStartingPlayer();
  board = {
    spinner:null,
    left:[],
    right:[],
    top:[],
    bottom:[]
  };
  selectedSide = null;
  handEnded = false;
  logLines = [];
  addLog(playerCount + '-player table started. ' + names[current] + ' opens.');
  render();
  if(isCpuTurn()) setTimeout(cpuTurn, 650);
}

function findStartingPlayer(){
  let best = {p:0,score:-1};
  hands.forEach((hand,p)=>{
    hand.forEach(t=>{
      const score = t.double ? 100 + t.a : t.a + t.b;
      if(score > best.score) best = {p,score};
    });
  });
  return best.p;
}

function getOpenEnds(){
  if(!board || !board.spinner) return [];
  const ends = [];
  const spinnerValue = board.spinner.a;

  const leftEnd = board.left.length ? board.left[board.left.length - 1].open : board.spinner.left;
  const rightEnd = board.right.length ? board.right[board.right.length - 1].open : board.spinner.right;

  ends.push({side:'left', value:leftEnd});
  ends.push({side:'right', value:rightEnd});

  if(board.spinner.double){
    const topEnd = board.top.length ? board.top[board.top.length - 1].open : spinnerValue;
    const bottomEnd = board.bottom.length ? board.bottom[board.bottom.length - 1].open : spinnerValue;
    ends.push({side:'top', value:topEnd});
    ends.push({side:'bottom', value:bottomEnd});
  }
  return ends;
}

function sidesFor(tile){
  if(!board.spinner) return ['start'];
  return getOpenEnds()
    .filter(end => tile.a === end.value || tile.b === end.value)
    .map(end => end.side);
}

function orientForSide(tile, side){
  if(side === 'start'){
    return {tile:cloneTile(tile), left:tile.a, right:tile.b, open:null, double:tile.double, side:'start'};
  }

  const end = getOpenEnds().find(e=>e.side === side);
  const match = end ? end.value : null;
  let inner, open;

  if(tile.a === match){ inner = tile.a; open = tile.b; }
  else { inner = tile.b; open = tile.a; }

  if(side === 'left'){
    return {tile:cloneTile(tile), left:open, right:inner, open, double:tile.double, side};
  }
  if(side === 'right'){
    return {tile:cloneTile(tile), left:inner, right:open, open, double:tile.double, side};
  }
  if(side === 'top'){
    return {tile:cloneTile(tile), left:inner, right:open, open, double:tile.double, side};
  }
  if(side === 'bottom'){
    return {tile:cloneTile(tile), left:inner, right:open, open, double:tile.double, side};
  }
}

function playTile(playerIndex, handIndex, requestedSide){
  if(handEnded) return;
  if(playerIndex !== current){
    addLog('Not ' + names[playerIndex] + "'s turn.");
    render();
    return;
  }

  const hand = hands[playerIndex];
  const tile = hand[handIndex];
  if(!tile) return;

  const legalSides = sidesFor(tile);
  if(!legalSides.length){
    addLog(tileName(tile) + ' does not fit any open end.');
    render();
    return;
  }

  let side = requestedSide || selectedSide;
  if(!side || !legalSides.includes(side)) side = legalSides[0];

  hand.splice(handIndex,1);

  if(side === 'start'){
    const placed = orientForSide(tile,'start');
    board.spinner = {
      ...placed,
      isSpinner: tile.double,
      left: tile.a,
      right: tile.b
    };
    addLog(names[playerIndex] + ' opened with ' + tileName(tile) + (tile.double ? ' — SPINNER OPEN.' : '.'));
  }else{
    const placed = orientForSide(tile, side);
    board[side].push(placed);
    addLog(names[playerIndex] + ' played ' + tileName(tile) + ' on ' + side.toUpperCase() + '.');
  }

  selectedSide = null;

  if(!hand.length){
    endHand(playerIndex);
    return;
  }

  nextTurn();
}

function nextTurn(){
  current = (current + 1) % playerCount;
  render();

  if(allPlayersBlocked()){
    endBlockedHand();
    return;
  }

  if(isCpuTurn()) setTimeout(cpuTurn, 650);
}

function isCpuTurn(){
  if(handEnded) return false;
  if(mode === 'local') return false;
  if(mode === 'fan') return false;
  return current !== 0;
}

function legalMovesFor(playerIndex){
  const moves = [];
  hands[playerIndex].forEach((tile,i)=>{
    sidesFor(tile).forEach(side=>moves.push({tile,index:i,side}));
  });
  return moves;
}

function cpuTurn(){
  if(!isCpuTurn()) return;
  const moves = legalMovesFor(current);
  if(moves.length){
    moves.sort((a,b)=>{
      const aScore = (a.tile.double ? 30 : 0) + a.tile.a + a.tile.b + (a.side === 'top' || a.side === 'bottom' ? 10 : 0);
      const bScore = (b.tile.double ? 30 : 0) + b.tile.a + b.tile.b + (b.side === 'top' || b.side === 'bottom' ? 10 : 0);
      return bScore - aScore;
    });
    playTile(current, moves[0].index, moves[0].side);
    return;
  }

  if(stock.length){
    const drawn = stock.pop();
    hands[current].push(drawn);
    addLog(names[current] + ' drew from the boneyard.');
    render();
    setTimeout(cpuTurn, 450);
  }else{
    addLog(names[current] + ' passed.');
    nextTurn();
  }
}

function draw(){
  if(handEnded) return;
  if(current !== 0 && mode !== 'local'){
    addLog('Wait for ' + names[current] + '.');
    render();
    return;
  }
  if(!stock.length){
    addLog('Boneyard empty. Pass instead.');
    render();
    return;
  }
  hands[current].push(stock.pop());
  addLog(names[current] + ' drew from the boneyard.');
  render();
}

function pass(){
  if(handEnded) return;
  if(legalMovesFor(current).length){
    addLog('You have a legal move. Play before passing.');
    render();
    return;
  }
  addLog(names[current] + ' passed.');
  nextTurn();
}

function autoPlay(){
  if(handEnded) return;
  const moves = legalMovesFor(current);
  if(moves.length){
    playTile(current, moves[0].index, moves[0].side);
  }else if(stock.length){
    draw();
  }else{
    pass();
  }
}

function allPlayersBlocked(){
  if(stock.length) return false;
  return hands.every((_,i)=>legalMovesFor(i).length === 0);
}

function pipTotal(hand){
  return hand.reduce((sum,t)=>sum+t.a+t.b,0);
}

function endHand(playerIndex){
  handEnded = true;
  const won = names[playerIndex];
  addLog(won + ' DOMINO! Hand over.');
  render('HAND OVER');
}

function endBlockedHand(){
  handEnded = true;
  const totals = hands.map(pipTotal);
  const min = Math.min(...totals);
  const winner = totals.indexOf(min);
  addLog('Blocked game. ' + names[winner] + ' wins with lowest count: ' + min + '.');
  render('BLOCKED');
}

function tileName(tile){ return tile.a + '-' + tile.b; }

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
  return Array.from({length:9},(_,i)=> spots.includes(i+1) ? '<i class="pip"></i>' : '<i></i>').join('');
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
  const list = reverse ? [...items].reverse() : items;
  node.innerHTML = list.map(item=>dominoHTML(item,{double:item.double})).join('');
}

function renderBoard(){
  renderBranch(els.leftLine, board.left, true);
  renderBranch(els.rightLine, board.right, false);
  renderBranch(els.spinnerTop, board.top, true);
  renderBranch(els.spinnerBottom, board.bottom, false);
  els.spinnerSlot.innerHTML = board.spinner
    ? dominoHTML(board.spinner,{double:board.spinner.double, spinner:board.spinner.isSpinner})
    : '<div class="empty-slot">FIRST TILE</div>';
}

function renderHand(){
  const active = hands[current] || [];
  const humanCanAct = current === 0 || mode === 'local';
  els.handTitle.textContent = names[current] + "'S HAND";
  els.handHint.textContent = humanCanAct ? 'Playable tiles are highlighted. Doubles rotate sideways on the board.' : 'CPU is thinking...';

  els.hand.innerHTML = active.map((tile,i)=>{
    const sides = sidesFor(tile);
    const legal = sides.length > 0;
    return `<button class="domino-btn ${legal ? 'selected' : ''}" data-i="${i}" ${humanCanAct ? '' : 'disabled'}>
      ${dominoHTML(tile,{double:tile.double})}
      <small>${legal ? sides.join(' / ').toUpperCase() : 'NO FIT'}</small>
    </button>`;
  }).join('');

  els.hand.querySelectorAll('[data-i]').forEach(btn=>{
    btn.onclick = () => {
      const tile = active[Number(btn.dataset.i)];
      const sides = sidesFor(tile);
      if(sides.length > 1){
        selectedSide = sides[0];
      }
      playTile(current, Number(btn.dataset.i));
    };
  });
}

function renderSeats(){
  ['seatSouth','seatWest','seatNorth','seatEast'].forEach((id,i)=>{
    const el = els[id] || document.getElementById(id);
    if(!el) return;
    if(i >= playerCount && id !== 'seatNorth'){ el.style.display = 'none'; return; }
    el.style.display = '';
  });

  const seatMap = playerCount === 4
    ? {seatSouth:0, seatWest:1, seatNorth:2, seatEast:3}
    : {seatSouth:0, seatNorth:1};

  Object.entries(seatMap).forEach(([id,idx])=>{
    const el = document.getElementById(id);
    if(el){
      el.textContent = names[idx] + ' (' + hands[idx].length + ')';
      el.classList.toggle('active', idx === current);
    }
  });
}

function render(label){
  renderBoard();
  renderHand();
  renderSeats();

  els.turnText.textContent = names[current] || 'YOU';
  els.stateText.textContent = label || (handEnded ? 'HAND OVER' : (mode === 'fan' ? 'FAN ROOM' : (board.spinner && board.spinner.isSpinner ? 'SPINNER LIVE' : 'LIVE')));
  els.stockCount.textContent = stock.length;

  const totals = hands.map((h,i)=>names[i] + ': ' + pipTotal(h));
  els.scoreText.textContent = totals.join(' | ');

  els.drawBtn.disabled = handEnded || !stock.length || (current !== 0 && mode !== 'local');
  els.passBtn.disabled = handEnded || (current !== 0 && mode !== 'local');
  els.autoBtn.disabled = handEnded || (current !== 0 && mode !== 'local');

  if(els.log) els.log.innerHTML = logLines.map(x=>'<li>'+x+'</li>').join('');
}

function addLog(msg){
  logLines.unshift(msg);
  logLines = logLines.slice(0,14);
  if(els.log) els.log.innerHTML = logLines.map(x=>'<li>'+x+'</li>').join('');
}

document.getElementById('newBtn').addEventListener('click', newGame);
document.getElementById('drawBtn').addEventListener('click', draw);
document.getElementById('passBtn').addEventListener('click', pass);
document.getElementById('autoBtn').addEventListener('click', autoPlay);
els.twoPlayerBtn.addEventListener('click', ()=>setPlayerCount(2));
els.fourPlayerBtn.addEventListener('click', ()=>setPlayerCount(4));

window.addEventListener('play3d:modechange', event=>{
  mode = event.detail.mode;
  newGame();
});

newGame();
})();
