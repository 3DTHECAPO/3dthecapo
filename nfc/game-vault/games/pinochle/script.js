(()=>{
'use strict';

const SUITS=['S','H','D','C'];
const RANKS=['A','10','K','Q','J'];
const ORDER={A:5,'10':4,K:3,Q:2,J:1};
const COUNTERS={A:1,'10':1,K:1,Q:0,J:0};
const ICON={S:'\u2660',H:'\u2665',D:'\u2666',C:'\u2663'};
const TRICK_HOLD_MS=1600;

const state={
  hands:[],
  captured:[[],[]],
  trick:[],
  scores:[0,0],
  handScores:[0,0],
  meldScores:[0,0],
  trickScores:[0,0],
  dealer:3,
  currentBidder:0,
  bidder:null,
  bidTeam:0,
  bid:0,
  trump:'S',
  phase:'bidding',
  currentPlayerIndex:0,
  lastWinner:0,
  lastTrickResult:null,
  passed:[false,false,false,false],
  meldShown:false,
  trumpMarriageValid:true,
  cpuTimer:null,
  trickTimer:null,
  handToken:0
};

const dealBtn=document.getElementById('dealBtn');
const bidInput=document.getElementById('bidInput');
const bidBtn=document.getElementById('teamBtn');
const passBidBtn=document.getElementById('passBidBtn');
const meldBtn=document.getElementById('meldBtn');
const meldArea=document.getElementById('meldArea');
const stockArea=document.getElementById('stockArea');
const opponentHand=document.getElementById('opponentHand');
const trickPile=document.getElementById('trickPile');
const playerHand=document.getElementById('playerHand');
const mainScore=document.getElementById('mainScore');
const stateText=document.getElementById('stateText');

function teamIndex(player){return player%2}
function teamName(team){return team===0?'TEAM A (YOU + PARTNER)':'TEAM B (OPPONENTS)'}
function seatName(player){return ['YOU','LEFT CPU','PARTNER','RIGHT CPU'][player]||'CPU'}
function leftOfDealer(){return (state.dealer+1)%4}
function thinkDelay(){return 460+Math.floor(Math.random()*650)}
function hasMarriage(hand,suit){return hand.some(card=>card.rank==='K'&&card.suit===suit)&&hand.some(card=>card.rank==='Q'&&card.suit===suit)}

function announce(event,type,message){
  window.dispatchEvent(new CustomEvent('superior:event',{
    detail:{category:'pinochle',event,type,message}
  }));
}

function emitRoomEvent(type,payload){
  const sync=window.PLAY3D_SYNC||window.Play3DGameSync;
  if(!sync||typeof sync.sendGameEvent!=='function')return;
  Promise.resolve(sync.sendGameEvent(type,Object.assign({
    game:'pinochle',
    phase:state.phase,
    currentPlayerIndex:state.currentPlayerIndex
  },payload||{}))).catch(error=>console.warn('[PINOCHLE ROOM EVENT]',type,error));
}

function clearCpuTimer(){
  if(state.cpuTimer!==null){
    clearTimeout(state.cpuTimer);
    state.cpuTimer=null;
  }
}

function clearTrickTimer(){
  if(state.trickTimer!==null){
    clearTimeout(state.trickTimer);
    state.trickTimer=null;
  }
}

function buildDeck(){
  const deck=[];
  for(let copy=0;copy<4;copy++){
    for(const suit of SUITS){
      for(const rank of RANKS)deck.push({rank,suit,id:rank+suit+copy});
    }
  }
  return deck.sort(()=>Math.random()-.5);
}

function cardHTML(card,index,enabled=true){
  const red=card.suit==='H'||card.suit==='D';
  return '<button class="card '+(red?'red ':'')+(enabled?'':'disabled')+'" data-i="'+index+'"><span>'+card.rank+'</span><b>'+ICON[card.suit]+'</b><small>'+card.rank+'</small></button>';
}

function backs(count){
  return Array.from({length:count},()=>'<div class="card back">PLAY<br>3D</div>').join('');
}

function sortHands(){
  state.hands.forEach(hand=>hand.sort((a,b)=>a.suit.localeCompare(b.suit)||ORDER[b.rank]-ORDER[a.rank]));
}

function countCards(hand){
  return hand.reduce((out,card)=>{
    out[card.rank+card.suit]=(out[card.rank+card.suit]||0)+1;
    return out;
  },{});
}

function countRankSuit(counts,rank,suit){
  return counts[rank+suit]||0;
}

function meldScore(hand){
  const counts=countCards(hand);
  let total=0;
  for(const suit of SUITS){
    const run=Math.min(
      countRankSuit(counts,'A',suit),
      countRankSuit(counts,'10',suit),
      countRankSuit(counts,'K',suit),
      countRankSuit(counts,'Q',suit),
      countRankSuit(counts,'J',suit)
    );
    if(suit===state.trump)total+=run>=2?150:run*15;
    const marriages=Math.min(countRankSuit(counts,'K',suit),countRankSuit(counts,'Q',suit));
    total+=Math.max(0,marriages-(suit===state.trump?run:0))*(suit===state.trump?4:2);
  }
  const around=(rank,points,doublePoints)=>{
    const copies=Math.min(...SUITS.map(suit=>countRankSuit(counts,rank,suit)));
    total+=copies>=2?doublePoints:copies*points;
  };
  around('A',10,100);
  around('K',8,80);
  around('Q',6,60);
  around('J',4,40);
  const pinochle=Math.min(countRankSuit(counts,'Q','S'),countRankSuit(counts,'J','D'));
  total+=pinochle>=2?30:pinochle*4;
  return total;
}

function estimateHand(player){
  const hand=state.hands[player]||[];
  let bestTrump=null;
  let bestStrength=-1;
  for(const suit of SUITS){
    const trumpCards=hand.filter(card=>card.suit===suit);
    const marriage=hasMarriage(hand,suit)?20:0;
    const control=trumpCards.reduce((sum,card)=>sum+ORDER[card.rank]+(card.rank==='A'?4:card.rank==='10'?2:0),0);
    if(marriage+control>bestStrength){
      bestStrength=marriage+control;
      bestTrump=suit;
    }
  }
  if(!hasMarriage(hand,bestTrump))bestTrump=SUITS.find(suit=>hasMarriage(hand,suit))||null;
  const oldTrump=state.trump;
  if(bestTrump)state.trump=bestTrump;
  const meld=meldScore(hand);
  state.trump=oldTrump;
  const counters=hand.reduce((sum,card)=>sum+COUNTERS[card.rank],0);
  const raw=meld+counters*3;
  return {
    bestTrump,
    openingBid:raw>=38?60:raw>=28?55:50,
    ceiling:bestTrump?Math.max(50,Math.min(85,48+Math.floor(raw/3))):0
  };
}

function activeBidders(){
  return [0,1,2,3].filter(player=>!state.passed[player]);
}

function nextBidderAfter(player){
  for(let step=1;step<=4;step++){
    const next=(player+step)%4;
    if(!state.passed[next])return next;
  }
  return null;
}

function finishBiddingIfReady(){
  const active=activeBidders();
  if(state.bidder===null&&active.length===0){
    state.bidder=state.dealer;
    state.bidTeam=teamIndex(state.dealer);
    state.bid=50;
    startMeld(state.dealer,50);
    return true;
  }
  if(state.bidder!==null&&active.length===1&&active[0]===state.bidder){
    startMeld(state.bidder,state.bid);
    return true;
  }
  return false;
}

function advanceBidder(){
  if(finishBiddingIfReady())return;
  const next=nextBidderAfter(state.currentBidder);
  if(next===null){
    finishBiddingIfReady();
    return;
  }
  state.currentBidder=next;
  state.currentPlayerIndex=next;
  render(seatName(next)+' TO BID - CURRENT '+(state.bid||'NONE'));
  if(next!==0)scheduleCpu();
}

function placeBid(player,amount){
  if(state.phase!=='bidding'||player!==state.currentBidder)return false;
  amount=Number(amount)||0;
  const minimum=state.bid>0?state.bid+5:50;
  if(amount<minimum){
    render('BID MUST BE '+minimum+' OR PASS');
    return false;
  }
  state.bid=amount;
  state.bidder=player;
  state.bidTeam=teamIndex(player);
  state.passed[player]=false;
  announce('BID','casino',seatName(player)+' BID '+amount);
  emitRoomEvent('pinochle_bid',{player,amount});
  advanceBidder();
  return true;
}

function passBid(player){
  if(state.phase!=='bidding'||player!==state.currentBidder)return false;
  state.passed[player]=true;
  announce('PASS','normal',seatName(player)+' PASS');
  emitRoomEvent('pinochle_pass_bid',{player});
  advanceBidder();
  return true;
}

function cpuBid(player){
  if(state.phase!=='bidding'||player!==state.currentBidder)return;
  const estimate=estimateHand(player);
  if(estimate.bestTrump)state.trump=estimate.bestTrump;
  const target=state.bid>0?state.bid+5:estimate.openingBid;
  if(estimate.bestTrump&&target<=estimate.ceiling)placeBid(player,target);
  else passBid(player);
}

function startMeld(player,bid){
  const estimate=estimateHand(player);
  state.bidder=player;
  state.bidTeam=teamIndex(player);
  state.bid=Math.max(50,Number(bid)||50);
  state.trump=estimate.bestTrump||state.trump||'S';
  state.trumpMarriageValid=hasMarriage(state.hands[player]||[],state.trump);
  state.phase='meld';
  state.currentPlayerIndex=player;
  state.meldShown=false;
  render(seatName(player)+' WON BID '+state.bid+' / TRUMP '+state.trump+' / SHOW MELD');
}

function deal(){
  clearCpuTimer();
  clearTrickTimer();
  state.handToken++;
  state.dealer=(state.dealer+1)%4;
  const deck=buildDeck();
  state.hands=Array.from({length:4},()=>deck.splice(0,20));
  sortHands();
  state.captured=[[],[]];
  state.trick=[];
  state.handScores=[0,0];
  state.meldScores=[0,0];
  state.trickScores=[0,0];
  state.currentBidder=leftOfDealer();
  state.currentPlayerIndex=state.currentBidder;
  state.bidder=null;
  state.bidTeam=0;
  state.bid=0;
  state.trump='S';
  state.phase='bidding';
  state.lastWinner=0;
  state.lastTrickResult=null;
  state.passed=[false,false,false,false];
  state.meldShown=false;
  state.trumpMarriageValid=true;
  announce('DEAL','normal','PINOCHLE HAND DEALT.');
  render('DEALER '+seatName(state.dealer)+' - '+seatName(state.currentBidder)+' BIDS FIRST');
  if(state.currentBidder!==0)scheduleCpu();
}

function showMeld(){
  if(state.phase!=='meld'){
    render('FINISH BIDDING BEFORE MELD');
    return;
  }
  if(!state.meldShown){
    state.meldScores=[0,0];
    state.hands.forEach((hand,player)=>{state.meldScores[teamIndex(player)]+=meldScore(hand)});
    if(!state.trumpMarriageValid)state.meldScores[state.bidTeam]=0;
    state.handScores=[state.meldScores[0],state.meldScores[1]];
    state.meldShown=true;
    announce('MELD','elite','MELD IS ON THE TABLE.');
    if(window.Play3DPoints&&state.meldScores[0]>0){
      window.Play3DPoints.award('pinochle',Math.min(75,Math.max(25,state.meldScores[0]*2)),'meld_score');
    }
    render('MELD: TEAM A '+state.meldScores[0]+' / TEAM B '+state.meldScores[1]+' - PRESS START PLAY');
    return;
  }
  state.phase='play';
  state.currentPlayerIndex=state.bidder;
  render('PLAY STARTS - '+seatName(state.currentPlayerIndex)+' LEADS');
  if(state.currentPlayerIndex!==0)scheduleCpu();
}

function setTrump(suit){
  if(!SUITS.includes(suit))return;
  state.trump=suit;
  if(state.phase==='meld'&&state.bidder!==null){
    state.trumpMarriageValid=hasMarriage(state.hands[state.bidder]||[],state.trump);
  }
  announce('TRUMP','elite','TRUMP '+suit);
  render('TRUMP '+suit);
}

function leadSuit(){
  return state.trick[0]?.card.suit;
}

function beats(card,best){
  if(card.suit===best.suit)return ORDER[card.rank]>ORDER[best.rank];
  if(card.suit===state.trump&&best.suit!==state.trump)return true;
  return false;
}

function currentBest(){
  let best=state.trick[0];
  for(const play of state.trick.slice(1)){
    if(beats(play.card,best.card))best=play;
  }
  return best;
}

function legalCards(player){
  const hand=state.hands[player]||[];
  if(state.phase!=='play')return [];
  if(!state.trick.length)return hand;
  const lead=leadSuit();
  const best=currentBest().card;
  const followers=hand.filter(card=>card.suit===lead);
  if(followers.length){
    const beaters=followers.filter(card=>beats(card,best));
    return beaters.length?beaters:followers;
  }
  const trumps=hand.filter(card=>card.suit===state.trump);
  if(trumps.length){
    const beaters=trumps.filter(card=>beats(card,best));
    return beaters.length?beaters:trumps;
  }
  return hand;
}

function trickWinner(){
  return currentBest().player;
}

function trickPointCards(){
  return state.trick.filter(play=>COUNTERS[play.card.rank]>0);
}

function settleVisibleTrick(){
  clearTrickTimer();
  if(state.trick.length!==4)return;
  const winner=trickWinner();
  const team=teamIndex(winner);
  const pointCards=trickPointCards();
  const points=pointCards.reduce((sum,play)=>sum+COUNTERS[play.card.rank],0);

  state.captured[team].push(...state.trick.map(play=>play.card));
  state.trickScores[team]+=points;
  state.handScores[team]+=points;
  state.lastWinner=winner;
  state.lastTrickResult={winner,team,points,pointCards:pointCards.map(play=>play.card.rank+play.card.suit)};
  state.trick=[];
  state.currentPlayerIndex=winner;

  console.log('[PINOCHLE TRICK CREDIT]',{
    winner,
    winnerSeat:seatName(winner),
    team,
    teamName:teamName(team),
    points,
    pointCards:state.lastTrickResult.pointCards
  });

  if(state.hands.every(hand=>hand.length===0)){
    finishHand();
    return;
  }
  render('TRICK TO '+seatName(winner)+' / '+teamName(team)+' +'+points);
  if(winner!==0)scheduleCpu();
}

function play(player,index){
  if(player!==state.currentPlayerIndex||state.phase!=='play'||state.trick.length===4)return;
  const hand=state.hands[player]||[];
  const card=hand[index];
  if(!card)return;
  if(!legalCards(player).some(item=>item.id===card.id)){
    render('MUST FOLLOW / BEAT / TRUMP');
    return;
  }
  if(!state.trick.length)state.lastTrickResult=null;
  hand.splice(index,1);
  state.trick.push({player,card});
  emitRoomEvent('pinochle_play',{player,card});

  if(state.trick.length===4){
    const winner=trickWinner();
    const points=trickPointCards().reduce((sum,play)=>sum+COUNTERS[play.card.rank],0);
    state.lastTrickResult={winner,team:teamIndex(winner),points,preview:true};
    render('TRICK COMPLETE - '+seatName(winner)+' / '+teamName(teamIndex(winner))+' +'+points);
    announce('TRICK','success',teamName(teamIndex(winner))+' TAKES THE TRICK.');
    state.trickTimer=setTimeout(settleVisibleTrick,TRICK_HOLD_MS);
    return;
  }

  state.currentPlayerIndex=(player+1)%4;
  render('TRICK LIVE');
  if(state.currentPlayerIndex!==0)scheduleCpu();
}

function leadScore(card,hand){
  const sameSuit=hand.filter(item=>item.suit===card.suit);
  const hasAce=sameSuit.some(item=>item.rank==='A');
  const nonTrump=card.suit!==state.trump;
  const rankValue={A:100,'10':58,K:34,Q:12,J:4}[card.rank]||0;
  const trumpPenalty=nonTrump?0:-22;
  const protectedKing=card.rank==='K'&&hasAce?12:0;
  const lengthBonus=Math.min(12,sameSuit.length*2);
  return rankValue+trumpPenalty+protectedKing+lengthBonus;
}

function chooseLeadCard(hand){
  return hand.slice().sort((a,b)=>leadScore(b,hand)-leadScore(a,hand)||ORDER[b.rank]-ORDER[a.rank])[0];
}

function chooseCpuCard(player,legal){
  if(!state.trick.length)return chooseLeadCard(legal);

  const best=currentBest();
  const partnerWinning=teamIndex(best.player)===teamIndex(player);
  const counters=legal.filter(card=>COUNTERS[card.rank]>0);
  const nonCounters=legal.filter(card=>COUNTERS[card.rank]===0);
  const beaters=legal.filter(card=>beats(card,best.card));

  if(partnerWinning){
    const payableCounters=counters.filter(card=>card.suit!==state.trump||leadSuit()===state.trump);
    if(payableCounters.length){
      return payableCounters.slice().sort((a,b)=>COUNTERS[b.rank]-COUNTERS[a.rank]||ORDER[b.rank]-ORDER[a.rank])[0];
    }
    if(nonCounters.length)return nonCounters.slice().sort((a,b)=>ORDER[a.rank]-ORDER[b.rank])[0];
    return legal.slice().sort((a,b)=>ORDER[a.rank]-ORDER[b.rank])[0];
  }

  if(beaters.length){
    return beaters.slice().sort((a,b)=>{
      const aTrump=a.suit===state.trump;
      const bTrump=b.suit===state.trump;
      if(aTrump!==bTrump)return Number(aTrump)-Number(bTrump);
      if(COUNTERS[a.rank]!==COUNTERS[b.rank])return COUNTERS[a.rank]-COUNTERS[b.rank];
      return ORDER[a.rank]-ORDER[b.rank];
    })[0];
  }

  if(nonCounters.length)return nonCounters.slice().sort((a,b)=>ORDER[a.rank]-ORDER[b.rank])[0];
  return legal.slice().sort((a,b)=>ORDER[a.rank]-ORDER[b.rank])[0];
}

function scheduleCpu(){
  clearCpuTimer();
  const token=state.handToken;
  render('OPPONENT THINKING...');
  state.cpuTimer=setTimeout(()=>cpuTurn(token),thinkDelay());
}

function cpuTurn(token){
  state.cpuTimer=null;
  if(token!==state.handToken)return;
  if(state.phase==='bidding'){
    cpuBid(state.currentBidder);
    return;
  }
  if(state.phase!=='play'||state.currentPlayerIndex===0||state.trick.length===4)return;
  const legal=legalCards(state.currentPlayerIndex);
  if(!legal.length)return;
  const chosen=chooseCpuCard(state.currentPlayerIndex,legal);
  const index=state.hands[state.currentPlayerIndex].findIndex(card=>card.id===chosen.id);
  play(state.currentPlayerIndex,index);
}

function finishHand(){
  clearCpuTimer();
  clearTrickTimer();
  state.handToken++;
  const lastTeam=teamIndex(state.lastWinner);
  state.trickScores[lastTeam]+=2;
  state.handScores[lastTeam]+=2;
  const made=state.handScores[state.bidTeam]>=state.bid;

  if(made){
    state.scores[0]+=state.handScores[0];
    state.scores[1]+=state.handScores[1];
  }else{
    state.scores[state.bidTeam]-=state.bid;
    state.scores[1-state.bidTeam]+=state.handScores[1-state.bidTeam];
  }

  const winner=state.scores[0]>=300||state.scores[1]>=300?(state.scores[0]>=state.scores[1]?0:1):null;
  state.phase=winner===null?'over':'gameover';
  if(window.Play3DPoints&&winner===0)window.Play3DPoints.award('pinochle',175,'round_win');
  announce('WIN','success',winner===null?(made?'BID MADE':'BID SET'):teamName(winner)+' WINS GAME');
  render(winner===null?(made?'BID MADE':'SET - LOSE BID'):teamName(winner)+' WINS GAME');
}

function trickCardHTML(play,index){
  const winner=state.trick.length===4?trickWinner():null;
  const cls=winner===play.player?' winner':'';
  return '<div class="trick-play-card'+cls+'"><small>'+seatName(play.player)+'</small>'+cardHTML(play.card,index,false)+'</div>';
}

function renderSeats(){
  [0,1,2,3].forEach(player=>{
    const el=document.getElementById('seat'+player);
    if(!el)return;
    el.hidden=false;
    el.classList.toggle('current-bidder',state.phase==='bidding'&&player===state.currentBidder);
    el.classList.toggle('team-a',teamIndex(player)===0);
    el.classList.toggle('team-b',teamIndex(player)===1);
    el.innerHTML='<b>'+seatName(player)+'</b><small>'+teamName(teamIndex(player))+'</small><small>'+(state.hands[player]||[]).length+' cards</small>';
  });
}

function render(label){
  if(meldBtn)meldBtn.textContent=state.phase==='meld'&&state.meldShown?'Start Play':'Show Meld';
  if(bidBtn)bidBtn.disabled=state.phase!=='bidding'||state.currentBidder!==0;
  if(passBidBtn)passBidBtn.disabled=state.phase!=='bidding'||state.currentBidder!==0;
  if(bidInput)bidInput.disabled=state.phase!=='bidding'||state.currentBidder!==0;

  if(opponentHand){
    opponentHand.innerHTML=backs((state.hands[1]||[]).length)+'<div class="count-card">PARTNER '+(state.hands[2]||[]).length+'<br>RIGHT '+(state.hands[3]||[]).length+'</div>';
  }

  if(trickPile){
    trickPile.innerHTML=state.trick.map(trickCardHTML).join('')||'<div class="count-card">TRICK EMPTY</div>';
    let banner=document.getElementById('trickResultBanner');
    if(state.trick.length===4&&state.lastTrickResult){
      if(!banner){
        banner=document.createElement('div');
        banner.id='trickResultBanner';
        banner.className='trick-result-banner';
        document.querySelector('.trick-zone')?.appendChild(banner);
      }
      banner.textContent=teamName(state.lastTrickResult.team)+' TAKES '+state.lastTrickResult.points;
    }else if(banner){
      banner.remove();
    }
  }

  if(meldArea){
    meldArea.innerHTML=
      '<div class="count-card">TRUMP '+state.trump+'</div>'+
      '<div class="count-card">BID '+state.bid+'</div>'+
      '<div class="count-card">MELD A '+state.meldScores[0]+' / B '+state.meldScores[1]+'</div>'+
      '<div class="count-card">TRICKS A '+state.trickScores[0]+' / B '+state.trickScores[1]+'</div>'+
      '<div class="count-card">CAPTURED A '+state.captured[0].length+' / B '+state.captured[1].length+'</div>';
  }

  if(stockArea)stockArea.innerHTML='<div class="count-card">NO STOCK<br>80 CARD DECK</div>';

  if(playerHand){
    const legalIds=new Set(legalCards(0).map(card=>card.id));
    playerHand.innerHTML=(state.hands[0]||[]).map((card,index)=>cardHTML(card,index,state.currentPlayerIndex===0&&legalIds.has(card.id))).join('');
    playerHand.querySelectorAll('.card').forEach(button=>button.onclick=()=>play(0,Number(button.dataset.i)));
  }

  if(mainScore)mainScore.textContent=state.scores[0]+' - '+state.scores[1];
  if(stateText)stateText.textContent=label||(state.phase==='play'?(state.currentPlayerIndex===0?'YOUR TURN':seatName(state.currentPlayerIndex)+' TURN'):state.phase.toUpperCase());
  renderSeats();
}

if(dealBtn)dealBtn.onclick=deal;
if(bidBtn)bidBtn.onclick=()=>placeBid(0,bidInput?.value||50);
if(passBidBtn)passBidBtn.onclick=()=>passBid(0);
if(meldBtn)meldBtn.onclick=showMeld;
document.querySelectorAll('[data-trump]').forEach(button=>button.onclick=()=>setTrump(button.dataset.trump));
window.addEventListener('play3d:modechange',deal);

window.Play3DPinochle={
  state,
  deal,
  render,
  legalCards,
  chooseCpuCard,
  settleVisibleTrick
};

deal();
})();
