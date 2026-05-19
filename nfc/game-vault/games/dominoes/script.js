(()=>{
'use strict';

/*
  PLAY 3D DOMINOES — CLEAN WORKING SCRIPT
  - No stacked patch logic.
  - Traditional draw/block handling.
  - Multiples-of-5 board-end scoring.
  - First scoring count must be 10+ to get in.
  - Game continues to 150.
  - "Wash The Dishes" starts the next hand after DOMINO / block.
*/

const state = {
  players: 2,
  hands: [],
  scores: [],
  gotIn: [],
  stock: [],
  currentPlayerIndex: 0,
  passes: 0,
  handOver: false,
  nextStarterIndex: null,
  lastWinnerIndex: null,
  pending: null,
  lastCount: 0,
  lastAwarded: 0,
  handNumber: 0,
  board: {
    root: null,
    canBranch: false,
    arms: { left: [], right: [], top: [], bottom: [] }
  }
};

let mode = window.Play3DModeBar ? window.Play3DModeBar.getMode() : 'cpu';

const chainEl = document.getElementById('chain');
const handEl = document.getElementById('hand');
const armChooser = document.getElementById('armChooser');
const newBtnEl = document.getElementById('newBtn');
const drawBtnEl = document.getElementById('drawBtn');
const passBtnEl = document.getElementById('passBtn');
const scoreTextEl = document.getElementById('scoreText');
const turnTextEl = document.getElementById('turnText');
const logEl = document.getElementById('log');

const SCORE_TARGET = 150;
const GET_IN_MIN = 10;
const HAND_SIZE = 7;

function seatName(i){ return ['Player 1','Player 2','Player 3','Player 4'][i] || 'Player'; }
function isDouble(tile){ return tile && tile[0] === tile[1]; }
function activeLocal(){ return mode === 'local' || mode === 'fan'; }
function log(msg){ if(logEl) logEl.innerHTML = '<li>'+String(msg)+'</li>' + logEl.innerHTML; }
function randCode(){ return Math.random().toString(36).slice(2,6).toUpperCase(); }

function buildStock(){
  state.stock = [];
  for(let a=0;a<=6;a++){
    for(let b=a;b<=6;b++) state.stock.push([a,b]);
  }
  state.stock.sort(()=>Math.random()-.5);
}

function resetBoard(){
  state.board = { root:null, canBranch:false, arms:{left:[],right:[],top:[],bottom:[]} };
  state.passes = 0;
  state.pending = null;
  state.lastCount = 0;
  state.lastAwarded = 0;
  if(armChooser){ armChooser.hidden = true; armChooser.innerHTML = ''; }
}

function highestDouble(){
  let best = null;
  state.hands.forEach((hand, playerIndex)=>{
    hand.forEach(tile=>{
      if(isDouble(tile) && (!best || tile[0] > best.tile[0])) best = {playerIndex, tile};
    });
  });
  return best;
}

function removeTile(hand, tile){
  const idx = hand.indexOf(tile);
  if(idx >= 0) hand.splice(idx, 1);
}

function handPips(playerIndex){
  return (state.hands[playerIndex]||[]).reduce((sum,tile)=>sum+tile[0]+tile[1],0);
}

function allOpponentPips(winner){
  return state.hands.reduce((sum,hand,i)=>{
    if(i===winner) return sum;
    return sum + hand.reduce((s,t)=>s+t[0]+t[1],0);
  },0);
}

/*
  Orientation rule:
  Each arm array stores tiles with the OUTSIDE exposed end placed at:
  - left/top: tile[0]
  - right/bottom: tile[1]
*/
function outsideValue(tile, arm){
  if(!tile) return 0;
  if(isDouble(tile)) return tile[0] + tile[1];
  return (arm === 'left' || arm === 'top') ? tile[0] : tile[1];
}

function openMatchValue(tile, arm){
  if(!tile) return null;
  return (arm === 'left' || arm === 'top') ? tile[0] : tile[1];
}

function armBaseValue(arm){
  if(!state.board.root) return null;
  if(state.board.canBranch) return state.board.root[0];
  return arm === 'left' ? state.board.root[0] : state.board.root[1];
}

function armTipMatchValue(arm){
  const branch = state.board.arms[arm] || [];
  if(branch.length){
    return openMatchValue(branch[branch.length-1], arm);
  }
  return armBaseValue(arm);
}

function activeArms(){
  if(!state.board.root) return [];
  if(state.board.canBranch) return ['left','right','top','bottom'];
  return ['left','right'];
}

function exposedArmsForCount(){
  if(!state.board.root) return [];

  const arms = activeArms();
  const used = arms.filter(arm => (state.board.arms[arm]||[]).length > 0);

  // If nobody has played off the opener yet, count the opener as the only exposed piece.
  if(!used.length) return ['root'];

  return used;
}

function countRootOnly(){
  if(!state.board.root) return 0;
  return state.board.root[0] + state.board.root[1];
}

function boardCount(){
  if(!state.board.root) return 0;

  const exposed = exposedArmsForCount();
  if(exposed.length === 1 && exposed[0] === 'root') return countRootOnly();

  let total = 0;
  exposed.forEach(arm=>{
    const branch = state.board.arms[arm] || [];
    const tip = branch[branch.length-1];

    // Only active branch tips count. Empty spinner arms do NOT count.
    if(tip) total += outsideValue(tip, arm);
  });
  return total;
}

function scoreFromCount(count){
  return count > 0 && count % 5 === 0 ? count : 0;
}

function popCount(text, good=false){
  let el = document.getElementById('countPopup');
  if(!el){
    el = document.createElement('div');
    el.id = 'countPopup';
    el.className = 'count-popup';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.toggle('good', !!good);
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 1400);
}

function awardMoveScore(playerIndex){
  const count = boardCount();
  const points = scoreFromCount(count);
  state.lastCount = count;
  state.lastAwarded = 0;

  if(!points){
    popCount('COUNT '+count+' — NO SCORE', false);
    log('COUNT '+count+' — no score.');
    return 0;
  }

  if(!state.gotIn[playerIndex] && points < GET_IN_MIN){
    popCount('COUNT '+points+' — NEED 10 TO GET IN', false);
    log(seatName(playerIndex)+' counted '+points+' but needs 10 to get in.');
    return 0;
  }

  state.gotIn[playerIndex] = true;
  state.scores[playerIndex] += points;
  state.lastAwarded = points;
  popCount('SCORE '+points, true);
  log(seatName(playerIndex)+' scored '+points+'.');
  return points;
}

function orientForArm(tile, match, arm){
  const other = tile[0] === match ? tile[1] : tile[0];

  // outside goes tile[0] on left/top, tile[1] on right/bottom
  if(arm === 'left' || arm === 'top') return [other, match];
  return [match, other];
}

function legalArms(tile){
  if(!state.board.root) return ['open'];
  return activeArms().filter(arm=>{
    const value = armTipMatchValue(arm);
    return tile[0] === value || tile[1] === value;
  });
}

function legal(tile){ return legalArms(tile).length > 0; }
function canPlay(playerIndex){ return (state.hands[playerIndex]||[]).some(legal); }

function placeTile(tile, arm){
  if(arm === 'open' && !state.board.root){
    state.board.root = tile;
    state.board.canBranch = isDouble(tile);
    return true;
  }

  if(!state.board.root || arm === 'open') return false;
  const match = armTipMatchValue(arm);
  if(tile[0] !== match && tile[1] !== match) return false;

  state.board.arms[arm].push(orientForArm(tile, match, arm));
  return true;
}

function commitPlay(playerIndex, tile, arm){
  if(!placeTile(tile, arm)) return false;
  removeTile(state.hands[playerIndex], tile);
  state.passes = 0;
  state.pending = null;
  if(armChooser){ armChooser.hidden = true; armChooser.innerHTML = ''; }
  return true;
}

function requestArm(tile){
  if(state.handOver) return;
  const arms = legalArms(tile);
  if(!arms.length){ log('Illegal tile.'); return; }

  if(arms.length === 1){
    playTile(tile, arms[0]);
    return;
  }

  state.pending = {tile};
  armChooser.hidden = false;
  armChooser.innerHTML = '<span>Choose side</span>' + arms.map(arm=>'<button type="button" data-arm="'+arm+'">'+arm+'</button>').join('');
}

function playTile(tile, arm){
  const player = state.currentPlayerIndex;
  if(player !== 0 && !activeLocal()) return;

  if(!commitPlay(player, tile, arm)){ log('Illegal tile.'); return; }

  log(seatName(player)+' played on '+arm+'.');
  awardMoveScore(player);

  if(!state.hands[player].length){
    domino(player);
    return;
  }

  nextTurn();
}

function startForcedHighestDouble(){
  const starter = highestDouble();
  if(!starter) return false;

  state.board.root = starter.tile;
  state.board.canBranch = true;
  removeTile(state.hands[starter.playerIndex], starter.tile);
  state.currentPlayerIndex = (starter.playerIndex + 1) % state.players;
  state.nextStarterIndex = starter.playerIndex;
  state.lastCount = countRootOnly();

  log(seatName(starter.playerIndex)+' opened with spinner '+starter.tile[0]+'-'+starter.tile[1]+'. No entry points awarded on forced opener.');
  return true;
}

function newHand(starterIndex=null){
  do{
    buildStock();
    resetBoard();
    state.hands = Array.from({length:state.players},()=>state.stock.splice(0,HAND_SIZE));
  }while(!highestDouble());

  state.handOver = false;
  state.lastWinnerIndex = null;

  if(starterIndex === null || starterIndex === undefined){
    startForcedHighestDouble();
  }else{
    state.currentPlayerIndex = starterIndex;
    log(seatName(starterIndex)+' washed the bones and '+seatName(starterIndex)+' comes out. Any bone can be played.');
  }

  state.handNumber++;
  render();
  if(state.currentPlayerIndex !== 0 && !activeLocal()) scheduleCpu();
}

function newGame(players=state.players, resetMatch=true){
  mode = window.Play3DModeBar ? window.Play3DModeBar.getMode() : mode;
  state.players = Math.max(2, Math.min(4, Number(players)||2));

  if(resetMatch){
    state.scores = Array.from({length:state.players},()=>0);
    state.gotIn = Array.from({length:state.players},()=>false);
    state.handNumber = 0;
    state.nextStarterIndex = null;
  }else{
    state.scores = Array.from({length:state.players},(_,i)=>state.scores[i]||0);
    state.gotIn = Array.from({length:state.players},(_,i)=>Boolean(state.gotIn[i]));
  }

  log(state.players+' player dominoes started. First score must be 10+ to get in. Game goes to '+SCORE_TARGET+'.');
  newHand(null);
}

function washDishes(){
  if(!state.handOver){
    log('Hand is still active.');
    return;
  }
  const starter = state.lastWinnerIndex ?? state.nextStarterIndex ?? 0;
  newHand(starter);
}

function domino(winner){
  state.lastWinnerIndex = winner;
  state.nextStarterIndex = winner;
  state.handOver = true;

  popCount('DOMINO!', true);
  log('DOMINO! '+seatName(winner)+' played the last bone.');

  if(winner === 0 && window.Play3DPoints) window.Play3DPoints.award('dominoes',125,'round_win');

  const targetReached = state.scores.some(score=>score>=SCORE_TARGET);
  if(targetReached){
    const champ = state.scores.indexOf(Math.max(...state.scores));
    turnTextEl.textContent = seatName(champ)+' WINS TO '+SCORE_TARGET;
    log(seatName(champ)+' wins the game.');
  }else{
    turnTextEl.textContent = 'DOMINO! '+seatName(winner)+' — WASH THE DISHES';
    log('Press WASH THE DISHES for the next hand.');
  }

  render();
}

function blockedWinner(){
  const totals = state.hands.map((_,i)=>handPips(i));
  const low = Math.min(...totals);
  const leaders = totals.map((pips,playerIndex)=>({pips,playerIndex})).filter(x=>x.pips===low);
  return leaders.length === 1 ? leaders[0].playerIndex : null;
}

function blockedHand(){
  const winner = blockedWinner();
  state.handOver = true;
  state.lastWinnerIndex = winner;
  state.nextStarterIndex = winner ?? 0;

  if(winner === null){
    turnTextEl.textContent = 'BLOCKED HAND — TIE';
    log('Blocked hand. Tie. Wash the dishes.');
  }else{
    const points = allOpponentPips(winner);
    state.scores[winner] += points;
    state.gotIn[winner] = true;
    turnTextEl.textContent = 'BLOCKED HAND — '+seatName(winner)+' WINS';
    log(seatName(winner)+' wins blocked hand and scores '+points+' remaining dots.');
  }
  render();
}

function nextTurn(){
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players;
  render();
  if(state.currentPlayerIndex !== 0 && !activeLocal()) scheduleCpu();
}

function drawOne(){
  const player = state.currentPlayerIndex;
  if(player !== 0 && !activeLocal()) return;
  if(state.handOver) return;

  if(canPlay(player)){
    log('You have a playable domino.');
    return;
  }

  if(state.stock.length){
    const tile = state.stock.pop();
    state.hands[player].push(tile);
    log(seatName(player)+' drew one bone.');

    if(legal(tile)) log('Drawn bone is playable.');
    render();
    return;
  }

  log('Boneyard empty. Pass if you cannot play.');
  render();
}

function passTurn(){
  const player = state.currentPlayerIndex;
  if(player !== 0 && !activeLocal()) return;
  if(state.handOver) return;

  if(canPlay(player)){ log('Play a legal tile if you can.'); return; }
  if(state.stock.length){ log('Draw from the boneyard before passing.'); return; }

  state.passes++;
  log(seatName(player)+' passed.');

  if(state.passes >= state.players){
    blockedHand();
    return;
  }

  nextTurn();
}

function chooseCpuMove(hand){
  for(const tile of hand){
    const arms = legalArms(tile);
    if(arms.length) return {tile, arm:arms.find(x=>x==='top'||x==='bottom') || arms[0]};
  }
  return null;
}

function scheduleCpu(){
  if(turnTextEl) turnTextEl.textContent = 'OPPONENT THINKING...';
  setTimeout(cpuTurn, 500 + Math.floor(Math.random()*700));
}

function cpuTurn(){
  const player = state.currentPlayerIndex;
  if(player === 0 || activeLocal() || state.handOver) return;

  const hand = state.hands[player];
  let move = chooseCpuMove(hand);

  while(!move && state.stock.length){
    hand.push(state.stock.pop());
    log(seatName(player)+' drew.');
    move = chooseCpuMove(hand);
  }

  if(move){
    commitPlay(player, move.tile, move.arm);
    log(seatName(player)+' played on '+move.arm+'.');
    awardMoveScore(player);

    if(!hand.length){
      domino(player);
      return;
    }
  }else{
    state.passes++;
    log(seatName(player)+' passed.');
  }

  if(state.passes >= state.players){
    blockedHand();
    return;
  }

  nextTurn();
}

function tileHTML(tile,index,cls=''){
  return '<button class="tile '+cls+'" data-i="'+index+'"><span>'+tile[0]+'</span><i></i><span>'+tile[1]+'</span></button>';
}

function backs(count){
  return Array.from({length:count},()=>'<span class="tile-back"></span>').join('');
}

function renderBoard(){
  if(!chainEl) return;
  const armHTML = side => (state.board.arms[side]||[]).map((tile,i)=>tileHTML(tile,i,'branch '+side+'-arm '+(isDouble(tile)?'double':''))).join('');

  chainEl.className = 'chain spinner-board';

  if(!state.board.root){
    chainEl.innerHTML = '<div class="empty-board">START A HAND</div>';
    return;
  }

  chainEl.innerHTML =
    '<div class="branch-line top-branch">'+armHTML('top')+'</div>'+
    '<div class="line-row">'+
      '<div class="horizontal-arm left-branch">'+armHTML('left')+'</div>'+
      tileHTML(state.board.root,0,state.board.canBranch?'spinner':'starter')+
      '<div class="horizontal-arm right-branch">'+armHTML('right')+'</div>'+
    '</div>'+
    '<div class="branch-line bottom-branch">'+armHTML('bottom')+'</div>';
}

function renderStatus(){
  const score = state.scores.slice(0,state.players).map((s,i)=>seatName(i)+': '+s+(state.gotIn[i]?'':' (need 10)')).join(' / ');
  if(scoreTextEl) scoreTextEl.textContent = score;

  if(!state.handOver && turnTextEl && turnTextEl.textContent !== 'OPPONENT THINKING...'){
    turnTextEl.textContent = seatName(state.currentPlayerIndex)+' TURN | COUNT '+boardCount()+' | '+(state.gotIn[state.currentPlayerIndex]?'IN':'NEEDS 10');
  }
}

function renderSeats(){
  [['.bottom-seat',0],['.top-seat',1],['.left-seat',2],['.right-seat',3]].forEach(([sel,i])=>{
    const el = document.querySelector(sel);
    if(!el) return;
    if(i >= state.players){ el.innerHTML = ''; return; }
    el.innerHTML = '<b>'+seatName(i)+'</b><small>'+((state.hands[i]||[]).length)+' tiles</small><small>'+state.scores[i]+' pts '+(state.gotIn[i]?'IN':'NEEDS 10')+'</small><div class="seat-backs">'+backs(Math.min(7,(state.hands[i]||[]).length))+'</div>';
  });
}

function ensureWashButton(){
  let btn = document.getElementById('washBtn');
  if(!btn && passBtnEl && passBtnEl.parentElement){
    btn = document.createElement('button');
    btn.id = 'washBtn';
    btn.type = 'button';
    btn.textContent = 'WASH THE DISHES';
    btn.onclick = washDishes;
    passBtnEl.parentElement.appendChild(btn);
  }
  if(btn) btn.disabled = !state.handOver;
}

function render(){
  renderBoard();

  const visible = state.currentPlayerIndex === 0 || activeLocal() ? state.currentPlayerIndex : 0;
  const hand = state.hands[visible] || [];
  if(handEl){
    handEl.innerHTML = hand.map((tile,i)=>tileHTML(tile,i,legal(tile)?'':'disabled')).join('');
    document.querySelectorAll('#hand .tile').forEach(btn=>{
      btn.onclick = ()=>requestArm(hand[Number(btn.dataset.i)]);
    });
  }

  document.querySelectorAll('.playerCountBtn').forEach(btn=>{
    btn.classList.toggle('active', Number(btn.dataset.count) === state.players);
  });

  renderSeats();
  renderStatus();
  ensureWashButton();
}

if(armChooser){
  armChooser.addEventListener('click', e=>{
    const btn = e.target.closest('[data-arm]');
    if(btn && state.pending) playTile(state.pending.tile, btn.dataset.arm);
  });
}

if(newBtnEl) newBtnEl.onclick = ()=>newGame(state.players,true);
if(drawBtnEl) drawBtnEl.onclick = drawOne;
if(passBtnEl) passBtnEl.onclick = passTurn;
document.querySelectorAll('.playerCountBtn').forEach(btn=>{
  btn.onclick = ()=>newGame(Number(btn.dataset.count),true);
});

window.addEventListener('play3d:modechange', event=>{
  mode = event.detail.mode;
  newGame(mode === 'cpu' ? 2 : 4, true);
});

newGame(2,true);
})();