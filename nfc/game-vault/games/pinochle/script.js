(()=>{
'use strict';

/*
PLAY 3D DOUBLE DECK PINOCHLE — FULL TABLE REBUILD

Based on user rules:
- 80-card double deck: A,10,K,Q,J,9; four of each card.
- 4 players, two partnerships: YOU/PARTNER vs LEFT/RIGHT.
- 20 cards each, no stock.
- Auction/bidding starts at 50.
- Highest bidder names trump.
- Partner passes 3 cards to bidder, bidder passes 3 back.
- Meld scoring.
- Trick play: follow suit, beat if able, trump if void.
- Rank order: A,10,K,Q,J,9.
- Counters: A=11, 10=10, K=4, final trick=10.
- Contract scoring: bidding team must meet bid or gets set.
- First team to 500 wins.
*/

const suits = ['S','H','D','C'];
const suitName = {S:'Spades',H:'Hearts',D:'Diamonds',C:'Clubs'};
const suitSym = {S:'♠',H:'♥',D:'♦',C:'♣'};
const ranks = ['A','10','K','Q','J','9'];
const rankPower = {A:6,'10':5,K:4,Q:3,J:2,'9':1};
const counterValue = {A:11,'10':10,K:4,Q:0,J:0,'9':0};
const seats = ['south','west','north','east'];
const names = {south:'YOU', west:'LEFT', north:'PARTNER', east:'RIGHT'};
const team = {south:'NS', north:'NS', west:'EW', east:'EW'};
const teamName = {NS:'YOU/PARTNER', EW:'LEFT/RIGHT'};
const WIN_SCORE = 500;

let deck = [];
let hands = {};
let scores = {NS:0, EW:0};
let bid = 0;
let highBidder = null;
let passed = new Set();
let trump = null;
let phase = 'idle';
let turn = 'south';
let trick = [];
let trickCounters = {NS:0, EW:0};
let tricksWon = {NS:0, EW:0};
let meldScores = {NS:0, EW:0};
let logLines = [];
let mode = window.Play3DModeBar ? window.Play3DModeBar.getMode() : 'cpu';

const $ = id => document.getElementById(id);

function buildDeck(){
  deck = [];
  for(let copy=0; copy<4; copy++){
    for(const s of suits){
      for(const r of ranks){
        deck.push({r,s,id:r+s+'-'+copy+'-'+Math.random().toString(36).slice(2)});
      }
    }
  }
  shuffle(deck);
}

function shuffle(arr){
  for(let i=arr.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
}

function sortHand(hand){
  return hand.sort((a,b)=>suits.indexOf(a.s)-suits.indexOf(b.s) || rankPower[b.r]-rankPower[a.r]);
}

function newHand(){
  buildDeck();
  hands = {south:[], west:[], north:[], east:[]};
  for(let i=0;i<80;i++) hands[seats[i%4]].push(deck[i]);
  seats.forEach(s=>sortHand(hands[s]));
  bid = 40;
  highBidder = null;
  passed = new Set();
  trump = null;
  phase = 'bidding';
  turn = 'south';
  trick = [];
  trickCounters = {NS:0, EW:0};
  tricksWon = {NS:0, EW:0};
  meldScores = {NS:0, EW:0};
  logLines = [];
  addLog('New double-deck hand dealt: 20 cards each.');
  render();
  scheduleCpu();
}

function currentTeam(){ return team[turn]; }

function nextSeat(seat=turn){ return seats[(seats.indexOf(seat)+1)%4]; }

function allButOnePassed(){
  const active = seats.filter(s=>!passed.has(s));
  return active.length === 1 && highBidder;
}

function makeBid(){
  if(phase !== 'bidding') return;
  if(turn !== 'south' && mode !== 'local') return;
  bid += 10;
  highBidder = turn;
  addLog(names[turn] + ' bids ' + bid + '.');
  turn = nextSeat();
  render();
  if(allButOnePassed()) finishAuction();
  else scheduleCpu();
}

function passBid(){
  if(phase !== 'bidding') return;
  if(turn !== 'south' && mode !== 'local') return;
  if(!highBidder){
    addLog('Opening player must bid at least 50.');
    makeBid();
    return;
  }
  passed.add(turn);
  addLog(names[turn] + ' passes.');
  if(allButOnePassed()) finishAuction();
  else{
    turn = nextSeat();
    while(passed.has(turn)) turn = nextSeat();
    render();
    scheduleCpu();
  }
}

function cpuBidTurn(){
  if(phase !== 'bidding') return;
  if(turn === 'south' || mode === 'local' || mode === 'fan') return;
  const strength = estimateHandStrength(hands[turn]);
  const shouldBid = bid < 70 && strength > 38 && !passed.has(turn);
  if(!highBidder || shouldBid){
    bid += 10;
    highBidder = turn;
    addLog(names[turn] + ' bids ' + bid + '.');
  }else{
    passed.add(turn);
    addLog(names[turn] + ' passes.');
  }

  if(allButOnePassed()) finishAuction();
  else{
    turn = nextSeat();
    while(passed.has(turn)) turn = nextSeat();
    render();
    scheduleCpu();
  }
}

function estimateHandStrength(hand){
  return hand.reduce((sum,c)=>sum + (counterValue[c.r] || 0) + (c.r === 'A' ? 3 : 0), 0);
}

function finishAuction(){
  phase = 'trump';
  turn = highBidder;
  if(!highBidder){
    highBidder = 'south';
    bid = 50;
  }
  addLog(names[highBidder] + ' wins bid at ' + bid + '. Choose trump.');
  render();
  if(highBidder !== 'south' && mode !== 'local'){
    trump = chooseCpuTrump(highBidder);
    setTrump(true);
  }
}

function chooseCpuTrump(seat){
  const counts = {S:0,H:0,D:0,C:0};
  hands[seat].forEach(c=>counts[c.s] += rankPower[c.r]);
  return suits.sort((a,b)=>counts[b]-counts[a])[0];
}

function setTrump(auto=false){
  if(phase !== 'trump') return;
  if(!auto){
    if(highBidder !== 'south' && mode !== 'local') return;
    trump = $('trumpSelect').value;
  }
  if(!trump) trump = 'S';
  addLog(names[highBidder] + ' names ' + suitName[trump] + ' trump.');
  partnerPass();
  scoreMelds();
  phase = 'meld';
  render();
}

function partnerOf(seat){
  return seat === 'south' ? 'north' : seat === 'north' ? 'south' : seat === 'west' ? 'east' : 'west';
}

function partnerPass(){
  const partner = partnerOf(highBidder);
  const toBidder = choosePassCards(partner, 3);
  hands[partner] = hands[partner].filter(c=>!toBidder.includes(c));
  hands[highBidder].push(...toBidder);

  const back = choosePassCards(highBidder, 3);
  hands[highBidder] = hands[highBidder].filter(c=>!back.includes(c));
  hands[partner].push(...back);

  seats.forEach(s=>sortHand(hands[s]));
  addLog(names[partner] + ' passed 3 to bidder; bidder passed 3 back.');
}

function choosePassCards(seat, count){
  return [...hands[seat]].sort((a,b)=>{
    const av = (a.s === trump ? 20 : 0) + counterValue[a.r] + rankPower[a.r];
    const bv = (b.s === trump ? 20 : 0) + counterValue[b.r] + rankPower[b.r];
    return av - bv;
  }).slice(0,count);
}

function cardCountMap(hand){
  const m = {};
  hand.forEach(c=>{
    const key = c.r + c.s;
    m[key] = (m[key] || 0) + 1;
  });
  return m;
}

function countCard(map,r,s){ return map[r+s] || 0; }
function has(map,r,s,n=1){ return countCard(map,r,s) >= n; }

function scoreSeatMeld(seat){
  const hand = hands[seat];
  const map = cardCountMap(hand);
  let score = 0;
  const lines = [];

  // Runs and marriages
  for(const s of suits){
    const runCount = Math.min(countCard(map,'A',s), countCard(map,'10',s), countCard(map,'K',s), countCard(map,'Q',s), countCard(map,'J',s));
    if(s === trump && runCount >= 1){
      const pts = runCount >= 2 ? 1500 : 150;
      score += pts;
      lines.push((runCount >= 2 ? 'Double Run ' : 'Run ') + suitSym[s] + ' +' + pts);
    }

    const marriageCount = Math.min(countCard(map,'K',s), countCard(map,'Q',s));
    if(marriageCount){
      const ptsEach = s === trump ? 40 : 4;
      const pts = marriageCount * ptsEach;
      score += pts;
      lines.push((s === trump ? 'Royal Marriage ' : 'Marriage ') + suitSym[s] + ' +' + pts);
    }
  }

  // Pinochle
  const pinCount = Math.min(countCard(map,'Q','S'), countCard(map,'J','D'));
  if(pinCount >= 2){
    score += 30;
    lines.push('Double Pinochle +30');
  }else if(pinCount === 1){
    score += 4;
    lines.push('Pinochle +4');
  }

  // Groups: arounds
  const groupPts = {J:4,Q:6,K:8,A:10};
  ['J','Q','K','A'].forEach(r=>{
    const around = Math.min(...suits.map(s=>countCard(map,r,s)));
    if(around >= 2){
      score += 100;
      lines.push('Double ' + r + ' Around +100');
    }else if(around === 1){
      score += groupPts[r];
      lines.push(r + ' Around +' + groupPts[r]);
    }
  });

  return {score, lines};
}

function scoreMelds(){
  meldScores = {NS:0, EW:0};
  seats.forEach(seat=>{
    const res = scoreSeatMeld(seat);
    meldScores[team[seat]] += res.score;
  });
}

function startTrickPlay(){
  if(phase !== 'meld') return;
  phase = 'trick';
  turn = highBidder;
  trick = [];
  addLog('Meld recorded. ' + names[turn] + ' leads first trick.');
  render();
  scheduleCpu();
}

function legalCards(seat){
  const hand = hands[seat] || [];
  if(phase !== 'trick') return [];
  if(!trick.length) return hand;

  const leadSuit = trick[0].card.s;
  const follow = hand.filter(c=>c.s === leadSuit);
  const currentWin = trickWinnerCard();

  if(follow.length){
    const beating = follow.filter(c=>beats(c, currentWin.card, leadSuit));
    return beating.length ? beating : follow;
  }

  const trumps = hand.filter(c=>c.s === trump);
  if(trumps.length){
    const currentIsTrump = currentWin.card.s === trump;
    const beatingTrump = currentIsTrump ? trumps.filter(c=>beats(c, currentWin.card, leadSuit)) : trumps;
    return beatingTrump.length ? beatingTrump : trumps;
  }

  return hand;
}

function beats(a,b,leadSuit){
  if(a.s === b.s) return rankPower[a.r] > rankPower[b.r];
  if(a.s === trump && b.s !== trump) return true;
  if(a.s !== trump && b.s === trump) return false;
  if(a.s === leadSuit && b.s !== leadSuit) return true;
  return false;
}

function trickWinnerCard(){
  let best = trick[0];
  const leadSuit = trick[0].card.s;
  for(const item of trick.slice(1)){
    if(beats(item.card, best.card, leadSuit)){
      best = item;
    }
  }
  return best;
}

function playCard(seat,index){
  if(phase !== 'trick') return;
  if(seat !== turn) return;
  const card = hands[seat][index];
  if(!card) return;
  const legal = legalCards(seat);
  if(!legal.some(c=>c.id === card.id)){
    addLog('Must follow suit, beat if able, or trump if void.');
    render();
    return;
  }

  hands[seat].splice(index,1);
  trick.push({seat,card});
  addLog(names[seat] + ' played ' + cardName(card) + '.');

  if(trick.length === 4){
    finishTrick();
    return;
  }

  turn = nextSeat(turn);
  render();
  scheduleCpu();
}

function finishTrick(){
  const winner = trickWinnerCard().seat;
  const winningTeam = team[winner];
  const points = trick.reduce((sum,item)=>sum + (counterValue[item.card.r] || 0),0);
  trickCounters[winningTeam] += points;
  tricksWon[winningTeam] += 1;

  addLog(names[winner] + ' won trick for ' + points + ' counter points.');
  trick = [];
  turn = winner;

  const cardsLeft = seats.reduce((sum,s)=>sum + hands[s].length,0);
  if(cardsLeft === 0){
    trickCounters[winningTeam] += 10;
    addLog(names[winner] + ' takes last trick bonus +10.');
    scoreHand();
    return;
  }

  render();
  scheduleCpu();
}

function scoreHand(){
  phase = 'scoring';
  const total = {
    NS: meldScores.NS + trickCounters.NS,
    EW: meldScores.EW + trickCounters.EW
  };
  const bidTeam = team[highBidder];

  if(total[bidTeam] < bid){
    scores[bidTeam] -= bid;
    addLog(teamName[bidTeam] + ' got set. Lost bid amount: -' + bid + '.');
  }else{
    scores.NS += total.NS;
    scores.EW += total.EW;
    addLog('Hand scored. NS +' + total.NS + ', EW +' + total.EW + '.');
  }

  if(scores.NS >= WIN_SCORE || scores.EW >= WIN_SCORE){
    phase = 'gameover';
    addLog((scores.NS >= WIN_SCORE ? 'YOU/PARTNER' : 'LEFT/RIGHT') + ' wins the game.');
  }

  render();
}

function cpuPlay(){
  if(mode === 'fan' || mode === 'local') return;
  if(turn === 'south') return;

  if(phase === 'bidding'){
    cpuBidTurn();
    return;
  }

  if(phase === 'trick'){
    const legal = legalCards(turn);
    if(!legal.length) return;
    const card = chooseCpuCard(legal);
    const index = hands[turn].findIndex(c=>c.id === card.id);
    setTimeout(()=>playCard(turn,index), 350);
  }
}

function cpuBidTurn(){
  if(phase !== 'bidding') return;
  const strength = estimateHandStrength(hands[turn]);
  if(!highBidder || (bid < 80 && strength > 120)){
    bid += 10;
    highBidder = turn;
    addLog(names[turn] + ' bids ' + bid + '.');
  }else{
    passed.add(turn);
    addLog(names[turn] + ' passes.');
  }

  if(allButOnePassed()){
    finishAuction();
  }else{
    turn = nextSeat(turn);
    while(passed.has(turn)) turn = nextSeat(turn);
    render();
    scheduleCpu();
  }
}

function chooseCpuCard(legal){
  // Try winning cheap if possible, otherwise dump lowest non-counter.
  return [...legal].sort((a,b)=>{
    const av = counterValue[a.r] + rankPower[a.r] + (a.s === trump ? 8 : 0);
    const bv = counterValue[b.r] + rankPower[b.r] + (b.s === trump ? 8 : 0);
    return av - bv;
  })[0];
}

function scheduleCpu(){
  if(mode === 'fan' || mode === 'local') return;
  if(turn !== 'south' && ['bidding','trick'].includes(phase)){
    setTimeout(cpuPlay, 650);
  }
}

function cardName(c){ return c.r + suitSym[c.s]; }

function cardHTML(c,i,disabled){
  const red = c.s === 'H' || c.s === 'D';
  return `<button class="card ${red?'red':''} ${disabled?'disabled':'playable'}" data-i="${i}" ${disabled?'disabled':''}>
    <span class="rank">${c.r}</span><span class="suit">${suitSym[c.s]}</span>
  </button>`;
}

function renderHand(){
  const hand = hands.south || [];
  let legalIds = new Set();
  if(phase === 'trick' && turn === 'south'){
    legalCards('south').forEach(c=>legalIds.add(c.id));
  }else if(phase !== 'trick'){
    hand.forEach(c=>legalIds.add(c.id));
  }

  $('hand').innerHTML = hand.map((c,i)=>cardHTML(c,i, phase === 'trick' && !legalIds.has(c.id))).join('');
  document.querySelectorAll('#hand .card').forEach(btn=>{
    btn.onclick = () => playCard('south', Number(btn.dataset.i));
  });

  $('handTitle').textContent = "Your Hand (" + hand.length + ")";
  $('handHint').textContent = phase === 'trick'
    ? (turn === 'south' ? 'Play a highlighted legal card.' : names[turn] + ' is playing...')
    : 'Bid, choose trump if you win, then show meld/start trick play.';
}

function renderTrick(){
  $('trickArea').innerHTML = trick.map(item=>{
    const c = item.card;
    const red = c.s === 'H' || c.s === 'D';
    return `<div class="played-card"><span>${names[item.seat]}</span><div class="card ${red?'red':''}">
      <span class="rank">${c.r}</span><span class="suit">${suitSym[c.s]}</span>
    </div></div>`;
  }).join('');
}

function renderSeats(){
  const ids = {south:'seatSouth', west:'seatWest', north:'seatNorth', east:'seatEast'};
  seats.forEach(seat=>{
    const el = $(ids[seat]);
    if(!el) return;
    el.textContent = names[seat] + ' (' + ((hands[seat] || []).length) + ')';
    el.classList.toggle('active', seat === turn && !['idle','scoring','gameover'].includes(phase));
  });
}

function renderMeldBoard(){
  const board = $('meldBoard');
  if(!board) return;
  board.innerHTML = seats.map(seat=>{
    const res = scoreSeatMeld(seat);
    return `<div class="meld-card"><b>${names[seat]} — ${res.score}</b><p>${res.lines.join('<br>') || 'No meld'}</p></div>`;
  }).join('');
}

function render(){
  $('scoreNS').textContent = scores.NS;
  $('scoreEW').textContent = scores.EW;
  $('bidText').textContent = highBidder ? bid + ' / ' + names[highBidder] : (phase === 'bidding' ? bid : '—');
  $('trumpText').textContent = trump ? suitName[trump] : '—';
  $('stateText').textContent = phase.toUpperCase();
  $('turnText').textContent = turn ? names[turn] : '—';
  $('phaseHelp').textContent = helpText();

  renderHand();
  renderTrick();
  renderSeats();
  renderMeldBoard();

  $('bidBtn').disabled = phase !== 'bidding' || (turn !== 'south' && mode !== 'local');
  $('passBidBtn').disabled = phase !== 'bidding' || (turn !== 'south' && mode !== 'local');
  $('setTrumpBtn').disabled = phase !== 'trump' || (highBidder !== 'south' && mode !== 'local');
  $('showMeldBtn').disabled = phase !== 'meld';
  $('autoBtn').disabled = !['bidding','trick','meld'].includes(phase);

  $('log').innerHTML = logLines.map(x=>'<li>'+x+'</li>').join('');
}

function helpText(){
  if(phase === 'idle') return 'Start a new hand.';
  if(phase === 'bidding') return 'Auction: bid or pass. Minimum opening bid is 50.';
  if(phase === 'trump') return names[highBidder] + ' chooses trump.';
  if(phase === 'meld') return 'Meld has been counted. Start trick play.';
  if(phase === 'trick') return names[turn] + ' to play. Follow suit, beat if able, trump if void.';
  if(phase === 'scoring') return 'Hand scored. Start another hand.';
  if(phase === 'gameover') return 'Game over. Start a new game.';
  return '';
}

function addLog(msg){
  logLines.unshift(msg);
  logLines = logLines.slice(0,18);
  if($('log')) $('log').innerHTML = logLines.map(x=>'<li>'+x+'</li>').join('');
}

$('newHandBtn').addEventListener('click', newHand);
$('bidBtn').addEventListener('click', makeBid);
$('passBidBtn').addEventListener('click', passBid);
$('setTrumpBtn').addEventListener('click', ()=>setTrump(false));
$('showMeldBtn').addEventListener('click', startTrickPlay);
$('autoBtn').addEventListener('click', ()=>{
  if(phase === 'bidding' && turn === 'south') makeBid();
  else if(phase === 'meld') startTrickPlay();
  else if(phase === 'trick' && turn === 'south'){
    const legal = legalCards('south');
    if(legal.length){
      const card = legal[0];
      playCard('south', hands.south.findIndex(c=>c.id === card.id));
    }
  }
});

window.addEventListener('play3d:modechange', event=>{
  mode = event.detail.mode;
  newHand();
});

newHand();
})();