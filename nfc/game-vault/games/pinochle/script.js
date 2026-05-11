(()=>{
  'use strict';

  const suits=['S','H','D','C'];
  const ranks=['9','J','Q','K','10','A'];
  const order={A:6,'10':5,K:4,Q:3,J:2,'9':1};
  const values={A:11,'10':10,K:4,Q:3,J:2,'9':0};
  const suitIcon={S:'\u2660',H:'\u2665',D:'\u2666',C:'\u2663'};
  const state={
    mode:'two-player',
    players:2,
    hands:[],
    stock:[],
    trick:[],
    captured:[],
    scores:[0,0],
    teams:[[0],[1]],
    currentPlayerIndex:0,
    trump:'S',
    meldTaken:false
  };

  function thinkDelay(){return 400+Math.floor(Math.random()*1000)}
  function buildDeck(){
    const deck=[];
    for(let copy=0;copy<2;copy++)for(const suit of suits)for(const rank of ranks)deck.push({rank,suit,id:rank+suit+copy});
    if(deck.length!==48)throw new Error('Pinochle deck must be 48 cards');
    return deck.sort(()=>Math.random()-.5);
  }
  function setMode(mode){
    state.mode=mode;
    state.players=mode==='partnership'?4:2;
    state.teams=mode==='partnership'?[[0,2],[1,3]]:[[0],[1]];
  }
  function deal(){
    const deck=buildDeck();
    state.hands=Array.from({length:state.players},()=>[]);
    state.captured=Array.from({length:state.players},()=>[]);
    state.scores=[0,0];state.trick=[];state.currentPlayerIndex=0;state.meldTaken=false;
    for(let i=0;i<12;i++)for(let p=0;p<state.players;p++)state.hands[p].push(deck.pop());
    state.stock=state.mode==='two-player'?deck:[];
    state.trump=state.stock[0]?state.stock[0].suit:state.hands[0][0].suit;
    sortHands();assertInvariant();render('DEALT - TRUMP '+state.trump);
  }
  function assertInvariant(){
    const total=state.hands.flat().length+state.stock.length+state.trick.length+state.captured.flat().length;
    if(total!==48)throw new Error('Pinochle card invariant failed: '+total);
  }
  function sortHands(){state.hands.forEach(hand=>hand.sort((a,b)=>a.suit.localeCompare(b.suit)||order[a.rank]-order[b.rank]))}
  function teamIndex(player){return state.mode==='partnership'?(player%2):player}
  function seatName(player){return ['YOU','CPU 1','PARTNER','CPU 2'][player]||'CPU'}
  function cardHTML(card,index,enabled){
    const red=card.suit==='H'||card.suit==='D';
    return '<button class="card '+(red?'red ':'')+(!enabled?'disabled':'')+'" data-i="'+index+'"><span>'+card.rank+'</span><b>'+suitIcon[card.suit]+'</b><small>'+card.rank+'</small></button>';
  }
  function backs(count){return Array.from({length:count},()=>'<div class="card back">PLAY<br>3D</div>').join('')}
  function legalCards(player){
    const hand=state.hands[player]||[];
    if(!state.trick.length)return hand;
    const lead=state.trick[0].card.suit;
    const follow=hand.filter(card=>card.suit===lead);
    return follow.length?follow:hand;
  }
  function beats(candidate,best){
    if(candidate.suit===best.suit)return order[candidate.rank]>order[best.rank];
    return candidate.suit===state.trump&&best.suit!==state.trump;
  }
  function trickWinner(){
    let best=state.trick[0];
    for(const play of state.trick.slice(1))if(beats(play.card,best.card))best=play;
    return best.player;
  }
  function drawAfterTrick(winner){
    if(state.mode!=='two-player'||!state.stock.length)return;
    const loser=winner===0?1:0;
    if(state.stock.length)state.hands[winner].push(state.stock.pop());
    if(state.stock.length)state.hands[loser].push(state.stock.pop());
    sortHands();
  }
  function finishTrick(){
    const winner=trickWinner();
    state.captured[winner].push(...state.trick.map(play=>play.card));
    const trickPoints=state.trick.reduce((sum,play)=>sum+values[play.card.rank],0);
    state.scores[teamIndex(winner)]+=trickPoints;
    state.trick=[];drawAfterTrick(winner);state.currentPlayerIndex=winner;assertInvariant();
    if(state.hands.every(hand=>hand.length===0)){
      state.scores[teamIndex(winner)]+=10;
      if(window.Play3DPoints&&state.scores[0]>state.scores[1])window.Play3DPoints.award('pinochle',250,'round_win');
      render('ROUND OVER');return;
    }
    render('TRICK TO '+seatName(winner));
    if(state.currentPlayerIndex!==0)scheduleCpu();
  }
  function play(player,index){
    if(player!==state.currentPlayerIndex)return;
    const hand=state.hands[player];const card=hand[index];if(!card)return;
    if(!legalCards(player).some(item=>item.id===card.id)){render('FOLLOW SUIT');return}
    hand.splice(index,1);state.trick.push({player,card});
    if(state.trick.length===state.players)finishTrick();
    else{state.currentPlayerIndex=(state.currentPlayerIndex+1)%state.players;assertInvariant();render('TRICK LIVE');if(state.currentPlayerIndex!==0)scheduleCpu()}
  }
  function scheduleCpu(){render('OPPONENT THINKING...');setTimeout(cpuTurn,thinkDelay())}
  function cpuTurn(){
    const player=state.currentPlayerIndex;
    if(player===0||!state.hands[player]||!state.hands[player].length)return;
    const legal=legalCards(player);
    const winning=legal.filter(card=>state.trick.length&&beats(card,state.trick[0].card));
    const chosen=(winning.length?winning:legal).sort((a,b)=>values[a.rank]-values[b.rank])[0];
    play(player,state.hands[player].findIndex(card=>card.id===chosen.id));
  }
  function meldScore(hand){
    let total=0;const counts={};
    hand.forEach(card=>{counts[card.rank+card.suit]=(counts[card.rank+card.suit]||0)+1});
    const count=(rank,suit)=>counts[rank+suit]||0;
    for(const suit of suits){
      const runCopies=Math.min(count('A',suit),count('10',suit),count('K',suit),count('Q',suit),count('J',suit));
      if(suit===state.trump){if(runCopies>=2)total+=1500;else if(runCopies===1)total+=150}
      const marriages=Math.min(count('K',suit),count('Q',suit));
      total+=marriages*(suit===state.trump?40:20);
      total+=count('9',suit)*(suit===state.trump?10:0);
    }
    const aroundCopies=rank=>Math.min(...suits.map(suit=>count(rank,suit)));
    const around=(rank,single,double)=>{const copies=aroundCopies(rank);if(copies>=2)total+=double;else if(copies===1)total+=single};
    around('A',100,1000);around('K',80,800);around('Q',60,600);around('J',40,400);
    const pinochles=Math.min(count('Q','S'),count('J','D'));
    if(pinochles>=2)total+=300;else if(pinochles===1)total+=40;
    return total;
  }
  function takeMeld(){
    if(state.meldTaken)return;
    const meld=meldScore(state.hands[0]);
    state.scores[0]+=meld;state.meldTaken=true;
    if(window.Play3DPoints&&meld>0)window.Play3DPoints.award('pinochle',Math.min(150,Math.floor(meld/2)),'meld_score');
    render('MELD '+meld);
  }
  function render(label){
    const opponentCount=state.hands.slice(1).reduce((sum,hand)=>sum+hand.length,0);
    opponentHand.innerHTML=backs(opponentCount);
    trickPile.innerHTML=state.trick.map(play=>'<div><small>'+seatName(play.player)+'</small>'+cardHTML(play.card,0,false)+'</div>').join('');
    meldArea.innerHTML='<div class="count-card">Trump '+state.trump+'</div><div class="count-card">Meld '+(state.meldTaken?'Taken':meldScore(state.hands[0]||[]))+'</div><div class="count-card">'+(state.mode==='partnership'?'4 Player Teams':'2 Player Stock')+'</div>';
    stockArea.innerHTML=state.stock.length?backs(Math.min(8,state.stock.length))+'<div class="count-card">Stock '+state.stock.length+'</div>':'<div class="count-card">No Stock</div>';
    playerHand.innerHTML=(state.hands[0]||[]).map((card,index)=>cardHTML(card,index,state.currentPlayerIndex===0&&legalCards(0).some(item=>item.id===card.id))).join('');
    playerHand.querySelectorAll('.card').forEach(button=>button.onclick=()=>play(0,Number(button.dataset.i)));
    mainScore.textContent=state.scores[0]+' - '+state.scores[1];
    stateText.textContent=label||(state.currentPlayerIndex===0?'YOUR TURN':seatName(state.currentPlayerIndex)+' TURN');
    renderSeats();
  }
  function renderSeats(){
    [0,1,2,3].forEach(player=>{
      const el=document.getElementById('seat'+player);if(!el)return;
      if(player>=state.players){el.hidden=true;return}
      el.hidden=false;
      el.innerHTML='<b>'+seatName(player)+'</b><small>'+(state.hands[player]||[]).length+' cards</small>'+(player===0?'':'<div class="seat-cards">'+backs(Math.min(6,(state.hands[player]||[]).length))+'</div>');
    });
  }
  dealBtn.onclick=deal;meldBtn.onclick=takeMeld;
  teamBtn.onclick=()=>{setMode(state.mode==='partnership'?'two-player':'partnership');teamBtn.textContent=state.mode==='partnership'?'2 Player Mode':'Team Mode';deal()};
  window.addEventListener('play3d:modechange',deal);
  setMode('two-player');deal();
})();
