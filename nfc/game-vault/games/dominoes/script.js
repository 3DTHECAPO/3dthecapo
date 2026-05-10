(()=>{
'use strict';

let stock=[], hands=[], chain=[], scores=[0,0,0,0], turn=0, playerCount=2, passes=0;
let mode=window.Play3DModeBar ? window.Play3DModeBar.getMode() : 'cpu';
const chainEl=document.getElementById('chain');
const handEl=document.getElementById('hand');
function thinkDelay(){return 400+Math.floor(Math.random()*1000)}
function seatName(i){return ['YOU','CPU 1','CPU 2','CPU 3'][i]||'CPU'}
function buildStock(){stock=[];for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)stock.push([a,b]);stock.sort(()=>Math.random()-.5)}
function newGame(){
  mode=window.Play3DModeBar ? window.Play3DModeBar.getMode() : mode;
  playerCount=mode==='cpu'?2:4;
  buildStock(); hands=Array.from({length:playerCount},()=>stock.splice(0,7)); chain=[]; turn=0; passes=0;
  log(playerCount+' player dominoes started. CPU fills empty seats.'); render();
}
function ends(){if(!chain.length)return null;return [chain[0][0],chain[chain.length-1][1]]}
function legal(tile){const e=ends();return !e||tile[0]===e[0]||tile[1]===e[0]||tile[0]===e[1]||tile[1]===e[1]}
function canPlay(i){return (hands[i]||[]).some(legal)}
function activeLocal(){return mode==='local'||mode==='fan'}
function place(arr,tile){
  const e=ends();
  if(!e) chain.push(tile);
  else if(tile[1]===e[0]) chain.unshift(tile);
  else if(tile[0]===e[0]) chain.unshift([tile[1],tile[0]]);
  else if(tile[0]===e[1]) chain.push(tile);
  else if(tile[1]===e[1]) chain.push([tile[1],tile[0]]);
  else return false;
  arr.splice(arr.indexOf(tile),1); passes=0; return true;
}
function advance(){turn=(turn+1)%playerCount; render(); if(turn!==0 && !activeLocal()) scheduleCpu()}
function finish(winner){scores[winner]++; if(winner===0&&window.Play3DPoints)window.Play3DPoints.award('dominoes',125,'round_win'); scoreText.textContent=scores.map((s,i)=>seatName(i)+': '+s).join(' / '); turnText.textContent=seatName(winner)+' WINS'; render()}
function play(tile){
  if(turn!==0 && !activeLocal())return;
  const hand=hands[turn]; if(!tile||!place(hand,tile)){log('Illegal tile.');return}
  log(seatName(turn)+' played.');
  if(!hand.length){finish(turn);return}
  advance();
}
function scheduleCpu(){turnText.textContent='OPPONENT THINKING...';setTimeout(cpuTurn,thinkDelay())}
function cpuTurn(){
  if(turn===0||activeLocal())return;
  const hand=hands[turn]; const move=hand.find(legal);
  if(move){place(hand,move); log(seatName(turn)+' played.')}
  else if(stock.length){hand.push(stock.pop()); log(seatName(turn)+' drew.'); if(hand.find(legal))return scheduleCpu()}
  else{passes++; log(seatName(turn)+' passed.')}
  if(!hand.length){finish(turn);return}
  if(passes>=playerCount){turnText.textContent='BLOCKED ROUND';render();return}
  advance();
}
function drawTile(){if(turn!==0&&!activeLocal())return;if(stock.length){hands[turn].push(stock.pop());log(seatName(turn)+' drew.');render()}}
function passTurn(){if(turn!==0&&!activeLocal())return;if(canPlay(turn)){log('Play a legal tile if you can.');return}passes++;advance()}
function tileHTML(tile,index){return `<button class="tile" data-i="${index}"><span>${tile[0]}</span><i></i><span>${tile[1]}</span></button>`}
function render(){
  chainEl.innerHTML=chain.map(tileHTML).join('');
  const hand=hands[turn===0||activeLocal()?turn:0]||[];
  handEl.innerHTML=hand.map(tileHTML).join('');
  document.querySelectorAll('#hand .tile').forEach(btn=>btn.onclick=()=>play(hand[+btn.dataset.i]));
  scoreText.textContent=scores.slice(0,playerCount).map((s,i)=>seatName(i)+': '+s).join(' / ');
  if(turnText.textContent!=='OPPONENT THINKING...')turnText.textContent=turn===0?'YOUR TURN':(activeLocal()?seatName(turn)+' TURN':'CPU TURN');
  [['.bottom-seat',0],['.top-seat',1],['.left-seat',2],['.right-seat',3]].forEach(([sel,i])=>{const el=document.querySelector(sel);if(el)el.textContent=i<playerCount?seatName(i)+' - '+((hands[i]||[]).length)+' tiles':''});
}
function log(msg){document.getElementById('log').innerHTML='<li>'+msg+'</li>'+document.getElementById('log').innerHTML}
newBtn.onclick=newGame; drawBtn.onclick=drawTile; passBtn.onclick=passTurn;
window.addEventListener('play3d:modechange',event=>{mode=event.detail.mode;newGame()});
newGame();
})();
