(()=>{

let stock=[];
let player=[];
let cpu=[];
let chain=[];
let scores={you:0,cpu:0};
let turn='you';
let mode=window.Play3DModeBar ? window.Play3DModeBar.getMode() : 'cpu';

const chainEl=document.getElementById('chain');
const handEl=document.getElementById('hand');

function buildStock(){
stock=[];
for(let a=0;a<=6;a++){
for(let b=a;b<=6;b++){
stock.push([a,b]);
}
}
stock.sort(()=>Math.random()-.5);
}

function newGame(){
buildStock();
player=stock.splice(0,7);
cpu=stock.splice(0,7);
chain=[];
turn='you';
log(mode==='local' ? 'Local 2 Player game started.' : 'New game started.');
render();
}

function ends(){
if(!chain.length) return null;
return [chain[0][0],chain[chain.length-1][1]];
}

function legal(tile){
const e=ends();
if(!e) return true;

return (
tile[0]===e[0]||
tile[1]===e[0]||
tile[0]===e[1]||
tile[1]===e[1]
);
}

function activeHand(){
return mode==='local' && turn==='cpu' ? cpu : player;
}

function place(arr,tile){
const e=ends();

if(!e){
chain.push(tile);
}
else if(tile[1]===e[0]){
chain.unshift(tile);
}
else if(tile[0]===e[0]){
chain.unshift([tile[1],tile[0]]);
}
else if(tile[0]===e[1]){
chain.push(tile);
}
else if(tile[1]===e[1]){
chain.push([tile[1],tile[0]]);
}
else{
return false;
}

arr.splice(arr.indexOf(tile),1);
return true;
}

function play(tile){

if(turn!=='you' && mode!=='local') return;

const currentHand=activeHand();
if(!place(currentHand,tile)){
log('Illegal tile.');
return;
}

const currentSide=turn;
turn=currentSide==='you'?'cpu':'you';

if(!currentHand.length){
if(currentSide==='you'){
scores.you++;
if(window.Play3DPoints) window.Play3DPoints.award('dominoes', 250, 'round_win');
scoreText.textContent=scores.you+' - '+scores.cpu;
turnText.textContent='YOU WIN';
render();
return;
}
scores.cpu++;
if(mode==='local' && window.Play3DPoints) window.Play3DPoints.award('dominoes', 150, 'local_round_complete');
scoreText.textContent=scores.you+' - '+scores.cpu;
turnText.textContent=mode==='local'?'PLAYER 2 WINS':'CPU WINS';
render();
return;
}

render();

if(mode==='local') {
log(turn==='cpu' ? 'Player 2 turn.' : 'Player 1 turn.');
} else {
setTimeout(cpuTurn,700);
}
}

function cpuTurn(){

let move=cpu.find(legal);

if(move){
place(cpu,move);
log('CPU played.');
}
else if(stock.length){
cpu.push(stock.pop());
log('CPU drew.');
}
else{
log('CPU passed.');
}

if(!cpu.length){
scores.cpu++;
scoreText.textContent=scores.you+' - '+scores.cpu;
turnText.textContent='CPU WINS';
render();
return;
}

turn='you';
render();
}

function drawTile(){
if(turn!=='you' && mode!=='local') return;

if(stock.length){
activeHand().push(stock.pop());
log(turn==='cpu' ? 'Player 2 drew.' : 'You drew.');
render();
}
}

function passTurn(){
if(turn!=='you' && mode!=='local') return;
if(mode==='local'){
turn=turn==='you'?'cpu':'you';
log(turn==='cpu' ? 'Player 2 turn.' : 'Player 1 turn.');
render();
} else {
turn='cpu';
cpuTurn();
}
}

function tileHTML(tile,index){
return `
<button class="tile" data-i="${index}">
<span>${tile[0]}</span>
<i></i>
<span>${tile[1]}</span>
</button>
`;
}

function render(){

chainEl.innerHTML=chain.map(tileHTML).join('');
const hand=activeHand();
handEl.innerHTML=hand.map(tileHTML).join('');

document.querySelectorAll('#hand .tile').forEach(btn=>{
btn.onclick=()=>{
play(hand[+btn.dataset.i]);
};
});

scoreText.textContent=scores.you+' - '+scores.cpu;
turnText.textContent=turn==='you'?'YOUR TURN':(mode==='local'?'PLAYER 2 TURN':'CPU TURN');
}

function log(msg){
document.getElementById('log').innerHTML =
'<li>'+msg+'</li>' +
document.getElementById('log').innerHTML;
}

newBtn.onclick=newGame;
drawBtn.onclick=drawTile;
passBtn.onclick=passTurn;
window.addEventListener('play3d:modechange', event=>{
mode=event.detail.mode;
newGame();
});

newGame();

})();
