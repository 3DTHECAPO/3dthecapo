
(()=>{
const suits=['♠','♥','♦','♣'], ranks=['2','3','4','5','6','7','8','9','10','J','Q','K','A'], val=Object.fromEntries(ranks.map((r,i)=>[r,i+2]));
let deck=[],hands=[],trick=[],leader=0,turn=0,playerTricks=0,botTricks=0,creditsVal=1000,betVal=25,active=false;
function mk(){deck=[];for(const s of suits)for(const r of ranks)deck.push({r,s});deck.sort(()=>Math.random()-.5)}
function card(c,i){let playable=active&&turn===0&&legal(i);return `<button class="card ${c.s==='♥'||c.s==='♦'?'red':''} ${playable?'playable':''}" data-i="${i}">${c.r}<br>${c.s}</button>`}
function legal(i){let c=hands[0][i]; if(!trick.length)return true; let lead=trick[0].c.s; return c.s===lead || !hands[0].some(x=>x.s===lead)}
function beats(a,b,lead){if(a.s==='♠'&&b.s!=='♠')return true;if(a.s!== '♠'&&b.s==='♠')return false;if(a.s===b.s)return val[a.r]>val[b.r];return a.s===lead&&b.s!==lead}
function winner(){let lead=trick[0].c.s,best=0;for(let i=1;i<trick.length;i++)if(beats(trick[i].c,trick[best].c,lead))best=i;return trick[best].p}
function botPick(p){let hand=hands[p],lead=trick[0]?.c.s;let choices=lead?hand.filter(c=>c.s===lead):hand;if(!choices.length)choices=hand;choices.sort((a,b)=>val[a.r]-val[b.r]);let c=choices[0];hand.splice(hand.indexOf(c),1);trick.push({p,c})}
function advanceBots(){while(active&&turn!==0&&trick.length<4){botPick(turn);turn=(turn+1)%4;if(trick.length===4)scoreTrick()}}
function scoreTrick(){let w=winner(); if(w===0)playerTricks++; else botTricks++; leader=w; turn=w; trick=[]; if(!hands[0].length){let playerWin=playerTricks>=4;let pay=playerWin?betVal*3:0;if(pay)creditsVal+=pay;result.textContent=(playerWin?'YOU WON HAND +'+pay:'TABLE WON HAND')+` | Tricks ${playerTricks}-${botTricks}`;active=false;stateText.textContent='HAND OVER'}else{result.textContent=`Tricks ${playerTricks}-${botTricks}. `+(turn===0?'Your lead.':'Bot leads.'); if(turn!==0)advanceBots()} render()}
function play(i){if(!active||turn!==0||!legal(i))return;let c=hands[0].splice(i,1)[0];trick.push({p:0,c});turn=(turn+1)%4;if(trick.length===4)scoreTrick();else advanceBots();render()}
function render(){credits.textContent=creditsVal;bet.textContent=betVal;mainScore.textContent=creditsVal;playArea.innerHTML=`<div class="scorebox"><span>Your tricks: ${playerTricks}</span><span>Table tricks: ${botTricks}</span><span>Cards left: ${hands[0]?.length||0}</span></div><div class="mini">Current trick: ${trick.map(x=>(x.p===0?'You':'Bot '+x.p)+': '+x.c.r+x.c.s).join(' | ')||'—'}</div>`+(hands[0]||[]).map(card).join('');document.querySelectorAll('#playArea .card').forEach(b=>b.onclick=()=>play(+b.dataset.i));actionBtn.textContent=active?'PLAY SELECTED CARD':'DEAL HAND';stateText.textContent=active?(turn===0?'YOUR TURN':'BOT TURN'):'READY'}
function deal(){if(active)return;if(creditsVal<betVal){result.textContent='NOT ENOUGH CREDITS';return}creditsVal-=betVal;mk();hands=[deck.splice(0,13),deck.splice(0,13),deck.splice(0,13),deck.splice(0,13)];trick=[];leader=0;turn=0;playerTricks=0;botTricks=0;active=true;result.textContent='Bid target: win 4+ tricks. Follow suit. Spades trump.';render()}
actionBtn.onclick=deal;newBtn.onclick=()=>{active=false;trick=[];hands=[[],[],[],[]];playerTricks=botTricks=0;result.textContent='READY';render()};betUp.onclick=()=>{if(!active&&betVal<500)betVal+=25;render()};betDown.onclick=()=>{if(!active&&betVal>25)betVal-=25;render()};render();
})();
