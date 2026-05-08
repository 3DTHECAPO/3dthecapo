(()=>{
let deck=[],player=[],dealer=[],credits=1000,betAmount=50,activeBet=0,live=false;
const suits=['♠','♥','♦','♣'], ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const $=id=>document.getElementById(id);
function makeDeck(){deck=[];for(let d=0;d<4;d++)for(const s of suits)for(const r of ranks)deck.push({r,s});deck.sort(()=>Math.random()-.5)}
function value(hand){let total=0,aces=0;hand.forEach(c=>{if(c.r==='A'){aces++;total+=11}else if(['K','Q','J'].includes(c.r))total+=10;else total+=Number(c.r)});while(total>21&&aces){total-=10;aces--}return total}
function cardHTML(c,hidden=false){if(hidden)return '<div class="card back">3D</div>';return `<div class="card ${c.s==='♥'||c.s==='♦'?'red':''}">${c.r}<br>${c.s}</div>`}
function setResult(t){$('result').textContent=t;$('stateText').textContent=t.toUpperCase()}
function render(showDealer=false){$('playerHand').innerHTML=player.map(c=>cardHTML(c)).join('');$('dealerHand').innerHTML=dealer.map((c,i)=>!showDealer&&i===1?cardHTML(c,true):cardHTML(c)).join('');$('playerTotal').textContent='Total: '+value(player);$('dealerTotal').textContent=showDealer?'Total: '+value(dealer):'Total: ?';$('credits').textContent=credits;$('creditsText').textContent=credits;$('bet').textContent=live?activeBet:betAmount;}
function deal(){if(live)return;if(credits<betAmount){setResult('Not enough credits');return}makeDeck();player=[deck.pop(),deck.pop()];dealer=[deck.pop(),deck.pop()];activeBet=betAmount;credits-=activeBet;live=true;setResult('Hand started');render(false);if(value(player)===21)stand()}
function hit(){if(!live)return;player.push(deck.pop());if(value(player)>21){live=false;setResult('Bust');render(true);return}render(false)}
function stand(){if(!live)return;while(value(dealer)<17)dealer.push(deck.pop());const pv=value(player),dv=value(dealer);if(dv>21||pv>dv){credits+=activeBet*2;setResult('You win')}else if(pv===dv){credits+=activeBet;setResult('Push')}else setResult('Dealer wins');live=false;activeBet=0;render(true)}
function doubleDown(){if(!live)return;if(credits<activeBet){setResult('Not enough credits');return}credits-=activeBet;activeBet*=2;player.push(deck.pop());if(value(player)>21){live=false;setResult('Bust');activeBet=0;render(true)}else stand()}
$('dealBtn').onclick=deal;$('hitBtn').onclick=hit;$('standBtn').onclick=stand;$('doubleBtn').onclick=doubleDown;
$('raiseBetBtn').onclick=()=>{if(!live&&betAmount<500){betAmount+=25;render(true)}};$('lowerBetBtn').onclick=()=>{if(!live&&betAmount>25){betAmount-=25;render(true)}};
setResult('Ready');render(true);
})();