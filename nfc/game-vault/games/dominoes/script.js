(()=>{
'use strict';

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
  lastHandLabel:'',
  handNumber:0,
  nextStarterIndex:null,
  roundWinner:null,
  forcedOpening:true,
  lastBoardTotal:0,
  lastPointsAwarded:0,
  lastScoreNote:'Need 10 to get in.',
  board:{
    spinnerTile:null,
    canBranch:false,
    spinnerArms:{left:[],right:[],top:[],bottom:[]},
    armScoreValues:{left:null,right:null,top:null,bottom:null},
    openEnds:[]
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
const controlsEl=document.querySelector('.controls');

const SCORE_TARGET=150;
const GET_IN_MIN=10;

function thinkDelay(){return 400+Math.floor(Math.random()*700)}
function seatName(i){return ['Player 1','Player 2','Player 3','Player 4'][i]||'Player'}
function isDouble(tile){return tile && tile[0]===tile[1]}
function tileSum(tile){return tile ? Number(tile[0]||0)+Number(tile[1]||0) : 0}
function handSize(){return 7}
function activeLocal(){return mode==='local'||mode==='fan'}

function ensureWashButton(){
  if(!controlsEl || document.getElementById('washBtn')) return;
  const btn=document.createElement('button');
  btn.id='washBtn';
  btn.type='button';
  btn.textContent='WASH THE DISHES';
  btn.style.display='none';
  btn.onclick=washTheDishes;
  controlsEl.appendChild(btn);
}

function getWashBtn(){
  ensureWashButton();
  return document.getElementById('washBtn');
}

function showWashButton(show){
  const btn=getWashBtn();
  if(btn) btn.style.display=show?'inline-flex':'none';
}

function resetBoard(){
  state.board={spinnerTile:null,canBranch:false,spinnerArms:{left:[],right:[],top:[],bottom:[]},armScoreValues:{left:null,right:null,top:null,bottom:null},openEnds:[]};
  state.lastBoardTotal=0;
  state.lastPointsAwarded=0;
  state.lastScoreNote='Need 10 to get in.';
}

function buildStock(){
  state.stock=[];
  for(let a=0;a<=6;a++) for(let b=a;b<=6;b++) state.stock.push([a,b]);
  state.stock.sort(()=>Math.random()-.5);
}

function hasBoardTiles(){return !!state.board.spinnerTile}
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

function startWithHighestDouble(){
  const starter=findHighestDouble();
  if(!starter) return false;
  state.board.spinnerTile=starter.tile;
  state.board.canBranch=true;
  removeTile(state.hands[starter.playerIndex],starter.tile);
  refreshOpenEnds();
  updateBoardTotal();
  state.currentPlayerIndex=(starter.playerIndex+1)%state.players;
  log(seatName(starter.playerIndex)+' opened with spinner '+starter.tile[0]+'-'+starter.tile[1]+'. No entry points awarded on forced opener.');
  return true;
}

function dealHands(){
  do{
    buildStock();
    resetBoard();
    state.hands=Array.from({length:state.players},()=>state.stock.splice(0,handSize()));
  }while(state.handNumber===0 && !findHighestDouble());
}

function newGame(players,resetMatch){
  mode=window.Play3DModeBar?window.Play3DModeBar.getMode():mode;
  const nextPlayerCount=Math.max(2,Math.min(4,Number(players)||state.players||2));
  const playerCountChanged=nextPlayerCount!==state.players;
  state.players=nextPlayerCount;

  if(resetMatch||playerCountChanged){
    state.scores=Array.from({length:state.players},()=>0);
    state.gotIn=Array.from({length:state.players},()=>false);
    state.handNumber=0;
    state.nextStarterIndex=null;
    state.roundWinner=null;
  }

  dealHands();

  state.scores=Array.from({length:state.players},(_,i)=>state.scores[i]||0);
  state.gotIn=Array.from({length:state.players},(_,i)=>Boolean(state.gotIn[i]));
  state.currentPlayerIndex=0;
  state.passes=0;
  state.pending=null;
  state.handOver=false;
  state.lastHandLabel='';
  state.roundWinner=null;
  state.forcedOpening=state.handNumber===0 || state.nextStarterIndex===null;
  armChooser.hidden=true;
  armChooser.innerHTML='';
  showWashButton(false);

  log(state.players+' player dominoes started. First count must be 10+ to get in. Match goes to '+SCORE_TARGET+'.');

  if(state.forcedOpening){
    startWithHighestDouble();
  }else{
    state.currentPlayerIndex=state.nextStarterIndex;
    log(seatName(state.currentPlayerIndex)+' comes out after the dishes. They may lay any bone, and the first bone can count.');
  }

  state.handNumber++;
  render();
  if(state.currentPlayerIndex!==0&&!activeLocal()) scheduleCpu();
}

function washTheDishes(){
  if(!state.handOver || state.roundWinner===null || state.roundWinner===undefined){
    log('No finished hand to wash yet.');
    return;
  }
  log(seatName((state.roundWinner+1)%state.players)+' washed the bones. '+seatName(state.roundWinner)+' comes out.');
  state.nextStarterIndex=state.roundWinner;
  newGame(state.players,false);
}

function refreshOpenEnds(){
  const ends=[];
  if(!hasBoardTiles()){
    state.board.openEnds=ends;
    return ends;
  }

  const sides=state.board.canBranch?['left','right','top','bottom']:['left','right'];

  sides.forEach(side=>{
    const arm=state.board.spinnerArms[side]||[];
    let baseValue;
    if(state.board.canBranch && isDouble(state.board.spinnerTile)){
      baseValue=state.board.spinnerTile[0];
    }else{
      baseValue=side==='left'?state.board.spinnerTile[0]:state.board.spinnerTile[1];
    }

    ends.push({
      arm:side,
      value:arm.length?outerValue(arm[arm.length-1],side):baseValue,
      active:arm.length>0
    });
  });

  state.board.openEnds=ends;
  return ends;
}

function exposedValue(tile,arm){
  if(!tile) return 0;

  // Exposed doubles count both sides: 6/6=12, 5/5=10, 4/4=8.
  if(isDouble(tile)) return tileSum(tile);

  // Non-doubles count ONLY the outside open tip, never the matched/connected side.
  if(arm==='left'||arm==='top') return Number(tile[0]||0);
  return Number(tile[1]||0);
}

function boardEndTotal(){
  if(!hasBoardTiles()) return 0;

  const arms=state.board.spinnerArms;
  const scores=state.board.armScoreValues || {};
  const activeArms=['left','right','top','bottom'].filter(side=>(arms[side]||[]).length>0);

  // First bone coming out counts as the whole bone.
  if(!activeArms.length) return tileSum(state.board.spinnerTile);

  // With one branch off a double spinner, the spinner is still counted whole plus the outside tip.
  // Example: 6/6 + 6/3 = 12 + 3 = 15.
  if(activeArms.length===1 && state.board.canBranch && isDouble(state.board.spinnerTile)){
    const side=activeArms[0];
    const branch=arms[side]||[];
    const tip=branch[branch.length-1];
    const tipScore=Number(scores[side] ?? exposedValue(tip,side) ?? 0);
    return tileSum(state.board.spinnerTile)+tipScore;
  }

  // Once multiple arms are live, count ONLY the visible exposed tip score on each live arm.
  // Non-doubles never count whole here: 6/4 exposed on 4 side counts 4, not 10.
  return activeArms.reduce((sum,side)=>{
    const branch=arms[side]||[];
    const tip=branch[branch.length-1];
    const tipScore=Number(scores[side] ?? exposedValue(tip,side) ?? 0);
    return sum + tipScore;
  },0);
}

function updateBoardTotal(){
  state.lastBoardTotal=boardEndTotal();
  return state.lastBoardTotal;
}

function scoringPointsForTotal(total){
  return total>0 && total%5===0 ? total : 0;
}

function showCountPopup(text,kind){
  let popup=document.getElementById('dominoCountPopup');
  if(!popup){
    popup=document.createElement('div');
    popup.id='dominoCountPopup';
    popup.style.position='fixed';
    popup.style.left='50%';
    popup.style.top='20%';
    popup.style.transform='translate(-50%,-50%)';
    popup.style.zIndex='99999';
    popup.style.padding='18px 26px';
    popup.style.borderRadius='22px';
    popup.style.border='2px solid #f2d27b';
    popup.style.background='rgba(0,0,0,.88)';
    popup.style.color='#f2d27b';
    popup.style.fontFamily='Black Ops One, Oswald, sans-serif';
    popup.style.fontSize='clamp(24px,5vw,54px)';
    popup.style.textAlign='center';
    popup.style.boxShadow='0 0 40px rgba(242,210,123,.35)';
    popup.style.pointerEvents='none';
    document.body.appendChild(popup);
  }
  popup.textContent=text;
  popup.dataset.kind=kind||'count';
  popup.style.display='block';
  clearTimeout(showCountPopup.timer);
  showCountPopup.timer=setTimeout(()=>{popup.style.display='none'},1800);
}

function awardBoardScore(playerIndex,allowOpeningScore=true){
  const total=updateBoardTotal();
  const points=scoringPointsForTotal(total);
  state.lastPointsAwarded=0;

  if(!allowOpeningScore){
    state.lastScoreNote='COUNT '+total+' — no score on forced opener.';
    log(state.lastScoreNote);
    return 0;
  }

  if(!points){
    state.lastScoreNote='COUNT '+total+' — no score.';
    log(state.lastScoreNote);
    return 0;
  }

  if(!state.gotIn[playerIndex] && points<GET_IN_MIN){
    state.lastScoreNote='COUNT '+points+' — '+seatName(playerIndex)+' needs 10 to get in.';
    showCountPopup(points+' — NEED 10', 'need-in');
    log(state.lastScoreNote);
    return 0;
  }

  state.gotIn[playerIndex]=true;
  state.scores[playerIndex]+=points;
  state.lastPointsAwarded=points;
  state.lastScoreNote='COUNT '+points+' — '+seatName(playerIndex)+' scores.';
  showCountPopup('COUNT '+points, 'score');
  log(state.lastScoreNote);
  return points;
}

function legalArms(tile){
  if(!hasBoardTiles()) return ['open'];
  return refreshOpenEnds()
    .filter(end=>tile[0]===end.value||tile[1]===end.value)
    .map(end=>end.arm);
}

function legal(tile){return legalArms(tile).length>0}
function canPlay(playerIndex){return (state.hands[playerIndex]||[]).some(legal)}

function splitByMatch(tile,match){
  return tile[0]===match?{match:tile[0],outside:tile[1]}:{match:tile[1],outside:tile[0]};
}

function outerValue(tile,arm){
  return arm==='top'||arm==='left'?tile[0]:tile[1];
}

function orientForArm(tile,match,arm){
  const parts=splitByMatch(tile,match);
  return arm==='top'||arm==='left'?[parts.outside,parts.match]:[parts.match,parts.outside];
}

function handPips(playerIndex){
  return (state.hands[playerIndex]||[]).reduce((sum,tile)=>sum+tileSum(tile),0);
}

function placeOnArm(tile,arm){
  if(arm==='open'&&!state.board.spinnerTile){
    state.board.spinnerTile=tile;
    state.board.canBranch=isDouble(tile);
    refreshOpenEnds();
    updateBoardTotal();
    return true;
  }

  if(arm==='open'||!state.board.spinnerTile) return false;

  const end=refreshOpenEnds().find(item=>item.arm===arm);
  if(!end||(tile[0]!==end.value&&tile[1]!==end.value)) return false;

  const parts=splitByMatch(tile,end.value);
  state.board.spinnerArms[arm].push(orientForArm(tile,end.value,arm));
  state.board.armScoreValues[arm]=isDouble(tile)?tileSum(tile):Number(parts.outside||0);
  refreshOpenEnds();
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
  if(state.handOver) return;
  const arms=legalArms(tile);
  if(!arms.length){log('Illegal tile.');return}
  if(arms.length===1){playTile(tile,arms[0]);return}

  state.pending={tile};
  armChooser.hidden=false;
  armChooser.innerHTML='<span>Choose arm</span>'+arms.map(arm=>'<button type="button" data-arm="'+arm+'">'+arm+'</button>').join('');
}

function playTile(tile,arm){
  const player=state.currentPlayerIndex;
  if(state.handOver) return;
  if(player!==0&&!activeLocal()) return;
  if(!commitPlay(player,tile,arm)){log('Illegal tile.');return}

  log(seatName(player)+' played '+tile[0]+'-'+tile[1]+' on '+arm+'.');
  awardBoardScore(player, !(state.forcedOpening && state.handNumber===1 && !state.board.spinnerArms.left.length && !state.board.spinnerArms.right.length && !state.board.spinnerArms.top.length && !state.board.spinnerArms.bottom.length));

  if(!state.hands[player].length){finish(player);return}
  advance();
}

function chooseCpuMove(hand){
  for(const tile of hand){
    const arms=legalArms(tile);
    if(arms.length) return {tile,arm:arms.find(x=>x==='top'||x==='bottom')||arms[0]};
  }
  return null;
}

function advance(){
  state.currentPlayerIndex=(state.currentPlayerIndex+1)%state.players;
  render();
  if(state.currentPlayerIndex!==0&&!activeLocal()) scheduleCpu();
}

function endHand(label,winner){
  state.roundWinner=winner;
  if(winner!==null&&winner!==undefined){
    state.nextStarterIndex=winner;
    log(seatName(winner)+' won the hand. Press WASH THE DISHES to deal the next hand.');
  }

  state.handOver=true;
  showWashButton(true);

  if(winner===0&&window.Play3DPoints) window.Play3DPoints.award('dominoes',125,'round_win');

  const targetReached=state.scores.some(score=>score>=SCORE_TARGET);
  state.lastHandLabel=targetReached
    ? seatName(state.scores.indexOf(Math.max(...state.scores)))+' WINS TO '+SCORE_TARGET
    : label+' — WASH THE DISHES';

  turnTextEl.textContent=scoreStatusText(state.lastHandLabel);
  render();
}

function finish(winner){
  log('DOMINO! '+seatName(winner)+' played the last bone.');
  showCountPopup('DOMINO!', 'domino');
  endHand('DOMINO — '+seatName(winner)+' WINS HAND',winner);
}

function blockedWinner(){
  const pipTotals=state.hands.map((_,playerIndex)=>handPips(playerIndex));
  const lowest=Math.min(...pipTotals);
  const leaders=pipTotals.map((pips,playerIndex)=>({pips,playerIndex})).filter(item=>item.pips===lowest);
  return leaders.length===1?leaders[0].playerIndex:null;
}

function scheduleCpu(){
  turnTextEl.textContent=scoreStatusText('OPPONENT THINKING...');
  setTimeout(cpuTurn,thinkDelay());
}

function cpuTurn(){
  const player=state.currentPlayerIndex;
  if(player===0||activeLocal()||state.handOver) return;

  const hand=state.hands[player];
  let move=chooseCpuMove(hand);

  while(!move&&state.stock.length){
    hand.push(state.stock.pop());
    log(seatName(player)+' drew.');
    move=chooseCpuMove(hand);
  }

  if(move){
    commitPlay(player,move.tile,move.arm);
    log(seatName(player)+' played '+move.tile[0]+'-'+move.tile[1]+' on '+move.arm+'.');
    awardBoardScore(player,true);
  }else{
    state.passes++;
    log(seatName(player)+' passed.');
  }

  if(!hand.length){finish(player);return}

  if(state.passes>=state.players){
    const winner=blockedWinner();
    endHand(winner===null?'BLOCKED HAND - TIE':'BLOCKED HAND - '+seatName(winner)+' WINS',winner);
    return;
  }

  advance();
}

function drawUntilPlayable(player){
  let drew=false;
  while(!canPlay(player)&&state.stock.length){
    state.hands[player].push(state.stock.pop());
    drew=true;
  }
  return drew;
}

function drawTile(){
  const player=state.currentPlayerIndex;
  if(state.handOver) return;
  if(player!==0&&!activeLocal()) return;
  if(canPlay(player)){log('You have a playable domino.');return}
  if(drawUntilPlayable(player)) log(seatName(player)+' drew from the boneyard.');
  else log('Boneyard empty. Pass if you cannot play.');
  render();
}

function passTurn(){
  const player=state.currentPlayerIndex;
  if(state.handOver) return;
  if(player!==0&&!activeLocal()) return;
  if(canPlay(player)){log('Play a legal tile if you can.');return}
  if(state.stock.length){log('Draw from the boneyard before passing.');return}
  state.passes++;
  if(state.passes>=state.players){
    const winner=blockedWinner();
    endHand(winner===null?'BLOCKED HAND - TIE':'BLOCKED HAND - '+seatName(winner)+' WINS',winner);
    return;
  }
  advance();
}

function tileHTML(tile,index,cls){
  return `<button class="tile ${cls||''}" data-i="${index}"><span>${tile[0]}</span><i></i><span>${tile[1]}</span></button>`;
}

function backs(count){
  return Array.from({length:count},()=>'<span class="tile-back"></span>').join('');
}

function renderBoard(){
  const arm=side=>state.board.spinnerArms[side].map((tile,i)=>tileHTML(tile,i,'branch '+side+'-arm '+(isDouble(tile)?'double':''))).join('');
  chainEl.className='chain spinner-board';

  if(!state.board.spinnerTile){
    chainEl.innerHTML='<div class="empty-board">Start a hand to place the first bone.</div>';
    return;
  }

  chainEl.innerHTML=
    '<div class="branch-line top-branch">'+arm('top')+'</div>'+
    '<div class="line-row">'+
      '<div class="horizontal-arm left-branch">'+arm('left')+'</div>'+
      tileHTML(state.board.spinnerTile,0,state.board.canBranch?'spinner':'starter')+
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
  refreshOpenEnds();
  updateBoardTotal();
  renderBoard();

  const visible=state.currentPlayerIndex===0||activeLocal()?state.currentPlayerIndex:0;
  const hand=state.hands[visible]||[];

  handEl.innerHTML=hand.map((tile,i)=>tileHTML(tile,i,legal(tile)?'':'disabled')).join('');
  document.querySelectorAll('#hand .tile').forEach(btn=>btn.onclick=()=>requestArm(hand[+btn.dataset.i]));

  scoreTextEl.textContent=state.scores.slice(0,state.players).map((score,i)=>seatName(i)+': '+score+(state.gotIn[i]?'':' (need 10)')).join(' / ');

  if(state.handOver) turnTextEl.textContent=scoreStatusText(state.lastHandLabel);
  else if(!turnTextEl.textContent.startsWith('OPPONENT THINKING')) turnTextEl.textContent=scoreStatusText(seatName(state.currentPlayerIndex)+' TURN');

  [['.bottom-seat',0],['.top-seat',1],['.left-seat',2],['.right-seat',3]].forEach(([sel,i])=>{
    const el=document.querySelector(sel);
    if(!el) return;
    el.innerHTML=i<state.players
      ? '<b>'+seatName(i)+'</b><small>'+((state.hands[i]||[]).length)+' tiles</small><small>'+state.scores[i]+' pts '+(state.gotIn[i]?'IN':'NEEDS 10')+'</small><div class="seat-backs">'+backs(Math.min(7,(state.hands[i]||[]).length))+'</div>'
      : '';
  });

  document.querySelectorAll('.playerCountBtn').forEach(btn=>btn.classList.toggle('active',Number(btn.dataset.count)===state.players));
  showWashButton(state.handOver && state.roundWinner!==null && state.roundWinner!==undefined && !state.scores.some(score=>score>=SCORE_TARGET));
}

function log(msg){
  const logEl=document.getElementById('log');
  if(logEl) logEl.innerHTML='<li>'+msg+'</li>'+logEl.innerHTML;
}

ensureWashButton();
armChooser.addEventListener('click',e=>{const btn=e.target.closest('[data-arm]');if(btn&&state.pending)playTile(state.pending.tile,btn.dataset.arm)});
newBtnEl.onclick=()=>newGame(state.players,true);
drawBtnEl.onclick=drawTile;
passBtnEl.onclick=passTurn;
document.querySelectorAll('.playerCountBtn').forEach(btn=>btn.onclick=()=>newGame(Number(btn.dataset.count),true));
window.addEventListener('play3d:modechange',event=>{mode=event.detail.mode;newGame(mode==='cpu'?2:4,true)});
newGame(2,true);
})();
