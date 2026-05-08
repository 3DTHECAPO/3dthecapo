(()=>{

let deck=[];
let player=[];
let dealer=[];
let credits=1000;
let betAmount=50;
let live=false;

const suits=['♠','♥','♦','♣'];
const ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function makeDeck(){
deck=[];
for(let d=0;d<4;d++){
for(const s of suits){
for(const r of ranks){
deck.push({r,s});
}
}
}
deck.sort(()=>Math.random()-.5);
}

function value(hand){
let total=0;
let aces=0;

hand.forEach(card=>{
if(card.r==='A'){
aces++;
total+=11;
}
else if(['K','Q','J'].includes(card.r)){
total+=10;
}
else{
total+=Number(card.r);
}
});

while(total>21 && aces>0){
total-=10;
aces--;
}

return total;
}

function cardHTML(card,hidden=false){

if(hidden){
return '<div class="card back">3D</div>';
}

const red = card.s==='♥' || card.s==='♦';

return `
<div class="card ${red?'red':''}">
${card.r}<br>${card.s}
</div>
`;
}

function render(showDealer=false){

document.getElementById('playerHand').innerHTML =
player.map(c=>cardHTML(c)).join('');

document.getElementById('dealerHand').innerHTML =
dealer.map((c,i)=>!showDealer && i===1 ? cardHTML(c,true) : cardHTML(c)).join('');

document.getElementById('playerTotal').textContent =
'Total: '+value(player);

document.getElementById('dealerTotal').textContent =
showDealer ? 'Total: '+value(dealer) : 'Total: ?';

document.getElementById('credits').textContent=credits;
document.getElementById('creditsText').textContent=credits;
document.getElementById('bet').textContent=betAmount;
document.getElementById('stateText').textContent=live?'LIVE':'READY';
}

function deal(){

if(credits<betAmount){
setResult('Not enough credits');
return;
}

makeDeck();

player=[deck.pop(),deck.pop()];
dealer=[deck.pop(),deck.pop()];

credits-=betAmount;
live=true;

setResult('Hand started');
render(false);

if(value(player)===21){
stand();
}
}

function hit(){

if(!live)return;

player.push(deck.pop());

if(value(player)>21){
live=false;
setResult('Bust');
render(true);
return;
}

render(false);
}

function stand(){

if(!live)return;

while(value(dealer)<17){
dealer.push(deck.pop());
}

const pv=value(player);
const dv=value(dealer);

if(dv>21 || pv>dv){
credits+=betAmount*2;
setResult('You win');
}
else if(pv===dv){
credits+=betAmount;
setResult('Push');
}
else{
setResult('Dealer wins');
}

live=false;
render(true);
}

function doubleDown(){

if(!live)return;

if(credits<betAmount){
setResult('Not enough credits');
return;
}

credits-=betAmount;
betAmount*=2;

player.push(deck.pop());

if(value(player)>21){
live=false;
setResult('Bust');
render(true);
}
else{
stand();
}

betAmount=50;
render(true);
}

function setResult(text){
document.getElementById('result').textContent=text;
document.getElementById('stateText').textContent=text.toUpperCase();
}

document.getElementById('dealBtn').onclick=deal;
document.getElementById('hitBtn').onclick=hit;
document.getElementById('standBtn').onclick=stand;
document.getElementById('doubleBtn').onclick=doubleDown;

render(true);

})();