(()=>{'use strict';
const suits=['♠','♥','♦','♣'];const ranks=['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
let deck=[],hand=[],cpu=[],discard=[],score=0;
function el(id){return document.getElementById(id)}
function makeDeck(){deck=[];for(const s of suits)for(const r of ranks)deck.push({r,s});deck.sort(()=>Math.random()-.5)}
function ensureUI(){
  let panel=document.querySelector('.table-content')||document.querySelector('.panel')||document.querySelector('.table')||document.body;
  if(!el('hand')){const d=document.createElement('div');d.innerHTML='<div class="row"><button id="newBtn">New Hand</button><button id="drawBtn">Draw</button><button id="playBtn">Play Best</button><button id="backBtn">Back</button></div><h2>Your Hand</h2><div id="hand" class="hand"></div><h2>Discard</h2><div id="discard" class="hand"></div>';panel.appendChild(d)}
}
function cardHTML(c,i){return `<button class="card ${(c.s==='♥'||c.s==='♦')?'red':''}" data-i="${i}">${c.r}${c.s}</button>`}
function render(){ensureUI();el('hand').innerHTML=hand.map(cardHTML).join('');el('discard').innerHTML=discard.slice(-6).map((c,i)=>cardHTML(c,i)).join('');if(el('stateText'))el('stateText').textContent=deck.length?'PLAYING':'DECK EMPTY';if(el('mainScore'))el('mainScore').textContent=score;}
function deal(){makeDeck();hand=deck.splice(0,10);cpu=deck.splice(0,10);discard=[deck.pop()];score=0;render()}
function draw(){if(deck.length)hand.push(deck.pop());render()}
function playBest(){
 if(!hand.length)return;
 // Simple local playable logic: play matching rank/suit to discard, otherwise lowest card.
 const top=discard[discard.length-1];
 let idx=hand.findIndex(c=>c.r===top.r||c.s===top.s);
 if(idx<0)idx=hand.length-1;
 const [c]=hand.splice(idx,1);discard.push(c);score+=10;
 if(!hand.length){if(el('stateText'))el('stateText').textContent='YOU OUT';score+=100}
 render();
}
document.addEventListener('click',e=>{const c=e.target.closest('.card');if(!c||!c.dataset.i)return;const i=Number(c.dataset.i);if(hand[i]){discard.push(hand.splice(i,1)[0]);score+=5;render()}});
ensureUI();document.getElementById('newBtn')?.addEventListener('click',deal);document.getElementById('drawBtn')?.addEventListener('click',draw);document.getElementById('playBtn')?.addEventListener('click',playBest);document.getElementById('backBtn')?.addEventListener('click',()=>location.href='../../index.html');deal();
})();


/* PLAY3D V10 rummy bridge */
(function(){
  if(!window.PLAY3D_SYNC || !window.PLAY3D_SYNC.enabled) return;
  function snap(action){
    window.PLAY3D_SYNC.sendGameEvent('rummy_state', {
      action,
      score: document.getElementById('mainScore')?.textContent || '',
      handCount: document.querySelectorAll('#hand .card').length
    });
  }
  document.addEventListener('click', function(e){
    if(e.target.closest('.card') || ['newBtn','drawBtn','playBtn','backBtn'].includes(e.target.id)){
      setTimeout(()=>snap(e.target.id || 'card_play'), 60);
    }
  });
  window.PLAY3D_SYNC.onGameEvent('rummy_state', function(msg){
    if(!msg || msg.playerId === window.PLAY3D_SYNC.playerId) return;
    const s = document.getElementById('stateText');
    if(s) s.textContent = 'REMOTE ' + ((msg.payload && msg.payload.action) || 'PLAY');
  });
})();

