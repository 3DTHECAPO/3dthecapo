(()=>{
const STARTING_CREDITS=1000;
const BETS=[25,50,100,250,500];
const SYMBOLS=[
{name:'3D Logo',src:'./assets/logo.png',pay:30,weight:3},
{name:'Vault',src:'./assets/vault.png',pay:25,weight:4},
{name:'Crown',src:'./assets/crown.png',pay:20,weight:5},
{name:'Cash',src:'./assets/cash.png',pay:15,weight:7},
{name:'Key',src:'./assets/key.png',pay:12,weight:8},
{name:'Lock',src:'./assets/lock.png',pay:10,weight:9},
{name:'Mic',src:'./assets/mic.png',pay:8,weight:10},
{name:'Hoodie',src:'./assets/hoodie.png',pay:6,weight:12},
{name:'Speaker',src:'./assets/speaker.png',pay:5,weight:14},
{name:'Chain',src:'./assets/chain.png',pay:4,weight:16}
];
let credits=Number(localStorage.getItem('play3d_slots_credits')||STARTING_CREDITS);
let betIndex=0;
let spinning=false;
const $=id=>document.getElementById(id);
const weighted=[]; SYMBOLS.forEach(s=>{for(let i=0;i<s.weight;i++) weighted.push(s)});
function pick(){return weighted[Math.floor(Math.random()*weighted.length)]}
function setReel(el,s){el.src=s.src;el.title=s.name;el.onerror=()=>{el.replaceWith(document.createTextNode(s.name));};}
function update(){ $('credits').textContent=credits; $('mainScore').textContent=credits; $('bet').textContent=BETS[betIndex]; localStorage.setItem('play3d_slots_credits',String(credits));}
function renderPaytable(){ $('paytable').innerHTML='<h3>PAYTABLE</h3>'+SYMBOLS.map(s=>`<div><span><img src="${s.src}" alt=""> ${s.name}</span><b>3X = ${s.pay}x</b></div>`).join('')+'<div><span>Any 2 Match</span><b>3x</b></div>'; }
function spin(){ if(spinning)return; const wager=BETS[betIndex]; if(credits<wager){$('stateText').textContent='NOT ENOUGH CREDITS';return;} spinning=true; credits-=wager; $('lastWin').textContent='0'; $('stateText').textContent='SPINNING'; update(); const reels=[$('r1'),$('r2'),$('r3')]; let ticks=0; const timer=setInterval(()=>{reels.forEach(r=>setReel(r,pick())); ticks++; if(ticks>14){clearInterval(timer); finish(reels,wager);}},70);}
function finish(reels,wager){ const res=[pick(),pick(),pick()]; res.forEach((s,i)=>setReel(reels[i],s)); let win=0; if(res[0].name===res[1].name&&res[1].name===res[2].name){win=wager*res[0].pay; $('stateText').textContent='JACKPOT +'+win;} else if(res[0].name===res[1].name||res[0].name===res[2].name||res[1].name===res[2].name){win=wager*3; $('stateText').textContent='WIN +'+win;} else {$('stateText').textContent='NO WIN';} credits+=win; $('lastWin').textContent=win; spinning=false; update();}
$('plusBet').onclick=()=>{if(betIndex<BETS.length-1)betIndex++;update();};
$('minusBet').onclick=()=>{if(betIndex>0)betIndex--;update();};
$('maxBet').onclick=()=>{betIndex=BETS.length-1;update();};
$('spinBtn').onclick=spin;
renderPaytable(); [$('r1'),$('r2'),$('r3')].forEach((r,i)=>setReel(r,SYMBOLS[i])); update();
})();