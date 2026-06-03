(()=>{
'use strict';

function play3dAnnounce(event, type, message){
  window.dispatchEvent(new CustomEvent('superior:event', { detail:{ category:'dominoes', event:event, type:type, message:message } }));
}

/* PLAY 3D DOMINOES — SCORE-ON-PLAY COUNTING FIVES
   Scope: Dominoes script only.
   Rules kept: score every scoring play, first score must be 10+ to get in, game to 150.
   Board repair: first double is the spinner; each arm is a real branch with direction-aware open ends.
*/

const SCORE_TARGET = 150;
const GET_IN_MIN = 10;
const HAND_SIZE = 7;
const TILE_SIZE = { horizontal:{w:82,h:42}, vertical:{w:50,h:88} };
function axisSpan(orientation,arm){
  const size = TILE_SIZE[orientation] || TILE_SIZE.horizontal;
  return (arm === 'left' || arm === 'right') ? size.w : size.h;
}
const BRANCH_DIRS = {
  left:{x:-1,y:0},
  right:{x:1,y:0},
  top:{x:0,y:-1},
  bottom:{x:0,y:1}
};
const BRANCH_TURNS = {right:'bottom',bottom:'left',left:'top',top:'right'};
const BRANCH_REVERSE_TURNS = {right:'top',top:'left',left:'bottom',bottom:'right'};
const BRANCH_TURN_OPTIONS = {
  top:['right','left'],
  bottom:['left','right'],
  left:['bottom','top'],
  right:['top','bottom']
};
const BOARD_LIMITS = {x:340,y:360};
const DEBUG = new URLSearchParams(window.location.search).get('debug') === '1';

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
  nextLeader:null,
  board:{
    spinnerTile:null,
    spinnerArms:{left:[],right:[],top:[],bottom:[]},
    openEnds:[],
    placements:[]
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
function scoreBucket(playerIndex){ return state.players === 4 ? playerIndex % 2 : playerIndex; }
function scoreBucketCount(){ return state.players === 4 ? 2 : state.players; }
function scoreBucketName(bucket){ return state.players === 4 ? 'Team '+(bucket === 0 ? '1' : '2') : seatName(bucket); }
function scoreBucketPlayers(bucket){ return state.players === 4 ? (bucket === 0 ? [0,2] : [1,3]) : [bucket]; }
function log(msg){
  if(!logEl) return;
  logEl.innerHTML = '<li>'+String(msg)+'</li>' + logEl.innerHTML;
  while(logEl.children.length > 8) logEl.removeChild(logEl.lastElementChild);
}
function placementTile(item){ return item && item.tile ? item.tile : item; }

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

function clearRenderedBoard(){
  if(chainEl){
    chainEl.className = 'chain';
    chainEl.removeAttribute('style');
    chainEl.innerHTML = '';
  }
  if(armChooser){
    armChooser.hidden = true;
    armChooser.innerHTML = '';
  }
  document.getElementById('openEndDebug')?.remove();
}

function resetBoard(){
  state.board = {spinnerTile:null, spinnerArms:{left:[],right:[],top:[],bottom:[]}, openEnds:[], placements:[]};
  state.passes = 0;
  state.pending = null;
  state.handOver = false;
  clearRenderedBoard();
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
  const horizontalReady = arms.left.length > 0 && arms.right.length > 0;
  return horizontalReady ? ['left','right','top','bottom'] : ['left','right'];
}

function branchOrientation(arm,tile){
  const double = isDouble(tile);
  if(arm === 'left' || arm === 'right') return double ? 'vertical' : 'horizontal';
  return double ? 'horizontal' : 'vertical';
}

function orientForArm(tile,match,arm){
  if(arm === 'left' || arm === 'top') return tile[1] === match ? tile.slice() : [tile[1],tile[0]];
  return tile[0] === match ? tile.slice() : [tile[1],tile[0]];
}

function exposedPipFromOriented(arm,tile){
  if(!tile) return 0;
  return (arm === 'left' || arm === 'top') ? tile[0] : tile[1];
}

function exposedPipFromPlacement(item){
  if(!item) return 0;
  if(typeof item.exposedPip === 'number') return item.exposedPip;
  return exposedPipFromOriented(item.branch || 'right', placementTile(item));
}

function exposedCountFromPlacement(item){
  const tile = placementTile(item);
  if(!tile) return 0;
  return isDouble(tile) ? tile[0] + tile[1] : exposedPipFromPlacement(item);
}

function oppositeSide(arm){
  return {left:'right',right:'left',top:'bottom',bottom:'top'}[arm] || 'right';
}

function buildBranchPlacement(rawTile,logicalArm,match,anchor,flowSide){
  const oriented = orientForArm(rawTile,match,flowSide);
  const orientation = branchOrientation(flowSide,oriented);
  const dir = BRANCH_DIRS[flowSide] || BRANCH_DIRS.right;
  const step = axisSpan(orientation,flowSide);
  const anchorFlow = (anchor.flowSide || anchor.exposedSide) === 'all'
    ? logicalArm
    : (anchor.flowSide || anchor.exposedSide || logicalArm);
  const anchorStep = axisSpan(anchor.orientation || 'horizontal',anchorFlow);
  const distance = (step / 2) + (anchorStep / 2);
  const turned = anchorFlow !== flowSide;
  const anchorDir = BRANCH_DIRS[anchorFlow] || dir;
  const pivotX = (anchor.x || 0) + anchorDir.x * anchorStep / 2;
  const pivotY = (anchor.y || 0) + anchorDir.y * anchorStep / 2;
  const turnClearance = axisSpan(orientation,anchorFlow) / 2;

  return {
    tile:oriented,
    raw:rawTile.slice(),
    x:turned ? pivotX + dir.x * step / 2 + anchorDir.x * turnClearance : (anchor.x || 0) + dir.x * distance,
    y:turned ? pivotY + dir.y * step / 2 + anchorDir.y * turnClearance : (anchor.y || 0) + dir.y * distance,
    orientation,
    branch:logicalArm,
    flowSide,
    direction:dir,
    connectedSide:oppositeSide(flowSide),
    exposedSide:flowSide,
    exposedPip:exposedPipFromOriented(flowSide,oriented),
    matchPip:match,
    double:isDouble(oriented),
    spinner:false,
    turned
  };
}

function makeSpinnerPlacement(tile){
  return {
    tile:tile.slice(),
    raw:tile.slice(),
    x:0,
    y:0,
    orientation:'vertical',
    branch:'spinner',
    connectedSide:null,
    exposedSide:'all',
    exposedPip:tile[0],
    matchPip:tile[0],
    double:true,
    spinner:true
  };
}

function makeBranchPlacement(rawTile,arm,match){
  const branch = state.board.spinnerArms[arm] || [];
  const anchor = branch.length ? branch[branch.length-1] : state.board.spinnerTile;
  return makeFlowingPlacement(rawTile,arm,match,anchor,arm);
}

function makeFlowingPlacement(rawTile,arm,match,anchor,defaultFlow){
  const flowSide = (anchor.flowSide || anchor.exposedSide) === 'all'
    ? arm
    : (anchor.flowSide || anchor.exposedSide || defaultFlow || arm);
  const turnOptions = BRANCH_TURN_OPTIONS[flowSide] || [BRANCH_TURNS[flowSide] || arm, BRANCH_REVERSE_TURNS[flowSide] || arm];
  const reverse = BRANCH_TURNS[turnOptions[0]] || arm;
  const candidates = [flowSide].concat(turnOptions,reverse)
    .filter((side,index,list)=>list.indexOf(side)===index)
    .map(side=>buildBranchPlacement(rawTile,arm,match,anchor,side));
  const straight = candidates.find(item=>item.flowSide === flowSide);
  if(straight && !placementOutsideTable(straight) && !placementCollides(straight,anchor)){
    return straight;
  }
  return candidates.sort((a,b)=>placementPenalty(a,anchor,flowSide,arm)-placementPenalty(b,anchor,flowSide,arm))[0];
}

function currentBoardLimits(){
  const tableCenter = document.querySelector('.table-center');
  if(!tableCenter) return BOARD_LIMITS;
  const rect = tableCenter.getBoundingClientRect();
  if(!rect.width || !rect.height) return BOARD_LIMITS;
  return {
    x:Math.max(180,rect.width / 2),
    y:Math.max(180,rect.height / 2)
  };
}

function placementOutsideTable(item){
  const size = TILE_SIZE[item.orientation || 'horizontal'] || TILE_SIZE.horizontal;
  const limits = currentBoardLimits();
  return Math.abs(item.x || 0) + size.w / 2 > limits.x
    || Math.abs(item.y || 0) + size.h / 2 > limits.y;
}

function distanceToBoundary(item){
  const size = TILE_SIZE[item.orientation || 'horizontal'] || TILE_SIZE.horizontal;
  const limits = currentBoardLimits();
  const xLeft = limits.x - (Math.abs(item.x || 0) + size.w / 2);
  const yLeft = limits.y - (Math.abs(item.y || 0) + size.h / 2);
  return (item.flowSide === 'left' || item.flowSide === 'right') ? xLeft : yLeft;
}

function branchCompactnessPenalty(item,logicalArm){
  const branch = state.board.spinnerArms[logicalArm] || [];
  if(!branch.length) return 0;
  const nearCenter = Math.abs(item.x || 0) + Math.abs(item.y || 0);
  const originalAxis = logicalArm === 'left' || logicalArm === 'right' ? Math.abs(item.x || 0) : Math.abs(item.y || 0);
  const awayFromSpinnerBonus = Math.min(originalAxis,420);
  const boxyNearCenterPenalty = nearCenter < 260 ? 40000 : 0;
  return boxyNearCenterPenalty - awayFromSpinnerBonus * 35;
}

function futureRunwayPenalty(item,logicalArm,turned){
  if(!turned) return 0;
  const exposed = typeof item.exposedPip === 'number' ? item.exposedPip : exposedPipFromPlacement(item);
  const probeTile = [exposed,(exposed + 1) % 7];
  const probe = buildBranchPlacement(probeTile,logicalArm,exposed,item,item.flowSide);
  const blockedNextStep = placementOutsideTable(probe) || placementCollides(probe,item);
  return blockedNextStep ? 95000 : -30000;
}

function placementPenalty(item,anchor,previousFlow,logicalArm){
  const size = TILE_SIZE[item.orientation || 'horizontal'] || TILE_SIZE.horizontal;
  const limits = currentBoardLimits();
  const overflowX = Math.max(0,Math.abs(item.x || 0) + size.w / 2 - limits.x);
  const overflowY = Math.max(0,Math.abs(item.y || 0) + size.h / 2 - limits.y);
  const collisionPenalty = placementCollisionCount(item,anchor)*100000;
  const overflowPenalty = (overflowX+overflowY)*1000000;
  const turned = item.flowSide !== previousFlow;
  const consecutiveTurn = turned && anchor && anchor.turned;
  const singleTurnPenalty = turned ? 25000 : 0;
  const consecutiveTurnPenalty = consecutiveTurn ? 125000 : 0;
  const straightReward = !turned ? -200000 : 0;
  return overflowPenalty
    + collisionPenalty
    + singleTurnPenalty
    + consecutiveTurnPenalty
    + futureRunwayPenalty(item,logicalArm,turned)
    + branchCompactnessPenalty(item,logicalArm)
    + straightReward;
}

function placementCollisionCount(item,ignore){
  return (state.board.placements || []).filter(existing=>{
    if(ignore && existing === ignore) return false;
    return placementsOverlap(item,existing);
  }).length;
}

function placementCollides(item,ignore){
  return placementCollisionCount(item,ignore)>0;
}

function placementsOverlap(a,b){
  const aSize=TILE_SIZE[a.orientation || 'horizontal'] || TILE_SIZE.horizontal;
  const bSize=TILE_SIZE[b.orientation || 'horizontal'] || TILE_SIZE.horizontal;
  const gap=3;
  return Math.abs((a.x || 0)-(b.x || 0)) < (aSize.w+bSize.w)/2-gap
    && Math.abs((a.y || 0)-(b.y || 0)) < (aSize.h+bSize.h)/2-gap;
}

function rebranchPlacement(item,branch){
  return Object.assign({}, item, {
    branch,
    flowSide:branch,
    direction:BRANCH_DIRS[branch],
    exposedSide:branch,
    connectedSide:oppositeSide(branch),
    exposedPip:exposedPipFromOriented(branch, placementTile(item)),
    spinner:false
  });
}

function promoteFirstDoubleToSpinner(placement,arm,existingLine){
  state.board.spinnerTile = Object.assign({}, placement, {
    branch:'spinner',
    connectedSide:null,
    exposedSide:'all',
    exposedPip:placement.tile[0],
    matchPip:placement.tile[0],
    double:true,
    spinner:true
  });
  state.board.spinnerArms = {left:[],right:[],top:[],bottom:[]};
  if(arm === 'left'){
    state.board.spinnerArms.right = existingLine.map(item=>rebranchPlacement(item,'right'));
  }else{
    state.board.spinnerArms.left = existingLine.slice().reverse().map(item=>rebranchPlacement(item,'left'));
  }
}

function refreshPlacements(){
  const placements = [];
  if(state.board.spinnerTile) placements.push(state.board.spinnerTile);
  ['left','right','top','bottom'].forEach(side=>{
    placements.push(...(state.board.spinnerArms[side] || []));
  });
  state.board.placements = placements;
  return placements;
}

function refreshOpenEnds(){
  const ends = [];

  if(!hasBoardTiles()){
    state.board.openEnds = ends;
    refreshPlacements();
    return ends;
  }

  if(state.board.spinnerTile){
    const spinnerValue = state.board.spinnerTile.exposedPip;
    armOrderForPlay().forEach(side=>{
      const arm = state.board.spinnerArms[side];
      const tip = arm.length ? arm[arm.length-1] : state.board.spinnerTile;
      ends.push({
        arm:side,
        value:arm.length ? exposedPipFromPlacement(tip) : spinnerValue,
        x:tip.x || 0,
        y:tip.y || 0,
        branch:side
      });
    });
  }else{
    const line = state.board.spinnerArms.right;
    if(line.length){
      const leftTip = line[0];
      const rightTip = line[line.length-1];
      ends.push({arm:'left',value:placementTile(leftTip)[0],x:leftTip.x || 0,y:leftTip.y || 0,branch:'left'});
      ends.push({arm:'right',value:placementTile(rightTip)[1],x:rightTip.x || 0,y:rightTip.y || 0,branch:'right'});
    }
  }

  state.board.openEnds = ends;
  refreshPlacements();
  return ends;
}

function countDisplayArms(){
  if(!state.board.spinnerTile) return ['left','right'];
  const arms = state.board.spinnerArms;
  const leftUsed = arms.left.length > 0;
  const rightUsed = arms.right.length > 0;

  // Counting-fives spinner rules:
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
    const tip = arm === 'left' ? line[0] : line[line.length-1];
    const tile = placementTile(tip);
    return isDouble(tile) ? tile[0] + tile[1] : (arm === 'left' ? tile[0] : tile[1]);
  }

  const branch = state.board.spinnerArms[arm] || [];
  if(!branch.length) return state.board.spinnerTile.tile[0];
  return exposedCountFromPlacement(branch[branch.length-1]);
}

function boardCount(){
  if(!hasBoardTiles()) return 0;

  if(state.board.spinnerTile){
    const arms = state.board.spinnerArms;
    const anyArm = arms.left.length || arms.right.length || arms.top.length || arms.bottom.length;
    if(!anyArm) return state.board.spinnerTile.tile[0] + state.board.spinnerTile.tile[1];

    const leftUsed = arms.left.length > 0;
    const rightUsed = arms.right.length > 0;
    if(leftUsed !== rightUsed && !arms.top.length && !arms.bottom.length){
      return state.board.spinnerTile.tile[0] + state.board.spinnerTile.tile[1] + openEndValue(leftUsed ? 'left' : 'right');
    }
  }

  return countDisplayArms().reduce((sum,arm)=>sum+openEndValue(arm),0);
}

function scoreFromCount(count){ return count > 0 && count % 5 === 0 ? count : 0; }
function roundSettlementPips(pips){
  const remainder = pips % 5;
  if(remainder === 0) return pips;
  return remainder <= 2 ? pips - remainder : pips + (5 - remainder);
}

function debugArmValues(){
  const values = {left:0,right:0,top:0,bottom:0};
  refreshOpenEnds().forEach(end=>{ values[end.arm] = end.value; });
  return values;
}

function updateOpenEndDebug(){
  if(!DEBUG){
    document.getElementById('openEndDebug')?.remove();
    return;
  }
  const table = document.querySelector('.casino-table');
  if(!table) return;
  let el = document.getElementById('openEndDebug');
  if(!el){
    el = document.createElement('div');
    el.id = 'openEndDebug';
    el.className = 'open-end-debug';
    table.appendChild(el);
  }
  const arms = debugArmValues();
  el.textContent = 'OPEN ENDS  LEFT:'+arms.left+'  RIGHT:'+arms.right+'  TOP:'+arms.top+'  BOTTOM:'+arms.bottom+'  COUNT:'+boardCount();
}

function legalArms(tile){
  const ends = refreshOpenEnds();
  if(!hasBoardTiles()) return ['open'];
  return ends
    .filter(end=>tile[0] === end.value || tile[1] === end.value)
    .map(end=>end.arm);
}
function legal(tile){ return legalArms(tile).length > 0; }
function validPlaySummary(playerIndex){
  const hand = state.hands[playerIndex] || [];
  const openEnds = refreshOpenEnds().map(end=>({arm:end.arm,value:end.value}));
  const playable = hand
    .map(tile=>({tile,arms:legalArms(tile)}))
    .filter(item=>item.arms.length);
  if(DEBUG) console.log('[DOMINO VALID PLAYS]', { hand, openEnds, playable });
  return playable;
}
function canPlay(playerIndex){ return validPlaySummary(playerIndex).length > 0; }

function placeOpeningDouble(player,tile){
  removeTile(state.hands[player],tile);
  state.board.spinnerTile = makeSpinnerPlacement(tile);
  refreshOpenEnds();
}

function placeOnArm(tile,arm){
  if(arm === 'open'){
    if(isDouble(tile)){
      state.board.spinnerTile = makeSpinnerPlacement(tile);
    }else{
      const oriented = tile.slice();
      state.board.spinnerArms.right.push({
        tile:oriented,
        raw:tile.slice(),
        x:0,
        y:0,
        orientation:'horizontal',
        branch:'right',
        flowSide:'right',
        connectedSide:null,
        exposedSide:'right',
        exposedPip:oriented[1],
        matchPip:oriented[0],
        double:false,
        spinner:false
      });
    }
    refreshOpenEnds();
    return true;
  }

  const end = refreshOpenEnds().find(item=>item.arm === arm);
  if(!end || (tile[0] !== end.value && tile[1] !== end.value)) return false;

  if(!state.board.spinnerTile){
    const line = state.board.spinnerArms.right;
    const existingLine = line.slice();
    const previous = arm === 'left' ? line[0] : line[line.length-1];
    const anchor = previous || {x:0,y:0,orientation:'horizontal',flowSide:arm,exposedSide:arm};
    const placement = makeFlowingPlacement(tile,arm,end.value,anchor,arm);
    if(isDouble(placement.tile)){
      promoteFirstDoubleToSpinner(placement,arm,existingLine);
    }else if(arm === 'left') line.unshift(placement);
    else line.push(placement);
  }else{
    const placement = makeBranchPlacement(tile,arm,end.value);
    state.board.spinnerArms[arm].push(placement);
  }

  refreshOpenEnds();
  return true;
}

function commitPlay(playerIndex,tile,arm){
  const hadSpinner = !!state.board.spinnerTile;
  if(!placeOnArm(tile,arm)) return false;
  if(!hadSpinner && state.board.spinnerTile) play3dAnnounce('SPINNER','elite');
  removeTile(state.hands[playerIndex],tile);
  state.passes = 0;
  state.pending = null;
  if(armChooser){ armChooser.hidden = true; armChooser.innerHTML = ''; }
  return true;
}

function scoreBoardCount(player,reason='play'){
  const actualOpenEnds = refreshOpenEnds().map(end=>({arm:end.arm,value:end.value}));
  let openEnds = countDisplayArms().map(arm=>({arm,value:openEndValue(arm)}));
  if(!openEnds.length && state.board.spinnerTile){
    openEnds = [{arm:'spinner',value:state.board.spinnerTile.tile[0]+state.board.spinnerTile.tile[1]}];
  }
  const count = boardCount();
  const points = scoreFromCount(count);
  if(DEBUG){
    console.log('[DOMINO OPEN ENDS]', { reason, openEnds:actualOpenEnds, arms:debugArmValues() });
    console.log('[DOMINO SCORE]', { reason, openEnds, total:count, awarded:points });
  }

  if(!points){
    return count;
  }

  const bucket = scoreBucket(player);
  if(!state.gotIn[bucket] && points < GET_IN_MIN){
    popCount('COUNT '+points+' — NEED 10 TO GET IN', false);
    log(scoreBucketName(bucket)+' counted '+points+' but needs 10 to get in.');
    return count;
  }

  state.gotIn[bucket] = true;
  state.scores[bucket] += points;
  popCount('SCORE '+points, true);
  log(scoreBucketName(bucket)+' scored '+points+'.');
  if(player === 0 && window.Play3DPoints) window.Play3DPoints.award('dominoes',Math.max(5,points),'count_fives');

  if(state.scores[bucket] >= SCORE_TARGET) finishGame(bucket);
  return count;
}

function awardSettlement(player,pips,reason){
  const bucket = scoreBucket(player);
  const points = roundSettlementPips(pips);
  if(!points){
    log(reason+' counted '+pips+' pips. No five-count award.');
    return 0;
  }
  if(!state.gotIn[bucket] && points < GET_IN_MIN){
    log(scoreBucketName(bucket)+' counted '+points+' but needs 10 to get in.');
    return 0;
  }
  state.gotIn[bucket] = true;
  state.scores[bucket] += points;
  log(scoreBucketName(bucket)+' scored '+points+' from '+reason+' after rounding '+pips+' pips.');
  if(state.scores[bucket] >= SCORE_TARGET) finishGame(bucket);
  return points;
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
  const opening = !hasBoardTiles();
  if(!commitPlay(player,tile,arm)){ log('Illegal domino.'); return; }
  const count = scoreBoardCount(player,opening ? 'opening_lead' : 'play');
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
      const opening = !hasBoardTiles();
      if(!placeOnArm(tile,arm)){ restoreBoard(snapshot); return; }
      const count = boardCount();
      const points = scoreFromCount(count);
      restoreBoard(snapshot);
      const usablePoints = (!opening && !state.gotIn[scoreBucket(player)] && points < GET_IN_MIN) ? 0 : points;
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

function clonePlacement(item){
  if(!item) return null;
  return {
    tile:item.tile ? item.tile.slice() : placementTile(item).slice(),
    raw:item.raw ? item.raw.slice() : placementTile(item).slice(),
    x:item.x || 0,
    y:item.y || 0,
    orientation:item.orientation || 'horizontal',
    branch:item.branch || 'right',
    flowSide:item.flowSide || item.exposedSide || item.branch || 'right',
    direction:item.direction ? Object.assign({},item.direction) : undefined,
    connectedSide:item.connectedSide || null,
    exposedSide:item.exposedSide || null,
    exposedPip:typeof item.exposedPip === 'number' ? item.exposedPip : exposedPipFromPlacement(item),
    matchPip:typeof item.matchPip === 'number' ? item.matchPip : null,
    double:!!item.double,
    spinner:!!item.spinner,
    turned:!!item.turned
  };
}

function cloneBoard(){
  return {
    spinnerTile: clonePlacement(state.board.spinnerTile),
    spinnerArms: {
      left: state.board.spinnerArms.left.map(clonePlacement),
      right: state.board.spinnerArms.right.map(clonePlacement),
      top: state.board.spinnerArms.top.map(clonePlacement),
      bottom: state.board.spinnerArms.bottom.map(clonePlacement)
    },
    openEnds: state.board.openEnds.map(end=>Object.assign({},end)),
    placements: state.board.placements.map(clonePlacement)
  };
}
function restoreBoard(snapshot){ state.board = snapshot; refreshOpenEnds(); }

function advance(){
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players;
  render();
  if(state.currentPlayerIndex !== 0 && !activeLocal()) scheduleCpu();
}

function finishGame(winnerBucket){
  state.gameOver = true;
  state.handOver = true;
  if(turnTextEl) turnTextEl.textContent = scoreBucketName(winnerBucket)+' WINS GAME';
  popCount(scoreBucketName(winnerBucket)+' WINS '+SCORE_TARGET, true);
  log(scoreBucketName(winnerBucket)+' wins the game at '+state.scores[winnerBucket]+'.');
  render();
}

function finishHand(winner){
  state.handOver = true;
  state.nextLeader = winner;
  const winnerBucket = scoreBucket(winner);
  const excluded = new Set(scoreBucketPlayers(winnerBucket));
  const pips = state.hands.reduce((sum,hand,index)=>{
    return excluded.has(index) ? sum : sum + hand.reduce((total,tile)=>total+dominoTotal(tile),0);
  },0);
  const settlement = awardSettlement(winner,pips,'DOMINO');
  if(winner === 0 && window.Play3DPoints) window.Play3DPoints.award('dominoes',125,'round_win');
  if(turnTextEl) turnTextEl.textContent = 'DOMINO — '+scoreBucketName(winnerBucket)+' +'+settlement;
  popCount('DOMINO +'+settlement, true);
  log('DOMINO! '+seatName(winner)+' emptied the hand. Remaining pips: '+pips+'.');
  play3dAnnounce('DOMINO','success','DOMINO.');
  render();
}

function finishBlocked(){
  state.handOver = true;
  const winner = state.hands.reduce((best,hand,index)=>{
    const total = handTotal(index);
    return total < best.total ? {index,total} : best;
  },{index:0,total:Infinity}).index;
  const winnerBucket = scoreBucket(winner);
  const excluded = new Set(scoreBucketPlayers(winnerBucket));
  const pips = state.hands.reduce((sum,hand,index)=>{
    return excluded.has(index) ? sum : sum + hand.reduce((total,tile)=>total+dominoTotal(tile),0);
  },0);
  const settlement = awardSettlement(winner,pips,'BLOCKED');
  state.nextLeader = null;
  if(turnTextEl) turnTextEl.textContent = 'BLOCKED ROUND — '+scoreBucketName(winnerBucket)+' +'+settlement;
  log('Blocked round. '+seatName(winner)+' wins low count. Remaining pips: '+pips+'.');
  play3dAnnounce('BLOCKED','warning');
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
  const startingStock = state.stock.length;
  let drew = 0;
  while(!move && drew < startingStock && state.stock.length){
    hand.push(state.stock.pop());
    drew++;
    move = chooseCpuMove(hand);
  }
  if(move){
    const opening = !hasBoardTiles();
    commitPlay(player,move.tile,move.arm);
    const count = scoreBoardCount(player,opening ? 'opening_lead' : 'play');
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
  const playableBeforeDraw = validPlaySummary(player);
  if(playableBeforeDraw.length){
    log('Play a legal domino if you can.');
    render();
    return;
  }
  if(!state.stock.length){ log('Boneyard empty. Pass.'); return; }
  const startingStock = state.stock.length;
  let drew = 0;
  while(drew < startingStock && state.stock.length && !canPlay(player)){
    const tile = state.stock.pop();
    if(!tile) break;
    state.hands[player].push(tile);
    drew++;
  }
  log(seatName(player)+' drew '+drew+(canPlay(player) ? ' and can play.' : '. Boneyard empty.'));
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
  state.scores = Array.from({length:scoreBucketCount()},(_,i)=>state.scores[i] || 0);
  state.gotIn = Array.from({length:scoreBucketCount()},(_,i)=>Boolean(state.gotIn[i]));
  state.gameOver = false;

  const handLeader = Number.isInteger(state.nextLeader) ? state.nextLeader % state.players : null;
  play3dAnnounce('NEW_GAME','normal','DOMINOES TABLE OPEN.');

  if(handLeader !== null){
    state.currentPlayerIndex = handLeader;
    state.nextLeader = null;
    log(seatName(handLeader)+' leads this hand and may play any domino.');
    render();
    if(state.currentPlayerIndex !== 0 && !activeLocal()) scheduleCpu();
    return;
  }

  const starter = ensureOpeningDouble();
  if(starter){
    placeOpeningDouble(starter.player,starter.tile);
    state.currentPlayerIndex = (starter.player + 1) % state.players;
    log(seatName(starter.player)+' opened with highest double '+starter.tile[0]+'-'+starter.tile[1]+'.');
    play3dAnnounce('SPINNER','elite');
    scoreBoardCount(starter.player,'opening_double');
    if(state.gameOver){ render(); return; }
  }else{
    state.currentPlayerIndex = 0;
    log('No double found. Start manually.');
  }

  render();
  if(state.currentPlayerIndex !== 0 && !activeLocal()) scheduleCpu();
}

function tileHTML(tile,index,cls=''){
  const realTile = placementTile(tile);
  return '<button class="tile '+cls+'" data-i="'+index+'"><span>'+realTile[0]+'</span><i></i><span>'+realTile[1]+'</span></button>';
}

function fitBoardToPlacements(){
  const placements = state.board.placements || [];
  let maxX = 120;
  let maxY = 100;
  placements.forEach(item=>{
    const size = TILE_SIZE[item.orientation || 'horizontal'] || TILE_SIZE.horizontal;
    maxX = Math.max(maxX, Math.abs(item.x || 0) + size.w / 2 + 70);
    maxY = Math.max(maxY, Math.abs(item.y || 0) + size.h / 2 + 70);
  });
  return { width:Math.ceil(maxX * 2), height:Math.ceil(maxY * 2) };
}

function inspectRenderedBoard(){
  const tableCenter = document.querySelector('.table-center');
  if(!tableCenter) return {passed:false,error:'Missing .table-center'};
  const table = tableCenter.getBoundingClientRect();
  const tiles = Array.from(chainEl?.querySelectorAll('.tile.board-tile') || []).map((element,index)=>{
    const rect = element.getBoundingClientRect();
    return {
      index,
      text:element.textContent.trim().replace(/\s+/g,'-'),
      x:rect.x,
      y:rect.y,
      right:rect.right,
      bottom:rect.bottom,
      width:rect.width,
      height:rect.height
    };
  });
  const overlaps = [];
  for(let a=0;a<tiles.length;a++){
    for(let b=a+1;b<tiles.length;b++){
      const overlapX = Math.min(tiles[a].right,tiles[b].right)-Math.max(tiles[a].x,tiles[b].x);
      const overlapY = Math.min(tiles[a].bottom,tiles[b].bottom)-Math.max(tiles[a].y,tiles[b].y);
      if(overlapX > .5 && overlapY > .5) overlaps.push({a,b,overlapX,overlapY});
    }
  }
  const outside = tiles
    .filter(tile=>tile.x < table.x-.5 || tile.y < table.y-.5 || tile.right > table.right+.5 || tile.bottom > table.bottom+.5)
    .map(tile=>tile.index);
  return {
    passed:overlaps.length === 0 && outside.length === 0,
    table:{x:table.x,y:table.y,right:table.right,bottom:table.bottom},
    tiles,
    overlaps,
    outside
  };
}

function renderDebugSpinnerGateScenario(){
  resetBoard();
  state.board.spinnerTile = makeSpinnerPlacement([5,5]);
  const initialEnds = refreshOpenEnds().map(end=>end.arm);
  const topLockedBeforeHorizontal = !legalArms([5,3]).includes('top');
  const leftPlacement = makeBranchPlacement([5,3],'left',5);
  state.board.spinnerArms.left.push(leftPlacement);
  const oneSideEnds = refreshOpenEnds().map(end=>end.arm);
  const topLockedAfterOneSide = !legalArms([5,4]).includes('top');
  const rightPlacement = makeBranchPlacement([5,6],'right',5);
  state.board.spinnerArms.right.push(rightPlacement);
  const horizontalEnds = refreshOpenEnds().map(end=>end.arm);
  const topUnlockedAfterHorizontal = legalArms([5,2]).includes('top');
  renderBoard();
  return Object.assign(inspectRenderedBoard(), {
    initialEnds,
    oneSideEnds,
    horizontalEnds,
    topLockedBeforeHorizontal,
    topLockedAfterOneSide,
    topUnlockedAfterHorizontal,
    passedSpinnerGate: initialEnds.join(',') === 'left,right'
      && oneSideEnds.join(',') === 'left,right'
      && horizontalEnds.includes('top')
      && horizontalEnds.includes('bottom')
      && topLockedBeforeHorizontal
      && topLockedAfterOneSide
      && topUnlockedAfterHorizontal
  });
}

function renderDebugFinalBoneDominoScenario(){
  resetBoard();
  state.players = 2;
  state.scores = [0,0];
  state.gotIn = [true,true];
  state.currentPlayerIndex = 0;
  state.gameOver = false;
  state.handOver = false;
  state.stock = [[0,0],[1,1],[2,2]];
  state.hands = [
    [[2,1]],
    [[2,3],[4,5]]
  ];
  state.board.spinnerTile = makeSpinnerPlacement([6,6]);
  state.board.spinnerArms.left.push(makeBranchPlacement([6,2],'left',6));
  state.board.spinnerArms.right.push(makeBranchPlacement([6,4],'right',6));
  refreshOpenEnds();

  const stockBefore = state.stock.length;
  const handBefore = state.hands[0].length;
  const playableBefore = validPlaySummary(0);
  drawTile();
  const stockAfterBlockedDraw = state.stock.length;
  const handAfterBlockedDraw = state.hands[0].length;
  const blockedDraw = stockAfterBlockedDraw === stockBefore && handAfterBlockedDraw === handBefore;
  const played = playTile(state.hands[0][0],'left');

  return {
    playableBefore: playableBefore.map(item=>({tile:item.tile,arms:item.arms})),
    blockedDraw,
    stockBefore,
    stockAfterBlockedDraw,
    handBefore,
    handAfterBlockedDraw,
    playReturn: played,
    finalHandLength: state.hands[0].length,
    handOver: state.handOver,
    turnText: turnTextEl ? turnTextEl.textContent : '',
    dominoDisplayed: state.handOver && state.hands[0].length === 0,
    noExtraBoneAdded: state.stock.length === stockBefore
  };
}

function renderDebugBottomTurnScenario(){
  resetBoard();
  state.players = 2;
  state.scores = [0,0];
  state.gotIn = [true,true];
  state.currentPlayerIndex = 0;
  state.gameOver = false;
  state.handOver = false;
  state.stock = [];
  state.hands = [[[1,1]], [[2,2]]];
  state.board.spinnerTile = makeSpinnerPlacement([5,5]);
  state.board.spinnerArms.left.push(makeBranchPlacement([5,3],'left',5));
  state.board.spinnerArms.right.push(makeBranchPlacement([5,4],'right',5));
  refreshOpenEnds();

  const sequence = [[5,6],[6,2],[2,1],[1,0],[0,3]];
  const placements = [];
  sequence.forEach(tile=>{
    const end = refreshOpenEnds().find(item=>item.arm === 'bottom');
    if(!end) return;
    const placement = makeBranchPlacement(tile,'bottom',end.value);
    state.board.spinnerArms.bottom.push(placement);
    placements.push(placement);
    refreshOpenEnds();
  });
  renderBoard();
  const rendered = inspectRenderedBoard();
  const turnIndex = placements.findIndex(item=>item.turned);
  const turn = turnIndex >= 0 ? placements[turnIndex] : null;
  const afterTurn = turnIndex >= 0 ? placements[turnIndex+1] : null;
  return Object.assign(rendered, {
    placementSummary:placements.map(item=>({
      tile:item.tile,
      x:item.x,
      y:item.y,
      flowSide:item.flowSide,
      turned:item.turned,
      exposedPip:item.exposedPip
    })),
    bottomRanStraight:placements.slice(0,Math.max(0,turnIndex)).every(item=>item.flowSide === 'bottom' && !item.turned),
    turnIndex,
    turnSide:turn ? turn.flowSide : null,
    turnIsSideways:!!turn && (turn.flowSide === 'right' || turn.flowSide === 'left'),
    afterTurnContinuesSideways:!afterTurn || (afterTurn.flowSide === (turn && turn.flowSide)),
    passedBottomTurn:rendered.passed
      && turnIndex > 0
      && !!turn
      && (turn.flowSide === 'right' || turn.flowSide === 'left')
      && placements.slice(0,turnIndex).every(item=>item.flowSide === 'bottom' && !item.turned)
      && (!afterTurn || afterTurn.flowSide === turn.flowSide)
  });
}

function renderDebugLongRunBranchScenario(){
  resetBoard();
  state.players = 2;
  state.scores = [0,0];
  state.gotIn = [true,true];
  state.currentPlayerIndex = 0;
  state.gameOver = false;
  state.handOver = false;
  state.stock = [];
  state.hands = [[[1,1]], [[2,2]]];
  state.board.spinnerTile = makeSpinnerPlacement([5,5]);
  state.board.spinnerArms.left.push(makeBranchPlacement([5,1],'left',5));
  state.board.spinnerArms.right.push(makeBranchPlacement([5,2],'right',5));
  refreshOpenEnds();

  const sequences = {
    top:[[5,3],[3,4],[4,6],[6,1],[1,2],[2,0]],
    bottom:[[5,6],[6,2],[2,1],[1,0],[0,3],[3,5]],
    left:[[1,3],[3,2],[2,4],[4,0],[0,6],[6,3]],
    right:[[2,4],[4,1],[1,6],[6,0],[0,5],[5,3]]
  };
  const results = {};

  Object.keys(sequences).forEach(arm=>{
    const placements = [];
    sequences[arm].forEach(tile=>{
      const end = refreshOpenEnds().find(item=>item.arm === arm);
      if(!end) return;
      const placement = makeBranchPlacement(tile,arm,end.value);
      state.board.spinnerArms[arm].push(placement);
      placements.push(placement);
      refreshOpenEnds();
    });
    const firstTurnIndex = placements.findIndex(item=>item.turned);
    const consecutiveTurns = placements
      .map((item,index)=>({item,index,previous:placements[index-1]}))
      .filter(entry=>entry.item.turned && entry.previous && entry.previous.turned);
    results[arm] = {
      flow:placements.map(item=>item.flowSide),
      turned:placements.map(item=>!!item.turned),
      points:placements.map(item=>({x:Math.round(item.x || 0),y:Math.round(item.y || 0),flowSide:item.flowSide,turned:!!item.turned})),
      firstTurnIndex,
      consecutiveTurnCount:consecutiveTurns.length,
      longRunBeforeTurn:firstTurnIndex < 0 || firstTurnIndex >= 3,
      noBoxFormation:consecutiveTurns.length === 0
    };
  });

  renderBoard();
  const rendered = inspectRenderedBoard();
  return Object.assign(rendered, {
    results,
    passedLongRun:rendered.passed && Object.keys(results).every(arm=>{
      return results[arm].longRunBeforeTurn && results[arm].noBoxFormation;
    })
  });
}

function renderDebugSettlementRoundingTest(){
  return {
    samples:{12:roundSettlementPips(12),13:roundSettlementPips(13),47:roundSettlementPips(47),53:roundSettlementPips(53)},
    exactOpenEndStillExact: scoreFromCount(13) === 0 && scoreFromCount(15) === 15,
    passed: roundSettlementPips(12) === 10
      && roundSettlementPips(13) === 15
      && roundSettlementPips(47) === 45
      && roundSettlementPips(53) === 55
      && scoreFromCount(13) === 0
      && scoreFromCount(15) === 15
  };
}

function renderedTileCount(){
  return chainEl ? chainEl.querySelectorAll('.tile.board-tile').length : 0;
}

function renderDebugNewHandResetScenario(){
  const savedMode = mode;
  mode = 'local';
  if(cpuTimer){ clearTimeout(cpuTimer); cpuTimer = null; }

  resetBoard();
  state.players = 2;
  state.scores = [25,35];
  state.gotIn = [true,true];
  state.currentPlayerIndex = 0;
  state.gameOver = false;
  state.handOver = false;
  state.stock = [];
  state.hands = [[[0,0]], [[1,1]]];
  state.board.spinnerTile = makeSpinnerPlacement([6,6]);
  state.board.spinnerArms.left.push(makeBranchPlacement([6,1],'left',6));
  state.board.spinnerArms.right.push(makeBranchPlacement([6,2],'right',6));
  state.board.spinnerArms.top.push(makeBranchPlacement([6,3],'top',6));
  state.board.spinnerArms.bottom.push(makeBranchPlacement([6,4],'bottom',6));
  refreshOpenEnds();
  renderBoard();

  const staleTileCount = renderedTileCount();
  const stalePlacementCount = state.board.placements.length;
  const scoresBefore = state.scores.slice();

  state.nextLeader = 0;
  newGame(2);

  const afterNewHandTileCount = renderedTileCount();
  const afterNewHandBoardClear = !state.board.spinnerTile
    && !state.board.openEnds.length
    && !state.board.placements.length
    && Object.keys(state.board.spinnerArms).every(arm=>!state.board.spinnerArms[arm].length);
  const scoresKept = state.scores[0] === scoresBefore[0] && state.scores[1] === scoresBefore[1];

  state.currentPlayerIndex = 0;
  state.handOver = false;
  state.gameOver = false;
  state.passes = 0;
  state.pending = null;
  state.stock = [];
  state.hands = [
    [[5,5],[5,3],[5,4],[5,6],[6,2],[2,1],[1,0],[0,3],[3,2],[2,4],[4,1]],
    [[0,0]]
  ];

  const firstTile = state.hands[0][0];
  const firstPlayOk = commitPlay(0,firstTile,'open');
  renderBoard();
  const firstTileCount = renderedTileCount();
  const firstTileRendered = inspectRenderedBoard();

  const arms = ['left','right','bottom','bottom','bottom','bottom','bottom','bottom','bottom','bottom'];
  const moveResults = [];
  arms.forEach((arm,index)=>{
    const tile = state.hands[0][0];
    if(!tile) return;
    const ok = commitPlay(0,tile,arm);
    renderBoard();
    const rendered = inspectRenderedBoard();
    moveResults.push({
      move:index+1,
      arm,
      ok,
      tileCount:renderedTileCount(),
      passed:rendered.passed,
      overlaps:rendered.overlaps.length,
      outside:rendered.outside.slice()
    });
  });

  mode = savedMode;
  return {
    staleTileCount,
    stalePlacementCount,
    afterNewHandTileCount,
    afterNewHandBoardClear,
    scoresBefore,
    scoresAfter:state.scores.slice(),
    scoresKept,
    firstPlayOk,
    firstTileCount,
    firstTileAlone:firstTileCount === 1,
    firstTileRenderedPassed:firstTileRendered.passed,
    moveResults,
    noSecondHandOverlap:moveResults.every(result=>result.passed && result.overlaps === 0 && result.outside.length === 0),
    noStaleCoordinates:afterNewHandTileCount === 0 && afterNewHandBoardClear,
    passed:staleTileCount > 0
      && stalePlacementCount > 0
      && afterNewHandTileCount === 0
      && afterNewHandBoardClear
      && scoresKept
      && firstPlayOk
      && firstTileCount === 1
      && firstTileRendered.passed
      && moveResults.every(result=>result.passed && result.overlaps === 0 && result.outside.length === 0)
  };
}

function boardTileHTML(placement,index){
  const tile = placementTile(placement);
  const cls = [
    'board-tile',
    placement.orientation || 'horizontal',
    placement.branch ? placement.branch+'-arm' : '',
    placement.turned ? 'domino-bent-end' : '',
    placement.double ? 'double' : '',
    placement.spinner ? 'spinner' : ''
  ].filter(Boolean).join(' ');
  const style = '--x:'+Math.round(placement.x || 0)+'px;--y:'+Math.round(placement.y || 0)+'px;';
  return '<button class="tile '+cls+'" style="'+style+'" data-i="'+index+'"><span>'+tile[0]+'</span><i></i><span>'+tile[1]+'</span></button>';
}
function backs(count){ return Array.from({length:count},()=>'<span class="tile-back"></span>').join(''); }

function renderBoard(){
  if(!chainEl) return;
  refreshPlacements();
  if(state.board.placements.length){
    chainEl.className = 'chain tree-board';
    chainEl.removeAttribute('style');
    chainEl.innerHTML = state.board.placements.map(boardTileHTML).join('');
    const bounds = fitBoardToPlacements();
    const tableCenter = document.querySelector('.table-center');
    const availableWidth = Math.max(220,(tableCenter?.clientWidth || 900) - 36);
    const availableHeight = Math.max(180,(tableCenter?.clientHeight || 620) - 36);
    const scale = Math.min(1,availableWidth / bounds.width,availableHeight / bounds.height);
    const boardScale = Math.max(.1,scale);
    chainEl.style.setProperty('--board-scale',String(boardScale));
    chainEl.style.setProperty('transform','translate(-50%,-50%) scale('+boardScale+')','important');
    chainEl.style.setProperty('transform-origin','center center','important');
  }else{
    chainEl.className = 'chain';
    chainEl.removeAttribute('style');
    chainEl.innerHTML = '';
  }
}

if(DEBUG){
  window.Play3DDominoesRenderedAudit = inspectRenderedBoard;
  window.Play3DDominoesRenderSpinnerGateTest = renderDebugSpinnerGateScenario;
  window.Play3DDominoesFinalBoneTest = renderDebugFinalBoneDominoScenario;
  window.Play3DDominoesBottomTurnTest = renderDebugBottomTurnScenario;
  window.Play3DDominoesSettlementRoundingTest = renderDebugSettlementRoundingTest;
  window.Play3DDominoesNewHandResetTest = renderDebugNewHandResetScenario;
  window.Play3DDominoesLongRunBranchTest = renderDebugLongRunBranchScenario;
}

function render(){
  refreshOpenEnds();
  renderBoard();
  updateOpenEndDebug();
  const visible = state.currentPlayerIndex === 0 || activeLocal() ? state.currentPlayerIndex : 0;
  const hand = state.hands[visible] || [];

  if(handEl){
    handEl.innerHTML = hand.map((tile,i)=>tileHTML(tile,i,legal(tile)?'':'disabled')).join('');
    document.querySelectorAll('#hand .tile').forEach(btn=>{
      btn.onclick = ()=>requestArm(hand[Number(btn.dataset.i)]);
    });
  }

  if(scoreTextEl){
    scoreTextEl.textContent = state.scores.slice(0,scoreBucketCount()).map((score,i)=>scoreBucketName(i)+': '+score+(state.gotIn[i]?'':' (need 10)')).join(' / ');
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
  if(drawBtnEl){
    const drawPlayer = state.currentPlayerIndex;
    const drawAllowedForTurn = drawPlayer === 0 || activeLocal();
    drawBtnEl.disabled = !drawAllowedForTurn || state.handOver || state.gameOver || !state.stock.length || canPlay(drawPlayer);
  }
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
  state.nextLeader = null;
  newGame(state.players);
};
if(drawBtnEl) drawBtnEl.onclick = drawTile;
if(passBtnEl) passBtnEl.onclick = passTurn;

document.querySelectorAll('.playerCountBtn').forEach(btn=>btn.onclick=()=>{
  state.scores = [];
  state.gotIn = [];
  state.nextLeader = null;
  newGame(Number(btn.dataset.count));
});
window.addEventListener('play3d:modechange',event=>{
  mode = event.detail.mode;
  state.scores = [];
  state.gotIn = [];
  state.nextLeader = null;
  newGame(mode === 'cpu' ? 2 : 4);
});

newGame(2);
})();
