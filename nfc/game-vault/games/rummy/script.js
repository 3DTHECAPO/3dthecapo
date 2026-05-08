
const SUITS=['♠','♥','♦','♣'];
const RANKS=['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
const RANK_VALUE={A:14,K:13,Q:12,J:11,'10':10,'9':9,'8':8,'7':7,'6':6,'5':5,'4':4,'3':3,'2':2};
function freshDeck(ranks=RANKS,suits=SUITS,copies=1){let d=[];for(let c=0;c<copies;c++)for(const s of suits)for(const r of ranks)d.push({r,s,id:r+s+'-'+c+'-'+Math.random().toString(36).slice(2)});for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]]}return d;}
function cardHTML(c,extra=''){return `<button class="card ${c.s==='♥'||c.s==='♦'?'red':''} ${extra}" data-id="${c.id||''}"><b>${c.r}</b><br>${c.s}</button>`;}

(()=>{
let deck=[],discard=[],handCards=[],creditsVal=1000,betVal=25,active=false,drawn=false;
function ui(){credits.textContent=creditsVal;bet.textContent=betVal;mainScore.textContent=creditsVal;stateText.textContent=active?'LIVE':'READY'}
function render(msg){playArea.innerHTML=`<div class="pill">Discard: ${discard.length?discard[discard.length-1].r+discard[discard.length-1].s:'—'} | Deck: ${deck.length}</div>`+handCards.map((c,i)=>`<button class="card ${c.s==='♥'||c.s==='♦'?'red':''}" data-i="${i}">${c.r}<br>${c.s}<small>DISCARD</small></button>`).join('');playArea.querySelectorAll('button.card').forEach(b=>b.onclick=()=>discardCard(+b.dataset.i));result.textContent=msg||'Draw, then discard. Make sets/runs.';ui()}
function start(){if(active)return;if(creditsVal<betVal){result.textContent='NOT ENOUGH CREDITS';return}creditsVal-=betVal;deck=freshDeck();handCards=deck.splice(0,10);discard=[deck.pop()];active=true;drawn=false;render('New rummy hand. Press PLAY to draw.')}
function draw(){if(!active){start();return}if(drawn){render('Discard one card before drawing again.');return}if(deck.length)handCards.push(deck.pop());drawn=true;render('Drew a card. Click one card to discard.')}
function discardCard(i){if(!active||!drawn)return;discard.push(handCards.splice(i,1)[0]);drawn=false;let s=score(handCards);if(s>=30){creditsVal+=betVal*3;active=false;render('RUMMY SCORE '+s+' — YOU WIN +'+(betVal*3));}else if(deck.length===0){active=false;render('Deck empty. Score '+s+'. No payout.')}else render('Score '+s+'. Keep building sets/runs.')}
function score(h){let pts=0;let byRank={};h.forEach(c=>(byRank[c.r]??=[]).push(c));Object.values(byRank).forEach(a=>{if(a.length>=3)pts+=a.length*10});for(const s of SUITS){let vals=h.filter(c=>c.s===s).map(c=>RANK_VALUE[c.r]).sort((a,b)=>a-b);let run=1;for(let i=1;i<vals.length;i++){if(vals[i]===vals[i-1]+1){run++;if(run>=3)pts+=10}else if(vals[i]!==vals[i-1])run=1}}return pts}
actionBtn.onclick=draw;newBtn.onclick=()=>{active=false;handCards=[];render('READY')};betUp.onclick=()=>{if(!active&&betVal<500){betVal+=25;ui()}};betDown.onclick=()=>{if(!active&&betVal>25){betVal-=25;ui()}};ui();
})();
