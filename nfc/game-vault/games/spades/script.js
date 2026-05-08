(()=>{

const suits=['♠','♥','♦','♣'];
const ranks=['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
const power = r => 14 - ranks.indexOf(r);
const seats=['south','west','north','east'];
const team={south:'NS',north:'NS',west:'EW',east:'EW'};

let hands={};
let turn='south';
let trick=[];
let score={NS:0,EW:0};
let spadesBroken=false;

function buildDeck(){
let deck=[];
for(const s of suits){
for(const r of ranks){
deck.push({r,s,id:r+s+Math.random()});
}
}
deck.sort(()=>Math.random()-.5);
return deck;
}

function deal(){
const deck=buildDeck();
hands={south:[],west:[],north:[],east:[]};

for(let i=0;i<52;i++){
hands[seats[i%4]].push(deck[i]);
}

for(const seat of seats){
hands[seat].sort(sortCards);
}

turn='south';
trick=[];
spadesBroken=false;
log('New hand dealt.');
render();
}

function sortCards(a,b){
return suits.indexOf(a.s)-suits.indexOf(b.s) || ranks.indexOf(a.r)-ranks.indexOf(b.r);
}

function legalCards(seat){
const hand=hands[seat]||[];

if(!trick.length){
if(!spadesBroken){
const nonSpades=hand.filter(c=>c.s!=='♠');
if(nonSpades.length)return nonSpades;
}
return hand;
}

const lead=trick[0].card.s;
const follow=hand.filter(c=>c.s===lead);

return follow.length ? follow : hand;
}

function play(seat,card){

if(seat!==turn)return;

const legal=legalCards(seat);

if(!legal.some(c=>c.id===card.id)){
log('Follow suit if you can.');
return;
}

hands[seat]=hands[seat].filter(c=>c.id!==card.id);
trick.push({seat,card});

if(card.s==='♠')spadesBroken=true;

if(trick.length===4){
finishTrick();
return;
}

turn=seats[(seats.indexOf(turn)+1)%4];
render();

if(turn!=='south'){
setTimeout(botTurn,600);
}
}

function botTurn(){
const legal=legalCards(turn);
let card;

if(trick.length===3){
card=[...legal].sort((a,b)=>power(b.r)-power(a.r))[0];
}
else{
card=[...legal].sort((a,b)=>power(a.r)-power(b.r))[0];
}

play(turn,card);
}

function winner(){
let best=trick[0];

for(const t of trick.slice(1)){
if(t.card.s===best.card.s && power(t.card.r)>power(best.card.r)){
best=t;
}
if(t.card.s==='♠' && best.card.s!=='♠'){
best=t;
}
}

return best.seat;
}

function finishTrick(){
const win=winner();
score[team[win]]++;

log(seatName(win)+' won the trick.');

turn=win;
trick=[];

if((hands.south||[]).length===0){
log('Hand over.');
turnText.textContent='HAND OVER';
render();
return;
}

render();

if(turn!=='south'){
setTimeout(botTurn,700);
}
}

function render(){
renderHand();
renderTrick();
scoreText.textContent=score.NS+' - '+score.EW;
turnText.textContent=turn==='south'?'YOUR TURN':seatName(turn)+' TURN';
stateText.textContent=spadesBroken?'SPADES BROKEN':'LIVE';
}

function cardHTML(card,index,disabled=false){
const red=card.s==='♥'||card.s==='♦';
return `
<button class="card ${red?'red':''} ${disabled?'disabled':''}" data-i="${index}">
${card.r}<br>${card.s}
</button>
`;
}

function renderHand(){
const hand=hands.south||[];
const legal=legalCards('south').map(c=>c.id);

document.getElementById('hand').innerHTML=
hand.map((card,i)=>cardHTML(card,i,!legal.includes(card.id))).join('');

document.querySelectorAll('#hand .card').forEach(btn=>{
btn.onclick=()=>{
play('south',hand[+btn.dataset.i]);
};
});
}

function renderTrick(){
document.getElementById('trickArea').innerHTML =
trick.map(t=>{
const red=t.card.s==='♥'||t.card.s==='♦';
return `
<div class="played-card">
<span>${seatName(t.seat)}</span>
<div class="card ${red?'red':''}">
${t.card.r}<br>${t.card.s}
</div>
</div>
`;
}).join('');
}

function seatName(seat){
return {
south:'You',
north:'North',
east:'East',
west:'West'
}[seat];
}

function log(msg){
document.getElementById('log').innerHTML =
'<li>'+msg+'</li>' +
document.getElementById('log').innerHTML;
}

document.getElementById('newBtn').onclick=deal;
document.getElementById('autoBtn').onclick=()=>{
if(turn==='south'){
const card=legalCards('south')[0];
if(card)play('south',card);
}
};

deal();

})();


/* PLAY3D V10 spades bridge */
(function(){
  if(!window.PLAY3D_SYNC || !window.PLAY3D_SYNC.enabled) return;
  function snap(action){
    window.PLAY3D_SYNC.sendGameEvent('spades_state', {
      action,
      score: document.getElementById('mainScore')?.textContent || '',
      state: document.getElementById('stateText')?.textContent || ''
    });
  }
  document.addEventListener('click', function(e){
    if(e.target.closest('.card') || ['dealBtn','autoBtn'].includes(e.target.id)){
      setTimeout(()=>snap(e.target.id || 'card_play'), 60);
    }
  });
  window.PLAY3D_SYNC.onGameEvent('spades_state', function(msg){
    if(!msg || msg.playerId === window.PLAY3D_SYNC.playerId) return;
    const s = document.getElementById('stateText');
    if(s) s.textContent = 'REMOTE ' + ((msg.payload && msg.payload.action) || 'PLAY');
  });
})();

