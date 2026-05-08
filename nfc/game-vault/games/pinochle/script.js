
(()=>{
const suits=['♠','♥','♦','♣'], ranks=['A','10','K','Q','J','9'], val={'9':1,'J':2,'Q':3,'K':4,'10':5,'A':6};
let deck=[],hand=[],bot=[],trump='♠',trick=[],creditsVal=1000,betVal=25,active=false,points=0,botPoints=0;
function mk(){deck=[];for(let copy=0;copy<2;copy++)for(const s of suits)for(const r of ranks)deck.push({r,s});deck.sort(()=>Math.random()-.5)}
function html(c,i){let play=active&&legal(i);return `<button class="card ${c.s==='♥'||c.s==='♦'?'red':''} ${play?'playable':''}" data-i="${i}">${c.r}<br>${c.s}</button>`}
function meld(h){let score=0;for(const s of suits){let has=r=>h.some(c=>c.s===s&&c.r===r);if(has('K')&&has('Q'))score+=s===trump?40:20}if(h.some(c=>c.r==='Q'&&c.s==='♠')&&h.some(c=>c.r==='J'&&c.s==='♦'))score+=40;return score}
function legal(i){if(!trick.length)return true;let lead=trick[0].s;return hand[i].s===lead||!hand.some(c=>c.s===lead)}
function beats(a,b,lead){if(a.s===trump&&b.s!==trump)return true;if(a.s!==trump&&b.s===trump)return false;if(a.s===b.s)return val[a.r]>val[b.r];return a.s===lead&&b.s!==lead}
function botPick(){let lead=trick[0]?.s;let choices=lead?bot.filter(c=>c.s===lead):bot;if(!choices.length)choices=bot;choices.sort((a,b)=>val[a.r]-val[b.r]);let c=choices[0];bot.splice(bot.indexOf(c),1);return c}
function play(i){if(!active||!legal(i))return;let pc=hand.splice(i,1)[0],bc=botPick(),lead=pc.s;let win=!beats(bc,pc,lead);let trickPts=(val[pc.r]>=5?10:0)+(val[bc.r]>=5?10:0);if(win)points+=trickPts;else botPoints+=trickPts;result.textContent=`You ${pc.r}${pc.s} / Bot ${bc.r}${bc.s} — ${win?'YOU TAKE TRICK':'BOT TAKES TRICK'}`;if(!hand.length)finish();render()}
function finish(){active=false;let total=points+meld(hand),btotal=botPoints+meld(bot);let win=points>=botPoints;let pay=win?betVal*3:0;if(pay)creditsVal+=pay;result.textContent=(win?'PINOCHLE WIN +'+pay:'BOT WINS')+` | Trick points ${points}-${botPoints}`}
function deal(){if(active)return;if(creditsVal<betVal){result.textContent='NOT ENOUGH CREDITS';return}creditsVal-=betVal;mk();trump=suits[Math.floor(Math.random()*4)];hand=deck.splice(0,12);bot=deck.splice(0,12);points=meld(hand);botPoints=meld(bot);active=true;result.textContent=`Trump is ${trump}. Your starting meld: ${points}. Play tricks.`;render()}
function render(){credits.textContent=creditsVal;bet.textContent=betVal;mainScore.textContent=creditsVal;playArea.innerHTML=`<div class="scorebox"><span>Trump: ${trump}</span><span>Your points: ${points}</span><span>Bot points: ${botPoints}</span><span>Cards: ${hand.length}</span></div>`+hand.map(html).join('');document.querySelectorAll('#playArea .card').forEach(b=>b.onclick=()=>play(+b.dataset.i));actionBtn.textContent=active?'PLAY A CARD':'DEAL';stateText.textContent=active?'PLAY':'READY'}
actionBtn.onclick=deal;newBtn.onclick=()=>{active=false;hand=[];bot=[];result.textContent='READY';render()};betUp.onclick=()=>{if(!active&&betVal<500)betVal+=25;render()};betDown.onclick=()=>{if(!active&&betVal>25)betVal-=25;render()};render();
})();
