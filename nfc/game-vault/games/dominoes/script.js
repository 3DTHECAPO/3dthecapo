(()=>{
'use strict';

const PIPS = ['','●','●●','●●●','●●●●','●●●●●','●●●●●●'];

let stock=[];
let hands=[];
let playerNames=[];
let playerCount=4;
let currentPlayer=0;
let chain=[];
let spinner=null;
let logLines=[];
let mode=window.Play3DModeBar ? window.Play3DModeBar.getMode() : 'cpu';

const chainEl=document.getElementById('chain');
const handEl=document.getElementById('hand');
const scoreText=document.getElementById('scoreText');
const turnText=document.getElementById('turnText');

function buildStock(){
  stock=[];
  for(let a=0;a<=6;a++){
    for(let b=a;b<=6;b++){
      stock.push({a,b,id:a+'-'+b+'-'+Math.random().toString(36).slice(2),double:a===b});
    }
  }
  stock.sort(()=>Math.random()-.5);
}

function setupPlayers(){
  playerCount = mode === 'local' || mode === 'fan' ? 4 : 2;
  playerNames = playerCount===4 ? ['YOU','LEFT','PARTNER','RIGHT'] : ['YOU','CPU'];
  hands = Array.from({length:playerCount},()=>stock.splice(0,7));
}

function newGame(){
  buildStock();
  setupPlayers();
  chain=[];
  spinner=null;
  currentPlayer=0;
  logLines=[];
  addLog((playerCount===4?'4 Player ':'2 Player ')+'dominoes started.');
  render();
}

function openEnds(){
  if(!chain.length) return [];
  const first = chain[0];
  const last = chain[chain.length-1];
  const ends = [
    {side:'left', value:first.left},
    {side:'right', value:last.right}
  ];
  if(spinner){
    if(spinner.top === null) ends.push({side:'top', value:spinner.tile.a});
    if(spinner.bottom === null) ends.push({side:'bottom', value:spinner.tile.a});
  }
  return ends;
}

function orientTile(tile, side){
  const t={...tile, side, sideways:tile.double, left:tile.a, right:tile.b};
  const ends=openEnds();
  const end=ends.find(e=>e.side===side);
  if(!end || !chain.length) return t;

  if(side==='left'){
    if(tile.b===end.value){ t.left=tile.a; t.right=tile.b; }
    else { t.left=tile.b; t.right=tile.a; }
  }else if(side==='right'){
    if(tile.a===end.value){ t.left=tile.a; t.right=tile.b; }
    else { t.left=tile.b; t.right=tile.a; }
  }
  return t;
}

function legalPlacements(tile){
  if(!chain.length) return ['center'];
  return openEnds().filter(e=>tile.a===e.value || tile.b===e.value).map(e=>e.side);
}

function activeHand(){
  return hands[currentPlayer] || [];
}

function playTile(handIndex, preferredSide){
  const hand=activeHand();
  const tile=hand[handIndex];
  if(!tile) return;
  const sides=legalPlacements(tile);
  if(!sides.length){ addLog('That tile does not fit.'); render(); return; }
  const side = preferredSide && sides.includes(preferredSide) ? preferredSide : sides[0];

  hand.splice(handIndex,1);

  if(!chain.length){
    const placed={...tile, side:'spinner', sideways:tile.double, left:tile.a, right:tile.b};
    chain.push(placed);
    if(tile.double){
      spinner={tile:placed, top:null, bottom:null};
      addLog('First double is the SPINNER. Four-way play is open.');
    }else{
      addLog(playerNames[currentPlayer]+' started the chain.');
    }
  }else if(side==='left'){
    chain.unshift(orientTile(tile,'left'));
  }else if(side==='right'){
    chain.push(orientTile(tile,'right'));
  }else if(side==='top' && spinner){
    spinner.top=orientTile(tile,'top');
  }else if(side==='bottom' && spinner){
    spinner.bottom=orientTile(tile,'bottom');
  }

  if(!hand.length){
    addLog(playerNames[currentPlayer]+' went out.');
    render();
    return;
  }

  nextTurn();
}

function drawTile(){
  if(!stock.length){ addLog('Boneyard empty.'); return; }
  activeHand().push(stock.pop());
  addLog(playerNames[currentPlayer]+' drew.');
  render();
}

function passTurn(){
  addLog(playerNames[currentPlayer]+' passed.');
  nextTurn();
}

function nextTurn(){
  currentPlayer=(currentPlayer+1)%playerCount;
  render();
  if(mode==='cpu' && currentPlayer!==0) setTimeout(cpuTurn,500);
}

function cpuTurn(){
  const hand=activeHand();
  const idx=hand.findIndex(t=>legalPlacements(t).length);
  if(idx>=0) playTile(idx);
  else if(stock.length) drawTile(), setTimeout(cpuTurn,350);
  else passTurn();
}

function tileHTML(tile, extra=''){
  return `<div class="domino ${tile.double?'double sideways':''} ${extra}">
    <span>${PIPS[tile.left ?? tile.a] || tile.a}</span>
    <i></i>
    <span>${PIPS[tile.right ?? tile.b] || tile.b}</span>
  </div>`;
}

function renderChain(){
  const top = spinner && spinner.top ? tileHTML(spinner.top,'branch top-branch') : '';
  const bottom = spinner && spinner.bottom ? tileHTML(spinner.bottom,'branch bottom-branch') : '';
  chainEl.innerHTML = `<div class="spinner-branches">${top}<div class="main-chain">${chain.map(t=>tileHTML(t,t.side==='spinner'?'spinner-tile':'')).join('')}</div>${bottom}</div>`;
}

function renderHand(){
  const legalInfo = activeHand().map(legalPlacements);
  handEl.innerHTML = activeHand().map((t,i)=>{
    const legal = legalInfo[i].length>0;
    return `<button class="domino-btn ${legal?'':'disabled'}" data-i="${i}" ${legal?'':'disabled'}>${tileHTML({...t,left:t.a,right:t.b})}<small>${legal?legalInfo[i].join('/'):'NO FIT'}</small></button>`;
  }).join('');
  handEl.querySelectorAll('[data-i]').forEach(btn=>{
    btn.onclick=()=>playTile(Number(btn.dataset.i));
  });
}

function addLog(msg){
  logLines.unshift(msg);
  logLines=logLines.slice(0,8);
  const log=document.getElementById('log');
  if(log) log.innerHTML=logLines.map(x=>'<li>'+x+'</li>').join('');
}

function score(){
  return hands.map(h=>h.reduce((sum,t)=>sum+t.a+t.b,0));
}

function render(){
  renderChain();
  renderHand();
  const scores=score();
  if(scoreText) scoreText.textContent = playerNames.map((n,i)=>n+': '+scores[i]).join(' | ');
  if(turnText) turnText.textContent = playerNames[currentPlayer] + ' TURN';
}

document.getElementById('newBtn').onclick=newGame;
document.getElementById('drawBtn').onclick=drawTile;
document.getElementById('passBtn').onclick=passTurn;
window.addEventListener('play3d:modechange', event=>{
  mode=event.detail.mode;
  newGame();
});

newGame();
})();
