(()=>{
'use strict';

/*
LOCKED PINOCHLE RULES APPLIED:
- 4 players / 2 teams
- 80-card double deck
- 20 cards each
- NO CARD PASSING
- Bid or pass; pass = out of bidding
- Last bidder wins
- Winning bidder chooses trump
- Trump requires K + Q marriage in bidder's hand
- Meld, trick play, contract/set scoring
- New hand loop
- First team to 500 wins
*/

const suits=['S','H','D','C'];
const suitName={S:'Spades',H:'Hearts',D:'Diamonds',C:'Clubs'};
const suitSym={S:'♠',H:'♥',D:'♦',C:'♣'};
const ranks=['A','10','K','Q','J','9'];
const power={A:6,'10':5,K:4,Q:3,J:2,'9':1};
const counter={A:11,'10':10,K:4,Q:0,J:0,'9':0};
const seats=['south','west','north','east'];
const names={south:'YOU',west:'LEFT',north:'PARTNER',east:'RIGHT'};
const team={south:'NS',north:'NS',west:'EW',east:'EW'};
const teamLabel={NS:'YOU/PARTNER',EW:'LEFT/RIGHT'};
const WIN_SCORE=500;

let deck=[],hands={},scores={NS:0,EW:0};
let bid=40,highBidder=null,passed=new Set(),trump=null;
let phase='idle',turn='south',trick=[];
let meldScores={NS:0,EW:0},trickCounters={NS:0,EW:0};
let logLines=[];
let mode=window.Play3DModeBar ? window.Play3DModeBar.getMode() : 'cpu';

const $=id=>document.getElementById(id);

function buildDeck(){
  deck=[];
  for(let copy=0;copy<4;copy++){
    for(const s of suits){
      for(const r of ranks){
        deck.push({r,s,id:r+s+'-'+copy+'-'+Math.random().toString(36).slice(2)});
      }
    }
  }
  shuffle(deck);
}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}}
function sortHand(h){return h.sort((a,b)=>suits.indexOf(a.s)-suits.indexOf(b.s)||power[b.r]-power[a.r]);}
function nextSeat(s=turn){return seats[(seats.indexOf(s)+1)%4];}

function newGame(){
  scores={NS:0,EW:0};
  logLines=[];
  addLog('New Pinochle game. First team to 500 wins.');
  newHand(false);
}

function newHand(clearLog=true){
  buildDeck();
  hands={south:[],west:[],north:[],east:[]};
  for(let i=0;i<80;i++) hands[seats[i%4]].push(deck[i]);
  seats.forEach(s=>sortHand(hands[s]));
  bid=40; highBidder=null; passed=new Set(); trump=null;
  phase='bidding'; turn='south'; trick=[];
  meldScores={NS:0,EW:0}; trickCounters={NS:0,EW:0};
  if(clearLog) logLines=[];
  addLog('New hand dealt: 20 cards each. No stock. No passing cards.');
  render();
  scheduleCpu();
}

function makeBid(){
  if(phase!=='bidding')return;
  if(turn!=='south' && mode!=='local')return;
  bid+=10;
  highBidder=turn;
  addLog(names[turn]+' bids '+bid+'.');
  advanceBidTurn();
}

function passBid(){
  if(phase!=='bidding')return;
  if(turn!=='south' && mode!=='local')return;
  if(!highBidder){
    addLog('Opening bidder must bid at least 50 before passing is allowed.');
    makeBid();
    return;
  }
  passed.add(turn);
  addLog(names[turn]+' passes and is OUT of the bid.');
  advanceBidTurn();
}

function activeBidders(){return seats.filter(s=>!passed.has(s));}
function auctionDone(){return highBidder && activeBidders().length===1;}

function advanceBidTurn(){
  if(auctionDone()){finishAuction();return;}
  turn=nextSeat(turn);
  while(passed.has(turn)) turn=nextSeat(turn);
  render();
  scheduleCpu();
}

function cpuBidTurn(){
  if(phase!=='bidding' || turn==='south' || mode==='local' || mode==='fan')return;
  const strength=estimateStrength(hands[turn]);
  if(!highBidder || (bid<90 && strength>120)){
    bid+=10; highBidder=turn; addLog(names[turn]+' bids '+bid+'.');
  }else{
    passed.add(turn); addLog(names[turn]+' passes and is OUT of the bid.');
  }
  advanceBidTurn();
}

function estimateStrength(hand){
  return hand.reduce((sum,c)=>sum+(counter[c.r]||0)+power[c.r]+(c.r==='A'?5:0),0);
}

function finishAuction(){
  phase='trump';
  turn=highBidder;
  addLog(names[highBidder]+' wins the bid at '+bid+'. Must choose trump with a marriage.');
  render();
  if(highBidder!=='south' && mode!=='local'){
    const valid=validTrumpSuits(highBidder);
    trump=valid[0] || bestMarriageFallback(highBidder);
    setTrump(true);
  }
}

function hasMarriage(seat,suit){
  return hands[seat].some(c=>c.r==='K'&&c.s===suit) && hands[seat].some(c=>c.r==='Q'&&c.s===suit);
}
function validTrumpSuits(seat){return suits.filter(s=>hasMarriage(seat,s));}
function bestMarriageFallback(seat){return validTrumpSuits(seat)[0] || null;}

function setTrump(auto=false){
  if(phase!=='trump')return;
  if(!auto){
    if(highBidder!=='south' && mode!=='local')return;
    trump=$('trumpSelect').value;
  }
  if(!trump || !hasMarriage(highBidder,trump)){
    addLog('INVALID TRUMP: '+names[highBidder]+' must hold K+Q marriage in that suit.');
    render();
    return;
  }
  addLog(names[highBidder]+' names '+suitName[trump]+' trump with a valid marriage.');
  scoreMelds();
  phase='meld';
  turn=highBidder;
  render();
}

function cardMap(hand){
  const m={};
  hand.forEach(c=>{m[c.r+c.s]=(m[c.r+c.s]||0)+1;});
  return m;
}
function cnt(m,r,s){return m[r+s]||0;}

function seatMeld(seat){
  const m=cardMap(hands[seat]); let score=0; const lines=[];
  for(const s of suits){
    const run=Math.min(cnt(m,'A',s),cnt(m,'10',s),cnt(m,'K',s),cnt(m,'Q',s),cnt(m,'J',s));
    if(s===trump && run){const pts=run>=2?1500:150;score+=pts;lines.push((run>=2?'Double Run ':'Run ')+suitSym[s]+' +'+pts);}
    const marriage=Math.min(cnt(m,'K',s),cnt(m,'Q',s));
    if(marriage){const ptsEach=s===trump?40:4;const pts=marriage*ptsEach;score+=pts;lines.push((s===trump?'Royal Marriage ':'Marriage ')+suitSym[s]+' +'+pts);}
  }
  const pins=Math.min(cnt(m,'Q','S'),cnt(m,'J','D'));
  if(pins>=2){score+=30;lines.push('Double Pinochle +30');}
  else if(pins===1){score+=4;lines.push('Pinochle +4');}
  const groupPts={J:4,Q:6,K:8,A:10};
  ['J','Q','K','A'].forEach(r=>{
    const around=Math.min(...suits.map(s=>cnt(m,r,s)));
    if(around>=2){score+=100;lines.push('Double '+r+' Around +100');}
    else if(around===1){score+=groupPts[r];lines.push(r+' Around +'+groupPts[r]);}
  });
  return {score,lines};
}

function scoreMelds(){
  meldScores={NS:0,EW:0};
  seats.forEach(seat=>{meldScores[team[seat]]+=seatMeld(seat).score;});
}

function startTricks(){
  if(phase!=='meld')return;
  phase='trick'; turn=highBidder; trick=[];
  addLog('Meld counted. '+names[turn]+' leads first trick.');
  render(); scheduleCpu();
}

function legalCards(seat){
  const hand=hands[seat]||[];
  if(phase!=='trick')return [];
  if(!trick.length)return hand;
  const lead=trick[0].card.s;
  const follow=hand.filter(c=>c.s===lead);
  const currentWin=trickWinner();
  if(follow.length){
    const beat=follow.filter(c=>beats(c,currentWin.card,lead));
    return beat.length?beat:follow;
  }
  const trumps=hand.filter(c=>c.s===trump);
  if(trumps.length){
    const currentTrump=currentWin.card.s===trump;
    const beatTrump=currentTrump?trumps.filter(c=>beats(c,currentWin.card,lead)):trumps;
    return beatTrump.length?beatTrump:trumps;
  }
  return hand;
}

function beats(a,b,lead){
  if(a.s===b.s)return power[a.r]>power[b.r];
  if(a.s===trump && b.s!==trump)return true;
  if(a.s!==trump && b.s===trump)return false;
  if(a.s===lead && b.s!==lead)return true;
  return false;
}

function trickWinner(){
  let best=trick[0]; const lead=trick[0].card.s;
  trick.slice(1).forEach(item=>{if(beats(item.card,best.card,lead))best=item;});
  return best;
}

function playCard(seat,index){
  if(phase!=='trick'||seat!==turn)return;
  const card=hands[seat][index]; if(!card)return;
  const legal=legalCards(seat);
  if(!legal.some(c=>c.id===card.id)){addLog('Must follow suit, beat if able, or trump if void.');render();return;}
  hands[seat].splice(index,1);
  trick.push({seat,card});
  addLog(names[seat]+' played '+cardName(card)+'.');
  if(trick.length===4){finishTrick();return;}
  turn=nextSeat(turn);
  render(); scheduleCpu();
}

function finishTrick(){
  const winner=trickWinner().seat;
  const t=team[winner];
  const pts=trick.reduce((sum,x)=>sum+(counter[x.card.r]||0),0);
  trickCounters[t]+=pts;
  addLog(names[winner]+' wins trick for '+pts+' counters.');
  trick=[]; turn=winner;
  const left=seats.reduce((sum,s)=>sum+hands[s].length,0);
  if(left===0){trickCounters[t]+=10;addLog(names[winner]+' gets last trick +10.');scoreHand();return;}
  render(); scheduleCpu();
}

function scoreHand(){
  phase='scoring';
  const total={NS:meldScores.NS+trickCounters.NS,EW:meldScores.EW+trickCounters.EW};
  const bidTeam=team[highBidder];
  if(total[bidTeam]<bid){
    scores[bidTeam]-=bid;
    addLog(teamLabel[bidTeam]+' SET. Lost bid: -'+bid+'.');
  }else{
    scores.NS+=total.NS; scores.EW+=total.EW;
    addLog('Hand scored. NS +'+total.NS+', EW +'+total.EW+'.');
  }
  if(scores.NS>=WIN_SCORE||scores.EW>=WIN_SCORE){
    phase='gameover';
    addLog((scores.NS>=WIN_SCORE?'YOU/PARTNER':'LEFT/RIGHT')+' wins first to 500.');
  }else{
    addLog('Hand over. Click Next Hand to continue.');
  }
  render();
}

function cpuPlay(){
  if(mode==='fan'||mode==='local')return;
  if(turn==='south')return;
  if(phase==='bidding'){cpuBidTurn();return;}
  if(phase==='trick'){
    const legal=legalCards(turn); if(!legal.length)return;
    const card=[...legal].sort((a,b)=>(counter[a.r]+power[a.r]+(a.s===trump?8:0))-(counter[b.r]+power[b.r]+(b.s===trump?8:0)))[0];
    const index=hands[turn].findIndex(c=>c.id===card.id);
    setTimeout(()=>playCard(turn,index),350);
  }
}
function scheduleCpu(){if(mode!=='fan'&&mode!=='local'&&turn!=='south'&&['bidding','trick'].includes(phase))setTimeout(cpuPlay,650);}

function cardName(c){return c.r+suitSym[c.s];}
function cardHTML(c,i,disabled){
  const red=c.s==='H'||c.s==='D';
  return `<button class="card ${red?'red':''} ${disabled?'disabled':'playable'}" data-i="${i}" ${disabled?'disabled':''}><span class="rank">${c.r}</span><span class="suit">${suitSym[c.s]}</span></button>`;
}

function renderHand(){
  const hand=hands.south||[]; let legalIds=new Set();
  if(phase==='trick'&&turn==='south')legalCards('south').forEach(c=>legalIds.add(c.id));
  else hand.forEach(c=>legalIds.add(c.id));
  $('hand').innerHTML=hand.map((c,i)=>cardHTML(c,i,phase==='trick'&&!legalIds.has(c.id))).join('');
  document.querySelectorAll('#hand .card').forEach(btn=>btn.onclick=()=>playCard('south',Number(btn.dataset.i)));
  $('handTitle').textContent='Your Hand ('+hand.length+')';
  $('handHint').textContent=phase==='trick'?(turn==='south'?'Play a highlighted legal card.':names[turn]+' is playing...'):'Bid/pass. If you win, choose trump with K+Q marriage.';
}

function renderTrick(){
  $('trickArea').innerHTML=trick.map(item=>{
    const c=item.card, red=c.s==='H'||c.s==='D';
    return `<div class="played-card"><span>${names[item.seat]}</span><div class="card ${red?'red':''}"><span class="rank">${c.r}</span><span class="suit">${suitSym[c.s]}</span></div></div>`;
  }).join('');
}

function renderSeats(){
  const ids={south:'seatSouth',west:'seatWest',north:'seatNorth',east:'seatEast'};
  seats.forEach(seat=>{
    const el=$(ids[seat]); if(!el)return;
    el.textContent=names[seat]+' ('+((hands[seat]||[]).length)+')';
    el.classList.toggle('active',seat===turn&&!['idle','scoring','gameover'].includes(phase));
  });
}

function renderMeld(){
  $('meldBoard').innerHTML=seats.map(seat=>{
    const res=seatMeld(seat);
    return `<div class="meld-card"><b>${names[seat]} — ${res.score}</b><p>${res.lines.join('<br>')||'No meld'}</p></div>`;
  }).join('');
}

function helpText(){
  if(phase==='bidding')return 'Bid or pass. Passing removes that player from the auction.';
  if(phase==='trump')return names[highBidder]+' must choose a trump suit where they hold K+Q.';
  if(phase==='meld')return 'Meld counted. Start trick play.';
  if(phase==='trick')return names[turn]+' to play. Follow suit, beat if able, trump if void.';
  if(phase==='scoring')return 'Hand scored. Click Next Hand.';
  if(phase==='gameover')return 'Game over. First team to 500 wins.';
  return 'Start a new game.';
}

function render(){
  $('scoreNS').textContent=scores.NS; $('scoreEW').textContent=scores.EW;
  $('bidText').textContent=highBidder?bid+' / '+names[highBidder]:(phase==='bidding'?bid:'—');
  $('trumpText').textContent=trump?suitName[trump]:'—';
  $('stateText').textContent=phase.toUpperCase();
  $('turnText').textContent=turn?names[turn]:'—';
  $('phaseHelp').textContent=helpText();
  renderHand(); renderTrick(); renderSeats(); renderMeld();
  $('bidBtn').disabled=phase!=='bidding'||(turn!=='south'&&mode!=='local');
  $('passBidBtn').disabled=phase!=='bidding'||(turn!=='south'&&mode!=='local');
  $('setTrumpBtn').disabled=phase!=='trump'||(highBidder!=='south'&&mode!=='local');
  $('showMeldBtn').disabled=phase!=='meld';
  $('newHandBtn').disabled=!['scoring','gameover'].includes(phase) || phase==='gameover';
  $('autoBtn').disabled=!['bidding','trick','meld'].includes(phase);
  $('log').innerHTML=logLines.map(x=>'<li>'+x+'</li>').join('');
}

function addLog(msg){logLines.unshift(msg);logLines=logLines.slice(0,18);if($('log'))$('log').innerHTML=logLines.map(x=>'<li>'+x+'</li>').join('');}

$('newGameBtn').addEventListener('click',newGame);
$('newHandBtn').addEventListener('click',()=>newHand(true));
$('bidBtn').addEventListener('click',makeBid);
$('passBidBtn').addEventListener('click',passBid);
$('setTrumpBtn').addEventListener('click',()=>setTrump(false));
$('showMeldBtn').addEventListener('click',startTricks);
$('autoBtn').addEventListener('click',()=>{
  if(phase==='bidding'&&turn==='south')makeBid();
  else if(phase==='meld')startTricks();
  else if(phase==='trick'&&turn==='south'){
    const legal=legalCards('south');
    if(legal.length)playCard('south',hands.south.findIndex(c=>c.id===legal[0].id));
  }
});
window.addEventListener('play3d:modechange',e=>{mode=e.detail.mode;newGame();});

newGame();
})();