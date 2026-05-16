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
  board:{
    spinnerTile:null,
    spinnerArms:{left:[],right:[],top:[],bottom:[]},
    openEnds:[]
  }
};
let mode=window.Play3DModeBar?window.Play3DModeBar.getMode():'cpu';
const chainEl=document.getElementById('chain');
const handEl=document.getElementById('hand');
const armChooser=document.getElementById('armChooser');
const SCORE_TARGET=150;

function thinkDelay(){return 400+Math.floor(Math.random()*1000)}
function seatName(i){return ['Player 1','Player 2','Player 3','Player 4'][i]||'Player'}
function isDouble(tile){return tile[0]===tile[1]}
function handSize(){return state.players===2?7:5}
function activeLocal(){return mode==='local'||mode==='fan'}
function resetBoard(){state.board={spinnerTile:null,spinnerArms:{left:[],right:[],top:[],bottom:[]},openEnds:[]}}
function buildStock(){state.stock=[];for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)state.stock.push([a,b]);state.stock.sort(()=>Math.random()-.5)}
function hasBoardTiles(){return !!state.board.spinnerTile}
function doubleValue(tile){return isDouble(tile)?tile[0]:-1}
function findHighestDouble(){
  let best=null;
  state.hands.forEach((hand,playerIndex)=>hand.forEach(tile=>{
    if(isDouble(tile)&&(!best||doubleValue(tile)>doubleValue(best.tile)))best={playerIndex,tile};
  }));
  if(best)return best;
  const stockIndex=state.stock.reduce((bestIndex,tile,index)=>doubleValue(tile)>doubleValue(state.stock[bestIndex]||[-1,-2])?index:bestIndex,-1);
  if(stockIndex>=0){
    const tile=state.stock.splice(stockIndex,1)[0];
    state.hands[0].push(tile);
    return {playerIndex:0,tile};
  }
  return null;
}
function startWithHighestDouble(){
  const starter=findHighestDouble();
  if(!starter)return;
  state.board.spinnerTile=starter.tile;
  removeTile(state.hands[starter.playerIndex],starter.tile);
  refreshOpenEnds();
  scoreOpenEnds(starter.playerIndex);
  state.currentPlayerIndex=(starter.playerIndex+1)%state.players;
  log(seatName(starter.playerIndex)+' opened with '+starter.tile[0]+'-'+starter.tile[1]+'.');
}

function newGame(players){
  mode=window.Play3DModeBar?window.Play3DModeBar.getMode():mode;
  state.players=Math.max(2,Math.min(4,Number(players)||state.players||2));
  buildStock();resetBoard();
  state.hands=Array.from({length:state.players},()=>state.stock.splice(0,handSize()));
  state.scores=Array.from({length:state.players},(_,i)=>state.scores[i]||0);
  state.currentPlayerIndex=0;state.passes=0;state.pending=null;
  armChooser.hidden=true;armChooser.innerHTML='';
  log(state.players+' player dominoes started.');
  startWithHighestDouble();
  render();
  if(state.currentPlayerIndex!==0&&!activeLocal())scheduleCpu();
}

function refreshOpenEnds(){
  const ends=[];
  if(!hasBoardTiles()){state.board.openEnds=ends;return ends}
  const value=state.board.spinnerTile[0];
  ['left','right','top','bottom'].forEach(side=>{
    const arm=state.board.spinnerArms[side];
    ends.push({arm:side,value:arm.length?arm[arm.length-1][1]:value});
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
function orientFromEndpoint(tile,match){return tile[0]===match?[tile[0],tile[1]]:[tile[1],tile[0]]}
function openEndPointCount(){return refreshOpenEnds().reduce((sum,end)=>sum+end.value,0)}
function canScoreCount(playerIndex,count){
  return count>0&&count%5===0&&(count>=10||state.scores[playerIndex]>=10);
}
function scoreOpenEnds(playerIndex){
  const count=openEndPointCount();
  if(!canScoreCount(playerIndex,count))return 0;
  state.scores[playerIndex]+=count;
  log(seatName(playerIndex)+' scored '+count+' from the point count.');
  return count;
}

function placeOnArm(tile,arm){
  if(arm==='open'||!state.board.spinnerTile)return false;
  const end=refreshOpenEnds().find(item=>item.arm===arm);
  if(!end||(tile[0]!==end.value&&tile[1]!==end.value))return false;
  state.board.spinnerArms[arm].push(orientFromEndpoint(tile,end.value));
  refreshOpenEnds();
  return true;
}

function removeTile(hand,tile){const index=hand.indexOf(tile);if(index>=0)hand.splice(index,1)}
function commitPlay(playerIndex,tile,arm){
  if(!placeOnArm(tile,arm))return false;
  removeTile(state.hands[playerIndex],tile);
  scoreOpenEnds(playerIndex);
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
  if(winner===0&&window.Play3DPoints)window.Play3DPoints.award('dominoes',125,'round_win');
  const targetReached=state.scores.some(score=>score>=SCORE_TARGET);
  turnText.textContent=targetReached?seatName(state.scores.indexOf(Math.max(...state.scores)))+' WINS TO '+SCORE_TARGET:label;
  render();
}
function finish(winner){endHand(seatName(winner)+' WINS HAND',winner)}
function scheduleCpu(){turnText.textContent='OPPONENT THINKING...';setTimeout(cpuTurn,thinkDelay())}
function cpuTurn(){
  const player=state.currentPlayerIndex;
  if(player===0||activeLocal())return;
  const hand=state.hands[player];
  const move=chooseCpuMove(hand);
  if(move){commitPlay(player,move.tile,move.arm);log(seatName(player)+' played on '+move.arm+'.')}
  else if(state.stock.length){hand.push(state.stock.pop());log(seatName(player)+' drew.');if(chooseCpuMove(hand))return scheduleCpu()}
  else{state.passes++;log(seatName(player)+' passed.')}
  if(!hand.length){finish(player);return}
  if(state.passes>=state.players){endHand('BLOCKED HAND');return}
  advance();
}
function drawTile(){const player=state.currentPlayerIndex;if(player!==0&&!activeLocal())return;if(state.stock.length){state.hands[player].push(state.stock.pop());log(seatName(player)+' drew.');render()}}
function passTurn(){const player=state.currentPlayerIndex;if(player!==0&&!activeLocal())return;if(canPlay(player)){log('Play a legal tile if you can.');return}state.passes++;if(state.passes>=state.players){endHand('BLOCKED HAND');return}advance()}
function tileHTML(tile,index,cls){return `<button class="tile ${cls||''}" data-i="${index}"><span>${tile[0]}</span><i></i><span>${tile[1]}</span></button>`}
function backs(count){return Array.from({length:count},()=>'<span class="tile-back"></span>').join('')}
function renderBoard(){
  const arm=side=>state.board.spinnerArms[side].map((tile,i)=>tileHTML(tile,i,'branch '+side+'-arm '+(isDouble(tile)?'double':''))).join('');
  chainEl.className='chain spinner-board';
  chainEl.innerHTML='<div class="branch-line top-branch">'+arm('top')+'</div><div class="line-row"><div class="horizontal-arm left-branch">'+arm('left')+'</div>'+tileHTML(state.board.spinnerTile,0,'spinner')+'<div class="horizontal-arm right-branch">'+arm('right')+'</div></div><div class="branch-line bottom-branch">'+arm('bottom')+'</div>';
}
function render(){
  refreshOpenEnds();renderBoard();
  const visible=state.currentPlayerIndex===0||activeLocal()?state.currentPlayerIndex:0;
  const hand=state.hands[visible]||[];
  handEl.innerHTML=hand.map((tile,i)=>tileHTML(tile,i,legal(tile)?'':'disabled')).join('');
  document.querySelectorAll('#hand .tile').forEach(btn=>btn.onclick=()=>requestArm(hand[+btn.dataset.i]));
  scoreText.textContent=state.scores.slice(0,state.players).map((score,i)=>seatName(i)+': '+score).join(' / ');
  if(turnText.textContent!=='OPPONENT THINKING...')turnText.textContent=seatName(state.currentPlayerIndex)+' TURN';
  [['.bottom-seat',0],['.top-seat',1],['.left-seat',2],['.right-seat',3]].forEach(([sel,i])=>{
    const el=document.querySelector(sel);if(!el)return;
    el.innerHTML=i<state.players?'<b>'+seatName(i)+'</b><small>'+((state.hands[i]||[]).length)+' tiles</small><div class="seat-backs">'+backs(Math.min(7,(state.hands[i]||[]).length))+'</div>':'';
  });
  document.querySelectorAll('.playerCountBtn').forEach(btn=>btn.classList.toggle('active',Number(btn.dataset.count)===state.players));
}
function log(msg){document.getElementById('log').innerHTML='<li>'+msg+'</li>'+document.getElementById('log').innerHTML}
armChooser.addEventListener('click',e=>{const btn=e.target.closest('[data-arm]');if(btn&&state.pending)playTile(state.pending.tile,btn.dataset.arm)});
newBtn.onclick=()=>newGame(state.players);drawBtn.onclick=drawTile;passBtn.onclick=passTurn;
document.querySelectorAll('.playerCountBtn').forEach(btn=>btn.onclick=()=>newGame(Number(btn.dataset.count)));
window.addEventListener('play3d:modechange',event=>{mode=event.detail.mode;newGame(mode==='cpu'?2:4)});
newGame(2);
})();
