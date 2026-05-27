(()=>{
  'use strict';

  function play3dAnnounce(event, type, message){
    window.dispatchEvent(new CustomEvent('superior:event', { detail:{ category:'pinochle', event:event, type:type, message:message } }));
  }

  const suits=['S','H','D','C'];
  const ranks=['A','10','K','Q','J'];
  const order={A:5,'10':4,K:3,Q:2,J:1};
  const counters={A:1,'10':1,K:1,Q:0,J:0};
  const suitIcon={S:'\u2660',H:'\u2665',D:'\u2666',C:'\u2663'};
  const state={
    players:4,
    hands:[], captured:[[],[]], trick:[], scores:[0,0], handScores:[0,0], meldScores:[0,0], trickScores:[0,0],
    currentPlayerIndex:0, dealer:3, currentBidder:0, bidder:null, bidTeam:0, bid:0, trump:'S', phase:'bidding', lastWinner:0, handNumber:0, passed:[false,false,false,false], meldShown:false, lastBidMessage:''
  };

  function thinkDelay(){return 450+Math.floor(Math.random()*850)}
  function buildDeck(){
    const deck=[];
    for(let copy=0;copy<4;copy++)for(const suit of suits)for(const rank of ranks)deck.push({rank,suit,id:rank+suit+copy});
    return deck.sort(()=>Math.random()-.5);
  }
  function teamIndex(player){return player%2}
  function seatName(player){return ['YOU','LEFT CPU','PARTNER','RIGHT CPU'][player]||'CPU'}
  function sortHands(){state.hands.forEach(hand=>hand.sort((a,b)=>a.suit.localeCompare(b.suit)||order[b.rank]-order[a.rank]))}
  function hasMarriage(hand,suit){return hand.some(c=>c.rank==='K'&&c.suit===suit)&&hand.some(c=>c.rank==='Q'&&c.suit===suit)}
  function cardHTML(card,index,enabled){
    const red=card.suit==='H'||card.suit==='D';
    return '<button class="card '+(red?'red ':'')+(!enabled?'disabled':'')+'" data-i="'+index+'"><span>'+card.rank+'</span><b>'+suitIcon[card.suit]+'</b><small>'+card.rank+'</small></button>';
  }
  function backs(count){return Array.from({length:count},()=>'<div class="card back">PLAY<br>3D</div>').join('')}
  function countCards(hand){const out={};hand.forEach(c=>{out[c.rank+c.suit]=(out[c.rank+c.suit]||0)+1});return out}
  function countRankSuit(counts,rank,suit){return counts[rank+suit]||0}
  function meldScore(hand){
    const counts=countCards(hand); let total=0;
    for(const suit of suits){
      const marriage=Math.min(countRankSuit(counts,'K',suit),countRankSuit(counts,'Q',suit));
      total+=marriage*(suit===state.trump?4:2);
      const run=Math.min(countRankSuit(counts,'A',suit),countRankSuit(counts,'10',suit),countRankSuit(counts,'K',suit),countRankSuit(counts,'Q',suit),countRankSuit(counts,'J',suit));
      total+=run*(suit===state.trump?15:0);
    }
    const around=(rank,points)=>{const copies=Math.min(...suits.map(s=>countRankSuit(counts,rank,s))); total+=copies*points};
    around('A',10); around('K',8); around('Q',6); around('J',4);
    const pin=Math.min(countRankSuit(counts,'Q','S'),countRankSuit(counts,'J','D')); total+=pin*4;
    return total;
  }
  function leftOfDealer(){return (state.dealer+1)%4}
  function bidDebug(event,extra){
    console.log('[PINOCHLE BID]', Object.assign({
      event,
      dealer:state.dealer,
      firstBidder:leftOfDealer(),
      currentBidder:state.currentBidder,
      highBidder:state.bidder,
      bid:state.bid,
      bidTeam:state.bidTeam,
      passed:(state.passed||[]).slice(),
      phase:state.phase
    },extra||{}));
  }
  function showBidBanner(message){
    state.lastBidMessage = message;
    const table = document.querySelector('.casino-table');
    if(!table) return;
    let banner = document.getElementById('bidBanner');
    if(!banner){
      banner = document.createElement('div');
      banner.id = 'bidBanner';
      banner.className = 'bid-banner';
      table.appendChild(banner);
    }
    banner.textContent = message;
    banner.classList.remove('show');
    void banner.offsetWidth;
    banner.classList.add('show');
  }
  function updateBidStatusPanel(){
    const table = document.querySelector('.casino-table');
    if(!table) return;
    let panel = document.getElementById('bidStatusPanel');
    if(!panel){
      panel = document.createElement('div');
      panel.id = 'bidStatusPanel';
      panel.className = 'bid-status-panel';
      table.appendChild(panel);
    }
    const high = state.bidder===null ? 'NONE' : seatName(state.bidder)+' '+state.bid;
    const current = state.phase==='bidding' ? seatName(state.currentBidder) : '?';
    panel.innerHTML = '<b>HIGH BID: '+high+'</b><span>CURRENT BIDDER: '+current+'</span><small>'+seatName(state.dealer)+' DEALS</small>';
  }
  function updateBidControls(){
    const humanTurn = state.phase==='bidding' && state.currentBidder===0;
    ['teamBtn','passBidBtn','bidInput'].forEach(id=>{
      const el = document.getElementById(id);
      if(!el) return;
      el.disabled = !humanTurn;
      el.style.display = humanTurn ? '' : 'none';
    });
  }
  function activeBidders(){return [0,1,2,3].filter(player=>!state.passed[player])}
  function nextBidderAfter(player){
    for(let step=1;step<=4;step++){
      const next=(player+step)%4;
      if(!state.passed[next])return next;
    }
    return null;
  }
  function finishBiddingIfReady(){
    const active=activeBidders();
    if(state.bidder===null&&active.length===0){state.phase='over';bidDebug('all_passed');render('ALL PASSED - DEAL AGAIN');return true}
    if(state.bidder!==null&&active.length===1&&active[0]===state.bidder){
      showBidBanner(seatName(state.bidder)+' WINS BID '+state.bid);
      bidDebug('bidding_won',{winner:state.bidder});
      const started=startHandWithBid(state.bidder,state.bid);
      if(started) render(seatName(state.bidder)+' WON BID '+state.bid+' / SHOW MELD');
      return true;
    }
    return false;
  }
  function advanceBidder(){
    if(finishBiddingIfReady())return;
    const next=nextBidderAfter(state.currentBidder);
    if(next===null){finishBiddingIfReady();return}
    state.currentBidder=next; state.currentPlayerIndex=next;
    bidDebug('next_bidder');
    render(seatName(next)+' TO BID - CURRENT '+(state.bid||'NONE'));
    if(next!==0)scheduleCpu();
  }
  function placeBid(player,bid){
    if(state.phase!=='bidding'||player!==state.currentBidder)return false;
    const amount=Number(bid)||0;
    const minimum=state.bid>0?state.bid+1:50;
    if(amount<minimum){render('BID MUST BE '+minimum+' OR PASS');bidDebug('bad_bid',{player,amount,minimum});return false}
    state.bid=amount; state.bidder=player; state.bidTeam=teamIndex(player); state.passed[player]=false;
    showBidBanner(seatName(player)+' BID '+amount);
  play3dAnnounce('BID','casino','BID IS ON THE TABLE.');
    bidDebug('bid',{player,amount});
    advanceBidder();
    return true;
  }
  function passBid(player){
    if(state.phase!=='bidding'||player!==state.currentBidder)return false;
    state.passed[player]=true;
    showBidBanner(seatName(player)+' PASS');
    play3dAnnounce('PASS','normal',seatName(player)+' PASS');
    bidDebug('pass',{player});
    advanceBidder();
    return true;
  }
  function deal(){
    if(state.handNumber>0)state.dealer=(state.dealer+1)%4;
    state.handNumber++;
    const deck=buildDeck();
    state.hands=Array.from({length:4},()=>deck.splice(0,20));
    state.captured=[[],[]]; state.trick=[]; state.handScores=[0,0]; state.meldScores=[0,0]; state.trickScores=[0,0];
    state.bid=0; state.bidder=null; state.bidTeam=0; state.trump='S'; state.phase='bidding'; state.lastWinner=0; state.passed=[false,false,false,false]; state.meldShown=false; state.currentBidder=leftOfDealer(); state.currentPlayerIndex=state.currentBidder;
    sortHands(); bidDebug('deal'); showBidBanner(seatName(state.currentBidder)+' BIDS FIRST'); render('DEALER '+seatName(state.dealer)+' - '+seatName(state.currentBidder)+' BIDS FIRST');
    if(state.currentBidder!==0)scheduleCpu();
  }
  function setTrump(suit){state.trump=suit; play3dAnnounce('TRUMP','elite','TRUMP '+suit); render('TRUMP '+suit)}
  function startHandWithBid(player,bid){
    const chosen=state.trump;
    if(!hasMarriage(state.hands[player], chosen)){bidDebug('missing_trump_marriage',{player,trump:chosen});render('BIDDER NEEDS TRUMP MARRIAGE');return false}
    state.bidder=player; state.bidTeam=teamIndex(player); state.bid=Math.max(50,Number(bid)||50);
    state.phase='meld'; state.currentPlayerIndex=player; state.meldShown=false;
    bidDebug('meld_start',{player,bid:state.bid,trump:state.trump});
    render(seatName(player)+' WON BID '+state.bid+' / TRUMP '+state.trump+' - TAKE MELD');
    return true;
  }
  function playerBid(){
    if(state.phase!=='bidding')return;
    if(state.currentBidder!==0){render(seatName(state.currentBidder)+' TO BID');return}
    placeBid(0, document.getElementById('bidInput')?.value || 50);
  }
  function playerPass(){
    if(state.phase!=='bidding')return;
    if(state.currentBidder!==0){render(seatName(state.currentBidder)+' TO BID');return}
    passBid(0);
  }
  function cpuBid(player){
    if(state.phase!=='bidding'||player!==state.currentBidder)return;
    const suit=suits.find(s=>hasMarriage(state.hands[player],s));
    const ceiling=player===2?70:80;
    if(suit&&state.bid<ceiling){state.trump=suit; placeBid(player,state.bid>0?state.bid+5:50);}
    else passBid(player);
  }
  function takeMeld(auto){
    if(state.phase!=='meld')return;
    if(!state.meldShown){
      state.meldScores=[0,0];
      state.hands.forEach((hand,p)=>{state.meldScores[teamIndex(p)]+=meldScore(hand)});
      state.handScores[0]=state.meldScores[0]; state.handScores[1]=state.meldScores[1];
      state.meldShown=true;
      play3dAnnounce('MELD','elite');
      render('MELD: TEAM A '+state.meldScores[0]+' / TEAM B '+state.meldScores[1]+' - START PLAY');
      if(window.Play3DPoints&&state.meldScores[0]>0)window.Play3DPoints.award('pinochle',Math.min(150,state.meldScores[0]*5),'meld_score');
      return;
    }
    state.phase='play'; state.currentPlayerIndex=state.bidder;
    render('PLAY STARTS - '+seatName(state.currentPlayerIndex)+' LEADS');
    if(state.currentPlayerIndex!==0)scheduleCpu();
  }
  function leadSuit(){return state.trick[0]?.card.suit}
  function beats(card,best){
    if(card.suit===best.suit)return order[card.rank]>order[best.rank];
    if(card.suit===state.trump&&best.suit!==state.trump)return true;
    return false;
  }
  function currentBest(){let best=state.trick[0]; for(const play of state.trick.slice(1))if(beats(play.card,best.card))best=play; return best}
  function legalCards(player){
    const hand=state.hands[player]||[]; if(state.phase!=='play')return [];
    if(!state.trick.length)return hand;
    const lead=leadSuit(); const follow=hand.filter(c=>c.suit===lead); const best=currentBest().card;
    if(follow.length){const beaters=follow.filter(c=>beats(c,best)); return beaters.length?beaters:follow;}
    const trumps=hand.filter(c=>c.suit===state.trump); if(trumps.length){const beaters=trumps.filter(c=>beats(c,best)); return beaters.length?beaters:trumps;}
    return hand;
  }
  function trickWinner(){return currentBest().player}
  function finishTrick(){
    const winner=trickWinner(); const team=teamIndex(winner);
    state.captured[team].push(...state.trick.map(p=>p.card));
    const pts=state.trick.reduce((sum,p)=>sum+counters[p.card.rank],0);
    state.trickScores[team]+=pts; state.handScores[team]+=pts; state.trick=[]; state.currentPlayerIndex=winner; state.lastWinner=winner;
    if(state.hands.every(h=>h.length===0)){finishHand();return}
    render('TRICK TO '+seatName(winner)); if(winner!==0)scheduleCpu();
  }
  function finishHand(){
    state.trickScores[teamIndex(state.lastWinner)]+=2; state.handScores[teamIndex(state.lastWinner)]+=2;
    const bidTeam=state.bidTeam; const made=state.handScores[bidTeam]>=state.bid;
    if(made){state.scores[0]+=state.handScores[0]; state.scores[1]+=state.handScores[1];}
    else{state.scores[bidTeam]-=state.bid; state.scores[1-bidTeam]+=state.handScores[1-bidTeam];}
    const winner=state.scores[0]>=500||state.scores[1]>=500?(state.scores[0]>=state.scores[1]?0:1):null;
    state.phase=winner===null?'over':'gameover';
    if(window.Play3DPoints&&winner===0)window.Play3DPoints.award('pinochle',300,'round_win');
    play3dAnnounce('WIN','success');
    render(winner===null?(made?'BID MADE':'SET - LOSE BID'):'TEAM '+(winner?'B':'A')+' WINS GAME');
  }
  function play(player,index){
    if(player!==state.currentPlayerIndex||state.phase!=='play')return;
    const hand=state.hands[player], card=hand[index]; if(!card)return;
    if(!legalCards(player).some(c=>c.id===card.id)){render('MUST FOLLOW / BEAT / TRUMP');return}
    hand.splice(index,1); state.trick.push({player,card});
    if(state.trick.length===4)finishTrick(); else{state.currentPlayerIndex=(player+1)%4; render('TRICK LIVE'); if(state.currentPlayerIndex!==0)scheduleCpu();}
  }
  function scheduleCpu(){render('OPPONENT THINKING...');setTimeout(cpuTurn,thinkDelay())}
  function cpuTurn(){
    if(state.phase==='bidding'){cpuBid(state.currentBidder);return}
    if(state.phase==='meld')return
    if(state.phase!=='play'||state.currentPlayerIndex===0)return;
    const legal=legalCards(state.currentPlayerIndex); if(!legal.length)return;
    const best=state.trick.length?currentBest().card:null;
    const beaters=best?legal.filter(c=>beats(c,best)):[];
    const chosen=(beaters.length?beaters:legal).slice().sort((a,b)=>counters[a.rank]-counters[b.rank]||order[a.rank]-order[b.rank])[0];
    play(state.currentPlayerIndex,state.hands[state.currentPlayerIndex].findIndex(c=>c.id===chosen.id));
  }
  function render(label){
    if(typeof meldBtn !== 'undefined' && meldBtn) meldBtn.textContent = state.phase==='meld' && state.meldShown ? 'Start Play' : 'Meld';
    updateBidStatusPanel();
    updateBidControls();
    opponentHand.innerHTML=backs((state.hands[1]||[]).length)+'<div class="count-card">Partner '+(state.hands[2]||[]).length+'<br>Right '+(state.hands[3]||[]).length+'</div>';
    trickPile.innerHTML=state.trick.map(play=>'<div><small>'+seatName(play.player)+'</small>'+cardHTML(play.card,0,false)+'</div>').join('')||'<div class="count-card">Trick Empty</div>';
    meldArea.innerHTML='<div class="count-card">Trump '+state.trump+'</div><div class="count-card">Bid '+state.bid+'</div><div class="count-card">Meld A '+state.meldScores[0]+' / B '+state.meldScores[1]+'</div><div class="count-card">Tricks A '+state.trickScores[0]+' / B '+state.trickScores[1]+'</div>';
    stockArea.innerHTML='<div class="count-card">No Stock<br>80 Card Deck</div>';
    playerHand.innerHTML=(state.hands[0]||[]).map((card,index)=>cardHTML(card,index,state.currentPlayerIndex===0&&legalCards(0).some(c=>c.id===card.id))).join('');
    playerHand.querySelectorAll('.card').forEach(button=>button.onclick=()=>play(0,Number(button.dataset.i)));
    mainScore.textContent=state.scores[0]+' - '+state.scores[1];
    stateText.textContent=label||(state.phase==='play'?(state.currentPlayerIndex===0?'YOUR TURN':seatName(state.currentPlayerIndex)+' TURN'):state.phase.toUpperCase());
    renderSeats();
  }
  function renderSeats(){[0,1,2,3].forEach(player=>{const el=document.getElementById('seat'+player);if(!el)return;el.hidden=false;el.classList.toggle('current-bidder',state.phase==='bidding'&&player===state.currentBidder);el.innerHTML='<b>'+seatName(player)+'</b><small>'+(state.hands[player]||[]).length+' cards</small>'+(player===0?'':'<div class="seat-cards">'+backs(Math.min(5,(state.hands[player]||[]).length))+'</div>')})}
  dealBtn.onclick=deal; meldBtn.onclick=()=>takeMeld(false); teamBtn.onclick=playerBid;
  const passBtn=document.getElementById('passBidBtn'); if(passBtn)passBtn.onclick=playerPass;
  document.querySelectorAll('[data-trump]').forEach(btn=>btn.onclick=()=>setTrump(btn.dataset.trump));
  window.addEventListener('play3d:modechange',deal);
  deal();
})();
