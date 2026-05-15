(()=>{
  'use strict';

  const suits = ['S','H','D','C'];
  const ranks = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
  const seats = ['south','west','north','east'];
  const team = {south:'NS', north:'NS', west:'EW', east:'EW'};
  const power = rank => 14 - ranks.indexOf(rank);

  let hands = {};
  let turn = 'south';
  let trick = [];
  let score = {NS:0, EW:0};
  let spadesBroken = false;
  let mode = window.Play3DModeBar ? window.Play3DModeBar.getMode() : 'cpu';


  function suitSymbol(s){
    return ({S:'♠',H:'♥',D:'♦',C:'♣'})[s] || s;
  }

  function buildDeck(){
    const deck = [];
    for(const s of suits) for(const r of ranks) deck.push({r,s,id:r + s + Math.random()});
    deck.sort(()=>Math.random() - 0.5);
    return deck;
  }

  function sortCards(a,b){
    return suits.indexOf(a.s) - suits.indexOf(b.s) || ranks.indexOf(a.r) - ranks.indexOf(b.r);
  }

  function deal(){
    const deck = buildDeck();
    hands = {south:[], west:[], north:[], east:[]};
    for(let i = 0; i < 52; i++) hands[seats[i % 4]].push(deck[i]);
    for(const seat of seats) hands[seat].sort(sortCards);
    turn = 'south';
    trick = [];
    spadesBroken = false;
    log(mode === 'local' ? 'Local 2 Player hand dealt.' : 'New hand dealt.');
    render();
  }

  function legalCards(seat){
    const hand = hands[seat] || [];
    if(!trick.length){
      if(!spadesBroken){
        const nonSpades = hand.filter(card => card.s !== 'S');
        if(nonSpades.length) return nonSpades;
      }
      return hand;
    }
    const lead = trick[0].card.s;
    const follow = hand.filter(card => card.s === lead);
    return follow.length ? follow : hand;
  }

  function play(seat, card){
    if(seat !== turn) return;
    const legal = legalCards(seat);
    if(!legal.some(item => item.id === card.id)){
      log('Follow suit if you can.');
      return;
    }
    hands[seat] = hands[seat].filter(item => item.id !== card.id);
    trick.push({seat, card});
    if(card.s === 'S') spadesBroken = true;

    if(trick.length === 4){
      finishTrick();
      return;
    }

    turn = seats[(seats.indexOf(turn) + 1) % 4];
    render();
    if(mode === 'cpu' && turn !== 'south') window.setTimeout(botTurn, 500);
  }

  function botTurn(){
    if(mode !== 'cpu') return;
    const legal = legalCards(turn);
    const card = [...legal].sort((a,b)=> trick.length === 3 ? power(b.r) - power(a.r) : power(a.r) - power(b.r))[0];
    if(card) play(turn, card);
  }

  function trickWinner(){
    let best = trick[0];
    for(const item of trick.slice(1)){
      if(item.card.s === best.card.s && power(item.card.r) > power(best.card.r)) best = item;
      if(item.card.s === 'S' && best.card.s !== 'S') best = item;
    }
    return best.seat;
  }

  function finishTrick(){
    const win = trickWinner();
    score[team[win]]++;
    log(seatName(win) + ' won the trick.');
    turn = win;
    trick = [];
    if((hands.south || []).length === 0){
      turnText.textContent = 'HAND OVER';
      render();
      return;
    }
    render();
    if(mode === 'cpu' && turn !== 'south') window.setTimeout(botTurn, 650);
  }

  function activeSeat(){
    return mode === 'local' ? turn : 'south';
  }

  function cardHTML(card,index,disabled){
    const red = card.s === 'H' || card.s === 'D';
    return '<button class="card ' + (red ? 'red ' : '') + (disabled ? 'disabled' : '') + '" data-i="' + index + '"><span class="rank">' + card.r + '</span><span class="suit">' + suitSymbol(card.s) + '</span></button>';
  }

  function renderHand(){
    const seat = activeSeat();
    const hand = hands[seat] || [];
    const legal = legalCards(seat).map(card => card.id);
    document.getElementById('hand').innerHTML = hand.map((card,i)=>cardHTML(card,i,!legal.includes(card.id))).join('');
    document.querySelectorAll('#hand .card').forEach(button=>{
      button.onclick = () => play(seat, hand[Number(button.dataset.i)]);
    });
  }

  function renderTrick(){
    document.getElementById('trickArea').innerHTML = trick.map(item=>{
      const red = item.card.s === 'H' || item.card.s === 'D';
      return '<div class="played-card"><span>' + seatName(item.seat) + '</span><div class="card ' + (red ? 'red' : '') + '"><span class="rank">' + item.card.r + '</span><span class="suit">' + suitSymbol(item.card.s) + '</span></div></div>';
    }).join('');
  }

  function render(){
    renderHand();
    renderTrick();
    scoreText.textContent = score.NS + ' - ' + score.EW;
    turnText.textContent = mode === 'local' ? seatName(turn).toUpperCase() + ' TURN' : (turn === 'south' ? 'YOUR TURN' : seatName(turn).toUpperCase() + ' TURN');
    stateText.textContent = spadesBroken ? 'SPADES BROKEN' : (mode === 'fan' ? 'FAN ROOM' : 'LIVE');
  }

  function seatName(seat){
    return {south:'You', north:'North', east:'East', west:'West'}[seat];
  }

  function log(msg){
    document.getElementById('log').innerHTML = '<li>' + msg + '</li>' + document.getElementById('log').innerHTML;
  }

  document.getElementById('newBtn').onclick = deal;
  document.getElementById('autoBtn').onclick = ()=>{
    const seat = activeSeat();
    const card = legalCards(seat)[0];
    if(card) play(seat, card);
  };
  window.addEventListener('play3d:modechange', event=>{
    mode = event.detail.mode;
    deal();
  });

  deal();
})();
