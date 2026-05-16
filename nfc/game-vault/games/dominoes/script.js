(()=>{
'use strict';

const state={
  players:2,
  hands:[],
  scores:[],
  currentPlayerIndex:0,
  stock:[],
  passes:0,
  pending:null,
  handOver:false,
  lastHandLabel:'',
  handNumber:0,
  nextStarterIndex:null,
  board:{
    spinnerTile:null,
    canBranch:false,
    spinnerArms:{left:[],right:[],top:[],bottom:[]},
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
const SCORE_TARGET=150;

function thinkDelay(){return 400+Math.floor(Math.random()*1000)}
function seatName(i){return ['Player 1','Player 2','Player 3','Player 4'][i]||'Player'}
function isDouble(tile){return tile[0]===tile[1]}
function handSize(){return 7}
function activeLocal(){return mode==='local'||mode==='fan'}
function resetBoard(){state.board={spinnerTile:null,canBranch:false,spinnerArms:{left:[],right:[],top:[],bottom:[]},openEnds:[]}}
function buildStock(){state.stock=[];for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)state.stock.push([a,b]);state.stock.sort(()=>Math.random()-.5)}
function hasBoardTiles(){return !!state.board.spinnerTile}
function doubleValue(tile){return isDouble(tile)?tile[0]:-1}
function findHighestDouble(){
  let best=null;
  state.hands.forEach((hand,playerIndex)=>hand.forEach(tile=>{
    if(isDouble(tile)&&(!best||doubleValue(tile)>doubleValue(best.tile)))best={playerIndex,tile};
  }));
  return best;
}
function startWithHighestDouble(){
  const starter=findHighestDouble();
  if(!starter)return false;
  state.board.spinnerTile=starter.tile;
  state.board.canBranch=true;
  removeTile(state.hands[starter.playerIndex],starter.tile);
  refreshOpenEnds();
  state.currentPlayerIndex=(starter.playerIndex+1)%state.players;
  log(seatName(starter.playerIndex)+' opened with '+starter.tile[0]+'-'+starter.tile[1]+'.');
  return true;
}

function newGame(players,resetMatch){
  mode=window.Play3DModeBar?window.Play3DModeBar.getMode():mode;
  const nextPlayerCount=Math.max(2,Math.min(4,Number(players)||state.players||2));
  const playerCountChanged=nextPlayerCount!==state.players;
  state.players=nextPlayerCount;
  if(resetMatch||playerCountChanged){
    state.scores=Array.from({length:state.players},()=>0);
    state.handNumber=0;
    state.nextStarterIndex=null;
  }
  do{
    buildStock();resetBoard();
    state.hands=Array.from({length:state.players},()=>state.stock.splice(0,handSize()));
  }while(!findHighestDouble());
  state.scores=Array.from({length:state.players},(_,i)=>state.scores[i]||0);
  state.currentPlayerIndex=0;state.passes=0;state.pending=null;
  state.handOver=false;state.lastHandLabel='';
  armChooser.hidden=true;armChooser.innerHTML='';
  log(state.players+' player dominoes started.');
  if(state.handNumber===0||state.nextStarterIndex===null){
    startWithHighestDouble();
  }else{
    state.currentPlayerIndex=state.nextStarterIndex;
    log(seatName(state.currentPlayerIndex)+' starts the next hand and may open with any tile.');
  }
  state.handNumber++;
  render();
  if(state.currentPlayerIndex!==0&&!activeLocal())scheduleCpu();
}

function refreshOpenEnds(){
  const ends=[];
  if(!hasBoardTiles()){state.board.openEnds=ends;return ends}
  const sides=state.board.canBranch?['left','right','top','bottom']:['left','right'];
  sides.forEach(side=>{
    const arm=state.board.spinnerArms[side];
    const baseValue=side==='left'?state.board.spinnerTile[0]:state.board.spinnerTile[1];
    ends.push({arm:side,value:arm.length?outerValue(arm[arm.length-1],side):baseValue});
  });
  state.board.openEnds=ends;
  return ends;
}

function legalArms(tile){
  if(!hasBoardTiles())return ['open'];
  return refreshOpenEnds().filter(end=>tile[0]===end.value||tile[1]===end.value).map(end=>end.arm);
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
function handPips(playerIndex){return (state.hands[playerIndex]||[]).reduce((sum,tile)=>sum+tile[0]+tile[1],0)}
function remainingOpponentPips(winner){
  return state.hands.reduce((sum,hand,playerIndex)=>playerIndex===winner?sum:sum+hand.reduce((pipTotal,tile)=>pipTotal+tile[0]+tile[1],0),0);
}

function placeOnArm(tile,arm){
  if(arm==='open'&&!state.board.spinnerTile){
    state.board.spinnerTile=tile;
    state.board.canBranch=false;
    refreshOpenEnds();
    return true;
  }
  if(arm==='open'||!state.board.spinnerTile)return false;
  const end=refreshOpenEnds().find(item=>item.arm===arm);
  if(!end||(tile[0]!==end.value&&tile[1]!==end.value))return false;
  state.board.spinnerArms[arm].push(orientForArm(tile,end.value,arm));
  refreshOpenEnds();
  return true;
}

function removeTile(hand,tile){const index=hand.indexOf(tile);if(index>=0)hand.splice(index,1)}
function commitPlay(playerIndex,tile,arm){
  if(!placeOnArm(tile,arm))return false;
  removeTile(state.hands[playerIndex],tile);
  state.passes=0;state.pending=null;armChooser.hidden=true;armChooser.innerHTML='';
  return true;
}
function requestArm(tile){
  const arms=legalArms(tile);
  if(!arms.length){log('Illegal tile.');return}
  if(arms.length===1){playTile(tile,arms[0]);return}
  state.pending={tile};
  armChooser.hidden=false;
  armChooser.innerHTML='<span>Choose arm</span>'+arms.map(arm=>'<button type="button" data-arm="'+arm+'">'+arm+'</button>').join('');
}
function playTile(tile,arm){
  const player=state.currentPlayerIndex;
  if(player!==0&&!activeLocal())return;
  if(!commitPlay(player,tile,arm)){log('Illegal tile.');return}
  log(seatName(player)+' played on '+arm+'.');
  if(!state.hands[player].length){finish(player);return}
  advance();
}
function chooseCpuMove(hand){
  for(const tile of hand){
    const arms=legalArms(tile);
    if(arms.length)return {tile,arm:arms.find(x=>x==='top'||x==='bottom')||arms[0]};
  }
  return null;
}
function advance(){state.currentPlayerIndex=(state.currentPlayerIndex+1)%state.players;render();if(state.currentPlayerIndex!==0&&!activeLocal())scheduleCpu()}
function endHand(label,winner){
  if(winner!==null&&winner!==undefined){
    const points=remainingOpponentPips(winner);
    state.scores[winner]+=points;
    state.nextStarterIndex=winner;
    log(seatName(winner)+' scored '+points+' from opponents\' remaining pips.');
  }
  state.handOver=true;
  if(winner===0&&window.Play3DPoints)window.Play3DPoints.award('dominoes',125,'round_win');
  const targetReached=state.scores.some(score=>score>=SCORE_TARGET);
  state.lastHandLabel=targetReached?seatName(state.scores.indexOf(Math.max(...state.scores)))+' WINS TO '+SCORE_TARGET:label;
  turnTextEl.textContent=state.lastHandLabel;
  render();
}
function finish(winner){endHand(seatName(winner)+' WINS HAND',winner)}
function blockedWinner(){
  const pipTotals=state.hands.map((_,playerIndex)=>handPips(playerIndex));
  const lowest=Math.min(...pipTotals);
  const leaders=pipTotals.map((pips,playerIndex)=>({pips,playerIndex})).filter(item=>item.pips===lowest);
  return leaders.length===1?leaders[0].playerIndex:null;
}
function scheduleCpu(){turnTextEl.textContent='OPPONENT THINKING...';setTimeout(cpuTurn,thinkDelay())}
function cpuTurn(){
  const player=state.currentPlayerIndex;
  if(player===0||activeLocal())return;
  const hand=state.hands[player];
  let move=chooseCpuMove(hand);
  while(!move&&state.stock.length){
    hand.push(state.stock.pop());
    log(seatName(player)+' drew.');
    move=chooseCpuMove(hand);
  }
  if(move){commitPlay(player,move.tile,move.arm);log(seatName(player)+' played on '+move.arm+'.')}
  else{state.passes++;log(seatName(player)+' passed.')}
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
  if(player!==0&&!activeLocal())return;
  if(canPlay(player)){log('Play a legal tile if you can.');return}
  if(drawUntilPlayable(player))log(seatName(player)+' drew from the boneyard.');
  else log('Boneyard empty.');
  render();
}
function passTurn(){const player=state.currentPlayerIndex;if(player!==0&&!activeLocal())return;if(canPlay(player)){log('Play a legal tile if you can.');return}if(state.stock.length){log('Draw from the boneyard before passing.');return}state.passes++;if(state.passes>=state.players){const winner=blockedWinner();endHand(winner===null?'BLOCKED HAND - TIE':'BLOCKED HAND - '+seatName(winner)+' WINS',winner);return}advance()}
function tileHTML(tile,index,cls){return `<button class="tile ${cls||''}" data-i="${index}"><span>${tile[0]}</span><i></i><span>${tile[1]}</span></button>`}
function backs(count){return Array.from({length:count},()=>'<span class="tile-back"></span>').join('')}
function renderBoard(){
  const arm=side=>state.board.spinnerArms[side].map((tile,i)=>tileHTML(tile,i,'branch '+side+'-arm '+(isDouble(tile)?'double':''))).join('');
  chainEl.className='chain spinner-board';
  chainEl.innerHTML='<div class="branch-line top-branch">'+arm('top')+'</div><div class="line-row"><div class="horizontal-arm left-branch">'+arm('left')+'</div>'+tileHTML(state.board.spinnerTile,0,state.board.canBranch?'spinner':'starter')+'<div class="horizontal-arm right-branch">'+arm('right')+'</div></div><div class="branch-line bottom-branch">'+arm('bottom')+'</div>';
}
function render(){
  refreshOpenEnds();renderBoard();
  const visible=state.currentPlayerIndex===0||activeLocal()?state.currentPlayerIndex:0;
  const hand=state.hands[visible]||[];
  handEl.innerHTML=hand.map((tile,i)=>tileHTML(tile,i,legal(tile)?'':'disabled')).join('');
  document.querySelectorAll('#hand .tile').forEach(btn=>btn.onclick=()=>requestArm(hand[+btn.dataset.i]));
  scoreTextEl.textContent=state.scores.slice(0,state.players).map((score,i)=>seatName(i)+': '+score).join(' / ');
  if(state.handOver)turnTextEl.textContent=state.lastHandLabel;
  else if(turnTextEl.textContent!=='OPPONENT THINKING...')turnTextEl.textContent=seatName(state.currentPlayerIndex)+' TURN';
  [['.bottom-seat',0],['.top-seat',1],['.left-seat',2],['.right-seat',3]].forEach(([sel,i])=>{
    const el=document.querySelector(sel);if(!el)return;
    el.innerHTML=i<state.players?'<b>'+seatName(i)+'</b><small>'+((state.hands[i]||[]).length)+' tiles</small><div class="seat-backs">'+backs(Math.min(7,(state.hands[i]||[]).length))+'</div>':'';
  });
  document.querySelectorAll('.playerCountBtn').forEach(btn=>btn.classList.toggle('active',Number(btn.dataset.count)===state.players));
}
function log(msg){document.getElementById('log').innerHTML='<li>'+msg+'</li>'+document.getElementById('log').innerHTML}
armChooser.addEventListener('click',e=>{const btn=e.target.closest('[data-arm]');if(btn&&state.pending)playTile(state.pending.tile,btn.dataset.arm)});
newBtnEl.onclick=()=>newGame(state.players,false);drawBtnEl.onclick=drawTile;passBtnEl.onclick=passTurn;
document.querySelectorAll('.playerCountBtn').forEach(btn=>btn.onclick=()=>newGame(Number(btn.dataset.count),true));
window.addEventListener('play3d:modechange',event=>{mode=event.detail.mode;newGame(mode==='cpu'?2:4)});
newGame(2,true);
})();
