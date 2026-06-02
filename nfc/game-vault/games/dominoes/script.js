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
const BOARD_LIMITS = {x:340,y:240};
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

function resetBoard(){
  state.board = {spinnerTile:null, spinnerArms:{left:[],right:[],top:[],bottom:[]}, openEnds:[], placements:[]};
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
  return ['left','right','top','bottom'];
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
  const turnClearance = turned ? axisSpan(orientation,anchorFlow) / 2 : 0;

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
  const clockwise = BRANCH_TURNS[flowSide] || arm;
  const counterClockwise = BRANCH_REVERSE_TURNS[flowSide] || arm;
  const reverse = BRANCH_TURNS[clockwise] || arm;
  const candidates = [flowSide,clockwise,counterClockwise,reverse]
    .filter((side,index,list)=>list.indexOf(side)===index)
    .map(side=>buildBranchPlacement(rawTile,arm,match,anchor,side));
  const clean = candidates.find(item=>!placementOutsideTable(item)&&!placementCollides(item,anchor));
  return clean || candidates.sort((a,b)=>placementPenalty(a,anchor)-placementPenalty(b,anchor))[0];
}

function placementOutsideTable(item){
  const size = TILE_SIZE[item.orientation || 'horizontal'] || TILE_SIZE.horizontal;
  return Math.abs(item.x || 0) + size.w / 2 > BOARD_LIMITS.x
    || Math.abs(item.y || 0) + size.h / 2 > BOARD_LIMITS.y;
}

function placementPenalty(item,anchor){
  const size = TILE_SIZE[item.orientation || 'horizontal'] || TILE_SIZE.horizontal;
  const overflowX = Math.max(0,Math.abs(item.x || 0) + size.w / 2 - BOARD_LIMITS.x);
  const overflowY = Math.max(0,Math.abs(item.y || 0) + size.h / 2 - BOARD_LIMITS.y);
  return (overflowX+overflowY)*1000 + placementCollisionCount(item,anchor)*100000;
}

function placementCollisionCount(item,anchor){
  return (state.board.placements || []).filter(existing=>{
    if(existing===anchor)return false;
    return placementsOverlap(item,existing);
  }).length;
}

function placementCollides(item,anchor){
  return placementCollisionCount(item,anchor)>0;
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
  const points = scoreFromCount(pips);
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
  log(scoreBucketName(bucket)+' scored '+points+' from '+reason+'.');
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
  state.nextLeader = null;
  if(turnTextEl) turnTextEl.textContent = 'BLOCKED ROUND ? WASH THE DISHES';
  log('Blocked round. '+seatName(winner)+' wins low count. Next hand starts by highest available double.');
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
  if(!move && state.stock.length){
    hand.push(state.stock.pop());
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
  if(canPlay(player)){ log('Play a legal domino if you can.'); return; }
  if(!state.stock.length){ log('Boneyard empty. Pass.'); return; }
  state.hands[player].push(state.stock.pop());
  log(seatName(player)+' drew one domino.');
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
    chainEl.style.setProperty('--board-scale',String(Math.max(.34,scale)));
  }else{
    chainEl.className = 'chain';
    chainEl.removeAttribute('style');
    chainEl.innerHTML = '';
  }
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
