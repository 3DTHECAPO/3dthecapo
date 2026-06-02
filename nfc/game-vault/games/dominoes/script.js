(()=>{
'use strict';

/*
  PLAY 3D DOMINOES - RESPONSIVE COUNTING FIVES ENGINE

  The board model is logical. Render coordinates are rebuilt from the current
  table viewport so phone and desktop layouts use the same rules.
*/

const SCORE_TARGET = 150;
const GET_IN_MIN = 10;
const HAND_SIZE = 7;
const EDGE_MARGIN = 18;
const COLLISION_PAD = 3;
const TILE_SIZE = {
  horizontal:{w:82,h:42},
  vertical:{w:50,h:88}
};
const DIRECTIONS = {
  left:{x:-1,y:0},
  right:{x:1,y:0},
  top:{x:0,y:-1},
  bottom:{x:0,y:1}
};
const CLOCKWISE = {right:'bottom',bottom:'left',left:'top',top:'right'};
const COUNTER_CLOCKWISE = {right:'top',top:'left',left:'bottom',bottom:'right'};
const OPPOSITE = {left:'right',right:'left',top:'bottom',bottom:'top'};
const ARM_ORDER = ['left','right','top','bottom'];

const state = {
  players:2,
  hands:[],
  scores:[],
  gotIn:[],
  stock:[],
  currentPlayerIndex:0,
  passes:0,
  pending:null,
  handOver:false,
  gameOver:false,
  nextLeader:null,
  board:createBoard(),
  layout:{placements:[], scale:1, limits:{x:250,y:180}},
  mode:'cpu'
};

const chainEl = document.getElementById('chain');
const handEl = document.getElementById('hand');
const armChooserEl = document.getElementById('armChooser');
const newBtnEl = document.getElementById('newBtn');
const drawBtnEl = document.getElementById('drawBtn');
const passBtnEl = document.getElementById('passBtn');
const scoreTextEl = document.getElementById('scoreText');
const turnTextEl = document.getElementById('turnText');
const logEl = document.getElementById('log');
const tableCenterEl = document.querySelector('.table-center');

let cpuTimer = null;
let resizeTimer = null;

function createBoard(){
  return {
    spinner:null,
    arms:{left:[],right:[],top:[],bottom:[]},
    line:[],
    openEnds:[]
  };
}

function cloneTile(tile){
  return tile ? [Number(tile[0]),Number(tile[1])] : null;
}

function isDouble(tile){
  return !!tile && tile[0] === tile[1];
}

function dominoTotal(tile){
  return tile ? Number(tile[0]) + Number(tile[1]) : 0;
}

function seatName(index){
  return ['Player 1','Player 2','Player 3','Player 4'][index] || 'Player';
}

function teamIndex(playerIndex){
  return state.players === 4 ? playerIndex % 2 : playerIndex;
}

function bucketCount(){
  return state.players === 4 ? 2 : state.players;
}

function bucketName(bucket){
  if(state.players === 4) return bucket === 0 ? 'Team 1 (Players 1 + 3)' : 'Team 2 (Players 2 + 4)';
  return seatName(bucket);
}

function activeLocal(){
  return state.mode === 'local' || state.mode === 'fan';
}

function log(message){
  if(logEl) logEl.innerHTML = '<li>'+String(message)+'</li>' + logEl.innerHTML;
}

function announce(event,type,message){
  window.dispatchEvent(new CustomEvent('superior:event',{
    detail:{category:'dominoes',event,type,message}
  }));
}

function emitRoomEvent(type,payload){
  const sync = window.PLAY3D_SYNC || window.Play3DGameSync;
  if(!sync || typeof sync.sendGameEvent !== 'function') return;
  Promise.resolve(sync.sendGameEvent(type,Object.assign({
    game:'dominoes',
    players:state.players,
    currentPlayerIndex:state.currentPlayerIndex
  },payload || {}))).catch(error=>console.warn('[DOMINO ROOM EVENT]',type,error));
}

function popup(text,good=false){
  let el = document.getElementById('countPopup');
  if(!el){
    el = document.createElement('div');
    el.id = 'countPopup';
    el.className = 'count-popup';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.toggle('good',!!good);
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),1500);
}

function resetBoard(){
  state.board = createBoard();
  state.layout = {placements:[],scale:1,limits:boardLimits()};
  state.passes = 0;
  state.pending = null;
  state.handOver = false;
  if(armChooserEl){
    armChooserEl.hidden = true;
    armChooserEl.innerHTML = '';
  }
}

function buildStock(){
  state.stock = [];
  for(let a=0;a<=6;a++){
    for(let b=a;b<=6;b++) state.stock.push([a,b]);
  }
  state.stock.sort(()=>Math.random()-.5);
}

function removeTile(hand,tile){
  const index = hand.indexOf(tile);
  if(index >= 0) hand.splice(index,1);
}

function handTotal(playerIndex){
  return (state.hands[playerIndex] || []).reduce((sum,tile)=>sum+dominoTotal(tile),0);
}

function totalRemainingPips(excludedPlayers=[]){
  const excluded = new Set(excludedPlayers);
  return state.hands.reduce((sum,hand,index)=>{
    return excluded.has(index) ? sum : sum + hand.reduce((n,tile)=>n+dominoTotal(tile),0);
  },0);
}

function teamPlayers(bucket){
  if(state.players !== 4) return [bucket];
  return bucket === 0 ? [0,2] : [1,3];
}

function teamRemainingPips(bucket){
  return teamPlayers(bucket).reduce((sum,index)=>sum+handTotal(index),0);
}

function normalizeScores(){
  const count = bucketCount();
  state.scores = Array.from({length:count},(_,i)=>Number(state.scores[i]) || 0);
  state.gotIn = Array.from({length:count},(_,i)=>Boolean(state.gotIn[i]));
}

function hasBoardTiles(){
  return !!state.board.spinner || state.board.line.length > 0;
}

function highestDouble(){
  let best = null;
  state.hands.forEach((hand,playerIndex)=>{
    hand.forEach(tile=>{
      if(isDouble(tile) && (!best || tile[0] > best.tile[0])) best = {playerIndex,tile};
    });
  });
  return best;
}

function ensureOpeningDouble(){
  let starter = highestDouble();
  let guard = 0;
  while(!starter && state.stock.length && guard++ < 56){
    for(let i=0;i<state.players && state.stock.length;i++){
      const tile = state.stock.pop();
      state.hands[i].push(tile);
      if(isDouble(tile) && (!starter || tile[0] > starter.tile[0])) starter = {playerIndex:i,tile};
    }
  }
  return starter;
}

function orientFromMatch(rawTile,match,direction){
  const tile = cloneTile(rawTile);
  const connectedFirst = tile[0] === match ? tile : [tile[1],tile[0]];
  if(direction === 'left' || direction === 'top') return [connectedFirst[1],connectedFirst[0]];
  return connectedFirst;
}

function exposedPip(rawTile,match){
  if(rawTile[0] === match) return rawTile[1];
  if(rawTile[1] === match) return rawTile[0];
  return null;
}

function openEnds(){
  const ends = [];
  if(state.board.spinner){
    const spinnerValue = state.board.spinner[0];
    ARM_ORDER.forEach(arm=>{
      const tiles = state.board.arms[arm];
      let value = spinnerValue;
      tiles.forEach(tile=>{ value = exposedPip(tile,value); });
      ends.push({arm,value});
    });
  }else if(state.board.line.length){
    const first = state.board.line[0];
    const last = state.board.line[state.board.line.length-1];
    ends.push({arm:'left',value:first[0]});
    ends.push({arm:'right',value:last[1]});
  }
  state.board.openEnds = ends;
  return ends;
}

function legalArms(tile){
  if(!hasBoardTiles()) return ['open'];
  return openEnds().filter(end=>tile[0] === end.value || tile[1] === end.value).map(end=>end.arm);
}

function legal(tile){
  return legalArms(tile).length > 0;
}

function canPlay(playerIndex){
  return (state.hands[playerIndex] || []).some(legal);
}

function promoteLineDoubleToSpinner(doubleTile,playedArm,oldLine){
  state.board.spinner = cloneTile(doubleTile);
  state.board.arms = {left:[],right:[],top:[],bottom:[]};
  if(playedArm === 'left'){
    state.board.arms.right = oldLine.map(cloneTile);
  }else{
    state.board.arms.left = oldLine.slice().reverse().map(cloneTile);
  }
  state.board.line = [];
}

function placeTileOnBoard(rawTile,arm){
  const tile = cloneTile(rawTile);

  if(arm === 'open'){
    if(isDouble(tile)) state.board.spinner = tile;
    else state.board.line = [tile];
    openEnds();
    return true;
  }

  const end = openEnds().find(item=>item.arm === arm);
  if(!end || (tile[0] !== end.value && tile[1] !== end.value)) return false;

  if(state.board.spinner){
    state.board.arms[arm].push(tile);
  }else{
    const oldLine = state.board.line.map(cloneTile);
    const exposed = exposedPip(tile,end.value);
    if(arm === 'left') state.board.line.unshift([exposed,end.value]);
    else state.board.line.push([end.value,exposed]);
    if(isDouble(tile)) promoteLineDoubleToSpinner(tile,arm,oldLine);
  }

  openEnds();
  return true;
}

function commitPlay(playerIndex,tile,arm){
  if(!placeTileOnBoard(tile,arm)) return false;
  removeTile(state.hands[playerIndex],tile);
  state.passes = 0;
  state.pending = null;
  if(armChooserEl){
    armChooserEl.hidden = true;
    armChooserEl.innerHTML = '';
  }
  emitRoomEvent('domino_play',{
    playerIndex,
    tile:cloneTile(tile),
    arm,
    board:serializeBoard()
  });
  return true;
}

function serializeBoard(){
  return {
    spinner:cloneTile(state.board.spinner),
    arms:{
      left:state.board.arms.left.map(cloneTile),
      right:state.board.arms.right.map(cloneTile),
      top:state.board.arms.top.map(cloneTile),
      bottom:state.board.arms.bottom.map(cloneTile)
    },
    line:state.board.line.map(cloneTile)
  };
}

function usedSpinnerArms(){
  return ARM_ORDER.filter(arm=>state.board.arms[arm].length > 0);
}

function armOpenValue(arm){
  if(!state.board.spinner) return 0;
  let value = state.board.spinner[0];
  state.board.arms[arm].forEach(tile=>{ value = exposedPip(tile,value); });
  const tip = state.board.arms[arm][state.board.arms[arm].length-1];
  return tip && isDouble(tip) ? dominoTotal(tip) : value;
}

function boardCount(){
  if(!hasBoardTiles()) return 0;

  if(!state.board.spinner){
    const first = state.board.line[0];
    const last = state.board.line[state.board.line.length-1];
    const left = isDouble(first) ? dominoTotal(first) : first[0];
    const right = isDouble(last) ? dominoTotal(last) : last[1];
    return state.board.line.length === 1 ? dominoTotal(first) : left + right;
  }

  const spinnerTotal = dominoTotal(state.board.spinner);
  const used = usedSpinnerArms();
  if(!used.length) return spinnerTotal;

  const horizontalUsed = ['left','right'].filter(arm=>state.board.arms[arm].length);
  const verticalUsed = ['top','bottom'].filter(arm=>state.board.arms[arm].length);
  if(horizontalUsed.length === 1 && !verticalUsed.length){
    return spinnerTotal + armOpenValue(horizontalUsed[0]);
  }

  return used.reduce((sum,arm)=>sum+armOpenValue(arm),0);
}

function pointsFromCount(count){
  return count > 0 && count % 5 === 0 ? count : 0;
}

function addMatchPoints(playerIndex,points,reason,{requireEntry=false}={}){
  points = Math.max(0,Math.floor(Number(points) || 0));
  const bucket = teamIndex(playerIndex);
  if(!points) return 0;

  if(requireEntry && !state.gotIn[bucket] && points < GET_IN_MIN){
    popup('COUNT '+points+' - NEED 10 TO GET IN');
    log(bucketName(bucket)+' counted '+points+' but needs 10 to get in.');
    return 0;
  }

  state.gotIn[bucket] = true;
  state.scores[bucket] = (state.scores[bucket] || 0) + points;
  popup(reason.toUpperCase()+' +'+points,true);
  log(bucketName(bucket)+' scored '+points+' for '+reason+'.');

  if(state.scores[bucket] >= SCORE_TARGET){
    finishGame(bucket);
  }
  return points;
}

function scoreOpenEnds(playerIndex,reason='play'){
  const count = boardCount();
  const points = pointsFromCount(count);
  console.log('[DOMINO SCORE]',{reason,count,points,openEnds:openEnds()});
  if(!points){
    popup('COUNT '+count+' - NO SCORE');
    log('COUNT '+count+' - no score.');
    return 0;
  }

  const awarded = addMatchPoints(playerIndex,points,'open ends',{requireEntry:true});
  if(awarded && playerIndex === 0 && window.Play3DPoints){
    window.Play3DPoints.award('dominoes',Math.max(5,awarded),'count_fives');
  }
  announce('SCORE','success','Open ends counted. Pay the table.');
  return awarded;
}

function finishGame(bucket){
  state.gameOver = true;
  state.handOver = true;
  if(turnTextEl) turnTextEl.textContent = bucketName(bucket)+' WINS GAME';
  popup(bucketName(bucket)+' WINS '+SCORE_TARGET,true);
  log(bucketName(bucket)+' wins the game at '+state.scores[bucket]+'.');
  announce('WIN','success',bucketName(bucket)+' wins the Dominoes game.');
  emitRoomEvent('domino_game_over',{winnerBucket:bucket,scores:state.scores.slice()});
  render();
}

function dominoSettlement(winnerIndex){
  const winningBucket = teamIndex(winnerIndex);
  const settlement = totalRemainingPips([winnerIndex]);
  state.handOver = true;
  state.nextLeader = winnerIndex;

  popup('DOMINO +'+settlement,true);
  log('DOMINO! '+seatName(winnerIndex)+' emptied the hand. Opponent pips: '+settlement+'.');
  announce('DOMINO','success','DOMINO. Pay the table.');
  emitRoomEvent('domino_settlement',{winnerIndex,winningBucket,settlement});

  const awarded = addMatchPoints(winnerIndex,settlement,'DOMINO');
  if(winnerIndex === 0 && window.Play3DPoints){
    window.Play3DPoints.award('dominoes',Math.max(125,awarded),'round_win');
  }
  render();
}

function blockedSettlement(){
  state.handOver = true;

  let winnerIndex = 0;
  let settlement = 0;

  if(state.players === 4){
    const totals = [teamRemainingPips(0),teamRemainingPips(1)];
    const winnerBucket = totals[0] <= totals[1] ? 0 : 1;
    winnerIndex = teamPlayers(winnerBucket).reduce((best,index)=>{
      return handTotal(index) < handTotal(best) ? index : best;
    },teamPlayers(winnerBucket)[0]);
    settlement = Math.max(0,totals[1-winnerBucket] - totals[winnerBucket]);
    log('BLOCKED HAND. '+bucketName(winnerBucket)+' wins low count '+totals[winnerBucket]+' to '+totals[1-winnerBucket]+'.');
  }else{
    const totals = state.hands.map((_,index)=>handTotal(index));
    winnerIndex = totals.reduce((best,total,index)=>total < totals[best] ? index : best,0);
    settlement = Math.max(0,totals.reduce((sum,total,index)=>index === winnerIndex ? sum : sum+total,0) - totals[winnerIndex]);
    log('BLOCKED HAND. '+seatName(winnerIndex)+' wins low count '+totals[winnerIndex]+'.');
  }

  state.nextLeader = winnerIndex;
  popup('BLOCKED +'+settlement,settlement > 0);
  announce('BLOCKED','warning','Blocked hand. Low count wins.');
  emitRoomEvent('domino_blocked',{winnerIndex,settlement});
  addMatchPoints(winnerIndex,settlement,'blocked hand');
  render();
}

function requestArm(tile){
  if(state.handOver || state.gameOver) return;
  const arms = legalArms(tile);
  if(!arms.length){
    log('Illegal domino.');
    return;
  }
  if(arms.length === 1){
    playTile(tile,arms[0]);
    return;
  }
  state.pending = {tile};
  if(armChooserEl){
    armChooserEl.hidden = false;
    armChooserEl.innerHTML = '<span>Choose arm</span>' +
      arms.map(arm=>'<button type="button" data-arm="'+arm+'">'+arm+'</button>').join('');
  }
}

function playTile(tile,arm){
  const playerIndex = state.currentPlayerIndex;
  if(playerIndex !== 0 && !activeLocal()) return;
  if(state.handOver || state.gameOver) return;
  if(!commitPlay(playerIndex,tile,arm)){
    log('Illegal domino.');
    return;
  }

  scoreOpenEnds(playerIndex,'play');
  log(seatName(playerIndex)+' played '+tile[0]+'-'+tile[1]+' on '+arm+'. Board count '+boardCount()+'.');

  if(state.gameOver) return;
  if(!state.hands[playerIndex].length){
    dominoSettlement(playerIndex);
    return;
  }
  advance();
}

function chooseCpuMove(playerIndex){
  const hand = state.hands[playerIndex] || [];
  const moves = [];
  hand.forEach(tile=>{
    legalArms(tile).forEach(arm=>{
      const snapshot = JSON.stringify(state.board);
      placeTileOnBoard(tile,arm);
      const count = boardCount();
      const points = pointsFromCount(count);
      state.board = JSON.parse(snapshot);
      openEnds();
      moves.push({
        tile,
        arm,
        points:(!state.gotIn[teamIndex(playerIndex)] && points < GET_IN_MIN) ? 0 : points,
        leave:handTotal(playerIndex)-dominoTotal(tile)
      });
    });
  });
  moves.sort((a,b)=>{
    if(b.points !== a.points) return b.points-a.points;
    if(a.leave !== b.leave) return a.leave-b.leave;
    if(Number(isDouble(b.tile)) !== Number(isDouble(a.tile))) return Number(isDouble(b.tile))-Number(isDouble(a.tile));
    return dominoTotal(b.tile)-dominoTotal(a.tile);
  });
  return moves[0] || null;
}

function thinkDelay(){
  return 420 + Math.floor(Math.random()*650);
}

function scheduleCpu(){
  if(cpuTimer) clearTimeout(cpuTimer);
  if(turnTextEl) turnTextEl.textContent = 'OPPONENT THINKING...';
  cpuTimer = setTimeout(()=>{
    cpuTimer = null;
    cpuTurn();
  },thinkDelay());
}

function cpuTurn(){
  const playerIndex = state.currentPlayerIndex;
  if(playerIndex === 0 || activeLocal() || state.handOver || state.gameOver) return;

  let move = chooseCpuMove(playerIndex);
  while(!move && state.stock.length){
    state.hands[playerIndex].push(state.stock.pop());
    log(seatName(playerIndex)+' drew.');
    move = chooseCpuMove(playerIndex);
  }

  if(move){
    commitPlay(playerIndex,move.tile,move.arm);
    scoreOpenEnds(playerIndex,'play');
    log(seatName(playerIndex)+' played '+move.tile[0]+'-'+move.tile[1]+' on '+move.arm+'. Board count '+boardCount()+'.');
    if(state.gameOver) return;
    if(!state.hands[playerIndex].length){
      dominoSettlement(playerIndex);
      return;
    }
  }else{
    state.passes++;
    log(seatName(playerIndex)+' passed.');
  }

  if(state.passes >= state.players){
    blockedSettlement();
    return;
  }
  advance();
}

function drawTile(){
  const playerIndex = state.currentPlayerIndex;
  if(playerIndex !== 0 && !activeLocal()) return;
  if(state.handOver || state.gameOver) return;
  if(canPlay(playerIndex)){
    log('Play a legal domino if you can.');
    return;
  }
  let drew = 0;
  while(state.stock.length && !canPlay(playerIndex)){
    state.hands[playerIndex].push(state.stock.pop());
    drew++;
  }
  log(drew ? seatName(playerIndex)+' drew '+drew+'.' : 'Boneyard empty. Pass.');
  emitRoomEvent('domino_draw',{playerIndex,count:drew});
  render();
}

function passTurn(){
  const playerIndex = state.currentPlayerIndex;
  if(playerIndex !== 0 && !activeLocal()) return;
  if(state.handOver || state.gameOver) return;
  if(canPlay(playerIndex)){
    log('Play a legal domino if you can.');
    return;
  }
  if(state.stock.length){
    log('Draw until playable before passing.');
    return;
  }
  state.passes++;
  log(seatName(playerIndex)+' passed.');
  emitRoomEvent('domino_pass',{playerIndex});
  if(state.passes >= state.players){
    blockedSettlement();
    return;
  }
  advance();
}

function advance(){
  state.currentPlayerIndex = (state.currentPlayerIndex+1) % state.players;
  render();
  if(state.currentPlayerIndex !== 0 && !activeLocal()) scheduleCpu();
}

function startHand(players=state.players,{resetMatch=false}={}){
  state.mode = window.Play3DModeBar ? window.Play3DModeBar.getMode() : state.mode;
  state.players = Number(players) === 4 ? 4 : Number(players) === 3 ? 3 : 2;
  if(cpuTimer){
    clearTimeout(cpuTimer);
    cpuTimer = null;
  }
  if(resetMatch){
    state.scores = [];
    state.gotIn = [];
    state.nextLeader = null;
  }
  normalizeScores();
  buildStock();
  resetBoard();
  state.hands = Array.from({length:state.players},()=>state.stock.splice(0,HAND_SIZE));
  state.gameOver = false;

  const leader = Number.isInteger(state.nextLeader) ? state.nextLeader % state.players : null;
  state.nextLeader = null;
  announce('NEW_GAME','normal','DOMINOES TABLE OPEN.');

  if(leader !== null){
    state.currentPlayerIndex = leader;
    log(seatName(leader)+' leads the next hand and may play any domino.');
  }else{
    const starter = ensureOpeningDouble();
    if(starter){
      removeTile(state.hands[starter.playerIndex],starter.tile);
      state.board.spinner = cloneTile(starter.tile);
      openEnds();
      state.currentPlayerIndex = (starter.playerIndex+1) % state.players;
      log(seatName(starter.playerIndex)+' opened with highest double '+starter.tile[0]+'-'+starter.tile[1]+'.');
      announce('SPINNER','elite','Spinner on the table.');
      scoreOpenEnds(starter.playerIndex,'opening double');
    }else{
      state.currentPlayerIndex = 0;
      log('No double found. Player 1 starts manually.');
    }
  }

  emitRoomEvent('domino_new_hand',{board:serializeBoard(),scores:state.scores.slice()});
  render();
  if(state.currentPlayerIndex !== 0 && !activeLocal()) scheduleCpu();
}

function washDishes(){
  if(state.gameOver) startHand(state.players,{resetMatch:true});
  else startHand(state.players);
}

function boardLimits(){
  const width = Math.max(250,tableCenterEl?.clientWidth || 720);
  const height = Math.max(220,tableCenterEl?.clientHeight || 520);
  return {
    x:Math.max(100,width/2-EDGE_MARGIN),
    y:Math.max(90,height/2-EDGE_MARGIN)
  };
}

function tileOrientation(direction,tile){
  const verticalFlow = direction === 'top' || direction === 'bottom';
  if(isDouble(tile)) return verticalFlow ? 'horizontal' : 'vertical';
  return verticalFlow ? 'vertical' : 'horizontal';
}

function tileSize(orientation){
  return TILE_SIZE[orientation] || TILE_SIZE.horizontal;
}

function spanAlong(placement,direction){
  const size = tileSize(placement.orientation);
  return direction === 'left' || direction === 'right' ? size.w : size.h;
}

function candidatePlacement(rawTile,match,anchor,oldDirection,newDirection,arm){
  const direction = DIRECTIONS[newDirection];
  const oldVector = DIRECTIONS[oldDirection];
  const orientation = tileOrientation(newDirection,rawTile);
  const displayedTile = orientFromMatch(rawTile,match,newDirection);
  const next = {
    tile:displayedTile,
    raw:cloneTile(rawTile),
    arm,
    flowSide:newDirection,
    orientation,
    double:isDouble(rawTile),
    spinner:false,
    turned:oldDirection !== newDirection,
    exposedPip:exposedPip(rawTile,match)
  };
  const anchorHalf = spanAlong(anchor,oldDirection)/2;
  const nextHalf = spanAlong(next,newDirection)/2;
  const pivotX = anchor.x + oldVector.x*anchorHalf;
  const pivotY = anchor.y + oldVector.y*anchorHalf;
  next.x = oldDirection === newDirection ? anchor.x + direction.x*(anchorHalf+nextHalf) : pivotX + direction.x*nextHalf;
  next.y = oldDirection === newDirection ? anchor.y + direction.y*(anchorHalf+nextHalf) : pivotY + direction.y*nextHalf;
  return next;
}

function spinnerPlacement(){
  return {
    tile:cloneTile(state.board.spinner),
    raw:cloneTile(state.board.spinner),
    x:0,
    y:0,
    arm:'spinner',
    flowSide:'top',
    orientation:'vertical',
    double:true,
    spinner:true,
    turned:false,
    exposedPip:state.board.spinner[0]
  };
}

function withinBounds(placement,limits){
  const size = tileSize(placement.orientation);
  return Math.abs(placement.x)+size.w/2 <= limits.x &&
    Math.abs(placement.y)+size.h/2 <= limits.y;
}

function overlaps(a,b){
  const as = tileSize(a.orientation);
  const bs = tileSize(b.orientation);
  const xOverlap = Math.abs(a.x-b.x) < (as.w+bs.w)/2-COLLISION_PAD;
  const yOverlap = Math.abs(a.y-b.y) < (as.h+bs.h)/2-COLLISION_PAD;
  return xOverlap && yOverlap;
}

function collides(candidate,placements,anchor){
  return placements.some(item=>item !== anchor && overlaps(candidate,item));
}

function routeCandidates(direction){
  return [
    direction,
    CLOCKWISE[direction],
    COUNTER_CLOCKWISE[direction],
    OPPOSITE[direction]
  ].filter(Boolean);
}

function overflowScore(candidate,limits){
  const size = tileSize(candidate.orientation);
  return Math.max(0,Math.abs(candidate.x)+size.w/2-limits.x) +
    Math.max(0,Math.abs(candidate.y)+size.h/2-limits.y);
}

function routeArm(arm,rawTiles,spinner,placements,limits){
  let anchor = spinner;
  let direction = arm;
  let match = state.board.spinner[0];

  rawTiles.forEach(rawTile=>{
    const candidates = routeCandidates(direction).map(nextDirection=>{
      return candidatePlacement(rawTile,match,anchor,direction,nextDirection,arm);
    });

    let chosen = candidates.find(candidate=>withinBounds(candidate,limits) && !collides(candidate,placements,anchor));
    if(!chosen){
      chosen = candidates
        .filter(candidate=>!collides(candidate,placements,anchor))
        .sort((a,b)=>overflowScore(a,limits)-overflowScore(b,limits))[0];
    }
    if(!chosen){
      chosen = candidates.sort((a,b)=>overflowScore(a,limits)-overflowScore(b,limits))[0];
    }

    placements.push(chosen);
    anchor = chosen;
    direction = chosen.flowSide;
    match = chosen.exposedPip;
  });
}

function linePlacements(limits){
  const tiles = state.board.line;
  if(!tiles.length) return [];

  const placements = [];
  let match = tiles[0][0];
  let anchor = {
    tile:cloneTile(tiles[0]),
    raw:cloneTile(tiles[0]),
    x:0,
    y:0,
    arm:'line',
    flowSide:'right',
    orientation:tileOrientation('right',tiles[0]),
    double:isDouble(tiles[0]),
    spinner:false,
    turned:false,
    exposedPip:tiles[0][1]
  };
  placements.push(anchor);
  match = anchor.exposedPip;

  tiles.slice(1).forEach(tile=>{
    const candidates = routeCandidates(anchor.flowSide).map(direction=>{
      return candidatePlacement(tile,match,anchor,anchor.flowSide,direction,'line');
    });
    const chosen = candidates.find(item=>withinBounds(item,limits) && !collides(item,placements,anchor)) ||
      candidates.filter(item=>!collides(item,placements,anchor)).sort((a,b)=>overflowScore(a,limits)-overflowScore(b,limits))[0] ||
      candidates[0];
    placements.push(chosen);
    anchor = chosen;
    match = chosen.exposedPip;
  });
  return placements;
}

function computeLayout(){
  const limits = boardLimits();
  const placements = [];

  if(state.board.spinner){
    const spinner = spinnerPlacement();
    placements.push(spinner);
    ARM_ORDER.forEach(arm=>routeArm(arm,state.board.arms[arm],spinner,placements,limits));
  }else{
    placements.push(...linePlacements(limits));
  }

  let maxX = 100;
  let maxY = 80;
  placements.forEach(item=>{
    const size = tileSize(item.orientation);
    maxX = Math.max(maxX,Math.abs(item.x)+size.w/2+12);
    maxY = Math.max(maxY,Math.abs(item.y)+size.h/2+12);
  });

  const scale = Math.min(1,limits.x/maxX,limits.y/maxY);
  state.layout = {
    placements,
    limits,
    scale:Math.max(.48,scale)
  };
  return state.layout;
}

function tileHTML(tile,index,className=''){
  return '<button class="tile '+className+'" data-i="'+index+'"><span>'+tile[0]+'</span><i></i><span>'+tile[1]+'</span></button>';
}

function boardTileHTML(item,index){
  const classes = [
    'board-tile',
    item.orientation,
    item.arm ? item.arm+'-arm' : '',
    item.turned ? 'domino-bent-end' : '',
    item.double ? 'double' : '',
    item.spinner ? 'spinner' : ''
  ].filter(Boolean).join(' ');
  return '<button class="tile '+classes+'" style="--x:'+Math.round(item.x)+'px;--y:'+Math.round(item.y)+'px;" data-i="'+index+'"><span>'+item.tile[0]+'</span><i></i><span>'+item.tile[1]+'</span></button>';
}

function renderBoard(){
  if(!chainEl) return;
  const layout = computeLayout();
  chainEl.className = layout.placements.length ? 'chain tree-board' : 'chain';
  chainEl.innerHTML = layout.placements.map(boardTileHTML).join('');
  chainEl.style.setProperty('--board-scale',String(layout.scale));

  chainEl.querySelectorAll('.tile.spinner').forEach(tile=>{
    tile.style.setProperty('transform','translate(-50%,-50%) rotate(90deg)','important');
  });

  renderDebug();
}

function renderDebug(){
  let el = document.getElementById('openEndDebug');
  const enabled = new URLSearchParams(location.search).get('debug') === '1';
  if(!enabled){
    if(el) el.remove();
    return;
  }
  if(!el){
    el = document.createElement('div');
    el.id = 'openEndDebug';
    el.className = 'open-end-debug';
    document.querySelector('.casino-table')?.appendChild(el);
  }
  el.textContent = 'ENDS '+openEnds().map(end=>end.arm+':'+end.value).join(' | ')+' | COUNT '+boardCount()+' | SCALE '+state.layout.scale.toFixed(2);
}

function backs(count){
  return Array.from({length:count},()=>'<span class="tile-back"></span>').join('');
}

function scoreLine(){
  return state.scores.map((score,index)=>{
    return bucketName(index)+': '+score+(state.gotIn[index] ? '' : ' (need 10)');
  }).join(' / ');
}

function render(){
  openEnds();
  renderBoard();

  const visiblePlayer = state.currentPlayerIndex === 0 || activeLocal() ? state.currentPlayerIndex : 0;
  const hand = state.hands[visiblePlayer] || [];

  if(handEl){
    handEl.innerHTML = hand.map((tile,index)=>tileHTML(tile,index,legal(tile) ? '' : 'disabled')).join('');
    handEl.querySelectorAll('.tile').forEach(button=>{
      button.onclick = ()=>requestArm(hand[Number(button.dataset.i)]);
    });
  }

  if(scoreTextEl) scoreTextEl.textContent = scoreLine();
  if(turnTextEl && turnTextEl.textContent !== 'OPPONENT THINKING...'){
    turnTextEl.textContent = state.handOver ? 'HAND OVER - WASH THE DISHES' : seatName(state.currentPlayerIndex)+' TURN | COUNT '+boardCount();
  }

  [['.bottom-seat',0],['.top-seat',1],['.left-seat',2],['.right-seat',3]].forEach(([selector,index])=>{
    const el = document.querySelector(selector);
    if(!el) return;
    if(index >= state.players){
      el.innerHTML = '';
      return;
    }
    const partner = state.players === 4 ? '<small>'+bucketName(teamIndex(index))+'</small>' : '';
    el.innerHTML = '<b>'+seatName(index)+'</b>'+partner+'<small>'+state.hands[index].length+' dominoes</small><div class="seat-backs">'+backs(Math.min(7,state.hands[index].length))+'</div>';
  });

  document.querySelectorAll('.playerCountBtn').forEach(button=>{
    button.classList.toggle('active',Number(button.dataset.count) === state.players);
  });

  let washBtn = document.getElementById('washBtn');
  if(!washBtn && passBtnEl?.parentElement){
    washBtn = document.createElement('button');
    washBtn.id = 'washBtn';
    washBtn.type = 'button';
    washBtn.textContent = 'WASH THE DISHES';
    washBtn.onclick = washDishes;
    passBtnEl.parentElement.appendChild(washBtn);
  }
  if(washBtn) washBtn.disabled = !state.handOver && !state.gameOver;
}

if(armChooserEl){
  armChooserEl.addEventListener('click',event=>{
    const button = event.target.closest('[data-arm]');
    if(button && state.pending) playTile(state.pending.tile,button.dataset.arm);
  });
}

if(newBtnEl) newBtnEl.onclick = ()=>startHand(state.players,{resetMatch:true});
if(drawBtnEl) drawBtnEl.onclick = drawTile;
if(passBtnEl) passBtnEl.onclick = passTurn;

document.querySelectorAll('.playerCountBtn').forEach(button=>{
  button.onclick = ()=>startHand(Number(button.dataset.count),{resetMatch:true});
});

window.addEventListener('play3d:modechange',event=>{
  state.mode = event.detail.mode;
  startHand(state.mode === 'cpu' ? 2 : 4,{resetMatch:true});
});

window.addEventListener('resize',()=>{
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render,100);
});

window.Play3DDominoes = {
  state,
  render,
  newGame:players=>startHand(players,{resetMatch:true}),
  newHand:()=>startHand(state.players),
  boardCount,
  openEnds
};

startHand(2,{resetMatch:true});
})();
