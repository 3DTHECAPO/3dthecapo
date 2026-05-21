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

function thinkDelay(){return 400+Math.floor(Math.random()*1000)}
function seatName(i){return ['Player 1','Player 2','Player 3','Player 4'][i]||'Player'}
function isDouble(tile){return tile[0]===tile[1]}
function handSize(){return 7}
function activeLocal(){return mode==='local'||mode==='fan'}
function resetBoard(){state.board={spinnerTile:null,spinnerArms:{left:[],right:[],top:[],bottom:[]},openEnds:[]}}
function buildStock(){state.stock=[];for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)state.stock.push([a,b]);state.stock.sort(()=>Math.random()-.5)}
function hasBoardTiles(){return !!state.board.spinnerTile||state.board.spinnerArms.right.length>0}

function newGame(players){
  mode=window.Play3DModeBar?window.Play3DModeBar.getMode():mode;
  state.players=Math.max(2,Math.min(4,Number(players)||state.players||2));
  buildStock();resetBoard();
  state.hands=Array.from({length:state.players},()=>state.stock.splice(0,handSize()));
  let starter=findHighestDouble();
  let safety=0;
  while(!starter&&safety<20){
    buildStock();resetBoard();
    state.hands=Array.from({length:state.players},()=>state.stock.splice(0,handSize()));
    starter=findHighestDouble();
    safety++;
  }
  state.scores=Array.from({length:state.players},(_,i)=>state.scores[i]||0);
  state.passes=0;state.pending=null;
  armChooser.hidden=true;armChooser.innerHTML='';
  if(starter){
    placeOpeningDouble(starter.player, starter.tile);
    state.currentPlayerIndex=(starter.player+1)%state.players;
    log(seatName(starter.player)+' opened with highest double '+starter.tile[0]+'-'+starter.tile[1]+'.');
  }else{
    state.currentPlayerIndex=0;
    log('No doubles found after redeal. Start manually.');
  }
  render();
  if(state.currentPlayerIndex!==0&&!activeLocal())scheduleCpu();
}

function refreshOpenEnds(){
  const ends=[];
  if(!hasBoardTiles()){state.board.openEnds=ends;return ends}
  if(state.board.spinnerTile){
    const value=state.board.spinnerTile[0];
    ['left','right','top','bottom'].forEach(side=>{
      const arm=state.board.spinnerArms[side];
      ends.push({arm:side,value:arm.length?arm[arm.length-1][1]:value});
    });
  }else{
    const line=state.board.spinnerArms.right;
    ends.push({arm:'left',value:line[0][0]},{arm:'right',value:line[line.length-1][1]});
  }
  state.board.openEnds=ends;
  return ends;
}

function legalArms(tile){
  if(!hasBoardTiles())return ['open'];
  return refreshOpenEnds().filter(end=>tile[0]===end.value||tile[1]===end.value).map(end=>end.arm);
}
function legal(tile){return legalArms(tile).length>0}
function canPlay(playerIndex){return (state.hands[playerIndex]||[]).some(legal)}
function orientOut(tile,match){return tile[0]===match?tile:[tile[1],tile[0]]}
function orientLeft(tile,match){return tile[1]===match?tile:[tile[1],tile[0]]}

function findHighestDouble(){
  let best=null;
  state.hands.forEach((hand,player)=>hand.forEach(tile=>{
    if(isDouble(tile)&&(!best||tile[0]>best.tile[0]))best={player,tile};
  }));
  return best;
}
function placeOpeningDouble(player,tile){
  removeTile(state.hands[player],tile);
  state.board.spinnerTile=tile;
  refreshOpenEnds();
}
function boardCount(){
  if(!hasBoardTiles())return 0;
  if(state.board.spinnerTile&&!Object.values(state.board.spinnerArms).some(arm=>arm.length)){
    return state.board.spinnerTile[0]+state.board.spinnerTile[1];
  }
  return refreshOpenEnds().reduce((sum,end)=>sum+end.value,0);
}
function scoreBoardCount(player){
  const count=boardCount();
  if(count>0&&count%5===0){
    state.scores[player]+=count;
    log(seatName(player)+' scored '+count+' on board count.');
    if(player===0&&window.Play3DPoints)window.Play3DPoints.award('dominoes',Math.max(5,count),'count_fives');
  }
  return count;
}

function placeOnArm(tile,arm){
  if(arm==='open'){
    if(isDouble(tile))state.board.spinnerTile=tile;
    else state.board.spinnerArms.right.push(tile);
    refreshOpenEnds();
    return true;
  }
  const end=refreshOpenEnds().find(item=>item.arm===arm);
  if(!end||(tile[0]!==end.value&&tile[1]!==end.value))return false;
  if(!state.board.spinnerTile){
    const line=state.board.spinnerArms.right;
    if(arm==='left')line.unshift(orientLeft(tile,end.value));
    else line.push(orientOut(tile,end.value));
  }else{
    state.board.spinnerArms[arm].push(orientOut(tile,end.value));
  }
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
  const count=scoreBoardCount(player);
  log(seatName(player)+' played on '+arm+'. Board count '+count+'.');
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
function finish(winner){
  const gameOver=state.scores[winner]>=150;
  if(winner===0&&window.Play3DPoints)window.Play3DPoints.award('dominoes',125,'round_win');
  turnText.textContent=seatName(winner)+(gameOver?' WINS GAME':' DOMINOES');
  render();
}
function finishBlocked(){
  turnText.textContent='BLOCKED ROUND - NO ROUND SCORE';
  render();
}
function scheduleCpu(){turnText.textContent='OPPONENT THINKING...';setTimeout(cpuTurn,thinkDelay())}
function cpuTurn(){
  const player=state.currentPlayerIndex;
  if(player===0||activeLocal())return;
  const hand=state.hands[player];
  const move=chooseCpuMove(hand);
  if(move){commitPlay(player,move.tile,move.arm);const count=scoreBoardCount(player);log(seatName(player)+' played on '+move.arm+'. Board count '+count+'.')}
  else if(state.stock.length){while(state.stock.length&&!chooseCpuMove(hand)){hand.push(state.stock.pop());log(seatName(player)+' drew.')}if(chooseCpuMove(hand))return scheduleCpu()}
  else{state.passes++;log(seatName(player)+' passed.')}
  if(!hand.length){finish(player);return}
  if(state.passes>=state.players){finishBlocked();return}
  advance();
}
function drawTile(){const player=state.currentPlayerIndex;if(player!==0&&!activeLocal())return;if(canPlay(player)){log('Play a legal tile if you can.');return}let drew=0;while(state.stock.length&&!canPlay(player)){state.hands[player].push(state.stock.pop());drew++}log(drew?seatName(player)+' drew '+drew+'.':'Boneyard empty. Pass.');render()}
function passTurn(){const player=state.currentPlayerIndex;if(player!==0&&!activeLocal())return;if(canPlay(player)){log('Play a legal tile if you can.');return}if(state.stock.length){log('Draw until playable before passing.');return}state.passes++;if(state.passes>=state.players){finishBlocked();return}advance()}
function tileHTML(tile,index,cls){return `<button class="tile ${cls||''}" data-i="${index}"><span>${tile[0]}</span><i></i><span>${tile[1]}</span></button>`}
function backs(count){return Array.from({length:count},()=>'<span class="tile-back"></span>').join('')}
function renderBoard(){
  if(state.board.spinnerTile){
    const arm=side=>state.board.spinnerArms[side].map((tile,i)=>tileHTML(tile,i,'branch '+side+'-arm')).join('');
    chainEl.className='chain spinner-board';
    chainEl.innerHTML='<div class="branch-line top-branch">'+arm('top')+'</div><div class="line-row">'+arm('left')+tileHTML(state.board.spinnerTile,0,'spinner')+arm('right')+'</div><div class="branch-line bottom-branch">'+arm('bottom')+'</div>';
  }else{
    chainEl.className='chain';
    chainEl.innerHTML=state.board.spinnerArms.right.map((tile,i)=>tileHTML(tile,i,'')).join('');
  }
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
