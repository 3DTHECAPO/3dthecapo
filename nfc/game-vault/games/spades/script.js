
(()=>{
const suits=['♠','♥','♦','♣'],ranks=['A','K','Q','J','10','9','8','7','6','5','4','3','2'],rv=Object.fromEntries(ranks.map((r,i)=>[r,14-i]));let deck=[],hand=[],bot=[],creditsVal=1000,betVal=25,active=false,you=0,ai=0,lead=null;
function mk(){deck=[];for(const s of suits)for(const r of ranks)deck.push({r,s,id:r+s+Math.random()});for(let i=deck.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}}
function card(c,i){return `<button class="card ${c.s==='♥'||c.s==='♦'?'red':''}" data-i="${i}">${c.r}<br>${c.s}</button>`}
function legal(c){if(!lead)return true;if(c.s===lead)return true;return !hand.some(x=>x.s===lead)}
function wins(a,b){if(a.s==='♠'&&b.s!=='♠')return true;if(a.s!== '♠'&&b.s==='♠')return false;if(a.s===b.s)return rv[a.r]>rv[b.r];return true}
function ui(){credits.textContent=creditsVal;bet.textContent=betVal;mainScore.textContent=creditsVal;stateText.textContent=active?'LIVE':'READY'}
function render(msg){playArea.innerHTML=hand.map(card).join('');playArea.querySelectorAll('button').forEach(b=>b.onclick=()=>play(+b.dataset.i));result.textContent=msg||`Tricks You ${you} / Bot ${ai}`;ui()}
function start(){if(active)return;if(creditsVal<betVal){result.textContent='NOT ENOUGH CREDITS';return}creditsVal-=betVal;mk();hand=deck.splice(0,13).sort((a,b)=>suits.indexOf(a.s)-suits.indexOf(b.s)||rv[b.r]-rv[a.r]);bot=deck.splice(0,13);you=0;ai=0;lead=null;active=true;render('Play a card. Must follow suit when possible. Spades trump.')}
function play(i){if(!active)return;let pc=hand[i];if(!legal(pc)){render('Must follow suit if you have it.');return}hand.splice(i,1);lead=pc.s;let choices=bot.filter(c=>c.s===lead);let bc=(choices[0]||bot[0]);bot.splice(bot.indexOf(bc),1);if(wins(pc,bc))you++;else ai++;lead=null;if(!hand.length){active=false;let won=you>ai;if(won)creditsVal+=betVal*2;render((won?'YOU WIN ':'BOT WINS ')+`${you}-${ai}`);return}render(`You played ${pc.r}${pc.s}, bot played ${bc.r}${bc.s}. Score ${you}-${ai}`)}
actionBtn.onclick=start;newBtn.onclick=()=>{active=false;hand=[];render('READY')};betUp.onclick=()=>{if(!active&&betVal<500){betVal+=25;ui()}};betDown.onclick=()=>{if(!active&&betVal>25){betVal-=25;ui()}};ui();
})();
