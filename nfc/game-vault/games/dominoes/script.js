(()=>{
'use strict';

/*
  PLAY 3D DOMINOES — CLEAN TRADITIONAL SCRIPT
  Rules built in:
  - 2 to 4 players
  - Each player draws 7 tiles
  - Highest double opens first
  - Match exposed board ends only
  - Doubles display crosswise
  - If no move, draw from boneyard until playable; if boneyard empty, pass
  - During play, board-end count scores only on multiples of 5
  - First scoring count must be 10+ to get in
  - When a player empties hand: DOMINO!
  - If blocked: lowest hand pip total wins, winner receives opponent remaining pips

  IMPORTANT:
  Replace the existing dominoes/script.js with this full file.
  Do not stack old V1/V2/V3 patch scripts on top of it.
*/

const state = {
  players: 2,
  hands: [],
  scores: [],
  gotIn: [],
  stock: [],
  currentPlayerIndex: 0,
  passes: 0,
  pending: null,
  handOver: false,
  lastHandLabel: '',
  lastCount: 0,
  lastAward: 0,
  handNumber: 0,
  board: {
    spinnerTile: null,
    canBranch: false,
    spinnerArms: { left: [], right: [], top: [], bottom: [] },
    openEnds: []
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
const STARTING_HAND_SIZE = 7;

function activeLocal(){ return mode === 'local' || mode === 'fan'; }
function thinkDelay(){ return 450 + Math.floor(Math.random() * 800); }
function seatName(i){ return ['Player 1','Player 2','Player 3','Player 4'][i] || 'Player'; }
function isDouble(tile){ return tile && tile[0] === tile[1]; }
function tileKey(tile){ return tile ? `${tile[0]}-${tile[1]}` : ''; }

function log(message){
  if(!logEl) return;
  logEl.innerHTML = `<li>${message}</li>` + logEl.innerHTML;
}

function showCountPopup(text, good=false){
  let popup = document.getElementById('dominoCountPopup');
  if(!popup){
    popup = document.createElement('div');
    popup.id = 'dominoCountPopup';
    popup.className = 'domino-count-popup';
    document.body.appendChild(popup);
  }
  popup.textContent = text;
  popup.classList.toggle('good', Boolean(good));
  popup.classList.remove('show');
  void popup.offsetWidth;
  popup.classList.add('show');
  clearTimeout(showCountPopup._timer);
  showCountPopup._timer = setTimeout(()=>popup.classList.remove('show'), 1600);
}

function resetBoard(){
  state.board = {
    spinnerTile: null,
    canBranch: false,
    spinnerArms: { left: [], right: [], top: [], bottom: [] },
    openEnds: []
  };
  state.lastCount = 0;
  state.lastAward = 0;
}

function buildStock(){
  state.stock = [];
  for(let a=0; a<=6; a++){
    for(let b=a; b<=6; b++){
      state.stock.push([a,b]);
    }
  }
  state.stock.sort(()=>Math.random() - 0.5);
}

function highestDouble(){
  let best = null;
  state.hands.forEach((hand, playerIndex)=>{
    hand.forEach(tile=>{
      if(isDouble(tile) && (!best || tile[0] > best.tile[0])){
        best = { playerIndex, tile };
      }
    });
  });
  return best;
}

function removeTile(hand, tile){
  const idx = hand.indexOf(tile);
  if(idx >= 0) hand.splice(idx, 1);
}

function newGame(players, resetMatch=true){
  mode = window.Play3DModeBar ? window.Play3DModeBar.getMode() : mode;
  state.players = Math.max(2, Math.min(4, Number(players) || state.players || 2));

  if(resetMatch || !state.scores.length || state.scores.length !== state.players){
    state.scores = Array.from({length: state.players}, ()=>0);
    state.gotIn = Array.from({length: state.players}, ()=>false);
    state.handNumber = 0;
  }

  do{
    buildStock();
    resetBoard();
    state.hands = Array.from({length: state.players}, ()=>state.stock.splice(0, STARTING_HAND_SIZE));
  }while(!highestDouble());

  state.passes = 0;
  state.pending = null;
  state.handOver = false;
  state.lastHandLabel = '';
  if(armChooser){ armChooser.hidden = true; armChooser.innerHTML = ''; }

  const starter = highestDouble();
  state.board.spinnerTile = starter.tile;
  state.board.canBranch = true;
  removeTile(state.hands[starter.playerIndex], starter.tile);
  refreshOpenEnds();
  state.currentPlayerIndex = (starter.playerIndex + 1) % state.players;
  state.handNumber += 1;

  log(`${state.players} player dominoes started. Highest double opens. Count exposed ends only. First score must be ${GET_IN_MIN}+ to get in.`);
  log(`${seatName(starter.playerIndex)} opened with spinner ${tileKey(starter.tile)}. No opener score awarded.`);
  render();
  if(state.currentPlayerIndex !== 0 && !activeLocal()) scheduleCpu();
}

function armSides(){
  return state.board.canBranch ? ['left','right','top','bottom'] : ['left','right'];
}

function branchTip(arm){
  const branch = state.board.spinnerArms[arm] || [];
  return branch.length ? branch[branch.length - 1] : null;
}

function exposedValueForTip(tile, arm){
  if(!tile) return 0;
  if(isDouble(tile)) return tile[0] + tile[1];
  return (arm === 'left' || arm === 'top') ? tile[0] : tile[1];
}

function openValueForMatching(tile, arm){
  if(!tile) return null;
  return (arm === 'left' || arm === 'top') ? tile[0] : tile[1];
}

function spinnerBaseValue(arm){
  if(!state.board.spinnerTile) return 0;
  if(state.board.canBranch && isDouble(state.board.spinnerTile)) return state.board.spinnerTile[0];
  return arm === 'left' ? state.board.spinnerTile[0] : state.board.spinnerTile[1];
}

function refreshOpenEnds(){
  const ends = [];
  if(!state.board.spinnerTile){
    state.board.openEnds = ends;
    return ends;
  }

  armSides().forEach(arm=>{
    const tip = branchTip(arm);
    ends.push({
      arm,
      value: tip ? openValueForMatching(tip, arm) : spinnerBaseValue(arm),
      scoringTile: tip || state.board.spinnerTile,
      emptyArm: !tip
    });
  });

  state.board.openEnds = ends;
  return ends;
}

function boardEndTotal(){
  if(!state.board.spinnerTile) return 0;

  const sides = armSides();

  // SPINNER RULE USED HERE:
  // If the spinner is a double, count the spinner itself ONCE as both sides,
  // then add only the outside exposed tip of each active branch.
  // Example: 6/6 connected to 6/3 = 12 + 3 = 15.
  // Example: 4/4 + 2/2 + 0/3 = 8 + 4 + 3 = 15.
  if(state.board.canBranch && isDouble(state.board.spinnerTile)){
    let total = state.board.spinnerTile[0] + state.board.spinnerTile[1];
    sides.forEach(arm => {
      const tip = branchTip(arm);
      if(tip) total += exposedValueForTip(tip, arm);
    });
    return total;
  }

  // Standard non-spinner chain: count the two true exposed outside ends.
  // If one side has no branch yet, that side of the starter is still exposed.
  return sides.reduce((sum, arm) => {
    const tip = branchTip(arm);
    if(tip) return sum + exposedValueForTip(tip, arm);
    return sum + spinnerBaseValue(arm);
  }, 0);
}

function legalArms(tile){
  if(!state.board.spinnerTile) return ['open'];
  return refreshOpenEnds()
    .filter(end=>tile[0] === end.value || tile[1] === end.value)
    .map(end=>end.arm);
}

function legal(tile){ return legalArms(tile).length > 0; }
function canPlay(playerIndex){ return (state.hands[playerIndex] || []).some(legal); }

function splitByMatch(tile, match){
  return tile[0] === match
    ? { match: tile[0], outside: tile[1] }
    : { match: tile[1], outside: tile[0] };
}

function orientForArm(tile, match, arm){
  const parts = splitByMatch(tile, match);
  return (arm === 'left' || arm === 'top')
    ? [parts.outside, parts.match]
    : [parts.match, parts.outside];
}

function placeOnArm(tile, arm){
  if(arm === 'open' && !state.board.spinnerTile){
    state.board.spinnerTile = tile;
    state.board.canBranch = isDouble(tile);
    refreshOpenEnds();
    return true;
  }
  if(arm === 'open' || !state.board.spinnerTile) return false;

  const end = refreshOpenEnds().find(item=>item.arm === arm);
  if(!end || (tile[0] !== end.value && tile[1] !== end.value)) return false;

  state.board.spinnerArms[arm].push(orientForArm(tile, end.value, arm));
  refreshOpenEnds();
  return true;
}

function awardCount(playerIndex){
  const count = boardEndTotal();
  state.lastCount = count;
  state.lastAward = 0;

  if(count > 0 && count % 5 === 0){
    if(!state.gotIn[playerIndex] && count < GET_IN_MIN){
      showCountPopup(`COUNT ${count} — NEED 10 TO GET IN`, false);
      log(`COUNT ${count} — ${seatName(playerIndex)} needs ${GET_IN_MIN}+ to get in.`);
      return 0;
    }
    state.gotIn[playerIndex] = true;
    state.scores[playerIndex] += count;
    state.lastAward = count;
    showCountPopup(`COUNT ${count}`, true);
    log(`COUNT ${count} — ${seatName(playerIndex)} scored ${count}.`);
    return count;
  }

  showCountPopup(`COUNT ${count} — NO SCORE`, false);
  log(`COUNT ${count} — no score.`);
  return 0;
}

function commitPlay(playerIndex, tile, arm){
  if(!placeOnArm(tile, arm)) return false;
  removeTile(state.hands[playerIndex], tile);
  state.passes = 0;
  state.pending = null;
  if(armChooser){ armChooser.hidden = true; armChooser.innerHTML = ''; }
  return true;
}

function requestArm(tile){
  if(state.handOver) return;
  const arms = legalArms(tile);
  if(!arms.length){ log('Illegal tile. Match an exposed end.'); return; }
  if(arms.length === 1){ playTile(tile, arms[0]); return; }

  state.pending = { tile };
  if(!armChooser) return;
  armChooser.hidden = false;
  armChooser.innerHTML = '<span>Choose side</span>' + arms.map(arm=>`<button type="button" data-arm="${arm}">${arm}</button>`).join('');
}

function playTile(tile, arm){
  const player = state.currentPlayerIndex;
  if(player !== 0 && !activeLocal()) return;
  if(!commitPlay(player, tile, arm)){ log('Illegal tile.'); return; }

  log(`${seatName(player)} played ${tileKey(tile)} on ${arm}.`);
  awardCount(player);

  if(!state.hands[player].length){ finish(player); return; }
  advance();
}

function chooseCpuMove(hand){
  for(const tile of hand){
    const arms = legalArms(tile);
    if(arms.length){
      return { tile, arm: arms.find(x=>x === 'top' || x === 'bottom') || arms[0] };
    }
  }
  return null;
}

function scheduleCpu(){
  if(turnTextEl) turnTextEl.textContent = 'OPPONENT THINKING...';
  setTimeout(cpuTurn, thinkDelay());
}

function cpuTurn(){
  const player = state.currentPlayerIndex;
  if(player === 0 || activeLocal() || state.handOver) return;

  const hand = state.hands[player];
  let move = chooseCpuMove(hand);

  while(!move && state.stock.length){
    hand.push(state.stock.pop());
    log(`${seatName(player)} drew from the boneyard.`);
    move = chooseCpuMove(hand);
  }

  if(move){
    commitPlay(player, move.tile, move.arm);
    log(`${seatName(player)} played ${tileKey(move.tile)} on ${move.arm}.`);
    awardCount(player);
  }else{
    state.passes += 1;
    log(`${seatName(player)} passed.`);
  }

  if(!hand.length){ finish(player); return; }
  if(state.passes >= state.players){ blockedHand(); return; }
  advance();
}

function advance(){
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players;
  render();
  if(state.currentPlayerIndex !== 0 && !activeLocal()) scheduleCpu();
}

function drawTile(){
  const player = state.currentPlayerIndex;
  if(player !== 0 && !activeLocal()) return;
  if(state.handOver) return;

  if(canPlay(player)){
    log('You have a playable domino. Play before drawing.');
    showCountPopup('PLAYABLE DOMINO AVAILABLE', false);
    return;
  }

  if(!state.stock.length){
    log('Boneyard empty. You may pass.');
    showCountPopup('BONEYARD EMPTY — PASS', false);
    return;
  }

  const drawn = state.stock.pop();
  state.hands[player].push(drawn);
  log(`${seatName(player)} drew ${tileKey(drawn)} from the boneyard.`);

  if(legal(drawn)){
    showCountPopup('DRAWN TILE PLAYS', true);
  }else{
    showCountPopup('DRAW AGAIN OR PASS IF EMPTY', false);
  }

  render();
}

function passTurn(){
  const player = state.currentPlayerIndex;
  if(player !== 0 && !activeLocal()) return;
  if(state.handOver) return;

  if(canPlay(player)){
    log('You have a legal move. You cannot pass.');
    return;
  }
  if(state.stock.length){
    log('Draw from the boneyard before passing.');
    return;
  }

  state.passes += 1;
  log(`${seatName(player)} passed.`);
  if(state.passes >= state.players){ blockedHand(); return; }
  advance();
}

function handPips(playerIndex){
  return (state.hands[playerIndex] || []).reduce((sum,tile)=>sum + tile[0] + tile[1], 0);
}

function blockedHand(){
  const totals = state.hands.map((_,i)=>handPips(i));
  const low = Math.min(...totals);
  const winners = totals.map((pips,i)=>({pips,i})).filter(x=>x.pips === low);
  if(winners.length !== 1){
    endHand('BLOCKED HAND — TIE', null);
    return;
  }

  const winner = winners[0].i;
  const points = totals.reduce((sum,pips,i)=>i === winner ? sum : sum + pips, 0);
  state.scores[winner] += points;
  state.gotIn[winner] = true;
  log(`Blocked hand. ${seatName(winner)} has lowest dots and scores ${points} opponent pips.`);
  endHand(`BLOCKED — ${seatName(winner)} WINS`, winner);
}

function finish(winner){
  showCountPopup('DOMINO!', true);
  log(`DOMINO! ${seatName(winner)} played the last bone.`);
  if(turnTextEl) turnTextEl.textContent = `DOMINO! ${seatName(winner)} WINS HAND`;
  endHand(`DOMINO! ${seatName(winner)} WINS HAND`, winner);
}

function endHand(label, winner){
  state.handOver = true;
  state.lastHandLabel = label;
  if(winner === 0 && window.Play3DPoints){
    window.Play3DPoints.award('dominoes', 125, 'round_win');
  }
  const topScore = Math.max(...state.scores);
  if(topScore >= SCORE_TARGET){
    const champ = state.scores.indexOf(topScore);
    state.lastHandLabel = `${seatName(champ)} WINS TO ${SCORE_TARGET}`;
  }
  render();
}

function tileHTML(tile, index, cls=''){
  return `<button class="tile ${cls}" data-i="${index}" aria-label="${tileKey(tile)}"><span>${tile[0]}</span><i></i><span>${tile[1]}</span></button>`;
}

function backs(count){
  return Array.from({length: count}, ()=>'<span class="tile-back"></span>').join('');
}

function renderBoard(){
  if(!chainEl) return;
  const armHTML = side => state.board.spinnerArms[side]
    .map((tile,i)=>tileHTML(tile, i, `branch ${side}-arm ${isDouble(tile)?'double':''}`))
    .join('');

  chainEl.className = 'chain spinner-board';
  if(!state.board.spinnerTile){
    chainEl.innerHTML = '<div class="empty-board">Start a hand.</div>';
    return;
  }

  chainEl.innerHTML = `
    <div class="branch-line top-branch">${armHTML('top')}</div>
    <div class="line-row">
      <div class="horizontal-arm left-branch">${armHTML('left')}</div>
      ${tileHTML(state.board.spinnerTile, 0, state.board.canBranch ? 'spinner' : 'starter')}
      <div class="horizontal-arm right-branch">${armHTML('right')}</div>
    </div>
    <div class="branch-line bottom-branch">${armHTML('bottom')}</div>
  `;
}

function statusLine(base){
  const p = state.currentPlayerIndex;
  const inText = state.gotIn[p] ? 'IN' : `NEEDS ${GET_IN_MIN}`;
  return `${base} | Count: ${state.lastCount} | Awarded: ${state.lastAward} | ${seatName(p)} ${inText}`;
}

function render(){
  refreshOpenEnds();
  state.lastCount = boardEndTotal();
  renderBoard();

  const visible = (state.currentPlayerIndex === 0 || activeLocal()) ? state.currentPlayerIndex : 0;
  const hand = state.hands[visible] || [];
  if(handEl){
    handEl.innerHTML = hand.map((tile,i)=>tileHTML(tile, i, legal(tile) ? '' : 'disabled')).join('');
    document.querySelectorAll('#hand .tile').forEach(btn=>{
      btn.onclick = ()=>requestArm(hand[Number(btn.dataset.i)]);
    });
  }

  if(scoreTextEl){
    scoreTextEl.textContent = state.scores
      .slice(0,state.players)
      .map((score,i)=>`${seatName(i)}: ${score}${state.gotIn[i] ? '' : ' (need 10)'}`)
      .join(' / ');
  }

  if(turnTextEl){
    if(state.handOver) turnTextEl.textContent = statusLine(state.lastHandLabel);
    else if(turnTextEl.textContent !== 'OPPONENT THINKING...') turnTextEl.textContent = statusLine(`${seatName(state.currentPlayerIndex)} TURN`);
  }

  [['.bottom-seat',0],['.top-seat',1],['.left-seat',2],['.right-seat',3]].forEach(([selector,i])=>{
    const el = document.querySelector(selector);
    if(!el) return;
    if(i >= state.players){ el.innerHTML = ''; return; }
    const count = (state.hands[i] || []).length;
    el.innerHTML = `<b>${seatName(i)}</b><small>${count} tiles</small><small>${state.scores[i]} pts ${state.gotIn[i]?'IN':'NEEDS 10'}</small><div class="seat-backs">${backs(Math.min(7,count))}</div>`;
  });

  document.querySelectorAll('.playerCountBtn').forEach(btn=>{
    btn.classList.toggle('active', Number(btn.dataset.count) === state.players);
  });
}

if(armChooser){
  armChooser.addEventListener('click', e=>{
    const btn = e.target.closest('[data-arm]');
    if(btn && state.pending) playTile(state.pending.tile, btn.dataset.arm);
  });
}
if(newBtnEl) newBtnEl.onclick = ()=>newGame(state.players, false);
if(drawBtnEl) drawBtnEl.onclick = drawTile;
if(passBtnEl) passBtnEl.onclick = passTurn;

document.querySelectorAll('.playerCountBtn').forEach(btn=>{
  btn.onclick = ()=>newGame(Number(btn.dataset.count), true);
});

window.addEventListener('play3d:modechange', event=>{
  mode = event.detail.mode;
  newGame(mode === 'cpu' ? 2 : 4, true);
});

newGame(2, true);
})();
