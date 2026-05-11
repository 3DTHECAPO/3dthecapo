(()=>{
'use strict';

let stock=[], hands=[], scores=[0,0,0,0], turn=0, playerCount=2, passes=0, pending=null;
let board={spinnerTile:null,spinnerArms:{left:[],right:[],top:[],bottom:[]}};
let mode=window.Play3DModeBar ? window.Play3DModeBar.getMode() : 'cpu';
const chainEl=document.getElementById('chain');
const handEl=document.getElementById('hand');
const armChooser=document.getElementById('armChooser');

function thinkDelay(){return 400+Math.floor(Math.random()*1000)}
function seatName(i){return ['YOU','CPU 1','CPU 2','CPU 3'][i]||'CPU'}
function isDouble(tile){return tile[0]===tile[1]}
function handSize(){return playerCount===2?7:5}
function activeLocal(){return mode==='local'||mode==='fan'}
function resetBoard(){board={spinnerTile:null,spinnerArms:{left:[],right:[],top:[],bottom:[]}}}
function buildStock(){stock=[];for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)stock.push([a,b]);stock.sort(()=>Math.random()-.5)}

function newGame(count){
  mode=window.Play3DModeBar ? window.Play3DModeBar.getMode() : mode;
  playerCount=count || playerCount || (mode==='cpu'?2:4);
  playerCount=Math.max(2,Math.min(4,playerCount));
  buildStock(); resetBoard(); pending=null;
  hands=Array.from({length:playerCount},()=>stock.splice(0,handSize()));
  turn=0; passes=0;
  log(playerCount+' player dominoes started. CPU fills empty seats.');
  render();
}

function lineTiles(){return board.spinnerArms.right}
function hasTiles(){return !!board.spinnerTile || lineTiles().length>0}

function openEnds(){
  if(!hasTiles()) return [];
  if(board.spinnerTile){
    const value=board.spinnerTile[0];
    return ['left','right','top','bottom'].map(side=>{
      const arm=board.spinnerArms[side];
      return {side, value:arm.length?arm[arm.length-1][1]:value};
    });
  }
  const line=lineTiles();
  return [{side:'left',value:line[0][0]},{side:'right',value:line[line.length-1][1]}];
}

function legalSides(tile){
  if(!hasTiles()) return ['open'];
  return openEnds().filter(end=>tile[0]===end.value||tile[1]===end.value).map(end=>end.side);
}
function legal(tile){return legalSides(tile).length>0}
function canPlay(i){return (hands[i]||[]).some(legal)}

function orientOut(tile,match){return tile[0]===match?tile:[tile[1],tile[0]]}
function orientLeft(tile,match){return tile[1]===match?tile:[tile[1],tile[0]]}

function makeSpinner(tile, side){
  const line=lineTiles().slice();
  board.spinnerTile=tile;
  board.spinnerArms={left:[],right:[],top:[],bottom:[]};
  if(side==='left') board.spinnerArms.right=line;
  else if(side==='right') board.spinnerArms.left=line;
}

function placeOnArm(tile, side){
  if(side==='open'){
    if(isDouble(tile)) board.spinnerTile=tile;
    else board.spinnerArms.right.push(tile);
    return true;
  }
  if(!board.spinnerTile && isDouble(tile) && (side==='left'||side==='right')){
    makeSpinner(tile, side);
    return true;
  }
  const end=openEnds().find(item=>item.side===side);
  if(!end || (tile[0]!==end.value&&tile[1]!==end.value)) return false;
  if(!board.spinnerTile){
    const line=lineTiles();
    if(side==='left') line.unshift(orientLeft(tile,end.value));
    else line.push(orientOut(tile,end.value));
    return true;
  }
  board.spinnerArms[side].push(orientOut(tile,end.value));
  return true;
}

function removeTile(hand,tile){const i=hand.indexOf(tile);if(i>=0)hand.splice(i,1)}
function commitPlay(hand,tile,side){
  if(!placeOnArm(tile,side)) return false;
  removeTile(hand,tile); passes=0; pending=null; armChooser.hidden=true; armChooser.innerHTML=''; return true;
}

function requestArm(tile){
  const sides=legalSides(tile);
  if(sides.length===0){log('Illegal tile.');return}
  if(sides.length===1){playTile(tile,sides[0]);return}
  pending={tile};
  armChooser.hidden=false;
  armChooser.innerHTML='<span>Choose arm</span>'+sides.map(side=>'<button type="button" data-arm="'+side+'">'+side+'</button>').join('');
}

function playTile(tile,side){
  if(turn!==0&&!activeLocal())return;
  const hand=hands[turn];
  if(!tile||!commitPlay(hand,tile,side)){log('Illegal tile.');return}
  log(seatName(turn)+' played on '+side+'.');
  if(!hand.length){finish(turn);return}
  advance();
}

function chooseCpuMove(hand){
  for(const tile of hand){
    const sides=legalSides(tile);
    if(sides.length) return {tile,side:sides.find(s=>s==='top'||s==='bottom')||sides[0]};
  }
  return null;
}

function advance(){turn=(turn+1)%playerCount;render();if(turn!==0&&!activeLocal())scheduleCpu()}
function finish(winner){scores[winner]++;if(winner===0&&window.Play3DPoints)window.Play3DPoints.award('dominoes',125,'round_win');scoreText.textContent=scores.slice(0,playerCount).map((s,i)=>seatName(i)+': '+s).join(' / ');turnText.textContent=seatName(winner)+' WINS';render()}
function scheduleCpu(){turnText.textContent='OPPONENT THINKING...';setTimeout(cpuTurn,thinkDelay())}
function cpuTurn(){
  if(turn===0||activeLocal())return;
  const hand=hands[turn];
  const move=chooseCpuMove(hand);
  if(move){commitPlay(hand,move.tile,move.side);log(seatName(turn)+' played on '+move.side+'.')}
  else if(stock.length){hand.push(stock.pop());log(seatName(turn)+' drew.');if(chooseCpuMove(hand))return scheduleCpu()}
  else{passes++;log(seatName(turn)+' passed.')}
  if(!hand.length){finish(turn);return}
  if(passes>=playerCount){turnText.textContent='BLOCKED ROUND';render();return}
  advance();
}
function drawTile(){if(turn!==0&&!activeLocal())return;if(stock.length){hands[turn].push(stock.pop());log(seatName(turn)+' drew.');render()}}
function passTurn(){if(turn!==0&&!activeLocal())return;if(canPlay(turn)){log('Play a legal tile if you can.');return}passes++;advance()}
function tileHTML(tile,index,cls){return `<button class="tile ${cls||''}" data-i="${index}"><span>${tile[0]}</span><i></i><span>${tile[1]}</span></button>`}
function backs(count){return Array.from({length:count},()=>'<span class="tile-back"></span>').join('')}

function renderBoard(){
  if(board.spinnerTile){
    const arm=side=>board.spinnerArms[side].map((tile,i)=>tileHTML(tile,i,'branch '+side+'-arm')).join('');
    chainEl.className='chain spinner-board';
    chainEl.innerHTML='<div class="branch-line top-branch">'+arm('top')+'</div><div class="line-row">'+arm('left')+tileHTML(board.spinnerTile,0,'spinner')+arm('right')+'</div><div class="branch-line bottom-branch">'+arm('bottom')+'</div>';
    return;
  }
  chainEl.className='chain';
  chainEl.innerHTML=lineTiles().map((tile,i)=>tileHTML(tile,i,'')).join('');
}

function render(){
  renderBoard();
  const hand=hands[turn===0||activeLocal()?turn:0]||[];
  handEl.innerHTML=hand.map((tile,i)=>tileHTML(tile,i,legal(tile)?'':'disabled')).join('');
  document.querySelectorAll('#hand .tile').forEach(btn=>btn.onclick=()=>requestArm(hand[+btn.dataset.i]));
  scoreText.textContent=scores.slice(0,playerCount).map((s,i)=>seatName(i)+': '+s).join(' / ');
  if(turnText.textContent!=='OPPONENT THINKING...')turnText.textContent=turn===0?'YOUR TURN':(activeLocal()?seatName(turn)+' TURN':'CPU TURN');
  [['.bottom-seat',0],['.top-seat',1],['.left-seat',2],['.right-seat',3]].forEach(([sel,i])=>{
    const el=document.querySelector(sel);
    if(el)el.innerHTML=i<playerCount?'<b>'+seatName(i)+'</b><small>'+((hands[i]||[]).length)+' tiles</small><div class="seat-backs">'+backs(Math.min(7,(hands[i]||[]).length))+'</div>':'';
  });
  document.querySelectorAll('.playerCountBtn').forEach(btn=>btn.classList.toggle('active',Number(btn.dataset.count)===playerCount));
}
function log(msg){document.getElementById('log').innerHTML='<li>'+msg+'</li>'+document.getElementById('log').innerHTML}

armChooser.addEventListener('click',e=>{const btn=e.target.closest('[data-arm]');if(btn&&pending)playTile(pending.tile,btn.dataset.arm)});
newBtn.onclick=()=>newGame(playerCount);drawBtn.onclick=drawTile;passBtn.onclick=passTurn;
document.querySelectorAll('.playerCountBtn').forEach(btn=>btn.onclick=()=>newGame(Number(btn.dataset.count)));
window.addEventListener('play3d:modechange',event=>{mode=event.detail.mode;newGame(mode==='cpu'?2:4)});
newGame(2);
})();
