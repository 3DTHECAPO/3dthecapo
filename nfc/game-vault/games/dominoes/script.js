(()=>{
'use strict';

/*
  PLAY 3D Dominoes — clean game script
  Rules fixed:
  - Match exposed ends.
  - Draw from boneyard until playable; pass only if boneyard empty.
  - Points during hand only when exposed board count is multiple of 5.
  - First scoring count must be 10+ to get in.
  - Doubles exposed at an end count both sides.
  - Starter double stays counted as its whole value; active branch tips add to it.
  - Hand ends on DOMINO or block; match continues to 150.
  - After each hand, use WASH THE BONES to deal the next hand.
  - Last player to domino starts next hand and can lay any bone.
*/

const state={
  players:2,
  hands:[],
  scores:[],
  gotIn:[],
  currentPlayerIndex:0,
  stock:[],
  passes:0,
  pending:null,
  handOver:false,
  matchOver:false,
  lastHandLabel:'',
  handNumber:0,
  nextStarterIndex:null,
  lastWinnerIndex:null,
  lastBoardTotal:0,
  lastPointsAwarded:0,
  lastScoreNote:'Need 10 to get in.',
  board:{
    starter:null,
    canBranch:false,
    arms:{left:[],right:[],top:[],bottom:[]}
  }
};

let mode=window.Play3DModeBar?window.Play3DModeBar.getMode():'cpu';

const chainEl=document.getElementById('chain');
const handEl=document.getElementById('hand');
const armChooser=document.getElementById('armChooser');
const newBtnEl=document.getElementById('newBtn');
const drawBtnEl=document.getElementById('drawBtn');
const passBtnEl=document.getElementById('passBtn');
const scoreTextEl=document.getElementById('scoreText');
const turnTextEl=document.getElementById('turnText');
const logEl=document.getElementById('log');

const SCORE_TARGET=150;
const GET_IN_MIN=10;

let washBtnEl=document.getElementById('washBtn');
if(!washBtnEl){
  washBtnEl=document.createElement('button');
  washBtnEl.id='washBtn';
  washBtnEl.type='button';
  washBtnEl.textContent='WASH THE BONES';
  washBtnEl.hidden=true;
  if(passBtnEl && passBtnEl.parentNode) passBtnEl.parentNode.insertBefore(washBtnEl, passBtnEl.nextSibling);
}

function thinkDelay(){return 450+Math.floor(Math.random()*900)}
function seatName(i){return ['Player 1','Player 2','Player 3','Player 4'][i]||'Player'}
function isDouble(tile){return tile&&tile[0]===tile[1]}
function handSize(){return 7}
function activeLocal(){return mode==='local'||mode==='fan'}
function hasBoardTiles(){return !!state.board.starter}
function resetBoard(){
  state.board={starter:null,canBranch:false,arms:{left:[],right:[],top:[],bottom:[]}};
  state.lastBoardTotal=0;
  state.lastPointsAwarded=0;
  state.lastScoreNote='Need 10 to get in.';
}
function buildStock(){
  state.stock=[];
  for(let a=0;a<=6;a++) for(let b=a;b<=6;b++) state.stock.push([a,b]);
  state.stock.sort(()=>Math.random()-.5);
}
function tileKey(tile){return tile ? tile[0]+'-'+tile[1] : ''}
function doubleValue(tile){return isDouble(tile)?tile[0]:-1}
function findHighestDouble(){
  let best=null;
  state.hands.forEach((hand,playerIndex)=>hand.forEach(tile=>{
    if(isDouble(tile)&&(!best||doubleValue(tile)>doubleValue(best.tile))) best={playerIndex,tile};
  }));
  return best;
}
function removeTile(hand,tile){
  const index=hand.indexOf(tile);
  if(index>=0) hand.splice(index,1);
}
function splitByMatch(tile,match){
  return tile[0]===match ? {match:tile[0],outside:tile[1]} : {match:tile[1],outside:tile[0]};
}
function outerValue(tile,arm){
  // Tiles are oriented so left/top outside is tile[0], right/bottom outside is tile[1].
  return (arm==='left'||arm==='top') ? tile[0] : tile[1];
}
function orientForArm(tile,match,arm){
  const parts=splitByMatch(tile,match);
  return (arm==='left'||arm==='top') ? [parts.outside,parts.match] : [parts.match,parts.outside];
}
function exposedValue(tile,arm){
  if(!tile) return 0;
  if(isDouble(tile)) return tile[0]+tile[1];
  return outerValue(tile,arm);
}
function activeArmNames(){
  if(!hasBoardTiles()) return [];
  return state.board.canBranch ? ['left','right','top','bottom'] : ['left','right'];
}
function baseValueForArm(arm){
  const starter=state.board.starter;
  if(!starter) return null;
  if(state.board.canBranch && isDouble(starter)) return starter[0];
  return arm==='left' ? starter[0] : starter[1];
}
function openEndObjects(){
  if(!hasBoardTiles()) return [];
  return activeArmNames().map(arm=>{
    const list=state.board.arms[arm]||[];
    return {
      arm,
      value:list.length ? outerValue(list[list.length-1],arm) : baseValueForArm(arm),
      active:list.length>0
    };
  });
}
function boardEndTotal(){
  const starter=state.board.starter;
  if(!starter) return 0;

  const arms=state.board.arms;
  const activeArms=activeArmNames().filter(arm=>(arms[arm]||[]).length);
  let total=0;

  if(state.board.canBranch && isDouble(starter)){
    // In this ruleset, the original spinner/starter double stays counted whole.
    // Active branch tips add their exposed outside value. Empty arms are NOT counted.
    total += starter[0]+starter[1];
    activeArms.forEach(arm=>{
      const tip=arms[arm][arms[arm].length-1];
      total += exposedValue(tip,arm);
    });
    return total;
  }

  // Non-double starter: count each actual exposed side.
  ['left','right'].forEach(arm=>{
    const branch=arms[arm]||[];
    if(branch.length){
      total += exposedValue(branch[branch.length-1],arm);
    }else{
      total += arm==='left' ? starter[0] : starter[1];
    }
  });
  return total;
}
function scoringPointsForTotal(total){
  return total>0 && total%5===0 ? total : 0;
}
function updateBoardTotal(){
  state.lastBoardTotal=boardEndTotal();
  return state.lastBoardTotal;
}
function showCountPopup(message,score=false){
  let popup=document.getElementById('countPopup');
  if(!popup){
    popup=document.createElement('div');
    popup.id='countPopup';
    popup.className='count-popup';
    document.body.appendChild(popup);
  }
  popup.textContent=message;
  popup.classList.toggle('score',!!score);
  popup.classList.remove('show');
  void popup.offsetWidth;
  popup.classList.add('show');
  setTimeout(()=>popup.classList.remove('show'),1800);
}
function awardBoardScore(playerIndex,allowFirstPlay=true){
  const total=updateBoardTotal();
  const points=scoringPointsForTotal(total);
  state.lastPointsAwarded=0;

  if(!points){
    state.lastScoreNote='COUNT '+total+' — no score.';
    log(state.lastScoreNote);
    if(total>=5) showCountPopup('COUNT '+total+' — NO SCORE',false);
    return 0;
  }

  if(!state.gotIn[playerIndex] && points<GET_IN_MIN){
    state.lastScoreNote='COUNT '+points+' — '+seatName(playerIndex)+' needs 10 to get in.';
    log(state.lastScoreNote);
    showCountPopup('COUNT '+points+' — NEED 10 TO GET IN',false);
    return 0;
  }

  state.gotIn[playerIndex]=true;
  state.scores[playerIndex]+=points;
  state.lastPointsAwarded=points;
  state.lastScoreNote=seatName(playerIndex)+' SCORED '+points+' — count '+total+'.';
  log(state.lastScoreNote);
  showCountPopup('+'+points+' COUNT',true);
  return points;
}

function legalArms(tile){
  if(!hasBoardTiles()) return ['open'];
  return openEndObjects()
    .filter(end=>tile[0]===end.value || tile[1]===end.value)
    .map(end=>end.arm);
}
function legal(tile){return legalArms(tile).length>0}
function canPlay(playerIndex){return (state.hands[playerIndex]||[]).some(legal)}
function handPips(playerIndex){return (state.hands[playerIndex]||[]).reduce((sum,tile)=>sum+tile[0]+tile[1],0)}

function placeOnArm(tile,arm){
  if(arm==='open' && !state.board.starter){
    state.board.starter=tile;
    state.board.canBranch=isDouble(tile);
    updateBoardTotal();
    return true;
  }
  if(arm==='open' || !state.board.starter) return false;
  const end=openEndObjects().find(item=>item.arm===arm);
  if(!end || (tile[0]!==end.value && tile[1]!==end.value)) return false;
  state.board.arms[arm].push(orientForArm(tile,end.value,arm));
  updateBoardTotal();
  return true;
}
function commitPlay(playerIndex,tile,arm){
  if(!placeOnArm(tile,arm)) return false;
  removeTile(state.hands[playerIndex],tile);
  state.passes=0;
  state.pending=null;
  armChooser.hidden=true;
  armChooser.innerHTML='';
  return true;
}
function requestArm(tile){
  if(state.handOver||state.matchOver) return;
  const arms=legalArms(tile);
  if(!arms.length){log('Illegal tile.');return}
  if(arms.length===1){playTile(tile,arms[0]);return}
  state.pending={tile};
  armChooser.hidden=false;
  armChooser.innerHTML='<span>Choose arm</span>'+arms.map(arm=>'<button type="button" data-arm="'+arm+'">'+arm+'</button>').join('');
}
function playTile(tile,arm){
  const player=state.currentPlayerIndex;
  if(player!==0&&!activeLocal()) return;
  if(!commitPlay(player,tile,arm)){log('Illegal tile.');return}
  log(seatName(player)+' played '+tileKey(tile)+' on '+arm+'.');
  awardBoardScore(player,true);
  if(!state.hands[player].length){finish(player);return}
  advance();
}
function chooseCpuMove(hand){
  let best=null;
  for(const tile of hand){
    const arms=legalArms(tile);
    if(!arms.length) continue;
    for(const arm of arms){
      // Quick scoring preference without mutating board.
      best=best||{tile,arm};
      if(arm==='top'||arm==='bottom') return {tile,arm};
    }
  }
  return best;
}
function advance(){
  state.currentPlayerIndex=(state.currentPlayerIndex+1)%state.players;
  render();
  if(state.currentPlayerIndex!==0&&!activeLocal()) scheduleCpu();
}
function lowestPipWinner(){
  const totals=state.hands.map((_,playerIndex)=>handPips(playerIndex));
  const lowest=Math.min(...totals);
  const leaders=totals.map((pips,playerIndex)=>({pips,playerIndex})).filter(item=>item.pips===lowest);
  return leaders.length===1 ? leaders[0].playerIndex : null;
}
function endHand(label,winner,domino=false){
  state.handOver=true;
  state.lastWinnerIndex=winner;
  if(winner!==null && winner!==undefined){
    state.nextStarterIndex=winner;
    if(domino){
      const washers=Array.from({length:state.players},(_,i)=>i).filter(i=>i!==winner).map(seatName).join(', ');
      log(seatName(winner)+' dominoed. '+washers+' must wash the bones.');
    }
  }

  if(winner===0&&window.Play3DPoints) window.Play3DPoints.award('dominoes',125,'round_win');

  const maxScore=Math.max(...state.scores);
  if(maxScore>=SCORE_TARGET){
    const champ=state.scores.indexOf(maxScore);
    state.matchOver=true;
    state.lastHandLabel=seatName(champ)+' WINS THE MATCH TO '+SCORE_TARGET;
    washBtnEl.hidden=true;
    showCountPopup('MATCH OVER — '+seatName(champ)+' WINS',true);
  }else{
    state.lastHandLabel=label+' — WASH THE BONES';
    washBtnEl.hidden=false;
  }

  turnTextEl.textContent=scoreStatusText(state.lastHandLabel);
  render();
}
function finish(winner){
  log('DOMINO! '+seatName(winner)+' played the last bone.');
  showCountPopup('DOMINO!',true);
  endHand('DOMINO — '+seatName(winner)+' WINS HAND',winner,true);
}
function scheduleCpu(){
  if(state.handOver||state.matchOver) return;
  turnTextEl.textContent=scoreStatusText('OPPONENT THINKING...');
  setTimeout(cpuTurn,thinkDelay());
}
function cpuTurn(){
  const player=state.currentPlayerIndex;
  if(player===0||activeLocal()||state.handOver||state.matchOver) return;
  const hand=state.hands[player];
  let move=chooseCpuMove(hand);

  while(!move && state.stock.length){
    hand.push(state.stock.pop());
    log(seatName(player)+' drew.');
    move=chooseCpuMove(hand);
  }

  if(move){
    commitPlay(player,move.tile,move.arm);
    log(seatName(player)+' played '+tileKey(move.tile)+' on '+move.arm+'.');
    awardBoardScore(player,true);
  }else{
    state.passes++;
    log(seatName(player)+' passed.');
  }

  if(!hand.length){finish(player);return}
  if(state.passes>=state.players){
    const winner=lowestPipWinner();
    endHand(winner===null?'BLOCKED HAND — TIE':'BLOCKED HAND — '+seatName(winner)+' WINS',winner,false);
    return;
  }
  advance();
}
function drawUntilPlayable(player){
  let drew=0;
  while(!canPlay(player)&&state.stock.length){
    state.hands[player].push(state.stock.pop());
    drew++;
  }
  return drew;
}
function drawTile(){
  const player=state.currentPlayerIndex;
  if(player!==0&&!activeLocal()) return;
  if(state.handOver||state.matchOver) return;
  if(canPlay(player)){log('You have a playable domino.');return}
  const drew=drawUntilPlayable(player);
  if(drew) log(seatName(player)+' drew '+drew+' from the boneyard.');
  else log('Boneyard empty. Pass if you still cannot play.');
  render();
}
function passTurn(){
  const player=state.currentPlayerIndex;
  if(player!==0&&!activeLocal()) return;
  if(state.handOver||state.matchOver) return;
  if(canPlay(player)){log('Play a legal tile if you can.');return}
  if(state.stock.length){log('Draw from the boneyard before passing.');return}
  state.passes++;
  log(seatName(player)+' passed.');
  if(state.passes>=state.players){
    const winner=lowestPipWinner();
    endHand(winner===null?'BLOCKED HAND — TIE':'BLOCKED HAND — '+seatName(winner)+' WINS',winner,false);
    return;
  }
  advance();
}

function startWithHighestDouble(){
  const starter=findHighestDouble();
  if(!starter) return false;
  state.currentPlayerIndex=starter.playerIndex;
  commitPlay(starter.playerIndex,starter.tile,'open');
  log(seatName(starter.playerIndex)+' opened with spinner '+tileKey(starter.tile)+'.');
  awardBoardScore(starter.playerIndex,true);
  if(!state.hands[starter.playerIndex].length){finish(starter.playerIndex);return true}
  state.currentPlayerIndex=(starter.playerIndex+1)%state.players;
  return true;
}
function dealHand(starterIndex,resetBoardOnly=true){
  do{
    buildStock();
    resetBoard();
    state.hands=Array.from({length:state.players},()=>state.stock.splice(0,handSize()));
  }while(starterIndex===null && !findHighestDouble());

  state.passes=0;
  state.pending=null;
  state.handOver=false;
  state.matchOver=false;
  state.lastHandLabel='';
  state.lastPointsAwarded=0;
  armChooser.hidden=true;
  armChooser.innerHTML='';
  washBtnEl.hidden=true;

  if(starterIndex===null || starterIndex===undefined){
    startWithHighestDouble();
  }else{
    state.currentPlayerIndex=starterIndex;
    log(seatName(starterIndex)+' comes out first and can lay any bone.');
  }

  state.handNumber++;
  render();
  if(state.currentPlayerIndex!==0&&!activeLocal()) scheduleCpu();
}
function newGame(players,resetMatch=true){
  mode=window.Play3DModeBar?window.Play3DModeBar.getMode():mode;
  const nextPlayerCount=Math.max(2,Math.min(4,Number(players)||state.players||2));
  state.players=nextPlayerCount;
  state.scores=Array.from({length:state.players},()=>0);
  state.gotIn=Array.from({length:state.players},()=>false);
  state.handNumber=0;
  state.nextStarterIndex=null;
  state.lastWinnerIndex=null;
  log(state.players+' player dominoes started. Game goes to '+SCORE_TARGET+'. First count must be 10+ to get in.');
  dealHand(null);
}
function washTheBones(){
  if(!state.handOver || state.matchOver) return;
  const starter=(state.nextStarterIndex===null||state.nextStarterIndex===undefined)?0:state.nextStarterIndex;
  const washers=Array.from({length:state.players},(_,i)=>i).filter(i=>i!==starter).map(seatName).join(', ');
  log(washers+' washed the bones. '+seatName(starter)+' comes out.');
  dealHand(starter);
}

function tileHTML(tile,index,cls){
  return `<button class="tile ${cls||''}" data-i="${index}"><span>${tile[0]}</span><i></i><span>${tile[1]}</span></button>`;
}
function backs(count){return Array.from({length:count},()=>'<span class="tile-back"></span>').join('')}
function renderBoard(){
  if(!chainEl) return;
  const arm=side=>state.board.arms[side].map((tile,i)=>tileHTML(tile,i,'branch '+side+'-arm '+(isDouble(tile)?'double':''))).join('');
  chainEl.className='chain spinner-board';
  if(!state.board.starter){
    chainEl.innerHTML='<div class="empty-board">Wash the bones and start the next hand.</div>';
    return;
  }
  chainEl.innerHTML=
    '<div class="branch-line top-branch">'+arm('top')+'</div>'+
    '<div class="line-row">'+
      '<div class="horizontal-arm left-branch">'+arm('left')+'</div>'+
      tileHTML(state.board.starter,0,state.board.canBranch?'spinner starter':'starter')+
      '<div class="horizontal-arm right-branch">'+arm('right')+'</div>'+
    '</div>'+
    '<div class="branch-line bottom-branch">'+arm('bottom')+'</div>';
}
function scoreStatusText(base){
  const player=state.currentPlayerIndex;
  const getIn=state.gotIn[player]?'IN':'NEEDS 10 TO GET IN';
  return base+' | Count: '+state.lastBoardTotal+' | Awarded: '+state.lastPointsAwarded+' | '+seatName(player)+': '+getIn;
}
function render(){
  updateBoardTotal();
  renderBoard();

  const visible=state.currentPlayerIndex===0||activeLocal()?state.currentPlayerIndex:0;
  const hand=state.hands[visible]||[];
  if(handEl){
    handEl.innerHTML=hand.map((tile,i)=>tileHTML(tile,i,legal(tile)?'':'disabled')).join('');
    document.querySelectorAll('#hand .tile').forEach(btn=>btn.onclick=()=>requestArm(hand[+btn.dataset.i]));
  }

  if(scoreTextEl){
    scoreTextEl.textContent=state.scores.slice(0,state.players).map((score,i)=>seatName(i)+': '+score+(state.gotIn[i]?'':' (need 10)')).join(' / ');
  }

  if(turnTextEl){
    if(state.handOver||state.matchOver) turnTextEl.textContent=scoreStatusText(state.lastHandLabel);
    else if(!turnTextEl.textContent.startsWith('OPPONENT THINKING')) turnTextEl.textContent=scoreStatusText(seatName(state.currentPlayerIndex)+' TURN');
  }

  [['.bottom-seat',0],['.top-seat',1],['.left-seat',2],['.right-seat',3]].forEach(([sel,i])=>{
    const el=document.querySelector(sel); if(!el) return;
    el.innerHTML=i<state.players
      ? '<b>'+seatName(i)+'</b><small>'+((state.hands[i]||[]).length)+' tiles</small><small>'+state.scores[i]+' pts '+(state.gotIn[i]?'IN':'NEEDS 10')+'</small><div class="seat-backs">'+backs(Math.min(7,(state.hands[i]||[]).length))+'</div>'
      : '';
  });

  document.querySelectorAll('.playerCountBtn').forEach(btn=>btn.classList.toggle('active',Number(btn.dataset.count)===state.players));
  if(drawBtnEl) drawBtnEl.disabled=state.handOver||state.matchOver;
  if(passBtnEl) passBtnEl.disabled=state.handOver||state.matchOver;
}
function log(msg){
  if(logEl) logEl.innerHTML='<li>'+msg+'</li>'+logEl.innerHTML;
  console.log('[DOMINOES]',msg);
}

armChooser.addEventListener('click',e=>{
  const btn=e.target.closest('[data-arm]');
  if(btn&&state.pending) playTile(state.pending.tile,btn.dataset.arm);
});
if(newBtnEl) newBtnEl.onclick=()=>newGame(state.players,true);
if(drawBtnEl) drawBtnEl.onclick=drawTile;
if(passBtnEl) passBtnEl.onclick=passTurn;
if(washBtnEl) washBtnEl.onclick=washTheBones;
document.querySelectorAll('.playerCountBtn').forEach(btn=>btn.onclick=()=>newGame(Number(btn.dataset.count),true));
window.addEventListener('play3d:modechange',event=>{
  mode=event.detail.mode;
  newGame(mode==='cpu'?2:4,true);
});

newGame(2,true);
})();