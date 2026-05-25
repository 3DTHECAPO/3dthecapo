(()=>{
'use strict';

/* PLAY 3D DOMINOES — SCORE-ON-PLAY COUNTING FIVES
   Scope: Dominoes script only.
   Rules kept: score every scoring play, first score must be 10+ to get in, game to 150.
   Spinner rule: first two plays after spinner must fill left/right before top/bottom open.
*/

const SCORE_TARGET = 150;
const GET_IN_MIN = 10;
const HAND_SIZE = 7;
const SCORING_COUNTS = new Set([5,10,15,20,25,30,35,40]);

const state = {
  players:2,
  hands:[],
  scores:[],
  gotIn:[],
  currentPlayerIndex:0,
  stock:[],
  passes:0,
  pending:null,
  handOver:false,
  gameOver:false,
  board:{
    spinnerTile:null,
    spinnerArms:{left:[],right:[],top:[],bottom:[]},
    openEnds:[]
  }
};

let mode = window.Play3DModeBar ? window.Play3DModeBar.getMode() : 'cpu';
let cpuTimer = null;

const chainEl = document.getElementById('chain');
const handEl = document.getElementById('hand');
const armChooser = document.getElementById('armChooser');
const newBtnEl = document.getElementById('newBtn');
const drawBtnEl = document.getElementById('drawBtn');
const passBtnEl = document.getElementById('passBtn');
const scoreTextEl = document.getElementById('scoreText');
const turnTextEl = document.getElementById('turnText');
const logEl = document.getElementById('log');

function seatName(i){ return ['Player 1','Player 2','Player 3','Player 4'][i] || 'Player'; }
function isDouble(tile){ return tile && tile[0] === tile[1]; }
function activeLocal(){ return mode === 'local' || mode === 'fan'; }
function thinkDelay(){ return 400 + Math.floor(Math.random()*700); }
function dominoTotal(tile){ return tile[0] + tile[1]; }
function handTotal(playerIndex){ return (state.hands[playerIndex] || []).reduce((sum,tile)=>sum+dominoTotal(tile),0); }
function hasBoardTiles(){ return !!state.board.spinnerTile || state.board.spinnerArms.right.length > 0; }
function log(msg){ if(logEl) logEl.innerHTML = '<li>'+String(msg)+'</li>' + logEl.innerHTML; }

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
  setTimeout(()=>el.classList.remove('show'),1500);
}

function resetBoard(){
  state.board = {spinnerTile:null, spinnerArms:{left:[],right:[],top:[],bottom:[]}, openEnds:[]};
  state.passes = 0;
  state.pending = null;
  state.handOver = false;
  if(armChooser){ armChooser.hidden = true; armChooser.innerHTML = ''; }
}

function buildStock(){
  state.stock = [];
  for(let a=0;a<=6;a++){
    for(let b=a;b<=6;b++) state.stock.push([a,b]);
  }
  state.stock.sort(()=>Math.random() - 0.5);
}

function removeTile(hand,tile){
  const idx = hand.indexOf(tile);
  if(idx >= 0) hand.splice(idx,1);
}

function findHighestDouble(){
  let best = null;
  state.hands.forEach((hand,player)=>{
    hand.forEach(tile=>{
      if(isDouble(tile) && (!best || tile[0] > best.tile[0])) best = {player,tile};
    });
  });
  return best;
}

function ensureOpeningDouble(){
  let starter = findHighestDouble();
  let guard = 0;
  while(!starter && state.stock.length && guard < 28){
    for(let i=0;i<state.players && state.stock.length;i++){
      const drawn = state.stock.pop();
      state.hands[i].push(drawn);
      if(isDouble(drawn) && (!starter || drawn[0] > starter.tile[0])) starter = {player:i,tile:drawn};
    }
    guard++;
  }
  return starter;
}

function armOrderForPlay(){
  if(!state.board.spinnerTile) return [];
  const arms = state.board.spinnerArms;
  const leftUsed = arms.left.length > 0;
  const rightUsed = arms.right.length > 0;

  if(!leftUsed && !rightUsed) return ['left','right'];
  if(!leftUsed) return ['left'];
  if(!rightUsed) return ['right'];
  return ['left','right','top','bottom'];
}

function refreshOpenEnds(){
  const ends = [];

  if(!hasBoardTiles()){
    state.board.openEnds = ends;
    return ends;
  }

  if(state.board.spinnerTile){
    const spinnerValue = state.board.spinnerTile[0];
    armOrderForPlay().forEach(side=>{
      const arm = state.board.spinnerArms[side];
      ends.push({arm:side,value:arm.length ? arm[arm.length-1][1] : spinnerValue});
    });
  }else{
    const line = state.board.spinnerArms.right;
    if(line.length){
      ends.push({arm:'left',value:line[0][0]});
      ends.push({arm:'right',value:line[line.length-1][1]});
    }
  }

  state.board.openEnds = ends;
  return ends;
}

function countDisplayArms(){
  if(!state.board.spinnerTile) return ['left','right'];
  const arms = state.board.spinnerArms;
  const leftUsed = arms.left.length > 0;
  const rightUsed = arms.right.length > 0;

  // Your count rules:
  // spinner alone: count spinner double
  // one side only: count spinner double + exposed side number
  // left+right filled: spinner body stops counting; count exposed side numbers
  // top/bottom count only after a domino exists there
  if(leftUsed !== rightUsed && !arms.top.length && !arms.bottom.length){
    return leftUsed ? ['left'] : ['right'];
  }

  const list = [];
  if(leftUsed || !state.board.spinnerTile) list.push('left');
  if(rightUsed || !state.board.spinnerTile) list.push('right');
  if(arms.top.length) list.push('top');
  if(arms.bottom.length) list.push('bottom');
  return list;
}

function openEndValue(arm){
  if(!state.board.spinnerTile){
    const line = state.board.spinnerArms.right;
    if(!line.length) return 0;
    return arm === 'left' ? line[0][0] : line[line.length-1][1];
  }

  const branch = state.board.spinnerArms[arm] || [];
  if(!branch.length) return state.board.spinnerTile[0];
  const tip = branch[branch.length-1];
  return isDouble(tip) ? tip[0] + tip[1] : tip[1];
}

function boardCount(){
  if(!hasBoardTiles()) return 0;

  if(state.board.spinnerTile){
    const arms = state.board.spinnerArms;
    const anyArm = arms.left.length || arms.right.length || arms.top.length || arms.bottom.length;
    if(!anyArm) return state.board.spinnerTile[0] + state.board.spinnerTile[1];

    const leftUsed = arms.left.length > 0;
    const rightUsed = arms.right.length > 0;
    if(leftUsed !== rightUsed && !arms.top.length && !arms.bottom.length){
      return state.board.spinnerTile[0] + state.board.spinnerTile[1] + openEndValue(leftUsed ? 'left' : 'right');
    }
  }

  return countDisplayArms().reduce((sum,arm)=>sum+openEndValue(arm),0);
}

function scoreFromCount(count){ return SCORING_COUNTS.has(count) ? count : 0; }

function legalArms(tile){
  if(!hasBoardTiles()) return ['open'];
  return refreshOpenEnds()
    .filter(end=>tile[0] === end.value || tile[1] === end.value)
    .map(end=>end.arm);
}
function legal(tile){ return legalArms(tile).length > 0; }
function canPlay(playerIndex){ return (state.hands[playerIndex] || []).some(legal); }

function orientRight(tile,match){ return tile[0] === match ? tile : [tile[1],tile[0]]; }
function orientLeft(tile,match){ return tile[1] === match ? tile : [tile[1],tile[0]]; }

function placeOpeningDouble(player,tile){
  removeTile(state.hands[player],tile);
  state.board.spinnerTile = tile;
  refreshOpenEnds();
}

function placeOnArm(tile,arm){
  if(arm === 'open'){
    if(isDouble(tile)) state.board.spinnerTile = tile;
    else state.board.spinnerArms.right.push(orientRight(tile,tile[0]));
    refreshOpenEnds();
    return true;
  }

  const end = refreshOpenEnds().find(item=>item.arm === arm);
  if(!end || (tile[0] !== end.value && tile[1] !== end.value)) return false;

  if(!state.board.spinnerTile){
    const line = state.board.spinnerArms.right;
    if(arm === 'left') line.unshift(orientLeft(tile,end.value));
    else line.push(orientRight(tile,end.value));
  }else{
    const oriented = (arm === 'left' || arm === 'top') ? orientLeft(tile,end.value) : orientRight(tile,end.value);
    state.board.spinnerArms[arm].push(oriented);
  }

  refreshOpenEnds();
  return true;
}

function commitPlay(playerIndex,tile,arm){
  if(!placeOnArm(tile,arm)) return false;
  removeTile(state.hands[playerIndex],tile);
  state.passes = 0;
  state.pending = null;
  if(armChooser){ armChooser.hidden = true; armChooser.innerHTML = ''; }
  return true;
}

function scoreBoardCount(player){
  const count = boardCount();
  const points = scoreFromCount(count);

  if(!points){
    popCount('COUNT '+count+' — NO SCORE', false);
    log('COUNT '+count+' — no score.');
    return count;
  }

  if(!state.gotIn[player] && points < GET_IN_MIN){
    popCount('COUNT '+points+' — NEED 10 TO GET IN', false);
    log(seatName(player)+' counted '+points+' but needs 10 to get in.');
    return count;
  }

  state.gotIn[player] = true;
  state.scores[player] += points;
  popCount('SCORE '+points, true);
  log(seatName(player)+' scored '+points+'.');
  if(player === 0 && window.Play3DPoints) window.Play3DPoints.award('dominoes',Math.max(5,points),'count_fives');

  if(state.scores[player] >= SCORE_TARGET) finishGame(player);
  return count;
}

function requestArm(tile){
  if(state.handOver || state.gameOver) return;
  const arms = legalArms(tile);
  if(!arms.length){ log('Illegal domino.'); return; }
  if(arms.length === 1){ playTile(tile,arms[0]); return; }
  state.pending = {tile};
  armChooser.hidden = false;
  armChooser.innerHTML = '<span>Choose arm</span>' + arms.map(arm=>'<button type="button" data-arm="'+arm+'">'+arm+'</button>').join('');
}

function playTile(tile,arm){
  const player = state.currentPlayerIndex;
  if(player !== 0 && !activeLocal()) return;
  if(!commitPlay(player,tile,arm)){ log('Illegal domino.'); return; }
  const count = scoreBoardCount(player);
  log(seatName(player)+' played on '+arm+'. Board count '+count+'.');
  if(state.gameOver) return;
  if(!state.hands[player].length){ finishHand(player); return; }
  advance();
}

function chooseCpuMove(hand){
  const player = state.currentPlayerIndex;
  const moves = [];
  hand.forEach(tile=>{
    legalArms(tile).forEach(arm=>{
      const snapshot = cloneBoard();
      if(!placeOnArm(tile,arm)){ restoreBoard(snapshot); return; }
      const count = boardCount();
      const points = scoreFromCount(count);
      restoreBoard(snapshot);
      const usablePoints = (!state.gotIn[player] && points < GET_IN_MIN) ? 0 : points;
      moves.push({tile,arm,count,points:usablePoints,leave:handTotal(player)-dominoTotal(tile)});
    });
  });
  if(!moves.length) return null;
  moves.sort((a,b)=>{
    if(b.points !== a.points) return b.points - a.points;
    if(a.leave !== b.leave) return a.leave - b.leave;
    if(isDouble(b.tile) !== isDouble(a.tile)) return Number(isDouble(b.tile))-Number(isDouble(a.tile));
    return dominoTotal(b.tile)-dominoTotal(a.tile);
  });
  return moves[0];
}

function cloneBoard(){
  return {
    spinnerTile: state.board.spinnerTile ? state.board.spinnerTile.slice() : null,
    spinnerArms: {
      left: state.board.spinnerArms.left.map(t=>t.slice()),
      right: state.board.spinnerArms.right.map(t=>t.slice()),
      top: state.board.spinnerArms.top.map(t=>t.slice()),
      bottom: state.board.spinnerArms.bottom.map(t=>t.slice())
    },
    openEnds: state.board.openEnds.map(end=>Object.assign({},end))
  };
}
function restoreBoard(snapshot){ state.board = snapshot; refreshOpenEnds(); }

function advance(){
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players;
  render();
  if(state.currentPlayerIndex !== 0 && !activeLocal()) scheduleCpu();
}

function finishGame(winner){
  state.gameOver = true;
  state.handOver = true;
  if(turnTextEl) turnTextEl.textContent = seatName(winner)+' WINS GAME';
  popCount(seatName(winner)+' WINS '+SCORE_TARGET, true);
  log(seatName(winner)+' wins the game at '+state.scores[winner]+'.');
  render();
}

function finishHand(winner){
  state.handOver = true;
  if(winner === 0 && window.Play3DPoints) window.Play3DPoints.award('dominoes',125,'round_win');
  if(turnTextEl) turnTextEl.textContent = seatName(winner)+' DOMINOES — WASH THE DISHES';
  log('DOMINO! '+seatName(winner)+' played the last domino.');
  render();
}

function finishBlocked(){
  state.handOver = true;
  if(turnTextEl) turnTextEl.textContent = 'BLOCKED ROUND — WASH THE DISHES';
  log('Blocked round. Wash the dishes.');
  render();
}

function scheduleCpu(){
  if(cpuTimer) clearTimeout(cpuTimer);
  if(turnTextEl) turnTextEl.textContent = 'OPPONENT THINKING...';
  cpuTimer = setTimeout(()=>{ cpuTimer=null; cpuTurn(); },thinkDelay());
}

function cpuTurn(){
  const player = state.currentPlayerIndex;
  if(player === 0 || activeLocal() || state.handOver || state.gameOver) return;
  const hand = state.hands[player];
  let move = chooseCpuMove(hand);
  while(!move && state.stock.length){
    hand.push(state.stock.pop());
    log(seatName(player)+' drew.');
    move = chooseCpuMove(hand);
  }
  if(move){
    commitPlay(player,move.tile,move.arm);
    const count = scoreBoardCount(player);
    log(seatName(player)+' played on '+move.arm+'. Board count '+count+'.');
    if(state.gameOver) return;
    if(!hand.length){ finishHand(player); return; }
  }else{
    state.passes++;
    log(seatName(player)+' passed.');
  }
  if(state.passes >= state.players){ finishBlocked(); return; }
  advance();
}

function drawTile(){
  const player = state.currentPlayerIndex;
  if(player !== 0 && !activeLocal()) return;
  if(state.handOver || state.gameOver) return;
  if(canPlay(player)){ log('Play a legal domino if you can.'); return; }
  let drew = 0;
  while(state.stock.length && !canPlay(player)){
    state.hands[player].push(state.stock.pop());
    drew++;
  }
  log(drew ? seatName(player)+' drew '+drew+'.' : 'Boneyard empty. Pass.');
  render();
}

function passTurn(){
  const player = state.currentPlayerIndex;
  if(player !== 0 && !activeLocal()) return;
  if(state.handOver || state.gameOver) return;
  if(canPlay(player)){ log('Play a legal domino if you can.'); return; }
  if(state.stock.length){ log('Draw until playable before passing.'); return; }
  state.passes++;
  log(seatName(player)+' passed.');
  if(state.passes >= state.players){ finishBlocked(); return; }
  advance();
}

function washDishes(){
  if(state.gameOver){ newGame(state.players); return; }
  newGame(state.players);
}

function newGame(players){
  mode = window.Play3DModeBar ? window.Play3DModeBar.getMode() : mode;
  state.players = Math.max(2,Math.min(4,Number(players)||state.players||2));
  if(cpuTimer){ clearTimeout(cpuTimer); cpuTimer = null; }
  buildStock();
  resetBoard();
  state.hands = Array.from({length:state.players},()=>state.stock.splice(0,HAND_SIZE));
  state.scores = Array.from({length:state.players},(_,i)=>state.scores[i] || 0);
  state.gotIn = Array.from({length:state.players},(_,i)=>Boolean(state.gotIn[i]));
  state.gameOver = false;

  const starter = ensureOpeningDouble();
  if(starter){
    placeOpeningDouble(starter.player,starter.tile);
    state.currentPlayerIndex = (starter.player + 1) % state.players;
    log(seatName(starter.player)+' opened with highest double '+starter.tile[0]+'-'+starter.tile[1]+'.');
    scoreBoardCount(starter.player);
    if(state.gameOver){ render(); return; }
  }else{
    state.currentPlayerIndex = 0;
    log('No double found. Start manually.');
  }

  render();
  if(state.currentPlayerIndex !== 0 && !activeLocal()) scheduleCpu();
}

function tileHTML(tile,index,cls=''){
  return '<button class="tile '+cls+'" data-i="'+index+'"><span>'+tile[0]+'</span><i></i><span>'+tile[1]+'</span></button>';
}
function backs(count){ return Array.from({length:count},()=>'<span class="tile-back"></span>').join(''); }

function renderBoard(){
  if(!chainEl) return;
  if(state.board.spinnerTile){
    const arm = side => state.board.spinnerArms[side].map((tile,i)=>tileHTML(tile,i,'branch '+side+'-arm '+(isDouble(tile)?'double':''))).join('');
    chainEl.className = 'chain spinner-board';
    chainEl.innerHTML =
      '<div class="branch-line top-branch">'+arm('top')+'</div>'+
      '<div class="line-row">'+
        '<div class="horizontal-arm left-branch">'+arm('left')+'</div>'+
        tileHTML(state.board.spinnerTile,0,'spinner')+
        '<div class="horizontal-arm right-branch">'+arm('right')+'</div>'+
      '</div>'+
      '<div class="branch-line bottom-branch">'+arm('bottom')+'</div>';
  }else{
    chainEl.className = 'chain';
    chainEl.innerHTML = state.board.spinnerArms.right.map((tile,i)=>tileHTML(tile,i,'')).join('');
  }
}

function render(){
  refreshOpenEnds();
  renderBoard();
  const visible = state.currentPlayerIndex === 0 || activeLocal() ? state.currentPlayerIndex : 0;
  const hand = state.hands[visible] || [];

  if(handEl){
    handEl.innerHTML = hand.map((tile,i)=>tileHTML(tile,i,legal(tile)?'':'disabled')).join('');
    document.querySelectorAll('#hand .tile').forEach(btn=>{
      btn.onclick = ()=>requestArm(hand[Number(btn.dataset.i)]);
    });
  }

  if(scoreTextEl){
    scoreTextEl.textContent = state.scores.slice(0,state.players).map((score,i)=>seatName(i)+': '+score+(state.gotIn[i]?'':' (need 10)')).join(' / ');
  }
  if(turnTextEl && turnTextEl.textContent !== 'OPPONENT THINKING...'){
    turnTextEl.textContent = state.handOver ? 'HAND OVER — WASH THE DISHES' : seatName(state.currentPlayerIndex)+' TURN | COUNT '+boardCount();
  }

  [['.bottom-seat',0],['.top-seat',1],['.left-seat',2],['.right-seat',3]].forEach(([sel,i])=>{
    const el = document.querySelector(sel);
    if(!el) return;
    el.innerHTML = i < state.players
      ? '<b>'+seatName(i)+'</b><small>'+((state.hands[i]||[]).length)+' dominoes</small><div class="seat-backs">'+backs(Math.min(7,(state.hands[i]||[]).length))+'</div>'
      : '';
  });

  document.querySelectorAll('.playerCountBtn').forEach(btn=>btn.classList.toggle('active',Number(btn.dataset.count)===state.players));
  let washBtn = document.getElementById('washBtn');
  if(!washBtn && passBtnEl && passBtnEl.parentElement){
    washBtn = document.createElement('button');
    washBtn.id = 'washBtn';
    washBtn.type = 'button';
    washBtn.textContent = 'WASH THE DISHES';
    washBtn.onclick = washDishes;
    passBtnEl.parentElement.appendChild(washBtn);
  }
  if(washBtn) washBtn.disabled = !state.handOver && !state.gameOver;
}

if(armChooser){
  armChooser.addEventListener('click',e=>{
    const btn = e.target.closest('[data-arm]');
    if(btn && state.pending) playTile(state.pending.tile,btn.dataset.arm);
  });
}
if(newBtnEl) newBtnEl.onclick = ()=>{
  state.scores = [];
  state.gotIn = [];
  newGame(state.players);
};
if(drawBtnEl) drawBtnEl.onclick = drawTile;
if(passBtnEl) passBtnEl.onclick = passTurn;

document.querySelectorAll('.playerCountBtn').forEach(btn=>btn.onclick=()=>{
  state.scores = [];
  state.gotIn = [];
  newGame(Number(btn.dataset.count));
});
window.addEventListener('play3d:modechange',event=>{
  mode = event.detail.mode;
  state.scores = [];
  state.gotIn = [];
  newGame(mode === 'cpu' ? 2 : 4);
});

newGame(2);
})();
