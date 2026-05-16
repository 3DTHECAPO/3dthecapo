(()=>{
  'use strict';

  const suits=['S','H','D','C'];
  const ranks=['J','Q','K','10','A'];
  const order={A:5,'10':4,K:3,Q:2,J:1};
  const values={A:1,'10':1,K:1,Q:0,J:0};
  const suitIcon={S:'\u2660',H:'\u2665',D:'\u2666',C:'\u2663'};
  const dom={
    dealBtn:document.getElementById('dealBtn'),
    bidBtn:document.getElementById('bidBtn'),
    passBtn:document.getElementById('passBtn'),
    meldBtn:document.getElementById('meldBtn'),
    trumpRow:document.getElementById('trumpRow'),
    mainScore:document.getElementById('mainScore'),
    stateText:document.getElementById('stateText'),
    trickPile:document.getElementById('trickPile'),
    meldArea:document.getElementById('meldArea'),
    playerHand:document.getElementById('playerHand')
  };
  const state={
    hands:[],
    captured:[],
    handPoints:[0,0],
    totalScores:[0,0],
    melds:[0,0],
    teams:[[0,2],[1,3]],
    trick:[],
    currentPlayerIndex:0,
    leader:0,
    phase:'idle',
    bidAmount:0,
    highestBid:0,
    highestBidder:null,
    activeBidders:[],
    passed:[],
    trump:null,
    handNumber:0,
    lastWinner:null
  };

  function thinkDelay(){return 400+Math.floor(Math.random()*1000)}
  function seatName(player){return ['YOU','LEFT','PARTNER','RIGHT'][player]}
  function teamIndex(player){return player%2===0?0:1}
  function buildDeck(){
    const deck=[];
    for(const suit of suits)for(const rank of ranks)for(let copy=0;copy<4;copy++)deck.push({rank,suit,id:rank+suit+copy});
    if(deck.length!==80)throw new Error('Pinochle deck must be 80 cards');
    return deck.sort(()=>Math.random()-.5);
  }
  function sortHands(){
    state.hands.forEach(hand=>hand.sort((a,b)=>a.suit.localeCompare(b.suit)||order[b.rank]-order[a.rank]));
  }
  function hasMarriage(hand,suit){
    return hand.some(card=>card.rank==='K'&&card.suit===suit)&&hand.some(card=>card.rank==='Q'&&card.suit===suit);
  }
  function assertInvariant(){
    const total=state.hands.flat().length+state.trick.length+state.captured.flat().length;
    if(total!==80)throw new Error('Pinochle card invariant failed: '+total);
  }
  function startHand(){
    const deck=buildDeck();
    state.hands=Array.from({length:4},()=>[]);
    state.captured=Array.from({length:4},()=>[]);
    state.handPoints=[0,0];
    state.melds=[0,0];
    state.trick=[];
    state.phase='bidding';
    state.bidAmount=50;
    state.highestBid=0;
    state.highestBidder=null;
    state.activeBidders=[0,1,2,3];
    state.passed=[];
    state.currentPlayerIndex=state.handNumber%4;
    state.leader=state.currentPlayerIndex;
    state.trump=null;
    state.lastWinner=null;
    for(let i=0;i<20;i++)for(let p=0;p<4;p++)state.hands[p].push(deck.pop());
    state.handNumber++;
    sortHands();
    assertInvariant();
    render('BIDDING - '+seatName(state.currentPlayerIndex)+' TO ACT');
    maybeCpuBid();
  }
  function nextActiveBidder(from){
    for(let step=1;step<=4;step++){
      const candidate=(from+step)%4;
      if(state.activeBidders.includes(candidate))return candidate;
    }
    return null;
  }
  function bid(player){
    if(state.phase!=='bidding'||player!==state.currentPlayerIndex||!state.activeBidders.includes(player))return;
    state.highestBid=state.bidAmount;
    state.highestBidder=player;
    state.bidAmount+=10;
    advanceBidding(player);
  }
  function pass(player){
    if(state.phase!=='bidding'||player!==state.currentPlayerIndex||!state.activeBidders.includes(player))return;
    state.activeBidders=state.activeBidders.filter(index=>index!==player);
    state.passed.push(player);
    advanceBidding(player);
  }
  function advanceBidding(player){
    if(state.highestBidder!==null&&state.activeBidders.length===1){
      state.phase='choose-trump';
      state.currentPlayerIndex=state.highestBidder;
      render(seatName(state.highestBidder)+' WON BID '+state.highestBid);
      if(state.currentPlayerIndex!==0)scheduleCpuTrump();
      return;
    }
    if(state.activeBidders.length===0){
      startHand();
      return;
    }
    state.currentPlayerIndex=nextActiveBidder(player);
    render('BIDDING - '+seatName(state.currentPlayerIndex)+' TO ACT');
    maybeCpuBid();
  }
  function maybeCpuBid(){
    if(state.phase!=='bidding'||state.currentPlayerIndex===0)return;
    render('OPPONENT THINKING...');
    setTimeout(()=>{
      const hand=state.hands[state.currentPlayerIndex];
      const canNameTrump=suits.some(suit=>hasMarriage(hand,suit));
      const shouldBid=canNameTrump&&state.highestBid<70&&Math.random()>.28;
      if(shouldBid)bid(state.currentPlayerIndex); else pass(state.currentPlayerIndex);
    },thinkDelay());
  }
  function chooseTrump(player,suit){
    if(state.phase!=='choose-trump'||player!==state.highestBidder)return false;
    if(!hasMarriage(state.hands[player],suit)){
      render('TRUMP NEEDS K + Q MARRIAGE');
      return false;
    }
    state.trump=suit;
    state.phase='meld';
    state.currentPlayerIndex=state.highestBidder;
    scoreMelds();
    render('TRUMP '+suitIcon[suit]+' - MELD READY');
    return true;
  }
  function scheduleCpuTrump(){
    render('OPPONENT THINKING...');
    setTimeout(()=>{
      const suit=suits.find(item=>hasMarriage(state.hands[state.highestBidder],item));
      if(suit)chooseTrump(state.highestBidder,suit);
      else{
        state.handPoints[teamIndex(state.highestBidder)]-=state.highestBid;
        finishHand('BID TEAM SET');
      }
    },thinkDelay());
  }
  function countCards(hand){
    const counts={};
    hand.forEach(card=>{counts[card.rank+card.suit]=(counts[card.rank+card.suit]||0)+1});
    return (rank,suit)=>counts[rank+suit]||0;
  }
  function meldScore(hand){
    if(!state.trump)return 0;
    const count=countCards(hand);
    let total=0;
    const trump=state.trump;
    const runCopies=Math.min(count('A',trump),count('10',trump),count('K',trump),count('Q',trump),count('J',trump));
    if(runCopies>=2)total+=1500; else if(runCopies===1)total+=150;
    for(const suit of suits){
      const marriages=Math.min(count('K',suit),count('Q',suit));
      total+=marriages*(suit===trump?40:20);
    }
    const aroundCopies=rank=>Math.min(...suits.map(suit=>count(rank,suit)));
    const around=(rank,single,double)=>{const copies=aroundCopies(rank);if(copies>=2)total+=double;else if(copies===1)total+=single};
    around('A',100,1000);around('K',80,800);around('Q',60,600);around('J',40,400);
    const pinochles=Math.min(count('Q','S'),count('J','D'));
    if(pinochles>=2)total+=300; else if(pinochles===1)total+=40;
    return total;
  }
  function scoreMelds(){
    state.melds=[0,0];
    state.hands.forEach((hand,player)=>{state.melds[teamIndex(player)]+=meldScore(hand)});
  }
  function beginPlay(){
    if(state.phase!=='meld')return;
    state.handPoints=[state.melds[0],state.melds[1]];
    state.phase='play';
    state.currentPlayerIndex=state.highestBidder;
    state.leader=state.highestBidder;
    render('TRICK PLAY');
    if(state.currentPlayerIndex!==0)scheduleCpuPlay();
  }
  function trickBestPlay(){
    let best=state.trick[0];
    for(const play of state.trick.slice(1))if(beats(play.card,best.card))best=play;
    return best;
  }
  function beats(candidate,best){
    if(candidate.suit===best.suit)return order[candidate.rank]>order[best.rank];
    return candidate.suit===state.trump&&best.suit!==state.trump;
  }
  function legalCards(player){
    const hand=state.hands[player]||[];
    if(!state.trick.length)return hand;
    const lead=state.trick[0].card.suit;
    const sameSuit=hand.filter(card=>card.suit===lead);
    const currentBest=trickBestPlay().card;
    const beatingSame=sameSuit.filter(card=>beats(card,currentBest));
    if(sameSuit.length)return beatingSame.length?beatingSame:sameSuit;
    const trumps=hand.filter(card=>card.suit===state.trump);
    const beatingTrump=trumps.filter(card=>beats(card,currentBest));
    if(trumps.length)return beatingTrump.length?beatingTrump:trumps;
    return hand;
  }
  function play(player,index){
    if(state.phase!=='play'||player!==state.currentPlayerIndex)return;
    const hand=state.hands[player];
    const card=hand[index];
    if(!card)return;
    if(!legalCards(player).some(item=>item.id===card.id)){render('LEGAL CARD REQUIRED');return}
    hand.splice(index,1);
    state.trick.push({player,card});
    if(state.trick.length===4)finishTrick();
    else{
      state.currentPlayerIndex=(state.currentPlayerIndex+1)%4;
      assertInvariant();
      render('TRICK LIVE');
      if(state.currentPlayerIndex!==0)scheduleCpuPlay();
    }
  }
  function scheduleCpuPlay(){
    render('OPPONENT THINKING...');
    setTimeout(cpuPlay,thinkDelay());
  }
  function cpuPlay(){
    if(state.phase!=='play'||state.currentPlayerIndex===0)return;
    const player=state.currentPlayerIndex;
    const legal=legalCards(player).slice().sort((a,b)=>order[a.rank]-order[b.rank]);
    play(player,state.hands[player].findIndex(card=>card.id===legal[0].id));
  }
  function finishTrick(){
    const winner=trickBestPlay().player;
    const points=state.trick.reduce((sum,play)=>sum+values[play.card.rank],0);
    state.captured[winner].push(...state.trick.map(play=>play.card));
    state.handPoints[teamIndex(winner)]+=points;
    state.trick=[];
    state.currentPlayerIndex=winner;
    state.leader=winner;
    state.lastWinner=winner;
    assertInvariant();
    if(state.hands.every(hand=>hand.length===0)){
      state.handPoints[teamIndex(winner)]+=2;
      finishHand('HAND COMPLETE');
      return;
    }
    render('TRICK TO '+seatName(winner));
    if(state.currentPlayerIndex!==0)scheduleCpuPlay();
  }
  function finishHand(label){
    const bidTeam=teamIndex(state.highestBidder);
    if(state.handPoints[bidTeam]<state.highestBid)state.handPoints[bidTeam]=-state.highestBid;
    state.totalScores[0]+=state.handPoints[0];
    state.totalScores[1]+=state.handPoints[1];
    const bothAtTarget=state.totalScores[0]>=500&&state.totalScores[1]>=500;
    const oneAtTarget=state.totalScores.some(score=>score>=500);
    const tiedAtTarget=bothAtTarget&&state.totalScores[0]===state.totalScores[1];
    state.phase=oneAtTarget&&!tiedAtTarget?'game-over':'hand-over';
    const winnerLabel=state.totalScores[0]>state.totalScores[1]?'YOUR TEAM WINS':'THEIR TEAM WINS';
    render(state.phase==='game-over'?winnerLabel:'HAND OVER');
    if(state.phase==='game-over'&&window.Play3DPoints&&state.totalScores[0]>state.totalScores[1])window.Play3DPoints.award('pinochle',250,'game_win');
    if(state.phase==='hand-over')setTimeout(startHand,1200);
  }
  function cardHTML(card,index,enabled){
    const red=card.suit==='H'||card.suit==='D';
    return '<button class="card '+(red?'red ':'')+(!enabled?'disabled':'')+'" data-i="'+index+'"><span>'+card.rank+'</span><b>'+suitIcon[card.suit]+'</b><small>'+card.rank+'</small></button>';
  }
  function backs(count){return Array.from({length:count},()=>'<div class="card back">PLAY<br>3D</div>').join('')}
  function renderSeats(){
    [0,1,2,3].forEach(player=>{
      const el=document.getElementById('seat'+player);
      if(!el)return;
      el.innerHTML='<b>'+seatName(player)+'</b><small>'+(state.hands[player]||[]).length+' cards</small>'+(player===0?'':'<div class="seat-cards">'+backs(Math.min(6,(state.hands[player]||[]).length))+'</div>');
    });
  }
  function render(label){
    dom.trickPile.innerHTML=state.trick.map(play=>'<div><small>'+seatName(play.player)+'</small>'+cardHTML(play.card,0,false)+'</div>').join('');
    dom.meldArea.innerHTML='<div class="count-card">Bid '+(state.highestBid||'-')+'</div><div class="count-card">Trump '+(state.trump?suitIcon[state.trump]:'-')+'</div><div class="count-card">Your Team Meld '+state.melds[0]+'</div><div class="count-card">Their Team Meld '+state.melds[1]+'</div>';
    dom.playerHand.innerHTML=(state.hands[0]||[]).map((card,index)=>cardHTML(card,index,state.phase==='play'&&state.currentPlayerIndex===0&&legalCards(0).some(item=>item.id===card.id))).join('');
    dom.playerHand.querySelectorAll('.card').forEach(button=>button.onclick=()=>play(0,Number(button.dataset.i)));
    dom.mainScore.textContent=state.totalScores[0]+' - '+state.totalScores[1];
    dom.stateText.textContent=label||(state.phase==='play'?(state.currentPlayerIndex===0?'YOUR TURN':seatName(state.currentPlayerIndex)+' TURN'):state.phase.toUpperCase());
    dom.bidBtn.disabled=state.phase!=='bidding'||state.currentPlayerIndex!==0;
    dom.passBtn.disabled=state.phase!=='bidding'||state.currentPlayerIndex!==0;
    dom.meldBtn.disabled=state.phase!=='meld';
    dom.trumpRow.hidden=state.phase!=='choose-trump'||state.currentPlayerIndex!==0;
    renderSeats();
  }

  dom.dealBtn.onclick=startHand;
  dom.bidBtn.onclick=()=>bid(0);
  dom.passBtn.onclick=()=>pass(0);
  dom.meldBtn.onclick=beginPlay;
  dom.trumpRow.addEventListener('click',event=>{
    const button=event.target.closest('[data-trump]');
    if(button)chooseTrump(0,button.dataset.trump);
  });
  window.addEventListener('play3d:modechange',()=>render());
  startHand();
})();
