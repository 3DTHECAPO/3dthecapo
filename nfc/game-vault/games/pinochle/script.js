
(()=>{
const suits=['♠','♥','♦','♣'],ranks=['A','10','K','Q','J','9'],val={A:11,'10':10,K:4,Q:3,J:2,'9':0};let deck=[],hand=[],bot=[],trump='♠',creditsVal=1000,betVal=25,active=false,playerPts=0,botPts=0;
function mk(){deck=[];for(let copy=0;copy<2;copy++)for(const s of suits)for(const r of ranks)deck.push({r,s,id:r+s+copy+Math.random()});for(let i=deck.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}}
function card(c,i){return `<button class="card ${c.s==='♥'||c.s==='♦'?'red':''}" data-i="${i}">${c.r}<br>${c.s}</button>`}
function meld(h){let pts=0;for(const s of suits){let has=r=>h.some(c=>c.s===s&&c.r===r);if(['A','10','K','Q','J'].every(has))pts+= s===trump?150:15;if(has('K')&&has('Q'))pts+= s===trump?40:20}let qS=h.some(c=>c.s==='♠'&&c.r==='Q'),jD=h.some(c=>c.s==='♦'&&c.r==='J');if(qS&&jD)pts+=40;return pts}
function ui(){credits.textContent=creditsVal;bet.textContent=betVal;mainScore.textContent=creditsVal;stateText.textContent=active?'LIVE':'READY'}
function render(msg){playArea.innerHTML=hand.map(card).join('');playArea.querySelectorAll('button').forEach(b=>b.onclick=()=>play(+b.dataset.i));result.textContent=msg||`Trump ${trump} | You ${playerPts} / Bot ${botPts}`;ui()}
function deal(){if(active)return;if(creditsVal<betVal){result.textContent='NOT ENOUGH CREDITS';return}creditsVal-=betVal;mk();trump=suits[Math.floor(Math.random()*4)];hand=deck.splice(0,12);bot=deck.splice(0,12);playerPts=meld(hand);botPts=meld(bot);active=true;render(`Trump ${trump}. Meld: You ${playerPts}, Bot ${botPts}. Play a card.`)}
function beats(a,b){if(a.s===b.s)return ranks.indexOf(a.r)<ranks.indexOf(b.r);if(a.s===trump&&b.s!==trump)return true;return false}
function play(i){if(!active)return;let pc=hand.splice(i,1)[0];let bi=bot.findIndex(c=>c.s===pc.s);if(bi<0)bi=0;let bc=bot.splice(bi,1)[0];let win=beats(pc,bc);let pts=(val[pc.r]+val[bc.r])*(win?1:0);if(win)playerPts+=pts;else botPts+=val[pc.r]+val[bc.r];if(!hand.length){active=false;let won=playerPts>botPts;if(won)creditsVal+=betVal*2;render((won?'YOU WIN ':'BOT WINS ')+`Final ${playerPts}-${botPts}`);return}render(`${pc.r}${pc.s} vs ${bc.r}${bc.s}. ${win?'You':'Bot'} took trick.`)}
actionBtn.onclick=deal;newBtn.onclick=()=>{active=false;hand=[];render('READY')};betUp.onclick=()=>{if(!active&&betVal<500){betVal+=25;ui()}};betDown.onclick=()=>{if(!active&&betVal>25){betVal-=25;ui()}};ui();
})();
